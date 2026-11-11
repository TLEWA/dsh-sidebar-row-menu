import { fiberOf, resolveSessionRow, resolveWorkspaceRow } from '../dom.js';
import { sessionCwd } from '../host-api.js';
import { fileTargetAt } from './file-target.js';
import { activeSessionHeader, collectHeaderToolbarItems, isBlankConversationTarget, openHeaderToolbarMenu, selectedSessionId } from './header-toolbar.js';
import { contextMenusOf } from './session-menu.js';
import { openWorkspaceMenu } from './workspace-menu.js';
import { closeMenu, ellipsisTrigger, menuHost, rootCtx, setEllipsisTrigger } from '../runtime.js';
import { ensureApps } from '../store/apps.js';
import { blankOption } from '../store/blank-menu.js';
import { workspaceEllipsisOn } from '../store/placements.js';
import { closeToast } from '../toast.js';
import { clearRightClickMark, markRightClickMenu } from '../ui/right-click-mark.js';

function onBlankConversationContextMenu(event) {
  if (!blankOption('enabled')) return;
  if (!isBlankConversationTarget(event.target)) return;
  const items = collectHeaderToolbarItems(activeSessionHeader(), blankOption('keepMoreLast'));
  if (items.length === 0) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  // 提前预热应用列表：下一次右键就能直接呈现置顶应用 + 子菜单。
  try {
    ensureApps();
  } catch {
    /* ignore */
  }
  try {
    const sessionId = selectedSessionId();
    // 指针落在文件卡片 / 文件引用上时，打开方式要开那个文件，而不是会话目录。
    const fileTarget = fileTargetAt(event.target, sessionId === '' ? '' : sessionCwd(rootCtx, sessionId));
    openHeaderToolbarMenu(items, event.clientX, event.clientY, sessionId, fileTarget);
  } catch (error) {
    console.warn('[dsh-sidebar-row-menu] blank context menu failed:', error);
  }
}

/**
 * 行尾「…」按钮已经展开内置菜单时，用同一个按钮位置改挂本插件菜单。
 * 只在用户为工作区行开启了至少一个「…」附加项时接管；否则原生菜单原样工作。
 */
function onWorkspaceEllipsisClick(event) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.target === null || event.target === undefined) return;
  if (rootCtx === null || !workspaceEllipsisOn()) return;
  // 0.2.2 起宿主菜单本身就是数据驱动的：附加条目由 provider 按开关加进去，
  // 再接管「…」只会把原生菜单换成自绘的那一份。
  if (contextMenusOf(rootCtx) !== null) return;
  const target = event.target;
  if (typeof target.closest !== 'function') return;
  const row = target.closest('[data-row-key]');
  if (row === null) return;
  const rowKey = row.getAttribute('data-row-key') ?? '';
  if (!rowKey.startsWith('workspace:')) return;
  const button = target.closest('button');
  if (button === null || !row.contains(button)) return;
  // 只接管行内第一个按钮（「…」）；新建会话按钮带快捷键标记，直接放行。
  const buttons = row.querySelectorAll('button');
  if (buttons.length === 0 || buttons[0] !== button) return;
  if (button.getAttribute('aria-keyshortcuts') !== null) return;
  const props = resolveWorkspaceRow(target);
  if (props === null) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  // 再点一次「…」视为收起当前菜单。
  if (menuHost !== null && ellipsisTrigger === button) {
    closeMenu();
    return;
  }
  const rect = button.getBoundingClientRect();
  openWorkspaceMenu(props, rect.left + rect.width, rect.bottom + 4, 'ellipsis');
  setEllipsisTrigger(button);
}

/* ------------------------------------------------ 会话菜单的插件条目 */

/**
 * 条目只在「右键打开的菜单」里出现；点行尾「…」打开的菜单保持原样。
 *
 * 不能用时间窗口判断：0.2.2 的菜单是异步挂载的（要等所有 provider 的
 * ready 和 prepare 延时），菜单一替换还会先卸载旧面板再挂新面板。
 * 这里改成「手势标记 + 面板出现即收尾」：右键时打标记，条目在挂载时
 * 读一次；新面板出现（或兜底超时）后标记立刻清掉，不会残留到下一次。
 */
let anchorPatch = null;

/**
 * 内置 Menu 给会话行的「…」菜单传了 closeOnPointerLeave，指针一旦移出
 * 菜单就会关闭。工作区右键菜单没有这个行为，为了两者一致，右键打开的
 * 菜单在存活期间屏蔽 portal 面板 / 锚点冒泡到 React 根的 pointerout。
 */
let menuLeaveGuard = null;

