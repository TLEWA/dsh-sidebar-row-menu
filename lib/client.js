/**
 * dsh-sidebar-row-menu — 客户端半边（构建产物，请勿手改）。
 *
 * 源码在 src/client/**，由 `npm run build:client` 生成这个文件：
 *   - 工作区行右键：本插件自绘的官方样式菜单；
 *   - 会话行右键：复用内置「…」菜单的 slot，只追加本插件的条目；
 *   - 会话正文空白处/工具栏右键：镜像右上角工具条。
 *
 * 产物外壳是 DSH 客户端模块系统的单文件约定：
 *   window.__ModuleLoader__.load({ id, factory: (require) => module.exports })
 * 里面的代码是 esbuild 的 cjs bundle，`module` / `require` 解析到
 * factory 参数与包装盒里的局部变量，所以平台模块不会被重复打包。
 *
 * 详细约定见 AGENTS.md。
 */
window.__ModuleLoader__.load({
  id: 'dsh-sidebar-row-menu',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.js
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  closeMenu: () => closeMenu,
  closeToast: () => closeToast,
  desktopReady: () => desktopReady,
  fileApplications: () => fileApplications,
  fileTargetAt: () => fileTargetAt,
  inject: () => inject,
  name: () => name,
  openFilesDefault: () => openFilesDefault,
  openFilesWith: () => openFilesWith,
  revealFiles: () => revealFiles
});
module.exports = __toCommonJS(index_exports);

// src/client/constants.js
var MENU_ATTR = "data-dsh-sidebar-row-menu";
var TOAST_ATTR = "data-dsh-sidebar-row-menu-toast";
var NS = "sidebar-row-menu";
var SESSION_MENU_SLOT = "sidebar.workspaces.session.menu.item";
var DELETE_ENDPOINT = "/dsh-sidebar-row-menu/session/delete";
var DELETE_BATCH_LIMIT = 500;
var WORKSPACE_DELETE_ENDPOINT = "/dsh-sidebar-row-menu/workspace/delete";
var PERMISSION_DEFAULTS_ENDPOINT = "/dsh-sidebar-row-menu/permission-defaults";
var PRESET_LABEL_KEYS = {
  "read-only": "permission.readOnly",
  "workspace-write": "permission.workspaceWrite",
  "danger-full-access": "permission.fullAccess",
  auto: "permission.autoReview",
  custom: "permission.custom"
};
var FALLBACK_PRESETS = ["read-only", "workspace-write", "danger-full-access"];
var APPS_ROUTE = "open-in-app/apps";
var OPEN_ROUTE = "open-in-app/open";
var ICON_ROUTE = "open-in-app/icon/";
var ITEMS_KEY = "dsh.sidebar-row-menu.items.v1";
var OPEN_WITH_CHILDREN_KEY = "dsh.sidebar-row-menu.open-with.v1";
var OPEN_WITH_PINNED_KEY = "dsh.sidebar-row-menu.open-with.pinned.v1";
var PIN_PREFERENCE = [
  "vscode",
  "vscodeinsiders",
  "cursor",
  "windsurf",
  "zed",
  "sublimetext",
  "intellij",
  "pycharm",
  "webstorm",
  "phpstorm",
  "goland",
  "rider",
  "rustrover",
  "androidstudio",
  "xcode"
];
var ITEM_DEFAULTS = {
  openWith: true,
  archivedSessions: true,
  deleteSession: true,
  deleteArchived: true,
  deleteUnarchived: false
};
var ITEM_KEYS = Object.keys(ITEM_DEFAULTS);
var ELLIPSIS_KEY = "dsh.sidebar-row-menu.ellipsis.v1";
var PLACEMENT_KEY = "dsh.sidebar-row-menu.placement.v1";
var PLACEMENT_VALUES = ["context", "ellipsis", "both"];
var ARCHIVED_HIDDEN_KEY = "dsh.sidebar-row-menu.archived-hidden.v1";
var ELLIPSIS_DEFAULTS = {
  newSession: false,
  permissionDefault: false,
  showArchived: false,
  openWith: false,
  copyPath: false,
  openInTab: false,
  deleteSessions: false,
  sessionOpenWith: false,
  sessionDelete: false,
  sessionDeleteArchived: false
};
var ELLIPSIS_KEYS = Object.keys(ELLIPSIS_DEFAULTS);
var BLANK_MENU_KEY = "dsh.sidebar-row-menu.blank-menu.v1";
var BLANK_MENU_DEFAULTS = {
  enabled: true,
  keepMoreLast: true,
  showCostMeter: false
};
var BLANK_MENU_KEYS = Object.keys(BLANK_MENU_DEFAULTS);
var MORE_LABEL_RE = /^(more|more tools|more actions|more options|更多|更多工具|更多操作|更多选项)$/i;
var ORGANIZER_MENU_ORDER_KEY = "dsh.sidebar-organizer.host-menu-order.v1";
var ORGANIZER_LAYOUT_KEY = "dsh.sidebar-organizer.layout.v1";
var FOREIGN_ITEMS = {
  openWith: "session-menu-open-with",
  deleteSession: "session-menu-delete",
  deleteArchived: "session-menu-delete-archived"
};

// src/client/i18n.js
var zh = {
  newSession: "新会话",
  rename: "重命名",
  vscode: "使用 VS Code 打开",
  explorer: "在资源管理器中打开",
  copyPath: "复制工作区路径",
  openInTab: "在新标签中打开",
  deleteWorkspace: "删除工作区",
  deleteWorkspaceSessions: "删除工作区及所有会话",
  showArchivedSessions: "显示已归档会话",
  hideArchivedSessions: "隐藏已归档会话",
  copied: "已复制",
  copyFailed: "复制失败，请重试",
  noPath: "没有可用的目录路径",
  openFailed: "打开失败：宿主没有找到对应程序",
  actionFailed: "操作失败，请稍后重试",
  openWith: "打开方式",
  openWithApp: "用 {name} 打开",
  openWithFiles: "{count} 个文件",
  openWithNoHandlers: "系统里没有登记可以打开这些文件的程序",
  openWithUnavailable: "宿主没有提供桌面打开能力",
  openWithListFailed: "宿主读不到系统的文件关联，先用下面两条兜底",
  openDefaultApp: "用默认程序打开",
  openWithReveal: "在文件夹中显示",
  newSessionPermission: "新会话默认权限",
  permissionFollowGlobal: "跟随全局默认",
  "permission.readOnly": "仅可查看",
  "permission.workspaceWrite": "工作区内修改",
  "permission.fullAccess": "完全权限",
  "permission.autoReview": "自动审查（实验）",
  "permission.custom": "自定义",
  "permission.unavailable": "宿主没有提供权限预设",
  deleteSession: "永久删除会话",
  deleteArchived: "删除所有已归档会话",
  "settings.title": "行菜单",
  "settings.openWith.label": "打开方式",
  "settings.openWith.hint": "在子菜单里选择编辑器、终端或文件管理器打开工作区或会话目录；置顶的应用直接显示在菜单一级。",
  "settings.archivedSessions.label": "显示已归档会话",
  "settings.archivedSessions.hint": "在工作区右键菜单里单独显示或隐藏该工作区内所有已归档会话，不影响其他工作区。",
  "settings.deleteSession.label": "永久删除会话",
  "settings.deleteSession.hint": "在会话菜单里永久删除这一个会话及其日志；默认只对已归档会话显示。",
  "settings.deleteArchived.label": "删除所有已归档会话",
  "settings.deleteArchived.hint": "在已归档会话的菜单里一次清理全部归档会话。",
  "settings.deleteUnarchived.label": "允许删除未归档会话",
  "settings.deleteUnarchived.hint": "开启后，未归档会话的右键菜单也会出现「永久删除会话」；确认后日志立即从磁盘移除，不可恢复。",
  "settings.children": "选择要显示的应用",
  "settings.pin": "置顶",
  "settings.pinned": "已置顶",
  "settings.pinTitle": "直接显示在会话右键菜单的一级",
  "settings.conflict": "已由 dsh-session-menu 提供，此项自动停用",
  "settings.conflictNote": "检测到 dsh-session-menu：重复的菜单项已自动隐藏。",
  "settings.childLocked": "需先开启「{name}」",
  "settings.appsLoading": "正在加载应用…",
  "settings.appsUnavailable": "宿主没有提供可用的外部应用",
  "settings.appsError": "应用列表加载失败，请稍后重试",
  "settings.appsAllOff": "所有应用都被二级开关隐藏了",
  "settings.expand": "展开应用列表",
  "settings.collapse": "收起应用列表",
  "settings.ellipsisTitle": "菜单显示位置",
  "settings.ellipsisHint": "每个条目都可以分别选择出现在右键菜单、「…」菜单，或两边都出现；至少保留一边。上面的单项开关仍然决定条目是否启用。",
  "settings.placement.context": "右键菜单",
  "settings.placement.ellipsis": "「…」菜单",
  "settings.placement.locked": "至少要在一边显示",
  "settings.ellipsisWorkspace": "工作区行",
  "settings.ellipsisSession": "会话行",
  "settings.ellipsis.newSession.label": "新建会话",
  "settings.ellipsis.newSession.hint": "在「…」菜单里直接新建该工作区的会话。",
  "settings.ellipsis.permissionDefault.label": "新会话默认权限",
  "settings.ellipsis.permissionDefault.hint": "在「…」菜单里为该工作区设置新建会话的默认权限；只在带原生权限预设的宿主上出现。",
  "settings.ellipsis.showArchived.label": "显示已归档会话",
  "settings.ellipsis.showArchived.hint": "在「…」菜单里单独显示或隐藏该工作区的已归档会话。",
  "settings.ellipsis.openWith.label": "打开方式",
  "settings.ellipsis.openWith.hint": "在「…」菜单里用外部应用打开工作区或会话目录。",
  "settings.ellipsis.copyPath.label": "拷贝工作区路径",
  "settings.ellipsis.copyPath.hint": "在「…」菜单里复制工作区目录路径。",
  "settings.ellipsis.openInTab.label": "在新标签页打开",
  "settings.ellipsis.openInTab.hint": "在「…」菜单里把工作区作为标签页打开。",
  "settings.ellipsis.deleteSessions.label": "删除工作区及所有会话",
  "settings.ellipsis.deleteSessions.hint": "在「…」菜单里同时清掉工作区记录和它下面的全部会话。",
  "settings.ellipsis.sessionOpenWith.label": "打开方式",
  "settings.ellipsis.sessionOpenWith.hint": "在「…」菜单里用外部应用打开会话目录。",
  "settings.ellipsis.sessionDelete.label": "永久删除会话",
  "settings.ellipsis.sessionDelete.hint": "在「…」菜单里永久删除这一个会话及其日志。",
  "settings.ellipsis.sessionDeleteArchived.label": "删除所有已归档会话",
  "settings.ellipsis.sessionDeleteArchived.hint": "在已归档会话的「…」菜单里一次清理全部归档会话。",
  "settings.blankMenuTitle": "会话正文右键",
  "settings.blankMenuNote": "在会话正文里右键（空白处、思考过程、回复都可以），会按顶部工具条的视觉顺序列出那排按钮；装了 dsh-sidebar-organizer 时跟随它的排序。分组之间自动加分隔线，「打开方式」和「更多操作」按工作区 / 会话菜单的规则收纳。输入框、工具卡片和工具条本身仍走各自的原生菜单。",
  "settings.blankMenu.enabled.label": "启用正文右键菜单",
  "settings.blankMenu.enabled.hint": "在会话正文的空白处、思考过程或回复上右键，弹出与右上角工具条一致的纵向菜单；取不到按钮时不接管原生菜单。",
  "settings.blankMenu.keepMoreLast.label": "「更多」固定在最右",
  "settings.blankMenu.keepMoreLast.hint": "把「更多操作」一类的入口固定在菜单最后一项，不受工具条当前顺序影响。",
  "settings.blankMenu.showCostMeter.label": "显示左上角状态组件",
  "settings.blankMenu.showCostMeter.hint": "把会话栏左上角的状态组件（费用明细、后台任务计数等）也列进菜单；默认整体隐藏，需要时再打开。",
  "delete.title": "永久删除会话？",
  "delete.description": "会话「{name}」的日志将从磁盘永久删除，此操作无法撤销。",
  "delete.untitled": "未命名会话",
  "delete.archivedTitle": "删除所有已归档会话？",
  "delete.archivedDescription": "将永久删除 {n} 个已归档会话及其日志，此操作无法撤销。",
  "delete.confirm": "永久删除",
  "delete.archivedConfirm": "全部删除",
  "delete.cancel": "取消",
  "delete.pending": "正在删除…",
  "delete.archivedPending": "正在批量删除…",
  "delete.archivedPartial": "已删除 {done} 个，失败 {failed} 个。",
  "delete.failed": "删除失败：{message}",
  "delete.unavailable": "删除服务不可用",
  "delete.done": "已删除会话",
  "delete.doneMany": "已删除 {n} 个会话",
  "delete.alreadyGone": "会话已不存在，无需删除",
  "delete.workspaceTitle": "删除工作区及所有会话？",
  "delete.workspaceDescription": "工作区「{name}」及其下 {n} 个会话的日志将被永久删除，目录本身保留。此操作无法撤销。",
  "delete.workspaceEmptyDescription": "工作区「{name}」下没有会话，将只删除工作区记录。",
  "delete.workspaceConfirm": "全部删除",
  "delete.workspacePending": "正在删除工作区及会话…",
  "delete.workspacePartial": "已删除 {done} 个会话，失败 {failed} 个；工作区已保留。",
  "delete.workspaceDone": "已删除工作区及 {n} 个会话",
  "delete.workspaceEmptyDone": "已删除工作区"
};
var en = {
  newSession: "New session",
  rename: "Rename",
  vscode: "Open in VS Code",
  explorer: "Reveal in File Explorer",
  copyPath: "Copy workspace path",
  openInTab: "Open in new tab",
  deleteWorkspace: "Delete workspace",
  deleteWorkspaceSessions: "Delete workspace and all sessions",
  showArchivedSessions: "Show archived sessions",
  hideArchivedSessions: "Hide archived sessions",
  copied: "Copied",
  copyFailed: "Copy failed, please retry",
  noPath: "No usable directory path",
  openFailed: "Open failed: no handler found on the host",
  actionFailed: "Action failed, please retry",
  openWith: "Open with",
  openWithApp: "Open with {name}",
  openWithFiles: "{count} files",
  openWithNoHandlers: "No application is registered for these files",
  openWithUnavailable: "The host offers no desktop opening here",
  openWithListFailed: "The host could not read system file associations; these two still work",
  openDefaultApp: "Open with the default application",
  openWithReveal: "Show in folder",
  newSessionPermission: "Default permission for new sessions",
  permissionFollowGlobal: "Follow the global default",
  "permission.readOnly": "Read Only",
  "permission.workspaceWrite": "Workspace Write",
  "permission.fullAccess": "Full access",
  "permission.autoReview": "Auto review (experimental)",
  "permission.custom": "Custom",
  "permission.unavailable": "The host exposes no permission presets",
  deleteSession: "Delete session permanently",
  deleteArchived: "Delete all archived sessions",
  "settings.title": "Row menu",
  "settings.openWith.label": "Open with",
  "settings.openWith.hint": "Pick an editor, terminal or file manager for workspace or session directories; pinned apps show up directly in the menu.",
  "settings.archivedSessions.label": "Show archived sessions",
  "settings.archivedSessions.hint": "Show or hide this workspace's archived sessions from its context menu, without affecting other workspaces.",
  "settings.deleteSession.label": "Delete session permanently",
  "settings.deleteSession.hint": "Permanently delete one session and its transcript from its menu; shown on archived sessions by default.",
  "settings.deleteArchived.label": "Delete all archived sessions",
  "settings.deleteArchived.hint": "Clean up every archived session from an archived session row.",
  "settings.deleteUnarchived.label": "Allow deleting unarchived sessions",
  "settings.deleteUnarchived.hint": 'Also show "Delete session permanently" on unarchived rows. The transcript is removed from disk immediately and cannot be restored.',
  "settings.children": "Applications to show",
  "settings.pin": "Pin",
  "settings.pinned": "Pinned",
  "settings.pinTitle": "Show directly at the top level of the session menu",
  "settings.conflict": "Provided by dsh-session-menu; disabled automatically",
  "settings.conflictNote": "dsh-session-menu detected: duplicated entries are hidden automatically.",
  "settings.childLocked": 'Enable "{name}" first',
  "settings.appsLoading": "Loading applications…",
  "settings.appsUnavailable": "The host exposed no external applications",
  "settings.appsError": "Could not load the application list, please retry",
  "settings.appsAllOff": "Every application is hidden by the switches above",
  "settings.expand": "Show applications",
  "settings.collapse": "Hide applications",
  "settings.ellipsisTitle": "Menu placement",
  "settings.ellipsisHint": 'Each entry can appear in the right-click menu, the "…" menu, or both. At least one side stays enabled. The switches above still decide whether the entry itself is on.',
  "settings.placement.context": "Right-click",
  "settings.placement.ellipsis": '"…" menu',
  "settings.placement.locked": "Keep at least one side",
  "settings.ellipsisWorkspace": "Workspace rows",
  "settings.ellipsisSession": "Session rows",
  "settings.ellipsis.newSession.label": "New session",
  "settings.ellipsis.newSession.hint": 'Create a session for this workspace from the "…" menu.',
  "settings.ellipsis.permissionDefault.label": "Default permission for new sessions",
  "settings.ellipsis.permissionDefault.hint": 'Set the default permission for new sessions of this workspace from the "…" menu; only shown when the host exposes native permission presets.',
  "settings.ellipsis.showArchived.label": "Show archived sessions",
  "settings.ellipsis.showArchived.hint": `Show or hide this workspace's archived sessions from the "…" menu.`,
  "settings.ellipsis.openWith.label": "Open with",
  "settings.ellipsis.openWith.hint": 'Open the workspace or session directory with an external app from the "…" menu.',
  "settings.ellipsis.copyPath.label": "Copy workspace path",
  "settings.ellipsis.copyPath.hint": 'Copy the workspace directory path from the "…" menu.',
  "settings.ellipsis.openInTab.label": "Open in new tab",
  "settings.ellipsis.openInTab.hint": 'Open the workspace as a tab from the "…" menu.',
  "settings.ellipsis.deleteSessions.label": "Delete workspace and all sessions",
  "settings.ellipsis.deleteSessions.hint": 'Remove the workspace record and every session under it from the "…" menu.',
  "settings.ellipsis.sessionOpenWith.label": "Open with",
  "settings.ellipsis.sessionOpenWith.hint": 'Open the session directory with an external app from the "…" menu.',
  "settings.ellipsis.sessionDelete.label": "Delete session permanently",
  "settings.ellipsis.sessionDelete.hint": 'Permanently delete this session and its log from the "…" menu.',
  "settings.ellipsis.sessionDeleteArchived.label": "Delete all archived sessions",
  "settings.ellipsis.sessionDeleteArchived.hint": `Clean up every archived session from an archived row's "…" menu.`,
  "settings.blankMenuTitle": "Right-click in the conversation body",
  "settings.blankMenuNote": 'Right-click anywhere in the conversation body (blank space, thinking blocks or replies) to list the header toolbar buttons in their visual order. With dsh-sidebar-organizer installed the order follows its layout. Sections are separated by faint rules and "Open with" / "More actions" are collapsed like the workspace / session menus. Inputs, tool cards and the toolbar keep their own native menus.',
  "settings.blankMenu.enabled.label": "Enable conversation-body context menu",
  "settings.blankMenu.enabled.hint": "Right-click blank space, thinking blocks or replies in the conversation body to open a vertical menu mirroring the top-right toolbar. When no button can be found the native menu is left alone.",
  "settings.blankMenu.keepMoreLast.label": 'Pin "More" to the far right',
  "settings.blankMenu.keepMoreLast.hint": 'Always put the "More" style entry last, regardless of its current position in the toolbar.',
  "settings.blankMenu.showCostMeter.label": "Show top-left status widgets",
  "settings.blankMenu.showCostMeter.hint": "Also list the status widgets at the top-left of the session header (cost details, background job counter, …). Hidden as a whole by default; turn it on when you want them.",
  "delete.title": "Delete this session permanently?",
  "delete.description": 'The log of "{name}" will be removed from disk. This cannot be undone.',
  "delete.untitled": "Untitled session",
  "delete.archivedTitle": "Delete all archived sessions?",
  "delete.archivedDescription": "Permanently delete {n} archived sessions and their logs. This cannot be undone.",
  "delete.confirm": "Delete permanently",
  "delete.archivedConfirm": "Delete all",
  "delete.cancel": "Cancel",
  "delete.pending": "Deleting…",
  "delete.archivedPending": "Deleting the archived sessions…",
  "delete.archivedPartial": "Deleted {done}, failed {failed}.",
  "delete.failed": "Delete failed: {message}",
  "delete.unavailable": "The delete service is unavailable",
  "delete.done": "Session deleted",
  "delete.doneMany": "Deleted {n} sessions",
  "delete.alreadyGone": "The sessions were already gone",
  "delete.workspaceTitle": "Delete the workspace and all its sessions?",
  "delete.workspaceDescription": 'The workspace "{name}" and the logs of its {n} sessions will be permanently deleted; the directory itself is kept. This cannot be undone.',
  "delete.workspaceEmptyDescription": 'The workspace "{name}" has no sessions; only the workspace record will be deleted.',
  "delete.workspaceConfirm": "Delete all",
  "delete.workspacePending": "Deleting the workspace and sessions…",
  "delete.workspacePartial": "Deleted {done} sessions, failed {failed}; the workspace was kept.",
  "delete.workspaceDone": "Deleted the workspace and {n} sessions",
  "delete.workspaceEmptyDone": "Workspace deleted"
};

