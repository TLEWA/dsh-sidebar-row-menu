import { appIcon, appLabel } from '../apps-catalog.js';
import { ICON_ROUTE, MENU_ATTR, NS } from '../constants.js';
import { ContextMenuPermissionIcon, openAppAt, permissionCheck } from './app-actions.js';
import { archivedCountOfWorkspace, archivedRowsVisibleIn, toggleWorkspaceArchived, workspaceSessionIds } from './archived.js';
import { OpenWithSubmenu } from './open-with.js';
import { ContextMenuAppIcon, appsSource, contextMenusOf } from './session-menu.js';
import { copyText, workspaceCwd } from '../host-api.js';
import { IconArchiveOffOutlineRegular, IconArchiveOutlineRegular, IconChevronRightOutlineRegular, IconCopyOutlineRegular, IconEditOutlineRegular, IconNewChatOutlineRegular, IconProjectAddOutlineRegular, IconRightUpOutlineRegular, IconTrashOutlineRegular, MenuItemButton, MenuSurface, createRoot, jsx, useEffect, useRef } from '../platform.js';
import { beginMenu, closeMenu, rootCtx, serviceOf } from '../runtime.js';
import { appsSnapshot, ensureApps, openApplication, useApps } from '../store/apps.js';
import { childOn, useChildren } from '../store/children.js';
import { requestDelete } from '../store/delete-request.js';
import { itemOn, itemsSnapshot, useItems } from '../store/items.js';
import { effectivePreset, ensurePermissionData, permissionSource, presetLabel, presetOptions, setWorkspacePreset, workspacePreset } from '../store/permission.js';
import { effectivePinned, usePinned } from '../store/pinned.js';
import { placementOn, usePlacements } from '../store/placements.js';
import { toast } from '../toast.js';
import { h } from '../ui/jsx.js';
import { useDismissOnOutside } from '../ui/dismiss.js';
import { useMenuPos } from '../ui/position.js';
import { rightClickMark } from '../ui/right-click-mark.js';

