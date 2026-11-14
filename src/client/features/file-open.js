/**
 * 正文右键「打开方式」的文件模式：按 OS 为这些文件登记的程序打开。
 *
 * 宿主的 `POST /open-in-app/open` 路由只接受目录（wire 层会 stat 并拒掉文件），
 * 所以文件必须走 Host Remote 的 session 命名空间：
 *   - `canOpenWorkspacePath()` 探测当前部署能否把路径交给桌面程序；
 *   - `workspacePathApplications({ path })` 列出该文件在系统里登记的打开程序；
 *   - `openWorkspacePath({ path, application })` 用其中一个程序打开这个文件。
 * Client Remote 会把这些方法的结果包成 `{ ok: true, value }`（失败为
 * `{ ok: false, error }`），与宿主服务端直接返回业务值不同，这里两种形状都认。
 *
 * 性能：Windows 的关联枚举要起 PowerShell、编译 C# 并调用 Shell COM，首次可能
 * 超过十秒；菜单解析绝不能同步等它。调用方先用 peekFileApplications() 同步取
 * 缓存，未命中就立即给兜底项，再在后台 refreshFileApplications()；结果到达后
 * publish，宿主通过 observe 原地重解析，晚到的答案不会被超时丢掉。
 *
 * 缓存按「关联类」而不是完整路径区分（与宿主 open-in-app 一致）：系统按扩展名
 * 查程序，所以同一目录下十个 .json 只查一次，重复右键直接命中。
 */

import { rootCtx } from '../runtime.js';

/** 关联列表缓存：同一扩展名反复右键时直接呈现，不再逐个请求。 */
const CACHE_TTL = 5 * 60 * 1000;
/** 超过这个年龄仍先给旧结果，同时在后台刷新，界面不会闪回兜底。 */
const REFRESH_AFTER = 60 * 1000;
/** 查询失败只记一小会儿，避免一次断连让菜单长时间显示不可用。 */
const NEGATIVE_TTL = 3 * 1000;
const CACHE_MAX = 64;
/** 最近几次菜单的完整批次结果：关联类缓存有容量上限，整批结果不能因此丢。 */
const BATCH_MAX = 8;
/** 旧自绘菜单没有 observe 通道，只能等一小会儿；超时后后台请求继续跑。 */
const LEGACY_WAIT_MS = 700;

/** 关联类 key -> { at, apps }；apps 为 null 表示查询失败/桌面不可用。 */
const cache = new Map();
/** 完整路径列表 key -> { at, apps }；超过 CACHE_MAX 的批次仍能命中。 */
const batches = new Map();
/** 同一关联类的并发请求共用一个 promise，避免重复拉起 PowerShell。 */
const inflight = new Map();
const listeners = new Set();
let revision = 0;
/** 每次 apply / 卸载递增；旧上下文的在途查询完成后不得写回新状态。 */
let generation = 0;

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

/** 系统按扩展名查关联；无扩展名的文件（Makefile、.env）按完整路径单独成类。 */
function associationKey(path) {
  const name = path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1);
  const dot = name.lastIndexOf('.');
  return dot > 0 && dot < name.length - 1
    ? `extension:${name.slice(dot).toLowerCase()}`
    : `path:${path}`;
}

/** 一批路径按关联类去重，保留第一次出现的路径作为该类的代表。 */
function classRepresentatives(list) {
  const classes = new Map();
  for (const path of list) {
    const key = associationKey(path);
    if (!classes.has(key)) classes.set(key, path);
  }
  return classes;
}

/**
 * Client Remote 成功时是 `{ok:true,value}`；直接返回数组的宿主/测试桩也认。
 * @returns {Array|null} null = 查询失败或形状不认识。
 */
function applicationRows(result) {
  if (Array.isArray(result)) return result;
  if (result !== null && typeof result === 'object' && result.ok === true) {
    return Array.isArray(result.value) ? result.value : null;
  }
  return null;
}

/** 路径动作以 resolved 且未显式失败为成功；RemoteResult 失败会带 ok:false。 */
function pathActionSucceeded(result) {
  if (result === true) return true;
  if (result === null || typeof result !== 'object') return false;
  if (result.ok === false) return false;
  if (result.ok === true) return true;
  return result.opened === true || result.value !== undefined;
}

/** 桌面能力探测：Client Remote 返回 `{ok:true,value:boolean}`，兼容裸 boolean。 */
function desktopAvailable(result) {
  if (typeof result === 'boolean') return result;
  if (result === null || typeof result !== 'object' || result.ok === false) return false;
  return result.value === true || result.opened === true;
}

