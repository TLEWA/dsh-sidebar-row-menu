import { OPEN_WITH_CHILDREN_KEY } from '../constants.js';
import { createStore, readStoredJson, writeStoredJson } from '../lib/create-store.js';

function readStoredChildren() {
  const parsed = readStoredJson(OPEN_WITH_CHILDREN_KEY);
  return parsed !== null && typeof parsed === 'object' ? parsed : {};
}

const childStore = createStore(readStoredChildren, {
  persist: (state) => writeStoredJson(OPEN_WITH_CHILDREN_KEY, state),
});

function publishChildren() {
  childStore.publish();
}

function subscribeChildren(listener) {
  return childStore.subscribe(listener);
}

function childrenSnapshot() {
  return childStore.snapshot();
}

function useChildren() {
  return childStore.useValue();
}

function setChild(appId, enabled) {
  childStore.set((state) => ({ ...state, [appId]: enabled === true }));
}

function childOn(appId) {
  return childStore.snapshot()[appId] !== false;
}

export {
  childOn,
  childrenSnapshot,
  publishChildren,
  readStoredChildren,
  setChild,
  subscribeChildren,
  useChildren,
};