// src/client/platform.js
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var import_client = require("react-dom/client");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/runtime.js
function setEllipsisTrigger(button) {
  ellipsisTrigger = button;
}
function setRootCtx(ctx) {
  rootCtx = ctx;
}
function beginMenu(attr) {
  closeMenu();
  const host = document.createElement("div");
  host.setAttribute(MENU_ATTR, attr);
  host.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647";
  document.body.appendChild(host);
  menuHost = host;
  menuRoot = (0, import_client.createRoot)(host);
  return menuRoot;
}
var menuHost = null;
var menuRoot = null;
var ellipsisTrigger = null;
var rootCtx = null;
function unmountAt(host, root) {
  if (root !== null) {
    try {
      root.unmount();
    } catch (error) {
      console.warn("[dsh-sidebar-row-menu] unmount failed:", error);
    }
  }
  if (host !== null) host.remove();
}
function closeMenu() {
  const host = menuHost;
  const root = menuRoot;
  menuHost = null;
  menuRoot = null;
  ellipsisTrigger = null;
  unmountAt(host, root);
}
function serviceOf(ctx, name2) {
  try {
    const value = ctx.get?.(name2);
    if (value !== void 0 && value !== null) return value;
  } catch (error) {
    console.warn("[dsh-sidebar-row-menu] service lookup failed:", name2, error);
  }
  try {
    return ctx[name2] ?? null;
  } catch {
    return null;
  }
}
function localeOf(ctx) {
  try {
    if (typeof ctx?.locale?.bind === "function") return ctx.locale.bind(NS);
  } catch (error) {
    console.warn("[dsh-sidebar-row-menu] locale bind failed:", error);
  }
  return (key) => key;
}

// src/client/toast.js
var toastHost = null;
var toastRoot = null;
function closeToast() {
  const host = toastHost;
  const root = toastRoot;
  toastHost = null;
  toastRoot = null;
  if (root !== null) {
    try {
      root.unmount();
    } catch {
    }
  }
  if (host !== null) host.remove();
}
function toast(message, tone) {
  if (document.body === null) return;
  closeToast();
  const host = document.createElement("div");
  host.setAttribute(TOAST_ATTR, "");
  host.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none";
  document.body.appendChild(host);
  const root = (0, import_client.createRoot)(host);
  toastHost = host;
  toastRoot = root;
  const props = {
    text: message,
    onDone: () => window.setTimeout(closeToast, 0)
  };
  if (tone === "success") props.tone = "success";
  if (tone === "warning") {
    props.tone = "warning";
    props.icon = (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconWarningOutlineRegular, {});
  }
  root.render((0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Toast, props));
}

// src/client/styles.js
var STYLE = `
.dsrm-submenu-host{position:relative;display:flex;align-items:center;width:100%}
.dsrm-submenu-trigger{display:flex;align-items:center;gap:6px;width:100%;min-height:34px;padding:6px 8px;border:0;border-radius:var(--dsw-radius-md);background:none;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;text-align:left;cursor:pointer}
.dsrm-submenu-trigger:hover:not(:disabled),.dsrm-submenu-trigger:focus-visible{background:var(--dsw-alias-interactive-bg-hover);outline:none}
.dsrm-submenu-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsrm-submenu-chevron{color:var(--dsw-alias-label-caption)}
.dsrm-submenu-chevron-flipped{transform:scaleX(-1)}
.dsrm-host-label{display:flex;align-items:center;gap:6px;width:100%}
/* 宿主 0.2.2-rc.2 起会在菜单项尾部自带一个箭头（button 的直接子 svg）；更早的宿主不画，
   插件 label 里的箭头负责兜底。检测到宿主箭头时隐藏插件箭头，避免出现两个 >。 */
button[aria-haspopup="menu"]:not(.dsrm-submenu-trigger):has(> svg) .dsrm-submenu-chevron{display:none}
/* 0.2.2-rc.2 起会话行菜单由宿主提供，原生「在应用中打开」与插件的「打开方式」重复。
   宿主不把贡献 id 暴露到 DOM；原生项稳定可辨的特征是 contextMenu.icon 槽里的
   dsw-icon-right-up-outline-regular（open-in-app 的图标）。插件在自己的打开方式 label
   上带 dsrm-native-dedupe，下面的规则只命中“占用该图标槽且不是插件贡献”的子菜单项，
   不会连带隐藏其他插件的图标/子菜单。rc.1 及更早的面板没有该标记，规则不生效。 */
[role="menu"]:has(.dsrm-native-dedupe) button[role="menuitem"][aria-haspopup="menu"]:has([data-slot="contextMenu.icon"] svg[data-icon="dsw-icon-right-up-outline-regular"]):not(:has(.dsrm-native-dedupe)){display:none}
.dsrm-host-label-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.dsrm-check{margin-left:auto;flex:none;color:var(--dsw-alias-label-primary)}
.dsrm-submenu{position:fixed;z-index:1101;min-width:180px;max-width:300px;max-height:min(380px,64vh);overflow:auto;padding:4px}
.dsrm-submenu-empty{padding:6px 8px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.dsrm-menu{position:fixed;z-index:2147483647}
.dsrm-menu-surface{box-sizing:border-box;min-width:144px;padding:4px}
.dsrm-header-menu{max-height:min(70vh,520px);overflow:auto}
.dsrm-header-icon{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;color:inherit}
.dsrm-header-icon svg{width:14px;height:14px;display:block}
.dsrm-header-icon-img{width:14px;height:14px;border-radius:3px;display:block;object-fit:contain}
.dsrm-openwith{display:block}
.dsrm-openwith-note{padding:4px 12px 2px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsrm-sep{height:.5px;margin:3px 8px;background:var(--dsw-alias-border-l2)}
/* 150% 缩放等分数像素比下，宿主 0.5px 的分隔线会被摊成两行近乎透明，补到 1px 才看得见。 */
@media (min-resolution:1.2dppx) and (max-resolution:1.99dppx){[role="menu"] [role="separator"],.dsrm-sep{height:1px}}
.dsrm-app-icon{width:14px;height:14px;border-radius:3px;display:block;object-fit:contain}
.dsrm-settings{max-width:820px;margin:0 auto;padding:2px 0 36px}
.dsrm-settings-title{margin:0;font-size:16px;line-height:24px;font-weight:600}
.dsrm-settings-subtitle{margin-top:28px}
.dsrm-settings-groups{margin-top:10px;display:flex;flex-direction:column;gap:18px}
.dsrm-settings-group-title{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;font-weight:600;margin-bottom:2px}
.dsrm-settings-note{margin-top:8px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.dsrm-settings-list{margin-top:10px;display:flex;flex-direction:column}
.dsrm-settings-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:14px 0;border-top:.5px solid var(--dsw-alias-border-l2)}
.dsrm-settings-row:first-child{border-top:0}
.dsrm-settings-copy{display:flex;flex-direction:column;gap:4px;min-width:0}
.dsrm-settings-label{font-size:14px;line-height:20px}
.dsrm-settings-hint{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dsrm-settings-controls{display:flex;align-items:center;gap:10px}
.dsrm-placement-controls{gap:16px}
.dsrm-placement-choice{display:flex;align-items:center;gap:6px;white-space:nowrap}
.dsrm-placement-choice-label{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dsrm-settings-children{margin-left:12px;padding:0 0 12px 18px;border-left:1px solid var(--dsw-alias-border-l2)}
.dsrm-settings-child{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:6px 14px 6px 0}
.dsrm-settings-child-label{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:18px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsrm-settings-child-actions{display:flex;align-items:center;gap:10px;flex:none}
.dsrm-pin{border:.5px solid var(--dsw-alias-border-l2);border-radius:999px;background:none;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;padding:1px 8px;cursor:pointer}
.dsrm-pin:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsrm-pin:disabled{opacity:.45;cursor:default}
.dsrm-pin-on{border-color:var(--dsw-alias-label-primary);color:var(--dsw-alias-label-primary)}
.dsrm-settings-empty{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.dsrm-expander{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:0;border-radius:var(--dsw-radius-sm);background:none;color:var(--dsw-alias-label-caption);cursor:pointer}
.dsrm-expander:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dsrm-expander-icon{transition:transform .12s ease}
.dsrm-expander-open{transform:rotate(90deg)}
.dsrm-danger-label{color:var(--dsw-alias-label-danger,#d33)}
.dsrm-status-text{margin-top:8px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dsrm-error-text{margin-top:8px;color:var(--dsw-alias-label-danger,#d33);font-size:12px;line-height:18px;word-break:break-word}
`;
function installStyles() {
  if (document.head === null || document.head === void 0) return () => {
  };
  const style = document.createElement("style");
  style.setAttribute("data-dsh-sidebar-row-menu-style", "");
  style.textContent = STYLE;
  document.head.appendChild(style);
  return () => style.remove();
}

// src/client/features/archived.js
function readHiddenWorkspaces() {
  const hidden = /* @__PURE__ */ new Set();
  try {
    const raw = globalThis.localStorage?.getItem(ARCHIVED_HIDDEN_KEY);
    if (typeof raw !== "string" || raw === "") return hidden;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return hidden;
    for (const id of parsed) {
      if (typeof id === "string" && id !== "") hidden.add(id);
    }
  } catch {
  }
  return hidden;
}
var hiddenArchivedWorkspaces = readHiddenWorkspaces();
function persistHiddenWorkspaces() {
  try {
    globalThis.localStorage?.setItem(ARCHIVED_HIDDEN_KEY, JSON.stringify([...hiddenArchivedWorkspaces]));
  } catch {
  }
}
function readViewFilter() {
  try {
    const storage = globalThis.localStorage;
    if (storage === null || storage === void 0 || typeof storage.key !== "function") return "default";
    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (typeof key === "string" && key.startsWith("dsh.workspace.view.")) keys.push(key);
    }
    const versionOf = (key) => {
      const match = /\.v(\d+)$/.exec(key);
      return match === null ? -1 : Number(match[1]);
    };
    keys.sort((left, right) => versionOf(right) - versionOf(left));
    for (const key of keys) {
      const parsed = JSON.parse(storage.getItem(key) ?? "");
      if (parsed !== null && typeof parsed === "object" && typeof parsed.archivedFilter === "string") {
        return parsed.archivedFilter;
      }
    }
  } catch {
  }
  return "default";
}
function findArchivedViewActions() {
  if (typeof document === "undefined" || typeof document.querySelector !== "function") return null;
  const row = document.querySelector('[data-row-key^="session:"], [data-row-key^="workspace:"]');
  if (row === null || row === void 0) return null;
  const field = Object.keys(row).find((name2) => name2.startsWith("__reactFiber$"));
  let fiber = field === void 0 ? null : row[field];
  for (let depth = 0; depth < 48 && fiber !== null && fiber !== void 0; depth += 1) {
    const actions = fiber.memoizedProps?.actions;
    if (actions !== null && typeof actions === "object" && typeof actions.setArchivedFilter === "function") {
      return actions;
    }
    fiber = fiber.return;
  }
  return null;
}
var lastViewFilter = readViewFilter();
function writeViewFilter(filter) {
  const actions = findArchivedViewActions();
  if (actions === null) return false;
  try {
    actions.setArchivedFilter(filter);
    lastViewFilter = filter;
    return true;
  } catch (error) {
    console.warn("[dsh-sidebar-row-menu] archived filter change failed:", error);
    return false;
  }
}
function archivedWorkspaceIndex() {
  const snapshot = serviceOf(rootCtx, "workspaces")?.list?.getSnapshot?.();
  const archived = new Set(Array.isArray(snapshot?.archivedSessionIds) ? snapshot.archivedSessionIds : []);
  const owner = /* @__PURE__ */ new Map();
  for (const item of Array.isArray(snapshot?.items) ? snapshot.items : []) {
    const workspaceId = typeof item?.workspaceId === "string" ? item.workspaceId : "";
    if (workspaceId === "" || !Array.isArray(item?.sessionIds)) continue;
    for (const sessionId of item.sessionIds) {
      if (typeof sessionId === "string" && sessionId !== "") owner.set(sessionId, workspaceId);
    }
  }
  return { archived, owner };
}
function archivedCountOfWorkspace(workspaceId) {
  const { archived } = archivedWorkspaceIndex();
  let count = 0;
  for (const sessionId of workspaceSessionIds(workspaceId)) {
    if (archived.has(sessionId)) count += 1;
  }
  return count;
}
var UNGROUPED_OWNER = "";
function archivedHolders() {
  const { archived, owner } = archivedWorkspaceIndex();
  const holders = /* @__PURE__ */ new Set();
  for (const sessionId of archived) holders.add(owner.get(sessionId) ?? UNGROUPED_OWNER);
  return holders;
}
function archivedRowsVisibleIn(workspaceId) {
  return readViewFilter() !== "default" && !hiddenArchivedWorkspaces.has(workspaceId);
}
function toggleWorkspaceArchived(workspaceId) {
  if (workspaceId === "") return;
  const filter = readViewFilter();
  const visible = filter !== "default" && !hiddenArchivedWorkspaces.has(workspaceId);
  if (visible) {
    hiddenArchivedWorkspaces.add(workspaceId);
  } else {
    hiddenArchivedWorkspaces.delete(workspaceId);
    if (filter === "default") {
      for (const holder of archivedHolders()) {
        if (holder !== workspaceId) hiddenArchivedWorkspaces.add(holder);
      }
    }
  }
  const holders = archivedHolders();
  for (const id of [...hiddenArchivedWorkspaces]) {
    if (!holders.has(id)) hiddenArchivedWorkspaces.delete(id);
  }
  persistHiddenWorkspaces();
  if (!visible) {
    if (filter === "default") writeViewFilter("show");
  } else if (filter === "show") {
    if (holders.size > 0 && [...holders].every((id) => hiddenArchivedWorkspaces.has(id))) {
      hiddenArchivedWorkspaces = /* @__PURE__ */ new Set();
      persistHiddenWorkspaces();
      writeViewFilter("default");
    }
  }
  scheduleArchivedRows();
}
var ARCHIVED_ROW_ATTR = "data-dsrm-archived-hidden";
function applyArchivedRows() {
  if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") return;
  syncViewFilter();
  const filter = readViewFilter();
  const active = (filter === "show" || filter === "only") && hiddenArchivedWorkspaces.size > 0;
  const { archived, owner } = active ? archivedWorkspaceIndex() : { archived: /* @__PURE__ */ new Set(), owner: /* @__PURE__ */ new Map() };
  for (const row of document.querySelectorAll('[data-row-key^="session:"]')) {
    const sessionId = row.getAttribute("data-row-key").slice("session:".length);
    const bucket = owner.get(sessionId) ?? UNGROUPED_OWNER;
    const hide = active && archived.has(sessionId) && hiddenArchivedWorkspaces.has(bucket);
    if (hide) {
      if (row.style.display !== "none") {
        row.setAttribute(ARCHIVED_ROW_ATTR, "1");
        row.style.display = "none";
      }
    } else if (row.getAttribute(ARCHIVED_ROW_ATTR) === "1") {
      row.removeAttribute(ARCHIVED_ROW_ATTR);
      row.style.display = "";
    }
  }
}
function syncViewFilter() {
  const current = readViewFilter();
  if (current === lastViewFilter) return;
  lastViewFilter = current;
  hiddenArchivedWorkspaces = /* @__PURE__ */ new Set();
  persistHiddenWorkspaces();
}
var archivedApplyTimer = 0;
var archivedObserver = null;
function scheduleArchivedRows() {
  if (typeof setTimeout !== "function") {
    applyArchivedRows();
    return;
  }
  if (archivedApplyTimer !== 0) return;
  archivedApplyTimer = setTimeout(() => {
    archivedApplyTimer = 0;
    applyArchivedRows();
  }, 40);
}
function archivedRowMutation(records) {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node.nodeType === 1 && (node.matches?.("[data-row-key]") || node.querySelector?.("[data-row-key]"))) {
        return true;
      }
    }
    for (const node of record.removedNodes) {
      if (node.nodeType === 1 && (node.matches?.("[data-row-key]") || node.querySelector?.("[data-row-key]"))) {
        return true;
      }
    }
  }
  return false;
}
function startArchivedRows() {
  scheduleArchivedRows();
  if (typeof MutationObserver !== "function") return () => {
  };
  if (typeof document === "undefined" || document.body === null || document.body === void 0) return () => {
  };
  archivedObserver = new MutationObserver((records) => {
    if (archivedRowMutation(records)) scheduleArchivedRows();
  });
  archivedObserver.observe(document.body, { childList: true, subtree: true });
  return () => {
    archivedObserver?.disconnect();
    archivedObserver = null;
    if (archivedApplyTimer !== 0 && typeof clearTimeout === "function") {
      clearTimeout(archivedApplyTimer);
      archivedApplyTimer = 0;
    }
    if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") return;
    for (const row of document.querySelectorAll(`[${ARCHIVED_ROW_ATTR}="1"]`)) {
      row.removeAttribute(ARCHIVED_ROW_ATTR);
      row.style.display = "";
    }
  };
}
function workspaceSessionIds(workspaceId) {
  const snapshot = serviceOf(rootCtx, "workspaces")?.list?.getSnapshot?.();
  const entry = Array.isArray(snapshot?.items) ? snapshot.items.find((candidate) => candidate?.workspaceId === workspaceId) : void 0;
  return Array.isArray(entry?.sessionIds) ? entry.sessionIds.filter((id) => typeof id === "string" && id !== "") : [];
}

// src/client/apps-catalog.js
var APP_NAMES = {
  vscode: ["Visual Studio Code", "Visual Studio Code"],
  vscodeinsiders: ["VS Code Insiders", "VS Code Insiders"],
  cursor: ["Cursor", "Cursor"],
  windsurf: ["Windsurf", "Windsurf"],
  zed: ["Zed", "Zed"],
  sublimetext: ["Sublime Text", "Sublime Text"],
  xcode: ["Xcode", "Xcode"],
  androidstudio: ["Android Studio", "Android Studio"],
  intellij: ["IntelliJ IDEA", "IntelliJ IDEA"],
  pycharm: ["PyCharm", "PyCharm"],
  webstorm: ["WebStorm", "WebStorm"],
  phpstorm: ["PhpStorm", "PhpStorm"],
  goland: ["GoLand", "GoLand"],
  rider: ["Rider", "Rider"],
  rustrover: ["RustRover", "RustRover"],
  fork: ["Fork", "Fork"],
  sourcetree: ["Sourcetree", "Sourcetree"],
  github: ["GitHub Desktop", "GitHub Desktop"],
  tower: ["Tower", "Tower"],
  gitkraken: ["GitKraken", "GitKraken"],
  smartgit: ["SmartGit", "SmartGit"],
  sublimemerge: ["Sublime Merge", "Sublime Merge"],
  ghostty: ["Ghostty", "Ghostty"],
  warp: ["Warp", "Warp"],
  iterm: ["iTerm", "iTerm"],
  kitty: ["kitty", "kitty"],
  terminal: ["终端", "Terminal"],
  windowsterminal: ["Windows Terminal", "Windows Terminal"],
  gitbash: ["Git Bash", "Git Bash"],
  gnometerminal: ["终端", "Terminal"],
  konsole: ["Konsole", "Konsole"],
  finder: ["访达", "Finder"],
  explorer: ["文件资源管理器", "File Explorer"],
  filemanager: ["文件管理器", "Files"]
};
for (const [id, names] of Object.entries(APP_NAMES)) {
  zh[`app.${id}`] = names[0];
  en[`app.${id}`] = names[1];
}
function appLabel(appId, t) {
  const key = `app.${appId}`;
  const value = t(key);
  return value === key ? appId : value;
}
function appIcon(appId) {
  return (0, import_jsx_runtime.jsx)("img", {
    className: "dsrm-app-icon",
    src: ICON_ROUTE + encodeURIComponent(appId),
    alt: "",
    onError: (event) => {
      event.currentTarget.style.visibility = "hidden";
    }
  });
}

// src/client/host-version.js
var NATIVE_SESSION_MENU_SINCE = "0.2.2-rc.2";
function readHostVersion() {
  try {
    const version = window?.__DSH_BOOT__?.release?.version;
    return typeof version === "string" ? version : "";
  } catch {
    return "";
  }
}
function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(value ?? "").trim());
  if (match === null) return null;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    pre: match[4] === void 0 ? [] : match[4].split(".")
  };
}
function comparePre(a, b) {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return -1;
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const left = a[index];
    const right = b[index];
    const leftNumber = /^\d+$/.test(left) ? Number(left) : null;
    const rightNumber = /^\d+$/.test(right) ? Number(right) : null;
    if (leftNumber !== null && rightNumber !== null) {
      if (leftNumber !== rightNumber) return leftNumber < rightNumber ? -1 : 1;
    } else if (leftNumber !== null) {
      return -1;
    } else if (rightNumber !== null) {
      return 1;
    } else if (left !== right) {
      return left < right ? -1 : 1;
    }
  }
  if (a.length === b.length) return 0;
  return a.length < b.length ? -1 : 1;
}
function versionAtLeast(value, target) {
  const have = parseVersion(value);
  const want = parseVersion(target);
  if (have === null || want === null) return null;
  for (let index = 0; index < 3; index += 1) {
    if (have.core[index] !== want.core[index]) return have.core[index] > want.core[index];
  }
  return comparePre(have.pre, want.pre) >= 0;
}
function hasNativeSessionMenu(version = readHostVersion()) {
  const supported = versionAtLeast(version, NATIVE_SESSION_MENU_SINCE);
  return supported === null ? false : supported;
}

// src/client/host-api.js
async function copyText(text, t) {
  try {
    const ok = await (0, import_dsh_client_ui_primitives.writeClipboard)(text);
    toast(ok ? t("copied") : t("copyFailed"), ok ? "success" : "warning");
  } catch (error) {
    console.warn("[dsh-sidebar-row-menu] clipboard failed:", error);
    toast(t("copyFailed"), "warning");
  }
}
function workspaceCwd(ctx, group) {
  if (typeof group?.cwd === "string" && group.cwd !== "") return group.cwd;
  const workspaces = serviceOf(ctx, "workspaces");
  const items = workspaces?.list?.getSnapshot?.()?.items;
  if (!Array.isArray(items)) return "";
  const item = items.find((candidate) => candidate.workspaceId === group?.workspaceId);
  return typeof item?.path === "string" ? item.path : "";
}
function sessionCwd(ctx, sessionId) {
  const sessions = serviceOf(ctx, "sessions");
  const session = sessions?.list?.getSnapshot?.()?.byId?.[sessionId];
  if (typeof session?.cwd === "string" && session.cwd !== "") return session.cwd;
  const workspaces = serviceOf(ctx, "workspaces");
  const items = workspaces?.list?.getSnapshot?.()?.items;
  if (!Array.isArray(items)) return "";
  const item = items.find((candidate) => Array.isArray(candidate.sessionIds) && candidate.sessionIds.includes(sessionId));
  return typeof item?.path === "string" ? item.path : "";
}

