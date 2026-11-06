import { FALLBACK_PRESETS, PERMISSION_DEFAULTS_ENDPOINT, PRESET_LABEL_KEYS } from '../constants.js';
import { createStore } from '../lib/create-store.js';
import { toast } from '../toast.js';

function emptyPermissionState() {
  return {
    status: 'idle',
    options: FALLBACK_PRESETS.map((value) => ({ value })),
    defaultPreset: '',
    defaults: {},
    at: 0,
  };
}

const permissionStore = createStore(emptyPermissionState);

/** 每次写入自增：读请求返回时若已有更新的写入，就丢弃这份旧目录。 */
let permissionWriteSeq = 0;

function publishPermission(next) {
  permissionStore.publish(next);
}

function subscribePermission(listener) {
  return permissionStore.subscribe(listener);
}

function permissionSnapshot() {
  return permissionStore.snapshot();
}

function usePermission() {
  return permissionStore.useValue();
}

const permissionSource = {
  getSnapshot: permissionSnapshot,
  subscribe: subscribePermission,
};

function presetLabel(value, t) {
  const option = permissionStore.snapshot().options.find((candidate) => candidate?.value === value);
  const key = PRESET_LABEL_KEYS[value];
  if (typeof key === 'string') {
    const localized = t(key);
    if (localized !== key) return localized;
  }
  if (typeof option?.name === 'string' && option.name !== '') return option.name;
  return value;
}

function presetOptions() {
  return permissionStore.snapshot().options.filter((option) => (
    option !== null
    && typeof option === 'object'
    && typeof option.value === 'string'
    && option.value !== ''
    && option.value !== 'custom'
  ));
}

function workspacePreset(workspaceId) {
  const value = permissionStore.snapshot().defaults[workspaceId];
  return typeof value === 'string' ? value : '';
}

function effectivePreset(workspaceId) {
  return workspacePreset(workspaceId) || permissionStore.snapshot().defaultPreset;
}

function normalizeDefaults(value) {
  const result = {};
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [workspaceId, preset] of Object.entries(value)) {
    if (typeof workspaceId !== 'string' || workspaceId === '') continue;
    if (typeof preset !== 'string' || preset === '') continue;
    result[workspaceId] = preset;
  }
  return result;
}

function ensurePermissionData(ctx) {
  if (typeof fetch !== 'function') return;
  const state = permissionStore.snapshot();
  const now = Date.now();
  if (state.status === 'loading') return;
  if (state.status === 'ready' && now - state.at < 30000) return;
  if (state.status === 'error' && now - state.at < 15000) return;
  publishPermission({ ...state, status: 'loading', at: now });

  // 读请求期间若有写入，返回值可能比新值旧；用序号丢弃。
  const readSeq = permissionWriteSeq;
  fetch(PERMISSION_DEFAULTS_ENDPOINT, {
    headers: { accept: 'application/json' },
  }).then(
    (response) => (response.ok ? response.json() : null),
    () => null,
  ).then((payload) => {
    if (permissionWriteSeq !== readSeq) return;
    const current = permissionStore.snapshot();
    const readDefaults = payload?.ok === true
      ? normalizeDefaults(payload.defaults)
      : null;
    const catalog = payload?.catalog;
    const rawOptions = Array.isArray(catalog?.options) ? catalog.options : [];
    const options = rawOptions.filter((option) => (
      option !== null
      && typeof option === 'object'
      && typeof option.value === 'string'
      && option.value !== ''
      && option.value !== 'custom'
    ));
    const usable = options.length > 0 ? options : current.options;
    const defaultPreset = typeof catalog?.defaultPreset === 'string'
      ? catalog.defaultPreset
      : current.defaultPreset;
    publishPermission({
      status: readDefaults === null ? 'error' : 'ready',
      options: usable,
      defaultPreset,
      defaults: readDefaults ?? current.defaults,
      at: Date.now(),
    });
  }, () => {
    if (permissionWriteSeq !== readSeq) return;
    publishPermission({ ...permissionStore.snapshot(), status: 'error', at: Date.now() });
  });
}

function setWorkspacePreset(ctx, workspaceId, preset, t) {
  if (typeof workspaceId !== 'string' || workspaceId === '') return Promise.resolve(false);
  const previous = permissionStore.snapshot().defaults;
  const next = { ...previous };
  if (preset === null) delete next[workspaceId];
  else next[workspaceId] = preset;
  publishPermission({ ...permissionStore.snapshot(), status: 'ready', defaults: next, at: Date.now() });
  if (typeof fetch !== 'function') {
    publishPermission({ ...permissionStore.snapshot(), defaults: previous, at: Date.now() });
    return Promise.resolve(false);
  }
  const seq = (permissionWriteSeq += 1);
  return fetch(PERMISSION_DEFAULTS_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceId, preset }),
  })
    .then((response) => response.json().catch(() => null).then((data) => {
      if (!response.ok || data?.ok !== true) throw new Error(`HTTP ${response.status}`);
      // 已被更新的写入取代：不要用旧响应覆盖新状态。
      if (permissionWriteSeq === seq) {
        publishPermission({
          ...permissionStore.snapshot(),
          status: 'ready',
          defaults: normalizeDefaults(data.defaults),
          at: Date.now(),
        });
      }
      return true;
    }))
    .catch(() => {
      // 网络层失败与业务失败走同一条回滚路径（以前 onRejected 直接返回 false，
      // 导致乐观更新留在界面上、也不提示）。
      if (permissionWriteSeq === seq) {
        publishPermission({ ...permissionStore.snapshot(), defaults: previous, at: Date.now() });
        toast(t('actionFailed'));
      }
      return false;
    });
}

export {
  effectivePreset,
  emptyPermissionState,
  ensurePermissionData,
  normalizeDefaults,
  permissionSnapshot,
  permissionSource,
  presetLabel,
  presetOptions,
  publishPermission,
  setWorkspacePreset,
  subscribePermission,
  usePermission,
  workspacePreset,
};
