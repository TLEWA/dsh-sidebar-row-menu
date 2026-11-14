import { useState } from '../platform.js';

let rightClickMark = false;
/**
 * 最近一次打开菜单的手势（'context' = 右键，'ellipsis' = 行尾「…」）。
 * 与 rightClickMark 不同，这个值不会在菜单出现后自动复位：宿主会在菜单打开
 * 之后异步重解析贡献项，若按实时标记判断，条目会在面板里凭空出现或消失。
 */
let menuGesture = 'context';
let rightClickToken = 0;
let rightClickWatch = null;
/** 整页 DOM 观察者只建一个，每次右键只 observe/disconnect，不重复 new。 */
let rightClickObserver = null;

/** 收掉右键标记；期间若又发生一次右键（token 变了）则保留新的标记。 */
function scheduleRightClickMarkEnd(delay) {
  const token = rightClickToken;
  window.setTimeout(() => {
    if (rightClickToken === token) rightClickMark = false;
  }, delay);
}

/** 当前文档里的菜单面板（测试里的最小 document stub 可能没有 querySelectorAll）。 */
function menuPanels() {
  if (typeof document.querySelectorAll !== 'function') return [];
  return [...document.querySelectorAll('[role="menu"]')];
}

/** 收尾当前这一轮手势：停观察、清兜底定时器，再按 delay 清标记。 */
function releaseRightClickWatch(delay) {
  const watch = rightClickWatch;
  if (watch === null) return;
  rightClickWatch = null;
  window.clearTimeout(watch.timer);
  rightClickObserver?.disconnect();
  scheduleRightClickMarkEnd(delay);
}

function ensureRightClickObserver() {
  if (rightClickObserver !== null) return rightClickObserver;
  if (typeof MutationObserver !== 'function') return null;
  rightClickObserver = new MutationObserver(() => {
    const watch = rightClickWatch;
    if (watch === null) return;
    for (const panel of menuPanels()) {
      if (watch.known.has(panel)) continue;
      releaseRightClickWatch(400);
      return;
    }
  });
  return rightClickObserver;
}

/** 右键手势开始：打标记，并等菜单面板出现后收尾。 */
function markRightClickMenu() {
  rightClickToken += 1;
  rightClickMark = true;
  menuGesture = 'context';
  if (rightClickWatch !== null) return;
  const watch = { known: new Set(menuPanels()), timer: 0 };
  rightClickWatch = watch;
  // 面板迟迟不出现（手势被吞掉）也要收尾，避免标记残留。
  watch.timer = window.setTimeout(() => releaseRightClickWatch(0), 3000);
  const observer = ensureRightClickObserver();
  if (observer === null || document.body === null) return;
  observer.observe(document.body, { childList: true, subtree: true });
}

/** 点行尾「…」时先清掉上一轮的右键标记：那个菜单不该出现右键条目。 */
function clearRightClickMark() {
  rightClickToken += 1;
  rightClickMark = false;
  menuGesture = 'ellipsis';
}

/** 当前菜单是哪只手势打开的；供宿主数据贡献的 resolve 决定条目位置。 */
function currentMenuGesture() {
  return menuGesture;
}

function useRightClickEntry() {
  const [visible] = useState(() => rightClickMark);
  return visible;
}

export { clearRightClickMark, currentMenuGesture, markRightClickMenu, menuPanels, rightClickMark, rightClickToken, rightClickWatch, scheduleRightClickMarkEnd, useRightClickEntry };
