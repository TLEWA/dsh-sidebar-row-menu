import { DELETE_BATCH_LIMIT, DELETE_ENDPOINT, WORKSPACE_DELETE_ENDPOINT } from '../constants.js';
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

function postDeleteBatch(ids) {
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

/**
 * 宿主路由一批最多接受 DELETE_BATCH_LIMIT 个会话，超出整批 400。
 * 逐批串行提交并把计数合并回一个结果，保证「删除所有已归档会话」
 * 在归档数超过上限时仍然可用、失败也能如实汇报。
 */
function postDelete(ids) {
  const list = Array.isArray(ids) ? ids : [];
  if (list.length <= DELETE_BATCH_LIMIT) return postDeleteBatch(list);
  const outcome = { ok: true, deleted: 0, missing: 0, failed: 0, error: '' };
  let chain = Promise.resolve();
  for (let start = 0; start < list.length; start += DELETE_BATCH_LIMIT) {
    const batch = list.slice(start, start + DELETE_BATCH_LIMIT);
    chain = chain
      .then(() => postDeleteBatch(batch))
      .then((result) => {
        outcome.deleted += result.deleted ?? 0;
        outcome.missing += result.missing ?? 0;
        outcome.failed += result.failed ?? 0;
        if (result.ok !== true) {
          outcome.ok = false;
          if (outcome.error === '' && typeof result.error === 'string') outcome.error = result.error;
        }
      });
  }
  return chain.then(() => outcome);
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
