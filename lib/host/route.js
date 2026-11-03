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
import { DELETE_BATCH_LIMIT, removeSessions } from './session-delete.js';
import { removeWorkspaceWithSessions } from './workspace-delete.js';

/** 路由前缀；客户端半边硬编码同一个值。 */
export const ROUTE_PREFIX = '/dsh-sidebar-row-menu';
export const ROUTE_OPEN = `${ROUTE_PREFIX}/open`;
export const ROUTE_DELETE = `${ROUTE_PREFIX}/session/delete`;
export const ROUTE_WORKSPACE_DELETE = `${ROUTE_PREFIX}/workspace/delete`;
/** 请求体上限（只传路径或会话 id 列表，64KB 足够）。 */
const MAX_BODY_BYTES = 64 * 1024;

/** 写一个 JSON 响应；handler 自己拥有响应生命周期。 */
function writeJson(res, status, body) {
  const text = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(text);
}

/** 读取并解析 JSON 请求体（带大小上限）。 */
function readJsonBody(request, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('request body too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
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
    ? openInVscode(inspected.path)
    : revealDirectory(inspected.path);
  if (!opened.started) {
    writeJson(response, 500, { ok: false, error: 'spawn-failed' });
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

/** 构造 webServer 路由对象（kind=prefix）。 */export function createOpenRoute(ctx) {
  return {
    kind: 'prefix',
    path: ROUTE_PREFIX,
    handler: (request, response) => {
      const pathname = pathnameOf(request);
      if (pathname === ROUTE_OPEN) return handleOpenRequest(request, response);
      if (pathname === ROUTE_DELETE) return handleSessionDeleteRequest(request, response, ctx);
      if (pathname === ROUTE_WORKSPACE_DELETE) return handleWorkspaceDeleteRequest(request, response, ctx);
      if (!isLoopbackRequest(request)) {
        writeJson(response, 403, { ok: false, error: 'forbidden' });
        return undefined;
      }
      writeJson(response, 404, { ok: false, error: 'not-found' });
      return undefined;
    },
  };
}