function WorkspaceRowMenu({ x, y, props, onClose, mode = 'context' }) {
  const t = localeOf(rootCtx);
  const items = useItems();
  usePlacements();
  const apps = useApps();
  usePinned();
  useChildren();
  const hostRef = useRef(null);
  const pos = useMenuPos(hostRef, x, y, [apps.status]);

  const ellipsisMode = mode === 'ellipsis';
  /** 右键菜单永远显示；「…」菜单按设置页里选定的位置显示（内置项除外）。 */
  const show = (key) => placementOn(key, ellipsisMode ? 'ellipsis' : 'context');
  const openWithOn = items.openWith !== false && show('openWith');

  useEffect(() => {
    if (openWithOn) ensureApps();
  }, [openWithOn]);

  useDismissOnOutside(hostRef, onClose);

  // 置顶应用是异步取到的，行数会变；尺寸变化由 useMenuPos 里的 ResizeObserver 兜住。

  const group = props.group ?? {};
  const workspaceId = typeof group.workspaceId === 'string' ? group.workspaceId : '';
  const cwd = workspaceCwd(rootCtx, group);
  const tabs = serviceOf(rootCtx, 'projectTabs') ?? globalThis.__DSH_PROJECT_TABS__ ?? null;
  const canOpenInTab = tabs !== null && typeof tabs.openWorkspaceInTab === 'function' && workspaceId !== '';

  const openApp = (appId) => {
    if (cwd === '') {
      toast(t('noPath'));
      return;
    }
    openApplication(appId, cwd).then((ok) => {
      if (!ok) toast(t('openFailed'));
    });
  };

  const requestWorkspaceDelete = () => {
    if (workspaceId === '') {
      toast(t('actionFailed'));
      return;
    }
    const snapshot = serviceOf(rootCtx, 'workspaces')?.list?.getSnapshot?.();
    const entry = Array.isArray(snapshot?.items)
      ? snapshot.items.find((candidate) => candidate?.workspaceId === workspaceId)
      : undefined;
    const sessionIds = Array.isArray(entry?.sessionIds)
      ? entry.sessionIds.filter((id) => typeof id === 'string' && id !== '')
      : [];
    const title = typeof group.label === 'string' && group.label !== ''
      ? group.label
      : typeof group.title === 'string' && group.title !== ''
        ? group.title
        : cwd;
    requestDelete({ mode: 'workspace', workspaceId, sessionIds, displayTitle: title });
  };

  const run = (id) => {
    if (id === 'new-session') {
      try {
        props.onCreate?.();
      } catch (error) {
        console.warn('[dsh-sidebar-row-menu] new session failed:', error);
      }
      return;
    }
    if (id === 'rename') {
      try {
        props.actions?.rename?.();
      } catch (error) {
        console.warn('[dsh-sidebar-row-menu] workspace rename failed:', error);
      }
      return;
    }
    if (id === 'delete') {
      try {
        props.actions?.delete?.();
      } catch (error) {
        console.warn('[dsh-sidebar-row-menu] workspace delete failed:', error);
      }
      return;
    }
    if (id === 'delete-sessions') {
      requestWorkspaceDelete();
      return;
    }
    if (id === 'tab') {
      Promise.resolve().then(() => tabs.openWorkspaceInTab(workspaceId)).catch((reason) => {
        console.warn('[dsh-sidebar-row-menu] open in tab failed:', reason);
        toast(t('actionFailed'));
      });
      return;
    }
    if (id === 'copy-path') {
      if (cwd === '') {
        toast(t('noPath'));
        return;
      }
      copyText(cwd, t);
      return;
    }
    if (id === 'archived') toggleWorkspaceArchived(workspaceId);
  };

  const rows = [];
  if (typeof props.onCreate === 'function' && show('newSession')) {
    rows.push(jsx(MenuItemButton, {
      key: 'new-session',
      onSelect: () => {
        onClose();
        run('new-session');
      },
      icon: jsx(IconNewChatOutlineRegular, {}),
      children: t('newSession'),
    }));
  }
  if (typeof props.actions?.rename === 'function') {
    rows.push(jsx(MenuItemButton, {
      key: 'rename',
      onSelect: () => {
        onClose();
        run('rename');
      },
      icon: jsx(IconEditOutlineRegular, {}),
      children: t('rename'),
    }));
  }

  if (openWithOn) {
    const pinned = effectivePinned(apps.ids).filter((id) => childOn(id));
    pinned.forEach((id, index) => rows.push(jsx(MenuItemButton, {
      key: `pinned-${id}`,
      separatorBefore: index === 0,
      onSelect: () => {
        onClose();
        openApp(id);
      },
      icon: appIcon(id),
      children: t('openWithApp', { name: appLabel(id, t) }),
    })));
    rows.push(jsx(OpenWithSubmenu, {
      key: 'open-with',
      t,
      getCwd: () => cwd,
      closeParent: onClose,
      separatorBefore: pinned.length === 0,
    }));
  }

  if (show('copyPath')) {
    rows.push(jsx(MenuItemButton, {
      key: 'copy-path',
      separatorBefore: !openWithOn,
      onSelect: () => {
        onClose();
        run('copy-path');
      },
      icon: jsx(IconCopyOutlineRegular, { size: 14 }),
      children: t('copyPath'),
    }));
  }
  if (canOpenInTab && show('openInTab')) {
    rows.push(jsx(MenuItemButton, {
      key: 'tab',
      onSelect: () => {
        onClose();
        run('tab');
      },
      icon: jsx(IconProjectAddOutlineRegular, { size: 14 }),
      children: t('openInTab'),
    }));
  }
  const archivedCount = items.archivedSessions === false ? 0 : archivedCountOfWorkspace(workspaceId);
  if (archivedCount > 0 && show('showArchived')) {
    const archivedVisible = archivedRowsVisibleIn(workspaceId);
    rows.push(jsx(MenuItemButton, {
      key: 'archived',
      onSelect: () => {
        onClose();
        run('archived');
      },
      icon: jsx(archivedVisible ? IconArchiveOffOutlineRegular : IconArchiveOutlineRegular, { size: 14 }),
      children: t(archivedVisible ? 'hideArchivedSessions' : 'showArchivedSessions'),
    }));
  }
  if (typeof props.actions?.delete === 'function') {
    rows.push(jsx(MenuItemButton, {
      key: 'delete',
      danger: true,
      separatorBefore: true,
      onSelect: () => {
        onClose();
        run('delete');
      },
      icon: jsx(IconTrashOutlineRegular, {}),
      children: t('deleteWorkspace'),
    }));
  }
  if (show('deleteSessions')) {
    rows.push(jsx(MenuItemButton, {
      key: 'delete-sessions',
      danger: true,
      onSelect: () => {
        onClose();
        run('delete-sessions');
      },
      icon: jsx(IconTrashOutlineRegular, {}),
      children: t('deleteWorkspaceSessions'),
    }));
  }

  return h('div', {
    className: 'dsrm-menu',
    ref: hostRef,
    style: {
      left: pos?.left ?? x,
      top: pos?.top ?? y,
      visibility: pos === null ? 'hidden' : 'visible',
    },
  }, h(MenuSurface, { role: 'group', className: 'dsrm-menu-surface' }, rows));
}

