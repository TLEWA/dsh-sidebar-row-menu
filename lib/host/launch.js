/**
 * 启动外部程序：VS Code 与系统文件管理器。
 *
 * 注意：spawn 里不要加 windowsHide —— 那会给子进程
 * STARTF_USESHOWWINDOW|SW_HIDE，explorer.exe 会真的把窗口建成隐藏的，
 * 表现就是「点了没反应」。
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { toVscodeFileUrl } from './paths.js';

/**
 * cmd.exe 的单参数引号化。
 *
 * Node 的 shell:true 不转义：它把 command 与 args 用空格拼成一整串交给
 * cmd.exe，所以「C:\Program Files\...\code.cmd --new-window C:\a b」会被拆成
 * 两个参数；路径里带 & ^ ( 时还会被当成命令分隔符。这里显式加引号：
 * 双引号内的 & | < > ^ ( ) 都是字面量，"" 是 cmd 下最接近的 " 转义。
 * （%VAR% 在引号内仍会展开，cmd 也没有 % 转义；所以调用方先用
 *   preferVscodeExecutable 绕开 .cmd，只有显式配置指向批处理时才会走到这里。）
 */
function quoteCmdArgument(value) {
  const text = String(value);
  if (text !== '' && !/[\s"&|<>^()%!]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * code.cmd 只是 VS Code 的包装脚本；安装根目录的兄弟 Code.exe 可以不经 cmd.exe
 * 直接启动，路径里的 %VAR% 也就不会被展开。
 * @param candidate - 启动器路径。
 * @returns {string|null} 兄弟 Code.exe 的绝对路径；不是 .cmd/.bat 或文件不存在时为 null。
 */
export function preferVscodeExecutable(candidate) {
  if (!/\.(cmd|bat)$/i.test(candidate)) return null;
  const exe = join(dirname(candidate), '..', 'Code.exe');
  return existsSync(exe) ? exe : null;
}

/**
 * detached 启动一个外部命令，等 spawn / error 事件后返回是否真的启动。
 * @param command - 可执行文件（.cmd 需要 options.shell）。
 * @param args - 参数数组。
 * @param options - { shell } 走 cmd.exe（Windows 下跑 code.cmd 这类批处理需要）。
 * @returns {Promise<boolean>} 进程真的启动为 true，同步或异步失败为 false。
 */
function spawnDetached(command, args, options = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      const shell = options.shell === true;
      const useQuotes = shell && process.platform === 'win32';
      child = spawn(
        useQuotes ? quoteCmdArgument(command) : command,
        useQuotes ? args.map(quoteCmdArgument) : args,
        { detached: true, stdio: 'ignore', shell },
      );
    } catch {
      // Windows 上 CreateProcess 的同步失败会直接 throw（例如文件不是可执行映像）。
      resolve(false);
      return;
    }
    // ENOENT / EACCES 等异步失败只走 'error'，不监听就会被当成启动成功。
    child.once('spawn', () => resolve(true));
    child.once('error', () => resolve(false));
    child.unref();
  });
}

/** 判断路径是不是真实文件；目录或断链都不算。 */
function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** 在系统文件管理器里打开一个目录（Windows: explorer.exe）。 */
export async function revealDirectory(path) {
  switch (process.platform) {
    case 'darwin':
      return { started: await spawnDetached('open', [path]), via: 'open' };
    case 'win32':
      return { started: await spawnDetached('explorer.exe', [path]), via: 'explorer.exe' };
    default:
      return { started: await spawnDetached('xdg-open', [path]), via: 'xdg-open' };
  }
}

/** 缓存成功找到的 VS Code 启动器；undefined = 还没探过。找不到时不缓存。 */
let vscodeLauncherCache;

/**
 * 查注册表里 `vscode://` 协议指向哪个可执行文件。
 * 这是最准的来源：PATH 里第一个 `code.cmd` 可能是 Cursor 的。
 * @returns Code.exe 绝对路径，找不到返回 null。
 */