function releaseMenuLeaveGuard() {
  const guard = menuLeaveGuard;
  menuLeaveGuard = null;
  if (guard === null) return;
  document.removeEventListener('pointerout', guard.block, true);
  document.removeEventListener('pointerover', guard.block, true);
}

function guardMenuLeave(panel, trigger) {
  releaseMenuLeaveGuard();
  const inside = (node) => {
    if (node === null || node === undefined) return false;
    return panel.contains(node)
      || (trigger !== null && trigger !== undefined && trigger.contains(node));
  };
  const block = (event) => {
    if (inside(event.target) || inside(event.relatedTarget)) {
      // React 的 onPointerLeave 由 pointerout/pointerover 合成；在 document
      // 捕获阶段截断，React 根节点就收不到这对事件，菜单也就不会因移出而关。
      event.stopPropagation();
    }
  };
  document.addEventListener('pointerout', block, true);
  document.addEventListener('pointerover', block, true);
  menuLeaveGuard = { block };
}

function anchorRectAt(x, y) {
  return { left: x, right: x, top: y, bottom: y, width: 0, height: 0, x, y };
}

function restoreAnchorRect() {
  const patch = anchorPatch;
  anchorPatch = null;
  releaseMenuLeaveGuard();
  if (patch === null) return;
  if (patch.observer !== null) patch.observer.disconnect();
  for (const item of patch.items) {
    try {
      item.el.getBoundingClientRect = item.original;
    } catch {
      /* ignore */
    }
  }
}

/**
 * 官方 Menu 没有 anchor 时会用组件根节点的 rect 定位；把「…」按钮
 * 及其两层祖先的 rect 临时指到指针位置，菜单就会开花在指针旁边。
 * 菜单一关闭（portal 面板从 body 移除）立即还原。
 */