// src/client/lib/create-store.js
function createStore(initial, options = {}) {
  let state = typeof initial === "function" ? initial() : initial;
  const listeners2 = /* @__PURE__ */ new Set();
  function snapshot() {
    return state;
  }
  function publish2(next) {
    if (next !== void 0) state = next;
    for (const listener of listeners2) {
      try {
        listener();
      } catch {
      }
    }
  }
  function subscribe(listener) {
    listeners2.add(listener);
    return () => {
      listeners2.delete(listener);
    };
  }
  function useValue() {
    return (0, import_react.useSyncExternalStore)(subscribe, snapshot, snapshot);
  }
  function set(next) {
    state = typeof next === "function" ? next(state) : next;
    try {
      options.persist?.(state);
    } catch {
    }
    publish2();
    return state;
  }
  return { listeners: listeners2, publish: publish2, set, snapshot, subscribe, useValue };
}
function readStoredJson(key) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (typeof raw !== "string" || raw === "") return void 0;
    return JSON.parse(raw);
  } catch {
    return void 0;
  }
}
function writeStoredJson(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
  }
}
function readBooleanRecord(key, keys, defaults) {
  const result = { ...defaults };
  const parsed = readStoredJson(key);
  if (parsed === null || typeof parsed !== "object") return result;
  for (const name2 of keys) {
    if (typeof parsed[name2] === "boolean") result[name2] = parsed[name2];
  }
  return result;
}

// src/client/store/blank-menu.js
function readStoredBlankMenu() {
  return readBooleanRecord(BLANK_MENU_KEY, BLANK_MENU_KEYS, BLANK_MENU_DEFAULTS);
}
var blankMenuStore = createStore(readStoredBlankMenu, {
  persist: (state) => writeStoredJson(BLANK_MENU_KEY, state)
});
function subscribeBlankMenu(listener) {
  return blankMenuStore.subscribe(listener);
}
function blankMenuSnapshot() {
  return blankMenuStore.snapshot();
}
function useBlankMenu() {
  return blankMenuStore.useValue();
}
function setBlankMenu(key, enabled) {
  if (!BLANK_MENU_KEYS.includes(key)) return;
  blankMenuStore.set((state) => ({ ...state, [key]: enabled === true }));
}
function blankOption(key) {
  const value = blankMenuStore.snapshot()[key];
  if (typeof value === "boolean") return value;
  return BLANK_MENU_DEFAULTS[key] !== false;
}

// src/client/store/children.js
function readStoredChildren() {
  const parsed = readStoredJson(OPEN_WITH_CHILDREN_KEY);
  return parsed !== null && typeof parsed === "object" ? parsed : {};
}
var childStore = createStore(readStoredChildren, {
  persist: (state) => writeStoredJson(OPEN_WITH_CHILDREN_KEY, state)
});
function subscribeChildren(listener) {
  return childStore.subscribe(listener);
}
function childrenSnapshot() {
  return childStore.snapshot();
}
function useChildren() {
  return childStore.useValue();
}
function setChild(appId, enabled) {
  childStore.set((state) => ({ ...state, [appId]: enabled === true }));
}
function childOn(appId) {
  return childStore.snapshot()[appId] !== false;
}

// src/client/store/items.js
function readStoredItems() {
  return readBooleanRecord(ITEMS_KEY, ITEM_KEYS, ITEM_DEFAULTS);
}
var itemStore = createStore(readStoredItems, {
  persist: (state) => writeStoredJson(ITEMS_KEY, state)
});
function subscribeItems(listener) {
  return itemStore.subscribe(listener);
}
function itemsSnapshot() {
  return itemStore.snapshot();
}
function useItems() {
  return itemStore.useValue();
}
function setItem(key, enabled) {
  if (!ITEM_KEYS.includes(key)) return;
  itemStore.set((state) => ({ ...state, [key]: enabled === true }));
}
function itemOn(key) {
  const state = itemStore.snapshot();
  return state[key] ?? ITEM_DEFAULTS[key] ?? false;
}

// src/client/store/pinned.js
function readStoredPinned() {
  const parsed = readStoredJson(OPEN_WITH_PINNED_KEY);
  if (!Array.isArray(parsed)) return null;
  return parsed.filter((id) => typeof id === "string" && id !== "");
}
var pinnedStore = createStore(readStoredPinned, {
  persist: (state) => writeStoredJson(OPEN_WITH_PINNED_KEY, state)
});
function subscribePinned(listener) {
  return pinnedStore.subscribe(listener);
}
function pinnedSnapshot() {
  return pinnedStore.snapshot();
}
function usePinned() {
  return pinnedStore.useValue();
}
function effectivePinned(ids) {
  const pinned = pinnedStore.snapshot();
  if (pinned !== null) return pinned.filter((id) => ids.includes(id));
  const preferred = ids.find((id) => PIN_PREFERENCE.includes(id));
  if (preferred !== void 0) return [preferred];
  return ids.slice(0, 1);
}
function setPinned(ids) {
  pinnedStore.set([...new Set(ids.filter((id) => typeof id === "string" && id !== ""))]);
}
function togglePinned(appId, ids) {
  const current = effectivePinned(ids);
  setPinned(current.includes(appId) ? current.filter((id) => id !== appId) : [...current, appId]);
}

// src/client/store/apps.js
var appsStore = createStore({ status: "idle", ids: [], at: 0 });
function publishApps(next) {
  appsStore.publish(next);
}
function subscribeApps(listener) {
  return appsStore.subscribe(listener);
}
function appsSnapshot() {
  return appsStore.snapshot();
}
function useApps() {
  return appsStore.useValue();
}
function ensureApps() {
  const state = appsStore.snapshot();
  if (typeof fetch !== "function") {
    if (state.status !== "error") {
      publishApps({ status: "error", ids: state.ids, at: Date.now() });
    }
    return;
  }
  const now = Date.now();
  if (state.status === "loading") return;
  if (state.status === "ready" && now - state.at < 6e4) return;
  if (state.status === "error" && now - state.at < 1e4) return;
  const previous = state.ids;
  publishApps({ status: "loading", ids: previous, at: now });
  fetch(APPS_ROUTE, { headers: { accept: "application/json" } }).then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }).then((payload) => {
    const ids = Array.isArray(payload?.apps) ? payload.apps.filter((id) => typeof id === "string" && id !== "") : [];
    publishApps({ status: "ready", ids: [...new Set(ids)], at: Date.now() });
  }).catch(() => publishApps({ status: "error", ids: previous, at: Date.now() }));
}
function openApplication(appId, path) {
  if (typeof path !== "string" || path === "") return Promise.resolve(false);
  if (typeof fetch !== "function") return Promise.resolve(false);
  return fetch(OPEN_ROUTE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ app: appId, path })
  }).then(
    (response) => response.ok,
    () => false
  );
}

// src/client/features/context-menu-shared.js
function contextMenusOf(ctx) {
  const usable = (menus2) => menus2 !== null && menus2 !== void 0 && typeof menus2.register === "function" ? menus2 : null;
  try {
    const viaGet = usable(ctx?.get?.("contextMenus"));
    if (viaGet !== null) return viaGet;
  } catch {
  }
  try {
    return usable(ctx?.contextMenus);
  } catch {
  }
  return null;
}
var appsSource = {
  getSnapshot: appsSnapshot,
  subscribe: (listener) => subscribeApps(listener)
};
function ContextMenuAppIcon({ icon }) {
  const src = typeof icon?.src === "string" ? icon.src : "";
  if (src === "") return null;
  return (0, import_jsx_runtime.jsx)("img", {
    className: "dsrm-app-icon",
    src,
    alt: "",
    onError: (event) => {
      event.currentTarget.style.visibility = "hidden";
    }
  });
}

// src/client/dom.js
function fiberOf(node) {
  if (node === null || typeof node !== "object") return null;
  for (const key of Object.keys(node)) {
    if (key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$")) return node[key];
  }
  return null;
}
function resolveWorkspaceRow(target) {
  const fiber = fiberOf(target);
  if (fiber === null) return null;
  let current = fiber;
  let hops = 0;
  while (current !== null && current !== void 0 && hops < 60) {
    const props = current.memoizedProps;
    if (props !== null && typeof props === "object" && props.group !== void 0 && props.actions !== void 0 && typeof props.actions.rename === "function" && typeof props.actions.delete === "function" && typeof props.group.workspaceId === "string") {
      return props;
    }
    current = current.return;
    hops += 1;
  }
  return null;
}
function resolveSessionRow(target) {
  const fiber = fiberOf(target);
  if (fiber === null) return null;
  let current = fiber;
  let hops = 0;
  while (current !== null && current !== void 0 && hops < 60) {
    const props = current.memoizedProps;
    if (props !== null && typeof props === "object" && props.node !== null && typeof props.node === "object" && String(props.node.id ?? "") !== "" && typeof props.node.blank === "boolean" && (typeof props.onOpen === "function" || typeof props.onRenameRequest === "function")) {
      if (props.node.blank === true) return null;
      return props;
    }
    current = current.return;
    hops += 1;
  }
  return null;
}

// src/client/features/file-open.js
var CACHE_TTL = 5 * 60 * 1e3;
var REFRESH_AFTER = 60 * 1e3;
var NEGATIVE_TTL = 3 * 1e3;
var CACHE_MAX = 64;
var LEGACY_WAIT_MS = 700;
var cache = /* @__PURE__ */ new Map();
var inflight = /* @__PURE__ */ new Map();
var listeners = /* @__PURE__ */ new Set();
var revision = 0;
var desktop = null;
var desktopProbe = null;
function remoteSession() {
  try {
    const session = rootCtx?.get?.("remote")?.session;
    if (session === void 0 || session === null) return null;
    return typeof session.openWorkspacePath === "function" ? session : null;
  } catch {
    return null;
  }
}
function associationKey(path) {
  const name2 = path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
  const dot = name2.lastIndexOf(".");
  return dot > 0 && dot < name2.length - 1 ? `extension:${name2.slice(dot).toLowerCase()}` : `path:${path}`;
}
function classRepresentatives(list) {
  const classes = /* @__PURE__ */ new Map();
  for (const path of list) {
    const key = associationKey(path);
    if (!classes.has(key)) classes.set(key, path);
  }
  return classes;
}
function applicationRows(result) {
  if (Array.isArray(result)) return result;
  if (result !== null && typeof result === "object" && result.ok === true) {
    return Array.isArray(result.value) ? result.value : null;
  }
  return null;
}
function pathActionSucceeded(result) {
  if (result === true) return true;
  if (result === null || typeof result !== "object") return false;
  if (result.ok === false) return false;
  if (result.ok === true) return true;
  return result.opened === true || result.value !== void 0;
}
function desktopAvailable(result) {
  if (typeof result === "boolean") return result;
  if (result === null || typeof result !== "object" || result.ok === false) return false;
  return result.value === true || result.opened === true;
}
function probeDesktop() {
  if (desktop !== null) return Promise.resolve(desktop);
  const remote = remoteSession();
  if (remote === null || typeof remote.canOpenWorkspacePath !== "function") {
    desktop = false;
    return Promise.resolve(false);
  }
  if (desktopProbe === null) {
    desktopProbe = Promise.resolve().then(() => remote.canOpenWorkspacePath()).then((result) => {
      desktop = desktopAvailable(result);
      return desktop;
    }).catch(() => {
      desktop = null;
      return false;
    }).finally(() => {
      desktopProbe = null;
    });
  }
  return desktopProbe;
}
function mergeHandlers(lists) {
  const order = [];
  const byId = /* @__PURE__ */ new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (entry === null || typeof entry !== "object") continue;
      const id = typeof entry.id === "string" ? entry.id : "";
      if (id === "") continue;
      const previous = byId.get(id);
      if (previous === void 0) {
        byId.set(id, {
          id,
          name: typeof entry.name === "string" ? entry.name : "",
          icon: typeof entry.icon === "string" ? entry.icon : "",
          default: entry.default === true
        });
        order.push(id);
        continue;
      }
      if (!previous.default && entry.default === true) previous.default = true;
      if (previous.name === "" && typeof entry.name === "string") previous.name = entry.name;
      if (previous.icon === "" && typeof entry.icon === "string") previous.icon = entry.icon;
    }
  }
  return order.map((id) => byId.get(id));
}
function normalList(paths) {
  return Array.isArray(paths) ? paths.filter((path) => typeof path === "string" && path !== "") : [];
}
function ttlOf(hit) {
  return hit.apps === null ? NEGATIVE_TTL : CACHE_TTL;
}
function touch(key, hit) {
  cache.delete(key);
  cache.set(key, hit);
}
function remember(key, apps) {
  cache.set(key, { at: Date.now(), apps });
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
}
function publish() {
  revision += 1;
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error) {
      console.warn("[dsh-sidebar-row-menu] file app listener failed:", error);
    }
  }
}
function fileApplicationsRevision() {
  return revision;
}
function subscribeFileApplications(listener) {
  if (typeof listener !== "function") return () => {
  };
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function mergeAnswers(answers) {
  const usable = answers.filter((value) => value !== void 0);
  if (usable.length === 0) return null;
  if (usable.every((value) => value === null)) return null;
  return mergeHandlers(usable);
}
function peekFileApplications(paths) {
  const list = normalList(paths);
  if (list.length === 0) return { apps: [], stale: false };
  const classes = classRepresentatives(list);
  const answers = [];
  let stale = false;
  for (const key of classes.keys()) {
    const hit = cache.get(key);
    if (hit === void 0) return void 0;
    const age = Date.now() - hit.at;
    if (age > ttlOf(hit)) {
      cache.delete(key);
      return void 0;
    }
    touch(key, hit);
    if (age > REFRESH_AFTER) stale = true;
    answers.push(hit.apps);
  }
  return { apps: mergeAnswers(answers), stale };
}
async function loadFileClass(key, path, signal) {
  if (signal?.aborted) return null;
  const remote = remoteSession();
  if (remote === null || typeof remote.workspacePathApplications !== "function") {
    remember(key, null);
    publish();
    return null;
  }
  try {
    const result = await remote.workspacePathApplications({ path }, signal);
    if (signal?.aborted) return null;
    const rows = applicationRows(result);
    if (rows === null) {
      remember(key, null);
      publish();
      return null;
    }
    const apps = mergeHandlers([rows]);
    remember(key, apps);
    publish();
    return apps;
  } catch {
    if (signal?.aborted) return null;
    remember(key, null);
    publish();
    return null;
  }
}
async function refreshFileApplications(paths, signal) {
  const list = normalList(paths);
  if (list.length === 0) return [];
  const classes = classRepresentatives(list);
  const tasks = [];
  for (const [key, path] of classes) {
    const hit = cache.get(key);
    const age = hit === void 0 ? Infinity : Date.now() - hit.at;
    if (hit !== void 0 && age <= ttlOf(hit) && age <= REFRESH_AFTER) {
      touch(key, hit);
      tasks.push(Promise.resolve(hit.apps));
      continue;
    }
    const pending = inflight.get(key);
    if (pending !== void 0) {
      tasks.push(pending);
      continue;
    }
    const task = loadFileClass(key, path, signal).finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, task);
    tasks.push(task);
  }
  return mergeAnswers(await Promise.all(tasks));
}
function waitAtMost(promise, ms, fallback) {
  let timer = 0;
  const deadline = new Promise((resolve) => {
    if (typeof window === "undefined" || typeof window.setTimeout !== "function") {
      resolve(fallback);
      return;
    }
    timer = window.setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (timer !== 0 && typeof window !== "undefined" && typeof window.clearTimeout === "function") {
      window.clearTimeout(timer);
    }
  });
}
async function fileApplications(paths, signal) {
  const list = normalList(paths);
  if (list.length === 0) return [];
  const snapshot = peekFileApplications(list);
  if (snapshot !== void 0 && !snapshot.stale) return snapshot.apps;
  const pending = refreshFileApplications(list);
  const result = await waitAtMost(pending, LEGACY_WAIT_MS, void 0);
  if (result !== void 0) return result;
  return snapshot === void 0 ? null : snapshot.apps;
}
function desktopReady() {
  return probeDesktop();
}
async function openFilesWith(paths, application) {
  const list = normalList(paths);
  if (list.length === 0) return false;
  const remote = remoteSession();
  if (remote === null) return false;
  const results = await Promise.all(list.map(async (path) => {
    try {
      const request = typeof application === "string" && application !== "" ? { path, application } : { path };
      const result = await remote.openWorkspacePath(request);
      return pathActionSucceeded(result);
    } catch {
      return false;
    }
  }));
  return results.every((ok) => ok === true);
}
function openFilesDefault(paths) {
  return openFilesWith(paths);
}
async function revealFiles(paths) {
  const list = normalList(paths);
  if (list.length === 0) return false;
  const remote = remoteSession();
  if (remote === null) return false;
  const results = await Promise.all(list.map(async (path) => {
    try {
      const result = await remote.openWorkspacePath({ path, action: "reveal" });
      return pathActionSucceeded(result);
    } catch {
      return false;
    }
  }));
  return results.every((ok) => ok === true);
}

// src/client/ui/jsx.js
function h(type, props, ...children) {
  if (children.length === 0) return (0, import_jsx_runtime.jsx)(type, props);
  return (0, import_jsx_runtime.jsx)(type, { ...props, children: children.length === 1 ? children[0] : children });
}

// src/client/features/app-actions.js
function openAppAt(appId, cwd, t) {
  if (cwd === "") {
    toast(t("noPath"));
    return;
  }
  openApplication(appId, cwd).then((ok) => {
    if (!ok) toast(t("openFailed"));
  });
}
function permissionCheck() {
  return h("svg", {
    className: "dsrm-check",
    width: 14,
    height: 14,
    viewBox: "0 0 16 16",
    "aria-hidden": "true"
  }, h("path", {
    d: "M3.2 8.4 6.3 11.5 12.8 5",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 1.7,
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }));
}
var ContextMenuPermissionIcon = () => h(
  "svg",
  {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    "aria-hidden": "true",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 1.4
  },
  h("rect", { x: 3.2, y: 7, width: 9.6, height: 6.6, rx: 1.6 }),
  h("path", { d: "M5.4 7V5.4a2.6 2.6 0 0 1 5.2 0V7" })
);

// src/client/slot-ownership.js
function slotItemId(entry) {
  const value = entry?.options?.id ?? entry?.id ?? entry?.entry?.id;
  return typeof value === "string" ? value : "";
}
function foreignItemIds() {
  const slots = rootCtx?.slots;
  const ids = /* @__PURE__ */ new Set();
  if (slots === null || slots === void 0 || typeof slots.entriesOfSlot !== "function") return ids;
  try {
    const entries = slots.entriesOfSlot(SESSION_MENU_SLOT);
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        const id = slotItemId(entry);
        if (id !== "") ids.add(id);
      }
    }
  } catch (error) {
    console.warn("[dsh-sidebar-row-menu] slot lookup failed:", error);
  }
  return ids;
}
function takenOver(key) {
  const id = FOREIGN_ITEMS[key];
  return typeof id === "string" && foreignItemIds().has(id);
}

// src/client/store/archived.js
var EMPTY_IDS = /* @__PURE__ */ new Set();
var archivedCache = { snapshot: void 0, ids: EMPTY_IDS };
function archivedStore() {
  return serviceOf(rootCtx, "workspaces")?.list ?? null;
}
function archivedSnapshot() {
  const store = archivedStore();
  const snapshot = store?.getSnapshot?.();
  if (snapshot === null || snapshot === void 0) return EMPTY_IDS;
  if (archivedCache.snapshot === snapshot) return archivedCache.ids;
  const raw = Array.isArray(snapshot.archivedSessionIds) ? snapshot.archivedSessionIds : [];
  archivedCache = {
    snapshot,
    ids: new Set(raw.filter((id) => typeof id === "string" && id !== ""))
  };
  return archivedCache.ids;
}
function subscribeArchived(listener) {
  const store = archivedStore();
  return typeof store?.subscribe === "function" ? store.subscribe(listener) : () => {
  };
}
function useArchivedIds() {
  return (0, import_react.useSyncExternalStore)(subscribeArchived, archivedSnapshot, archivedSnapshot);
}
function isMainSession(id) {
  const snapshot = serviceOf(rootCtx, "sessions")?.list?.getSnapshot?.();
  const byId = snapshot?.byId;
  if (byId === null || typeof byId !== "object") return false;
  for (const row of Object.values(byId)) {
    if (row?.id === id && (row?.retainedBy?.mainView ?? 0) > 0) return true;
  }
  return false;
}

// src/client/store/delete-request.js
var deleteStore = createStore(null);
var deleteSeq = 0;
function useDeleteRequest() {
  return deleteStore.useValue();
}
function requestDelete(request) {
  deleteSeq += 1;
  deleteStore.publish({ ...request, seq: deleteSeq });
}
function closeDelete() {
  if (deleteStore.snapshot() === null) return;
  deleteStore.publish(null);
}
function postDeleteBatch(ids) {
  if (typeof fetch !== "function") return Promise.resolve({ ok: false, deleted: 0, failed: ids.length, error: "network" });
  return fetch(DELETE_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionIds: ids })
  }).then((response) => response.json().catch(() => null).then((payload) => payload !== null && typeof payload === "object" ? payload : { ok: false, deleted: 0, failed: ids.length, error: `HTTP ${response.status}` })).catch(() => ({ ok: false, deleted: 0, failed: ids.length, error: "network" }));
}
function postDelete(ids) {
  const list = Array.isArray(ids) ? ids : [];
  if (list.length <= DELETE_BATCH_LIMIT) return postDeleteBatch(list);
  const outcome = { ok: true, deleted: 0, missing: 0, failed: 0, error: "" };
  let chain = Promise.resolve();
  for (let start = 0; start < list.length; start += DELETE_BATCH_LIMIT) {
    const batch = list.slice(start, start + DELETE_BATCH_LIMIT);
    chain = chain.then(() => postDeleteBatch(batch)).then((result) => {
      outcome.deleted += result.deleted ?? 0;
      outcome.missing += result.missing ?? 0;
      outcome.failed += result.failed ?? 0;
      if (result.ok !== true) {
        outcome.ok = false;
        if (outcome.error === "" && typeof result.error === "string") outcome.error = result.error;
      }
    });
  }
  return chain.then(() => outcome);
}
function postWorkspaceDelete(workspaceId) {
  if (typeof fetch !== "function") return Promise.resolve({ ok: false, deleted: 0, failed: 0, error: "network" });
  return fetch(WORKSPACE_DELETE_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId })
  }).then((response) => response.json().catch(() => null).then((payload) => payload !== null && typeof payload === "object" ? payload : { ok: false, deleted: 0, failed: 0, error: `HTTP ${response.status}` })).catch(() => ({ ok: false, deleted: 0, failed: 0, error: "network" }));
}

