/**
 * POST /dsh-sidebar-row-menu/open —— 浏览器端请宿主打开目录的唯一边界。
 */

import { inspectOpenPath } from './paths.js';
import { isLoopbackRequest } from './security.js';
import { openInVscode, revealDirectory } from './launch.js';

/** 路由前缀；客户端半边硬编码同一个值。 */
export const ROUTE_PREFIX = '/dsh-sidebar-row-menu';
export const ROUTE_OPEN = `${ROUTE_PREFIX}/open`;
/** 请求体上限（只传一个路径，64KB 足够）。 */
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
  const pathname = new URL(request.url ?? '/', 'http://dsh.invalid').pathname;
  if (pathname !== ROUTE_OPEN) {
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

/** 构造 webServer 路由对象（kind=prefix）。 */
export function createOpenRoute() {
  return {
    kind: 'prefix',
    path: ROUTE_PREFIX,
    handler: handleOpenRequest,
  };
}
