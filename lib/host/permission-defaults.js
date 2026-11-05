/**
 * 按工作区记住「新会话的默认权限」。
 *
 * DSH 原生只有一份全局默认（设置里的 permission.defaultPreset），没有
 * 「这个工作区新建会话用完全访问、那个工作区用只读」的概念。这里把
 * workspaceId → preset 存成插件自己的小 JSON，再在 agent/created 时把
 * 它写成该会话的 permission/preset 事件：
 *
 *   - 事件是宿主自己的格式，会话内 `/permission` 看到的状态完全一致；
 *   - 不碰全局设置，也不影响已有会话；
 *   - 原生 `pinInitialPermission` 只在会话还没有 preset 时写入全局默认，
 *     我们已经写过时会保留我们的值（顺序反过来也会被后写的覆盖成同一结果）。
 *
 * 文件位置：$DSH_HOME/storages/dsh-sidebar-row-menu/permission-defaults.json
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const STORAGE_VERSION = 1;
const STORAGE_DIR = 'storages';
const STORAGE_OWNER = 'dsh-sidebar-row-menu';
const STORAGE_FILE = 'permission-defaults.json';

/** 解析 DSH 数据目录；桌面端会设置 DSH_HOME，命令行 fallback 到 ~/.dsh。 */
export function resolveDshHome(env = process.env, home = homedir()) {
  const configured = typeof env?.DSH_HOME === 'string' ? env.DSH_HOME.trim() : '';
  return configured === '' ? join(home, '.dsh') : configured;
}

/** 权限默认值文件的绝对路径。 */
export function permissionDefaultsPath(env = process.env, home = homedir()) {
  return join(resolveDshHome(env, home), STORAGE_DIR, STORAGE_OWNER, STORAGE_FILE);
}

function emptyDefaults() {
  return {};
}

/** 只接受「非空字符串 → 非空 preset 名」，坏数据直接丢弃。 */
function sanitizeDefaults(value) {
  const result = emptyDefaults();
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [workspaceId, preset] of Object.entries(value)) {
    if (typeof workspaceId !== 'string' || workspaceId === '') continue;
    if (typeof preset !== 'string' || preset.trim() === '') continue;
    result[workspaceId] = preset;
  }
  return result;
}

/** 读文件；不存在/损坏都当作空表（下一次写入会重建）。 */
export function readPermissionDefaults(filePath = permissionDefaultsPath()) {
  try {
    const text = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(text);
    return sanitizeDefaults(parsed?.defaults);
  } catch {
    return emptyDefaults();
  }
}

/**
 * 文件存储。读失败静默回退空表，写失败抛给调用方决定是否提示。
 * 写入用 tmp + rename，避免中途崩溃留下半截 JSON。
 */
export function createPermissionDefaultsStore(filePath = permissionDefaultsPath()) {
  return {
    filePath,
    read() {
      return readPermissionDefaults(filePath);
    },
    /** 传 null 表示删除该工作区的覆盖，恢复跟随全局默认。 */
    set(workspaceId, preset) {
      if (typeof workspaceId !== 'string' || workspaceId === '') {
        throw new TypeError('workspaceId must be a non-empty string');
      }
      const defaults = readPermissionDefaults(filePath);
      if (preset === null || preset === undefined) {
        delete defaults[workspaceId];
      } else {
        if (typeof preset !== 'string' || preset.trim() === '') {
          throw new TypeError('preset must be a non-empty string or null');
        }
        defaults[workspaceId] = preset;
      }
      mkdirSync(dirname(filePath), { recursive: true });
      const temporary = `${filePath}.tmp`;
      writeFileSync(temporary, `${JSON.stringify({ version: STORAGE_VERSION, defaults }, null, 2)}\n`, 'utf8');
      renameSync(temporary, filePath);
      return defaults;
    },
  };
}

/** 路径比较用的规范化：统一分隔符、去掉尾部分隔符。 */
function normalizePath(value) {
  if (typeof value !== 'string') return '';
  let result = value.trim().replace(/[\\/]+/g, '/');
  while (result.length > 1 && result.endsWith('/')) result = result.slice(0, -1);
  return result;
}

/**
 * 会话 cwd → 工作区 id。会话头里的 cwd 和工作区登记的 path 都是规范化
 * 绝对路径；Windows 上再加一层大小写不敏感兜底。
 */
export function workspaceIdForCwd(registry, cwd) {
  const target = normalizePath(cwd);
  if (target === '' || registry === null || registry === undefined) return '';
  let workspaces;
  try {
    workspaces = typeof registry.list === 'function' ? registry.list() : [];
  } catch {
    return '';
  }
  if (!Array.isArray(workspaces)) return '';
  const entries = workspaces.filter((entry) => entry !== null && typeof entry === 'object');
  const exact = entries.find((entry) => normalizePath(entry.path) === target);
  if (exact !== undefined && typeof exact.id === 'string') return exact.id;
  if (process.platform !== 'win32') return '';
  const folded = entries.find((entry) => normalizePath(entry.path).toLowerCase() === target.toLowerCase());
  return folded !== undefined && typeof folded.id === 'string' ? folded.id : '';
}

function presetNamesOf(service) {
  try {
    const names = service?.names;
    return Array.isArray(names) ? names : null;
  } catch {
    return null;
  }
}

/**
 * 在 agent/created 上把工作区默认写进新会话。
 * 只在真正新建的交互会话上动手：
 *   - source 必须是 startup（resume / clear / compact 不碰）；
 *   - 子代理和 seeded 会话（fork、压缩等）不碰；
 *   - 找不到工作区或 preset 已被删除时静默跳过。
 */
export function applyWorkspacePermission(ctx, payload, store) {
  if (payload?.source !== 'startup') return false;
  const session = payload?.agent?.session;
  if (session === null || session === undefined) return false;
  const header = session.header;
  if (header === null || header === undefined) return false;
  if (header.origin === 'subagent' || header.isSeeded === true) return false;

  let registry;
  try {
    registry = ctx.get?.('workspaceRegistry');
  } catch {
    return false;
  }
  const workspaceId = workspaceIdForCwd(registry, header.cwd);
  if (workspaceId === '') return false;

  const defaults = store.read();
  const preset = defaults[workspaceId];
  if (typeof preset !== 'string' || preset === '') return false;

  let service;
  try {
    service = ctx.get?.('permissionPresets');
  } catch {
    return false;
  }
  if (service === null || service === undefined || typeof service.set !== 'function') return false;
  const names = presetNamesOf(service);
  if (names !== null && !names.includes(preset)) return false;
  service.set(session, preset);
  return true;
}

/**
 * 注册监听。prepend 让本监听排在原生 `pinInitialPermission` 之前，
 * 这样新会话的日志里只有一条 preset 事件；即便顺序反过来，后写的
 * `set()` 也会把状态纠正成工作区默认，结果一致。
 */
export function registerWorkspacePermissionDefaults(ctx, store) {
  return ctx.on('agent/created', (payload) => {
    try {
      applyWorkspacePermission(ctx, payload, store);
    } catch (error) {
      ctx.logger?.warn?.('[dsh-sidebar-row-menu] workspace permission default failed:', error);
    }
  }, { prepend: true });
}