/** 桌面打开能力只探测一次（每次页面重载一次）；失败保持未知，下次再试。 */
function probeDesktop() {
  if (desktop !== null) return Promise.resolve(desktop);
  const remote = remoteSession();
  if (remote === null || typeof remote.canOpenWorkspacePath !== 'function') {
    desktop = false;
    return Promise.resolve(false);
  }
  if (desktopProbe === null) {
    const epoch = generation;
    desktopProbe = Promise.resolve()
      .then(() => remote.canOpenWorkspacePath())
      .then((result) => {
        if (epoch !== generation) return false;
        desktop = desktopAvailable(result);
        return desktop;
      })
      .catch(() => {
        if (epoch === generation) desktop = null;
        return false;
      })
      .finally(() => {
        // 旧探测结束时新的探测可能已经启动，不能把新 promise 清掉。
        if (epoch === generation) desktopProbe = null;
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

function normalList(paths) {
  return Array.isArray(paths)
    ? paths.filter((path) => typeof path === 'string' && path !== '')
    : [];
}

function ttlOf(hit) {
  return hit.apps === null ? NEGATIVE_TTL : CACHE_TTL;
}

function touch(key, hit) {
  cache.delete(key);
  cache.set(key, hit);
}

function remember(key, apps) {
  cache.set(key, { at: Date.now(), apps });
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
}

function batchKey(list) {
  return list.join('\u0000');
}

/** 整批结果单独留一份，避免超过 CACHE_MAX 的文件集合反复补查。 */
function rememberBatch(key, apps) {
  batches.set(key, { at: Date.now(), apps });
  while (batches.size > BATCH_MAX) {
    const oldest = batches.keys().next();
    if (oldest.done) break;
    batches.delete(oldest.value);
  }
}

function batchSnapshot(list) {
  const key = batchKey(list);
  const hit = batches.get(key);
  if (hit === undefined) return undefined;
  const age = Date.now() - hit.at;
  if (age > ttlOf(hit)) {
    batches.delete(key);
    return undefined;
  }
  batches.delete(key);
  batches.set(key, hit);
  return { apps: hit.apps, stale: age > REFRESH_AFTER };
}

/** 插件重新 apply 或卸载时调用：清缓存、断开旧在途任务，避免复用旧 Remote。 */
function resetFileApplications() {
  generation += 1;
  inflight.clear();
  cache.clear();
  batches.clear();
  desktop = null;
  desktopProbe = null;
  revision += 1;
}

function publish() {
  revision += 1;
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error) {
      console.warn('[dsh-sidebar-row-menu] file app listener failed:', error);
    }
  }
}

/** 版本号给 useSyncExternalStore 用；只增不减。 */
function fileApplicationsRevision() {
  return revision;
}

/** 订阅文件关联结果；后台刷新完成时宿主会收到通知。 */
function subscribeFileApplications(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 把一组关联类答案合成一个列表；全部失败返回 null。 */
function mergeAnswers(answers) {
  const usable = answers.filter((value) => value !== undefined);
  if (usable.length === 0) return null;
  if (usable.every((value) => value === null)) return null;
  return mergeHandlers(usable);
}

/**
 * 同步读缓存，给菜单解析用。
 * @param {string[]} paths - 绝对路径。
 * @returns {{apps:Array|null, stale:boolean}|undefined} undefined = 有类从没查过。
 */
function peekFileApplications(paths) {
  const list = normalList(paths);
  if (list.length === 0) return { apps: [], stale: false };
  const batch = batchSnapshot(list);
  if (batch !== undefined) return batch;
  const classes = classRepresentatives(list);
  const answers = [];
  let stale = false;
  for (const key of classes.keys()) {
    const hit = cache.get(key);
    if (hit === undefined) return undefined;
    const age = Date.now() - hit.at;
    if (age > ttlOf(hit)) {
      cache.delete(key);
      return undefined;
    }
    touch(key, hit);
    if (age > REFRESH_AFTER) stale = true;
    answers.push(hit.apps);
  }
  return { apps: mergeAnswers(answers), stale };
}

/** 查询一个关联类；成功、失败都写缓存并 publish。 */
async function loadFileClass(key, path, signal) {
  if (signal?.aborted) return null;
  const epoch = generation;
  const remote = remoteSession();
  if (remote === null || typeof remote.workspacePathApplications !== 'function') {
    if (epoch === generation) {
      remember(key, null);
      publish();
    }
    return null;
  }
  try {
    const result = await remote.workspacePathApplications({ path }, signal);
    if (signal?.aborted || epoch !== generation) return null;
    const rows = applicationRows(result);
    if (rows === null) {
      remember(key, null);
      publish();
      return null;
    }
    const apps = mergeHandlers([rows]);
    remember(key, apps);
    publish();
    return apps;
  } catch {
    if (signal?.aborted || epoch !== generation) return null;
    remember(key, null);
    publish();
    return null;
  }
}

/**
 * 后台拉取一批文件的关联程序；每个关联类一个请求，结果到达就 publish。
 * 不设整体截止时间：晚到的答案正是宿主原地升级菜单所需要的。
 * @param {string[]} paths - 绝对路径。
 * @param {AbortSignal} [signal] - 旧自绘菜单卸载时取消。
 * @returns {Promise<Array|null>} null = 没有桌面能力或全部查询失败。
 */
async function refreshFileApplications(paths, signal) {
  const list = normalList(paths);
  if (list.length === 0) return [];
  const epoch = generation;
  const classes = classRepresentatives(list);
  const classKeys = [...classes.keys()];
  const tasks = [];
  for (const [key, path] of classes) {
    const hit = cache.get(key);
    const age = hit === undefined ? Infinity : Date.now() - hit.at;
    // 过期要重查；未过期但已老于 REFRESH_AFTER 也要在后台换新，peek 的 stale
    // 标记正是为此而设，不能在这里被 5 分钟 TTL 重新当成新鲜结果。
    if (hit !== undefined && age <= ttlOf(hit) && age <= REFRESH_AFTER) {
      touch(key, hit);
      tasks.push(Promise.resolve(hit.apps));
      continue;
    }
    const pending = inflight.get(key);
    if (pending !== undefined) {
      tasks.push(pending);
      continue;
    }
    const task = loadFileClass(key, path, signal).finally(() => {
      // 重新 apply 后同一关联类可能已有新请求，旧任务不能把新条目删掉。
      if (inflight.get(key) === task) inflight.delete(key);
    });
    inflight.set(key, task);
    tasks.push(task);
  }
  const answers = await Promise.all(tasks);
  // 插件已重新 apply / 卸载：旧 Remote 的答案不能污染新上下文。
  if (epoch !== generation) return null;
  const merged = mergeAnswers(answers);
  // 整批都有确定答案（含「没有程序」）才记快照；中途取消的批次不留下半份结果。
  // 类缓存按容量淘汰后 cache.has 仍可能为 false，但成功返回的答案本身已经完整。
  const complete = answers.every((value, index) => value !== null || cache.has(classKeys[index]));
  if (complete) rememberBatch(batchKey(list), merged);
  return merged;
}

/** 给旧自绘菜单一个有限等待；超时只放弃这次渲染，后台请求仍在跑。 */
function waitAtMost(promise, ms, fallback) {
  let timer = 0;
  const deadline = new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof window.setTimeout !== 'function') {
      resolve(fallback);
      return;
    }
    timer = window.setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (timer !== 0 && typeof window !== 'undefined' && typeof window.clearTimeout === 'function') {
      window.clearTimeout(timer);
    }
  });
}

