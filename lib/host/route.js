/**
 * HTTP 边界：/open、/session/delete 与 /workspace/delete。
 *
 * 浏览器端不能自己打开系统应用，也不该直接碰会话日志，所以这几件事都放在 host：
 *   POST /dsh-sidebar-row-menu/open             打开目录（VS Code / 资源管理器）
 *   POST /dsh-sidebar-row-menu/session/delete   永久删除会话（归档范围由 UI 把关）
 *   POST /dsh-sidebar-row-menu/workspace/delete 永久删除工作区及其全部会话
 */

import { inspectOpenPath } from './paths.js';
import { isLoopbackRequest } from './security.js';
import { openInVscode, revealDirectory } from './launch.js';
import { createPermissionDefaultsStore } from './permission-defaults.js';
import { DELETE_BATCH_LIMIT, removeSessions } from './session-delete.js';
import { removeWorkspaceWithSessions } from './workspace-delete.js';

/** 路由前缀；客户端半边硬编码同一个值。 */
export const ROUTE_PREFIX = '/dsh-sidebar-row-menu';
export const ROUTE_OPEN = `${ROUTE_PREFIX}/open`;
export const ROUTE_DELETE = `${ROUTE_PREFIX}/session/delete`;
export const ROUTE_WORKSPACE_DELETE = `${ROUTE_PREFIX}/workspace/delete`;
export const ROUTE_PERMISSION_DEFAULTS = `${ROUTE_PREFIX}/permission-defaults`;
/** 请求体上限（只传路径或会话 id 列表，64KB 足够）。 */
const MAX_BODY_BYTES = 64 * 1024;

/** 读原生权限目录；旧宿主没有该服务时返回 null。 */
function readPermissionCatalog(ctx) {
  try {
    const service = ctx?.get?.('permissionPresets');
    if (service === null || service === undefined || typeof service.catalog !== 'function') return null;
    const catalog = service.catalog();
    if (catalog === null || typeof catalog !== 'object' || catalog.then !== undefined) return null;
    return {
      options: Array.isArray(catalog.options) ? catalog.options : [],
      defaultPreset: typeof catalog.defaultPreset === 'string' ? catalog.defaultPreset : '',
    };
  } catch {
    return null;
  }
}

/**
 * 写一个 JSON 响应；handler 自己拥有响应生命周期。
 * 客户端提前断开时 setHeader/end 会抛错，这里吞掉并尽力结束响应 ——
 * 否则会变成未处理的 rejection。
 */
function writeJson(res, status, body) {
  try {
    const text = JSON.stringify(body);
    res.statusCode = status;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(text);
  } catch {
    try {
      res.end();
    } catch {
      /* 连接已经断开 */
    }
  }
}

/** 读取并解析 JSON 请求体（带大小上限）。 */
function readJsonBody(request, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    function cleanup() {
      request.removeListener('data', onData);
      request.removeListener('end', onEnd);
      request.removeListener('error', onError);
    }
    function fail(error) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    }
    function succeed(value) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    }
    function onData(chunk) {
      if (settled) return;
      size += chunk.length;
      if (size > limit) {
        fail(new Error('request body too large'));
        // 超限后断开连接；already-settled 的 Promise 不会再被后续 data/end 影响。
        try {
          request.destroy();
        } catch {
          /* 已经断开 */
        }
        return;
      }
      chunks.push(chunk);
    }
    function onEnd() {
      if (chunks.length === 0) {
        succeed({});
        return;
      }
      try {
        succeed(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        fail(error);
      }
    }
    function onError(error) {
      fail(error);
    }
    request.on('data', onData);
    request.on('end', onEnd);
    request.on('error', onError);
  });
}

function pathnameOf(request) {
  return new URL(request.url ?? '/', 'http://dsh.invalid').pathname;
}

/**
 * 处理一次打开请求。
 * 状态码约定：403 非本机 / 405 方法错 / 404 路径或目标资源不存在 /
 * 400 请求体或参数不合法 / 500 启动失败 / 200 已启动。
 */
