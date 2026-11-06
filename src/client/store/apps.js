import { APPS_ROUTE, OPEN_ROUTE } from '../constants.js';
import { createStore } from '../lib/create-store.js';

const appsStore = createStore({ status: 'idle', ids: [], at: 0 });

function publishApps(next) {
  appsStore.publish(next);
}

function subscribeApps(listener) {
  return appsStore.subscribe(listener);
}

function appsSnapshot() {
  return appsStore.snapshot();
}

function useApps() {
  return appsStore.useValue();
}

function ensureApps() {
  const state = appsStore.snapshot();
  if (typeof fetch !== 'function') {
    if (state.status !== 'error') {
      publishApps({ status: 'error', ids: state.ids, at: Date.now() });
    }
    return;
  }
  const now = Date.now();
  if (state.status === 'loading') return;
  if (state.status === 'ready' && now - state.at < 60000) return;
  if (state.status === 'error' && now - state.at < 10000) return;
  const previous = state.ids;
  publishApps({ status: 'loading', ids: previous, at: now });
  fetch(APPS_ROUTE, { headers: { accept: 'application/json' } })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      const ids = Array.isArray(payload?.apps)
        ? payload.apps.filter((id) => typeof id === 'string' && id !== '')
        : [];
      publishApps({ status: 'ready', ids: [...new Set(ids)], at: Date.now() });
    })
    // 失败时保留上一次拿到的应用列表：一次网络抖动不该让菜单项整体消失。
    .catch(() => publishApps({ status: 'error', ids: previous, at: Date.now() }));
}

function openApplication(appId, path) {
  if (typeof path !== 'string' || path === '') return Promise.resolve(false);
  if (typeof fetch !== 'function') return Promise.resolve(false);
  return fetch(OPEN_ROUTE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ app: appId, path }),
  }).then(
    (response) => response.ok,
    () => false,
  );
}

export {
  appsSnapshot,
  ensureApps,
  openApplication,
  publishApps,
  subscribeApps,
  useApps,
};