/**
 * 一批文件在系统里登记的程序。
 * @param {string[]} paths - 绝对路径。
 * @param {AbortSignal} [signal] - 菜单卸载时取消请求。
 * @returns {Promise<Array<{id:string,name:string,icon:string,default:boolean}>|null>}
 *   null = 宿主没有桌面打开能力（或查询失败），[] = 系统没有登记任何程序。
 */
async function fileApplications(paths, signal) {
  const list = normalList(paths);
  if (list.length === 0) return [];
  const snapshot = peekFileApplications(list);
  if (snapshot !== undefined && !snapshot.stale) return snapshot.apps;
  // 旧菜单没有 observe，只能等一个短预算；不把 signal 传给后台任务，
  // 这样菜单关掉后枚举仍会完成并留下缓存，下次右键直接命中。
  const pending = refreshFileApplications(list);
  const result = await waitAtMost(pending, LEGACY_WAIT_MS, undefined);
  if (result !== undefined) return result;
  return snapshot === undefined ? null : snapshot.apps;
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
  const list = normalList(paths);
  if (list.length === 0) return false;
  const remote = remoteSession();
  if (remote === null) return false;
  const results = await Promise.all(list.map(async (path) => {
    try {
      const request = typeof application === 'string' && application !== ''
        ? { path, application }
        : { path };
      const result = await remote.openWorkspacePath(request);
      return pathActionSucceeded(result);
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
  const list = normalList(paths);
  if (list.length === 0) return false;
  const remote = remoteSession();
  if (remote === null) return false;
  const results = await Promise.all(list.map(async (path) => {
    try {
      const result = await remote.openWorkspacePath({ path, action: 'reveal' });
      return pathActionSucceeded(result);
    } catch {
      return false;
    }
  }));
  return results.every((ok) => ok === true);
}

export {
  desktopReady,
  fileApplications,
  fileApplicationsRevision,
  openFilesDefault,
  openFilesWith,
  peekFileApplications,
  refreshFileApplications,
  resetFileApplications,
  revealFiles,
  subscribeFileApplications,
};
