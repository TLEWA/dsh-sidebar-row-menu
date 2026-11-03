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
      deleteSession: true,
      deleteArchived: true,
      deleteUnarchived: false,
    };
    const ITEM_KEYS = Object.keys(ITEM_DEFAULTS);
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
      'delete.title': '永久删除会话？',
      'delete.description': '会话「{name}」的日志将从磁盘永久删除，此操作无法撤销。',
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
    };
    const en = {
      newSession: 'New session',
      rename: 'Rename',
      vscode: 'Open in VS Code',
      explorer: 'Reveal in File Explorer',
      copyPath: 'Copy workspace path',
      openInTab: 'Open in new tab',
      deleteWorkspace: 'Delete workspace',
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
      'delete.title': 'Delete this session permanently?',
      'delete.description': 'The log of "{name}" will be removed from disk. This cannot be undone.',
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
      const bulk = request.mode === 'archived';
      const ids = bulk ? request.sessionIds : [request.sessionId];
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
            const result = await postDelete(ids);
            if (result.ok !== true && (result.deleted ?? 0) === 0) {
              const reason = typeof result.error === 'string' && result.error !== '' ? result.error : t('delete.unavailable');
              throw new Error(reason);
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
        title: bulk ? t('delete.archivedTitle') : t('delete.title'),
        description: bulk
          ? t('delete.archivedDescription', { n: ids.length })
          : t('delete.description', { name: request.displayTitle ?? '' }),
        footer: h(Fragment, null,
          jsx(Button, { variant: 'outline', disabled: busy, onClick: close, children: t('delete.cancel') }),
          jsx(Button, {
            variant: 'outline',
            disabled: busy,
            onClick: confirm,
            children: h('span', { className: 'dsrm-danger-label' }, bulk ? t('delete.archivedConfirm') : t('delete.confirm')),
          })),
        children: [
          busy
            ? h('div', { className: 'dsrm-status-text', role: 'status', key: 'busy' }, bulk ? t('delete.archivedPending') : t('delete.pending'))
            : null,
          partial !== null
            ? h('div', { className: 'dsrm-status-text', role: 'status', key: 'partial' }, t('delete.archivedPartial', { done: partial.done, failed: partial.failed }))
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
      const visible = useRightClickEntry();
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
      const visible = useRightClickEntry();
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
      const visible = useRightClickEntry();
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
      const visible = useRightClickEntry();
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
    ];

    function SettingsSection({ t }) {
      const items = useItems();
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

      return h('div', { className: 'dsrm-settings' },
        h('h2', { className: 'dsrm-settings-title' }, t('settings.title')),
        anyConflict ? h('div', { className: 'dsrm-settings-note' }, t('settings.conflictNote')) : null,
        h('div', { className: 'dsrm-settings-list' }, rows),
      );
    }

    /* ---------------------------------------------------------- 菜单 */

    /**
     * 工作区行右键菜单。官方 Menu 的 items 只认单层条目，不支持子菜单，
     * 所以这里自绘 panel；普通行仍用 MenuItemButton，分隔线与菜单外观和官方一致。
     */
    function WorkspaceRowMenu({ x, y, props, onClose }) {
      const t = localeOf(rootCtx);
      const items = useItems();
      const apps = useApps();
      usePinned();
      useChildren();
      const hostRef = useRef(null);
      const [pos, setPos] = useState(null);

      const openWithOn = items.openWith !== false;

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
        }
      };

      const rows = [];
      if (typeof props.onCreate === 'function') {
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
      if (canOpenInTab) {
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

    /** 在 (x, y) 处挂出工作区菜单。 */
    function showWorkspaceMenu(props, x, y) {
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
    function openWorkspaceMenu(props, x, y) {
      if (rootCtx === null) return;
      showWorkspaceMenu(props, x, y);
    }

    /* ------------------------------------------------ 会话菜单的插件条目 */

    /**
     * 条目只在「右键打开的菜单」里出现；点「…」打开的菜单保持原样。
     * 在挂载时取值，避免菜单后续重渲染时条目突然消失。
     */
    let rightClickMenuUntil = 0;

    function useRightClickEntry() {
      const [visible] = useState(() => Date.now() < rightClickMenuUntil);
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
      return ctx.slots.inject('settings.section', function* () {
        yield ctx.slots.register({
          name: 'settings.section',
          id: 'sidebar-row-menu',
          order: 32,
          label: () => ctx.locale.bind(NS)('settings.title'),
          locale: NS,
        }, SettingsSection);
      });
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
      rightClickMenuUntil = 0;
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
     * 右键会话行时在指针处展开该行自带的「…」菜单。
     * 菜单内容来自 slot 注册表：内置条目和第三方条目都在，本插件不复制内置动作；
     * 本插件自己的三条只在 rightClickMenuUntil 窗口内挂载。
     */
    function openSessionRowMenu(row, x, y) {
      const trigger = typeof row.querySelector === 'function'
        ? row.querySelector('[class*="rowActions"] button')
        : null;
      const fiber = fiberOf(row);
      const menu = fiber === null ? null : findMenuProps(fiber.child, 0, { count: 0 });
      if (menu !== null && menu.open === true) return;
      // 先还原旧锚点（会清掉上一轮的窗口），再设置本轮窗口并挂新锚点。
      patchAnchorRect(trigger, x, y);
      rightClickMenuUntil = Date.now() + 400;
      window.setTimeout(() => {
        rightClickMenuUntil = 0;
      }, 600);
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
.dsrm-submenu{position:fixed;z-index:1101;min-width:180px;max-width:300px;max-height:min(380px,64vh);overflow:auto;padding:4px}
.dsrm-submenu-empty{padding:6px 8px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.dsrm-menu{position:fixed;z-index:2147483647}
.dsrm-menu-surface{min-width:210px;padding:4px}
.dsrm-sep{height:.5px;margin:3px 2px;background:var(--dsw-alias-border-l2)}
.dsrm-app-icon{width:14px;height:14px;border-radius:3px;display:block;object-fit:contain}
.dsrm-settings{max-width:820px;margin:0 auto;padding:2px 0 36px}
.dsrm-settings-title{margin:0;font-size:16px;line-height:24px;font-weight:600}
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

    function install() {
      window.addEventListener('contextmenu', onContextMenu, true);
      console.info('[dsh-sidebar-row-menu] installed');
      return () => {
        window.removeEventListener('contextmenu', onContextMenu, true);
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
      const teardown = install();
      if (ctx !== null && typeof ctx.effect === 'function') {
        ctx.effect(() => () => {
          rootCtx = null;
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
