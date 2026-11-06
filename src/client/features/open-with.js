import { appIcon, appLabel } from '../apps-catalog.js';
import { sessionCwd } from '../host-api.js';
import { Fragment, IconChevronRightOutlineRegular, IconRightUpOutlineRegular, IconTrashOutlineRegular, MenuItemButton, MenuSurface, jsx, useEffect, useRef, useState } from '../platform.js';
import { rootCtx } from '../runtime.js';
import { takenOver } from '../slot-ownership.js';
import { ensureApps, openApplication, useApps } from '../store/apps.js';
import { useArchivedIds } from '../store/archived.js';
import { childOn, useChildren } from '../store/children.js';
import { requestDelete } from '../store/delete-request.js';
import { useItems } from '../store/items.js';
import { effectivePinned, usePinned } from '../store/pinned.js';
import { placementOn } from '../store/placements.js';
import { toast } from '../toast.js';
import { h } from '../ui/jsx.js';
import { useHoverSubmenu, useSubmenuDismiss } from '../ui/dismiss.js';
import { chevronClass, menuCloser, useSubmenuPos } from '../ui/position.js';
import { useRightClickEntry } from '../ui/right-click-mark.js';

function OpenWithSubmenu({ t, getCwd, closeParent, separatorBefore = false }) {
  const children = useChildren();
  const apps = useApps();
  usePinned();
  const [open, setOpen] = useState(false);
  const hostRef = useRef(null);
  const { closeSoon, openNow } = useHoverSubmenu(setOpen, ensureApps);

  useEffect(() => {
    if (open) ensureApps();
  }, [open]);

  useSubmenuDismiss(open, setOpen, hostRef);

  // 面板先隐藏挂载再量真实尺寸，所以这里不再按条目数估算宽高。
  const box = useSubmenuPos(open, hostRef, [apps.status, apps.ids]);

  // 会话行菜单的 pointerover/out 在 document 捕获阶段被「移出关闭」守卫截断，
  // React 的 onPointerEnter 收不到。把悬浮展开挂到 window 捕获阶段，抢在守卫前。
  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return undefined;
    const inside = (node) => node instanceof Node && host.contains(node);
    const onOver = (event) => {
      if (inside(event.target)) openNow();
    };
    const onOut = (event) => {
      if (inside(event.target) && !inside(event.relatedTarget)) closeSoon();
    };
    window.addEventListener('pointerover', onOver, true);
    window.addEventListener('pointerout', onOut, true);
    return () => {
      window.removeEventListener('pointerover', onOver, true);
      window.removeEventListener('pointerout', onOut, true);
    };
  }, [open, apps.status, apps.ids]);

  const pick = (appId) => {
    setOpen(false);
    closeParent?.();
    const cwd = getCwd();
    if (cwd === '') {
      toast(t('noPath'));
      return;
    }
    openApplication(appId, cwd).then((ok) => {
      if (!ok) toast(t('openFailed'));
    });
  };

  const pinnedIds = new Set(effectivePinned(apps.ids));
  const enabledApps = apps.ids.filter((id) => childOn(id));
  const visibleApps = enabledApps.filter((id) => !pinnedIds.has(id));
  // 所有可用应用都置顶后，二级菜单没有内容，直接收起来。
  if (apps.status !== 'loading' && enabledApps.length > 0 && visibleApps.length === 0) {
    return null;
  }
  let panelBody;
  if (apps.status === 'error') {
    panelBody = h('div', { className: 'dsrm-submenu-empty' }, t('settings.appsError'));
  } else if (apps.ids.length === 0) {
    panelBody = h('div', { className: 'dsrm-submenu-empty' }, apps.status === 'loading' ? t('settings.appsLoading') : t('settings.appsUnavailable'));
  } else if (visibleApps.length === 0) {
    panelBody = h('div', { className: 'dsrm-submenu-empty' }, t('settings.appsAllOff'));
  } else {
    panelBody = visibleApps.map((id) => jsx(MenuItemButton, {
      key: id,
      onSelect: () => pick(id),
      icon: appIcon(id),
      children: appLabel(id, t),
    }));
  }

  const body = h('div', {
    className: 'dsrm-submenu-host',
    ref: hostRef,
    onPointerOver: openNow,
    onPointerEnter: openNow,
    onPointerLeave: closeSoon,
  },
    h('button', {
      type: 'button',
      role: 'menuitem',
      className: 'dsrm-submenu-trigger',
      'aria-haspopup': 'menu',
      'aria-expanded': open,
      onPointerOver: openNow,
      onFocus: openNow,
      onClick: () => {
        if (open) setOpen(false);
        else openNow();
      },
    },
      jsx(IconRightUpOutlineRegular, { size: 14 }),
      h('span', { className: 'dsrm-submenu-label' }, t('openWith')),
      jsx(IconChevronRightOutlineRegular, { size: 12, className: chevronClass(box) }),
    ),
    open ? h(MenuSurface, {
      role: 'group',
      'aria-label': t('openWith'),
      className: 'dsrm-submenu',
      style: {
        left: box?.left ?? 0,
        top: box?.top ?? 0,
        visibility: box === null ? 'hidden' : 'visible',
      },
    }, panelBody) : null,
  );
  if (!separatorBefore) return body;
  return h(Fragment, null,
    h('div', { className: 'dsrm-sep', role: 'separator' }),
    body,
  );
}