// src/client/store/placements.js
function readStoredEllipsis() {
  return readBooleanRecord(ELLIPSIS_KEY, ELLIPSIS_KEYS, ELLIPSIS_DEFAULTS);
}
function readStoredPlacements() {
  const defaults = {};
  for (const key of ELLIPSIS_KEYS) defaults[key] = "context";
  const legacy = readStoredEllipsis();
  for (const key of ELLIPSIS_KEYS) {
    if (legacy[key] === true) defaults[key] = "both";
  }
  const parsed = readStoredJson(PLACEMENT_KEY);
  if (parsed === null || typeof parsed !== "object") return defaults;
  for (const key of ELLIPSIS_KEYS) {
    if (PLACEMENT_VALUES.includes(parsed[key])) defaults[key] = parsed[key];
  }
  return defaults;
}
var placementStore = createStore(readStoredPlacements, {
  persist: (state) => writeStoredJson(PLACEMENT_KEY, state)
});
function subscribePlacements(listener) {
  return placementStore.subscribe(listener);
}
function placementsSnapshot() {
  return placementStore.snapshot();
}
function usePlacements() {
  return placementStore.useValue();
}
function placementOf(key) {
  const value = placementStore.snapshot()[key];
  return PLACEMENT_VALUES.includes(value) ? value : "context";
}
function showsInContext(key) {
  return placementOf(key) !== "ellipsis";
}
function showsInEllipsis(key) {
  return placementOf(key) !== "context";
}
function setPlacement(key, value) {
  if (!ELLIPSIS_KEYS.includes(key) || !PLACEMENT_VALUES.includes(value)) return;
  placementStore.set((state) => ({ ...state, [key]: value }));
}
function placementOn(key, mode) {
  const placement = placementOf(key);
  return mode === "context" ? placement !== "ellipsis" : placement !== "context";
}
function workspaceEllipsisOn() {
  return ["newSession", "permissionDefault", "openWith", "copyPath", "openInTab", "deleteSessions", "showArchived"].some((key) => showsInEllipsis(key));
}

// src/client/ui/dismiss.js
function useDismissOnOutside(hostRef, onClose, active = true) {
  (0, import_react.useEffect)(() => {
    if (!active) return void 0;
    const dismiss = (event) => {
      const host = hostRef.current;
      if (host !== null && host !== void 0 && host.contains(event.target)) return;
      onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", dismiss, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", dismiss, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [active, hostRef, onClose]);
}
function useSubmenuDismiss(open, setOpen, hostRef) {
  useDismissOnOutside(hostRef, (0, import_react.useCallback)(() => setOpen(false), [setOpen]), open);
}
function useHoverSubmenu(setOpen, onOpen) {
  const closeTimer = (0, import_react.useRef)(0);
  (0, import_react.useEffect)(() => () => window.clearTimeout(closeTimer.current), []);
  const openNow = (0, import_react.useCallback)(() => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
    onOpen?.();
  }, [setOpen, onOpen]);
  const closeSoon = (0, import_react.useCallback)(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  }, [setOpen]);
  return { closeSoon, openNow };
}

// src/client/ui/position.js
function viewportBounds() {
  const root = typeof document === "undefined" ? null : document.documentElement;
  const width = root !== null && root !== void 0 && root.clientWidth > 0 ? root.clientWidth : window.innerWidth;
  const height = root !== null && root !== void 0 && root.clientHeight > 0 ? root.clientHeight : window.innerHeight;
  return { width: Number(width) || 0, height: Number(height) || 0 };
}
function layoutSize(node) {
  if (node === null || node === void 0) return null;
  const width = Number(node.offsetWidth) || 0;
  const height = Number(node.offsetHeight) || 0;
  if (width > 0 && height > 0) return { width, height };
  if (typeof node.getBoundingClientRect !== "function") return null;
  const rect = node.getBoundingClientRect();
  if (!(rect.width > 0) || !(rect.height > 0)) return null;
  return { width: rect.width, height: rect.height };
}
function useMenuPos(hostRef, x, y, deps) {
  const [pos, setPos] = (0, import_react.useState)(null);
  const place = () => {
    const host = hostRef.current;
    if (host === null || host === void 0) return;
    const size = layoutSize(host);
    if (size === null) return;
    const view = viewportBounds();
    const margin = 8;
    const left = Math.max(margin, Math.min(x, view.width - size.width - margin));
    const top = Math.max(margin, Math.min(y, view.height - size.height - margin));
    setPos((prev) => prev !== null && prev.left === left && prev.top === top ? prev : { left, top });
  };
  (0, import_react.useLayoutEffect)(place, [x, y, ...deps]);
  (0, import_react.useEffect)(() => {
    if (typeof ResizeObserver !== "function") return void 0;
    const host = hostRef.current;
    if (host === null || host === void 0) return void 0;
    const observer = new ResizeObserver(place);
    observer.observe(host);
    return () => observer.disconnect();
  }, [x, y]);
  return pos;
}
function submenuGeometry(anchor, size, row = anchor) {
  const margin = 12;
  const gap = 6;
  const view = viewportBounds();
  const width = Math.max(180, size?.width ?? 180);
  const height = Math.max(0, size?.height ?? 0);
  const rightRoom = view.width - margin - (anchor.right + gap);
  const leftRoom = anchor.left - gap - margin;
  let side = "right";
  let left = anchor.right + gap;
  if (rightRoom < width && leftRoom > rightRoom) {
    side = "left";
    left = anchor.left - width - gap;
  }
  left = Math.max(margin, Math.min(left, view.width - width - margin));
  let top = row.top;
  top = Math.max(margin, Math.min(top, view.height - height - margin));
  return { left, top, side };
}
function useSubmenuPos(open, hostRef, deps) {
  const [box, setBox] = (0, import_react.useState)(null);
  const place = () => {
    const host = hostRef.current;
    if (host === null || host === void 0) return;
    const panel = typeof host.querySelector === "function" ? host.querySelector(".dsrm-submenu") : null;
    const size = layoutSize(panel);
    if (size === null) return;
    const row = host.getBoundingClientRect();
    const menu = typeof host.closest === "function" ? host.closest(".dsrm-menu") ?? host.closest('[role="menu"]') : null;
    const anchor = menu !== null && menu !== void 0 && menu !== host ? menu.getBoundingClientRect() : row;
    const next = submenuGeometry(anchor, size, row);
    setBox((prev) => prev !== null && prev.left === next.left && prev.top === next.top && prev.side === next.side ? prev : next);
  };
  (0, import_react.useLayoutEffect)(() => {
    if (!open) {
      setBox(null);
      return;
    }
    place();
  }, [open, ...deps]);
  (0, import_react.useEffect)(() => {
    if (!open) return void 0;
    window.addEventListener("resize", place);
    const host = hostRef.current;
    const panel = host !== null && host !== void 0 && typeof host.querySelector === "function" ? host.querySelector(".dsrm-submenu") : null;
    const observer = typeof ResizeObserver === "function" && panel !== null && panel !== void 0 ? new ResizeObserver(place) : null;
    if (observer !== null) observer.observe(panel);
    return () => {
      window.removeEventListener("resize", place);
      if (observer !== null) observer.disconnect();
    };
  }, [open, ...deps]);
  return box;
}
function chevronClass(box) {
  return box?.side === "left" ? "dsrm-submenu-chevron dsrm-submenu-chevron-flipped" : "dsrm-submenu-chevron";
}
function menuCloser(useMenuOpenState) {
  if (typeof useMenuOpenState !== "function") return void 0;
  const state = useMenuOpenState();
  return Array.isArray(state) && typeof state[1] === "function" ? state[1] : void 0;
}

// src/client/ui/right-click-mark.js
var rightClickMark = false;
var menuGesture = "context";
var rightClickToken = 0;
var rightClickWatch = null;
var rightClickObserver = null;
function scheduleRightClickMarkEnd(delay) {
  const token = rightClickToken;
  window.setTimeout(() => {
    if (rightClickToken === token) rightClickMark = false;
  }, delay);
}
function menuPanels() {
  if (typeof document.querySelectorAll !== "function") return [];
  return [...document.querySelectorAll('[role="menu"]')];
}
function releaseRightClickWatch(delay) {
  const watch = rightClickWatch;
  if (watch === null) return;
  rightClickWatch = null;
  window.clearTimeout(watch.timer);
  rightClickObserver?.disconnect();
  scheduleRightClickMarkEnd(delay);
}
function ensureRightClickObserver() {
  if (rightClickObserver !== null) return rightClickObserver;
  if (typeof MutationObserver !== "function") return null;
  rightClickObserver = new MutationObserver(() => {
    const watch = rightClickWatch;
    if (watch === null) return;
    for (const panel of menuPanels()) {
      if (watch.known.has(panel)) continue;
      releaseRightClickWatch(400);
      return;
    }
  });
  return rightClickObserver;
}
function markRightClickMenu() {
  rightClickToken += 1;
  rightClickMark = true;
  menuGesture = "context";
  if (rightClickWatch !== null) return;
  const watch = { known: new Set(menuPanels()), timer: 0 };
  rightClickWatch = watch;
  watch.timer = window.setTimeout(() => releaseRightClickWatch(0), 3e3);
  const observer = ensureRightClickObserver();
  if (observer === null || document.body === null) return;
  observer.observe(document.body, { childList: true, subtree: true });
}
function clearRightClickMark() {
  rightClickToken += 1;
  rightClickMark = false;
  menuGesture = "ellipsis";
}
function currentMenuGesture() {
  return menuGesture;
}
function useRightClickEntry() {
  const [visible] = (0, import_react.useState)(() => rightClickMark);
  return visible;
}

// src/client/features/open-with.js
function OpenWithSubmenu({ t, getCwd, closeParent, separatorBefore = false }) {
  const children = useChildren();
  const apps = useApps();
  usePinned();
  const [open, setOpen] = (0, import_react.useState)(false);
  const hostRef = (0, import_react.useRef)(null);
  const { closeSoon, openNow } = useHoverSubmenu(setOpen, ensureApps);
  (0, import_react.useEffect)(() => {
    if (open) ensureApps();
  }, [open]);
  useSubmenuDismiss(open, setOpen, hostRef);
  const box = useSubmenuPos(open, hostRef, [apps.status, apps.ids]);
  (0, import_react.useEffect)(() => {
    const host = hostRef.current;
    if (host === null) return void 0;
    const inside = (node) => node instanceof Node && host.contains(node);
    const onOver = (event) => {
      if (inside(event.target)) openNow();
    };
    const onOut = (event) => {
      if (inside(event.target) && !inside(event.relatedTarget)) closeSoon();
    };
    window.addEventListener("pointerover", onOver, true);
    window.addEventListener("pointerout", onOut, true);
    return () => {
      window.removeEventListener("pointerover", onOver, true);
      window.removeEventListener("pointerout", onOut, true);
    };
  }, [open, apps.status, apps.ids]);
  const pick = (appId) => {
    setOpen(false);
    closeParent?.();
    const cwd = getCwd();
    if (cwd === "") {
      toast(t("noPath"));
      return;
    }
    openApplication(appId, cwd).then((ok) => {
      if (!ok) toast(t("openFailed"));
    });
  };
  const pinnedIds = new Set(effectivePinned(apps.ids));
  const enabledApps = apps.ids.filter((id) => childOn(id));
  const visibleApps = enabledApps.filter((id) => !pinnedIds.has(id));
  if (apps.status !== "loading" && enabledApps.length > 0 && visibleApps.length === 0) {
    return null;
  }
  let panelBody;
  if (apps.status === "error") {
    panelBody = h("div", { className: "dsrm-submenu-empty" }, t("settings.appsError"));
  } else if (apps.ids.length === 0) {
    panelBody = h("div", { className: "dsrm-submenu-empty" }, apps.status === "loading" ? t("settings.appsLoading") : t("settings.appsUnavailable"));
  } else if (visibleApps.length === 0) {
    panelBody = h("div", { className: "dsrm-submenu-empty" }, t("settings.appsAllOff"));
  } else {
    panelBody = visibleApps.map((id) => (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
      key: id,
      onSelect: () => pick(id),
      icon: appIcon(id),
      children: appLabel(id, t)
    }));
  }
  const body = h(
    "div",
    {
      className: "dsrm-submenu-host",
      ref: hostRef,
      onPointerOver: openNow,
      onPointerEnter: openNow,
      onPointerLeave: closeSoon
    },
    h(
      "button",
      {
        type: "button",
        role: "menuitem",
        className: "dsrm-submenu-trigger",
        "aria-haspopup": "menu",
        "aria-expanded": open,
        onPointerOver: openNow,
        onFocus: openNow,
        onClick: () => {
          if (open) setOpen(false);
          else openNow();
        }
      },
      (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconRightUpOutlineRegular, { size: 14 }),
      h("span", { className: "dsrm-submenu-label" }, t("openWith")),
      (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 12, className: chevronClass(box) })
    ),
    open ? h(import_dsh_client_ui_primitives.MenuSurface, {
      role: "group",
      "aria-label": t("openWith"),
      className: "dsrm-submenu",
      style: {
        left: box?.left ?? 0,
        top: box?.top ?? 0,
        visibility: box === null ? "hidden" : "visible"
      }
    }, panelBody) : null
  );
  if (!separatorBefore) return body;
  return h(
    import_react.Fragment,
    null,
    h("div", { className: "dsrm-sep", role: "separator" }),
    body
  );
}
function SessionOpenWithMenuItem({ sessionId, useMenuOpenState, t }) {
  const rightClick = useRightClickEntry();
  const visible = placementOn("sessionOpenWith", rightClick ? "context" : "ellipsis");
  const items = useItems();
  const apps = useApps();
  const setMenuOpen = menuCloser(useMenuOpenState);
  if (!visible || items.openWith === false || takenOver("openWith")) return null;
  const pinnedCount = apps.status === "ready" ? effectivePinned(apps.ids).filter((id) => childOn(id)).length : 0;
  return (0, import_jsx_runtime.jsx)(OpenWithSubmenu, {
    t,
    getCwd: () => sessionCwd(rootCtx, sessionId),
    closeParent: () => setMenuOpen?.(false),
    separatorBefore: apps.status === "ready" && pinnedCount === 0
  });
}
function SessionOpenWithPinnedMenuItem({ sessionId, useMenuOpenState, t }) {
  const rightClick = useRightClickEntry();
  const visible = placementOn("sessionOpenWith", rightClick ? "context" : "ellipsis");
  const items = useItems();
  useChildren();
  const apps = useApps();
  usePinned();
  const setMenuOpen = menuCloser(useMenuOpenState);
  (0, import_react.useEffect)(() => {
    if (visible) ensureApps();
  }, [visible]);
  if (!visible || items.openWith === false || takenOver("openWith")) return null;
  const picked = effectivePinned(apps.ids).filter((id) => childOn(id));
  if (picked.length === 0) return null;
  const pick = (appId) => {
    setMenuOpen?.(false);
    const cwd = sessionCwd(rootCtx, sessionId);
    if (cwd === "") {
      toast(t("noPath"));
      return;
    }
    openApplication(appId, cwd).then((ok) => {
      if (!ok) toast(t("openFailed"));
    });
  };
  return h(import_react.Fragment, null, picked.map((id, index) => (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
    key: id,
    separatorBefore: index === 0,
    onSelect: () => pick(id),
    icon: appIcon(id),
    children: t("openWithApp", { name: appLabel(id, t) })
  })));
}
function SessionDeleteMenuItem({ sessionId, displayTitle, useMenuOpenState, t }) {
  const rightClick = useRightClickEntry();
  const visible = placementOn("sessionDelete", rightClick ? "context" : "ellipsis");
  const items = useItems();
  const archived = useArchivedIds();
  const setMenuOpen = menuCloser(useMenuOpenState);
  if (!visible || items.deleteSession === false || takenOver("deleteSession")) return null;
  if (!archived.has(sessionId) && items.deleteUnarchived !== true) return null;
  return (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
    danger: true,
    separatorBefore: true,
    icon: (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 14 }),
    onSelect: () => {
      setMenuOpen?.(false);
      requestDelete({ mode: "one", sessionId, displayTitle });
    },
    children: t("deleteSession")
  });
}
function SessionDeleteArchivedMenuItem({ sessionId, displayTitle, useMenuOpenState, t }) {
  const rightClick = useRightClickEntry();
  const visible = placementOn("sessionDeleteArchived", rightClick ? "context" : "ellipsis");
  const items = useItems();
  const archived = useArchivedIds();
  const setMenuOpen = menuCloser(useMenuOpenState);
  if (!visible || items.deleteArchived === false || takenOver("deleteArchived")) return null;
  if (!archived.has(sessionId)) return null;
  return (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
    danger: true,
    separatorBefore: items.deleteSession === false || takenOver("deleteSession"),
    icon: (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 14 }),
    onSelect: () => {
      const ids = [...archived];
      setMenuOpen?.(false);
      if (ids.length === 0) return;
      requestDelete({ mode: "archived", sessionIds: ids, displayTitle });
    },
    children: t("deleteArchived")
  });
}

// src/client/store/permission.js
function emptyPermissionState() {
  return {
    status: "idle",
    options: FALLBACK_PRESETS.map((value) => ({ value })),
    defaultPreset: "",
    defaults: {},
    at: 0
  };
}
var permissionStore = createStore(emptyPermissionState);
var permissionWriteSeq = 0;
function publishPermission(next) {
  permissionStore.publish(next);
}
function subscribePermission(listener) {
  return permissionStore.subscribe(listener);
}
function permissionSnapshot() {
  return permissionStore.snapshot();
}
var permissionSource = {
  getSnapshot: permissionSnapshot,
  subscribe: subscribePermission
};
function presetLabel(value, t) {
  const option = permissionStore.snapshot().options.find((candidate) => candidate?.value === value);
  const key = PRESET_LABEL_KEYS[value];
  if (typeof key === "string") {
    const localized = t(key);
    if (localized !== key) return localized;
  }
  if (typeof option?.name === "string" && option.name !== "") return option.name;
  return value;
}
function presetOptions() {
  return permissionStore.snapshot().options.filter((option) => option !== null && typeof option === "object" && typeof option.value === "string" && option.value !== "" && option.value !== "custom");
}
function workspacePreset(workspaceId) {
  const value = permissionStore.snapshot().defaults[workspaceId];
  return typeof value === "string" ? value : "";
}
function effectivePreset(workspaceId) {
  return workspacePreset(workspaceId) || permissionStore.snapshot().defaultPreset;
}
function normalizeDefaults(value) {
  const result = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) return result;
  for (const [workspaceId, preset] of Object.entries(value)) {
    if (typeof workspaceId !== "string" || workspaceId === "") continue;
    if (typeof preset !== "string" || preset === "") continue;
    result[workspaceId] = preset;
  }
  return result;
}
function ensurePermissionData(ctx) {
  if (typeof fetch !== "function") return;
  const state = permissionStore.snapshot();
  const now = Date.now();
  if (state.status === "loading") return;
  if (state.status === "ready" && now - state.at < 3e4) return;
  if (state.status === "error" && now - state.at < 15e3) return;
  publishPermission({ ...state, status: "loading", at: now });
  const readSeq = permissionWriteSeq;
  fetch(PERMISSION_DEFAULTS_ENDPOINT, {
    headers: { accept: "application/json" }
  }).then(
    (response) => response.ok ? response.json() : null,
    () => null
  ).then((payload) => {
    if (permissionWriteSeq !== readSeq) return;
    const current = permissionStore.snapshot();
    const readDefaults = payload?.ok === true ? normalizeDefaults(payload.defaults) : null;
    const catalog = payload?.catalog;
    const rawOptions = Array.isArray(catalog?.options) ? catalog.options : [];
    const options = rawOptions.filter((option) => option !== null && typeof option === "object" && typeof option.value === "string" && option.value !== "" && option.value !== "custom");
    const usable = options.length > 0 ? options : current.options;
    const defaultPreset = typeof catalog?.defaultPreset === "string" ? catalog.defaultPreset : current.defaultPreset;
    publishPermission({
      status: readDefaults === null ? "error" : "ready",
      options: usable,
      defaultPreset,
      defaults: readDefaults ?? current.defaults,
      at: Date.now()
    });
  }, () => {
    if (permissionWriteSeq !== readSeq) return;
    publishPermission({ ...permissionStore.snapshot(), status: "error", at: Date.now() });
  });
}
function setWorkspacePreset(ctx, workspaceId, preset, t) {
  if (typeof workspaceId !== "string" || workspaceId === "") return Promise.resolve(false);
  const previous = permissionStore.snapshot().defaults;
  const next = { ...previous };
  if (preset === null) delete next[workspaceId];
  else next[workspaceId] = preset;
  publishPermission({ ...permissionStore.snapshot(), status: "ready", defaults: next, at: Date.now() });
  if (typeof fetch !== "function") {
    publishPermission({ ...permissionStore.snapshot(), defaults: previous, at: Date.now() });
    return Promise.resolve(false);
  }
  const seq = permissionWriteSeq += 1;
  return fetch(PERMISSION_DEFAULTS_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId, preset })
  }).then((response) => response.json().catch(() => null).then((data) => {
    if (!response.ok || data?.ok !== true) throw new Error(`HTTP ${response.status}`);
    if (permissionWriteSeq === seq) {
      publishPermission({
        ...permissionStore.snapshot(),
        status: "ready",
        defaults: normalizeDefaults(data.defaults),
        at: Date.now()
      });
    }
    return true;
  })).catch(() => {
    if (permissionWriteSeq === seq) {
      publishPermission({ ...permissionStore.snapshot(), defaults: previous, at: Date.now() });
      toast(t("actionFailed"));
    }
    return false;
  });
}

