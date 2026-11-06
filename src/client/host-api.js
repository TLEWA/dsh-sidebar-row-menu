import { OPEN_ENDPOINT } from './constants.js';
import { writeClipboard } from './platform.js';
import { serviceOf } from './runtime.js';
import { toast } from './toast.js';

async function openExternal(target, path) {
  try {
    const response = await fetch(OPEN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target, path }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data === null || data.ok !== true) return { ok: false, via: '' };
    return { ok: true, via: typeof data.via === 'string' ? data.via : '' };
  } catch {
    return { ok: false, via: '' };
  }
}

function openPath(target, path, t) {
  if (typeof path !== 'string' || path === '') {
    toast(t('noPath'));
    return;
  }
  openExternal(target, path).then((result) => {
    if (!result.ok) {
      toast(t('openFailed'));
      return;
    }
    console.info(`[dsh-sidebar-row-menu] ${target} -> ${result.via || 'ok'}`);
  });
}

async function copyText(text, t) {
  try {
    const ok = await writeClipboard(text);
    toast(ok ? t('copied') : t('copyFailed'), ok ? 'success' : 'warning');
  } catch (error) {
    console.warn('[dsh-sidebar-row-menu] clipboard failed:', error);
    toast(t('copyFailed'), 'warning');
  }
}

function workspaceCwd(ctx, group) {
  if (typeof group?.cwd === 'string' && group.cwd !== '') return group.cwd;
  const workspaces = serviceOf(ctx, 'workspaces');
  const items = workspaces?.list?.getSnapshot?.()?.items;
  if (!Array.isArray(items)) return '';
  const item = items.find((candidate) => candidate.workspaceId === group?.workspaceId);
  return typeof item?.path === 'string' ? item.path : '';
}

function sessionCwd(ctx, sessionId) {
  const sessions = serviceOf(ctx, 'sessions');
  const session = sessions?.list?.getSnapshot?.()?.byId?.[sessionId];
  if (typeof session?.cwd === 'string' && session.cwd !== '') return session.cwd;
  const workspaces = serviceOf(ctx, 'workspaces');
  const items = workspaces?.list?.getSnapshot?.()?.items;
  if (!Array.isArray(items)) return '';
  const item = items.find((candidate) => Array.isArray(candidate.sessionIds) && candidate.sessionIds.includes(sessionId));
  return typeof item?.path === 'string' ? item.path : '';
}

/* ------------------------------------------------ 菜单项设置（localStorage） */

export { copyText, openExternal, openPath, sessionCwd, workspaceCwd };
