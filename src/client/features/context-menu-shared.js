import { jsx } from '../platform.js';
import { appsSnapshot, subscribeApps } from '../store/apps.js';

/* ------------------------- 宿主数据贡献（0.2.2+）公用件 */

/**
 * 宿主 0.2.2 把右键菜单改成数据贡献（ctx.contextMenus），0.2.1 没有这个
 * 服务。注册前先探测，免得在旧宿主上直接抛错。
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

export { ContextMenuAppIcon, appsSource, contextMenusOf };