// src/client/features/workspace-menu.js
function WorkspaceRowMenu({ x, y, props, onClose, mode = "context" }) {
  const t = localeOf(rootCtx);
  const items = useItems();
  usePlacements();
  const apps = useApps();
  usePinned();
  useChildren();
  const hostRef = (0, import_react.useRef)(null);
  const pos = useMenuPos(hostRef, x, y, [apps.status]);
  const ellipsisMode = mode === "ellipsis";
  const show = (key) => placementOn(key, ellipsisMode ? "ellipsis" : "context");
  const openWithOn = items.openWith !== false && show("openWith");
  (0, import_react.useEffect)(() => {
    if (openWithOn) ensureApps();
  }, [openWithOn]);
  useDismissOnOutside(hostRef, onClose);
  const group = props.group ?? {};
  const workspaceId = typeof group.workspaceId === "string" ? group.workspaceId : "";
  const cwd = workspaceCwd(rootCtx, group);
  const tabs = serviceOf(rootCtx, "projectTabs") ?? globalThis.__DSH_PROJECT_TABS__ ?? null;
  const canOpenInTab = tabs !== null && typeof tabs.openWorkspaceInTab === "function" && workspaceId !== "";
  const openApp2 = (appId) => {
    if (cwd === "") {
      toast(t("noPath"));
      return;
    }
    openApplication(appId, cwd).then((ok) => {
      if (!ok) toast(t("openFailed"));
    });
  };
  const requestWorkspaceDelete = () => {
    if (workspaceId === "") {
      toast(t("actionFailed"));
      return;
    }
    const snapshot = serviceOf(rootCtx, "workspaces")?.list?.getSnapshot?.();
    const entry = Array.isArray(snapshot?.items) ? snapshot.items.find((candidate) => candidate?.workspaceId === workspaceId) : void 0;
    const sessionIds = Array.isArray(entry?.sessionIds) ? entry.sessionIds.filter((id) => typeof id === "string" && id !== "") : [];
    const title = typeof group.label === "string" && group.label !== "" ? group.label : typeof group.title === "string" && group.title !== "" ? group.title : cwd;
    requestDelete({ mode: "workspace", workspaceId, sessionIds, displayTitle: title });
  };
  const run = (id) => {
    if (id === "new-session") {
      try {
        props.onCreate?.();
      } catch (error) {
        console.warn("[dsh-sidebar-row-menu] new session failed:", error);
      }
      return;
    }
    if (id === "rename") {
      try {
        props.actions?.rename?.();
      } catch (error) {
        console.warn("[dsh-sidebar-row-menu] workspace rename failed:", error);
      }
      return;
    }
    if (id === "delete") {
      try {
        props.actions?.delete?.();
      } catch (error) {
        console.warn("[dsh-sidebar-row-menu] workspace delete failed:", error);
      }
      return;
    }
    if (id === "delete-sessions") {
      requestWorkspaceDelete();
      return;
    }
    if (id === "tab") {
      Promise.resolve().then(() => tabs.openWorkspaceInTab(workspaceId)).catch((reason) => {
        console.warn("[dsh-sidebar-row-menu] open in tab failed:", reason);
        toast(t("actionFailed"));
      });
      return;
    }
    if (id === "copy-path") {
      if (cwd === "") {
        toast(t("noPath"));
        return;
      }
      copyText(cwd, t);
      return;
    }
    if (id === "archived") toggleWorkspaceArchived(workspaceId);
  };
  const rows = [];
  if (typeof props.onCreate === "function" && show("newSession")) {
    rows.push((0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
      key: "new-session",
      onSelect: () => {
        onClose();
        run("new-session");
      },
      icon: (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconNewChatOutlineRegular, {}),
      children: t("newSession")
    }));
  }
  if (typeof props.actions?.rename === "function") {
    rows.push((0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
      key: "rename",
      onSelect: () => {
        onClose();
        run("rename");
      },
      icon: (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconEditOutlineRegular, {}),
      children: t("rename")
    }));
  }
  if (openWithOn) {
    const pinned = effectivePinned(apps.ids).filter((id) => childOn(id));
    pinned.forEach((id, index) => rows.push((0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
      key: `pinned-${id}`,
      separatorBefore: index === 0,
      onSelect: () => {
        onClose();
        openApp2(id);
      },
      icon: appIcon(id),
      children: t("openWithApp", { name: appLabel(id, t) })
    })));
    rows.push((0, import_jsx_runtime.jsx)(OpenWithSubmenu, {
      key: "open-with",
      t,
      getCwd: () => cwd,
      closeParent: onClose,
      separatorBefore: pinned.length === 0
    }));
  }
  if (show("copyPath")) {
    rows.push((0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
      key: "copy-path",
      separatorBefore: !openWithOn,
      onSelect: () => {
        onClose();
        run("copy-path");
      },
      icon: (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconCopyOutlineRegular, { size: 14 }),
      children: t("copyPath")
    }));
  }
  if (canOpenInTab && show("openInTab")) {
    rows.push((0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
      key: "tab",
      onSelect: () => {
        onClose();
        run("tab");
      },
      icon: (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconProjectAddOutlineRegular, { size: 14 }),
      children: t("openInTab")
    }));
  }
  const archivedCount = items.archivedSessions === false ? 0 : archivedCountOfWorkspace(workspaceId);
  if (archivedCount > 0 && show("showArchived")) {
    const archivedVisible = archivedRowsVisibleIn(workspaceId);
    rows.push((0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
      key: "archived",
      onSelect: () => {
        onClose();
        run("archived");
      },
      icon: (0, import_jsx_runtime.jsx)(archivedVisible ? import_dsh_client_ui_primitives.IconArchiveOffOutlineRegular : import_dsh_client_ui_primitives.IconArchiveOutlineRegular, { size: 14 }),
      children: t(archivedVisible ? "hideArchivedSessions" : "showArchivedSessions")
    }));
  }
  if (typeof props.actions?.delete === "function") {
    rows.push((0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
      key: "delete",
      danger: true,
      separatorBefore: true,
      onSelect: () => {
        onClose();
        run("delete");
      },
      icon: (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconTrashOutlineRegular, {}),
      children: t("deleteWorkspace")
    }));
  }
  if (show("deleteSessions")) {
    rows.push((0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
      key: "delete-sessions",
      danger: true,
      onSelect: () => {
        onClose();
        run("delete-sessions");
      },
      icon: (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconTrashOutlineRegular, {}),
      children: t("deleteWorkspaceSessions")
    }));
  }
  return h("div", {
    className: "dsrm-menu",
    ref: hostRef,
    style: {
      left: pos?.left ?? x,
      top: pos?.top ?? y,
      visibility: pos === null ? "hidden" : "visible"
    }
  }, h(import_dsh_client_ui_primitives.MenuSurface, { role: "group", className: "dsrm-menu-surface" }, rows));
}
function showWorkspaceMenu(props, x, y, mode = "context") {
  beginMenu("1").render((0, import_jsx_runtime.jsx)(WorkspaceRowMenu, {
    x,
    y,
    props,
    mode,
    onClose: () => closeMenu()
  }));
}
function openWorkspaceMenu(props, x, y, mode = "context") {
  if (rootCtx === null) return;
  showWorkspaceMenu(props, x, y, mode);
}
function workspaceMenuActions(ctx, value, t) {
  const workspaceId = typeof value?.workspaceId === "string" ? value.workspaceId : "";
  if (workspaceId === "") return [];
  const cwd = typeof value?.path === "string" ? value.path : "";
  const items = [];
  items.push({
    id: "new-session",
    group: "new",
    label: t("newSession"),
    icon: { key: "sidebar-row-menu.new" },
    run: () => {
      const ui = serviceOf(rootCtx, "uiWorkspace");
      if (typeof ui?.startSession === "function") {
        try {
          ui.startSession(workspaceId, {});
        } catch (error) {
          console.warn("[dsh-sidebar-row-menu] new session failed:", error);
        }
      }
    }
  });
  const apps = appsSnapshot();
  const withApps = itemsSnapshot().openWith !== false;
  const pinned = withApps ? effectivePinned(apps.ids).filter((id) => childOn(id)) : [];
  const enabledApps = withApps ? apps.ids.filter((id) => childOn(id)) : [];
  const pinnedSet = new Set(pinned);
  const submenuApps = enabledApps.filter((id) => !pinnedSet.has(id));
  if (withApps) ensureApps();
  const tabs = serviceOf(rootCtx, "projectTabs") ?? globalThis.__DSH_PROJECT_TABS__ ?? null;
  if (tabs !== null && typeof tabs?.openWorkspaceInTab === "function") {
    items.push({
      id: "tab",
      group: "tab",
      label: t("openInTab"),
      icon: { key: "sidebar-row-menu.tab" },
      run: () => {
        Promise.resolve().then(() => tabs.openWorkspaceInTab(workspaceId)).catch((reason) => {
          console.warn("[dsh-sidebar-row-menu] open in tab failed:", reason);
          toast(t("actionFailed"));
        });
      }
    });
  }
  const archivedCount = itemOn("archivedSessions") ? archivedCountOfWorkspace(workspaceId) : 0;
  if (archivedCount > 0) {
    const archivedVisible = archivedRowsVisibleIn(workspaceId);
    items.push({
      id: "archived",
      group: "archived",
      label: t(archivedVisible ? "hideArchivedSessions" : "showArchivedSessions"),
      icon: { key: archivedVisible ? "sidebar-row-menu.archive-off" : "sidebar-row-menu.archive" },
      run: () => toggleWorkspaceArchived(workspaceId)
    });
  }
  items.push({
    id: "copy-path",
    group: "copy",
    separatorBefore: true,
    label: t("copyPath"),
    icon: { key: "sidebar-row-menu.copy" },
    run: () => {
      if (cwd === "") {
        toast(t("noPath"));
        return;
      }
      copyText(cwd, t);
    }
  });
  pinned.forEach((id, index) => {
    items.push({
      id: `pinned-${id}`,
      group: "pinned",
      separatorBefore: index === 0,
      label: t("openWithApp", { name: appLabel(id, t) }),
      icon: { key: "sidebar-row-menu.app", src: ICON_ROUTE + encodeURIComponent(id) },
      run: () => openAppAt(id, cwd, t)
    });
  });
  if (withApps && submenuApps.length > 0) {
    items.push({
      id: "open-with",
      group: "open-with",
      separatorBefore: pinned.length === 0,
      // 宿主 0.2.2-rc.2 起自己给带 children 的菜单项画右侧箭头，rc.1 及更早不画。
      // 插件保留自己的箭头兜底，styles.js 在检测到宿主箭头时把它隐藏，避免叠成两个。
      label: h(
        "span",
        { className: "dsrm-host-label" },
        h("span", { className: "dsrm-host-label-text" }, t("openWith")),
        (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 12, className: "dsrm-submenu-chevron" })
      ),
      icon: { key: "sidebar-row-menu.open-with" },
      children: submenuApps.map((id) => ({
        id: `app-${id}`,
        label: appLabel(id, t),
        icon: { key: "sidebar-row-menu.app", src: ICON_ROUTE + encodeURIComponent(id) },
        run: () => openAppAt(id, cwd, t)
      }))
    });
  }
  ensurePermissionData(ctx);
  const permissionOptions = presetOptions();
  if (permissionOptions.length > 0) {
    const override = workspacePreset(workspaceId);
    const effective = effectivePreset(workspaceId);
    const children = permissionOptions.map((option) => ({
      id: `preset-${option.value}`,
      label: h(
        "span",
        { className: "dsrm-host-label" },
        h("span", { className: "dsrm-host-label-text" }, presetLabel(option.value, t)),
        option.value === effective ? permissionCheck() : null
      ),
      icon: { key: "sidebar-row-menu.permission" },
      run: () => {
        setWorkspacePreset(rootCtx, workspaceId, option.value, t);
      }
    }));
    if (override !== "") {
      children.push({
        id: "permission-follow-global",
        separatorBefore: true,
        label: t("permissionFollowGlobal"),
        icon: { key: "sidebar-row-menu.permission" },
        run: () => {
          setWorkspacePreset(rootCtx, workspaceId, null, t);
        }
      });
    }
    items.push({
      id: "new-session-permission",
      group: "permission",
      separatorBefore: true,
      // 同上：有宿主箭头时隐藏插件箭头。
      label: h(
        "span",
        { className: "dsrm-host-label" },
        h("span", { className: "dsrm-host-label-text" }, t("newSessionPermission")),
        (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 12, className: "dsrm-submenu-chevron" })
      ),
      icon: { key: "sidebar-row-menu.permission" },
      children
    });
  }
  items.push({
    id: "delete-sessions",
    group: "delete",
    danger: true,
    separatorBefore: false,
    label: t("deleteWorkspaceSessions"),
    icon: { key: "sidebar-row-menu.delete" },
    run: () => {
      const title = typeof value?.displayTitle === "string" && value.displayTitle !== "" ? value.displayTitle : cwd;
      requestDelete({
        mode: "workspace",
        workspaceId,
        sessionIds: workspaceSessionIds(workspaceId),
        displayTitle: title
      });
    }
  });
  return items;
}
var WORKSPACE_MENU_GROUPS = [
  { key: "new", order: 90 },
  { key: "tab", order: 110 },
  { key: "archived", order: 130 },
  { key: "copy", order: 150 },
  { key: "pinned", order: 210 },
  { key: "open-with", order: 220 },
  { key: "permission", order: 225 },
  { key: "delete", order: 310 }
];
var WORKSPACE_GROUP_ELLIPSIS = {
  new: "newSession",
  pinned: "openWith",
  "open-with": "openWith",
  copy: "copyPath",
  tab: "openInTab",
  archived: "showArchived",
  permission: "permissionDefault",
  delete: "deleteSessions"
};
function workspaceGroupVisible(groupKey) {
  const key = WORKSPACE_GROUP_ELLIPSIS[groupKey];
  if (key === void 0) return rightClickMark;
  return placementOn(key, rightClickMark ? "context" : "ellipsis");
}
var actionsCache = /* @__PURE__ */ new WeakMap();
function cachedWorkspaceMenuActions(ctx, target, t) {
  if (target === null || typeof target !== "object") return workspaceMenuActions(ctx, target, t);
  const cached = actionsCache.get(target);
  if (cached !== void 0 && cached.ctx === ctx && cached.t === t) return cached.actions;
  const actions = workspaceMenuActions(ctx, target, t);
  actionsCache.set(target, { actions, ctx, t });
  Promise.resolve().then(() => {
    const current = actionsCache.get(target);
    if (current !== void 0 && current.actions === actions) actionsCache.delete(target);
  });
  return actions;
}
function registerWorkspaceContextMenu(ctx) {
  let disposers = null;
  let icons = null;
  let timer = 0;
  let attempts = 0;
  const registerIcons = () => {
    if (ctx.slots === null || ctx.slots === void 0) return;
    icons = ctx.slots.inject("contextMenu.icon", function* () {
      yield ctx.slots.register({ name: "contextMenu.icon", key: "sidebar-row-menu.new" }, import_dsh_client_ui_primitives.IconNewChatOutlineRegular);
      yield ctx.slots.register({ name: "contextMenu.icon", key: "sidebar-row-menu.copy" }, import_dsh_client_ui_primitives.IconCopyOutlineRegular);
      yield ctx.slots.register({ name: "contextMenu.icon", key: "sidebar-row-menu.tab" }, import_dsh_client_ui_primitives.IconProjectAddOutlineRegular);
      yield ctx.slots.register({ name: "contextMenu.icon", key: "sidebar-row-menu.archive" }, import_dsh_client_ui_primitives.IconArchiveOutlineRegular);
      yield ctx.slots.register({ name: "contextMenu.icon", key: "sidebar-row-menu.archive-off" }, import_dsh_client_ui_primitives.IconArchiveOffOutlineRegular);
      yield ctx.slots.register({ name: "contextMenu.icon", key: "sidebar-row-menu.open-with" }, import_dsh_client_ui_primitives.IconRightUpOutlineRegular);
      yield ctx.slots.register({ name: "contextMenu.icon", key: "sidebar-row-menu.permission" }, ContextMenuPermissionIcon);
      yield ctx.slots.register({ name: "contextMenu.icon", key: "sidebar-row-menu.delete" }, import_dsh_client_ui_primitives.IconTrashOutlineRegular);
      yield ctx.slots.register({ name: "contextMenu.icon", key: "sidebar-row-menu.app" }, ContextMenuAppIcon);
    });
  };
  const register = () => {
    timer = 0;
    if (disposers !== null) return;
    const menus2 = contextMenusOf(ctx);
    if (menus2 === null) {
      if (attempts >= 40 || typeof setTimeout !== "function") return;
      attempts += 1;
      timer = setTimeout(register, 250);
      return;
    }
    registerIcons();
    ensurePermissionData(ctx);
    const registered = [];
    for (const group of WORKSPACE_MENU_GROUPS) {
      try {
        registered.push(menus2.register({
          id: `sidebar-row-menu.workspace.${group.key}`,
          target: "workspace",
          order: group.order,
          observe: () => [appsSource, permissionSource],
          resolve: (target) => {
            if (!workspaceGroupVisible(group.key)) return [];
            return cachedWorkspaceMenuActions(ctx, target, localeOf(ctx)).filter((action) => action.group === group.key).map(({ group: _group, ...action }) => action);
          }
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
      }
    }
    try {
      icons?.();
    } catch {
    }
  };
}

// src/client/features/header-toolbar.js
var HEADER_SLOT_SELECTORS = [
  { section: "actions", selector: '[data-slot="conversation.session.header.actions"]' },
  { section: "utilities", selector: '[data-slot="conversation.session.header.utilities"]' },
  { section: "corner", selector: '[data-slot="conversation.session.header.corner"]' }
];
var BLANK_BLOCKERS = [
  '[data-slot="conversation.header"]',
  '[data-slot="conversation.session.header"]',
  '[data-slot="conversation.composer"]'
].join(",");
var BLANK_MESSAGE_CONTROL_SELECTORS = [
  "input",
  "textarea",
  "select",
  "a[href]",
  '[contenteditable="true"]'
];
var BLANK_MESSAGE_CONTROLS = BLANK_MESSAGE_CONTROL_SELECTORS.join(",");
var BLANK_INTERACTIVE = [
  "button",
  ...BLANK_MESSAGE_CONTROL_SELECTORS,
  "summary",
  "label",
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="menu"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="combobox"]',
  '[role="textbox"]',
  "[aria-haspopup]"
].join(",");
function isOnScreen(node) {
  if (node === null || node === void 0 || typeof node.getBoundingClientRect !== "function") return false;
  const rect = node.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const viewportWidth = typeof window.innerWidth === "number" ? window.innerWidth : 0;
  const viewportHeight = typeof window.innerHeight === "number" ? window.innerHeight : 0;
  return rect.bottom > 0 && rect.right > 0 && rect.top < viewportHeight && rect.left < viewportWidth;
}
function activeSessionHeader() {
  if (typeof document.querySelectorAll !== "function") return null;
  let best = null;
  let bestArea = 0;
  for (const slot of document.querySelectorAll('[data-slot="conversation.session.header"]')) {
    const header = (typeof slot.closest === "function" ? slot.closest("header") : null) ?? slot.parentElement;
    if (header === null || header === void 0 || typeof header.getBoundingClientRect !== "function") continue;
    const rect = header.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const width = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const height = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    const area = width * height;
    if (area > bestArea) {
      bestArea = area;
      best = header;
    }
  }
  return best;
}
function headerButtonLabel(button) {
  const value = button.getAttribute("aria-label") || button.getAttribute("title") || button.textContent || "";
  return String(value).replace(/\s+/g, " ").trim();
}
function headerButtonIcon(button) {
  const svg = typeof button.querySelector === "function" ? button.querySelector("svg") : null;
  if (svg !== null && typeof svg.outerHTML === "string" && svg.outerHTML !== "") {
    return { html: svg.outerHTML };
  }
  const img = typeof button.querySelector === "function" ? button.querySelector("img[src]") : null;
  if (img !== null) {
    const src = img.getAttribute("src");
    if (typeof src === "string" && src !== "") return { src };
  }
  return null;
}
function isMoreTrigger(button, label) {
  if (MORE_LABEL_RE.test(label)) return true;
  const className = typeof button.className === "string" ? button.className : "";
  return /morebutton/i.test(className);
}
function findHeaderMenuController(button) {
  try {
    let fiber = fiberOf(button);
    for (let depth = 0; depth < 8 && fiber !== null && fiber !== void 0; depth += 1) {
      const props = fiber.memoizedProps;
      if (props !== null && typeof props === "object" && Array.isArray(props.items) && props.items.length > 0 && typeof props.onSelect === "function") {
        return { items: props.items, onSelect: props.onSelect };
      }
      fiber = fiber.return;
    }
  } catch {
  }
  return null;
}
function isOpenWithSplit(unit, candidates) {
  if (candidates.length < 2) return false;
  const className = typeof unit?.className === "string" ? unit.className : "";
  if (/split/i.test(className)) return true;
  return candidates.some((candidate) => /更多打开方式|more open/i.test(headerButtonLabel(candidate)));
}
function collectHeaderToolbarItems(header, keepMoreLast) {
  const found = [];
  const seen = /* @__PURE__ */ new Set();
  if (header === null || header === void 0 || typeof header.querySelector !== "function") return found;
  for (const slot of HEADER_SLOT_SELECTORS) {
    const container = header.querySelector(slot.selector);
    if (container === null || container === void 0) continue;
    const units = typeof container.children === "object" && container.children !== null ? Array.from(container.children) : [];
    for (const unit of units) {
      const candidates = [];
      if (unit !== null && unit !== void 0 && typeof unit.matches === "function" && unit.matches(BLANK_INTERACTIVE)) {
        candidates.push(unit);
      }
      if (unit !== null && unit !== void 0 && typeof unit.querySelectorAll === "function") {
        for (const node of unit.querySelectorAll(BLANK_INTERACTIVE)) {
          if (node !== unit) candidates.push(node);
        }
      }
      const openWith = isOpenWithSplit(unit, candidates);
      for (const button of candidates) {
        if (seen.has(button)) continue;
        if (button.disabled === true) continue;
        if (button.getAttribute("aria-disabled") === "true") continue;
        if (!isOnScreen(button)) continue;
        const label = headerButtonLabel(button);
        if (label === "") continue;
        seen.add(button);
        const rect = button.getBoundingClientRect();
        const more = isMoreTrigger(button, label);
        found.push({
          button,
          label,
          icon: headerButtonIcon(button),
          more,
          menu: more ? findHeaderMenuController(button) : null,
          openWith,
          // 会话栏左上角（header actions 槽位）放的是费用 / 后台任务这类状态组件，
          // 不逐个认标签，整个槽位统一按状态入口处理，默认不列进菜单。
          stats: slot.section === "actions",
          section: slot.section,
          left: rect.left,
          top: rect.top
        });
      }
    }
  }
  found.sort((a, b) => a.left - b.left || a.top - b.top);
  if (!keepMoreLast) return found;
  return [...found.filter((item) => !item.more), ...found.filter((item) => item.more)];
}
function hasTextSelection() {
  try {
    if (typeof window === "undefined" || typeof window.getSelection !== "function") return false;
    const selection = window.getSelection();
    if (selection === null || selection === void 0) return false;
    return String(selection).trim() !== "";
  } catch {
    return false;
  }
}
function isBlankConversationTarget(target) {
  if (target === null || target === void 0) return false;
  const start = target.nodeType === 3 ? target.parentElement : target;
  if (start === null || start === void 0 || typeof start.closest !== "function") return false;
  if (start.closest("[data-row-key]") !== null) return false;
  if (start.closest('[data-slot="conversation.session"]') === null) return false;
  if (start.closest(BLANK_BLOCKERS) !== null) return false;
  if (hasTextSelection()) return false;
  if (start.closest('[data-slot="tool.call.toolview"]') !== null) {
    return start.closest(BLANK_MESSAGE_CONTROLS) === null;
  }
  if (start.closest('[data-slot="conversation.chat.node"]') !== null) {
    return start.closest(BLANK_MESSAGE_CONTROLS) === null;
  }
  if (start.closest(BLANK_INTERACTIVE) !== null) return false;
  return true;
}
function headerIconNode(icon) {
  if (icon === null || icon === void 0) return void 0;
  if (typeof icon.html === "string" && icon.html !== "") {
    return h("span", {
      className: "dsrm-header-icon",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: icon.html }
    });
  }
  if (typeof icon.src === "string" && icon.src !== "") {
    return h("img", { className: "dsrm-header-icon-img", src: icon.src, alt: "" });
  }
  return void 0;
}
function selectedSessionId() {
  try {
    if (typeof document.querySelector === "function") {
      const row = document.querySelector('[data-row-key^="session:"][aria-selected="true"]');
      const key = typeof row?.getAttribute === "function" ? row.getAttribute("data-row-key") : "";
      if (typeof key === "string" && key.startsWith("session:")) return key.slice("session:".length);
    }
  } catch {
  }
  const sessions = serviceOf(rootCtx, "sessions");
  const byId = sessions?.list?.getSnapshot?.()?.byId;
  if (byId === null || byId === void 0 || typeof byId !== "object") return "";
  for (const row of Object.values(byId)) {
    if (typeof row?.id === "string" && (row?.retainedBy?.mainView ?? 0) > 0) return row.id;
  }
  return "";
}
function BlankOpenWithRows({ t, cwd, paths, separatorBefore, onClose }) {
  const apps = useApps();
  useChildren();
  usePinned();
  const [open, setOpen] = (0, import_react.useState)(false);
  const [fileApps, setFileApps] = (0, import_react.useState)(void 0);
  const [fileDesktop, setFileDesktop] = (0, import_react.useState)(null);
  const hostRef = (0, import_react.useRef)(null);
  const { closeSoon, openNow } = useHoverSubmenu(setOpen, ensureApps);
  useSubmenuDismiss(open, setOpen, hostRef);
  const filePaths = Array.isArray(paths) ? paths.filter((path) => typeof path === "string" && path !== "") : [];
  const fileKey = filePaths.join("\0");
  const fileMode = filePaths.length > 0;
  const targets = fileMode ? filePaths : typeof cwd === "string" && cwd !== "" ? [cwd] : [];
  (0, import_react.useEffect)(() => {
    if (!fileMode) return void 0;
    let alive = true;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    setFileApps(void 0);
    fileApplications(filePaths, controller?.signal).then((list) => {
      if (alive) setFileApps(Array.isArray(list) ? list : null);
    }).catch(() => {
      if (alive) setFileApps(null);
    });
    desktopReady().then((ready) => {
      if (alive) setFileDesktop(ready === true);
    }).catch(() => {
      if (alive) setFileDesktop(false);
    });
    return () => {
      alive = false;
      if (controller !== null) controller.abort();
    };
  }, [fileKey, fileMode]);
  const appRows = fileMode ? fileApps === void 0 ? -1 : fileApps === null ? -2 : fileApps.length : 0;
  const box = useSubmenuPos(open, hostRef, [apps.status, apps.ids, appRows]);
  const pick = (appId) => {
    setOpen(false);
    onClose();
    if (fileMode) {
      openFilesWith(targets, appId).then((ok) => {
        if (!ok) toast(t("openFailed"));
      }).catch(() => {
        toast(t("openFailed"));
      });
      return;
    }
    Promise.allSettled(targets.map((path) => openApplication(appId, path))).then((results) => {
      const failed = results.some((result) => result.status !== "fulfilled" || result.value !== true);
      if (failed) toast(t("openFailed"));
    });
  };
  const openDefault = () => {
    setOpen(false);
    onClose();
    openFilesDefault(fileMode ? filePaths : targets).then((ok) => {
      if (!ok) toast(t("openFailed"));
    }).catch(() => {
      toast(t("openFailed"));
    });
  };
  const reveal = () => {
    setOpen(false);
    onClose();
    revealFiles(fileMode ? filePaths : targets).then((ok) => {
      if (!ok) toast(t("openFailed"));
    }).catch(() => {
      toast(t("openFailed"));
    });
  };
  const pinnedIds = new Set(effectivePinned(apps.ids).filter((id) => childOn(id)));
  const enabledApps = apps.ids.filter((id) => childOn(id));
  const submenuApps = enabledApps.filter((id) => !pinnedIds.has(id));
  const fileEnabled = fileMode && Array.isArray(fileApps) ? fileApps.filter((app) => childOn(app.id)) : [];
  const filePinned = fileEnabled.filter((app) => pinnedIds.has(app.id));
  const fileSubmenu = fileEnabled.filter((app) => !pinnedIds.has(app.id));
  let panelBody;
  if (fileMode) {
    if (fileApps === void 0) {
      panelBody = h("div", { className: "dsrm-submenu-empty" }, t("settings.appsLoading"));
    } else if (fileApps === null) {
      if (fileDesktop === null) {
        panelBody = h("div", { className: "dsrm-submenu-empty" }, t("settings.appsLoading"));
      } else if (fileDesktop) {
        panelBody = h(
          import_react.Fragment,
          null,
          (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
            key: "default-app",
            onSelect: openDefault,
            icon: appIcon("filemanager"),
            children: t("openDefaultApp")
          }),
          (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
            key: "reveal-files",
            onSelect: reveal,
            icon: appIcon("explorer"),
            children: t("openWithReveal")
          }),
          h("div", { className: "dsrm-submenu-empty" }, t("openWithListFailed"))
        );
      } else {
        panelBody = h("div", { className: "dsrm-submenu-empty" }, t("openWithUnavailable"));
      }
    } else if (fileSubmenu.length === 0) {
      panelBody = h(
        "div",
        { className: "dsrm-submenu-empty" },
        fileApps.length === 0 ? t("openWithNoHandlers") : t("settings.appsAllOff")
      );
    } else {
      panelBody = fileSubmenu.map((app) => (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
        key: app.id,
        onSelect: () => pick(app.id),
        icon: fileAppIcon(app),
        children: app.name !== "" ? app.name : appLabel(app.id, t)
      }));
    }
  } else if (apps.status === "error") {
    panelBody = h("div", { className: "dsrm-submenu-empty" }, t("settings.appsError"));
  } else if (apps.ids.length === 0) {
    panelBody = h("div", { className: "dsrm-submenu-empty" }, apps.status === "loading" ? t("settings.appsLoading") : t("settings.appsUnavailable"));
  } else if (submenuApps.length === 0) {
    panelBody = h("div", { className: "dsrm-submenu-empty" }, t("settings.appsAllOff"));
  } else {
    panelBody = submenuApps.map((id) => (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
      key: id,
      onSelect: () => pick(id),
      icon: appIcon(id),
      children: appLabel(id, t)
    }));
  }
  const pinnedRows = fileMode ? filePinned.map((app) => (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
    key: `pinned-${app.id}`,
    onSelect: () => pick(app.id),
    icon: fileAppIcon(app),
    children: t("openWithApp", { name: app.name !== "" ? app.name : appLabel(app.id, t) })
  })) : Array.from(pinnedIds).map((id) => (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
    key: `pinned-${id}`,
    onSelect: () => pick(id),
    icon: appIcon(id),
    children: t("openWithApp", { name: appLabel(id, t) })
  }));
  return h(
    import_react.Fragment,
    null,
    separatorBefore ? h("div", { className: "dsrm-sep", role: "separator" }) : null,
    filePaths.length > 1 ? h("div", { className: "dsrm-openwith-note" }, t("openWithFiles", { count: String(filePaths.length) })) : null,
    pinnedRows,
    h(
      "div",
      {
        className: "dsrm-openwith",
        ref: hostRef,
        onPointerOver: openNow,
        onPointerEnter: openNow,
        onPointerLeave: closeSoon
      },
      (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
        onSelect: () => {
          if (open) setOpen(false);
          else openNow();
        },
        icon: (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconRightUpOutlineRegular, { size: 14 }),
        children: h(
          "span",
          { className: "dsrm-host-label" },
          h("span", { className: "dsrm-host-label-text" }, t("openWith")),
          (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 12, className: chevronClass(box) })
        )
      }),
      open ? h(import_dsh_client_ui_primitives.MenuSurface, {
        role: "group",
        "aria-label": t("openWith"),
        className: "dsrm-submenu",
        style: {
          left: box?.left ?? 0,
          top: box?.top ?? 0,
          visibility: box === null ? "hidden" : "visible"
        }
      }, panelBody) : null
    )
  );
}
function fileAppIcon(app) {
  if (app !== null && app !== void 0 && typeof app.icon === "string" && app.icon !== "") {
    return (0, import_jsx_runtime.jsx)("img", { className: "dsrm-app-icon", src: app.icon, alt: "" });
  }
  return appIcon(typeof app?.id === "string" ? app.id : "");
}
function organizerMenuOrder() {
  try {
    const raw = window.localStorage.getItem(ORGANIZER_MENU_ORDER_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}
function orderMoreItems(entries) {
  const saved = organizerMenuOrder();
  if (saved.length === 0) return entries;
  const rank = new Map(saved.map((label, index) => [label, index]));
  return entries.map((entry, index) => ({ entry, index, rank: rank.has(entry.label) ? rank.get(entry.label) : saved.length })).sort((a, b) => a.rank - b.rank || a.index - b.index).map((item) => item.entry);
}
function organizerHiddenOrder() {
  try {
    const raw = window.localStorage.getItem(ORGANIZER_LAYOUT_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    const hidden = parsed?.scopes?.header?.hidden;
    return Array.isArray(hidden) ? hidden.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}
function organizerFingerprint(value) {
  let text = String(value ?? "").trim();
  if (text.startsWith("host:")) text = text.slice(5);
  else if (text.startsWith("text:")) text = text.slice(5);
  const cut = Math.max(text.lastIndexOf(":"), text.lastIndexOf("："));
  if (cut > 0 && text.slice(cut + 1).trim() !== "") text = text.slice(0, cut);
  return text.replace(/\d+/g, "n").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-+|-+$/g, "");
}
function organizerTuckedHeaderItems() {
  const root = activeSessionHeader();
  if (!root || typeof root.querySelector !== "function") return [];
  const order = organizerHiddenOrder();
  const rank = /* @__PURE__ */ new Map();
  for (const id of order) {
    const fingerprint = organizerFingerprint(id);
    if (fingerprint !== "" && !rank.has(fingerprint)) rank.set(fingerprint, rank.size);
  }
  const items = [];
  const seen = /* @__PURE__ */ new Set();
  for (const slot of HEADER_SLOT_SELECTORS) {
    const container = root.querySelector(slot.selector);
    if (!container) continue;
    for (const unit of Array.from(container.children ?? [])) {
      const candidates = [];
      if (typeof unit?.matches === "function" && unit.matches(BLANK_INTERACTIVE)) candidates.push(unit);
      if (typeof unit?.querySelectorAll === "function") {
        for (const node of unit.querySelectorAll(BLANK_INTERACTIVE)) {
          if (node !== unit) candidates.push(node);
        }
      }
      for (const button of candidates) {
        if (seen.has(button)) continue;
        if (typeof button?.getAttribute !== "function") continue;
        if (button.getAttribute("data-dso-scope") !== "header") continue;
        if (button.getAttribute("data-dso-hidden") !== "1") continue;
        if (button.disabled === true || button.getAttribute("aria-disabled") === "true") continue;
        const label = headerButtonLabel(button);
        if (label === "") continue;
        seen.add(button);
        const key = button.getAttribute("data-dso-key") ?? "";
        const fingerprints = [organizerFingerprint(key), organizerFingerprint(label)].filter((value) => value !== "");
        const known = fingerprints.map((fingerprint) => rank.get(fingerprint)).filter((value) => value !== void 0);
        items.push({
          id: `organizer:${key === "" ? label : key}`,
          label,
          icon: headerButtonIcon(button),
          button,
          rank: known.length === 0 ? Number.MAX_SAFE_INTEGER : Math.min(...known),
          order: items.length
        });
      }
    }
  }
  return items.sort((a, b) => a.rank - b.rank || a.order - b.order).map(({ id, label, icon, button }) => ({ id, label, icon, button }));
}
function moreSubmenuItems(menu) {
  return [...organizerTuckedHeaderItems(), ...orderMoreItems(menu.items)];
}
function moreSelectHandler(menu, entries) {
  return (id) => {
    const entry = entries.find((item) => item.id === id);
    if (!entry || typeof entry.button?.click !== "function") {
      menu.onSelect(id);
      return;
    }
    window.setTimeout(() => {
      try {
        entry.button.click();
      } catch (error) {
        console.warn("[dsh-sidebar-row-menu] tucked header action failed:", error);
      }
    }, 0);
  };
}
function BlankMoreRows({ label, icon, controller, separatorBefore, onClose, children }) {
  const [open, setOpen] = (0, import_react.useState)(false);
  const hostRef = (0, import_react.useRef)(null);
  const { closeSoon, openNow } = useHoverSubmenu(setOpen);
  const entries = controller.items;
  useSubmenuDismiss(open, setOpen, hostRef);
  const box = useSubmenuPos(open, hostRef, [entries.length]);
  const pick = (id) => {
    setOpen(false);
    onClose();
    try {
      controller.onSelect(id);
    } catch (error) {
      console.warn("[dsh-sidebar-row-menu] header menu action failed:", error);
    }
  };
  return h(
    import_react.Fragment,
    null,
    separatorBefore ? h("div", { className: "dsrm-sep", role: "separator" }) : null,
    h(
      "div",
      {
        className: "dsrm-openwith dsrm-more",
        ref: hostRef,
        onPointerOver: openNow,
        onPointerEnter: openNow,
        onPointerLeave: closeSoon
      },
      (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
        onSelect: () => {
          if (open) setOpen(false);
          else openNow();
        },
        icon: headerIconNode(icon),
        children: h(
          "span",
          { className: "dsrm-host-label" },
          h("span", { className: "dsrm-host-label-text" }, children ?? label),
          (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 12, className: chevronClass(box) })
        )
      }),
      open ? h(import_dsh_client_ui_primitives.MenuSurface, {
        role: "group",
        "aria-label": label,
        className: "dsrm-submenu",
        style: {
          left: box?.left ?? 0,
          top: box?.top ?? 0,
          visibility: box === null ? "hidden" : "visible"
        }
      }, entries.map((entry, index) => (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
        key: typeof entry.id === "string" ? entry.id : `more-item-${index}`,
        onSelect: () => pick(entry.id),
        disabled: entry.disabled === true,
        icon: entry.icon === null || entry.icon === void 0 ? void 0 : h("span", { className: "dsrm-header-icon" }, entry.icon),
        children: entry.label
      }))) : null
    )
  );
}
function HeaderToolbarMenu({ x, y, items, t, sessionId, fileTarget, onClose }) {
  const hostRef = (0, import_react.useRef)(null);
  const pos = useMenuPos(hostRef, x, y, []);
  const itemsConfig = useItems();
  const blankMenu = useBlankMenu();
  const apps = useApps();
  useChildren();
  usePinned();
  useDismissOnOutside(hostRef, onClose);
  const cwd = typeof sessionId === "string" && sessionId !== "" ? sessionCwd(rootCtx, sessionId) : "";
  const filePaths = Array.isArray(fileTarget?.paths) ? fileTarget.paths.filter((path) => typeof path === "string" && path !== "") : [];
  const targets = filePaths.length > 0 ? filePaths : cwd !== "" ? [cwd] : [];
  const enabledApps = apps.ids.filter((id) => childOn(id));
  const ownOpenWith = itemsConfig.openWith !== false && targets.length > 0 && (filePaths.length > 0 || enabledApps.length > 0) && items.some((item) => item.openWith);
  const rows = [];
  let section = "";
  const takeSeparator = (next) => {
    const separator = section !== "" && section !== next;
    section = next;
    return separator;
  };
  let openWithDone = false;
  items.forEach((item, index) => {
    if (item.stats && blankMenu.showCostMeter !== true) return;
    if (item.openWith && itemsConfig.openWith === false) return;
    if (item.openWith && ownOpenWith) {
      if (!openWithDone) {
        openWithDone = true;
        rows.push((0, import_jsx_runtime.jsx)(BlankOpenWithRows, {
          key: "open-with",
          t,
          cwd,
          paths: filePaths,
          separatorBefore: takeSeparator("open-with"),
          onClose
        }));
      }
      return;
    }
    if (item.more && item.menu !== null && item.menu !== void 0) {
      const moreItems = moreSubmenuItems(item.menu);
      rows.push((0, import_jsx_runtime.jsx)(BlankMoreRows, {
        key: `${index}:more`,
        label: item.label,
        icon: item.icon,
        controller: { items: moreItems, onSelect: moreSelectHandler(item.menu, moreItems) },
        separatorBefore: takeSeparator("more"),
        onClose,
        children: item.label
      }));
      return;
    }
    rows.push((0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MenuItemButton, {
      key: `${index}:${item.label}`,
      separatorBefore: takeSeparator(item.openWith ? "open-with" : item.more ? "more" : item.section || "toolbar"),
      onSelect: () => {
        onClose();
        window.setTimeout(() => {
          try {
            item.button.click();
          } catch (error) {
            console.warn("[dsh-sidebar-row-menu] toolbar action click failed:", error);
          }
        }, 0);
      },
      icon: headerIconNode(item.icon),
      children: item.label
    }));
  });
  return h("div", {
    className: "dsrm-menu",
    ref: hostRef,
    style: {
      left: pos?.left ?? x,
      top: pos?.top ?? y,
      visibility: pos === null ? "hidden" : "visible"
    }
  }, h(import_dsh_client_ui_primitives.MenuSurface, { role: "group", className: "dsrm-menu-surface dsrm-header-menu" }, rows));
}
function openHeaderToolbarMenu(items, x, y, sessionId = "", fileTarget = null) {
  if (items.length === 0) return;
  beginMenu("header-toolbar").render((0, import_jsx_runtime.jsx)(HeaderToolbarMenu, {
    x,
    y,
    items,
    t: localeOf(rootCtx),
    sessionId,
    fileTarget,
    onClose: () => closeMenu()
  }));
}

