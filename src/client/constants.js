
const OPEN_ENDPOINT = '/dsh-sidebar-row-menu/open';
/** 运行时探测用标记属性（也是离线冒烟测试的抓手）。 */
const MENU_ATTR = 'data-dsh-sidebar-row-menu';
/** 复制反馈的官方 Toast 挂载点。 */
const TOAST_ATTR = 'data-dsh-sidebar-row-menu-toast';
/** 本地化命名空间。 */
const NS = 'sidebar-row-menu';
/** 内置「…」菜单的扩展点；条目由各插件自行注册。 */
const SESSION_MENU_SLOT = 'sidebar.workspaces.session.menu.item';
/** jsx(type, props) 不接受第三个 children 参数，这里统一折算成 props.children。 */
/** 永久删除会话的宿主端点；是否对未归档会话开放由本地开关决定。 */
const DELETE_ENDPOINT = '/dsh-sidebar-row-menu/session/delete';
/** 宿主路由单次接受的最大会话数；批量删除必须按这个上限拆批，否则整批 400。 */
const DELETE_BATCH_LIMIT = 500;
/** 删除「工作区 + 其下全部会话」的宿主端点。 */
const WORKSPACE_DELETE_ENDPOINT = '/dsh-sidebar-row-menu/workspace/delete';
/** 按工作区读写「新会话默认权限」的宿主端点。 */
const PERMISSION_DEFAULTS_ENDPOINT = '/dsh-sidebar-row-menu/permission-defaults';
/** 宿主原生预设的本地化名称；catalog 里的 name 是英文，中文界面用这张表。 */
const PRESET_LABEL_KEYS = {
  'read-only': 'permission.readOnly',
  'workspace-write': 'permission.workspaceWrite',
  'danger-full-access': 'permission.fullAccess',
  auto: 'permission.autoReview',
  custom: 'permission.custom',
};
/** 宿主还没连上时先按内置预设渲染，catalog 到了再替换。 */
const FALLBACK_PRESETS = ['read-only', 'workspace-write', 'danger-full-access'];
/** 官方 open-in-app 的三条路由；用文档相对路径让浏览器自带认证。 */
const APPS_ROUTE = 'open-in-app/apps';
const OPEN_ROUTE = 'open-in-app/open';
const ICON_ROUTE = 'open-in-app/icon/';
/** 菜单项开关（浏览器 localStorage，跟着 profile 走）。 */
const ITEMS_KEY = 'dsh.sidebar-row-menu.items.v1';
const OPEN_WITH_CHILDREN_KEY = 'dsh.sidebar-row-menu.open-with.v1';
/** 置顶到一级菜单的应用 id；未写过时按「编辑器优先」自动挑一个。 */
const OPEN_WITH_PINNED_KEY = 'dsh.sidebar-row-menu.open-with.pinned.v1';
const PIN_PREFERENCE = [
  'vscode', 'vscodeinsiders', 'cursor', 'windsurf', 'zed', 'sublimetext',
  'intellij', 'pycharm', 'webstorm', 'phpstorm', 'goland', 'rider', 'rustrover',
  'androidstudio', 'xcode',
];
/**
 * 各项菜单开关的默认值。删除未归档会话是破坏性能力，默认关闭，
 * 必须在设置里主动开启后才出现在普通会话的右键菜单里。
 */
const ITEM_DEFAULTS = {
  openWith: true,
  archivedSessions: true,
  deleteSession: true,
  deleteArchived: true,
  deleteUnarchived: false,
};
const ITEM_KEYS = Object.keys(ITEM_DEFAULTS);
/**
 * 「右键专属条目是否也放进行尾…菜单」的逐项开关（旧版数据）。
 * 0.2.2 起改用下面的 PLACEMENT_KEY 三态；这里只保留迁移读取。
 */
const ELLIPSIS_KEY = 'dsh.sidebar-row-menu.ellipsis.v1';
/**
 * 每个附加条目在两种入口里的显示位置：
 *   context  只在右键菜单
 *   ellipsis 只在「…」菜单
 *   both     两边都显示
 * 旧版只有一个「同时放进…菜单」布尔值；读取时 true → both、false → context。
 */
