import { NS, SESSION_MENU_SLOT } from '../constants.js';
import { SessionDeleteArchivedMenuItem, SessionDeleteMenuItem, SessionOpenWithMenuItem, SessionOpenWithPinnedMenuItem } from './open-with.js';
import { hasNativeSessionMenu } from '../host-version.js';
import { ContextMenuAppIcon, appsSource, contextMenusOf } from './context-menu-shared.js';
import { registerNativeSessionMenu } from './session-menu-native.js';

/**
 * 会话行菜单有两种宿主形态：
 *   - 0.2.2-rc.2 之前：宿主行组件的菜单里留了 slot（SESSION_MENU_SLOT），
 *     插件注册四个菜单项组件，自绘「打开方式」子菜单和箭头。
 *   - 0.2.2-rc.2 起：右键由宿主的数据贡献渲染器接管，slot 条目会和原生项
 *     混在同一个面板里。四个条目改成 target:'session' 的原生贡献，
 *     箭头、子菜单、分隔线都由宿主画，插件不再自绘。
 */
function registerSlotSessionMenu(ctx) {
  if (ctx?.slots === null || ctx?.slots === undefined) return null;
  try {
    return ctx.slots.inject(SESSION_MENU_SLOT, function* () {
      yield ctx.slots.register({
        name: SESSION_MENU_SLOT,
        id: 'row-menu-open-with-pinned',
        order: 495,
        locale: NS,
      }, SessionOpenWithPinnedMenuItem);
      yield ctx.slots.register({
        name: SESSION_MENU_SLOT,
        id: 'row-menu-open-with',
        order: 500,
        locale: NS,
      }, SessionOpenWithMenuItem);
      yield ctx.slots.register({
        name: SESSION_MENU_SLOT,
        id: 'row-menu-delete-session',
        order: 510,
        locale: NS,
      }, SessionDeleteMenuItem);
      yield ctx.slots.register({
        name: SESSION_MENU_SLOT,
        id: 'row-menu-delete-archived',
        order: 520,
        locale: NS,
      }, SessionDeleteArchivedMenuItem);
    });
  } catch (error) {
    console.warn('[dsh-sidebar-row-menu] session slot registration failed:', error);
    return null;
  }
}

/**
 * 注册会话菜单。原生宿主上 contextMenus 服务可能晚于插件 apply 出现，
 * 这里和 workspace 一样按 250ms 重试；真等不到（异常宿主）再退回 slot，
 * 至少保证 rc.1 那套入口还在。
 */
function registerSessionMenu(ctx) {
  if (!hasNativeSessionMenu()) return registerSlotSessionMenu(ctx);

  let stopNative = null;
  let stopSlots = null;
  let timer = 0;
  let attempts = 0;
  let disposed = false;

  const fallBackToSlots = () => {
    if (disposed || stopSlots !== null) return;
    stopSlots = registerSlotSessionMenu(ctx);
  };

  const start = () => {
    timer = 0;
    if (disposed || stopNative !== null || stopSlots !== null) return;
    if (contextMenusOf(ctx) === null) {
      if (attempts >= 40 || typeof setTimeout !== 'function') {
        fallBackToSlots();
        return;
      }
      attempts += 1;
      timer = setTimeout(start, 250);
      return;
    }
    stopNative = registerNativeSessionMenu(ctx);
    if (stopNative === null) fallBackToSlots();
  };

  start();
  return () => {
    disposed = true;
    if (timer !== 0) clearTimeout(timer);
    try {
      stopNative?.();
    } catch (error) {
      console.warn('[dsh-sidebar-row-menu] session context teardown failed:', error);
    }
    try {
      stopSlots?.();
    } catch (error) {
      console.warn('[dsh-sidebar-row-menu] session slot teardown failed:', error);
    }
  };
}

export { ContextMenuAppIcon, appsSource, contextMenusOf, registerSessionMenu };
