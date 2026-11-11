/**
 * 正文右键「打开方式」的文件模式：按 OS 为这些文件登记的程序打开。
 *
 * 宿主的 `POST /open-in-app/open` 路由只接受目录（wire 层会 stat 并拒掉文件），
 * 所以文件必须走 Host Remote 的 session 命名空间：
 *   - `canOpenWorkspacePath()` 探测当前部署能否把路径交给桌面程序；
 *   - `workspacePathApplications({ path })` 列出该文件在系统里登记的打开程序；
 *   - `openWorkspacePath({ path, application })` 用其中一个程序打开这个文件。
 * 这些调用由 DSH 客户端远程层提供（与 dsh-better-sidebar 的 open-in-app 适配器同源），
 * 缺少 remote 的宿主退化为「没有可用程序」，而不是把文件 POST 到只收目录的路由。
 */

import { rootCtx } from '../runtime.js';

/** 关联列表缓存：同一批文件反复右键时直接呈现，不再逐个请求。 */
const CACHE_TTL = 30 * 1000;
const CACHE_MAX = 24;
const cache = new Map();

/** null = 还没探测；true / false = 探到过。 */
let desktop = null;
let desktopProbe = null;

/** 取 Host Remote 的 session 命名空间；没有或形状不对都返回 null。 */
function remoteSession() {
  try {
    const session = rootCtx?.get?.('remote')?.session;
    if (session === undefined || session === null) return null;
    return typeof session.openWorkspacePath === 'function' ? session : null;
  } catch {
    return null;
  }
}

/** 桌面打开能力只探测一次（每次页面重载一次）。 */
function probeDesktop() {
  if (desktop !== null) return Promise.resolve(desktop);
  const remote = remoteSession();
  if (remote === null || typeof remote.canOpenWorkspacePath !== 'function') {
    desktop = false;
    return Promise.resolve(false);
  }
  if (desktopProbe === null) {
    desktopProbe = Promise.resolve()
      .then(() => remote.canOpenWorkspacePath())
      .then((result) => {
        desktop = result !== null && typeof result === 'object' && result.ok === true && result.value === true;
        return desktop;
      })
      .catch(() => {
        // 探测抛错多半是临时断连：保持未知，下次右键再试，别让一次故障永久关掉文件打开。
        desktop = null;
        return false;
      })
      .finally(() => {
        desktopProbe = null;
      });
  }
  return desktopProbe;
}

/** 多个文件的关联列表按 id 合并去重，顺序按第一次出现的先后。 */
function mergeHandlers(lists) {
  const order = [];
  const byId = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (entry === null || typeof entry !== 'object') continue;
      const id = typeof entry.id === 'string' ? entry.id : '';
      if (id === '') continue;
      const previous = byId.get(id);
      if (previous === undefined) {
        byId.set(id, {
          id,
          name: typeof entry.name === 'string' ? entry.name : '',
          icon: typeof entry.icon === 'string' ? entry.icon : '',
          default: entry.default === true,
        });
        order.push(id);
        continue;
      }
      if (!previous.default && entry.default === true) previous.default = true;
      if (previous.name === '' && typeof entry.name === 'string') previous.name = entry.name;
      if (previous.icon === '' && typeof entry.icon === 'string') previous.icon = entry.icon;
    }
  }
  return order.map((id) => byId.get(id));
}

function cached(key) {
  const hit = cache.get(key);
  if (hit === undefined) return undefined;
  if (Date.now() - hit.at > CACHE_TTL) {
    cache.delete(key);
    return undefined;
  }
  cache.delete(key);
  cache.set(key, hit);
  return hit.apps;
}

function remember(key, apps) {
  cache.set(key, { at: Date.now(), apps });
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
}

/**
 * 一批文件在系统里登记的程序。
 * @param {string[]} paths - 绝对路径。
 * @param {AbortSignal} [signal] - 菜单卸载时取消请求。
 * @returns {Promise<Array<{id:string,name:string,icon:string,default:boolean}>|null>}
 *   null = 宿主没有桌面打开能力（或查询失败），[] = 系统没有登记任何程序。
 */
async function fileApplications(paths, signal) {
  const list = Array.isArray(paths)
    ? paths.filter((path) => typeof path === 'string' && path !== '')
    : [];
  if (list.length === 0) return [];
  const key = list.join('\u0000');
  const hit = cached(key);
  if (hit !== undefined) return hit;
  if (!(await probeDesktop())) return null;
  const remote = remoteSession();
  if (remote === null || typeof remote.workspacePathApplications !== 'function') return null;
  const answers = await Promise.all(list.map(async (path) => {
    try {
      const result = await remote.workspacePathApplications({ path }, signal);
      if (result === null || typeof result !== 'object' || result.ok !== true) return null;
      return Array.isArray(result.value) ? result.value : null;
    } catch {
      return null;
    }
  }));
  const usable = answers.filter((value) => value !== null);
  if (usable.length === 0) return null;
  const apps = mergeHandlers(usable);
  remember(key, apps);
  return apps;
}

/** 桌面打开能力是否可用；与 fileApplications 共用同一次探测，不额外发请求。 */
function desktopReady() {
  return probeDesktop();
}

/**
 * 用指定程序打开这些文件；全部成功才算成功。
 * @param {string[]} paths - 绝对路径。
 * @param {string} [application] - 系统关联 id；省略时用默认程序。
 * @returns {Promise<boolean>}
 */
async function openFilesWith(paths, application) {
  const list = Array.isArray(paths)
    ? paths.filter((path) => typeof path === 'string' && path !== '')
    : [];
  if (list.length === 0) return false;
  const remote = remoteSession();
  if (remote === null) return false;
  const results = await Promise.all(list.map(async (path) => {
    try {
      const request = typeof application === 'string' && application !== ''
        ? { path, application }
        : { path };
      const result = await remote.openWorkspacePath(request);
      return result !== null && typeof result === 'object' && result.ok === true;
    } catch {
      return false;
    }
  }));
  return results.every((ok) => ok === true);
}

/** 用系统默认程序打开这些文件（不依赖关联列表，关联枚举失败时仍可用）。 */
function openFilesDefault(paths) {
  return openFilesWith(paths);
}

/**
 * 在系统文件管理器里显示这些文件；只用到宿主 reveal 动作，不依赖关联列表。
 * @param {string[]} paths - 绝对路径。
 * @returns {Promise<boolean>} 全部成功才算成功。
 */
async function revealFiles(paths) {
  const list = Array.isArray(paths)
    ? paths.filter((path) => typeof path === 'string' && path !== '')
    : [];
  if (list.length === 0) return false;
  const remote = remoteSession();
  if (remote === null) return false;
  const results = await Promise.all(list.map(async (path) => {
    try {
      const result = await remote.openWorkspacePath({ path, action: 'reveal' });
      return result !== null && typeof result === 'object' && result.ok === true;
    } catch {
      return false;
    }
  }));
  return results.every((ok) => ok === true);
}

export { desktopReady, fileApplications, openFilesDefault, openFilesWith, revealFiles };
