import { NS, SESSION_MENU_SLOT } from '../constants.js';
import { SessionDeleteArchivedMenuItem, SessionDeleteMenuItem, SessionOpenWithMenuItem, SessionOpenWithPinnedMenuItem } from './open-with.js';
import { jsx } from '../platform.js';
import { appsSnapshot, subscribeApps } from '../store/apps.js';

function registerSessionMenu(ctx) {
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
}

/* -------------------------------- 工作区行：0.2.2 原生右键贡献 */

/**
 * DSH 0.2.2 把右键菜单改成数据贡献（ctx.contextMenus），工作区行也不再向
 * 行组件传 actions/onCreate，插件原来的自绘入口会取不到 props。这里改为
 * 向宿主注册同一批动作；0.2.1 没有这个服务，保持自绘菜单不变。
 */
function contextMenusOf(ctx) {
  const usable = (menus) => (menus !== null && menus !== undefined && typeof menus.register === 'function' ? menus : null);
  // 先走 ctx.get：未 inject 时直接读 ctx.contextMenus 会抛错，读不到服务。
  try {
    const viaGet = usable(ctx?.get?.('contextMenus'));
    if (viaGet !== null) return viaGet;
  } catch {
    /* 服务容器尚未就绪 */
  }
  try {
    return usable(ctx?.contextMenus);
  } catch {
    /* 未 inject 的服务属性访问会抛错，按不存在处理 */
  }
  return null;
}

/** 应用缓存包成宿主可订阅的数据源，应用列表到达后菜单会自动重解析。 */
const appsSource = {
  getSnapshot: appsSnapshot,
  subscribe: (listener) => subscribeApps(listener),
};

/** 应用图标走 data 贡献：resolve 里带 src，组件只负责渲染。 */
function ContextMenuAppIcon({ icon }) {
  const src = typeof icon?.src === 'string' ? icon.src : '';
  if (src === '') return null;
  return jsx('img', {
    className: 'dsrm-app-icon',
    src,
    alt: '',
    onError: (event) => {
      event.currentTarget.style.visibility = 'hidden';
    },
  });
}

/* --------------------- 工作区归档会话：按工作区单独显示/隐藏 */


export { ContextMenuAppIcon, appsSource, contextMenusOf, registerSessionMenu };
