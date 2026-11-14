import { appLabel } from '../apps-catalog.js';
import { ICON_ROUTE } from '../constants.js';
import { sessionCwd } from '../host-api.js';
import { IconChevronRightOutlineRegular, IconTrashOutlineRegular, jsx } from '../platform.js';
import { localeOf } from '../runtime.js';
import { takenOver } from '../slot-ownership.js';
import { archivedSnapshot, subscribeArchived } from '../store/archived.js';
import { ensureApps, appsSnapshot, openApplication } from '../store/apps.js';
import { childOn, childrenSnapshot, subscribeChildren } from '../store/children.js';
import { requestDelete } from '../store/delete-request.js';
import { itemsSnapshot, subscribeItems } from '../store/items.js';
import { effectivePinned, pinnedSnapshot, subscribePinned } from '../store/pinned.js';
import { placementOn, placementsSnapshot, subscribePlacements } from '../store/placements.js';
import { toast } from '../toast.js';
import { h } from '../ui/jsx.js';
import { currentMenuGesture } from '../ui/right-click-mark.js';
import { appsSource, contextMenusOf } from './context-menu-shared.js';

/* ------------------- 会话行右键：宿主数据贡献（0.2.2-rc.2+） */

/**
 * 这四项原先通过 slot 注入宿主菜单组件。0.2.2-rc.2 起会话行右键由宿主的
 * 数据贡献渲染器接管，slot 条目会和原生项一起出现在同一个面板里；改成
 * 贡献后位置、图标、子菜单都由宿主统一画，插件不再自绘箭头。
 */

const itemsSource = { getSnapshot: itemsSnapshot, subscribe: subscribeItems };
const childrenSource = { getSnapshot: childrenSnapshot, subscribe: subscribeChildren };
const pinnedSource = { getSnapshot: pinnedSnapshot, subscribe: subscribePinned };
const placementsSource = { getSnapshot: placementsSnapshot, subscribe: subscribePlacements };
const archivedSource = { getSnapshot: archivedSnapshot, subscribe: subscribeArchived };

/** 当前手势下这条贡献是否该出现（右键 / 行尾「…」由设置页分别控制）。 */
function placementVisible(key) {
  return placementOn(key, currentMenuGesture());
}

function placeholder(t, key) {
  return { id: 'placeholder', label: t(key), disabled: true };
}

function openApp(ctx, appId, sessionId, t) {
  const cwd = sessionCwd(ctx, sessionId);
  if (cwd === '') {
    toast(t('noPath'));
    return;
  }
  openApplication(appId, cwd).then((ok) => {
    if (!ok) toast(t('openFailed'));
  });
}

/** 「打开方式」子菜单：应用列表未就绪时放一条禁用的占位项，宿主才有子菜单可展开。 */
function openWithAction(ctx, target, t) {
  if (itemsSnapshot().openWith === false || takenOver('openWith')) return [];
  const sessionId = target?.sessionId ?? '';
  const apps = appsSnapshot();
  ensureApps();
  const pinned = effectivePinned(apps.ids).filter((id) => childOn(id));
  const pinnedSet = new Set(pinned);
  const enabled = apps.ids.filter((id) => childOn(id));
  const submenu = enabled.filter((id) => !pinnedSet.has(id));
  // 所有可用应用都置顶后，二级菜单没有内容，直接收起来（与旧组件一致）。
  if (apps.status !== 'loading' && enabled.length > 0 && submenu.length === 0) return [];
  let children;
  if (apps.status === 'error') {
    children = [placeholder(t, 'settings.appsError')];
  } else if (apps.ids.length === 0) {
    children = [placeholder(t, apps.status === 'loading' ? 'settings.appsLoading' : 'settings.appsUnavailable')];
  } else if (submenu.length === 0) {
    children = [placeholder(t, 'settings.appsAllOff')];
  } else {
    children = submenu.map((id) => ({
      id: `app-${id}`,
      label: appLabel(id, t),
      icon: { key: 'sidebar-row-menu.app', src: ICON_ROUTE + encodeURIComponent(id) },
      run: () => openApp(ctx, id, sessionId, t),
    }));
  }
  return [{
    id: 'sidebar-row-menu.session.open-with',
    // 宿主 0.2.2-rc.2 起自己画箭头；更早的宿主走 slot 注入，不会用到这段。
    // 保留插件箭头兜底，styles.js 检测到宿主箭头时隐藏它，避免叠成两个。
    label: h('span', { className: 'dsrm-host-label dsrm-native-dedupe' },
      h('span', { className: 'dsrm-host-label-text' }, t('openWith')),
      jsx(IconChevronRightOutlineRegular, { size: 12, className: 'dsrm-submenu-chevron' }),
    ),
    icon: { key: 'sidebar-row-menu.open-with' },
    separatorBefore: apps.status === 'ready' && pinned.length === 0,
    children,
  }];
}