const PLACEMENT_KEY = 'dsh.sidebar-row-menu.placement.v1';
const PLACEMENT_VALUES = ['context', 'ellipsis', 'both'];
/**
 * 按工作区「已隐藏归档会话」的集合。宿主只有全局归档筛选（default/show/only），
 * 没有「这个工作区显示归档、那个工作区不显示」的概念，所以这里记住要单独
 * 隐藏归档行的工作区，再把全局筛选开到 show，最后在 DOM 里把其余工作区的
 * 归档行藏起来。
 */
const ARCHIVED_HIDDEN_KEY = 'dsh.sidebar-row-menu.archived-hidden.v1';
const ELLIPSIS_DEFAULTS = {
  newSession: false,
  permissionDefault: false,
  showArchived: false,
  openWith: false,
  copyPath: false,
  openInTab: false,
  deleteSessions: false,
  sessionOpenWith: false,
  sessionDelete: false,
  sessionDeleteArchived: false,
};
const ELLIPSIS_KEYS = Object.keys(ELLIPSIS_DEFAULTS);
/**
 * 会话正文空白处右键菜单：把右上角工具条那排按钮按视觉顺序列成一份纵向菜单。
 * 顺序必须量 getBoundingClientRect：dsh-sidebar-organizer 用 CSS `order`
 * 排序，DOM 顺序不代表屏幕顺序。
 */
const BLANK_MENU_KEY = 'dsh.sidebar-row-menu.blank-menu.v1';
const BLANK_MENU_DEFAULTS = {
  enabled: true,
  keepMoreLast: true,
  showCostMeter: false,
};
const BLANK_MENU_KEYS = Object.keys(BLANK_MENU_DEFAULTS);
/** 「更多操作」类入口的标签；用于按用户要求把它固定在菜单末尾。 */
const MORE_LABEL_RE = /^(more|more tools|more actions|more options|更多|更多工具|更多操作|更多选项)$/i;
/**
 * dsh-sidebar-organizer 记住的「更多操作」弹层行序（按行文字）。它的重排是
 * 给宿主菜单行写 CSS `order`，DOM/数据顺序都不变；本插件的二级菜单要跟它
 * 联动，只能读这份顺序再排序。
 */
const ORGANIZER_MENU_ORDER_KEY = 'dsh.sidebar-organizer.host-menu-order.v1';
/**
 * dsh-sidebar-organizer 把「哪些头部按钮被收进更多操作」记在这份布局里
 * （scopes.header.hidden，按收纳顺序）。它的收纳行只画在宿主弹层中，
 * 不在宿主 Menu 的 items 里，所以自己的二级菜单要照这份记录补行、补次序。
 */
const ORGANIZER_LAYOUT_KEY = 'dsh.sidebar-organizer.layout.v1';
/**
 * dsh-session-menu 注册的同一能力条目 id。检测到对方存在时，本插件对应项
 * 自动隐藏，避免同一份菜单里出现两条一模一样的动作。
 */
const FOREIGN_ITEMS = {
  openWith: 'session-menu-open-with',
  deleteSession: 'session-menu-delete',
  deleteArchived: 'session-menu-delete-archived',
};

/* ------------------------------------------------------------ 文案 */

export { APPS_ROUTE, ARCHIVED_HIDDEN_KEY, BLANK_MENU_DEFAULTS, BLANK_MENU_KEY, BLANK_MENU_KEYS, DELETE_BATCH_LIMIT, DELETE_ENDPOINT, ELLIPSIS_DEFAULTS, ELLIPSIS_KEY, ELLIPSIS_KEYS, FALLBACK_PRESETS, FOREIGN_ITEMS, ICON_ROUTE, ITEMS_KEY, ITEM_DEFAULTS, ITEM_KEYS, MENU_ATTR, MORE_LABEL_RE, NS, OPEN_ENDPOINT, OPEN_ROUTE, OPEN_WITH_CHILDREN_KEY, OPEN_WITH_PINNED_KEY, ORGANIZER_LAYOUT_KEY, ORGANIZER_MENU_ORDER_KEY, PERMISSION_DEFAULTS_ENDPOINT, PIN_PREFERENCE, PLACEMENT_KEY, PLACEMENT_VALUES, PRESET_LABEL_KEYS, SESSION_MENU_SLOT, TOAST_ATTR, WORKSPACE_DELETE_ENDPOINT };
