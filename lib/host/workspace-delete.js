/**
 * 删除工作区及其下所有会话。
 *
 * 内置 `workspaces.delete(id)`（registry.delete）只摘掉工作区登记，会话会被
 * 重新归到「未分组」。这里先按工作区的 sessionIds 永久删除每个会话日志，
 * 全部成功后再删工作区登记；任何一个会话删除失败就保留工作区，避免留下
 * 一堆没人管的「未分组」会话。
 *
 * 工作区目录本身不删（和内置行为一致），只删会话日志与工作区记录。
 */

import { removeSessions } from './session-delete.js';

function service(ctx, name) {
  try {
    return ctx.get(name);
  } catch {
    return undefined;
  }
}

/**
 * 永久删除一个工作区及其全部会话。
 * @param ctx - 宿主插件上下文。
 * @param workspaceId - 工作区 id。
 * @returns {Promise<{ok:boolean,sessions:number,deleted:number,failed:number,
 *   workspaceDeleted:boolean,missing?:boolean,code?:string,error:string}>}
 */
export async function removeWorkspaceWithSessions(ctx, workspaceId) {
  const registry = service(ctx, 'workspaceRegistry');
  if (
    registry === null
    || registry === undefined
    || typeof registry.get !== 'function'
    || typeof registry.delete !== 'function'
  ) {
    return {
      ok: false,
      sessions: 0,
      deleted: 0,
      failed: 0,
      workspaceDeleted: false,
      code: 'unavailable',
      error: 'workspace-registry-unavailable',
    };
  }

  let workspace;
  try {
    workspace = registry.get(workspaceId);
  } catch (error) {
    return {
      ok: false,
      sessions: 0,
      deleted: 0,
      failed: 0,
      workspaceDeleted: false,
      code: 'lookup-failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
  if (workspace === null || workspace === undefined) {
    return { ok: true, sessions: 0, deleted: 0, failed: 0, workspaceDeleted: false, missing: true, error: '' };
  }

  const ids = Array.isArray(workspace.sessionIds)
    ? workspace.sessionIds.filter((id) => typeof id === 'string' && id.trim() !== '')
    : [];
  let deleted = 0;
  if (ids.length > 0) {
    const outcome = await removeSessions(ctx, ids);
    deleted = outcome.deleted ?? 0;
    if (outcome.ok !== true) {
      return {
        ok: false,
        sessions: ids.length,
        deleted,
        failed: outcome.failed ?? Math.max(0, ids.length - deleted),
        workspaceDeleted: false,
        code: typeof outcome.code === 'string' ? outcome.code : 'session-delete-failed',
        error: typeof outcome.error === 'string' ? outcome.error : '',
      };
    }
  }

  let workspaceDeleted = false;
  try {
    workspaceDeleted = (await registry.delete(workspaceId)) !== false;
  } catch (error) {
    return {
      ok: false,
      sessions: ids.length,
      deleted,
      failed: 0,
      workspaceDeleted: false,
      code: 'workspace-delete-failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
  return { ok: true, sessions: ids.length, deleted, failed: 0, workspaceDeleted, error: '' };
}
