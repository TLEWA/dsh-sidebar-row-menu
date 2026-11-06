import { FOREIGN_ITEMS, SESSION_MENU_SLOT } from './constants.js';
import { rootCtx } from './runtime.js';

function slotItemId(entry) {
  const value = entry?.options?.id ?? entry?.id ?? entry?.entry?.id;
  return typeof value === 'string' ? value : '';
}

function foreignItemIds() {
  const slots = rootCtx?.slots;
  const ids = new Set();
  if (slots === null || slots === undefined || typeof slots.entriesOfSlot !== 'function') return ids;
  try {
    const entries = slots.entriesOfSlot(SESSION_MENU_SLOT);
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        const id = slotItemId(entry);
        if (id !== '') ids.add(id);
      }
    }
  } catch (error) {
    console.warn('[dsh-sidebar-row-menu] slot lookup failed:', error);
  }
  return ids;
}

function takenOver(key) {
  const id = FOREIGN_ITEMS[key];
  return typeof id === 'string' && foreignItemIds().has(id);
}

/* ------------------------------------------------------ 已归档会话集合 */

export { foreignItemIds, slotItemId, takenOver };
