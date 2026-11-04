/**
 * dsh-sidebar-row-menu — 客户端半边。
 *
 * 在 DSH 左侧边栏的「工作区行」和「工作区下层的会话行」上点右键：
 *
 *   工作区行：弹出本插件自己的官方样式菜单
 *     新会话 / 重命名 / 使用 VS Code 打开 / 在资源管理器中打开 / 复制工作区路径
 *     /（装了项目标签页插件时）在新标签中打开 / 删除工作区
 *
 *   会话行：直接展开该行内置的「…」菜单
 *     重命名、分叉、置顶、归档、复制 Session ID 等条目由各自注册进
 *     `sidebar.workspaces.session.menu.item` 的插件提供，本插件不复制、不硬编码。
 *     本插件只往这个 slot 里追加自己的条目（VS Code / 资源管理器），
 *     所以它们既出现在「…」菜单里，也自动出现在右键菜单里。
 *
 * 设计要点：
 *  1. 工作区行没有菜单 slot，只能自己组菜单：用官方 `Menu` + `items`，在鼠标位置
 *     mount 一个临时 root。重命名 / 删除调用行组件自己的 actions，和内置按钮走
 *     同一个官方对话框。
 *  2. 会话行有正式的扩展点。内置「…」菜单就是
 *     `renderSlot('sidebar.workspaces.session.menu.item', ...)` 的结果，slot 里的
 *     条目由 built-in 与第三方插件各自注册。右键时找到行内那个 Menu 组件并触发它的
 *     anchor 点击，展开的就是同一份 slot 内容 —— 不需要知道「分叉」「置顶」这些
 *     条目是否存在，未来插件新增的条目也会自动出现。
 *  3. 行上没有把 workspaceId / cwd / 会话对象暴露到 DOM，所以从右键目标节点上的
 *     __reactFiber$ 向上找对应组件的 props：
 *       - 工作区行：ProjectRowItem 的 { group, actions }；
 *       - 会话行：SessionNodeItem 的 { node, onRenameRequest }，只用来确认这是
 *         非草稿会话行。
 *     data-row-key（workspace: / session:）只做廉价前置过滤。
 *  4. slot 条目拿不到行组件的闭包，目录路径从客户端服务里取：
 *     ctx.sessions.list 的会话 cwd，找不到时退回 ctx.workspaces.list 的工作区 path。
 *  5. 「打开 VS Code / 资源管理器」浏览器做不到，POST 给宿主
 *     /dsh-sidebar-row-menu/open。
 *
 * 本文件不需要打包：DSH 的客户端模块系统直接执行 window.__ModuleLoader__.load，
 * react / react-dom/client / ui-primitives 都在平台静态模块表里。
 *
 * 部分实现改编自 dsh-sidebar-context-menu v0.2.0（MIT, miao-ge），见 NOTICE.md。
 */
