import { ELLIPSIS_DEFAULTS, ELLIPSIS_KEY, ELLIPSIS_KEYS, PLACEMENT_KEY, PLACEMENT_VALUES } from '../constants.js';
import { createStore, readBooleanRecord, readStoredJson, writeStoredJson } from '../lib/create-store.js';

/** 旧版只有一个「…」菜单，存的是 boolean；升级后折成三态里的 both。 */
function readStoredEllipsis() {
  return readBooleanRecord(ELLIPSIS_KEY, ELLIPSIS_KEYS, ELLIPSIS_DEFAULTS);
}

function readStoredPlacements() {
  const defaults = {};
  for (const key of ELLIPSIS_KEYS) defaults[key] = 'context';
  const legacy = readStoredEllipsis();
  for (const key of ELLIPSIS_KEYS) {
    if (legacy[key] === true) defaults[key] = 'both';
  }
  const parsed = readStoredJson(PLACEMENT_KEY);
  if (parsed === null || typeof parsed !== 'object') return defaults;
  for (const key of ELLIPSIS_KEYS) {
    if (PLACEMENT_VALUES.includes(parsed[key])) defaults[key] = parsed[key];
  }
  return defaults;
}

const placementStore = createStore(readStoredPlacements, {
  persist: (state) => writeStoredJson(PLACEMENT_KEY, state),
});

function publishPlacements() {
  placementStore.publish();
}

function subscribePlacements(listener) {
  return placementStore.subscribe(listener);
}

function placementsSnapshot() {
  return placementStore.snapshot();
}

function usePlacements() {
  return placementStore.useValue();
}

function placementOf(key) {
  const value = placementStore.snapshot()[key];
  return PLACEMENT_VALUES.includes(value) ? value : 'context';
}

function showsInContext(key) {
  return placementOf(key) !== 'ellipsis';
}

function showsInEllipsis(key) {
  return placementOf(key) !== 'context';
}

/** 三态位置；不允许把条目同时从两边关掉，所以最小值是其中一边。 */
function setPlacement(key, value) {
  if (!ELLIPSIS_KEYS.includes(key) || !PLACEMENT_VALUES.includes(value)) return;
  placementStore.set((state) => ({ ...state, [key]: value }));
}

function placementOn(key, mode) {
  const placement = placementOf(key);
  return mode === 'context' ? placement !== 'ellipsis' : placement !== 'context';
}

/** 工作区行是否至少有一项要在「…」菜单里显示（否则完全不接管原生菜单）。 */
function workspaceEllipsisOn() {
  return ['newSession', 'permissionDefault', 'openWith', 'copyPath', 'openInTab', 'deleteSessions', 'showArchived']
    .some((key) => showsInEllipsis(key));
}

export {
  placementOf,
  placementOn,
  placementsSnapshot,
  publishPlacements,
  readStoredEllipsis,
  readStoredPlacements,
  setPlacement,
  showsInContext,
  showsInEllipsis,
  subscribePlacements,
  usePlacements,
  workspaceEllipsisOn,
};