// src/client/features/conversation-menu-native.js
var TARGET_KIND = "conversation";
var TOOLBAR_ICON_KEY = "sidebar-row-menu.toolbar";
var menus = null;
var unregister = null;
var iconRegistration = null;
var itemsSource = { getSnapshot: itemsSnapshot, subscribe: subscribeItems };
var childrenSource = { getSnapshot: childrenSnapshot, subscribe: subscribeChildren };
var pinnedSource = { getSnapshot: pinnedSnapshot, subscribe: subscribePinned };
var blankMenuSource = { getSnapshot: blankMenuSnapshot, subscribe: subscribeBlankMenu };
var fileAppsSource = {
  getSnapshot: fileApplicationsRevision,
  subscribe: subscribeFileApplications
};
function placeholder(t, key) {
  return { id: "placeholder", label: t(key), disabled: true };
}
function toolbarIcon(icon) {
  if (icon === null || icon === void 0) return void 0;
  if (typeof icon.html === "string" && icon.html.trim().startsWith("<svg")) {
    return { key: TOOLBAR_ICON_KEY, html: icon.html };
  }
  if (typeof icon.src === "string" && icon.src !== "") {
    return { key: TOOLBAR_ICON_KEY, src: icon.src };
  }
  return void 0;
}
function ContextMenuToolbarIcon({ icon }) {
  const html = typeof icon?.html === "string" ? icon.html.trim() : "";
  if (html.startsWith("<svg")) {
    return (0, import_jsx_runtime.jsx)("span", {
      className: "dsrm-header-icon",
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: html }
    });
  }
  const src = typeof icon?.src === "string" ? icon.src : "";
  if (src !== "") return (0, import_jsx_runtime.jsx)("img", { className: "dsrm-header-icon-img", src, alt: "" });
  return null;
}
function appIcon2(appId) {
  return { key: "sidebar-row-menu.app", src: ICON_ROUTE + encodeURIComponent(appId) };
}
function fileAppIcon2(app) {
  if (typeof app?.icon === "string" && app.icon !== "") return { key: "sidebar-row-menu.app", src: app.icon };
  return appIcon2(typeof app?.id === "string" ? app.id : "");
}
function fileAppLabel(app, t) {
  return typeof app?.name === "string" && app.name !== "" ? app.name : appLabel(typeof app?.id === "string" ? app.id : "", t);
}
function clickAction(item) {
  return () => {
    window.setTimeout(() => {
      try {
        item.button.click();
      } catch (error) {
        console.warn("[dsh-sidebar-row-menu] toolbar action click failed:", error);
      }
    }, 0);
  };
}
function fileOpenResult(t, pinned, children) {
  return {
    pinned,
    openWith: {
      id: "open-with",
      label: t("openWith"),
      icon: { key: "sidebar-row-menu.open-with" },
      children
    }
  };
}
function fileFallbackActions(paths, t) {
  return [
    {
      id: "default-app",
      label: t("openDefaultApp"),
      icon: appIcon2("filemanager"),
      run: async () => {
        const ok = await openFilesDefault(paths);
        if (!ok) throw new Error("open failed");
      },
      failureLabel: t("openFailed")
    },
    {
      id: "reveal-files",
      label: t("openWithReveal"),
      icon: appIcon2("explorer"),
      run: async () => {
        const ok = await revealFiles(paths);
        if (!ok) throw new Error("reveal failed");
      },
      failureLabel: t("openFailed")
    }
  ];
}
function scheduleFileAppsRefresh(paths) {
  const run = () => refreshFileApplications(paths).catch(() => {
  });
  if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
    window.setTimeout(run, 0);
    return;
  }
  Promise.resolve().then(run);
}
function fileOpenWithActions(paths, t) {
  const apps = appsSnapshot();
  const pinnedIds = new Set(effectivePinned(apps.ids).filter((id) => childOn(id)));
  const snapshot = peekFileApplications(paths);
  if (snapshot === void 0) {
    scheduleFileAppsRefresh(paths);
    return fileOpenResult(t, [], fileFallbackActions(paths, t));
  }
  if (snapshot.stale) scheduleFileAppsRefresh(paths);
  const fileApps = snapshot.apps;
  if (fileApps === null) {
    return fileOpenResult(t, [], fileFallbackActions(paths, t));
  }
  const enabled = fileApps.filter((app) => childOn(app.id));
  const pinnedApps = enabled.filter((app) => pinnedIds.has(app.id));
  const submenuApps = enabled.filter((app) => !pinnedIds.has(app.id));
  let children;
  if (fileApps.length === 0) {
    children = [...fileFallbackActions(paths, t), placeholder(t, "openWithNoHandlers")];
  } else if (submenuApps.length === 0) {
    children = [placeholder(t, enabled.length === 0 ? "settings.appsAllOff" : "openWithNoHandlers")];
  } else {
    children = submenuApps.map((app) => ({
      id: `app-${app.id}`,
      label: fileAppLabel(app, t),
      icon: fileAppIcon2(app),
      run: async () => {
        const ok = await openFilesWith(paths, app.id);
        if (!ok) throw new Error("open failed");
      },
      failureLabel: t("openFailed")
    }));
  }
  return fileOpenResult(t, pinnedApps.map((app) => ({
    id: `pinned-${app.id}`,
    label: t("openWithApp", { name: fileAppLabel(app, t) }),
    icon: fileAppIcon2(app),
    run: async () => {
      const ok = await openFilesWith(paths, app.id);
      if (!ok) throw new Error("open failed");
    },
    failureLabel: t("openFailed")
  })), children);
}
function directoryOpenWithActions(cwd, t) {
  const apps = appsSnapshot();
  ensureApps();
  const pinned = effectivePinned(apps.ids).filter((id) => childOn(id));
  const pinnedSet = new Set(pinned);
  const enabled = apps.ids.filter((id) => childOn(id));
  const submenu = enabled.filter((id) => !pinnedSet.has(id));
  let children;
  if (apps.status === "error") children = [placeholder(t, "settings.appsError")];
  else if (apps.ids.length === 0) {
    children = [placeholder(t, apps.status === "loading" ? "settings.appsLoading" : "settings.appsUnavailable")];
  } else if (submenu.length === 0) children = [placeholder(t, "settings.appsAllOff")];
  else {
    children = submenu.map((id) => ({
      id: `app-${id}`,
      label: appLabel(id, t),
      icon: appIcon2(id),
      run: async () => {
        const ok = await openApplication(id, cwd);
        if (!ok) throw new Error("open failed");
      },
      failureLabel: t("openFailed")
    }));
  }
  return {
    pinned: pinned.map((id) => ({
      id: `pinned-${id}`,
      label: t("openWithApp", { name: appLabel(id, t) }),
      icon: appIcon2(id),
      run: async () => {
        const ok = await openApplication(id, cwd);
        if (!ok) throw new Error("open failed");
      },
      failureLabel: t("openFailed")
    })),
    openWith: {
      id: "open-with",
      label: t("openWith"),
      icon: { key: "sidebar-row-menu.open-with" },
      children
    }
  };
}
async function openWithGroup(filePaths, cwd, t) {
  if (filePaths.length > 0) {
    const group = fileOpenWithActions(filePaths, t);
    if (group.openWith !== null && filePaths.length > 1 && Array.isArray(group.openWith.children)) {
      group.openWith.children.unshift({
        id: "open-with-files-note",
        label: t("openWithFiles", { count: String(filePaths.length) }),
        disabled: true
      });
    }
    return group;
  }
  return directoryOpenWithActions(cwd, t);
}
async function conversationActions(ctx, target) {
  const t = localeOf(ctx);
  const sessionId = typeof target?.sessionId === "string" ? target.sessionId : "";
  const cwd = typeof target?.cwd === "string" ? target.cwd : "";
  const filePaths = Array.isArray(target?.paths) ? target.paths.filter((path) => typeof path === "string" && path !== "") : [];
  const items = collectHeaderToolbarItems(activeSessionHeader(), blankOption("keepMoreLast"));
  if (items.length === 0) return [];
  const settings = itemsSnapshot();
  ensureApps();
  const targets = filePaths.length > 0 ? filePaths : cwd !== "" ? [cwd] : [];
  const hasOpenWithItem = items.some((item) => item.openWith);
  const canOpenWith = settings.openWith !== false && targets.length > 0;
  const actions = [];
  let section = "";
  const takeSeparator = (next) => {
    const separator = section !== "" && section !== next;
    section = next;
    return separator;
  };
  let openWithDone = false;
  const pushOpenWith = async () => {
    if (!canOpenWith || openWithDone) return;
    openWithDone = true;
    let group;
    try {
      group = await openWithGroup(filePaths, cwd, t);
    } catch (error) {
      console.warn("[dsh-sidebar-row-menu] native open-with failed:", error);
      group = { pinned: [], openWith: null };
    }
    if (group.openWith === null) return;
    const separator = takeSeparator("open-with");
    const combined = [...group.pinned, group.openWith];
    combined.forEach((action, position) => {
      if (separator && position === 0) action.separatorBefore = true;
      actions.push(action);
    });
  };
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item.stats && blankOption("showCostMeter") !== true) continue;
    if (item.openWith) {
      await pushOpenWith();
      continue;
    }
    if (item.more && item.menu !== null && item.menu !== void 0) {
      if (!hasOpenWithItem) await pushOpenWith();
      const entries = moreSubmenuItems(item.menu);
      const select = moreSelectHandler(item.menu, entries);
      const separator2 = takeSeparator("more");
      const icon2 = toolbarIcon(item.icon);
      actions.push({
        id: `more-${index}`,
        label: item.label,
        ...icon2 === void 0 ? {} : { icon: icon2 },
        ...separator2 ? { separatorBefore: true } : {},
        children: entries.map((entry, position) => ({
          id: `more-item-${position}`,
          label: entry.label,
          disabled: entry.disabled === true,
          run: () => select(entry.id)
        }))
      });
      continue;
    }
    const separator = takeSeparator(item.openWith ? "open-with" : item.more ? "more" : item.section || "toolbar");
    const icon = toolbarIcon(item.icon);
    actions.push({
      id: `toolbar-${index}`,
      label: item.label,
      ...icon === void 0 ? {} : { icon },
      ...separator ? { separatorBefore: true } : {},
      run: clickAction(item)
    });
  }
  if (!hasOpenWithItem) await pushOpenWith();
  return actions;
}
function ensureRegistered(ctx) {
  if (menus !== null) return true;
  const service = contextMenusOf(ctx);
  if (service === null || typeof service.open !== "function") return false;
  if (iconRegistration === null && ctx.slots !== null && ctx.slots !== void 0) {
    try {
      iconRegistration = ctx.slots.inject("contextMenu.icon", function* () {
        yield ctx.slots.register(
          { name: "contextMenu.icon", key: TOOLBAR_ICON_KEY },
          ContextMenuToolbarIcon
        );
      });
    } catch (error) {
      console.warn("[dsh-sidebar-row-menu] conversation icon registration failed:", error);
    }
  }
  try {
    unregister = service.register({
      id: "sidebar-row-menu.conversation",
      target: TARGET_KIND,
      order: 300,
      observe: () => [itemsSource, childrenSource, pinnedSource, blankMenuSource, appsSource, fileAppsSource],
      resolve: (target) => conversationActions(ctx, target)
    });
    menus = service;
    return true;
  } catch (error) {
    console.warn("[dsh-sidebar-row-menu] conversation context registration failed:", error);
    unregister = null;
    return false;
  }
}
function openNativeConversationMenu(ctx, event, sessionId, fileTarget) {
  if (!hasNativeSessionMenu()) return false;
  if (!ensureRegistered(ctx)) return false;
  const cwd = typeof sessionId === "string" && sessionId !== "" ? sessionCwd(ctx, sessionId) : "";
  const paths = Array.isArray(fileTarget?.paths) ? fileTarget.paths.filter((path) => typeof path === "string" && path !== "") : [];
  try {
    menus.open(
      { kind: TARGET_KIND, value: { sessionId, cwd, paths } },
      { x: event.clientX, y: event.clientY }
    );
    return true;
  } catch (error) {
    console.warn("[dsh-sidebar-row-menu] native conversation menu failed:", error);
    return false;
  }
}
function stopNativeConversationMenu() {
  const dispose = unregister;
  const disposeIcons = iconRegistration;
  unregister = null;
  iconRegistration = null;
  menus = null;
  try {
    dispose?.();
  } catch {
  }
  try {
    disposeIcons?.();
  } catch {
  }
}