export async function handleOpenRequest(request, response) {
  if (!isLoopbackRequest(request)) {
    writeJson(response, 403, { ok: false, error: 'forbidden' });
    return;
  }
  if (request.method !== 'POST') {
    writeJson(response, 405, { ok: false, error: 'method-not-allowed' });
    return;
  }
  if (pathnameOf(request) !== ROUTE_OPEN) {
    writeJson(response, 404, { ok: false, error: 'not-found' });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    writeJson(response, 400, { ok: false, error: 'bad-request' });
    return;
  }

  const target = payload?.target;
  if (target !== 'vscode' && target !== 'explorer') {
    writeJson(response, 400, { ok: false, error: 'bad-target' });
    return;
  }
  const inspected = inspectOpenPath(payload?.path);
  if (inspected.error !== undefined) {
    const status = inspected.error === 'path-required' || inspected.error === 'path-not-absolute' ? 400 : 404;
    writeJson(response, status, { ok: false, error: inspected.error });
    return;
  }

  const opened = target === 'vscode'
    ? await openInVscode(inspected.path)
    : await revealDirectory(inspected.path);
  if (!opened.started) {
    writeJson(response, 500, { ok: false, error: opened.error ?? 'spawn-failed' });
    return;
  }
  writeJson(response, 200, { ok: true, via: opened.via });
}

/**
 * 处理一次永久删除请求。
 * 请求体：{ sessionIds: string[] }（1..500，服务端去重）。
 * 200 返回 { ok, deleted, failed, error?, code? }，部分失败也是 200（客户端据此显示计数）。
 */
export async function handleSessionDeleteRequest(request, response, ctx) {
  if (!isLoopbackRequest(request)) {
    writeJson(response, 403, { ok: false, error: 'forbidden' });
    return;
  }
  if (request.method !== 'POST') {
    writeJson(response, 405, { ok: false, error: 'method-not-allowed' });
    return;
  }
  if (pathnameOf(request) !== ROUTE_DELETE) {
    writeJson(response, 404, { ok: false, error: 'not-found' });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    writeJson(response, 400, { ok: false, error: 'bad-request' });
    return;
  }
  const ids = payload?.sessionIds;
  if (
    !Array.isArray(ids)
    || ids.length === 0
    || ids.length > DELETE_BATCH_LIMIT
    || ids.some((id) => typeof id !== 'string' || id.trim() === '')
  ) {
    writeJson(response, 400, { ok: false, error: 'bad-request' });
    return;
  }

  if (ctx === undefined || ctx === null || typeof ctx.get !== 'function') {
    writeJson(response, 503, { ok: false, error: 'service-unavailable' });
    return;
  }
  for (const name of ['sessions', 'sessionQuery', 'sessionPersistence']) {
    let available;
    try {
      available = ctx.get(name) !== undefined && ctx.get(name) !== null;
    } catch {
      available = false;
    }
    if (!available) {
      writeJson(response, 503, { ok: false, error: 'service-unavailable' });
      return;
    }
  }
  try {
    const outcome = await removeSessions(ctx, ids);
    writeJson(response, 200, outcome);
  } catch (error) {
    ctx.logger?.warn?.('[dsh-sidebar-row-menu] session delete failed:', error);
    writeJson(response, 500, { ok: false, error: 'delete-failed' });
  }
}

/**
 * 处理一次「删除工作区及其全部会话」请求。
 * 请求体：{ workspaceId: string }。
 * 200 返回 { ok, sessions, deleted, failed, workspaceDeleted, error?, code? }。
 * 会话删除有失败时不会删工作区，返回 ok:false 让客户端保留工作区并提示重试。
 */
export async function handleWorkspaceDeleteRequest(request, response, ctx) {
  if (!isLoopbackRequest(request)) {
    writeJson(response, 403, { ok: false, error: 'forbidden' });
    return;
  }
  if (request.method !== 'POST') {
    writeJson(response, 405, { ok: false, error: 'method-not-allowed' });
    return;
  }
  if (pathnameOf(request) !== ROUTE_WORKSPACE_DELETE) {
    writeJson(response, 404, { ok: false, error: 'not-found' });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    writeJson(response, 400, { ok: false, error: 'bad-request' });
    return;
  }
  const workspaceId = payload?.workspaceId;
  if (typeof workspaceId !== 'string' || workspaceId.trim() === '') {
    writeJson(response, 400, { ok: false, error: 'bad-request' });
    return;
  }

  if (ctx === undefined || ctx === null || typeof ctx.get !== 'function') {
    writeJson(response, 503, { ok: false, error: 'service-unavailable' });
    return;
  }
  for (const name of ['sessions', 'sessionQuery', 'sessionPersistence', 'workspaceRegistry']) {
    let available;
    try {
      available = ctx.get(name) !== undefined && ctx.get(name) !== null;
    } catch {
      available = false;
    }
    if (!available) {
      writeJson(response, 503, { ok: false, error: 'service-unavailable' });
      return;
    }
  }
  try {
    const outcome = await removeWorkspaceWithSessions(ctx, workspaceId);
    writeJson(response, 200, outcome);
  } catch (error) {
    ctx.logger?.warn?.('[dsh-sidebar-row-menu] workspace delete failed:', error);
    writeJson(response, 500, { ok: false, error: 'delete-failed' });
  }
}