/** 在 (x, y) 处挂出工作区菜单。mode='ellipsis' 表示从行尾「…」按钮打开。 */
function showWorkspaceMenu(props, x, y, mode = 'context') {
  beginMenu('1').render(jsx(WorkspaceRowMenu, {
    x,
    y,
    props,
    mode,
    onClose: () => closeMenu(),
  }));
}

function localeOf(ctx) {
  try {
    if (typeof ctx?.locale?.bind === 'function') return ctx.locale.bind(NS);
  } catch (error) {
    console.warn('[dsh-sidebar-row-menu] locale bind failed:', error);
  }
  return (key) => key;
}

/** 工作区行右键菜单（没有 slot 可复用，只能自己组）。 */
function openWorkspaceMenu(props, x, y, mode = 'context') {
  if (rootCtx === null) return;
  showWorkspaceMenu(props, x, y, mode);
}
function workspaceMenuActions(ctx, value, t) {
  const workspaceId = typeof value?.workspaceId === 'string' ? value.workspaceId : '';
  if (workspaceId === '') return [];
  const cwd = typeof value?.path === 'string' ? value.path : '';
  const items = [];

  items.push({
    id: 'new-session',
    group: 'new',
    label: t('newSession'),
    icon: { key: 'sidebar-row-menu.new' },
    run: () => {
      const ui = serviceOf(rootCtx, 'uiWorkspace');
      if (typeof ui?.startSession === 'function') {
        try {
          ui.startSession(workspaceId, {});
        } catch (error) {
          console.warn('[dsh-sidebar-row-menu] new session failed:', error);
        }
      }
    },
  });

  const apps = appsSnapshot();
  const withApps = itemsSnapshot().openWith !== false;
  const pinned = withApps ? effectivePinned(apps.ids).filter((id) => childOn(id)) : [];
  const enabledApps = withApps ? apps.ids.filter((id) => childOn(id)) : [];
  const pinnedSet = new Set(pinned);
  const submenuApps = enabledApps.filter((id) => !pinnedSet.has(id));
  if (withApps) ensureApps();

  // 与会话菜单同一套分组：行内动作 → 复制/在文件夹显示 → 打开方式 → 删除。
  const tabs = serviceOf(rootCtx, 'projectTabs') ?? globalThis.__DSH_PROJECT_TABS__ ?? null;
  if (tabs !== null && typeof tabs?.openWorkspaceInTab === 'function') {
    items.push({
      id: 'tab',
      group: 'tab',
      label: t('openInTab'),
      icon: { key: 'sidebar-row-menu.tab' },
      run: () => {
        Promise.resolve().then(() => tabs.openWorkspaceInTab(workspaceId)).catch((reason) => {
          console.warn('[dsh-sidebar-row-menu] open in tab failed:', reason);
          toast(t('actionFailed'));
        });
      },
    });
  }

  // 归档会话的显示开关：只有该工作区确实存在归档会话时才出现，状态用图标
  // 与文案区分（宿主菜单项没有 checked 字段）。
  const archivedCount = itemOn('archivedSessions') ? archivedCountOfWorkspace(workspaceId) : 0;
  if (archivedCount > 0) {
    const archivedVisible = archivedRowsVisibleIn(workspaceId);
    items.push({
      id: 'archived',
      group: 'archived',
      label: t(archivedVisible ? 'hideArchivedSessions' : 'showArchivedSessions'),
      icon: { key: archivedVisible ? 'sidebar-row-menu.archive-off' : 'sidebar-row-menu.archive' },
      run: () => toggleWorkspaceArchived(workspaceId),
    });
  }

  items.push({
    id: 'copy-path',
    group: 'copy',
    separatorBefore: true,
    label: t('copyPath'),
    icon: { key: 'sidebar-row-menu.copy' },
    run: () => {
      if (cwd === '') {
        toast(t('noPath'));
        return;
      }
      copyText(cwd, t);
    },
  });

  pinned.forEach((id, index) => {
    items.push({
      id: `pinned-${id}`,
      group: 'pinned',
      separatorBefore: index === 0,
      label: t('openWithApp', { name: appLabel(id, t) }),
      icon: { key: 'sidebar-row-menu.app', src: ICON_ROUTE + encodeURIComponent(id) },
      run: () => openAppAt(id, cwd, t),
    });
  });

  if (withApps && submenuApps.length > 0) {
    items.push({
      id: 'open-with',
      group: 'open-with',
      separatorBefore: pinned.length === 0,
      // 宿主的菜单项对子菜单只设 aria-haspopup，不画右侧箭头。label 在宿主里
      // 是直接当 children 渲染的，所以这里塞一个右对齐的箭头元素，与会话菜单
      // 里的「打开方式」保持同一套外观（0.2.1 自绘菜单本来就是自己画的）。
      label: h('span', { className: 'dsrm-host-label' },
        h('span', { className: 'dsrm-host-label-text' }, t('openWith')),
        jsx(IconChevronRightOutlineRegular, { size: 12, className: 'dsrm-submenu-chevron' }),
      ),
      icon: { key: 'sidebar-row-menu.open-with' },
      children: submenuApps.map((id) => ({
        id: `app-${id}`,
        label: appLabel(id, t),
        icon: { key: 'sidebar-row-menu.app', src: ICON_ROUTE + encodeURIComponent(id) },
        run: () => openAppAt(id, cwd, t),
      })),
    });
  }

  // 该工作区新建会话的默认权限：走宿主 permissionPresets，插件只记住
  // 「工作区 → preset」并在 agent/created 时用原生 set() 落盘。
  ensurePermissionData(ctx);
  const permissionOptions = presetOptions();
  if (permissionOptions.length > 0) {
    const override = workspacePreset(workspaceId);
    const effective = effectivePreset(workspaceId);
    const children = permissionOptions.map((option) => ({
      id: `preset-${option.value}`,
      label: h('span', { className: 'dsrm-host-label' },
        h('span', { className: 'dsrm-host-label-text' }, presetLabel(option.value, t)),
        option.value === effective ? permissionCheck() : null,
      ),
      icon: { key: 'sidebar-row-menu.permission' },
      run: () => { setWorkspacePreset(rootCtx, workspaceId, option.value, t); },
    }));
    if (override !== '') {
      children.push({
        id: 'permission-follow-global',
        separatorBefore: true,
        label: t('permissionFollowGlobal'),
        icon: { key: 'sidebar-row-menu.permission' },
        run: () => { setWorkspacePreset(rootCtx, workspaceId, null, t); },
      });
    }
    items.push({
      id: 'new-session-permission',
      group: 'permission',
      separatorBefore: true,
      label: h('span', { className: 'dsrm-host-label' },
        h('span', { className: 'dsrm-host-label-text' }, t('newSessionPermission')),
        jsx(IconChevronRightOutlineRegular, { size: 12, className: 'dsrm-submenu-chevron' }),
      ),
      icon: { key: 'sidebar-row-menu.permission' },
      children,
    });
  }

  items.push({
    id: 'delete-sessions',
    group: 'delete',
    danger: true,
    separatorBefore: false,
    label: t('deleteWorkspaceSessions'),
    icon: { key: 'sidebar-row-menu.delete' },
    run: () => {
      const title = typeof value?.displayTitle === 'string' && value.displayTitle !== '' ? value.displayTitle : cwd;
      requestDelete({
        mode: 'workspace',
        workspaceId,
        sessionIds: workspaceSessionIds(workspaceId),
        displayTitle: title,
      });
    },
  });

  return items;
}

