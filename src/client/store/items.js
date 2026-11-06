import { ITEMS_KEY, ITEM_DEFAULTS, ITEM_KEYS } from '../constants.js';
import { createStore, readBooleanRecord, writeStoredJson } from '../lib/create-store.js';

function readStoredItems() {
  return readBooleanRecord(ITEMS_KEY, ITEM_KEYS, ITEM_DEFAULTS);
}

const itemStore = createStore(readStoredItems, {
  persist: (state) => writeStoredJson(ITEMS_KEY, state),
});

function publishItems() {
  itemStore.publish();
}

function subscribeItems(listener) {
  return itemStore.subscribe(listener);
}

function itemsSnapshot() {
  return itemStore.snapshot();
}

function useItems() {
  return itemStore.useValue();
}

function setItem(key, enabled) {
  if (!ITEM_KEYS.includes(key)) return;
  itemStore.set((state) => ({ ...state, [key]: enabled === true }));
}

function itemOn(key) {
  const state = itemStore.snapshot();
  return state[key] ?? ITEM_DEFAULTS[key] ?? false;
}

export { itemOn, itemsSnapshot, publishItems, readStoredItems, setItem, subscribeItems, useItems };
