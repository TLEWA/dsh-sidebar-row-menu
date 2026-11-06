import { OPEN_WITH_PINNED_KEY, PIN_PREFERENCE } from '../constants.js';
import { createStore, readStoredJson, writeStoredJson } from '../lib/create-store.js';

function readStoredPinned() {
  const parsed = readStoredJson(OPEN_WITH_PINNED_KEY);
  if (!Array.isArray(parsed)) return null;
  return parsed.filter((id) => typeof id === 'string' && id !== '');
}

const pinnedStore = createStore(readStoredPinned, {
  persist: (state) => writeStoredJson(OPEN_WITH_PINNED_KEY, state),
});

function publishPinned() {
  pinnedStore.publish();
}

function subscribePinned(listener) {
  return pinnedStore.subscribe(listener);
}

function pinnedSnapshot() {
  return pinnedStore.snapshot();
}

function usePinned() {
  return pinnedStore.useValue();
}

/**
 * 实际置顶的应用：用户没配置过时自动挑选 —— 有已知编辑器就置顶第一个
 * 编辑器（通常是 VS Code），否则置顶官方列表里的第一个应用。
 */
function effectivePinned(ids) {
  const pinned = pinnedStore.snapshot();
  if (pinned !== null) return pinned.filter((id) => ids.includes(id));
  const preferred = ids.find((id) => PIN_PREFERENCE.includes(id));
  if (preferred !== undefined) return [preferred];
  return ids.slice(0, 1);
}

function setPinned(ids) {
  pinnedStore.set([...new Set(ids.filter((id) => typeof id === 'string' && id !== ''))]);
}

function togglePinned(appId, ids) {
  const current = effectivePinned(ids);
  setPinned(current.includes(appId) ? current.filter((id) => id !== appId) : [...current, appId]);
}

export {
  effectivePinned,
  pinnedSnapshot,
  publishPinned,
  readStoredPinned,
  setPinned,
  subscribePinned,
  togglePinned,
  usePinned,
};