/** 宿主只按 provider.order 排序，同组顺序即数组顺序；故每组单独注册。 */
const WORKSPACE_MENU_GROUPS = [
  { key: 'new', order: 90 },
  { key: 'tab', order: 110 },
  { key: 'archived', order: 130 },
  { key: 'copy', order: 150 },
  { key: 'pinned', order: 210 },
  { key: 'open-with', order: 220 },
  { key: 'permission', order: 225 },
  { key: 'delete', order: 310 },
];

/**
 * 0.2.2 的「…」按钮与右键共用同一份宿主菜单，条目本身无法感知手势，
 * 所以按右键标记决定是否进入这份菜单；设置页可按条目选择只出现在一边。
 */
const WORKSPACE_GROUP_ELLIPSIS = {
  new: 'newSession',
  pinned: 'openWith',
  'open-with': 'openWith',
  copy: 'copyPath',
  tab: 'openInTab',
  archived: 'showArchived',
  permission: 'permissionDefault',
  delete: 'deleteSessions',
};

function workspaceGroupVisible(groupKey) {
  const key = WORKSPACE_GROUP_ELLIPSIS[groupKey];
  if (key === undefined) return rightClickMark;
  return placementOn(key, rightClickMark ? 'context' : 'ellipsis');
}

/**
 * 同一份菜单的所有分组共用一次 workspaceMenuActions 计算。
 * 宿主按分组分别调 resolve，8 个分组各算一遍会把整份菜单（含归档计数、
 * 权限预设、应用列表）重建 8 次；这里只在同一轮同步 resolve 内复用结果，
 * 交回事件循环后立即作废，避免读到过期状态。
 */
