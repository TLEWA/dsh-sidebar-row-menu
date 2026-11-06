import { MENU_ATTR } from './constants.js';
import { createRoot } from './platform.js';

/** 换掉「…」菜单的锚定按钮（null = 没有）。 */
function setEllipsisTrigger(button) {
  ellipsisTrigger = button;
}

/** apply 时记下根上下文。 */
function setRootCtx(ctx) {
  rootCtx = ctx;
}

/**
 * 在 body 上挂一个全屏菜单容器并建 root，返回可以 render 的 root。
 * 工作区菜单与右上角工具条菜单共用这段挂载流程。
 */
function beginMenu(attr) {
  closeMenu();
  const host = document.createElement('div');
  host.setAttribute(MENU_ATTR, attr);
  host.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647';
  document.body.appendChild(host);
  menuHost = host;
  menuRoot = createRoot(host);
  return menuRoot;
}
let menuHost = null;
let menuRoot = null;
/** 当前「…」菜单锚定的按钮；用来判断再次点击是否应收起。 */
let ellipsisTrigger = null;
/** 客户端根上下文（apply 时记下，右键时用来取服务 / 文案）。 */
let rootCtx = null;

function unmountAt(host, root) {
  if (root !== null) {
    try {
      root.unmount();
    } catch (error) {
      console.warn('[dsh-sidebar-row-menu] unmount failed:', error);
    }
  }
  if (host !== null) host.remove();
}

/** 关掉当前菜单。 */
function closeMenu() {
  const host = menuHost;
  const root = menuRoot;
  menuHost = null;
  menuRoot = null;
  ellipsisTrigger = null;
  unmountAt(host, root);
}

/* ------------------------------------------------------------ 小工具 */

/**
 * 轻提示：直接用官方 Toast primitive（与内置「复制 Session ID」同款、
 * 同一个底部居中 portal），不再自绘 DOM 气泡。
 */
function serviceOf(ctx, name) {
  try {
    const value = ctx.get?.(name);
    if (value !== undefined && value !== null) return value;
  } catch (error) {
    console.warn('[dsh-sidebar-row-menu] service lookup failed:', name, error);
  }
  try {
    return ctx[name] ?? null;
  } catch {
    return null;
  }
}

export { setRootCtx, setEllipsisTrigger,
  beginMenu,
  closeMenu, ellipsisTrigger, menuHost, menuRoot, rootCtx, serviceOf, unmountAt };