/** 置顶应用的一级入口：与旧组件同一份选择，默认自动置顶第一个编辑器。 */
function pinnedActions(ctx, target, t) {
  if (itemsSnapshot().openWith === false || takenOver('openWith')) return [];
  ensureApps();
  const sessionId = target?.sessionId ?? '';
  const apps = appsSnapshot();
  const picked = effectivePinned(apps.ids).filter((id) => childOn(id));
  return picked.map((id, index) => ({
    id: `pinned-${id}`,
    separatorBefore: index === 0,
    label: t('openWithApp', { name: appLabel(id, t) }),
    icon: { key: 'sidebar-row-menu.app', src: ICON_ROUTE + encodeURIComponent(id) },
    run: () => openApp(ctx, id, sessionId, t),
  }));
}

/** 永久删除会话：已归档会话默认可见，未归档会话要先在设置里打开开关。 */
function deleteAction(ctx, target, t) {
  const items = itemsSnapshot();
  if (items.deleteSession === false || takenOver('deleteSession')) return [];
  const sessionId = target?.sessionId ?? '';
  const displayTitle = target?.displayTitle ?? '';
  if (!archivedSnapshot().has(sessionId) && items.deleteUnarchived !== true) return [];
  return [{
    id: 'sidebar-row-menu.session.delete',
    danger: true,
    separatorBefore: true,
    label: t('deleteSession'),
    icon: { key: 'sidebar-row-menu.delete' },
    run: () => requestDelete({ mode: 'one', sessionId, displayTitle }),
  }];
}

/** 删除所有已归档会话：只在已归档会话自己的菜单里出现。 */
function deleteArchivedAction(ctx, target, t) {
  const items = itemsSnapshot();
  if (items.deleteArchived === false || takenOver('deleteArchived')) return [];
  const archived = archivedSnapshot();
  if (!archived.has(target?.sessionId ?? '')) return [];
  const displayTitle = target?.displayTitle ?? '';
  return [{
    id: 'sidebar-row-menu.session.delete-archived',
    danger: true,
    separatorBefore: items.deleteSession === false || takenOver('deleteSession'),
    label: t('deleteArchived'),
    icon: { key: 'sidebar-row-menu.delete' },
    run: () => {
      const ids = [...archived];
      if (ids.length === 0) return;
      requestDelete({ mode: 'archived', sessionIds: ids, displayTitle });
    },
  }];
}

const SESSION_GROUPS = [
  { key: 'pinned', order: 495, placement: 'sessionOpenWith', observe: () => [appsSource, pinnedSource, childrenSource, itemsSource, placementsSource], build: pinnedActions },
  { key: 'open-with', order: 500, placement: 'sessionOpenWith', observe: () => [appsSource, pinnedSource, childrenSource, itemsSource, placementsSource], build: openWithAction },
  { key: 'delete', order: 510, placement: 'sessionDelete', observe: () => [archivedSource, itemsSource, placementsSource], build: deleteAction },
  { key: 'delete-archived', order: 520, placement: 'sessionDeleteArchived', observe: () => [archivedSource, itemsSource, placementsSource], build: deleteArchivedAction },
];

/** 注册会话行的四项原生贡献；返回撤销函数。 */
function registerNativeSessionMenu(ctx) {
  const menus = contextMenusOf(ctx);
  if (menus === null) return null;
  const disposers = [];
  for (const group of SESSION_GROUPS) {
    try {
      disposers.push(menus.register({
        id: `sidebar-row-menu.session.${group.key}`,
        target: 'session',
        order: group.order,
        observe: group.observe,
        resolve: (target) => {
          if (!placementVisible(group.placement)) return [];
          return group.build(ctx, target, localeOf(ctx));
        },
      }));
    } catch (error) {
      console.warn(`[dsh-sidebar-row-menu] session context registration failed (${group.key}):`, error);
    }
  }
  return () => {
    for (const dispose of disposers) {
      try {
        dispose?.();
      } catch {
        /* 注册已随插件生命周期撤销 */
      }
    }
  };
}

export { registerNativeSessionMenu };