const actionsCache = new WeakMap();

function cachedWorkspaceMenuActions(ctx, target, t) {
  if (target === null || typeof target !== 'object') return workspaceMenuActions(ctx, target, t);
  const cached = actionsCache.get(target);
  if (cached !== undefined && cached.ctx === ctx && cached.t === t) return cached.actions;
  const actions = workspaceMenuActions(ctx, target, t);
  actionsCache.set(target, { actions, ctx, t });
  Promise.resolve().then(() => {
    const current = actionsCache.get(target);
    if (current !== undefined && current.actions === actions) actionsCache.delete(target);
  });
  return actions;
}

/** 注册工作区动作；服务可能晚于插件 apply 出现，带有限重试。 */
function registerWorkspaceContextMenu(ctx) {
  let disposers = null;
  let icons = null;
  let timer = 0;
  let attempts = 0;

  const registerIcons = () => {
    if (ctx.slots === null || ctx.slots === undefined) return;
    icons = ctx.slots.inject('contextMenu.icon', function* () {
      yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.new' }, IconNewChatOutlineRegular);
      yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.copy' }, IconCopyOutlineRegular);
      yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.tab' }, IconProjectAddOutlineRegular);
      yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.archive' }, IconArchiveOutlineRegular);
      yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.archive-off' }, IconArchiveOffOutlineRegular);
      yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.open-with' }, IconRightUpOutlineRegular);
      yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.permission' }, ContextMenuPermissionIcon);
      yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.delete' }, IconTrashOutlineRegular);
      yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.app' }, ContextMenuAppIcon);
    });
  };

  const register = () => {
    timer = 0;
    if (disposers !== null) return;
    const menus = contextMenusOf(ctx);
    if (menus === null) {
      if (attempts >= 40 || typeof setTimeout !== 'function') return;
      attempts += 1;
      timer = setTimeout(register, 250);
      return;
    }
    registerIcons();
    ensurePermissionData(ctx);
    const registered = [];
    for (const group of WORKSPACE_MENU_GROUPS) {
      try {
        registered.push(menus.register({
          id: `sidebar-row-menu.workspace.${group.key}`,
          target: 'workspace',
          order: group.order,
          observe: () => [appsSource, permissionSource],
          resolve: (target) => {
            if (!workspaceGroupVisible(group.key)) return [];
            return cachedWorkspaceMenuActions(ctx, target, localeOf(ctx))
              .filter((action) => action.group === group.key)
              .map(({ group: _group, ...action }) => action);
          },
        }));
      } catch (error) {
        console.warn(`[dsh-sidebar-row-menu] workspace context registration failed (${group.key}):`, error);
      }
    }
    if (registered.length > 0) disposers = registered;
  };

  register();
  return () => {
    if (timer !== 0) clearTimeout(timer);
    for (const dispose of disposers ?? []) {
      try {
        dispose?.();
      } catch {
        /* 注册已随插件生命周期撤销 */
      }
    }
    try {
      icons?.();
    } catch {
      /* icon 条目可能未注册成功 */
    }
  };
}


export { WORKSPACE_GROUP_ELLIPSIS, WORKSPACE_MENU_GROUPS, WorkspaceRowMenu, localeOf, openWorkspaceMenu, registerWorkspaceContextMenu, showWorkspaceMenu, workspaceGroupVisible, workspaceMenuActions };
