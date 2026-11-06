import { useCallback, useEffect, useRef } from '../platform.js';

/**
 * 菜单级关闭：点菜单外面、或按 Escape，就调 onClose。
 * active=false 时完全不挂监听（子菜单只在展开期间用）。
 */
export function useDismissOnOutside(hostRef, onClose, active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const dismiss = (event) => {
      const host = hostRef.current;
      if (host !== null && host !== undefined && host.contains(event.target)) return;
      onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', dismiss, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', dismiss, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [active, hostRef, onClose]);
}

/** 子菜单：展开期间点外面 / Escape 关闭。 */
export function useSubmenuDismiss(open, setOpen, hostRef) {
  useDismissOnOutside(hostRef, useCallback(() => setOpen(false), [setOpen]), open);
}

/**
 * 悬浮子菜单的开合：openNow 立刻展开，closeSoon 延迟 160ms 收起，
 * 给指针从父项移进面板留一点时间。
 */
export function useHoverSubmenu(setOpen, onOpen) {
  const closeTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  const openNow = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
    onOpen?.();
  }, [setOpen, onOpen]);
  const closeSoon = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  }, [setOpen]);
  return { closeSoon, openNow };
}