window.__ModuleLoader__.load({
  id: 'dsh-sidebar-row-menu',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    const {
      Fragment,
      useEffect,
      useLayoutEffect,
      useRef,
      useState,
      useSyncExternalStore,
    } = require('react');
    const { jsx } = require('react/jsx-runtime');
    const { createRoot } = require('react-dom/client');
    const {
      MenuItemButton,
      MenuSurface,
      Modal,
      Button,
      Switch,
      Toast,
      writeClipboard,
      IconEditOutlineRegular,
      IconTrashOutlineRegular,
      IconProjectAddOutlineRegular,
      IconNewChatOutlineRegular,
      IconWarningOutlineRegular,
      IconCopyOutlineRegular,
      IconChevronRightOutlineRegular,
      IconArchiveOutlineRegular,
      IconArchiveOffOutlineRegular,
      IconRightUpOutlineRegular,
      IconTriangleRightFillRegular,
    } = require('@deepseek-ai/dsh-client-ui-primitives');

    /** 宿主路由（与 lib/index.js 保持一致）。 */
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
    function h(type, props, ...children) {
      if (children.length === 0) return jsx(type, props);
      return jsx(type, { ...props, children: children.length === 1 ? children[0] : children });
    }
    /** 永久删除会话的宿主端点；是否对未归档会话开放由本地开关决定。 */
    const DELETE_ENDPOINT = '/dsh-sidebar-row-menu/session/delete';
    /** 删除「工作区 + 其下全部会话」的宿主端点。 */
    const WORKSPACE_DELETE_ENDPOINT = '/dsh-sidebar-row-menu/workspace/delete';
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
     * 「右键专属条目是否也放进行尾…菜单」的逐项开关。
     * 全部默认关闭：不勾选时点「…」看到的仍是 DSH 原生菜单。
     */
    const ELLIPSIS_KEY = 'dsh.sidebar-row-menu.ellipsis.v1';
    /**
     * 按工作区「已隐藏归档会话」的集合。宿主只有全局归档筛选（default/show/only），
     * 没有「这个工作区显示归档、那个工作区不显示」的概念，所以这里记住要单独
     * 隐藏归档行的工作区，再把全局筛选开到 show，最后在 DOM 里把其余工作区的
     * 归档行藏起来。
     */
    const ARCHIVED_HIDDEN_KEY = 'dsh.sidebar-row-menu.archived-hidden.v1';
    const ELLIPSIS_DEFAULTS = {
      newSession: false,
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
     * dsh-session-menu 注册的同一能力条目 id。检测到对方存在时，本插件对应项
     * 自动隐藏，避免同一份菜单里出现两条一模一样的动作。
     */
    const FOREIGN_ITEMS = {
      openWith: 'session-menu-open-with',
      deleteSession: 'session-menu-delete',
      deleteArchived: 'session-menu-delete-archived',
    };

    /* ------------------------------------------------------------ 文案 */

    const zh = {
      newSession: '新会话',
      rename: '重命名',
      vscode: '使用 VS Code 打开',
      explorer: '在资源管理器中打开',
      copyPath: '复制工作区路径',
      openInTab: '在新标签中打开',
      deleteWorkspace: '删除工作区',
      deleteWorkspaceSessions: '删除工作区及所有会话',
      showArchivedSessions: '显示已归档会话',
      hideArchivedSessions: '隐藏已归档会话',
      copied: '已复制',
      copyFailed: '复制失败，请重试',
      noPath: '没有可用的目录路径',
      openFailed: '打开失败：宿主没有找到对应程序',
      actionFailed: '操作失败，请稍后重试',
      openWith: '打开方式',
      openWithApp: '用 {name} 打开',
      deleteSession: '永久删除会话',
      deleteArchived: '删除所有已归档会话',
      'settings.title': '行菜单',
      'settings.openWith.label': '打开方式',
      'settings.openWith.hint': '在子菜单里选择编辑器、终端或文件管理器打开工作区或会话目录；置顶的应用直接显示在菜单一级。',
      'settings.archivedSessions.label': '显示已归档会话',
      'settings.archivedSessions.hint': '在工作区右键菜单里单独显示或隐藏该工作区内所有已归档会话，不影响其他工作区。',
      'settings.deleteSession.label': '永久删除会话',
      'settings.deleteSession.hint': '在会话菜单里永久删除这一个会话及其日志；默认只对已归档会话显示。',
      'settings.deleteArchived.label': '删除所有已归档会话',
      'settings.deleteArchived.hint': '在已归档会话的菜单里一次清理全部归档会话。',
      'settings.deleteUnarchived.label': '允许删除未归档会话',
      'settings.deleteUnarchived.hint': '开启后，未归档会话的右键菜单也会出现「永久删除会话」；确认后日志立即从磁盘移除，不可恢复。',
      'settings.children': '选择要显示的应用',
      'settings.pin': '置顶',
      'settings.pinned': '已置顶',
      'settings.pinTitle': '直接显示在会话右键菜单的一级',
      'settings.conflict': '已由 dsh-session-menu 提供，此项自动停用',
      'settings.conflictNote': '检测到 dsh-session-menu：重复的菜单项已自动隐藏。',
      'settings.childLocked': '需先开启「{name}」',
      'settings.appsLoading': '正在加载应用…',
      'settings.appsUnavailable': '宿主没有提供可用的外部应用',
      'settings.appsError': '应用列表加载失败，请稍后重试',
      'settings.appsAllOff': '所有应用都被二级开关隐藏了',
      'settings.expand': '展开应用列表',
      'settings.collapse': '收起应用列表',
      'settings.ellipsisTitle': '同时放进「…」菜单',
      'settings.ellipsisHint': 'DSH 0.2.2 起「…」按钮与右键共用同一份菜单：勾选后对应条目也会出现在「…」菜单里，并沿用上面的单项开关；不勾选则只在右键菜单出现。',
      'settings.ellipsisWorkspace': '工作区行',
      'settings.ellipsisSession': '会话行',
      'settings.ellipsis.newSession.label': '新建会话',
      'settings.ellipsis.newSession.hint': '在「…」菜单里直接新建该工作区的会话。',
      'settings.ellipsis.showArchived.label': '显示已归档会话',
      'settings.ellipsis.showArchived.hint': '在「…」菜单里单独显示或隐藏该工作区的已归档会话。',
      'settings.ellipsis.openWith.label': '打开方式',
      'settings.ellipsis.openWith.hint': '在「…」菜单里用外部应用打开工作区或会话目录。',
      'settings.ellipsis.copyPath.label': '拷贝工作区路径',
      'settings.ellipsis.copyPath.hint': '在「…」菜单里复制工作区目录路径。',
      'settings.ellipsis.openInTab.label': '在新标签页打开',
      'settings.ellipsis.openInTab.hint': '在「…」菜单里把工作区作为标签页打开。',
      'settings.ellipsis.deleteSessions.label': '删除工作区及所有会话',
      'settings.ellipsis.deleteSessions.hint': '在「…」菜单里同时清掉工作区记录和它下面的全部会话。',
      'settings.ellipsis.sessionOpenWith.label': '打开方式',
      'settings.ellipsis.sessionOpenWith.hint': '在「…」菜单里用外部应用打开会话目录。',
      'settings.ellipsis.sessionDelete.label': '永久删除会话',
      'settings.ellipsis.sessionDelete.hint': '在「…」菜单里永久删除这一个会话及其日志。',
      'settings.ellipsis.sessionDeleteArchived.label': '删除所有已归档会话',
      'settings.ellipsis.sessionDeleteArchived.hint': '在已归档会话的「…」菜单里一次清理全部归档会话。',
      'delete.title': '永久删除会话？',
      'delete.description': '会话「{name}」的日志将从磁盘永久删除，此操作无法撤销。',
      'delete.untitled': '未命名会话',
      'delete.archivedTitle': '删除所有已归档会话？',
      'delete.archivedDescription': '将永久删除 {n} 个已归档会话及其日志，此操作无法撤销。',
      'delete.confirm': '永久删除',
      'delete.archivedConfirm': '全部删除',
      'delete.cancel': '取消',
      'delete.pending': '正在删除…',
      'delete.archivedPending': '正在批量删除…',
      'delete.archivedPartial': '已删除 {done} 个，失败 {failed} 个。',
      'delete.failed': '删除失败：{message}',
      'delete.unavailable': '删除服务不可用',
      'delete.done': '已删除会话',
      'delete.doneMany': '已删除 {n} 个会话',
      'delete.workspaceTitle': '删除工作区及所有会话？',
      'delete.workspaceDescription': '工作区「{name}」及其下 {n} 个会话的日志将被永久删除，目录本身保留。此操作无法撤销。',
      'delete.workspaceEmptyDescription': '工作区「{name}」下没有会话，将只删除工作区记录。',
      'delete.workspaceConfirm': '全部删除',
      'delete.workspacePending': '正在删除工作区及会话…',
      'delete.workspacePartial': '已删除 {done} 个会话，失败 {failed} 个；工作区已保留。',
      'delete.workspaceDone': '已删除工作区及 {n} 个会话',
      'delete.workspaceEmptyDone': '已删除工作区',
    };
    const en = {
      newSession: 'New session',
      rename: 'Rename',
      vscode: 'Open in VS Code',
      explorer: 'Reveal in File Explorer',
      copyPath: 'Copy workspace path',
      openInTab: 'Open in new tab',
      deleteWorkspace: 'Delete workspace',
      deleteWorkspaceSessions: 'Delete workspace and all sessions',
      showArchivedSessions: 'Show archived sessions',
      hideArchivedSessions: 'Hide archived sessions',
      copied: 'Copied',
      copyFailed: 'Copy failed, please retry',
      noPath: 'No usable directory path',
      openFailed: 'Open failed: no handler found on the host',
      actionFailed: 'Action failed, please retry',
      openWith: 'Open with',
      openWithApp: 'Open with {name}',
      deleteSession: 'Delete session permanently',
      deleteArchived: 'Delete all archived sessions',
      'settings.title': 'Row menu',
      'settings.openWith.label': 'Open with',
      'settings.openWith.hint': 'Pick an editor, terminal or file manager for workspace or session directories; pinned apps show up directly in the menu.',
      'settings.archivedSessions.label': 'Show archived sessions',
      'settings.archivedSessions.hint': 'Show or hide this workspace\'s archived sessions from its context menu, without affecting other workspaces.',
      'settings.deleteSession.label': 'Delete session permanently',
      'settings.deleteSession.hint': 'Permanently delete one session and its transcript from its menu; shown on archived sessions by default.',
      'settings.deleteArchived.label': 'Delete all archived sessions',
      'settings.deleteArchived.hint': 'Clean up every archived session from an archived session row.',
      'settings.deleteUnarchived.label': 'Allow deleting unarchived sessions',
      'settings.deleteUnarchived.hint': 'Also show "Delete session permanently" on unarchived rows. The transcript is removed from disk immediately and cannot be restored.',
      'settings.children': 'Applications to show',
      'settings.pin': 'Pin',
      'settings.pinned': 'Pinned',
      'settings.pinTitle': 'Show directly at the top level of the session menu',
      'settings.conflict': 'Provided by dsh-session-menu; disabled automatically',
      'settings.conflictNote': 'dsh-session-menu detected: duplicated entries are hidden automatically.',
      'settings.childLocked': 'Enable "{name}" first',
      'settings.appsLoading': 'Loading applications…',
      'settings.appsUnavailable': 'The host exposed no external applications',
      'settings.appsError': 'Could not load the application list, please retry',
      'settings.appsAllOff': 'Every application is hidden by the switches above',
      'settings.expand': 'Show applications',
      'settings.collapse': 'Hide applications',
      'settings.ellipsisTitle': 'Also show in the "…" menu',
      'settings.ellipsisHint': 'Since DSH 0.2.2 the "…" button opens the same menu as right-click: checked entries also appear there, still subject to the switches above. Unchecked entries stay right-click only.',
      'settings.ellipsisWorkspace': 'Workspace rows',
      'settings.ellipsisSession': 'Session rows',
      'settings.ellipsis.newSession.label': 'New session',
      'settings.ellipsis.newSession.hint': 'Create a session for this workspace from the "…" menu.',
      'settings.ellipsis.showArchived.label': 'Show archived sessions',
      'settings.ellipsis.showArchived.hint': 'Show or hide this workspace\'s archived sessions from the "…" menu.',
      'settings.ellipsis.openWith.label': 'Open with',
      'settings.ellipsis.openWith.hint': 'Open the workspace or session directory with an external app from the "…" menu.',
      'settings.ellipsis.copyPath.label': 'Copy workspace path',
      'settings.ellipsis.copyPath.hint': 'Copy the workspace directory path from the "…" menu.',
      'settings.ellipsis.openInTab.label': 'Open in new tab',
      'settings.ellipsis.openInTab.hint': 'Open the workspace as a tab from the "…" menu.',
      'settings.ellipsis.deleteSessions.label': 'Delete workspace and all sessions',
      'settings.ellipsis.deleteSessions.hint': 'Remove the workspace record and every session under it from the "…" menu.',
      'settings.ellipsis.sessionOpenWith.label': 'Open with',
      'settings.ellipsis.sessionOpenWith.hint': 'Open the session directory with an external app from the "…" menu.',
      'settings.ellipsis.sessionDelete.label': 'Delete session permanently',
      'settings.ellipsis.sessionDelete.hint': 'Permanently delete this session and its log from the "…" menu.',
      'settings.ellipsis.sessionDeleteArchived.label': 'Delete all archived sessions',
      'settings.ellipsis.sessionDeleteArchived.hint': 'Clean up every archived session from an archived row\'s "…" menu.',
      'delete.title': 'Delete this session permanently?',
      'delete.description': 'The log of "{name}" will be removed from disk. This cannot be undone.',
      'delete.untitled': 'Untitled session',
      'delete.archivedTitle': 'Delete all archived sessions?',
      'delete.archivedDescription': 'Permanently delete {n} archived sessions and their logs. This cannot be undone.',
      'delete.confirm': 'Delete permanently',
      'delete.archivedConfirm': 'Delete all',
      'delete.cancel': 'Cancel',
      'delete.pending': 'Deleting…',
      'delete.archivedPending': 'Deleting the archived sessions…',
      'delete.archivedPartial': 'Deleted {done}, failed {failed}.',
      'delete.failed': 'Delete failed: {message}',
      'delete.unavailable': 'The delete service is unavailable',
      'delete.done': 'Session deleted',
      'delete.doneMany': 'Deleted {n} sessions',
      'delete.workspaceTitle': 'Delete the workspace and all its sessions?',
      'delete.workspaceDescription': 'The workspace "{name}" and the logs of its {n} sessions will be permanently deleted; the directory itself is kept. This cannot be undone.',
      'delete.workspaceEmptyDescription': 'The workspace "{name}" has no sessions; only the workspace record will be deleted.',
      'delete.workspaceConfirm': 'Delete all',
      'delete.workspacePending': 'Deleting the workspace and sessions…',
      'delete.workspacePartial': 'Deleted {done} sessions, failed {failed}; the workspace was kept.',
      'delete.workspaceDone': 'Deleted the workspace and {n} sessions',
      'delete.workspaceEmptyDone': 'Workspace deleted',
    };

    /** 官方 open-in-app 的应用 id → 显示名。官方 locale 没有这张表。 */
    const APP_NAMES = {
      vscode: ['Visual Studio Code', 'Visual Studio Code'],
      vscodeinsiders: ['VS Code Insiders', 'VS Code Insiders'],
      cursor: ['Cursor', 'Cursor'],
      windsurf: ['Windsurf', 'Windsurf'],
      zed: ['Zed', 'Zed'],
      sublimetext: ['Sublime Text', 'Sublime Text'],
      xcode: ['Xcode', 'Xcode'],
      androidstudio: ['Android Studio', 'Android Studio'],
      intellij: ['IntelliJ IDEA', 'IntelliJ IDEA'],
      pycharm: ['PyCharm', 'PyCharm'],
      webstorm: ['WebStorm', 'WebStorm'],
      phpstorm: ['PhpStorm', 'PhpStorm'],
      goland: ['GoLand', 'GoLand'],
      rider: ['Rider', 'Rider'],
      rustrover: ['RustRover', 'RustRover'],
      fork: ['Fork', 'Fork'],
      sourcetree: ['Sourcetree', 'Sourcetree'],
      github: ['GitHub Desktop', 'GitHub Desktop'],
      tower: ['Tower', 'Tower'],
      gitkraken: ['GitKraken', 'GitKraken'],
      smartgit: ['SmartGit', 'SmartGit'],
      sublimemerge: ['Sublime Merge', 'Sublime Merge'],
      ghostty: ['Ghostty', 'Ghostty'],
      warp: ['Warp', 'Warp'],
      iterm: ['iTerm', 'iTerm'],
      kitty: ['kitty', 'kitty'],
      terminal: ['终端', 'Terminal'],
      windowsterminal: ['Windows Terminal', 'Windows Terminal'],
      gitbash: ['Git Bash', 'Git Bash'],
      gnometerminal: ['终端', 'Terminal'],
      konsole: ['Konsole', 'Konsole'],
      finder: ['访达', 'Finder'],
      explorer: ['文件资源管理器', 'File Explorer'],
      filemanager: ['文件管理器', 'Files'],
    };
    for (const [id, names] of Object.entries(APP_NAMES)) {
      zh[`app.${id}`] = names[0];
      en[`app.${id}`] = names[1];
    }

    /* -------------------------------------------------- React fiber 取值 */

    /** 取一个 DOM 节点上的 React fiber（React 18/19 生产构建也会写）。 */
    function fiberOf(node) {
      if (node === null || typeof node !== 'object') return null;
      for (const key of Object.keys(node)) {
        if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) return node[key];
      }
      return null;
    }

    /**
     * 从右键目标往上找「工作区行」的 props。
     * actions = { rename, delete } 只对真实工作区存在，是最稳的特征。
     * @returns props 对象，或 null。
     */
    function resolveWorkspaceRow(target) {
      const fiber = fiberOf(target);
      if (fiber === null) return null;
      let current = fiber;
      let hops = 0;
      while (current !== null && current !== undefined && hops < 60) {
        const props = current.memoizedProps;
        if (
          props !== null
          && typeof props === 'object'
          && props.group !== undefined
          && props.actions !== undefined
          && typeof props.actions.rename === 'function'
          && typeof props.actions.delete === 'function'
          && typeof props.group.workspaceId === 'string'
        ) {
          return props;
        }
        current = current.return;
        hops += 1;
      }
      return null;
    }

    /**
     * 从右键目标往上找「会话行」的 props。
     * SessionNodeItem 的 props 形如 { node, currentId, now, onOpen, onRenameRequest, ... }，
     * node 上有 id / blank，足以和别的 treeitem 区分开。
     * 草稿会话（blank）没有内置「…」菜单，这里也不接管。
     * @returns props 对象，或 null。
     */
    function resolveSessionRow(target) {
      const fiber = fiberOf(target);
      if (fiber === null) return null;
      let current = fiber;
      let hops = 0;
      while (current !== null && current !== undefined && hops < 60) {
        const props = current.memoizedProps;
        if (
          props !== null
          && typeof props === 'object'
          && props.node !== null
          && typeof props.node === 'object'
          && String(props.node.id ?? '') !== ''
          && typeof props.node.blank === 'boolean'
          && (typeof props.onOpen === 'function' || typeof props.onRenameRequest === 'function')
        ) {
          if (props.node.blank === true) return null;
          return props;
        }
        current = current.return;
        hops += 1;
      }
      return null;
    }

    /* -------------------------------------------------------------- 状态 */

    /** 当前挂着的菜单宿主与 React root。 */
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
    let toastHost = null;
    let toastRoot = null;

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
      const host = document.createElement('div');
      host.setAttribute(TOAST_ATTR, '');
      host.style.cssText =
        'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none';
      document.body.appendChild(host);
      const root = createRoot(host);
      toastHost = host;
      toastRoot = root;
      const props = {
        text: message,
        onDone: () => window.setTimeout(closeToast, 0),
      };
      if (tone === 'success') props.tone = 'success';
      if (tone === 'warning') {
        props.tone = 'warning';
        props.icon = jsx(IconWarningOutlineRegular, {});
      }
      root.render(jsx(Toast, props));
    }

    /** 取客户端服务；cordis 对未 inject 的服务在属性访问时也会抛错，全部兜住。 */
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

    async function openExternal(target, path) {
      try {
        const response = await fetch(OPEN_ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ target, path }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || data === null || data.ok !== true) return { ok: false, via: '' };
        return { ok: true, via: typeof data.via === 'string' ? data.via : '' };
      } catch {
        return { ok: false, via: '' };
      }
    }

    function openPath(target, path, t) {
      if (typeof path !== 'string' || path === '') {
        toast(t('noPath'));
        return;
      }
      openExternal(target, path).then((result) => {
        if (!result.ok) {
          toast(t('openFailed'));
          return;
        }
        console.info(`[dsh-sidebar-row-menu] ${target} -> ${result.via || 'ok'}`);
      });
    }

    async function copyText(text, t) {
      try {
        const ok = await writeClipboard(text);
        toast(ok ? t('copied') : t('copyFailed'), ok ? 'success' : 'warning');
      } catch (error) {
        console.warn('[dsh-sidebar-row-menu] clipboard failed:', error);
        toast(t('copyFailed'), 'warning');
      }
    }

    function workspaceCwd(ctx, group) {
      if (typeof group?.cwd === 'string' && group.cwd !== '') return group.cwd;
      const workspaces = serviceOf(ctx, 'workspaces');
      const items = workspaces?.list?.getSnapshot?.()?.items;
      if (!Array.isArray(items)) return '';
      const item = items.find((candidate) => candidate.workspaceId === group?.workspaceId);
      return typeof item?.path === 'string' ? item.path : '';
    }

    function sessionCwd(ctx, sessionId) {
      const sessions = serviceOf(ctx, 'sessions');
      const session = sessions?.list?.getSnapshot?.()?.byId?.[sessionId];
      if (typeof session?.cwd === 'string' && session.cwd !== '') return session.cwd;
      const workspaces = serviceOf(ctx, 'workspaces');
      const items = workspaces?.list?.getSnapshot?.()?.items;
      if (!Array.isArray(items)) return '';
      const item = items.find((candidate) => Array.isArray(candidate.sessionIds) && candidate.sessionIds.includes(sessionId));
      return typeof item?.path === 'string' ? item.path : '';
    }

    /* ------------------------------------------------ 菜单项设置（localStorage） */

    function readStoredItems() {
      const defaults = { ...ITEM_DEFAULTS };
      try {
        const raw = globalThis.localStorage?.getItem(ITEMS_KEY);
        if (typeof raw !== 'string' || raw === '') return defaults;
        const parsed = JSON.parse(raw);
        if (parsed === null || typeof parsed !== 'object') return defaults;
        for (const key of ITEM_KEYS) {
          if (typeof parsed[key] === 'boolean') defaults[key] = parsed[key];
        }
      } catch {
        /* 坏数据回退默认，不阻断菜单 */
      }
      return defaults;
    }

    let itemSettings = readStoredItems();
    const itemListeners = new Set();

    function publishItems() {
      for (const listener of itemListeners) {
        try {
          listener();
        } catch {
          /* ignore */
        }
      }
    }

    function subscribeItems(listener) {
      itemListeners.add(listener);
      return () => {
        itemListeners.delete(listener);
      };
    }

    function itemsSnapshot() {
      return itemSettings;
    }

    function useItems() {
      return useSyncExternalStore(subscribeItems, itemsSnapshot, itemsSnapshot);
    }

    function setItem(key, enabled) {
      if (!ITEM_KEYS.includes(key)) return;
      itemSettings = { ...itemSettings, [key]: enabled === true };
      try {
        globalThis.localStorage?.setItem(ITEMS_KEY, JSON.stringify(itemSettings));
      } catch {
        /* 隐私模式写不进去也照样生效到本次会话 */
      }
      publishItems();
    }

    function itemOn(key) {
      return itemSettings[key] ?? ITEM_DEFAULTS[key] ?? false;
    }

    /* -------------------------------- 「…」菜单附加开关（localStorage） */

    function readStoredEllipsis() {
      const defaults = { ...ELLIPSIS_DEFAULTS };
      try {
        const raw = globalThis.localStorage?.getItem(ELLIPSIS_KEY);
        if (typeof raw !== 'string' || raw === '') return defaults;
        const parsed = JSON.parse(raw);
        if (parsed === null || typeof parsed !== 'object') return defaults;
        for (const key of ELLIPSIS_KEYS) {
          if (typeof parsed[key] === 'boolean') defaults[key] = parsed[key];
        }
      } catch {
        /* 坏数据回退默认 */
      }
      return defaults;
    }

    let ellipsisSettings = readStoredEllipsis();
    const ellipsisListeners = new Set();

    function publishEllipsis() {
      for (const listener of ellipsisListeners) {
        try {
          listener();
        } catch {
          /* ignore */
        }
      }
    }

    function subscribeEllipsis(listener) {
      ellipsisListeners.add(listener);
      return () => {
        ellipsisListeners.delete(listener);
      };
    }

    function ellipsisSnapshot() {
      return ellipsisSettings;
    }

    function useEllipsis() {
      return useSyncExternalStore(subscribeEllipsis, ellipsisSnapshot, ellipsisSnapshot);
    }

    function setEllipsis(key, enabled) {
      if (!ELLIPSIS_KEYS.includes(key)) return;
      ellipsisSettings = { ...ellipsisSettings, [key]: enabled === true };
      try {
        globalThis.localStorage?.setItem(ELLIPSIS_KEY, JSON.stringify(ellipsisSettings));
      } catch {
        /* 隐私模式写不进去也照样生效到本次会话 */
      }
      publishEllipsis();
    }

    function ellipsisOn(key) {
      return ellipsisSettings[key] === true;
    }

    /** 工作区行是否至少有一项要在「…」菜单里显示（否则完全不接管原生菜单）。 */
    function workspaceEllipsisOn() {
      return ellipsisSettings.newSession === true
        || ellipsisSettings.openWith === true
        || ellipsisSettings.copyPath === true
        || ellipsisSettings.openInTab === true
        || ellipsisSettings.deleteSessions === true;
    }

    /* ------------------------------------- 打开方式：应用列表与二级开关 */

    function readStoredChildren() {
      try {
        const raw = globalThis.localStorage?.getItem(OPEN_WITH_CHILDREN_KEY);
        if (typeof raw !== 'string' || raw === '') return {};
        const parsed = JSON.parse(raw);
        if (parsed !== null && typeof parsed === 'object') return parsed;
      } catch {
        /* ignore */
      }
      return {};
    }

    let childSettings = readStoredChildren();
    const childListeners = new Set();

    function publishChildren() {
      for (const listener of childListeners) {
        try {
          listener();
        } catch {
          /* ignore */
        }
      }
    }

    function subscribeChildren(listener) {
      childListeners.add(listener);
      return () => {
        childListeners.delete(listener);
      };
    }

    function childrenSnapshot() {
      return childSettings;
    }

    function useChildren() {
      return useSyncExternalStore(subscribeChildren, childrenSnapshot, childrenSnapshot);
    }

    function setChild(appId, enabled) {
      childSettings = { ...childSettings, [appId]: enabled === true };
      try {
        globalThis.localStorage?.setItem(OPEN_WITH_CHILDREN_KEY, JSON.stringify(childSettings));
      } catch {
        /* ignore */
      }
      publishChildren();
    }

    function childOn(appId) {
      return childSettings[appId] !== false;
    }

    /* ------------------------------ 打开方式：一级菜单置顶（常用应用） */

    function readStoredPinned() {
      try {
        const raw = globalThis.localStorage?.getItem(OPEN_WITH_PINNED_KEY);
        if (typeof raw !== 'string' || raw === '') return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed.filter((id) => typeof id === 'string' && id !== '');
      } catch {
        /* 坏数据按「未配置」处理，回到默认置顶 */
      }
      return null;
    }

    let pinnedSettings = readStoredPinned();
    const pinnedListeners = new Set();

    function publishPinned() {
      for (const listener of pinnedListeners) {
        try {
          listener();
        } catch {
          /* ignore */
        }
      }
    }

    function subscribePinned(listener) {
      pinnedListeners.add(listener);
      return () => {
        pinnedListeners.delete(listener);
      };
    }

    function pinnedSnapshot() {
      return pinnedSettings;
    }

    function usePinned() {
      return useSyncExternalStore(subscribePinned, pinnedSnapshot, pinnedSnapshot);
    }

    /**
     * 实际置顶的应用：用户没配置过时自动挑选 —— 有已知编辑器就置顶第一个
     * 编辑器（通常是 VS Code），否则置顶官方列表里的第一个应用。
     */
    function effectivePinned(ids) {
      if (pinnedSettings !== null) {
        return pinnedSettings.filter((id) => ids.includes(id));
      }
      const preferred = ids.find((id) => PIN_PREFERENCE.includes(id));
      if (preferred !== undefined) return [preferred];
      return ids.slice(0, 1);
    }

    function setPinned(ids) {
      pinnedSettings = [...new Set(ids.filter((id) => typeof id === 'string' && id !== ''))];
      try {
        globalThis.localStorage?.setItem(OPEN_WITH_PINNED_KEY, JSON.stringify(pinnedSettings));
      } catch {
        /* ignore */
      }
      publishPinned();
    }

    function togglePinned(appId, ids) {
      const current = effectivePinned(ids);
      setPinned(current.includes(appId) ? current.filter((id) => id !== appId) : [...current, appId]);
    }

    function appLabel(appId, t) {
      const key = `app.${appId}`;
      const value = t(key);
      return value === key ? appId : value;
    }

    /** 应用图标；宿主没有图标时 404，隐藏 img 但不留空洞。 */
    function appIcon(appId) {
      return jsx('img', {
        className: 'dsrm-app-icon',
        src: ICON_ROUTE + encodeURIComponent(appId),
        alt: '',
        onError: (event) => {
          event.currentTarget.style.visibility = 'hidden';
        },
      });
    }

    /** 官方 /open-in-app/apps 的客户端缓存；菜单和设置页共用。 */
    let appsState = { status: 'idle', ids: [], at: 0 };
    const appsListeners = new Set();

    function publishApps(next) {
      appsState = next;
      for (const listener of appsListeners) {
        try {
          listener();
        } catch {
          /* ignore */
        }
      }
    }

    function subscribeApps(listener) {
      appsListeners.add(listener);
      return () => {
        appsListeners.delete(listener);
      };
    }

    function appsSnapshot() {
      return appsState;
    }

    function useApps() {
      return useSyncExternalStore(subscribeApps, appsSnapshot, appsSnapshot);
    }

    function ensureApps() {
      if (typeof fetch !== 'function') {
        if (appsState.status !== 'error') publishApps({ status: 'error', ids: [], at: Date.now() });
        return;
      }
      const now = Date.now();
      if (appsState.status === 'loading') return;
      if (appsState.status === 'ready' && now - appsState.at < 60000) return;
      if (appsState.status === 'error' && now - appsState.at < 10000) return;
      const previous = appsState.ids;
      publishApps({ status: 'loading', ids: previous, at: now });
      fetch(APPS_ROUTE, { headers: { accept: 'application/json' } })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((payload) => {
          const ids = Array.isArray(payload?.apps)
            ? payload.apps.filter((id) => typeof id === 'string' && id !== '')
            : [];
          publishApps({ status: 'ready', ids: [...new Set(ids)], at: Date.now() });
        })
        .catch(() => publishApps({ status: 'error', ids: [], at: Date.now() }));
    }

    function openApplication(appId, path) {
      if (typeof path !== 'string' || path === '') return Promise.resolve(false);
      if (typeof fetch !== 'function') return Promise.resolve(false);
      return fetch(OPEN_ROUTE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ app: appId, path }),
      }).then(
        (response) => response.ok,
        () => false,
      );
    }

    /* ------------------------------------------------ 与 dsh-session-menu 共存 */

    /** 读 slot 注册项 id（不同 DSH 版本的 register 返回形状略有差异）。 */
    function slotItemId(entry) {
      const value = entry?.options?.id ?? entry?.id ?? entry?.entry?.id;
      return typeof value === 'string' ? value : '';
    }

    function foreignItemIds() {
      const slots = rootCtx?.slots;
      const ids = new Set();
      if (slots === null || slots === undefined || typeof slots.entriesOfSlot !== 'function') return ids;
      try {
        const entries = slots.entriesOfSlot(SESSION_MENU_SLOT);
        if (Array.isArray(entries)) {
          for (const entry of entries) {
            const id = slotItemId(entry);
            if (id !== '') ids.add(id);
          }
        }
      } catch (error) {
        console.warn('[dsh-sidebar-row-menu] slot lookup failed:', error);
      }
      return ids;
    }

    function takenOver(key) {
      const id = FOREIGN_ITEMS[key];
      return typeof id === 'string' && foreignItemIds().has(id);
    }

    /* ------------------------------------------------------ 已归档会话集合 */

    const EMPTY_IDS = new Set();
    let archivedCache = { snapshot: undefined, ids: EMPTY_IDS };

    function archivedStore() {
      return serviceOf(rootCtx, 'workspaces')?.list ?? null;
    }

    function archivedSnapshot() {
      const store = archivedStore();
      const snapshot = store?.getSnapshot?.();
      if (snapshot === null || snapshot === undefined) return EMPTY_IDS;
      if (archivedCache.snapshot === snapshot) return archivedCache.ids;
      const raw = Array.isArray(snapshot.archivedSessionIds) ? snapshot.archivedSessionIds : [];
      archivedCache = {
        snapshot,
        ids: new Set(raw.filter((id) => typeof id === 'string' && id !== '')),
      };
      return archivedCache.ids;
    }

    function subscribeArchived(listener) {
      const store = archivedStore();
      return typeof store?.subscribe === 'function' ? store.subscribe(listener) : () => {};
    }

    function useArchivedIds() {
      return useSyncExternalStore(subscribeArchived, archivedSnapshot, archivedSnapshot);
    }

    /** 会话是否是主视图正打开的那个（删掉后需要清空主视图）。 */
    function isMainSession(id) {
      const snapshot = serviceOf(rootCtx, 'sessions')?.list?.getSnapshot?.();
      const byId = snapshot?.byId;
      if (byId === null || typeof byId !== 'object') return false;
      for (const row of Object.values(byId)) {
        if (row?.id === id && (row?.retainedBy?.mainView ?? 0) > 0) return true;
      }
      return false;
    }

    /* ------------------------------------------------------ 删除确认对话框 */

    let deleteRequest = null;
    let deleteSeq = 0;
    const deleteListeners = new Set();

    function subscribeDelete(listener) {
      deleteListeners.add(listener);
      return () => {
        deleteListeners.delete(listener);
      };
    }

    function deleteSnapshot() {
      return deleteRequest;
    }

    function useDeleteRequest() {
      return useSyncExternalStore(subscribeDelete, deleteSnapshot, deleteSnapshot);
    }

    function publishDelete() {
      for (const listener of deleteListeners) {
        try {
          listener();
        } catch {
          /* ignore */
        }
      }
    }

    function requestDelete(request) {
      deleteSeq += 1;
      deleteRequest = { ...request, seq: deleteSeq };
      publishDelete();
    }

    function closeDelete() {
      if (deleteRequest === null) return;
      deleteRequest = null;
      publishDelete();
    }

    function postDelete(ids) {
      if (typeof fetch !== 'function') return Promise.resolve({ ok: false, deleted: 0, failed: ids.length, error: 'network' });
      return fetch(DELETE_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionIds: ids }),
      })
        .then((response) => response.json().catch(() => null)
          .then((payload) => (payload !== null && typeof payload === 'object'
            ? payload
            : { ok: false, deleted: 0, failed: ids.length, error: `HTTP ${response.status}` })))
        .catch(() => ({ ok: false, deleted: 0, failed: ids.length, error: 'network' }));
    }

    function postWorkspaceDelete(workspaceId) {
      if (typeof fetch !== 'function') return Promise.resolve({ ok: false, deleted: 0, failed: 0, error: 'network' });
      return fetch(WORKSPACE_DELETE_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
        .then((response) => response.json().catch(() => null)
          .then((payload) => (payload !== null && typeof payload === 'object'
            ? payload
            : { ok: false, deleted: 0, failed: 0, error: `HTTP ${response.status}` })))
        .catch(() => ({ ok: false, deleted: 0, failed: 0, error: 'network' }));
    }

    /** shell.overlay 上的对话框宿主；没有请求时什么都不渲染。 */
    function DeleteDialog({ t }) {
      const request = useDeleteRequest();
      if (request === null) return null;
      return jsx(DeleteConfirmForm, { key: request.seq, request, t });
    }

    function DeleteConfirmForm({ request, t }) {
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState(null);
      const [partial, setPartial] = useState(null);
      const workspace = request.mode === 'workspace';
      const bulk = request.mode === 'archived';
      const ids = workspace
        ? (Array.isArray(request.sessionIds) ? request.sessionIds : [])
        : bulk ? request.sessionIds : [request.sessionId];
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
            const result = workspace
              ? await postWorkspaceDelete(request.workspaceId)
              : await postDelete(ids);
            if (result.ok !== true && (result.deleted ?? 0) === 0) {
              const reason = typeof result.error === 'string' && result.error !== '' ? result.error : t('delete.unavailable');
              throw new Error(reason);
            }
            if (workspace) {
              // 会话删除有失败时 host 会保留工作区，让用户重试；成功才关框。
              if (result.ok !== true) {
                setPartial({ done: result.deleted ?? 0, failed: result.failed ?? 0, workspace: true });
                return;
              }
              if (wasMain) serviceOf(rootCtx, 'uiWorkspace')?.clearMain?.();
              closeDelete();
              toast(
                (result.deleted ?? 0) > 0
                  ? t('delete.workspaceDone', { n: result.deleted ?? 0 })
                  : t('delete.workspaceEmptyDone'),
                'success',
              );
              return;
            }
            if (wasMain) serviceOf(rootCtx, 'uiWorkspace')?.clearMain?.();
            if ((result.failed ?? 0) > 0) {
              setPartial({ done: result.deleted ?? 0, failed: result.failed });
              return;
            }
            closeDelete();
            toast(bulk ? t('delete.doneMany', { n: result.deleted ?? ids.length }) : t('delete.done'), 'success');
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
          } finally {
            setBusy(false);
          }
        })();
      };
      return jsx(Modal, {
        open: true,
        onClose: close,
        closeLabel: t('delete.cancel'),
        title: workspace ? t('delete.workspaceTitle') : bulk ? t('delete.archivedTitle') : t('delete.title'),
        description: workspace
          ? (ids.length > 0
            ? t('delete.workspaceDescription', { name: request.displayTitle ?? '', n: ids.length })
            : t('delete.workspaceEmptyDescription', { name: request.displayTitle ?? '' }))
          : bulk
            ? t('delete.archivedDescription', { n: ids.length })
            : t('delete.description', { name: request.displayTitle || t('delete.untitled') }),
        footer: h(Fragment, null,
          jsx(Button, { variant: 'outline', disabled: busy, onClick: close, children: t('delete.cancel') }),
          jsx(Button, {
            variant: 'outline',
            disabled: busy,
            onClick: confirm,
            children: h('span', { className: 'dsrm-danger-label' }, workspace
              ? t('delete.workspaceConfirm')
              : bulk ? t('delete.archivedConfirm') : t('delete.confirm')),
          })),
        children: [
          busy
            ? h('div', { className: 'dsrm-status-text', role: 'status', key: 'busy' }, workspace
              ? t('delete.workspacePending')
              : bulk ? t('delete.archivedPending') : t('delete.pending'))
            : null,
          partial !== null
            ? h('div', { className: 'dsrm-status-text', role: 'status', key: 'partial' }, partial.workspace
              ? t('delete.workspacePartial', { done: partial.done, failed: partial.failed })
              : t('delete.archivedPartial', { done: partial.done, failed: partial.failed }))
            : null,
          error !== null
            ? h('div', { className: 'dsrm-error-text', role: 'alert', key: 'error' }, t('delete.failed', { message: error }))
            : null,
        ],
      });
    }

    /* ---------------------------------------------------------- 打开方式子菜单 */

    /** 面板贴边时的位置：右侧放不下就翻到左边，并在视口内夹取。 */
    function submenuGeometry(anchor, size) {
      const margin = 12;
      const gap = 6;
      const width = Math.max(160, size?.width ?? 180);
      const height = Math.max(0, size?.height ?? 0);
      let left = anchor.right + gap;
      if (left + width > window.innerWidth - margin) left = anchor.left - width - gap;
      left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
      let top = anchor.bottom - height - 4;
      top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
      return { left, top };
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
    function OpenWithSubmenu({ t, getCwd, closeParent, separatorBefore = false }) {
      const children = useChildren();
      const apps = useApps();
      usePinned();
      const [open, setOpen] = useState(false);
      const [box, setBox] = useState(null);
      const hostRef = useRef(null);
      const closeTimer = useRef(0);

      useEffect(() => {
        if (open) ensureApps();
      }, [open]);

      useEffect(() => {
        if (!open) return undefined;
        const dismiss = (event) => {
          const host = hostRef.current;
          if (host !== null && host.contains(event.target)) return;
          setOpen(false);
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', dismiss, true);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
          document.removeEventListener('mousedown', dismiss, true);
          document.removeEventListener('keydown', onKeyDown, true);
        };
      }, [open]);

      // MenuSurface 是函数组件，不保证转发 ref，因此按条目数估算面板高度；
      // 列表本身有 max-height 和滚动，估算只影响贴底时的翻转位置。
      useEffect(() => {
        if (!open) return;
        const host = hostRef.current;
        if (host === null) return;
        const pinnedIds = new Set(effectivePinned(apps.ids));
        const count = apps.ids.filter((id) => childOn(id) && !pinnedIds.has(id)).length;
        const height = Math.min(380, Math.max(40, count * 34 + 8));
        setBox(submenuGeometry(host.getBoundingClientRect(), { width: 220, height }));
      }, [open, apps.status, apps.ids]);

      // 会话行菜单的 pointerover/out 在 document 捕获阶段被「移出关闭」守卫截断，
      // React 的 onPointerEnter 收不到。把悬浮展开挂到 window 捕获阶段，抢在守卫前。
      useEffect(() => {
        const host = hostRef.current;
        if (host === null) return undefined;
        const inside = (node) => node instanceof Node && host.contains(node);
        const onOver = (event) => {
          if (inside(event.target)) openNow();
        };
        const onOut = (event) => {
          if (inside(event.target) && !inside(event.relatedTarget)) closeSoon();
        };
        window.addEventListener('pointerover', onOver, true);
        window.addEventListener('pointerout', onOut, true);
        return () => {
          window.removeEventListener('pointerover', onOver, true);
          window.removeEventListener('pointerout', onOut, true);
        };
      }, [open, apps.status, apps.ids]);

      useEffect(() => () => window.clearTimeout(closeTimer.current), []);

      const openNow = () => {
        window.clearTimeout(closeTimer.current);
        if (!open && hostRef.current !== null) {
          const pinnedIds = new Set(effectivePinned(apps.ids));
          const count = apps.ids.filter((id) => childOn(id) && !pinnedIds.has(id)).length;
          const height = Math.min(380, Math.max(40, count * 34 + 8));
          setBox(submenuGeometry(hostRef.current.getBoundingClientRect(), { width: 220, height }));
        }
        setOpen(true);
        ensureApps();
      };
      const closeSoon = () => {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(() => setOpen(false), 160);
      };
      const pick = (appId) => {
        setOpen(false);
        closeParent?.();
        const cwd = getCwd();
        if (cwd === '') {
          toast(t('noPath'));
          return;
        }
        openApplication(appId, cwd).then((ok) => {
          if (!ok) toast(t('openFailed'));
        });
      };

      const pinnedIds = new Set(effectivePinned(apps.ids));
      const enabledApps = apps.ids.filter((id) => childOn(id));
      const visibleApps = enabledApps.filter((id) => !pinnedIds.has(id));
      // 所有可用应用都置顶后，二级菜单没有内容，直接收起来。
      if (apps.status !== 'loading' && enabledApps.length > 0 && visibleApps.length === 0) {
        return null;
      }
      let panelBody;
      if (apps.status === 'error') {
        panelBody = h('div', { className: 'dsrm-submenu-empty' }, t('settings.appsError'));
      } else if (apps.ids.length === 0) {
        panelBody = h('div', { className: 'dsrm-submenu-empty' }, apps.status === 'loading' ? t('settings.appsLoading') : t('settings.appsUnavailable'));
      } else if (visibleApps.length === 0) {
        panelBody = h('div', { className: 'dsrm-submenu-empty' }, t('settings.appsAllOff'));
      } else {
        panelBody = visibleApps.map((id) => jsx(MenuItemButton, {
          key: id,
          onSelect: () => pick(id),
          icon: appIcon(id),
          children: appLabel(id, t),
        }));
      }

      const body = h('div', {
        className: 'dsrm-submenu-host',
        ref: hostRef,
        onPointerOver: openNow,
        onPointerEnter: openNow,
        onPointerLeave: closeSoon,
      },
        h('button', {
          type: 'button',
          role: 'menuitem',
          className: 'dsrm-submenu-trigger',
          'aria-haspopup': 'menu',
          'aria-expanded': open,
          onPointerOver: openNow,
          onFocus: openNow,
          onClick: () => {
            if (open) setOpen(false);
            else openNow();
          },
        },
          jsx(IconRightUpOutlineRegular, { size: 14 }),
          h('span', { className: 'dsrm-submenu-label' }, t('openWith')),
          jsx(IconChevronRightOutlineRegular, { size: 12, className: 'dsrm-submenu-chevron' }),
        ),
        open ? h(MenuSurface, {
          role: 'group',
          'aria-label': t('openWith'),
          className: 'dsrm-submenu',
          style: {
            left: box?.left ?? 0,
            top: box?.top ?? 0,
            visibility: box === null ? 'hidden' : 'visible',
          },
        }, panelBody) : null,
      );
      if (!separatorBefore) return body;
      return h(Fragment, null,
        h('div', { className: 'dsrm-sep', role: 'separator' }),
        body,
      );
    }

    /**
     * 会话菜单里的「打开方式」：只在右键打开的菜单里出现，
     * 且和 dsh-session-menu 的同名能力二选一。
     */
    function SessionOpenWithMenuItem({ sessionId, useMenuOpenState, t }) {
      const rightClick = useRightClickEntry();
      const ellipsis = useEllipsis();
      const visible = rightClick || ellipsis.sessionOpenWith === true;
      const items = useItems();
      const apps = useApps();
      const setMenuOpen = menuCloser(useMenuOpenState);
      if (!visible || items.openWith === false || takenOver('openWith')) return null;
      const pinnedCount = apps.status === 'ready'
        ? effectivePinned(apps.ids).filter((id) => childOn(id)).length
        : 0;
      return jsx(OpenWithSubmenu, {
        t,
        getCwd: () => sessionCwd(rootCtx, sessionId),
        closeParent: () => setMenuOpen?.(false),
        separatorBefore: apps.status === 'ready' && pinnedCount === 0,
      });
    }

    /**
     * 置顶应用的一级菜单入口：默认自动把检测到的第一个编辑器（通常是 VS Code）
     * 放进一级菜单，用户也可以在设置里改。置顶项不再重复出现在「打开方式」里。
     */
    function SessionOpenWithPinnedMenuItem({ sessionId, useMenuOpenState, t }) {
      const rightClick = useRightClickEntry();
      const ellipsis = useEllipsis();
      const visible = rightClick || ellipsis.sessionOpenWith === true;
      const items = useItems();
      useChildren();
      const apps = useApps();
      usePinned();
      const setMenuOpen = menuCloser(useMenuOpenState);
      useEffect(() => {
        if (visible) ensureApps();
      }, [visible]);
      if (!visible || items.openWith === false || takenOver('openWith')) return null;
      const picked = effectivePinned(apps.ids).filter((id) => childOn(id));
      if (picked.length === 0) return null;
      const pick = (appId) => {
        setMenuOpen?.(false);
        const cwd = sessionCwd(rootCtx, sessionId);
        if (cwd === '') {
          toast(t('noPath'));
          return;
        }
        openApplication(appId, cwd).then((ok) => {
          if (!ok) toast(t('openFailed'));
        });
      };
      return h(Fragment, null, picked.map((id, index) => jsx(MenuItemButton, {
        key: id,
        separatorBefore: index === 0,
        onSelect: () => pick(id),
        icon: appIcon(id),
        children: t('openWithApp', { name: appLabel(id, t) }),
      })));
    }

    /**
     * 会话条目「永久删除会话」：已归档会话默认可见；未归档会话要先在设置里
     * 打开「允许删除未归档会话」。和 dsh-session-menu 的同名功能二选一。
     */
    function SessionDeleteMenuItem({ sessionId, displayTitle, useMenuOpenState, t }) {
      const rightClick = useRightClickEntry();
      const ellipsis = useEllipsis();
      const visible = rightClick || ellipsis.sessionDelete === true;
      const items = useItems();
      const archived = useArchivedIds();
      const setMenuOpen = menuCloser(useMenuOpenState);
      if (!visible || items.deleteSession === false || takenOver('deleteSession')) return null;
      if (!archived.has(sessionId) && items.deleteUnarchived !== true) return null;
      return jsx(MenuItemButton, {
        danger: true,
        separatorBefore: true,
        icon: jsx(IconTrashOutlineRegular, { size: 14 }),
        onSelect: () => {
          setMenuOpen?.(false);
          requestDelete({ mode: 'one', sessionId, displayTitle });
        },
        children: t('deleteSession'),
      });
    }

    /**
     * 会话条目「删除所有已归档会话」：只在已归档会话的菜单里显示，
     * 和 dsh-session-menu 的同名功能二选一。displayTitle 用作确认文案。
     */
    function SessionDeleteArchivedMenuItem({ sessionId, displayTitle, useMenuOpenState, t }) {
      const rightClick = useRightClickEntry();
      const ellipsis = useEllipsis();
      const visible = rightClick || ellipsis.sessionDeleteArchived === true;
      const items = useItems();
      const archived = useArchivedIds();
      const setMenuOpen = menuCloser(useMenuOpenState);
      if (!visible || items.deleteArchived === false || takenOver('deleteArchived')) return null;
      if (!archived.has(sessionId)) return null;
      return jsx(MenuItemButton, {
        danger: true,
        separatorBefore: items.deleteSession === false || takenOver('deleteSession'),
        icon: jsx(IconTrashOutlineRegular, { size: 14 }),
        onSelect: () => {
          const ids = [...archived];
          setMenuOpen?.(false);
          if (ids.length === 0) return;
          requestDelete({ mode: 'archived', sessionIds: ids, displayTitle });
        },
        children: t('deleteArchived'),
      });
    }

    /* ---------------------------------------------------------- 设置页 */

    const SETTINGS_ROWS = [
      ['openWith', 'settings.openWith.label', 'settings.openWith.hint'],
      ['deleteSession', 'settings.deleteSession.label', 'settings.deleteSession.hint'],
      ['deleteUnarchived', 'settings.deleteUnarchived.label', 'settings.deleteUnarchived.hint'],
      ['deleteArchived', 'settings.deleteArchived.label', 'settings.deleteArchived.hint'],
      ['archivedSessions', 'settings.archivedSessions.label', 'settings.archivedSessions.hint'],
    ];

    /** 「…」菜单附加开关；按行分组，避免用户分不清工作区项和会话项。 */
    const ELLIPSIS_ROWS = [
      ['workspace', 'settings.ellipsisWorkspace', [
        ['newSession', 'settings.ellipsis.newSession.label', 'settings.ellipsis.newSession.hint'],
        ['openWith', 'settings.ellipsis.openWith.label', 'settings.ellipsis.openWith.hint'],
        ['copyPath', 'settings.ellipsis.copyPath.label', 'settings.ellipsis.copyPath.hint'],
        ['openInTab', 'settings.ellipsis.openInTab.label', 'settings.ellipsis.openInTab.hint'],
        ['showArchived', 'settings.ellipsis.showArchived.label', 'settings.ellipsis.showArchived.hint'],
        ['deleteSessions', 'settings.ellipsis.deleteSessions.label', 'settings.ellipsis.deleteSessions.hint'],
      ]],
      ['session', 'settings.ellipsisSession', [
        ['sessionOpenWith', 'settings.ellipsis.sessionOpenWith.label', 'settings.ellipsis.sessionOpenWith.hint'],
        ['sessionDelete', 'settings.ellipsis.sessionDelete.label', 'settings.ellipsis.sessionDelete.hint'],
        ['sessionDeleteArchived', 'settings.ellipsis.sessionDeleteArchived.label', 'settings.ellipsis.sessionDeleteArchived.hint'],
      ]],
    ];

    /**
     * 设置导航图标（DSH 0.2.2 的 `settings.section.icon`）。
     * 宿主只给 { size, active }，颜色由导航按钮的 currentColor 决定；
     * 16px 网格、1.5 描边、圆头，跟宿主自绘图标同一套笔触。
     * 造型是三行条目 + 行尾子菜单箭头：一眼看出「行 → 弹出菜单」。
     */
    function SettingsNavIcon({ size = 16 } = {}) {
      return h('svg', {
        className: 'dsrm-settings-nav',
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      }, [
        h('path', { d: 'M2.75 4.5h8.35' }),
        h('path', { d: 'M2.75 8h8.35' }),
        h('path', { d: 'M2.75 11.5h5.6' }),
        h('path', { d: 'M12.1 6.5 13.6 8l-1.5 1.5' }),
      ]);
    }

    function SettingsSection({ t }) {
      const items = useItems();
      const ellipsis = useEllipsis();
      const children = useChildren();
      const apps = useApps();
      usePinned();
      const [expanded, setExpanded] = useState(false);
      const anyConflict = takenOver('openWith') || takenOver('deleteSession') || takenOver('deleteArchived');
      const locked = items.openWith === false;
      const pinnedIds = new Set(effectivePinned(apps.ids));

      useEffect(() => {
        if (expanded) ensureApps();
      }, [expanded]);

      const toggleExpanded = () => {
        setExpanded(!expanded);
        if (!expanded) ensureApps();
      };

      const childRows = expanded ? h('div', { className: 'dsrm-settings-children' },
        apps.status === 'error'
          ? h('div', { className: 'dsrm-settings-empty' }, t('settings.appsError'))
          : apps.ids.length === 0
            ? h('div', { className: 'dsrm-settings-empty' }, apps.status === 'loading' ? t('settings.appsLoading') : t('settings.appsUnavailable'))
            : apps.ids.map((id) => h('div', { className: 'dsrm-settings-child', key: id },
              h('span', { className: 'dsrm-settings-child-label' }, appLabel(id, t)),
              h('div', { className: 'dsrm-settings-child-actions' },
                h('button', {
                  type: 'button',
                  className: pinnedIds.has(id) ? 'dsrm-pin dsrm-pin-on' : 'dsrm-pin',
                  'aria-pressed': pinnedIds.has(id),
                  disabled: locked || !childOn(id),
                  title: t('settings.pinTitle'),
                  onClick: () => togglePinned(id, apps.ids),
                }, pinnedIds.has(id) ? t('settings.pinned') : t('settings.pin')),
                jsx(Switch, {
                  checked: childOn(id),
                  disabled: locked,
                  label: appLabel(id, t),
                  title: locked ? t('settings.childLocked', { name: t('settings.openWith.label') }) : undefined,
                  onChange: (next) => setChild(id, next),
                }),
              ),
            )),
      ) : null;

      // 应用开关必须紧跟「打开方式」这一行，而不是落到整个列表末尾。
      const rows = SETTINGS_ROWS.flatMap(([key, labelKey, hintKey]) => {
        // 「允许删除未归档会话」依赖「永久删除会话」这条主开关。
        const lockedByParent = key === 'deleteUnarchived'
          && (items.deleteSession === false || takenOver('deleteSession'));
        const row = h('div', { className: 'dsrm-settings-row', key },
          h('div', { className: 'dsrm-settings-copy' },
            h('div', { className: 'dsrm-settings-label' }, t(labelKey)),
            h('div', { className: 'dsrm-settings-hint' }, takenOver(key) ? t('settings.conflict') : t(hintKey)),
          ),
          h('div', { className: 'dsrm-settings-controls' },
            jsx(Switch, {
              checked: items[key] === true,
              disabled: takenOver(key) || lockedByParent,
              label: t(labelKey),
              title: lockedByParent
                ? t('settings.childLocked', { name: t('settings.deleteSession.label') })
                : undefined,
              onChange: (next) => setItem(key, next),
            }),
            key === 'openWith'
              ? h('button', {
                type: 'button',
                className: 'dsrm-expander',
                'aria-expanded': expanded,
                disabled: takenOver(key),
                title: expanded ? t('settings.collapse') : t('settings.expand'),
                onClick: toggleExpanded,
              }, jsx(IconTriangleRightFillRegular, {
                size: 10,
                className: expanded ? 'dsrm-expander-icon dsrm-expander-open' : 'dsrm-expander-icon',
              }))
              : null,
          ),
        );
        return key === 'openWith' && childRows ? [row, childRows] : [row];
      });

      const ellipsisGroups = ELLIPSIS_ROWS.map(([groupKey, titleKey, rows]) => h('div', {
        className: 'dsrm-settings-group',
        key: groupKey,
      },
        h('div', { className: 'dsrm-settings-group-title' }, t(titleKey)),
        h('div', { className: 'dsrm-settings-list' }, rows.map(([key, labelKey, hintKey]) => h('div', {
          className: 'dsrm-settings-row',
          key,
        },
          h('div', { className: 'dsrm-settings-copy' },
            h('div', { className: 'dsrm-settings-label' }, t(labelKey)),
            h('div', { className: 'dsrm-settings-hint' }, t(hintKey)),
          ),
          h('div', { className: 'dsrm-settings-controls' },
            jsx(Switch, {
              checked: ellipsis[key] === true,
              label: t(labelKey),
              onChange: (next) => setEllipsis(key, next),
            }),
          ),
        ))),
      ));

      return h('div', { className: 'dsrm-settings' },
        h('h2', { className: 'dsrm-settings-title' }, t('settings.title')),
        anyConflict ? h('div', { className: 'dsrm-settings-note' }, t('settings.conflictNote')) : null,
        h('div', { className: 'dsrm-settings-list' }, rows),
        h('h2', { className: 'dsrm-settings-title dsrm-settings-subtitle' }, t('settings.ellipsisTitle')),
        h('div', { className: 'dsrm-settings-note' }, t('settings.ellipsisHint')),
        h('div', { className: 'dsrm-settings-groups' }, ellipsisGroups),
      );
    }

    /* ---------------------------------------------------------- 菜单 */

    /**
     * 工作区行右键菜单。官方 Menu 的 items 只认单层条目，不支持子菜单，
     * 所以这里自绘 panel；普通行仍用 MenuItemButton，分隔线与菜单外观和官方一致。
     */
    function WorkspaceRowMenu({ x, y, props, onClose, mode = 'context' }) {
      const t = localeOf(rootCtx);
      const items = useItems();
      const ellipsis = useEllipsis();
      const apps = useApps();
      usePinned();
      useChildren();
      const hostRef = useRef(null);
      const [pos, setPos] = useState(null);

      const ellipsisMode = mode === 'ellipsis';
      /** 右键菜单永远显示；「…」菜单只在对应开关打开时显示（内置项除外）。 */
      const show = (key) => !ellipsisMode || ellipsis[key] === true;
      const openWithOn = items.openWith !== false && show('openWith');

      useEffect(() => {
        if (openWithOn) ensureApps();
      }, [openWithOn]);

      useEffect(() => {
        const host = hostRef.current;
        const dismiss = (event) => {
          if (host !== null && host.contains(event.target)) return;
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
      }, [onClose]);

      // 置顶应用是异步取到的，行数会变；渲染后量一次面板高度再夹进视口。
      useLayoutEffect(() => {
        const host = hostRef.current;
        if (host === null) return;
        const rect = host.getBoundingClientRect();
        const margin = 8;
        const left = Math.max(margin, Math.min(x, window.innerWidth - rect.width - margin));
        const top = Math.max(margin, Math.min(y, window.innerHeight - rect.height - margin));
        setPos((prev) => (prev !== null && prev.left === left && prev.top === top ? prev : { left, top }));
      }, [x, y, apps.status]);

      const group = props.group ?? {};
      const workspaceId = typeof group.workspaceId === 'string' ? group.workspaceId : '';
      const cwd = workspaceCwd(rootCtx, group);
      const tabs = serviceOf(rootCtx, 'projectTabs') ?? globalThis.__DSH_PROJECT_TABS__ ?? null;
      const canOpenInTab = tabs !== null && typeof tabs.openWorkspaceInTab === 'function' && workspaceId !== '';

      const openApp = (appId) => {
        if (cwd === '') {
          toast(t('noPath'));
          return;
        }
        openApplication(appId, cwd).then((ok) => {
          if (!ok) toast(t('openFailed'));
        });
      };

      const requestWorkspaceDelete = () => {
        if (workspaceId === '') {
          toast(t('actionFailed'));
          return;
        }
        const snapshot = serviceOf(rootCtx, 'workspaces')?.list?.getSnapshot?.();
        const entry = Array.isArray(snapshot?.items)
          ? snapshot.items.find((candidate) => candidate?.workspaceId === workspaceId)
          : undefined;
        const sessionIds = Array.isArray(entry?.sessionIds)
          ? entry.sessionIds.filter((id) => typeof id === 'string' && id !== '')
          : [];
        const title = typeof group.label === 'string' && group.label !== ''
          ? group.label
          : typeof group.title === 'string' && group.title !== ''
            ? group.title
            : cwd;
        requestDelete({ mode: 'workspace', workspaceId, sessionIds, displayTitle: title });
      };

      const run = (id) => {
        if (id === 'new-session') {
          try {
            props.onCreate?.();
          } catch (error) {
            console.warn('[dsh-sidebar-row-menu] new session failed:', error);
          }
          return;
        }
        if (id === 'rename') {
          try {
            props.actions?.rename?.();
          } catch (error) {
            console.warn('[dsh-sidebar-row-menu] workspace rename failed:', error);
          }
          return;
        }
        if (id === 'delete') {
          try {
            props.actions?.delete?.();
          } catch (error) {
            console.warn('[dsh-sidebar-row-menu] workspace delete failed:', error);
          }
          return;
        }
        if (id === 'delete-sessions') {
          requestWorkspaceDelete();
          return;
        }
        if (id === 'tab') {
          Promise.resolve().then(() => tabs.openWorkspaceInTab(workspaceId)).catch((reason) => {
            console.warn('[dsh-sidebar-row-menu] open in tab failed:', reason);
            toast(t('actionFailed'));
          });
          return;
        }
        if (id === 'copy-path') {
          if (cwd === '') {
            toast(t('noPath'));
            return;
          }
          copyText(cwd, t);
          return;
        }
        if (id === 'archived') toggleWorkspaceArchived(workspaceId);
      };

      const rows = [];
      if (typeof props.onCreate === 'function' && show('newSession')) {
        rows.push(jsx(MenuItemButton, {
          key: 'new-session',
          onSelect: () => {
            onClose();
            run('new-session');
          },
          icon: jsx(IconNewChatOutlineRegular, {}),
          children: t('newSession'),
        }));
      }
      rows.push(jsx(MenuItemButton, {
        key: 'rename',
        onSelect: () => {
          onClose();
          run('rename');
        },
        icon: jsx(IconEditOutlineRegular, {}),
        children: t('rename'),
      }));

      if (openWithOn) {
        const pinned = effectivePinned(apps.ids).filter((id) => childOn(id));
        pinned.forEach((id, index) => rows.push(jsx(MenuItemButton, {
          key: `pinned-${id}`,
          separatorBefore: index === 0,
          onSelect: () => {
            onClose();
            openApp(id);
          },
          icon: appIcon(id),
          children: t('openWithApp', { name: appLabel(id, t) }),
        })));
        rows.push(jsx(OpenWithSubmenu, {
          key: 'open-with',
          t,
          getCwd: () => cwd,
          closeParent: onClose,
          separatorBefore: pinned.length === 0,
        }));
      }

      if (show('copyPath')) {
        rows.push(jsx(MenuItemButton, {
          key: 'copy-path',
          separatorBefore: !openWithOn,
          onSelect: () => {
            onClose();
            run('copy-path');
          },
          icon: jsx(IconCopyOutlineRegular, { size: 14 }),
          children: t('copyPath'),
        }));
      }
      if (canOpenInTab && show('openInTab')) {
        rows.push(jsx(MenuItemButton, {
          key: 'tab',
          onSelect: () => {
            onClose();
            run('tab');
          },
          icon: jsx(IconProjectAddOutlineRegular, { size: 14 }),
          children: t('openInTab'),
        }));
      }
      const archivedCount = items.archivedSessions === false ? 0 : archivedCountOfWorkspace(workspaceId);
      if (archivedCount > 0 && show('showArchived')) {
        const archivedVisible = archivedRowsVisibleIn(workspaceId);
        rows.push(jsx(MenuItemButton, {
          key: 'archived',
          onSelect: () => {
            onClose();
            run('archived');
          },
          icon: jsx(archivedVisible ? IconArchiveOffOutlineRegular : IconArchiveOutlineRegular, { size: 14 }),
          children: t(archivedVisible ? 'hideArchivedSessions' : 'showArchivedSessions'),
        }));
      }
      rows.push(jsx(MenuItemButton, {
        key: 'delete',
        danger: true,
        separatorBefore: true,
        onSelect: () => {
          onClose();
          run('delete');
        },
        icon: jsx(IconTrashOutlineRegular, {}),
        children: t('deleteWorkspace'),
      }));
      if (show('deleteSessions')) {
        rows.push(jsx(MenuItemButton, {
          key: 'delete-sessions',
          danger: true,
          onSelect: () => {
            onClose();
            run('delete-sessions');
          },
          icon: jsx(IconTrashOutlineRegular, {}),
          children: t('deleteWorkspaceSessions'),
        }));
      }

      return h('div', {
        className: 'dsrm-menu',
        ref: hostRef,
        style: {
          left: pos?.left ?? x,
          top: pos?.top ?? y,
          visibility: pos === null ? 'hidden' : 'visible',
        },
      }, h(MenuSurface, { role: 'group', className: 'dsrm-menu-surface' }, rows));
    }

    /** 在 (x, y) 处挂出工作区菜单。mode='ellipsis' 表示从行尾「…」按钮打开。 */
    function showWorkspaceMenu(props, x, y, mode = 'context') {
      closeMenu();
      menuHost = document.createElement('div');
      menuHost.setAttribute(MENU_ATTR, '1');
      menuHost.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647';
      document.body.appendChild(menuHost);
      menuRoot = createRoot(menuHost);
      menuRoot.render(jsx(WorkspaceRowMenu, {
        x,
        y,
        props,
        mode,
        onClose: () => closeMenu(),
      }));
    }

    function localeOf(ctx) {
      try {
        if (typeof ctx?.locale?.bind === 'function') return ctx.locale.bind(NS);
      } catch (error) {
        console.warn('[dsh-sidebar-row-menu] locale bind failed:', error);
      }
      return (key) => key;
    }

    /** 工作区行右键菜单（没有 slot 可复用，只能自己组）。 */
    function openWorkspaceMenu(props, x, y, mode = 'context') {
      if (rootCtx === null) return;
      showWorkspaceMenu(props, x, y, mode);
    }

    /**
     * 行尾「…」按钮已经展开内置菜单时，用同一个按钮位置改挂本插件菜单。
     * 只在用户为工作区行开启了至少一个「…」附加项时接管；否则原生菜单原样工作。
     */
    function onWorkspaceEllipsisClick(event) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.target === null || event.target === undefined) return;
      if (rootCtx === null || !workspaceEllipsisOn()) return;
      // 0.2.2 起宿主菜单本身就是数据驱动的：附加条目由 provider 按开关加进去，
      // 再接管「…」只会把原生菜单换成自绘的那一份。
      if (contextMenusOf(rootCtx) !== null) return;
      const target = event.target;
      if (typeof target.closest !== 'function') return;
      const row = target.closest('[data-row-key]');
      if (row === null) return;
      const rowKey = row.getAttribute('data-row-key') ?? '';
      if (!rowKey.startsWith('workspace:')) return;
      const button = target.closest('button');
      if (button === null || !row.contains(button)) return;
      // 只接管行内第一个按钮（「…」）；新建会话按钮带快捷键标记，直接放行。
      const buttons = row.querySelectorAll('button');
      if (buttons.length === 0 || buttons[0] !== button) return;
      if (button.getAttribute('aria-keyshortcuts') !== null) return;
      const props = resolveWorkspaceRow(target);
      if (props === null) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      // 再点一次「…」视为收起当前菜单。
      if (menuHost !== null && ellipsisTrigger === button) {
        closeMenu();
        return;
      }
      const rect = button.getBoundingClientRect();
      openWorkspaceMenu(props, rect.left + rect.width, rect.bottom + 4, 'ellipsis');
      ellipsisTrigger = button;
    }

    /* ------------------------------------------------ 会话菜单的插件条目 */

    /**
     * 条目只在「右键打开的菜单」里出现；点行尾「…」打开的菜单保持原样。
     *
     * 不能用时间窗口判断：0.2.2 的菜单是异步挂载的（要等所有 provider 的
     * ready 和 prepare 延时），菜单一替换还会先卸载旧面板再挂新面板。
     * 这里改成「手势标记 + 面板出现即收尾」：右键时打标记，条目在挂载时
     * 读一次；新面板出现（或兜底超时）后标记立刻清掉，不会残留到下一次。
     */
    let rightClickMark = false;
    let rightClickToken = 0;
    let rightClickWatch = null;

    /** 收掉右键标记；期间若又发生一次右键（token 变了）则保留新的标记。 */
    function scheduleRightClickMarkEnd(delay) {
      const token = rightClickToken;
      window.setTimeout(() => {
        if (rightClickToken === token) rightClickMark = false;
      }, delay);
    }

    /** 当前文档里的菜单面板（测试里的最小 document stub 可能没有 querySelectorAll）。 */
    function menuPanels() {
      if (typeof document.querySelectorAll !== 'function') return [];
      return [...document.querySelectorAll('[role="menu"]')];
    }

    /** 右键手势开始：打标记，并等菜单面板出现后收尾。 */
    function markRightClickMenu() {
      rightClickToken += 1;
      rightClickMark = true;
      if (rightClickWatch !== null) return;
      const known = new Set(menuPanels());
      const watch = { observer: null, timer: 0 };
      rightClickWatch = watch;
      const release = (delay) => {
        if (rightClickWatch !== watch) return;
        rightClickWatch = null;
        window.clearTimeout(watch.timer);
        if (watch.observer !== null) watch.observer.disconnect();
        scheduleRightClickMarkEnd(delay);
      };
      // 面板迟迟不出现（手势被吞掉）也要收尾，避免标记残留。
      watch.timer = window.setTimeout(() => release(0), 3000);
      if (typeof MutationObserver !== 'function' || document.body === null) return;
      watch.observer = new MutationObserver(() => {
        if (rightClickWatch !== watch) return;
        for (const panel of menuPanels()) {
          if (known.has(panel)) continue;
          release(400);
          return;
        }
      });
      watch.observer.observe(document.body, { childList: true, subtree: true });
    }

    /** 点行尾「…」时先清掉上一轮的右键标记：那个菜单不该出现右键条目。 */
    function clearRightClickMark() {
      rightClickToken += 1;
      rightClickMark = false;
    }

    function useRightClickEntry() {
      const [visible] = useState(() => rightClickMark);
      return visible;
    }

    /**
     * 会话菜单条目：
     *  - 置顶应用 + 「打开方式」子菜单（官方 open-in-app 路由）
     *  - 「永久删除会话」「删除所有已归档会话」（已归档会话显示；未归档会话需在设置里开启）
     * 目录从客户端服务里现取 —— 这样不依赖行组件的内部闭包。
     */
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
      getSnapshot: () => appsState,
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

    function readHiddenWorkspaces() {
      const hidden = new Set();
      try {
        const raw = globalThis.localStorage?.getItem(ARCHIVED_HIDDEN_KEY);
        if (typeof raw !== 'string' || raw === '') return hidden;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return hidden;
        for (const id of parsed) {
          if (typeof id === 'string' && id !== '') hidden.add(id);
        }
      } catch {
        /* 坏数据按空集合处理 */
      }
      return hidden;
    }

    let hiddenArchivedWorkspaces = readHiddenWorkspaces();

    function persistHiddenWorkspaces() {
      try {
        globalThis.localStorage?.setItem(ARCHIVED_HIDDEN_KEY, JSON.stringify([...hiddenArchivedWorkspaces]));
      } catch {
        /* 隐私模式写不进去也照样生效到本次会话 */
      }
    }

    /**
     * 读宿主工作区视图的归档筛选。插件没有公开 API 订阅宿主视图 store，但视图
     * 状态会持久化到 localStorage 的 `dsh.workspace.view.vN`（筛选一变就写），
     * 所以读这里就能知道用户是否在「视图选项」里改过全局筛选。
     */
    function readViewFilter() {
      try {
        const storage = globalThis.localStorage;
        if (storage === null || storage === undefined || typeof storage.key !== 'function') return 'default';
        const keys = [];
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          if (typeof key === 'string' && key.startsWith('dsh.workspace.view.')) keys.push(key);
        }
        // 版本号是数字后缀，v10 必须排在 v5 前面。
        const versionOf = (key) => {
          const match = /\.v(\d+)$/.exec(key);
          return match === null ? -1 : Number(match[1]);
        };
        keys.sort((left, right) => versionOf(right) - versionOf(left));
        for (const key of keys) {
          const parsed = JSON.parse(storage.getItem(key) ?? '');
          if (parsed !== null && typeof parsed === 'object' && typeof parsed.archivedFilter === 'string') {
            return parsed.archivedFilter;
          }
        }
      } catch {
        /* 视图状态不可读时按默认筛选处理 */
      }
      return 'default';
    }

    /**
     * 宿主把 view actions 挂在 WorkspaceBrowser 组件的 props 上；插件没有服务可以
     * 拿到它，只能从行的 __reactFiber$ 往上找。找不到时静默放弃（筛选仍可手动切）。
     */
    function findArchivedViewActions() {
      if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return null;
      const row = document.querySelector('[data-row-key^="session:"], [data-row-key^="workspace:"]');
      if (row === null || row === undefined) return null;
      const field = Object.keys(row).find((name) => name.startsWith('__reactFiber$'));
      let fiber = field === undefined ? null : row[field];
      for (let depth = 0; depth < 48 && fiber !== null && fiber !== undefined; depth += 1) {
        const actions = fiber.memoizedProps?.actions;
        if (actions !== null && typeof actions === 'object' && typeof actions.setArchivedFilter === 'function') {
          return actions;
        }
        fiber = fiber.return;
      }
      return null;
    }

    let lastViewFilter = readViewFilter();

    function writeViewFilter(filter) {
      const actions = findArchivedViewActions();
      if (actions === null) return false;
      try {
        actions.setArchivedFilter(filter);
        lastViewFilter = filter;
        return true;
      } catch (error) {
        console.warn('[dsh-sidebar-row-menu] archived filter change failed:', error);
        return false;
      }
    }

    /** 当前快照里的归档会话集合，以及每个会话所属工作区（未归组的会话没有）。 */
    function archivedWorkspaceIndex() {
      const snapshot = serviceOf(rootCtx, 'workspaces')?.list?.getSnapshot?.();
      const archived = new Set(Array.isArray(snapshot?.archivedSessionIds) ? snapshot.archivedSessionIds : []);
      const owner = new Map();
      for (const item of Array.isArray(snapshot?.items) ? snapshot.items : []) {
        const workspaceId = typeof item?.workspaceId === 'string' ? item.workspaceId : '';
        if (workspaceId === '' || !Array.isArray(item?.sessionIds)) continue;
        for (const sessionId of item.sessionIds) {
          if (typeof sessionId === 'string' && sessionId !== '') owner.set(sessionId, workspaceId);
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

    /**
     * 归档会话的归属桶：工作区 id，未归组的会话算在 UNGROUPED_OWNER 这个桶里。
     * 逐工作区显示时未归组的归档也要一起藏起来，否则它们会跟着全局 show 漏出来。
     */
    const UNGROUPED_OWNER = '';

    function archivedHolders() {
      const { archived, owner } = archivedWorkspaceIndex();
      const holders = new Set();
      for (const sessionId of archived) holders.add(owner.get(sessionId) ?? UNGROUPED_OWNER);
      return holders;
    }

    function archivedRowsVisibleIn(workspaceId) {
      return readViewFilter() !== 'default' && !hiddenArchivedWorkspaces.has(workspaceId);
    }

    /**
     * 逐工作区开关：宿主只有全局筛选，所以「显示某工作区」= 全局切到 show，
     * 再把其他所有归档归属桶（含未归组）记进隐藏集合；「隐藏」= 记进隐藏集合，
     * 全部藏完后把全局收回 default，侧边栏恢复原样。
     */
    function toggleWorkspaceArchived(workspaceId) {
      if (workspaceId === '') return;
      const filter = readViewFilter();
      const visible = filter !== 'default' && !hiddenArchivedWorkspaces.has(workspaceId);
      if (visible) {
        hiddenArchivedWorkspaces.add(workspaceId);
      } else {
        hiddenArchivedWorkspaces.delete(workspaceId);
        // 从「隐藏已归档」进入逐工作区显示：只留这一个工作区，其他桶全部藏掉。
        if (filter === 'default') {
          for (const holder of archivedHolders()) {
            if (holder !== workspaceId) hiddenArchivedWorkspaces.add(holder);
          }
        }
      }
      // 清掉已经没有归档会话的桶，避免隐藏集合里堆着永远不会再出现的 id。
      const holders = archivedHolders();
      for (const id of [...hiddenArchivedWorkspaces]) {
        if (!holders.has(id)) hiddenArchivedWorkspaces.delete(id);
      }
      persistHiddenWorkspaces();
      if (!visible) {
        if (filter === 'default') writeViewFilter('show');
      } else if (filter === 'show') {
        // 有归档会话的桶全部被藏起来后，就没必要再把全局筛选停在 show。
        if (holders.size > 0 && [...holders].every((id) => hiddenArchivedWorkspaces.has(id))) {
          hiddenArchivedWorkspaces = new Set();
          persistHiddenWorkspaces();
          writeViewFilter('default');
        }
      }
      scheduleArchivedRows();
    }

    const ARCHIVED_ROW_ATTR = 'data-dsrm-archived-hidden';

    /**
     * 把不需要显示的归档行藏掉。宿主在 show 模式下会把所有工作区的归档行都渲染
     * 出来（没有逐工作区筛选），所以这里只能按 data-row-key 的会话 id 与快照
     * 里的归属关系决定藏哪些行。行组件重渲染时会被整体替换，MutationObserver
     * 会再次跑一遍。
     */
    function applyArchivedRows() {
      if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
      syncViewFilter();
      const filter = readViewFilter();
      const active = (filter === 'show' || filter === 'only') && hiddenArchivedWorkspaces.size > 0;
      const { archived, owner } = active ? archivedWorkspaceIndex() : { archived: new Set(), owner: new Map() };
      for (const row of document.querySelectorAll('[data-row-key^="session:"]')) {
        const sessionId = row.getAttribute('data-row-key').slice('session:'.length);
        const bucket = owner.get(sessionId) ?? UNGROUPED_OWNER;
        const hide = active && archived.has(sessionId) && hiddenArchivedWorkspaces.has(bucket);
        if (hide) {
          if (row.style.display !== 'none') {
            row.setAttribute(ARCHIVED_ROW_ATTR, '1');
            row.style.display = 'none';
          }
        } else if (row.getAttribute(ARCHIVED_ROW_ATTR) === '1') {
          row.removeAttribute(ARCHIVED_ROW_ATTR);
          row.style.display = '';
        }
      }
    }

    /** 用户在「视图选项」里改了全局筛选：以全局选择为准，清掉逐工作区隐藏。 */
    function syncViewFilter() {
      const current = readViewFilter();
      if (current === lastViewFilter) return;
      lastViewFilter = current;
      hiddenArchivedWorkspaces = new Set();
      persistHiddenWorkspaces();
    }

    let archivedApplyTimer = 0;
    let archivedObserver = null;

    function scheduleArchivedRows() {
      if (typeof setTimeout !== 'function') {
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
          if (node.nodeType === 1 && (node.matches?.('[data-row-key]') || node.querySelector?.('[data-row-key]'))) {
            return true;
          }
        }
        for (const node of record.removedNodes) {
          if (node.nodeType === 1 && (node.matches?.('[data-row-key]') || node.querySelector?.('[data-row-key]'))) {
            return true;
          }
        }
      }
      return false;
    }

    function startArchivedRows() {
      scheduleArchivedRows();
      if (typeof MutationObserver !== 'function') return () => {};
      if (typeof document === 'undefined' || document.body === null || document.body === undefined) return () => {};
      archivedObserver = new MutationObserver((records) => {
        if (archivedRowMutation(records)) scheduleArchivedRows();
      });
      archivedObserver.observe(document.body, { childList: true, subtree: true });
      return () => {
        archivedObserver?.disconnect();
        archivedObserver = null;
        if (archivedApplyTimer !== 0 && typeof clearTimeout === 'function') {
          clearTimeout(archivedApplyTimer);
          archivedApplyTimer = 0;
        }
        if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
        for (const row of document.querySelectorAll(`[${ARCHIVED_ROW_ATTR}="1"]`)) {
          row.removeAttribute(ARCHIVED_ROW_ATTR);
          row.style.display = '';
        }
      };
    }


    function workspaceSessionIds(workspaceId) {
      const snapshot = serviceOf(rootCtx, 'workspaces')?.list?.getSnapshot?.();
      const entry = Array.isArray(snapshot?.items)
        ? snapshot.items.find((candidate) => candidate?.workspaceId === workspaceId)
        : undefined;
      return Array.isArray(entry?.sessionIds)
        ? entry.sessionIds.filter((id) => typeof id === 'string' && id !== '')
        : [];
    }

    function openAppAt(appId, cwd, t) {
      if (cwd === '') {
        toast(t('noPath'));
        return;
      }
      openApplication(appId, cwd).then((ok) => {
        if (!ok) toast(t('openFailed'));
      });
    }

    /**
     * 数据贡献的一批工作区动作；group 字段决定它挂到哪个 order 的 provider，
     * 从而夹在原生 rename(100)/reveal(200)/delete(300) 之间。
     */
    function workspaceMenuActions(ctx, value, t) {
      const workspaceId = typeof value?.workspaceId === 'string' ? value.workspaceId : '';
      if (workspaceId === '') return [];
      const cwd = typeof value?.path === 'string' ? value.path : '';
      const items = [];

      items.push({
        id: 'new-session',
        group: 'new',
        label: t('newSession'),
        icon: { key: 'sidebar-row-menu.new' },
        run: () => {
          const ui = serviceOf(rootCtx, 'uiWorkspace');
          if (typeof ui?.startSession === 'function') {
            try {
              ui.startSession(workspaceId, {});
            } catch (error) {
              console.warn('[dsh-sidebar-row-menu] new session failed:', error);
            }
          }
        },
      });

      const apps = appsSnapshot();
      const withApps = itemsSnapshot().openWith !== false;
      const pinned = withApps ? effectivePinned(apps.ids).filter((id) => childOn(id)) : [];
      const enabledApps = withApps ? apps.ids.filter((id) => childOn(id)) : [];
      const pinnedSet = new Set(pinned);
      const submenuApps = enabledApps.filter((id) => !pinnedSet.has(id));
      if (withApps) ensureApps();

      // 与会话菜单同一套分组：行内动作 → 复制/在文件夹显示 → 打开方式 → 删除。
      const tabs = serviceOf(rootCtx, 'projectTabs') ?? globalThis.__DSH_PROJECT_TABS__ ?? null;
      if (tabs !== null && typeof tabs?.openWorkspaceInTab === 'function') {
        items.push({
          id: 'tab',
          group: 'tab',
          label: t('openInTab'),
          icon: { key: 'sidebar-row-menu.tab' },
          run: () => {
            Promise.resolve().then(() => tabs.openWorkspaceInTab(workspaceId)).catch((reason) => {
              console.warn('[dsh-sidebar-row-menu] open in tab failed:', reason);
              toast(t('actionFailed'));
            });
          },
        });
      }

      // 归档会话的显示开关：只有该工作区确实存在归档会话时才出现，状态用图标
      // 与文案区分（宿主菜单项没有 checked 字段）。
      const archivedCount = itemOn('archivedSessions') ? archivedCountOfWorkspace(workspaceId) : 0;
      if (archivedCount > 0) {
        const archivedVisible = archivedRowsVisibleIn(workspaceId);
        items.push({
          id: 'archived',
          group: 'archived',
          label: t(archivedVisible ? 'hideArchivedSessions' : 'showArchivedSessions'),
          icon: { key: archivedVisible ? 'sidebar-row-menu.archive-off' : 'sidebar-row-menu.archive' },
          run: () => toggleWorkspaceArchived(workspaceId),
        });
      }

      items.push({
        id: 'copy-path',
        group: 'copy',
        separatorBefore: true,
        label: t('copyPath'),
        icon: { key: 'sidebar-row-menu.copy' },
        run: () => {
          if (cwd === '') {
            toast(t('noPath'));
            return;
          }
          copyText(cwd, t);
        },
      });

      pinned.forEach((id, index) => {
        items.push({
          id: `pinned-${id}`,
          group: 'pinned',
          separatorBefore: index === 0,
          label: t('openWithApp', { name: appLabel(id, t) }),
          icon: { key: 'sidebar-row-menu.app', src: ICON_ROUTE + encodeURIComponent(id) },
          run: () => openAppAt(id, cwd, t),
        });
      });

      if (withApps && submenuApps.length > 0) {
        items.push({
          id: 'open-with',
          group: 'open-with',
          separatorBefore: pinned.length === 0,
          // 宿主的菜单项对子菜单只设 aria-haspopup，不画右侧箭头。label 在宿主里
          // 是直接当 children 渲染的，所以这里塞一个右对齐的箭头元素，与会话菜单
          // 里的「打开方式」保持同一套外观（0.2.1 自绘菜单本来就是自己画的）。
          label: h('span', { className: 'dsrm-host-label' },
            h('span', { className: 'dsrm-host-label-text' }, t('openWith')),
            jsx(IconChevronRightOutlineRegular, { size: 12, className: 'dsrm-submenu-chevron' }),
          ),
          icon: { key: 'sidebar-row-menu.open-with' },
          children: submenuApps.map((id) => ({
            id: `app-${id}`,
            label: appLabel(id, t),
            icon: { key: 'sidebar-row-menu.app', src: ICON_ROUTE + encodeURIComponent(id) },
            run: () => openAppAt(id, cwd, t),
          })),
        });
      }

      items.push({
        id: 'delete-sessions',
        group: 'delete',
        danger: true,
        separatorBefore: false,
        label: t('deleteWorkspaceSessions'),
        icon: { key: 'sidebar-row-menu.delete' },
        run: () => {
          const title = typeof value?.displayTitle === 'string' && value.displayTitle !== '' ? value.displayTitle : cwd;
          requestDelete({
            mode: 'workspace',
            workspaceId,
            sessionIds: workspaceSessionIds(workspaceId),
            displayTitle: title,
          });
        },
      });

      return items;
    }

    /** 宿主只按 provider.order 排序，同组顺序即数组顺序；故每组单独注册。 */
    const WORKSPACE_MENU_GROUPS = [
      { key: 'new', order: 90 },
      { key: 'tab', order: 110 },
      { key: 'archived', order: 130 },
      { key: 'copy', order: 150 },
      { key: 'pinned', order: 210 },
      { key: 'open-with', order: 220 },
      { key: 'delete', order: 310 },
    ];

    /**
     * 0.2.2 的「…」按钮与右键共用同一份宿主菜单，条目本身无法感知手势，
     * 所以按右键标记决定是否进入这份菜单；打开对应附加开关后，点「…」也显示。
     */
    const WORKSPACE_GROUP_ELLIPSIS = {
      new: 'newSession',
      pinned: 'openWith',
      'open-with': 'openWith',
      copy: 'copyPath',
      tab: 'openInTab',
      archived: 'showArchived',
      delete: 'deleteSessions',
    };

    function workspaceGroupVisible(groupKey) {
      if (rightClickMark) return true;
      const key = WORKSPACE_GROUP_ELLIPSIS[groupKey];
      return key !== undefined && ellipsisSettings[key] === true;
    }

    /** 注册工作区动作；服务可能晚于插件 apply 出现，带有限重试。 */
    function registerWorkspaceContextMenu(ctx) {
      let disposers = null;
      let icons = null;
      let timer = 0;
      let attempts = 0;

      const registerIcons = () => {
        if (ctx.slots === null || ctx.slots === undefined) return;
        icons = ctx.slots.inject('contextMenu.icon', function* () {
          yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.new' }, IconNewChatOutlineRegular);
          yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.copy' }, IconCopyOutlineRegular);
          yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.tab' }, IconProjectAddOutlineRegular);
          yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.archive' }, IconArchiveOutlineRegular);
          yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.archive-off' }, IconArchiveOffOutlineRegular);
          yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.open-with' }, IconRightUpOutlineRegular);
          yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.delete' }, IconTrashOutlineRegular);
          yield ctx.slots.register({ name: 'contextMenu.icon', key: 'sidebar-row-menu.app' }, ContextMenuAppIcon);
        });
      };

      const register = () => {
        timer = 0;
        if (disposers !== null) return;
        const menus = contextMenusOf(ctx);
        if (menus === null) {
          if (attempts >= 40 || typeof setTimeout !== 'function') return;
          attempts += 1;
          timer = setTimeout(register, 250);
          return;
        }
        registerIcons();
        const registered = [];
        for (const group of WORKSPACE_MENU_GROUPS) {
          try {
            registered.push(menus.register({
              id: `sidebar-row-menu.workspace.${group.key}`,
              target: 'workspace',
              order: group.order,
              observe: () => [appsSource],
              resolve: (target) => {
                if (!workspaceGroupVisible(group.key)) return [];
                return workspaceMenuActions(ctx, target, localeOf(ctx))
                  .filter((action) => action.group === group.key)
                  .map(({ group: _group, ...action }) => action);
              },
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
            /* 注册已随插件生命周期撤销 */
          }
        }
        try {
          icons?.();
        } catch {
          /* icon 条目可能未注册成功 */
        }
      };
    }

    /** 删除确认框挂到 shell.overlay，避免菜单关闭时被一起卸载。 */
    function registerDeleteDialog(ctx) {
      return ctx.slots.inject('shell.overlay', function* () {
        yield ctx.slots.register({
          name: 'shell.overlay',
          id: 'sidebar-row-menu-delete-dialog',
          order: 60,
          locale: NS,
        }, DeleteDialog);
      });
    }

    /** 设置页：所有新增项都能在这里关掉。 */
    function registerSettings(ctx) {
      const stopSection = ctx.slots.inject('settings.section', function* () {
        yield ctx.slots.register({
          name: 'settings.section',
          id: 'sidebar-row-menu',
          order: 32,
          label: () => ctx.locale.bind(NS)('settings.title'),
          locale: NS,
        }, SettingsSection);
      });
      // 0.2.2 起导航栏按 section id 取自定义图标（settings.section.icon，
      // owner 传 { size, active }）。0.2.1 没有这个 slot，对未声明的 key
      // 调 inject 可能直接抛错，吞掉即可——两个版本共用同一份客户端代码。
      try {
        ctx.slots.inject('settings.section.icon', function* () {
          yield ctx.slots.register({
            name: 'settings.section.icon',
            id: 'sidebar-row-menu',
            order: 32,
          }, SettingsNavIcon);
        });
      } catch (error) {
        console.warn('[dsh-sidebar-row-menu] settings.section.icon is unavailable:', error);
      }
      return stopSection;
    }

    /* -------------------------------------------- 会话行：展开官方菜单 */

    /** 当前被临时改写的锚点元素（菜单关闭即还原）。 */
    let anchorPatch = null;

    /**
     * 内置 Menu 给会话行的「…」菜单传了 closeOnPointerLeave，指针一旦移出
     * 菜单就会关闭。工作区右键菜单没有这个行为，为了两者一致，右键打开的
     * 菜单在存活期间屏蔽 portal 面板 / 锚点冒泡到 React 根的 pointerout。
     */
    let menuLeaveGuard = null;

    function releaseMenuLeaveGuard() {
      const guard = menuLeaveGuard;
      menuLeaveGuard = null;
      if (guard === null) return;
      document.removeEventListener('pointerout', guard.block, true);
      document.removeEventListener('pointerover', guard.block, true);
    }

    function guardMenuLeave(panel, trigger) {
      releaseMenuLeaveGuard();
      const inside = (node) => {
        if (node === null || node === undefined) return false;
        return panel.contains(node)
          || (trigger !== null && trigger !== undefined && trigger.contains(node));
      };
      const block = (event) => {
        if (inside(event.target) || inside(event.relatedTarget)) {
          // React 的 onPointerLeave 由 pointerout/pointerover 合成；在 document
          // 捕获阶段截断，React 根节点就收不到这对事件，菜单也就不会因移出而关。
          event.stopPropagation();
        }
      };
      document.addEventListener('pointerout', block, true);
      document.addEventListener('pointerover', block, true);
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
          /* ignore */
        }
      }
    }

    /**
     * 官方 Menu 没有 anchor 时会用组件根节点的 rect 定位；把「…」按钮
     * 及其两层祖先的 rect 临时指到指针位置，菜单就会开花在指针旁边。
     * 菜单一关闭（portal 面板从 body 移除）立即还原。
     */
    function patchAnchorRect(button, x, y) {
      restoreAnchorRect();
      if (button === null || button === undefined || typeof button.getBoundingClientRect !== 'function') return;
      const items = [];
      let element = button;
      for (let level = 0; level < 3 && element !== null && element !== undefined; level += 1) {
        items.push({ el: element, original: element.getBoundingClientRect });
        element = element.parentElement;
      }
      const rect = anchorRectAt(x, y);
      for (const item of items) item.el.getBoundingClientRect = () => rect;
      let observer = null;
      if (typeof MutationObserver === 'function' && document.body !== null) {
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
      }, 3000);
    }

    /**
     * 在行组件的 fiber 子树里找内置「…」Menu 的 props。
     * Menu 的 anchor 是那个省略号按钮，anchor.props.onClick 就是 setMenuOpen(v => !v)。
     * @returns Menu props，或 null。
     */
    function findMenuProps(node, depth, budget) {
      if (node === null || node === undefined || depth > 18 || budget.count > 600) return null;
      budget.count += 1;
      const props = node.memoizedProps;
      if (
        props !== null
        && typeof props === 'object'
        && typeof props.open === 'boolean'
        && props.anchor !== null
        && typeof props.anchor === 'object'
        && props.anchor.props !== null
        && typeof props.anchor.props.onClick === 'function'
      ) {
        return props;
      }
      for (let child = node.child; child !== null && child !== undefined; child = child.sibling) {
        const found = findMenuProps(child, depth + 1, budget);
        if (found !== null) return found;
      }
      return null;
    }

    /**
     * 有些插件（例如 meow-memory 的「记忆参与」）在菜单打开后才用
     * MutationObserver 往面板里补一个 DOM 条目；它们只有在收到行内「…」
     * 按钮的 pointerdown 时才走同步注入的快路径，否则要等约 120ms 的防抖，
     * 表现就是菜单先出现、条目晚一拍再冒出来，触发一次可见的重排。
     *
     * 右键发生在行标题等位置，天然不会点到「…」按钮，所以这里补发一次
     * pointerdown，让这类插件在菜单挂载的同一帧完成注入。事件只用于通知，
     * 不派发 click，也不会二次打开菜单。
     */
    function primeRowActionPointer(trigger) {
      if (trigger === null || trigger === undefined || typeof trigger.dispatchEvent !== 'function') return;
      if (typeof PointerEvent !== 'function') return;
      try {
        trigger.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
          button: 0,
          buttons: 1,
        }));
      } catch {
        /* 第三方 pointerdown 监听器抛错不应影响菜单打开 */
      }
    }

    /**
     * 右键会话行时在指针处展开该行自带的菜单（0.2.1 的旧内置 Menu）。
     * 0.2.2 起宿主自己提供 contextmenu 触发器，不再走这里。
     */
    function openSessionRowMenu(row, x, y) {
      const trigger = typeof row.querySelector === 'function'
        ? row.querySelector('[class*="rowActions"] button')
        : null;
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

    /* -------------------------------------------------- 样式（子菜单 / 设置页） */

    const STYLE = `
.dsrm-submenu-host{position:relative;display:flex;align-items:center;width:100%}
.dsrm-submenu-trigger{display:flex;align-items:center;gap:6px;width:100%;min-height:34px;padding:6px 8px;border:0;border-radius:var(--dsw-radius-md);background:none;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;text-align:left;cursor:pointer}
.dsrm-submenu-trigger:hover:not(:disabled),.dsrm-submenu-trigger:focus-visible{background:var(--dsw-alias-interactive-bg-hover);outline:none}
.dsrm-submenu-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsrm-submenu-chevron{color:var(--dsw-alias-label-caption)}
.dsrm-host-label{display:flex;align-items:center;gap:6px;width:100%}
.dsrm-host-label-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.dsrm-submenu{position:fixed;z-index:1101;min-width:180px;max-width:300px;max-height:min(380px,64vh);overflow:auto;padding:4px}
.dsrm-submenu-empty{padding:6px 8px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.dsrm-menu{position:fixed;z-index:2147483647}
.dsrm-menu-surface{min-width:210px;padding:4px}
.dsrm-sep{height:.5px;margin:3px 2px;background:var(--dsw-alias-border-l2)}
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
      if (document.head === null || document.head === undefined) return () => {};
      const style = document.createElement('style');
      style.setAttribute('data-dsh-sidebar-row-menu-style', '');
      style.textContent = STYLE;
      document.head.appendChild(style);
      return () => style.remove();
    }

    /* -------------------------------------------------------------- 安装 */

    /**
     * 0.2.2 的会话行自己带 contextmenu 触发器（宿主 getTriggerProps 展开的
     * onContextMenu），它会把同一份菜单开在指针处。0.2.1 的行没有这个处理器，
     * 只能由插件代点行尾「…」再改锚点。
     */
    function hasNativeRowMenu(row) {
      const fiber = fiberOf(row);
      const props = fiber === null ? null : fiber.memoizedProps;
      return props !== null && props !== undefined && typeof props.onContextMenu === 'function';
    }

    /** 全局 contextmenu 拦截：只有命中工作区 / 会话行才接管。 */
    function onContextMenu(event) {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (target === null || target === undefined) return;
      const start = target.nodeType === 3 ? target.parentElement : target;
      if (start === null || start === undefined || typeof start.closest !== 'function') return;

      const row = start.closest('[data-row-key]');
      if (row === null) return;
      const rowKey = row.getAttribute('data-row-key') ?? '';
      if (!rowKey.startsWith('workspace:') && !rowKey.startsWith('session:')) return;

      // 宿主自己会处理右键（0.2.2）：只打手势标记，菜单交给宿主开在指针处。
      // 这样既不用改锚点、也不用代点「…」，少两层时序假设；provider 在解析时用
      // 这个标记决定条目是否进入菜单（「…」的按下会先清标）。
      if (hasNativeRowMenu(row)) {
        if (rowKey.startsWith('session:') && resolveSessionRow(start) === null) return;
        markRightClickMenu();
        primeRowActionPointer(typeof row.querySelector === 'function'
          ? row.querySelector('[class*="rowActions"] button')
          : null);
        return;
      }

      if (rowKey.startsWith('workspace:')) {
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
        }
        return;
      }

      if (resolveSessionRow(start) === null) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      openSessionRowMenu(row, event.clientX, event.clientY);
    }

    /** 行尾「…」按下时先收掉右键标记：那个菜单不该出现右键条目。 */
    function onRowActionsPointerDown(event) {
      // 只认真实输入：插件自己补发的 pointerdown（primeRowActionPointer）不算手势。
      if (event.isTrusted === false) return;
      const target = event.target;
      if (target === null || target === undefined) return;
      const start = target.nodeType === 3 ? target.parentElement : target;
      if (start === null || start === undefined || typeof start.closest !== 'function') return;
      if (start.closest('[class*="rowActions"]') === null) return;
      clearRightClickMark();
    }

    function install() {
      window.addEventListener('contextmenu', onContextMenu, true);
      document.addEventListener('pointerdown', onRowActionsPointerDown, true);
      document.addEventListener('click', onWorkspaceEllipsisClick, true);
      console.info('[dsh-sidebar-row-menu] installed');
      return () => {
        window.removeEventListener('contextmenu', onContextMenu, true);
        document.removeEventListener('pointerdown', onRowActionsPointerDown, true);
        document.removeEventListener('click', onWorkspaceEllipsisClick, true);
        closeMenu();
        closeToast();
      };
    }

    /**
     * cordis 客户端插件入口。
     * @param ctx - 客户端根上下文。
     */
    function apply(ctx) {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      rootCtx = ctx;
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
          rootCtx = null;
          stopWorkspaceMenu();
          stopArchivedRows();
          teardown();
        }, 'sidebar-row-menu: row context menus');
      }
    }

    exports.apply = apply;
    exports.inject = ['locale', 'sessions', 'workspaces', 'slots'];
    exports.name = 'sidebar-row-menu';
    return module.exports;
  },
});
