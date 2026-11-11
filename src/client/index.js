/**
 * dsh-sidebar-row-menu — 客户端插件的入口。
 *
 * 这里只做组装：注册 slot 条目、设置页、右键监听和样式。
 * 具体实现按领域分布在：
 *   constants.js / i18n.js / platform.js / runtime.js / toast.js / host-api.js
 *   dom.js（从 React fiber 里找行组件 props）
 *   store/*（localStorage 支持的设置）
 *   ui/*（菜单位置、子菜单遮罩、右键标记）
 *   features/*（会话菜单、工作区菜单、空白处菜单、设置、删除、归档）
 *
 * 平台模块（react / ui-primitives）只从 platform.js 进；打包脚本会把它们
 * 标成 external，运行时由 DSH 的客户端模块系统提供。
 */
import { NS } from './constants.js';
import { en, zh } from './i18n.js';
import { closeMenu, setRootCtx } from './runtime.js';
import { closeToast } from './toast.js';
import { installStyles } from './styles.js';
import { startArchivedRows } from './features/archived.js';
import { registerDeleteDialog } from './features/delete-dialog.js';
import { install } from './features/row-context.js';
import { registerSessionMenu } from './features/session-menu.js';
import { registerSettings } from './features/settings.js';
import { registerWorkspaceContextMenu } from './features/workspace-menu.js';

// remote / remote.session 供正文右键「打开方式」按文件调用 Host Remote：
// Cordis 要求嵌套属性访问的每一层都出现在 inject 里，缺一层会抛错。
export const inject = ['locale', 'sessions', 'workspaces', 'slots', 'remote', 'remote.session'];
export const name = 'sidebar-row-menu';

/**
 * cordis 客户端插件入口。
 * @param ctx - 客户端根上下文。
 */
export function apply(ctx) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  setRootCtx(ctx);
  if (typeof ctx.locale?.register === 'function') {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'sidebar-row-menu: dictionaries');
  }
  if (ctx.slots !== null && ctx.slots !== undefined) {
    // `slots.inject` 自带 ctx.effect 生命周期，不要再包一层 effect：
    // 它会在 slot 声明出现时注册、插件卸载时自动撤销。
    registerSessionMenu(ctx);
    registerDeleteDialog(ctx);
    registerSettings(ctx);
  }
  if (typeof ctx.effect === 'function') {
    ctx.effect(() => installStyles(), 'sidebar-row-menu: styles');
  }
  const stopWorkspaceMenu = registerWorkspaceContextMenu(ctx);
  const stopArchivedRows = startArchivedRows();
  const teardown = install();
  if (ctx !== null && typeof ctx.effect === 'function') {
    ctx.effect(() => () => {
      setRootCtx(null);
      stopWorkspaceMenu();
      stopArchivedRows();
      teardown();
    }, 'sidebar-row-menu: row context menus');
  }
}

// 供测试/调试用：确保 closeMenu/closeToast 在卸载时可达。
export { closeMenu, closeToast };
// 供测试使用：正文右键落点的文件解析与文件打开适配器。
export { fileTargetAt } from './features/file-target.js';
export { desktopReady, fileApplications, openFilesDefault, openFilesWith, revealFiles } from './features/file-open.js';