/**
 * 会话菜单里的「打开方式」：只在右键打开的菜单里出现，
 * 且和 dsh-session-menu 的同名能力二选一。
 */
function SessionOpenWithMenuItem({ sessionId, useMenuOpenState, t }) {
  const rightClick = useRightClickEntry();
  const visible = placementOn('sessionOpenWith', rightClick ? 'context' : 'ellipsis');
  const items = useItems();
  const apps = useApps();
  const setMenuOpen = menuCloser(useMenuOpenState);
  if (!visible || items.openWith === false || takenOver('openWith')) return null;
  const pinnedCount = apps.status === 'ready'
    ? effectivePinned(apps.ids).filter((id) => childOn(id)).length
    : 0;
  return jsx(OpenWithSubmenu, {
    t,
    getCwd: () => sessionCwd(rootCtx, sessionId),
    closeParent: () => setMenuOpen?.(false),
    separatorBefore: apps.status === 'ready' && pinnedCount === 0,
  });
}

/**
 * 置顶应用的一级菜单入口：默认自动把检测到的第一个编辑器（通常是 VS Code）
 * 放进一级菜单，用户也可以在设置里改。置顶项不再重复出现在「打开方式」里。
 */
function SessionOpenWithPinnedMenuItem({ sessionId, useMenuOpenState, t }) {
  const rightClick = useRightClickEntry();
  const visible = placementOn('sessionOpenWith', rightClick ? 'context' : 'ellipsis');
  const items = useItems();
  useChildren();
  const apps = useApps();
  usePinned();
  const setMenuOpen = menuCloser(useMenuOpenState);
  useEffect(() => {
    if (visible) ensureApps();
  }, [visible]);
  if (!visible || items.openWith === false || takenOver('openWith')) return null;
  const picked = effectivePinned(apps.ids).filter((id) => childOn(id));
  if (picked.length === 0) return null;
  const pick = (appId) => {
    setMenuOpen?.(false);
    const cwd = sessionCwd(rootCtx, sessionId);
    if (cwd === '') {
      toast(t('noPath'));
      return;
    }
    openApplication(appId, cwd).then((ok) => {
      if (!ok) toast(t('openFailed'));
    });
  };
  return h(Fragment, null, picked.map((id, index) => jsx(MenuItemButton, {
    key: id,
    separatorBefore: index === 0,
    onSelect: () => pick(id),
    icon: appIcon(id),
    children: t('openWithApp', { name: appLabel(id, t) }),
  })));
}

/**
 * 会话条目「永久删除会话」：已归档会话默认可见；未归档会话要先在设置里
 * 打开「允许删除未归档会话」。和 dsh-session-menu 的同名功能二选一。
 */
function SessionDeleteMenuItem({ sessionId, displayTitle, useMenuOpenState, t }) {
  const rightClick = useRightClickEntry();
  const visible = placementOn('sessionDelete', rightClick ? 'context' : 'ellipsis');
  const items = useItems();
  const archived = useArchivedIds();
  const setMenuOpen = menuCloser(useMenuOpenState);
  if (!visible || items.deleteSession === false || takenOver('deleteSession')) return null;
  if (!archived.has(sessionId) && items.deleteUnarchived !== true) return null;
  return jsx(MenuItemButton, {
    danger: true,
    separatorBefore: true,
    icon: jsx(IconTrashOutlineRegular, { size: 14 }),
    onSelect: () => {
      setMenuOpen?.(false);
      requestDelete({ mode: 'one', sessionId, displayTitle });
    },
    children: t('deleteSession'),
  });
}

/**
 * 会话条目「删除所有已归档会话」：只在已归档会话的菜单里显示，
 * 和 dsh-session-menu 的同名功能二选一。displayTitle 用作确认文案。
 */
function SessionDeleteArchivedMenuItem({ sessionId, displayTitle, useMenuOpenState, t }) {
  const rightClick = useRightClickEntry();
  const visible = placementOn('sessionDeleteArchived', rightClick ? 'context' : 'ellipsis');
  const items = useItems();
  const archived = useArchivedIds();
  const setMenuOpen = menuCloser(useMenuOpenState);
  if (!visible || items.deleteArchived === false || takenOver('deleteArchived')) return null;
  if (!archived.has(sessionId)) return null;
  return jsx(MenuItemButton, {
    danger: true,
    separatorBefore: items.deleteSession === false || takenOver('deleteSession'),
    icon: jsx(IconTrashOutlineRegular, { size: 14 }),
    onSelect: () => {
      const ids = [...archived];
      setMenuOpen?.(false);
      if (ids.length === 0) return;
      requestDelete({ mode: 'archived', sessionIds: ids, displayTitle });
    },
    children: t('deleteArchived'),
  });
}

/* ---------------------------------------------------------- 设置页 */

export { OpenWithSubmenu, SessionDeleteArchivedMenuItem, SessionDeleteMenuItem, SessionOpenWithMenuItem, SessionOpenWithPinnedMenuItem };
