/**
 * 会话正文右键：宿主原生菜单（0.2.2-rc.2+）。
 *
 * 0.2.1 及更早没有可扩展的右键菜单，正文空白处由 HeaderToolbarMenu 自绘；
 * 0.2.2 起宿主把右键菜单改成 ctx.contextMenus 数据贡献，target 家族本身
 * 可扩展（types.ts 里明确写着外部插件可以加自己的 target）。这里注册
 * target:'conversation'，把工具条按钮、打开方式、更多操作交给宿主渲染，
 * 位置、关闭、键盘、子菜单、分隔线和危险色都不再由插件负责。
 *
 * 只有第一次真正右键时才注册：测试和不用正文菜单的宿主不会多出一条
 * provider，旧宿主没有 contextMenus 时直接返回 false，调用方回退自绘。
 */
import { appLabel } from '../apps-catalog.js';
import { ICON_ROUTE } from '../constants.js';
import { hasNativeSessionMenu } from '../host-version.js';
import { jsx } from '../platform.js';
import { sessionCwd } from '../host-api.js';
import { localeOf } from '../runtime.js';
import { blankMenuSnapshot, blankOption, subscribeBlankMenu } from '../store/blank-menu.js';
import { childOn, childrenSnapshot, subscribeChildren } from '../store/children.js';
import { itemsSnapshot, subscribeItems } from '../store/items.js';
import { effectivePinned, pinnedSnapshot, subscribePinned } from '../store/pinned.js';
import { appsSnapshot, ensureApps, openApplication } from '../store/apps.js';
import { appsSource, contextMenusOf } from './context-menu-shared.js';
import {
  activeSessionHeader,
  collectHeaderToolbarItems,
  moreSelectHandler,
  moreSubmenuItems,
} from './header-toolbar.js';
import { desktopReady, fileApplications, openFilesDefault, openFilesWith, revealFiles } from './file-open.js';

const TARGET_KIND = 'conversation';
/** 工具条图标不是应用图片：把按钮里的原生 SVG 原样搬进宿主菜单。 */
const TOOLBAR_ICON_KEY = 'sidebar-row-menu.toolbar';
/** 文件关联查询最多等这么久；宿主的单条贡献解析预算是 1000ms。 */
const FILE_APPS_TIMEOUT = 700;
/** 桌面能力探测已经做过一次时通常立即返回，给旧部署留一点请求时间。 */
const DESKTOP_TIMEOUT = 250;

/** 当前宿主菜单服务；null = 还没注册或此宿主没有该能力。 */
let menus = null;
/** 注册返回的撤销函数。 */
let unregister = null;
/** contextMenu.icon 槽的注册撤销函数。 */
let iconRegistration = null;

// 菜单打开后应用列表 / 置顶 / 工具条设置仍可能变化；交给宿主订阅，
// 数据到达时宿主会重解析整份贡献，占位行就能换成真实应用。
const itemsSource = { getSnapshot: itemsSnapshot, subscribe: subscribeItems };
const childrenSource = { getSnapshot: childrenSnapshot, subscribe: subscribeChildren };
const pinnedSource = { getSnapshot: pinnedSnapshot, subscribe: subscribePinned };
const blankMenuSource = { getSnapshot: blankMenuSnapshot, subscribe: subscribeBlankMenu };

function placeholder(t, key) {
  return { id: 'placeholder', label: t(key), disabled: true };
}

function toolbarIcon(icon) {
  if (icon === null || icon === undefined) return undefined;
  if (typeof icon.html === 'string' && icon.html.trim().startsWith('<svg')) {
    return { key: TOOLBAR_ICON_KEY, html: icon.html };
  }
  if (typeof icon.src === 'string' && icon.src !== '') {
    return { key: TOOLBAR_ICON_KEY, src: icon.src };
  }
  return undefined;
}

/**
 * 宿主 contextMenu.icon 槽的渲染器。
 *
 * 工具条按钮的图标来自宿主自己的 DOM（headerButtonIcon 抄成 outerHTML），
 * 宿主菜单只接受 {key,src} 这种可序列化的描述，所以这里用插件注册的 key
 * 把同一段 SVG 放回去；图片按钮继续走 src。
 */
function ContextMenuToolbarIcon({ icon }) {
  const html = typeof icon?.html === 'string' ? icon.html.trim() : '';
  if (html.startsWith('<svg')) {
    return jsx('span', {
      className: 'dsrm-header-icon',
      'aria-hidden': 'true',
      dangerouslySetInnerHTML: { __html: html },
    });
  }
  const src = typeof icon?.src === 'string' ? icon.src : '';
  if (src !== '') return jsx('img', { className: 'dsrm-header-icon-img', src, alt: '' });
  return null;
}