// src/client/features/delete-dialog.js
function DeleteDialog({ t }) {
  const request = useDeleteRequest();
  if (request === null) return null;
  return (0, import_jsx_runtime.jsx)(DeleteConfirmForm, { key: request.seq, request, t });
}
function DeleteConfirmForm({ request, t }) {
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [partial, setPartial] = (0, import_react.useState)(null);
  const workspace = request.mode === "workspace";
  const bulk = request.mode === "archived";
  const ids = workspace ? Array.isArray(request.sessionIds) ? request.sessionIds : [] : bulk ? request.sessionIds : [request.sessionId];
  const close = () => {
    if (!busy) closeDelete();
  };
  const confirm = () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setPartial(null);
    const wasMain = ids.some((id) => isMainSession(id));
    void (async () => {
      try {
        const result = workspace ? await postWorkspaceDelete(request.workspaceId) : await postDelete(ids);
        if (result.ok !== true && (result.deleted ?? 0) === 0) {
          const reason = typeof result.error === "string" && result.error !== "" ? result.error : t("delete.unavailable");
          throw new Error(reason);
        }
        if (!workspace && (result.deleted ?? 0) === 0 && (result.missing ?? 0) > 0) {
          if (wasMain) serviceOf(rootCtx, "uiWorkspace")?.clearMain?.();
          closeDelete();
          toast(t("delete.alreadyGone"), "success");
          return;
        }
        if (workspace) {
          if (result.ok !== true) {
            setPartial({ done: result.deleted ?? 0, failed: result.failed ?? 0, workspace: true });
            return;
          }
          if (wasMain) serviceOf(rootCtx, "uiWorkspace")?.clearMain?.();
          closeDelete();
          toast(
            (result.deleted ?? 0) > 0 ? t("delete.workspaceDone", { n: result.deleted ?? 0 }) : t("delete.workspaceEmptyDone"),
            "success"
          );
          return;
        }
        if (wasMain) serviceOf(rootCtx, "uiWorkspace")?.clearMain?.();
        if ((result.failed ?? 0) > 0) {
          setPartial({ done: result.deleted ?? 0, failed: result.failed });
          return;
        }
        closeDelete();
        toast(bulk ? t("delete.doneMany", { n: result.deleted ?? ids.length }) : t("delete.done"), "success");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        setBusy(false);
      }
    })();
  };
  return (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Modal, {
    open: true,
    onClose: close,
    closeLabel: t("delete.cancel"),
    title: workspace ? t("delete.workspaceTitle") : bulk ? t("delete.archivedTitle") : t("delete.title"),
    description: workspace ? ids.length > 0 ? t("delete.workspaceDescription", { name: request.displayTitle ?? "", n: ids.length }) : t("delete.workspaceEmptyDescription", { name: request.displayTitle ?? "" }) : bulk ? t("delete.archivedDescription", { n: ids.length }) : t("delete.description", { name: request.displayTitle || t("delete.untitled") }),
    footer: h(
      import_react.Fragment,
      null,
      (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", disabled: busy, onClick: close, children: t("delete.cancel") }),
      (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, {
        variant: "outline",
        disabled: busy,
        onClick: confirm,
        children: h("span", { className: "dsrm-danger-label" }, workspace ? t("delete.workspaceConfirm") : bulk ? t("delete.archivedConfirm") : t("delete.confirm"))
      })
    ),
    children: [
      busy ? h("div", { className: "dsrm-status-text", role: "status", key: "busy" }, workspace ? t("delete.workspacePending") : bulk ? t("delete.archivedPending") : t("delete.pending")) : null,
      partial !== null ? h("div", { className: "dsrm-status-text", role: "status", key: "partial" }, partial.workspace ? t("delete.workspacePartial", { done: partial.done, failed: partial.failed }) : t("delete.archivedPartial", { done: partial.done, failed: partial.failed })) : null,
      error !== null ? h("div", { className: "dsrm-error-text", role: "alert", key: "error" }, t("delete.failed", { message: error })) : null
    ]
  });
}
function registerDeleteDialog(ctx) {
  return ctx.slots.inject("shell.overlay", function* () {
    yield ctx.slots.register({
      name: "shell.overlay",
      id: "sidebar-row-menu-delete-dialog",
      order: 60,
      locale: NS
    }, DeleteDialog);
  });
}

// src/client/features/file-target.js
var ABSOLUTE_PATH = /^(?:[A-Za-z]:[\\/]|\\\\|\/)/;
var MAX_PATH_LENGTH = 1024;
function elementOf(target) {
  if (target === null || target === void 0) return null;
  return target.nodeType === 3 ? target.parentElement : target;
}
function absolutePath(value, cwd) {
  const raw = String(value ?? "").trim();
  if (raw === "" || raw.length > MAX_PATH_LENGTH) return "";
  if (ABSOLUTE_PATH.test(raw)) return raw;
  if (typeof cwd !== "string" || cwd === "") return "";
  const base = cwd.replace(/[\\/]+$/, "");
  const separator = base.includes("\\") ? "\\" : "/";
  const rest = raw.replace(/^[\\/]+/, "").split(/[\\/]/).filter((part) => part !== "" && part !== ".");
  if (rest.length === 0) return "";
  return base + separator + rest.join(separator);
}
function collectPaths(values, cwd) {
  const seen = /* @__PURE__ */ new Set();
  const paths = [];
  for (const value of values) {
    const path = absolutePath(value, cwd);
    if (path === "" || seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }
  return paths;
}
function hiddenTexts(scope) {
  if (scope === null || scope === void 0 || typeof scope.querySelectorAll !== "function") return [];
  const values = [];
  for (const node of scope.querySelectorAll("span[hidden]")) {
    if (typeof node?.textContent === "string") values.push(node.textContent);
  }
  return values;
}
function attributeOf(node, name2) {
  if (node === null || node === void 0 || typeof node.getAttribute !== "function") return "";
  const value = node.getAttribute(name2);
  return typeof value === "string" ? value : "";
}
function changedFilesTarget(start, cwd) {
  const card = start.closest("[data-changed-files]");
  if (card === null) return null;
  const row = start.closest("li");
  const insideRow = row !== null && typeof card.contains === "function" && card.contains(row);
  const paths = collectPaths(hiddenTexts(insideRow ? row : card), cwd);
  if (paths.length === 0) return null;
  return { kind: "changed-files", paths };
}
function presentedTarget(start, cwd) {
  const card = start.closest("[data-presented-file]");
  if (card === null) return null;
  const titled = typeof card.querySelector === "function" ? card.querySelector("[title]") : null;
  const paths = collectPaths([attributeOf(titled, "title"), attributeOf(card, "title")], cwd);
  if (paths.length === 0) return null;
  return { kind: "presented", paths };
}
function attachmentsTarget(start, cwd) {
  const row = start.closest("[data-message-attachments]");
  if (row === null) return null;
  const chip = start.closest("[title]");
  const scope = chip !== null && typeof row.contains === "function" && row.contains(chip) ? chip : row;
  const values = [];
  if (scope === chip) values.push(attributeOf(chip, "title"));
  else if (typeof row.querySelectorAll === "function") {
    for (const node of row.querySelectorAll("[title]")) values.push(attributeOf(node, "title"));
  }
  if (values.length === 0) values.push(attributeOf(row, "title"));
  const absolute = values.filter((value) => ABSOLUTE_PATH.test(String(value ?? "").trim()));
  if (absolute.length === 0) return null;
  const paths = collectPaths(absolute, cwd);
  if (paths.length === 0) return null;
  return { kind: "attachments", paths };
}
function refChipTarget(start, cwd) {
  const chip = start.closest("[data-ref-chip]");
  if (chip === null) return null;
  const kind = attributeOf(chip, "data-ref-chip");
  if (kind !== "" && kind !== "file") return null;
  const text = String(chip.textContent ?? "").replace(/^@/, "");
  const paths = collectPaths([text, attributeOf(chip, "title")], cwd);
  if (paths.length === 0) return null;
  return { kind: "ref-chip", paths };
}
function titledTarget(start, cwd) {
  const node = start.closest("[title]");
  if (node === null) return null;
  const title = attributeOf(node, "title").trim();
  if (!ABSOLUTE_PATH.test(title)) return null;
  const paths = collectPaths([title], cwd);
  if (paths.length === 0) return null;
  return { kind: "title", paths };
}
function fileTargetAt(target, cwd) {
  const start = elementOf(target);
  if (start === null || typeof start.closest !== "function") return null;
  const resolvers = [changedFilesTarget, presentedTarget, attachmentsTarget, refChipTarget, titledTarget];
  for (const resolve of resolvers) {
    let found = null;
    try {
      found = resolve(start, typeof cwd === "string" ? cwd : "");
    } catch {
      found = null;
    }
    if (found !== null && Array.isArray(found.paths) && found.paths.length > 0) return found;
  }
  return null;
}

// src/client/features/session-menu-native.js
var itemsSource2 = { getSnapshot: itemsSnapshot, subscribe: subscribeItems };
var childrenSource2 = { getSnapshot: childrenSnapshot, subscribe: subscribeChildren };
var pinnedSource2 = { getSnapshot: pinnedSnapshot, subscribe: subscribePinned };
var placementsSource = { getSnapshot: placementsSnapshot, subscribe: subscribePlacements };
var archivedSource = { getSnapshot: archivedSnapshot, subscribe: subscribeArchived };
function placementVisible(key) {
  return placementOn(key, currentMenuGesture());
}
function placeholder2(t, key) {
  return { id: "placeholder", label: t(key), disabled: true };
}
function openApp(ctx, appId, sessionId, t) {
  const cwd = sessionCwd(ctx, sessionId);
  if (cwd === "") {
    toast(t("noPath"));
    return;
  }
  openApplication(appId, cwd).then((ok) => {
    if (!ok) toast(t("openFailed"));
  });
}
function openWithAction(ctx, target, t) {
  if (itemsSnapshot().openWith === false || takenOver("openWith")) return [];
  const sessionId = target?.sessionId ?? "";
  const apps = appsSnapshot();
  ensureApps();
  const pinned = effectivePinned(apps.ids).filter((id) => childOn(id));
  const pinnedSet = new Set(pinned);
  const enabled = apps.ids.filter((id) => childOn(id));
  const submenu = enabled.filter((id) => !pinnedSet.has(id));
  if (apps.status !== "loading" && enabled.length > 0 && submenu.length === 0) return [];
  let children;
  if (apps.status === "error") {
    children = [placeholder2(t, "settings.appsError")];
  } else if (apps.ids.length === 0) {
    children = [placeholder2(t, apps.status === "loading" ? "settings.appsLoading" : "settings.appsUnavailable")];
  } else if (submenu.length === 0) {
    children = [placeholder2(t, "settings.appsAllOff")];
  } else {
    children = submenu.map((id) => ({
      id: `app-${id}`,
      label: appLabel(id, t),
      icon: { key: "sidebar-row-menu.app", src: ICON_ROUTE + encodeURIComponent(id) },
      run: () => openApp(ctx, id, sessionId, t)
    }));
  }
  const dedupe = currentMenuGesture() === "context" ? " dsrm-native-dedupe" : "";
  return [{
    id: "sidebar-row-menu.session.open-with",
    // 宿主 0.2.2-rc.2 起自己画箭头；更早的宿主走 slot 注入，不会用到这段。
    // 保留插件箭头兜底，styles.js 检测到宿主箭头时隐藏它，避免叠成两个。
    label: h(
      "span",
      { className: `dsrm-host-label${dedupe}` },
      h("span", { className: "dsrm-host-label-text" }, t("openWith")),
      (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 12, className: "dsrm-submenu-chevron" })
    ),
    icon: { key: "sidebar-row-menu.open-with" },
    separatorBefore: apps.status === "ready" && pinned.length === 0,
    children
  }];
}
function pinnedActions(ctx, target, t) {
  if (itemsSnapshot().openWith === false || takenOver("openWith")) return [];
  ensureApps();
  const sessionId = target?.sessionId ?? "";
  const apps = appsSnapshot();
  const picked = effectivePinned(apps.ids).filter((id) => childOn(id));
  return picked.map((id, index) => ({
    id: `pinned-${id}`,
    separatorBefore: index === 0,
    label: t("openWithApp", { name: appLabel(id, t) }),
    icon: { key: "sidebar-row-menu.app", src: ICON_ROUTE + encodeURIComponent(id) },
    run: () => openApp(ctx, id, sessionId, t)
  }));
}
function deleteAction(ctx, target, t) {
  const items = itemsSnapshot();
  if (items.deleteSession === false || takenOver("deleteSession")) return [];
  const sessionId = target?.sessionId ?? "";
  const displayTitle = target?.displayTitle ?? "";
  if (!archivedSnapshot().has(sessionId) && items.deleteUnarchived !== true) return [];
  return [{
    id: "sidebar-row-menu.session.delete",
    danger: true,
    separatorBefore: true,
    label: t("deleteSession"),
    icon: { key: "sidebar-row-menu.delete" },
    run: () => requestDelete({ mode: "one", sessionId, displayTitle })
  }];
}
function deleteArchivedAction(ctx, target, t) {
  const items = itemsSnapshot();
  if (items.deleteArchived === false || takenOver("deleteArchived")) return [];
  const archived = archivedSnapshot();
  if (!archived.has(target?.sessionId ?? "")) return [];
  const displayTitle = target?.displayTitle ?? "";
  return [{
    id: "sidebar-row-menu.session.delete-archived",
    danger: true,
    separatorBefore: items.deleteSession === false || takenOver("deleteSession"),
    label: t("deleteArchived"),
    icon: { key: "sidebar-row-menu.delete" },
    run: () => {
      const ids = [...archived];
      if (ids.length === 0) return;
      requestDelete({ mode: "archived", sessionIds: ids, displayTitle });
    }
  }];
}
var SESSION_GROUPS = [
  { key: "pinned", order: 495, placement: "sessionOpenWith", observe: () => [appsSource, pinnedSource2, childrenSource2, itemsSource2, placementsSource], build: pinnedActions },
  { key: "open-with", order: 500, placement: "sessionOpenWith", observe: () => [appsSource, pinnedSource2, childrenSource2, itemsSource2, placementsSource], build: openWithAction },
  { key: "delete", order: 510, placement: "sessionDelete", observe: () => [archivedSource, itemsSource2, placementsSource], build: deleteAction },
  { key: "delete-archived", order: 520, placement: "sessionDeleteArchived", observe: () => [archivedSource, itemsSource2, placementsSource], build: deleteArchivedAction }
];
function registerNativeSessionMenu(ctx) {
  const menus2 = contextMenusOf(ctx);
  if (menus2 === null) return null;
  const disposers = [];
  for (const group of SESSION_GROUPS) {
    try {
      disposers.push(menus2.register({
        id: `sidebar-row-menu.session.${group.key}`,
        target: "session",
        order: group.order,
        observe: group.observe,
        resolve: (target) => {
          if (!placementVisible(group.placement)) return [];
          return group.build(ctx, target, localeOf(ctx));
        }
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
      }
    }
  };
}

// src/client/features/session-menu.js
function registerSlotSessionMenu(ctx) {
  if (ctx?.slots === null || ctx?.slots === void 0) return null;
  try {
    return ctx.slots.inject(SESSION_MENU_SLOT, function* () {
      yield ctx.slots.register({
        name: SESSION_MENU_SLOT,
        id: "row-menu-open-with-pinned",
        order: 495,
        locale: NS
      }, SessionOpenWithPinnedMenuItem);
      yield ctx.slots.register({
        name: SESSION_MENU_SLOT,
        id: "row-menu-open-with",
        order: 500,
        locale: NS
      }, SessionOpenWithMenuItem);
      yield ctx.slots.register({
        name: SESSION_MENU_SLOT,
        id: "row-menu-delete-session",
        order: 510,
        locale: NS
      }, SessionDeleteMenuItem);
      yield ctx.slots.register({
        name: SESSION_MENU_SLOT,
        id: "row-menu-delete-archived",
        order: 520,
        locale: NS
      }, SessionDeleteArchivedMenuItem);
    });
  } catch (error) {
    console.warn("[dsh-sidebar-row-menu] session slot registration failed:", error);
    return null;
  }
}
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
      if (attempts >= 40 || typeof setTimeout !== "function") {
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
      console.warn("[dsh-sidebar-row-menu] session context teardown failed:", error);
    }
    try {
      stopSlots?.();
    } catch (error) {
      console.warn("[dsh-sidebar-row-menu] session slot teardown failed:", error);
    }
  };
}

