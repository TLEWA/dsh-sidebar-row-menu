import { useEffect, useLayoutEffect, useState } from '../platform.js';

function viewportBounds() {
  const root = typeof document === 'undefined' ? null : document.documentElement;
  const width = root !== null && root !== undefined && root.clientWidth > 0 ? root.clientWidth : window.innerWidth;
  const height = root !== null && root !== undefined && root.clientHeight > 0 ? root.clientHeight : window.innerHeight;
  return { width: Number(width) || 0, height: Number(height) || 0 };
}

/**
 * 元素真实占位尺寸。必须用 offsetWidth/offsetHeight：面板入场动画带 transform 缩放，
 * 动画期间 getBoundingClientRect 量出来偏小（实测 181 vs 198），按它夹取会溢出视口。
 */
function layoutSize(node) {
  if (node === null || node === undefined) return null;
  const width = Number(node.offsetWidth) || 0;
  const height = Number(node.offsetHeight) || 0;
  if (width > 0 && height > 0) return { width, height };
  if (typeof node.getBoundingClientRect !== 'function') return null;
  const rect = node.getBoundingClientRect();
  if (!(rect.width > 0) || !(rect.height > 0)) return null;
  return { width: rect.width, height: rect.height };
}

/** 菜单面板定位：按布局尺寸夹进视口；尺寸后续变化（异步条目、字体）时再夹一次。 */
function useMenuPos(hostRef, x, y, deps) {
  const [pos, setPos] = useState(null);
  const place = () => {
    const host = hostRef.current;
    if (host === null || host === undefined) return;
    const size = layoutSize(host);
    if (size === null) return;
    const view = viewportBounds();
    const margin = 8;
    const left = Math.max(margin, Math.min(x, view.width - size.width - margin));
    const top = Math.max(margin, Math.min(y, view.height - size.height - margin));
    setPos((prev) => (prev !== null && prev.left === left && prev.top === top ? prev : { left, top }));
  };
  useLayoutEffect(place, [x, y, ...deps]);
  useEffect(() => {
    if (typeof ResizeObserver !== 'function') return undefined;
    const host = hostRef.current;
    if (host === null || host === undefined) return undefined;
    const observer = new ResizeObserver(place);
    observer.observe(host);
    return () => observer.disconnect();
  }, [x, y]);
  return pos;
}

/**
 * 二级菜单位置：横向贴住菜单面板外沿，纵向和触发它的那一行对齐；
 * 右侧放不下就翻到左边，仍然紧贴面板，再整体夹进视口。
 */
function submenuGeometry(anchor, size, row = anchor) {
  const margin = 12;
  const gap = 6;
  const view = viewportBounds();
  // 与 .dsrm-submenu 的 min-width 保持一致，避免量不到尺寸时按更窄的宽度估位。
  const width = Math.max(180, size?.width ?? 180);
  const height = Math.max(0, size?.height ?? 0);
  const rightRoom = view.width - margin - (anchor.right + gap);
  const leftRoom = anchor.left - gap - margin;
  let side = 'right';
  let left = anchor.right + gap;
  if (rightRoom < width && leftRoom > rightRoom) {
    side = 'left';
    left = anchor.left - width - gap;
  }
  left = Math.max(margin, Math.min(left, view.width - width - margin));
  let top = row.top;
  top = Math.max(margin, Math.min(top, view.height - height - margin));
  return { left, top, side };
}

/**
 * 二级菜单定位：面板先以隐藏状态挂载，量到真实尺寸后再贴边，
 * 因此顶到屏幕右侧时会精确翻到另一侧并紧贴菜单，不再按估算宽度留出空隙。
 */
function useSubmenuPos(open, hostRef, deps) {
  const [box, setBox] = useState(null);
  const place = () => {
    const host = hostRef.current;
    if (host === null || host === undefined) return;
    const panel = typeof host.querySelector === 'function' ? host.querySelector('.dsrm-submenu') : null;
    const size = layoutSize(panel);
    if (size === null) return;
    const row = host.getBoundingClientRect();
    // 横向以菜单面板外沿为锚：自绘菜单是 .dsrm-menu，会话 / 工作区行注入到宿主菜单里，
    // 那时要找宿主的 [role="menu"] 面板（行本身比面板内缩 4px，贴它会偏进面板里）。
    const menu = typeof host.closest === 'function'
      ? (host.closest('.dsrm-menu') ?? host.closest('[role="menu"]'))
      : null;
    const anchor = menu !== null && menu !== undefined && menu !== host ? menu.getBoundingClientRect() : row;
    const next = submenuGeometry(anchor, size, row);
    setBox((prev) => (prev !== null
      && prev.left === next.left
      && prev.top === next.top
      && prev.side === next.side ? prev : next));
  };
  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    place();
  }, [open, ...deps]);
  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener('resize', place);
    const host = hostRef.current;
    const panel = host !== null && host !== undefined && typeof host.querySelector === 'function'
      ? host.querySelector('.dsrm-submenu')
      : null;
    const observer = typeof ResizeObserver === 'function' && panel !== null && panel !== undefined
      ? new ResizeObserver(place)
      : null;
    if (observer !== null) observer.observe(panel);
    return () => {
      window.removeEventListener('resize', place);
      if (observer !== null) observer.disconnect();
    };
  }, [open, ...deps]);
  return box;
}

/** 面板翻到左侧时箭头跟着翻转，指向菜单所在方向。 */
function chevronClass(box) {
  return box?.side === 'left'
    ? 'dsrm-submenu-chevron dsrm-submenu-chevron-flipped'
    : 'dsrm-submenu-chevron';
}

/** slot 注入的 useMenuOpenState 在不同版本里可能不是数组，宽松取关闭函数。 */
function menuCloser(useMenuOpenState) {
  if (typeof useMenuOpenState !== 'function') return undefined;
  const state = useMenuOpenState();
  return Array.isArray(state) && typeof state[1] === 'function' ? state[1] : undefined;
}

/**
 * 「打开方式」二级菜单：会话行和工作区行共用。
 * 官方 MenuItemButton 没有子菜单，面板用 primitives.MenuSurface 保持官方外观。
 */

export { chevronClass, layoutSize, menuCloser, submenuGeometry, useMenuPos, useSubmenuPos, viewportBounds };