function appIcon(appId) {
  return { key: 'sidebar-row-menu.app', src: ICON_ROUTE + encodeURIComponent(appId) };
}

function fileAppIcon(app) {
  if (typeof app?.icon === 'string' && app.icon !== '') return { key: 'sidebar-row-menu.app', src: app.icon };
  return appIcon(typeof app?.id === 'string' ? app.id : '');
}

function fileAppLabel(app, t) {
  return typeof app?.name === 'string' && app.name !== '' ? app.name : appLabel(typeof app?.id === 'string' ? app.id : '', t);
}

/** 异步结果限时；超时先让菜单出来，不把整条贡献拖没。 */
function within(promise, timeout, fallback) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback);
    }, timeout);
    Promise.resolve(promise).then((value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    }).catch(() => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(fallback);
    });
  });
}

function clickAction(item) {
  return () => {
    window.setTimeout(() => {
      try {
        item.button.click();
      } catch (error) {
        console.warn('[dsh-sidebar-row-menu] toolbar action click failed:', error);
      }
    }, 0);
  };
}

/**
 * 「打开方式」的文件模式：列出系统为这些文件登记的程序。
 * 宿主解析贡献最多等 1000ms，所以这里只等 700ms；超时先显示加载占位，
 * 请求本身继续跑，下一次右键通常已经命中 file-open 的 30 秒缓存。
 */
async function fileOpenWithActions(paths, t, signal) {
  const apps = appsSnapshot();
  const pinnedIds = new Set(effectivePinned(apps.ids).filter((id) => childOn(id)));
  const fileApps = await within(fileApplications(paths, signal), FILE_APPS_TIMEOUT, undefined);

  if (fileApps === undefined) {
    return {
      pinned: [],
      openWith: {
        id: 'open-with',
        label: t('openWith'),
        icon: { key: 'sidebar-row-menu.open-with' },
        children: [placeholder(t, 'settings.appsLoading')],
      },
    };
  }

  if (fileApps === null) {
    const desktop = await within(desktopReady(), DESKTOP_TIMEOUT, null);
    if (desktop === true) {
      return {
        pinned: [],
        openWith: {
          id: 'open-with',
          label: t('openWith'),
          icon: { key: 'sidebar-row-menu.open-with' },
          children: [
            {
              id: 'default-app',
              label: t('openDefaultApp'),
              icon: appIcon('filemanager'),
              run: async () => {
                const ok = await openFilesDefault(paths);
                if (!ok) throw new Error('open failed');
              },
              failureLabel: t('openFailed'),
            },
            {
              id: 'reveal-files',
              label: t('openWithReveal'),
              icon: appIcon('explorer'),
              run: async () => {
                const ok = await revealFiles(paths);
                if (!ok) throw new Error('reveal failed');
              },
              failureLabel: t('openFailed'),
            },
            placeholder(t, 'openWithListFailed'),
          ],
        },
      };
    }
    return {
      pinned: [],
      openWith: {
        id: 'open-with',
        label: t('openWith'),
        icon: { key: 'sidebar-row-menu.open-with' },
        children: [placeholder(t, desktop === false ? 'openWithUnavailable' : 'settings.appsLoading')],
      },
    };
  }

  const enabled = fileApps.filter((app) => childOn(app.id));
  const pinnedApps = enabled.filter((app) => pinnedIds.has(app.id));
  const submenuApps = enabled.filter((app) => !pinnedIds.has(app.id));
  let children;
  if (fileApps.length === 0) children = [placeholder(t, 'openWithNoHandlers')];
  else if (submenuApps.length === 0) {
    // 文件模式没有单独的「全部关掉」文案；全部置顶时子菜单确实为空。
    children = [placeholder(t, enabled.length === 0 ? 'settings.appsAllOff' : 'openWithNoHandlers')];
  } else {
    children = submenuApps.map((app) => ({
      id: `app-${app.id}`,
      label: fileAppLabel(app, t),
      icon: fileAppIcon(app),
      run: async () => {
        const ok = await openFilesWith(paths, app.id);
        if (!ok) throw new Error('open failed');
      },
      failureLabel: t('openFailed'),
    }));
  }
  return {
    pinned: pinnedApps.map((app) => ({
      id: `pinned-${app.id}`,
      label: t('openWithApp', { name: fileAppLabel(app, t) }),
      icon: fileAppIcon(app),
      run: async () => {
        const ok = await openFilesWith(paths, app.id);
        if (!ok) throw new Error('open failed');
      },
      failureLabel: t('openFailed'),
    })),
    openWith: {
      id: 'open-with',
      label: t('openWith'),
      icon: { key: 'sidebar-row-menu.open-with' },
      children,
    },
  };
}

