/**
 * 启动外部程序：VS Code 与系统文件管理器。
 *
 * 注意：spawn 里不要加 windowsHide —— 那会给子进程
 * STARTF_USESHOWWINDOW|SW_HIDE，explorer.exe 会真的把窗口建成隐藏的，
 * 表现就是「点了没反应」。
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { toVscodeFileUrl } from './paths.js';

/**
 * detached 启动一个外部命令，立即返回；失败只吞掉 'error' 事件。
 * @param command - 可执行文件（.cmd 需要 options.shell）。
 * @param args - 参数数组。
 * @param options - { shell } 走 cmd.exe（Windows 下跑 code.cmd 这类批处理需要）。
 */
function spawnDetached(command, args, options = {}) {
  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      shell: options.shell === true,
    });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

/** 在系统文件管理器里打开一个目录（Windows: explorer.exe）。 */
export function revealDirectory(path) {
  switch (process.platform) {
    case 'darwin':
      return { started: spawnDetached('open', [path]), via: 'open' };
    case 'win32':
      return { started: spawnDetached('explorer.exe', [path]), via: 'explorer.exe' };
    default:
      return { started: spawnDetached('xdg-open', [path]), via: 'xdg-open' };
  }
}

/** 缓存 VS Code 启动器探测结果：undefined = 还没探过，null = 没找到。 */
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
 * @returns { command, shell } 或 null。
 */
export function resolveVscodeLauncher() {
  if (vscodeLauncherCache !== undefined) return vscodeLauncherCache;

  const override = process.env.DSH_SCM_VSCODE;
  if (override) {
    vscodeLauncherCache = { command: override, shell: /\.(cmd|bat)$/i.test(override) };
    return vscodeLauncherCache;
  }

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
        vscodeLauncherCache = { command: candidate, shell: true };
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
        vscodeLauncherCache = { command: candidate, shell: isWin };
        return vscodeLauncherCache;
      }
    }
  }

  vscodeLauncherCache = null;
  return vscodeLauncherCache;
}

/** 用 VS Code 打开目录：优先 CLI `--new-window`，最后退回协议处理器。 */
export function openInVscode(path) {
  const launcher = resolveVscodeLauncher();
  if (launcher) {
    return {
      started: spawnDetached(launcher.command, ['--new-window', path], { shell: launcher.shell }),
      via: `vscode-cli ${launcher.command}`,
    };
  }
  return {
    started: openCustomScheme(toVscodeFileUrl(path)),
    via: 'vscode-protocol（可能沿用当前窗口）',
  };
}

/** 把自定义协议 URL 交给系统协议处理器（Windows: rundll32 FileProtocolHandler）。 */
export function openCustomScheme(url) {
  switch (process.platform) {
    case 'darwin':
      return spawnDetached('open', [url]);
    case 'win32':
      return spawnDetached('rundll32.exe', ['url.dll,FileProtocolHandler', url]);
    default:
      return spawnDetached('xdg-open', [url]);
  }
}
