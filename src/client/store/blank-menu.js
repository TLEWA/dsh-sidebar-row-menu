import { BLANK_MENU_DEFAULTS, BLANK_MENU_KEY, BLANK_MENU_KEYS } from '../constants.js';
import { createStore, readBooleanRecord, writeStoredJson } from '../lib/create-store.js';

function readStoredBlankMenu() {
  return readBooleanRecord(BLANK_MENU_KEY, BLANK_MENU_KEYS, BLANK_MENU_DEFAULTS);
}

const blankMenuStore = createStore(readStoredBlankMenu, {
  persist: (state) => writeStoredJson(BLANK_MENU_KEY, state),
});

function publishBlankMenu() {
  blankMenuStore.publish();
}

function subscribeBlankMenu(listener) {
  return blankMenuStore.subscribe(listener);
}

function blankMenuSnapshot() {
  return blankMenuStore.snapshot();
}

function useBlankMenu() {
  return blankMenuStore.useValue();
}

function setBlankMenu(key, enabled) {
  if (!BLANK_MENU_KEYS.includes(key)) return;
  blankMenuStore.set((state) => ({ ...state, [key]: enabled === true }));
}

/** 该项默认开启：只有显式存成 false 才关闭。 */
function blankOption(key) {
  const value = blankMenuStore.snapshot()[key];
  if (typeof value === 'boolean') return value;
  return BLANK_MENU_DEFAULTS[key] !== false;
}

export {
  blankMenuSnapshot,
  blankOption,
  publishBlankMenu,
  readStoredBlankMenu,
  setBlankMenu,
  subscribeBlankMenu,
  useBlankMenu,
};