/** 「打开方式」的目录模式：宿主目录应用 + 置顶应用。 */
function directoryOpenWithActions(cwd, t) {
  const apps = appsSnapshot();
  ensureApps();
  const pinned = effectivePinned(apps.ids).filter((id) => childOn(id));
  const pinnedSet = new Set(pinned);
  const enabled = apps.ids.filter((id) => childOn(id));
  const submenu = enabled.filter((id) => !pinnedSet.has(id));

  let children;
  if (apps.status === 'error') children = [placeholder(t, 'settings.appsError')];
  else if (apps.ids.length === 0) {
    children = [placeholder(t, apps.status === 'loading' ? 'settings.appsLoading' : 'settings.appsUnavailable')];
  } else if (submenu.length === 0) children = [placeholder(t, 'settings.appsAllOff')];
  else {
    children = submenu.map((id) => ({
      id: `app-${id}`,
      label: appLabel(id, t),
      icon: appIcon(id),
      run: async () => {
        const ok = await openApplication(id, cwd);
        if (!ok) throw new Error('open failed');
      },
      failureLabel: t('openFailed'),
    }));
  }

  return {
    pinned: pinned.map((id) => ({
      id: `pinned-${id}`,
      label: t('openWithApp', { name: appLabel(id, t) }),
      icon: appIcon(id),
      run: async () => {
        const ok = await openApplication(id, cwd);
        if (!ok) throw new Error('open failed');
      },
      failureLabel: t('openFailed'),
    })),
    openWith: {
      id: 'open-with',
      label: t('openWith'),
      icon: { key: 'sidebar-row-menu.open-with' },
      children,
    },
  };
}

/** 生成「打开方式」组；文件模式按这些文件列程序，目录模式按会话目录列程序。 */
async function openWithGroup(filePaths, cwd, t, signal) {
  if (filePaths.length > 0) {
    const group = await fileOpenWithActions(filePaths, t, signal);
    // 自绘菜单把「N 个文件」提示放在打开方式面板顶部；原生菜单没有自由文本行，
    // 用一条禁用动作复刻，仍然放在子菜单第一行。
    if (group.openWith !== null && filePaths.length > 1 && Array.isArray(group.openWith.children)) {
      group.openWith.children.unshift({
        id: 'open-with-files-note',
        label: t('openWithFiles', { count: String(filePaths.length) }),
        disabled: true,
      });
    }
    return group;
  }
  return directoryOpenWithActions(cwd, t);
}

/**
 * 把工具条镜像成宿主菜单动作。
 * @param ctx - 客户端根上下文。
 * @param target - 打开时捕获的 {sessionId,cwd,paths}。
 * @param signal - 宿主在菜单关闭 / 重解析时取消。
 * @returns 宿主可直接渲染的动作数组。
 */
async function conversationActions(ctx, target, signal) {
  const t = localeOf(ctx);
  const sessionId = typeof target?.sessionId === 'string' ? target.sessionId : '';
  const cwd = typeof target?.cwd === 'string' ? target.cwd : '';
  const filePaths = Array.isArray(target?.paths)
    ? target.paths.filter((path) => typeof path === 'string' && path !== '')
    : [];
  const items = collectHeaderToolbarItems(activeSessionHeader(), blankOption('keepMoreLast'));
  if (items.length === 0) return [];

  const settings = itemsSnapshot();
  ensureApps();
  const targets = filePaths.length > 0 ? filePaths : (cwd !== '' ? [cwd] : []);
  // 0.2.2 的会话头未必有「打开方式」分体按钮；rc.2 之前这是插件自己加的。
  // 原生菜单接管正文右键后，不能因为按钮缺失就把这个能力一起丢掉：只要
  // 有文件或会话目录，就显式补一组打开方式（应用列表到达前先显示加载占位）。
  const hasOpenWithItem = items.some((item) => item.openWith);
  const canOpenWith = settings.openWith !== false && targets.length > 0;

  const actions = [];
  let section = '';
  const takeSeparator = (next) => {
    const separator = section !== '' && section !== next;
    section = next;
    return separator;
  };

  let openWithDone = false;
  const pushOpenWith = async () => {
    if (!canOpenWith || openWithDone) return;
    openWithDone = true;
    let group;
    try {
      group = await openWithGroup(filePaths, cwd, t, signal);
    } catch (error) {
      console.warn('[dsh-sidebar-row-menu] native open-with failed:', error);
      group = { pinned: [], openWith: null };
    }
    if (group.openWith === null) return;
    const separator = takeSeparator('open-with');
    const combined = [...group.pinned, group.openWith];
    combined.forEach((action, position) => {
      if (separator && position === 0) action.separatorBefore = true;
      actions.push(action);
    });
  };

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    // 费用 / 后台任务这类状态入口默认隐藏，与自绘菜单同一份设置。
    if (item.stats && blankOption('showCostMeter') !== true) continue;

    if (item.openWith) {
      await pushOpenWith();
      continue;
    }

    if (item.more && item.menu !== null && item.menu !== undefined) {
      // 工具条里没有打开方式按钮时，把它补在「更多操作」之前，和旧自绘菜单的
      // 阅读顺序一致；有按钮时仍按按钮原来的位置生成。
      if (!hasOpenWithItem) await pushOpenWith();
      const entries = moreSubmenuItems(item.menu);
      const select = moreSelectHandler(item.menu, entries);
      const separator = takeSeparator('more');
      const icon = toolbarIcon(item.icon);
      actions.push({
        id: `more-${index}`,
        label: item.label,
        ...(icon === undefined ? {} : { icon }),
        ...(separator ? { separatorBefore: true } : {}),
        children: entries.map((entry, position) => ({
          id: `more-item-${position}`,
          label: entry.label,
          disabled: entry.disabled === true,
          run: () => select(entry.id),
        })),
      });
      continue;
    }

    const separator = takeSeparator(item.openWith ? 'open-with' : (item.more ? 'more' : (item.section || 'toolbar')));
    const icon = toolbarIcon(item.icon);
    actions.push({
      id: `toolbar-${index}`,
      label: item.label,
      ...(icon === undefined ? {} : { icon }),
      ...(separator ? { separatorBefore: true } : {}),
      run: clickAction(item),
    });
  }
  if (!hasOpenWithItem) await pushOpenWith();
  return actions;
}

