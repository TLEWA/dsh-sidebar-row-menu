/**
 * 永久删除会话：宿主端唯一的破坏性操作。
 *
 * 浏览器端删不掉磁盘上的 jsonl 日志，所以删除边界放在 host：
 *   stopActivity → detachLive → removeTranscript（强校验目录名）→ forget → emit
 *
 * 行为参考 dsh-session-menu v0.1.3 的 removeSession（MIT, big-head-pigeon），
 * 但拆成普通函数 + 动态 ctx.get(...)，不引入 Typert/remote 依赖。
 * 本插件只删目标会话，不级联删除 fork 子会话。
 */

import { readdir, rm, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

/** 一次请求最多删除的会话数；与 dsh-session-menu 的上限一致。 */
export const DELETE_BATCH_LIMIT = 500;

/** 批量删除的并发上限。 */
export const DELETE_CONCURRENCY = 4;

/** 以固定并发跑完 items，结果顺序与输入一致。 */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const width = Math.max(1, Math.min(limit, items.length));
  const runners = Array.from({ length: width }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

/** 取服务：cordis 里既可用 ctx.sessions，也可用 ctx.get('sessions')。 */
function service(ctx, name) {
  try {
    const value = ctx?.get?.(name);
    if (value !== undefined && value !== null) return value;
  } catch {
    /* get 失败就退回属性访问 */
  }
  try {
    return ctx?.[name];
  } catch {
    return undefined;
  }
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** 一次批量删除内共用的 `session id → header` 索引；读不到时把失败原因带回去。 */
async function loadHeaderIndex(ctx) {
  try {
    const records = await service(ctx, 'sessionQuery')?.listSessions?.();
    if (!Array.isArray(records)) return { entries: null, error: 'session list is unavailable' };
    const index = new Map();
    for (const record of records) {
      const header = record?.header;
      if (header !== null && typeof header === 'object' && typeof header.id === 'string') {
        index.set(header.id, header);
      }
    }
    return { entries: index, error: '' };
  } catch (error) {
    /* 读不到时不能把冷会话当成「本来就不存在」 */
    return { entries: null, error: `session list failed: ${String(error)}` };
  }
}

/**
 * 读取非 live 会话的 header；优先用批量删除开始时建好的索引。
 * @returns {Promise<{header: object|undefined, error: string}>} 列表查询失败时
 *   error 非空，调用方必须报错，不能当成 missing。
 */
async function coldHeader(ctx, id, index) {
  if (index instanceof Map) return { header: index.get(id), error: '' };
  if (index !== null && typeof index === 'object') {
    if (index.entries instanceof Map) return { header: index.entries.get(id), error: '' };
    if (typeof index.error === 'string' && index.error !== '') {
      return { header: undefined, error: index.error };
    }
  }
  try {
    const records = await service(ctx, 'sessionQuery')?.listSessions?.();
    if (!Array.isArray(records)) return { header: undefined, error: 'session list is unavailable' };
    for (const record of records) {
      if (record?.header?.id === id) return { header: record.header, error: '' };
    }
  } catch (error) {
    return { header: undefined, error: `session list failed: ${String(error)}` };
  }
  return { header: undefined, error: '' };
}

/**
 * 查询 agent 是否还在运行。
 * @returns {boolean|undefined} true 运行中，false 已停止，undefined 无法确认
 *   （agents 服务缺失、没有 get 或 get 抛错）。
 */
function sessionRunning(agents, id) {
  if (typeof agents?.get !== 'function') return undefined;
  try {
    return agents.get(id)?.status === 'running';
  } catch {
    return undefined;
  }
}

/**
 * 运行中的会话先取消，最多等 3 秒离开 running。
 * 无法确认运行状态时不能当成「已停止」：没有已进入的运行时（live 为空，
 * 即冷会话）照常删除，live 会话按仍未停止处理并交给调用方报错。
 * @param ctx - 宿主上下文。
 * @param id - 会话 id。
 * @param live - `sessions.get(id)` 的结果；undefined 表示没有已进入的运行时。
 * @returns {Promise<boolean>} 已经停止（或本来就没在跑）返回 true；
 *   仍未停止、或无法确认时返回 false，绝不在句柄还开着时强删目录。
 */
async function stopActivity(ctx, id, live) {
  const agents = service(ctx, 'agents');
  const initial = sessionRunning(agents, id);
  if (initial === undefined) return live === undefined;
  if (initial === false) return true;
  try {
    const controller = service(ctx, 'sessionController');
    void Promise.resolve(controller?.cancel?.({ sessionId: id })).catch(() => {});
  } catch {
    /* 取消失败也继续等；超时后由调用方报错 */
  }
  for (let tick = 0; tick < 30; tick += 1) {
    const running = sessionRunning(agents, id);
    if (running === false) return true;
    if (running === undefined) return false;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return sessionRunning(agents, id) === false;
}

/** 把会话从运行时摘掉；失败只记日志，不影响后续删盘。 */
function detachLive(ctx, live) {
  if (live === undefined) return;
  try {
    const sessions = service(ctx, 'sessions');
    const entry = sessions?.liveEntryFor?.(live);
    sessions?.detachEntered?.(entry);
  } catch (error) {
    ctx?.logger?.warn?.(`[dsh-sidebar-row-menu] detach failed for "${live?.header?.id}": ${String(error)}`);
  }
}

/** 优先用 sessionPersistence.locate，否则扫 <root>/<project>/<id>。 */
function transcriptDirectory(ctx, header) {
  const persistence = service(ctx, 'sessionPersistence');
  if (persistence === undefined || typeof persistence?.locate !== 'function') return undefined;
  try {
    const located = persistence.locate({ id: header.id, cwd: header.cwd });
    if (typeof located?.path === 'string' && located.path !== '') return dirname(located.path);
  } catch {
    /* 退回扫描 */
  }
  return undefined;
}

async function scanTranscriptDirectory(ctx, header) {
  const root = service(ctx, 'sessionPersistence')?.root;
  if (typeof root !== 'string' || root === '') return undefined;
  try {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (basename(entry.name) !== entry.name) continue;
      const candidate = join(root, entry.name, header.id);
      const found = await stat(candidate).catch(() => undefined);
      if (found?.isDirectory() === true) return candidate;
    }
  } catch {
    /* 扫描失败交给调用方报错 */
  }
  return undefined;
}

/**
 * 删除会话日志目录。目录名必须与 session id 逐字一致才会 rm；
 * 删除后再复查三次，防止 jsonl 句柄把目录写回来。
 */
async function removeTranscript(ctx, header) {
  let directory = transcriptDirectory(ctx, header);
  if (directory === undefined) directory = await scanTranscriptDirectory(ctx, header);
  if (directory === undefined || basename(directory) !== header.id) {
    return { ok: false, code: 'path-unverified', error: `no verified directory for session "${header.id}"` };
  }
  try {
    await rm(directory, { recursive: true, force: true });
  } catch (error) {
    return { ok: false, code: 'remove-failed', error: String(error) };
  }
  for (let tick = 0; tick < 3; tick += 1) {
    if (!(await pathExists(directory))) return { ok: true, directory };
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return { ok: false, code: 'remove-failed', error: `directory "${directory}" came back after removal` };
}

/** 清掉归档/置顶记录；两个方法对不存在 id 都是 no-op。 */
async function forget(ctx, id) {
  const registry = service(ctx, 'workspaceRegistry');
  for (const method of ['unarchiveSession', 'unpinSession']) {
    try {
      await registry?.[method]?.(id);
    } catch {
      /* 账本清理失败不影响已经删掉的日志 */
    }
  }
}

/**
 * 删除一个会话。
 * @returns {Promise<{removed:boolean, missing?:boolean, code?:string, error?:string}>}
 *   removed=true 表示确实删掉了磁盘目录；missing=true 表示本来就不存在（幂等）。
 */
export async function removeSession(ctx, id, headerIndex) {
  const sessions = service(ctx, 'sessions');
  if (sessions === undefined || typeof sessions?.get !== 'function') {
    return { removed: false, code: 'unavailable', error: 'sessions service is unavailable' };
  }
  const live = sessions.get(id);
  const cold = live?.header === undefined
    ? await coldHeader(ctx, id, headerIndex)
    : { header: live.header, error: '' };
  const header = cold.header;
  if (header === undefined) {
    if (cold.error !== '') {
      return { removed: false, code: 'header-lookup-failed', error: cold.error };
    }
    await forget(ctx, id);
    return { removed: false, missing: true };
  }

  if (!(await stopActivity(ctx, id, live))) {
    return { removed: false, code: 'session-running', error: `session "${id}" is still running` };
  }
  detachLive(ctx, live);
  const removed = await removeTranscript(ctx, header);
  if (removed.ok !== true) {
    return { removed: false, code: removed.code, error: removed.error };
  }
  await forget(ctx, id);
  try {
    ctx?.emit?.('api-session/removed', id);
  } catch {
    /* 通知失败不改变删除结果，下一次列表刷新也会消失 */
  }
  return { removed: true };
}

/**
 * 批量删除（串行，避免同时 rm 多个会话目录）。
 * @returns {Promise<{ok:boolean, deleted:number, failed:number, error:string, code?:string}>}
 */
export async function removeSessions(ctx, ids) {
  const unique = [];
  const seen = new Set();
  for (const id of Array.isArray(ids) ? ids : []) {
    if (typeof id !== 'string') continue;
    const value = id.trim();
    if (value === '' || seen.has(value)) continue;
    seen.add(value);
    unique.push(value);
  }
  if (unique.length === 0) {
    return { ok: false, deleted: 0, failed: 0, error: 'no session ids', code: 'bad-request' };
  }

  // 每个会话删的是自己的目录，彼此独立；串行会让 500 个会话退化成分钟级。
  // 并发上限 4：既拿到大部分吞吐，又不会一次甩出几百个 rm/detach。
  const headerIndex = await loadHeaderIndex(ctx);
  const outcomes = await mapLimit(unique, DELETE_CONCURRENCY, (id) => removeSession(ctx, id, headerIndex));

  let deleted = 0;
  let missing = 0;
  let failed = 0;
  let firstCode = '';
  let firstError = '';
  for (const outcome of outcomes) {
    if (outcome?.removed === true) {
      deleted += 1;
      continue;
    }
    if (outcome?.missing === true) {
      missing += 1;
      continue;
    }
    failed += 1;
    if (firstCode === '') {
      firstCode = outcome?.code ?? 'remove-failed';
      firstError = outcome?.error ?? '';
    }
  }
  if (failed > 0) {
    return {
      ok: false,
      deleted,
      missing,
      failed,
      error: firstError === '' ? firstCode : firstError,
      code: 'batch-failed',
    };
  }
  return { ok: true, deleted, missing, failed: 0, error: '' };
}
