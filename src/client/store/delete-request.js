import { DELETE_ENDPOINT, WORKSPACE_DELETE_ENDPOINT } from '../constants.js';
import { createStore } from '../lib/create-store.js';

const deleteStore = createStore(null);
let deleteSeq = 0;

function subscribeDelete(listener) {
  return deleteStore.subscribe(listener);
}

function deleteSnapshot() {
  return deleteStore.snapshot();
}

function useDeleteRequest() {
  return deleteStore.useValue();
}

function publishDelete() {
  deleteStore.publish();
}

function requestDelete(request) {
  deleteSeq += 1;
  deleteStore.publish({ ...request, seq: deleteSeq });
}

function closeDelete() {
  if (deleteStore.snapshot() === null) return;
  deleteStore.publish(null);
}

function postDelete(ids) {
  if (typeof fetch !== 'function') return Promise.resolve({ ok: false, deleted: 0, failed: ids.length, error: 'network' });
  return fetch(DELETE_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionIds: ids }),
  })
    .then((response) => response.json().catch(() => null)
      .then((payload) => (payload !== null && typeof payload === 'object'
        ? payload
        : { ok: false, deleted: 0, failed: ids.length, error: `HTTP ${response.status}` })))
    .catch(() => ({ ok: false, deleted: 0, failed: ids.length, error: 'network' }));
}

function postWorkspaceDelete(workspaceId) {
  if (typeof fetch !== 'function') return Promise.resolve({ ok: false, deleted: 0, failed: 0, error: 'network' });
  return fetch(WORKSPACE_DELETE_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceId }),
  })
    .then((response) => response.json().catch(() => null)
      .then((payload) => (payload !== null && typeof payload === 'object'
        ? payload
        : { ok: false, deleted: 0, failed: 0, error: `HTTP ${response.status}` })))
    .catch(() => ({ ok: false, deleted: 0, failed: 0, error: 'network' }));
}

export {
  closeDelete,
  deleteSnapshot,
  postDelete,
  postWorkspaceDelete,
  publishDelete,
  requestDelete,
  subscribeDelete,
  useDeleteRequest,
};