/**
 * 读写「工作区 → 新会话默认权限」映射。
 *   GET  /dsh-sidebar-row-menu/permission-defaults → { ok, defaults }
 *   POST /dsh-sidebar-row-menu/permission-defaults { workspaceId, preset }
 *        preset=null 表示删除覆盖、恢复跟随全局默认。
 * 写之前用宿主 permissionPresets.names 校验，避免存进一个不存在的预设。
 */
export async function handlePermissionDefaultsRequest(request, response, ctx, store) {
  if (!isLoopbackRequest(request)) {
    writeJson(response, 403, { ok: false, error: 'forbidden' });
    return;
  }
  if (pathnameOf(request) !== ROUTE_PERMISSION_DEFAULTS) {
    writeJson(response, 404, { ok: false, error: 'not-found' });
    return;
  }
  if (store === null || store === undefined || typeof store.read !== 'function') {
    writeJson(response, 503, { ok: false, error: 'service-unavailable' });
    return;
  }
  if (request.method === 'GET') {
    let defaults;
    try {
      defaults = store.read();
    } catch (error) {
      ctx?.logger?.warn?.('[dsh-sidebar-row-menu] permission defaults read failed:', error);
      writeJson(response, 500, { ok: false, error: 'read-failed' });
      return;
    }
    writeJson(response, 200, {
      ok: true,
      defaults,
      catalog: readPermissionCatalog(ctx),
    });
    return;
  }
  if (request.method !== 'POST') {
    writeJson(response, 405, { ok: false, error: 'method-not-allowed' });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    writeJson(response, 400, { ok: false, error: 'bad-request' });
    return;
  }
  const workspaceId = payload?.workspaceId;
  if (typeof workspaceId !== 'string' || workspaceId.trim() === '') {
    writeJson(response, 400, { ok: false, error: 'bad-request' });
    return;
  }
  const preset = payload?.preset;
  if (preset !== null && (typeof preset !== 'string' || preset.trim() === '')) {
    writeJson(response, 400, { ok: false, error: 'bad-request' });
    return;
  }
  if (preset !== null) {
    let service;
    try {
      service = ctx?.get?.('permissionPresets');
    } catch {
      service = undefined;
    }
    let names = null;
    try {
      names = Array.isArray(service?.names) ? service.names : null;
    } catch {
      names = null;
    }
    if (names === null) {
      writeJson(response, 503, { ok: false, error: 'service-unavailable' });
      return;
    }
    if (!names.includes(preset)) {
      writeJson(response, 400, { ok: false, error: 'bad-preset' });
      return;
    }
  }

  try {
    const defaults = store.set(workspaceId, preset);
    writeJson(response, 200, { ok: true, defaults });
  } catch (error) {
    ctx?.logger?.warn?.('[dsh-sidebar-row-menu] permission defaults write failed:', error);
    writeJson(response, 500, { ok: false, error: 'write-failed' });
  }
}

/** 构造 webServer 路由对象（kind=prefix）。 */
export function createOpenRoute(ctx, options = {}) {
  const permissionStore = options.permissionStore ?? createPermissionDefaultsStore();
  async function dispatch(request, response) {
    const pathname = pathnameOf(request);
    if (pathname === ROUTE_OPEN) return handleOpenRequest(request, response);
    if (pathname === ROUTE_DELETE) return handleSessionDeleteRequest(request, response, ctx);
    if (pathname === ROUTE_WORKSPACE_DELETE) return handleWorkspaceDeleteRequest(request, response, ctx);
    if (pathname === ROUTE_PERMISSION_DEFAULTS) {
      return handlePermissionDefaultsRequest(request, response, ctx, permissionStore);
    }
    if (!isLoopbackRequest(request)) {
      writeJson(response, 403, { ok: false, error: 'forbidden' });
      return undefined;
    }
    writeJson(response, 404, { ok: false, error: 'not-found' });
    return undefined;
  }
  return {
    kind: 'prefix',
    path: ROUTE_PREFIX,
    handler: (request, response) => {
      // handler 返回的 Promise 宿主不会接管；这里兜住 rejection，
      // 保证任何意外错误都落到 500，而不是未处理的 rejection。
      return Promise.resolve(dispatch(request, response)).catch((error) => {
        ctx?.logger?.warn?.('[dsh-sidebar-row-menu] route failed:', error);
        writeJson(response, 500, { ok: false, error: 'route-failed' });
      });
    },
  };
}