function patchAnchorRect(button, x, y) {
  restoreAnchorRect();
  if (button === null || button === undefined || typeof button.getBoundingClientRect !== 'function') return;
  const items = [];
  let element = button;
  for (let level = 0; level < 3 && element !== null && element !== undefined; level += 1) {
    items.push({ el: element, original: element.getBoundingClientRect });
    element = element.parentElement;
  }
  const rect = anchorRectAt(x, y);
  for (const item of items) item.el.getBoundingClientRect = () => rect;
  let observer = null;
  if (typeof MutationObserver === 'function' && document.body !== null) {
    observer = new MutationObserver(() => {
      const panels = document.querySelectorAll('[role="menu"]');
      const panel = panels.length === 0 ? null : panels[panels.length - 1];
      if (panel === null) {
        restoreAnchorRect();
        return;
      }
      if (anchorPatch !== null && anchorPatch.panel !== panel) {
        anchorPatch.panel = panel;
        guardMenuLeave(panel, button);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  anchorPatch = { items, observer, panel: null };
  window.setTimeout(() => {
    if (anchorPatch !== null && document.querySelector('[role="menu"]') === null) restoreAnchorRect();
  }, 3000);
}

/**
 * 在行组件的 fiber 子树里找内置「…」Menu 的 props。
 * Menu 的 anchor 是那个省略号按钮，anchor.props.onClick 就是 setMenuOpen(v => !v)。
 * @returns Menu props，或 null。
 */
function findMenuProps(node, depth, budget) {
  if (node === null || node === undefined || depth > 18 || budget.count > 600) return null;
  budget.count += 1;
  const props = node.memoizedProps;
  if (
    props !== null
    && typeof props === 'object'
    && typeof props.open === 'boolean'
    && props.anchor !== null
    && typeof props.anchor === 'object'
    && props.anchor.props !== null
    && typeof props.anchor.props.onClick === 'function'
  ) {
    return props;
  }
  for (let child = node.child; child !== null && child !== undefined; child = child.sibling) {
    const found = findMenuProps(child, depth + 1, budget);
    if (found !== null) return found;
  }
  return null;
}

/**
 * 有些插件（例如 meow-memory 的「记忆参与」）在菜单打开后才用
 * MutationObserver 往面板里补一个 DOM 条目；它们只有在收到行内「…」
 * 按钮的 pointerdown 时才走同步注入的快路径，否则要等约 120ms 的防抖，
 * 表现就是菜单先出现、条目晚一拍再冒出来，触发一次可见的重排。
 *
 * 右键发生在行标题等位置，天然不会点到「…」按钮，所以这里补发一次
 * pointerdown，让这类插件在菜单挂载的同一帧完成注入。事件只用于通知，
 * 不派发 click，也不会二次打开菜单。
 */
function primeRowActionPointer(trigger) {
  if (trigger === null || trigger === undefined || typeof trigger.dispatchEvent !== 'function') return;
  if (typeof PointerEvent !== 'function') return;
  try {
    trigger.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: 1,
    }));
  } catch {
    /* 第三方 pointerdown 监听器抛错不应影响菜单打开 */
  }
}

/**
 * 右键会话行时在指针处展开该行自带的菜单（0.2.1 的旧内置 Menu）。
 * 0.2.2 起宿主自己提供 contextmenu 触发器，不再走这里。
 */
function openSessionRowMenu(row, x, y) {
  const trigger = typeof row.querySelector === 'function'
    ? row.querySelector('[class*="rowActions"] button')
    : null;
  const fiber = fiberOf(row);
  const menu = fiber === null ? null : findMenuProps(fiber.child, 0, { count: 0 });
  if (menu !== null && menu.open === true) return;
  patchAnchorRect(trigger, x, y);
  markRightClickMenu();
  primeRowActionPointer(trigger);
  if (menu !== null) {
    menu.anchor.props.onClick();
    return;
  }
  if (trigger !== null) trigger.click();
}

function hasNativeRowMenu(row) {
  const fiber = fiberOf(row);
  const props = fiber === null ? null : fiber.memoizedProps;
  return props !== null && props !== undefined && typeof props.onContextMenu === 'function';
}

/** 全局 contextmenu 拦截：只有命中工作区 / 会话行才接管。 */
function onContextMenu(event) {
  if (event.defaultPrevented) return;
  const target = event.target;
  if (target === null || target === undefined) return;
  const start = target.nodeType === 3 ? target.parentElement : target;
  if (start === null || start === undefined || typeof start.closest !== 'function') return;

  const row = start.closest('[data-row-key]');
  if (row === null) {
    // 不在任何侧栏行上：正文空白处的右键交给工具条菜单。
    onBlankConversationContextMenu(event);
    return;
  }
  const rowKey = row.getAttribute('data-row-key') ?? '';
  if (!rowKey.startsWith('workspace:') && !rowKey.startsWith('session:')) return;

  // 宿主自己会处理右键（0.2.2）：只打手势标记，菜单交给宿主开在指针处。
  // 这样既不用改锚点、也不用代点「…」，少两层时序假设；provider 在解析时用
  // 这个标记决定条目是否进入菜单（「…」的按下会先清标）。
  if (hasNativeRowMenu(row)) {
    if (rowKey.startsWith('session:') && resolveSessionRow(start) === null) return;
    markRightClickMenu();
    primeRowActionPointer(typeof row.querySelector === 'function'
      ? row.querySelector('[class*="rowActions"] button')
      : null);
    return;
  }

  if (rowKey.startsWith('workspace:')) {
    const props = resolveWorkspaceRow(start);
    if (props === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    try {
      openWorkspaceMenu(props, event.clientX, event.clientY);
    } catch (error) {
      console.warn('[dsh-sidebar-row-menu] workspace menu failed:', error);
    }
    return;
  }

  if (resolveSessionRow(start) === null) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  openSessionRowMenu(row, event.clientX, event.clientY);
}

/** 行尾「…」按下时先收掉右键标记：那个菜单不该出现右键条目。 */
function onRowActionsPointerDown(event) {
  // 只认真实输入：插件自己补发的 pointerdown（primeRowActionPointer）不算手势。
  if (event.isTrusted === false) return;
  const target = event.target;
  if (target === null || target === undefined) return;
  const start = target.nodeType === 3 ? target.parentElement : target;
  if (start === null || start === undefined || typeof start.closest !== 'function') return;
  if (start.closest('[class*="rowActions"]') === null) return;
  clearRightClickMark();
}

function install() {
  window.addEventListener('contextmenu', onContextMenu, true);
  document.addEventListener('pointerdown', onRowActionsPointerDown, true);
  document.addEventListener('click', onWorkspaceEllipsisClick, true);
  console.info('[dsh-sidebar-row-menu] installed');
  return () => {
    window.removeEventListener('contextmenu', onContextMenu, true);
    document.removeEventListener('pointerdown', onRowActionsPointerDown, true);
    document.removeEventListener('click', onWorkspaceEllipsisClick, true);
    closeMenu();
    closeToast();
  };
}

export { anchorPatch, anchorRectAt, findMenuProps, guardMenuLeave, hasNativeRowMenu, install, menuLeaveGuard, onBlankConversationContextMenu, onContextMenu, onRowActionsPointerDown, onWorkspaceEllipsisClick, openSessionRowMenu, patchAnchorRect, primeRowActionPointer, releaseMenuLeaveGuard, restoreAnchorRect };
