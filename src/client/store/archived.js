import { useSyncExternalStore } from '../platform.js';
import { rootCtx, serviceOf } from '../runtime.js';

const EMPTY_IDS = new Set();
let archivedCache = { snapshot: undefined, ids: EMPTY_IDS };

function archivedStore() {
  return serviceOf(rootCtx, 'workspaces')?.list ?? null;
}

function archivedSnapshot() {
  const store = archivedStore();
  const snapshot = store?.getSnapshot?.();
  if (snapshot === null || snapshot === undefined) return EMPTY_IDS;
  if (archivedCache.snapshot === snapshot) return archivedCache.ids;
  const raw = Array.isArray(snapshot.archivedSessionIds) ? snapshot.archivedSessionIds : [];
  archivedCache = {
    snapshot,
    ids: new Set(raw.filter((id) => typeof id === 'string' && id !== '')),
  };
  return archivedCache.ids;
}

function subscribeArchived(listener) {
  const store = archivedStore();
  return typeof store?.subscribe === 'function' ? store.subscribe(listener) : () => {};
}

function useArchivedIds() {
  return useSyncExternalStore(subscribeArchived, archivedSnapshot, archivedSnapshot);
}

/** 会话是否是主视图正打开的那个（删掉后需要清空主视图）。 */
function isMainSession(id) {
  const snapshot = serviceOf(rootCtx, 'sessions')?.list?.getSnapshot?.();
  const byId = snapshot?.byId;
  if (byId === null || typeof byId !== 'object') return false;
  for (const row of Object.values(byId)) {
    if (row?.id === id && (row?.retainedBy?.mainView ?? 0) > 0) return true;
  }
  return false;
}

/* ------------------------------------------------------ 删除确认对话框 */

export { EMPTY_IDS, archivedCache, archivedSnapshot, archivedStore, isMainSession, subscribeArchived, useArchivedIds };