function readVscodeExeFromRegistry() {
  if (process.platform !== 'win32') return null;
  try {
    const regExe = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'reg.exe');
    const result = spawnSync(regExe, ['query', 'HKCR\\vscode\\shell\\open\\command', '/ve'], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 4000,
    });
    if (!result || result.status !== 0 || !result.stdout) return null;
    const line = String(result.stdout)
      .split(/\r?\n/)
      .find((candidate) => /REG_(?:EXPAND_)?SZ/i.test(candidate));
    if (!line) return null;
    const match = /REG_(?:EXPAND_)?SZ\s+(?:"([^"]+)"|(\S+))/i.exec(line);
    const exe = match ? match[1] ?? match[2] : null;
    return exe && existsSync(exe) ? exe : null;
  } catch {
    return null;
  }
}

/**
 * 找 VS Code 的启动方式。
 *
 * 探测顺序：
 *   1. 环境变量 DSH_SCM_VSCODE（想改成 Cursor / Windsurf 就指它的 exe/cmd）
 *   2. 注册表 vscode:// 的 Code.exe（最准）
 *   3. 常见安装位置的 bin\code.cmd（LOCALAPPDATA / ProgramFiles）
 *   4. PATH 上的 code（注意可能是 Cursor 的）
 * @returns { command, shell, error? } 或 null；error 表示显式覆盖不可用。
 */
export function resolveVscodeLauncher() {
  const override = process.env.DSH_SCM_VSCODE;
  if (override) {
    // 显式覆盖每次调用都校验：指向不存在的文件时直接上报失败，既不回退到
    // 别的启动器，也不把坏结果缓存住（用户改好环境变量后下一次点击就能恢复）。
    if (!isFile(override)) return { command: override, error: 'vscode-launcher-missing' };
    return { command: override, shell: /\.(cmd|bat)$/i.test(override) };
  }

  if (vscodeLauncherCache !== undefined) return vscodeLauncherCache;

  const exe = readVscodeExeFromRegistry();
  if (exe) {
    vscodeLauncherCache = { command: exe, shell: false };
    return vscodeLauncherCache;
  }

  const isWin = process.platform === 'win32';
  if (isWin) {
    const bases = [
      process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'bin'),
      process.env.ProgramFiles && join(process.env.ProgramFiles, 'Microsoft VS Code', 'bin'),
      process.env['ProgramFiles(x86)'] && join(process.env['ProgramFiles(x86)'], 'Microsoft VS Code', 'bin'),
    ];
    for (const base of bases) {
      if (!base) continue;
      const candidate = join(base, 'code.cmd');
      if (existsSync(candidate)) {
        const exe = preferVscodeExecutable(candidate);
        vscodeLauncherCache = exe
          ? { command: exe, shell: false }
          : { command: candidate, shell: true };
        return vscodeLauncherCache;
      }
    }
  }

  const names = isWin ? ['code.cmd', 'code.exe', 'code'] : ['code'];
  const dirs = String(process.env.PATH ?? '').split(isWin ? ';' : ':').filter(Boolean);
  for (const dir of dirs) {
    for (const name of names) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) {
        const exe = preferVscodeExecutable(candidate);
        vscodeLauncherCache = exe
          ? { command: exe, shell: false }
          : { command: candidate, shell: isWin };
        return vscodeLauncherCache;
      }
    }
  }

  // 找不到时不缓存：用户装好 VS Code 后下一次点击应该重新探测。
  return null;
}

/** 用 VS Code 打开目录：优先 CLI `--new-window`，最后退回协议处理器。 */
export async function openInVscode(path) {
  const launcher = resolveVscodeLauncher();
  if (launcher?.error !== undefined) {
    return { started: false, error: launcher.error, via: `vscode-cli ${launcher.command}` };
  }
  if (launcher) {
    return {
      started: await spawnDetached(launcher.command, ['--new-window', path], { shell: launcher.shell }),
      via: `vscode-cli ${launcher.command}`,
    };
  }
  return {
    started: await openCustomScheme(toVscodeFileUrl(path)),
    via: 'vscode-protocol（可能沿用当前窗口）',
  };
}

/** 把自定义协议 URL 交给系统协议处理器（Windows: rundll32 FileProtocolHandler）。 */
export async function openCustomScheme(url) {
  switch (process.platform) {
    case 'darwin':
      return await spawnDetached('open', [url]);
    case 'win32':
      return await spawnDetached('rundll32.exe', ['url.dll,FileProtocolHandler', url]);
    default:
      return await spawnDetached('xdg-open', [url]);
  }
}