/** 第一次真正用到时再注册，避免给不用正文菜单的宿主和测试多塞一条 provider。 */
function ensureRegistered(ctx) {
  if (menus !== null) return true;
  const service = contextMenusOf(ctx);
  if (service === null || typeof service.open !== 'function') return false;
  if (iconRegistration === null && ctx.slots !== null && ctx.slots !== undefined) {
    try {
      iconRegistration = ctx.slots.inject('contextMenu.icon', function* () {
        yield ctx.slots.register(
          { name: 'contextMenu.icon', key: TOOLBAR_ICON_KEY },
          ContextMenuToolbarIcon,
        );
      });
    } catch (error) {
      console.warn('[dsh-sidebar-row-menu] conversation icon registration failed:', error);
    }
  }
  try {
    unregister = service.register({
      id: 'sidebar-row-menu.conversation',
      target: TARGET_KIND,
      order: 300,
      observe: () => [itemsSource, childrenSource, pinnedSource, blankMenuSource, appsSource],
      resolve: (target, signal) => conversationActions(ctx, target, signal),
    });
    menus = service;
    return true;
  } catch (error) {
    console.warn('[dsh-sidebar-row-menu] conversation context registration failed:', error);
    unregister = null;
    return false;
  }
}

/**
 * 在指针处打开宿主原生菜单。
 * @param ctx - 客户端根上下文。
 * @param event - 已拦截的 contextmenu 事件。
 * @param sessionId - 当前会话。
 * @param fileTarget - fileTargetAt 的结果，可为 null。
 * @returns 是否已交给宿主；false 时调用方回退旧的自绘菜单。
 */
function openNativeConversationMenu(ctx, event, sessionId, fileTarget) {
  // 与侧栏右键共用同一个版本门槛：rc.1 即使碰巧有 contextMenus 服务，
  // 也保持旧的自绘菜单，避免在两个宿主壳之间出现半原生状态。
  if (!hasNativeSessionMenu()) return false;
  if (!ensureRegistered(ctx)) return false;
  const cwd = typeof sessionId === 'string' && sessionId !== '' ? sessionCwd(ctx, sessionId) : '';
  const paths = Array.isArray(fileTarget?.paths)
    ? fileTarget.paths.filter((path) => typeof path === 'string' && path !== '')
    : [];
  try {
    menus.open(
      { kind: TARGET_KIND, value: { sessionId, cwd, paths } },
      { x: event.clientX, y: event.clientY },
    );
    return true;
  } catch (error) {
    console.warn('[dsh-sidebar-row-menu] native conversation menu failed:', error);
    return false;
  }
}

/** 插件卸载：撤回贡献，下一次 apply 重新注册。 */
function stopNativeConversationMenu() {
  const dispose = unregister;
  const disposeIcons = iconRegistration;
  unregister = null;
  iconRegistration = null;
  menus = null;
  try {
    dispose?.();
  } catch {
    /* 注册已随插件生命周期撤销 */
  }
  try {
    disposeIcons?.();
  } catch {
    /* 图标槽已随插件生命周期撤销 */
  }
}

export { openNativeConversationMenu, stopNativeConversationMenu };