// src/client/features/row-context.js
function onBlankConversationContextMenu(event) {
  if (!blankOption("enabled")) return;
  if (!isBlankConversationTarget(event.target)) return;
  const items = collectHeaderToolbarItems(activeSessionHeader(), blankOption("keepMoreLast"));
  if (items.length === 0) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  try {
    ensureApps();
  } catch {
  }
  try {
    const sessionId = selectedSessionId();
    const fileTarget = fileTargetAt(event.target, sessionId === "" ? "" : sessionCwd(rootCtx, sessionId));
    if (openNativeConversationMenu(rootCtx, event, sessionId, fileTarget)) return;
    openHeaderToolbarMenu(items, event.clientX, event.clientY, sessionId, fileTarget);
  } catch (error) {
    console.warn("[dsh-sidebar-row-menu] blank context menu failed:", error);
  }
}
function onWorkspaceEllipsisClick(event) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.target === null || event.target === void 0) return;
  if (rootCtx === null || !workspaceEllipsisOn()) return;
  if (contextMenusOf(rootCtx) !== null) return;
  const target = event.target;
  if (typeof target.closest !== "function") return;
  const row = target.closest("[data-row-key]");
  if (row === null) return;
  const rowKey = row.getAttribute("data-row-key") ?? "";
  if (!rowKey.startsWith("workspace:")) return;
  const button = target.closest("button");
  if (button === null || !row.contains(button)) return;
  const buttons = row.querySelectorAll("button");
  if (buttons.length === 0 || buttons[0] !== button) return;
  if (button.getAttribute("aria-keyshortcuts") !== null) return;
  const props = resolveWorkspaceRow(target);
  if (props === null) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  if (menuHost !== null && ellipsisTrigger === button) {
    closeMenu();
    return;
  }
  const rect = button.getBoundingClientRect();
  openWorkspaceMenu(props, rect.left + rect.width, rect.bottom + 4, "ellipsis");
  setEllipsisTrigger(button);
}
var anchorPatch = null;
var menuLeaveGuard = null;
function releaseMenuLeaveGuard() {
  const guard = menuLeaveGuard;
  menuLeaveGuard = null;
  if (guard === null) return;
  document.removeEventListener("pointerout", guard.block, true);
  document.removeEventListener("pointerover", guard.block, true);
}
function guardMenuLeave(panel, trigger) {
  releaseMenuLeaveGuard();
  const inside = (node) => {
    if (node === null || node === void 0) return false;
    return panel.contains(node) || trigger !== null && trigger !== void 0 && trigger.contains(node);
  };
  const block = (event) => {
    if (inside(event.target) || inside(event.relatedTarget)) {
      event.stopPropagation();
    }
  };
  document.addEventListener("pointerout", block, true);
  document.addEventListener("pointerover", block, true);
  menuLeaveGuard = { block };
}
function anchorRectAt(x, y) {
  return { left: x, right: x, top: y, bottom: y, width: 0, height: 0, x, y };
}
function restoreAnchorRect() {
  const patch = anchorPatch;
  anchorPatch = null;
  releaseMenuLeaveGuard();
  if (patch === null) return;
  if (patch.observer !== null) patch.observer.disconnect();
  for (const item of patch.items) {
    try {
      item.el.getBoundingClientRect = item.original;
    } catch {
    }
  }
}
function patchAnchorRect(button, x, y) {
  restoreAnchorRect();
  if (button === null || button === void 0 || typeof button.getBoundingClientRect !== "function") return;
  const items = [];
  let element = button;
  for (let level = 0; level < 3 && element !== null && element !== void 0; level += 1) {
    items.push({ el: element, original: element.getBoundingClientRect });
    element = element.parentElement;
  }
  const rect = anchorRectAt(x, y);
  for (const item of items) item.el.getBoundingClientRect = () => rect;
  let observer = null;
  if (typeof MutationObserver === "function" && document.body !== null) {
    observer = new MutationObserver(() => {
      const panels = document.querySelectorAll('[role="menu"]');
      const panel = panels.length === 0 ? null : panels[panels.length - 1];
      if (panel === null) {
        restoreAnchorRect();
        return;
      }
      if (anchorPatch !== null && anchorPatch.panel !== panel) {
        anchorPatch.panel = panel;
        guardMenuLeave(panel, button);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  anchorPatch = { items, observer, panel: null };
  window.setTimeout(() => {
    if (anchorPatch !== null && document.querySelector('[role="menu"]') === null) restoreAnchorRect();
  }, 3e3);
}
function findMenuProps(node, depth, budget) {
  if (node === null || node === void 0 || depth > 18 || budget.count > 600) return null;
  budget.count += 1;
  const props = node.memoizedProps;
  if (props !== null && typeof props === "object" && typeof props.open === "boolean" && props.anchor !== null && typeof props.anchor === "object" && props.anchor.props !== null && typeof props.anchor.props.onClick === "function") {
    return props;
  }
  for (let child = node.child; child !== null && child !== void 0; child = child.sibling) {
    const found = findMenuProps(child, depth + 1, budget);
    if (found !== null) return found;
  }
  return null;
}
function primeRowActionPointer(trigger) {
  if (trigger === null || trigger === void 0 || typeof trigger.dispatchEvent !== "function") return;
  if (typeof PointerEvent !== "function") return;
  try {
    trigger.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
      buttons: 1
    }));
  } catch {
  }
}
function openSessionRowMenu(row, x, y) {
  const trigger = typeof row.querySelector === "function" ? row.querySelector('[class*="rowActions"] button') : null;
  const fiber = fiberOf(row);
  const menu = fiber === null ? null : findMenuProps(fiber.child, 0, { count: 0 });
  if (menu !== null && menu.open === true) return;
  patchAnchorRect(trigger, x, y);
  markRightClickMenu();
  primeRowActionPointer(trigger);
  if (menu !== null) {
    menu.anchor.props.onClick();
    return;
  }
  if (trigger !== null) trigger.click();
}
function hasNativeRowMenu(row) {
  const fiber = fiberOf(row);
  const props = fiber === null ? null : fiber.memoizedProps;
  return props !== null && props !== void 0 && typeof props.onContextMenu === "function";
}
function onContextMenu(event) {
  if (event.defaultPrevented) return;
  const target = event.target;
  if (target === null || target === void 0) return;
  const start = target.nodeType === 3 ? target.parentElement : target;
  if (start === null || start === void 0 || typeof start.closest !== "function") return;
  const row = start.closest("[data-row-key]");
  if (row === null) {
    onBlankConversationContextMenu(event);
    return;
  }
  const rowKey = row.getAttribute("data-row-key") ?? "";
  if (!rowKey.startsWith("workspace:") && !rowKey.startsWith("session:")) return;
  if (hasNativeRowMenu(row)) {
    if (rowKey.startsWith("session:") && resolveSessionRow(start) === null) return;
    markRightClickMenu();
    primeRowActionPointer(typeof row.querySelector === "function" ? row.querySelector('[class*="rowActions"] button') : null);
    return;
  }
  if (rowKey.startsWith("workspace:")) {
    const props = resolveWorkspaceRow(start);
    if (props === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    try {
      openWorkspaceMenu(props, event.clientX, event.clientY);
    } catch (error) {
      console.warn("[dsh-sidebar-row-menu] workspace menu failed:", error);
    }
    return;
  }
  if (resolveSessionRow(start) === null) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  openSessionRowMenu(row, event.clientX, event.clientY);
}
function onRowActionsPointerDown(event) {
  if (event.isTrusted === false) return;
  const target = event.target;
  if (target === null || target === void 0) return;
  const start = target.nodeType === 3 ? target.parentElement : target;
  if (start === null || start === void 0 || typeof start.closest !== "function") return;
  if (start.closest('[class*="rowActions"]') === null) return;
  clearRightClickMark();
}
function install() {
  window.addEventListener("contextmenu", onContextMenu, true);
  document.addEventListener("pointerdown", onRowActionsPointerDown, true);
  document.addEventListener("click", onWorkspaceEllipsisClick, true);
  console.info("[dsh-sidebar-row-menu] installed");
  return () => {
    window.removeEventListener("contextmenu", onContextMenu, true);
    document.removeEventListener("pointerdown", onRowActionsPointerDown, true);
    document.removeEventListener("click", onWorkspaceEllipsisClick, true);
    closeMenu();
    closeToast();
  };
}

// src/client/features/settings.js
var SETTINGS_ROWS = [
  ["openWith", "settings.openWith.label", "settings.openWith.hint"],
  ["deleteSession", "settings.deleteSession.label", "settings.deleteSession.hint"],
  ["deleteUnarchived", "settings.deleteUnarchived.label", "settings.deleteUnarchived.hint"],
  ["deleteArchived", "settings.deleteArchived.label", "settings.deleteArchived.hint"],
  ["archivedSessions", "settings.archivedSessions.label", "settings.archivedSessions.hint"]
];
var PLACEMENT_ROWS = [
  ["workspace", "settings.ellipsisWorkspace", [
    ["newSession", "settings.ellipsis.newSession.label", "settings.ellipsis.newSession.hint"],
    ["permissionDefault", "settings.ellipsis.permissionDefault.label", "settings.ellipsis.permissionDefault.hint"],
    ["openWith", "settings.ellipsis.openWith.label", "settings.ellipsis.openWith.hint"],
    ["copyPath", "settings.ellipsis.copyPath.label", "settings.ellipsis.copyPath.hint"],
    ["openInTab", "settings.ellipsis.openInTab.label", "settings.ellipsis.openInTab.hint"],
    ["showArchived", "settings.ellipsis.showArchived.label", "settings.ellipsis.showArchived.hint"],
    ["deleteSessions", "settings.ellipsis.deleteSessions.label", "settings.ellipsis.deleteSessions.hint"]
  ]],
  ["session", "settings.ellipsisSession", [
    ["sessionOpenWith", "settings.ellipsis.sessionOpenWith.label", "settings.ellipsis.sessionOpenWith.hint"],
    ["sessionDelete", "settings.ellipsis.sessionDelete.label", "settings.ellipsis.sessionDelete.hint"],
    ["sessionDeleteArchived", "settings.ellipsis.sessionDeleteArchived.label", "settings.ellipsis.sessionDeleteArchived.hint"]
  ]]
];
var BLANK_MENU_ROWS = [
  ["enabled", "settings.blankMenu.enabled.label", "settings.blankMenu.enabled.hint"],
  ["keepMoreLast", "settings.blankMenu.keepMoreLast.label", "settings.blankMenu.keepMoreLast.hint"],
  ["showCostMeter", "settings.blankMenu.showCostMeter.label", "settings.blankMenu.showCostMeter.hint"]
];
function SettingsNavIcon({ size = 16 } = {}) {
  return h("svg", {
    className: "dsrm-settings-nav",
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    focusable: "false"
  }, [
    h("path", { d: "M2.75 4.5h8.35" }),
    h("path", { d: "M2.75 8h8.35" }),
    h("path", { d: "M2.75 11.5h5.6" }),
    h("path", { d: "M12.1 6.5 13.6 8l-1.5 1.5" })
  ]);
}
function SettingsSection({ t }) {
  const items = useItems();
  const placements = usePlacements();
  const blank = useBlankMenu();
  const children = useChildren();
  const apps = useApps();
  usePinned();
  const [expanded, setExpanded] = (0, import_react.useState)(false);
  const anyConflict = takenOver("openWith") || takenOver("deleteSession") || takenOver("deleteArchived");
  const locked = items.openWith === false;
  const pinnedIds = new Set(effectivePinned(apps.ids));
  (0, import_react.useEffect)(() => {
    if (expanded) ensureApps();
  }, [expanded]);
  const toggleExpanded = () => {
    setExpanded(!expanded);
    if (!expanded) ensureApps();
  };
  const childRows = expanded ? h(
    "div",
    { className: "dsrm-settings-children" },
    apps.status === "error" ? h("div", { className: "dsrm-settings-empty" }, t("settings.appsError")) : apps.ids.length === 0 ? h("div", { className: "dsrm-settings-empty" }, apps.status === "loading" ? t("settings.appsLoading") : t("settings.appsUnavailable")) : apps.ids.map((id) => h(
      "div",
      { className: "dsrm-settings-child", key: id },
      h("span", { className: "dsrm-settings-child-label" }, appLabel(id, t)),
      h(
        "div",
        { className: "dsrm-settings-child-actions" },
        h("button", {
          type: "button",
          className: pinnedIds.has(id) ? "dsrm-pin dsrm-pin-on" : "dsrm-pin",
          "aria-pressed": pinnedIds.has(id),
          disabled: locked || !childOn(id),
          title: t("settings.pinTitle"),
          onClick: () => togglePinned(id, apps.ids)
        }, pinnedIds.has(id) ? t("settings.pinned") : t("settings.pin")),
        (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Switch, {
          checked: childOn(id),
          disabled: locked,
          label: appLabel(id, t),
          title: locked ? t("settings.childLocked", { name: t("settings.openWith.label") }) : void 0,
          onChange: (next) => setChild(id, next)
        })
      )
    ))
  ) : null;
  const rows = SETTINGS_ROWS.flatMap(([key, labelKey, hintKey]) => {
    const lockedByParent = key === "deleteUnarchived" && (items.deleteSession === false || takenOver("deleteSession"));
    const row = h(
      "div",
      { className: "dsrm-settings-row", key },
      h(
        "div",
        { className: "dsrm-settings-copy" },
        h("div", { className: "dsrm-settings-label" }, t(labelKey)),
        h("div", { className: "dsrm-settings-hint" }, takenOver(key) ? t("settings.conflict") : t(hintKey))
      ),
      h(
        "div",
        { className: "dsrm-settings-controls" },
        (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Switch, {
          checked: items[key] === true,
          disabled: takenOver(key) || lockedByParent,
          label: t(labelKey),
          title: lockedByParent ? t("settings.childLocked", { name: t("settings.deleteSession.label") }) : void 0,
          onChange: (next) => setItem(key, next)
        }),
        key === "openWith" ? h("button", {
          type: "button",
          className: "dsrm-expander",
          "aria-expanded": expanded,
          disabled: takenOver(key),
          title: expanded ? t("settings.collapse") : t("settings.expand"),
          onClick: toggleExpanded
        }, (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconTriangleRightFillRegular, {
          size: 10,
          className: expanded ? "dsrm-expander-icon dsrm-expander-open" : "dsrm-expander-icon"
        })) : null
      )
    );
    return key === "openWith" && childRows ? [row, childRows] : [row];
  });
  const placementSwitch = (key, mode, labelKey) => {
    const inContext = showsInContext(key);
    const inEllipsis = showsInEllipsis(key);
    const checked = mode === "context" ? inContext : inEllipsis;
    const locked2 = mode === "context" ? !inEllipsis : !inContext;
    const onChange = (next) => {
      if (mode === "context") {
        setPlacement(key, next ? inEllipsis ? "both" : "context" : "ellipsis");
      } else {
        setPlacement(key, next ? inContext ? "both" : "ellipsis" : "context");
      }
    };
    return h(
      "span",
      { className: "dsrm-placement-choice" },
      h("span", { className: "dsrm-placement-choice-label" }, t(labelKey)),
      (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Switch, {
        checked,
        disabled: locked2,
        label: t(labelKey),
        title: locked2 ? t("settings.placement.locked") : void 0,
        onChange
      })
    );
  };
  const placementGroups = PLACEMENT_ROWS.map(([groupKey, titleKey, rows2]) => h(
    "div",
    {
      className: "dsrm-settings-group",
      key: groupKey
    },
    h("div", { className: "dsrm-settings-group-title" }, t(titleKey)),
    h("div", { className: "dsrm-settings-list" }, rows2.map(([key, labelKey, hintKey]) => h(
      "div",
      {
        className: "dsrm-settings-row",
        key
      },
      h(
        "div",
        { className: "dsrm-settings-copy" },
        h("div", { className: "dsrm-settings-label" }, t(labelKey)),
        h("div", { className: "dsrm-settings-hint" }, t(hintKey))
      ),
      h(
        "div",
        { className: "dsrm-settings-controls dsrm-placement-controls" },
        placementSwitch(key, "context", "settings.placement.context"),
        placementSwitch(key, "ellipsis", "settings.placement.ellipsis")
      )
    )))
  ));
  const blankRows = BLANK_MENU_ROWS.map(([key, labelKey, hintKey]) => h(
    "div",
    {
      className: "dsrm-settings-row",
      key
    },
    h(
      "div",
      { className: "dsrm-settings-copy" },
      h("div", { className: "dsrm-settings-label" }, t(labelKey)),
      h("div", { className: "dsrm-settings-hint" }, t(hintKey))
    ),
    h(
      "div",
      { className: "dsrm-settings-controls" },
      (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Switch, {
        checked: blank[key] !== false,
        disabled: key === "keepMoreLast" && blank.enabled === false,
        label: t(labelKey),
        onChange: (next) => setBlankMenu(key, next)
      })
    )
  ));
  return h(
    "div",
    { className: "dsrm-settings" },
    h("h2", { className: "dsrm-settings-title" }, t("settings.title")),
    anyConflict ? h("div", { className: "dsrm-settings-note" }, t("settings.conflictNote")) : null,
    h("div", { className: "dsrm-settings-list" }, rows),
    h("h2", { className: "dsrm-settings-title dsrm-settings-subtitle" }, t("settings.ellipsisTitle")),
    h("div", { className: "dsrm-settings-note" }, t("settings.ellipsisHint")),
    h("div", { className: "dsrm-settings-groups" }, placementGroups),
    h("h2", { className: "dsrm-settings-title dsrm-settings-subtitle" }, t("settings.blankMenuTitle")),
    h("div", { className: "dsrm-settings-note" }, t("settings.blankMenuNote")),
    h("div", { className: "dsrm-settings-list" }, blankRows)
  );
}
function registerSettings(ctx) {
  const stopSection = ctx.slots.inject("settings.section", function* () {
    yield ctx.slots.register({
      name: "settings.section",
      id: "sidebar-row-menu",
      order: 32,
      label: () => ctx.locale.bind(NS)("settings.title"),
      locale: NS
    }, SettingsSection);
  });
  try {
    ctx.slots.inject("settings.section.icon", function* () {
      yield ctx.slots.register({
        name: "settings.section.icon",
        id: "sidebar-row-menu",
        order: 32
      }, SettingsNavIcon);
    });
  } catch (error) {
    console.warn("[dsh-sidebar-row-menu] settings.section.icon is unavailable:", error);
  }
  return stopSection;
}

// src/client/index.js
var inject = ["locale", "sessions", "workspaces", "slots", "remote", "remote.session"];
var name = "sidebar-row-menu";
function apply(ctx) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  setRootCtx(ctx);
  if (typeof ctx.locale?.register === "function") {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), "sidebar-row-menu: dictionaries");
  }
  const stopSessionMenu = registerSessionMenu(ctx);
  if (ctx.slots !== null && ctx.slots !== void 0) {
    registerDeleteDialog(ctx);
    registerSettings(ctx);
  }
  if (typeof ctx.effect === "function") {
    ctx.effect(() => installStyles(), "sidebar-row-menu: styles");
  }
  const stopWorkspaceMenu = registerWorkspaceContextMenu(ctx);
  const stopArchivedRows = startArchivedRows();
  const teardown = install();
  if (ctx !== null && typeof ctx.effect === "function") {
    ctx.effect(() => () => {
      setRootCtx(null);
      stopSessionMenu?.();
      stopNativeConversationMenu();
      stopWorkspaceMenu();
      stopArchivedRows();
      teardown();
    }, "sidebar-row-menu: row context menus");
  }
}

    return module.exports;
  },
});
