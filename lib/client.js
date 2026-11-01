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

    const { useCallback, useState } = require('react');
    const { jsx } = require('react/jsx-runtime');
    const { createRoot } = require('react-dom/client');
    const {
      Menu,
      MenuItemButton,
      Toast,
      writeClipboard,
      IconEditOutlineRegular,
      IconTrashOutlineRegular,
      IconCodeOutlineRegular,
      IconFolderOpenRegular,
      IconProjectAddOutlineRegular,
      IconNewChatOutlineRegular,
      IconWarningOutlineRegular,
      IconCopyOutlineRegular,
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
    };

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

    /* -------------------------------------------------------------- 菜单 */

    /**
     * 一次右键菜单的 React 组件。
     * 用 portal 模式 + 显式锚点矩形，把菜单钉在鼠标位置；Menu 自己负责
     * 视口夹取、键盘导航和「点外部 / Esc 关闭」。
     */
    function RowContextMenu({ x, y, items, onSelect, onClose }) {
      const getAnchorRect = useCallback(
        () => ({ left: x, right: x, top: y, bottom: y, width: 0, height: 0 }),
        [x, y],
      );
      return jsx(Menu, {
        open: true,
        anchor: null,
        items,
        portal: true,
        autoFocus: true,
        align: 'start',
        side: 'bottom',
        getAnchorRect,
        onSelect,
        onClose,
      });
    }

    /** 在 (x, y) 处挂出菜单。 */
    function showMenu(items, onSelect, x, y) {
      closeMenu();
      menuHost = document.createElement('div');
      menuHost.setAttribute(MENU_ATTR, '1');
      menuHost.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647';
      document.body.appendChild(menuHost);
      menuRoot = createRoot(menuHost);
      menuRoot.render(jsx(RowContextMenu, {
        x,
        y,
        items,
        onSelect: (id) => {
          closeMenu();
          onSelect(id);
        },
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
      const ctx = rootCtx;
      if (ctx === null) return;
      const t = localeOf(ctx);
      const group = props.group ?? {};
      const workspaceId = typeof group.workspaceId === 'string' ? group.workspaceId : '';
      const cwd = workspaceCwd(ctx, group);

      const tabs = serviceOf(ctx, 'projectTabs') ?? globalThis.__DSH_PROJECT_TABS__ ?? null;
      const canOpenInTab = tabs !== null && typeof tabs.openWorkspaceInTab === 'function' && workspaceId !== '';

      const items = [];
      if (typeof props.onCreate === 'function') {
        items.push({ id: 'new-session', label: t('newSession'), icon: jsx(IconNewChatOutlineRegular, {}) });
      }
      items.push({ id: 'rename', label: t('rename'), icon: jsx(IconEditOutlineRegular, {}) });
      items.push({ id: 'sep1', type: 'separator' });
      items.push({ id: 'vscode', label: t('vscode'), icon: jsx(IconCodeOutlineRegular, { size: 14 }) });
      items.push({ id: 'explorer', label: t('explorer'), icon: jsx(IconFolderOpenRegular, { size: 14 }) });
      items.push({ id: 'copy-path', label: t('copyPath'), icon: jsx(IconCopyOutlineRegular, { size: 14 }) });
      if (canOpenInTab) {
        items.push({ id: 'tab', label: t('openInTab'), icon: jsx(IconProjectAddOutlineRegular, { size: 14 }) });
      }
      items.push({ id: 'sep2', type: 'separator' });
      items.push({ id: 'delete', label: t('deleteWorkspace'), icon: jsx(IconTrashOutlineRegular, {}), danger: true });

      const onSelect = (id) => {
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
          return;
        }
        openPath(id, cwd, t);
      };

      showMenu(items, onSelect, x, y);
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
     * 会话菜单条目：在 VS Code 中打开。
     * 条目只拿到 { sessionId, displayTitle } 与 slot 注入的 useMenuOpenState / t，
     * 目录从客户端服务里现取 —— 这样不依赖行组件的内部闭包。
     */
    function SessionVscodeMenuItem({ sessionId, useMenuOpenState, t }) {
      const visible = useRightClickEntry();
      const [, setMenuOpen] = useMenuOpenState();
      if (!visible) return null;
      return jsx(MenuItemButton, {
        separatorBefore: true,
        icon: jsx(IconCodeOutlineRegular, { size: 14 }),
        onSelect: () => {
          setMenuOpen(false);
          openPath('vscode', sessionCwd(rootCtx, sessionId), t);
        },
        children: t('vscode'),
      });
    }

    /** 会话菜单条目：在资源管理器中显示。 */
    function SessionExplorerMenuItem({ sessionId, useMenuOpenState, t }) {
      const visible = useRightClickEntry();
      const [, setMenuOpen] = useMenuOpenState();
      if (!visible) return null;
      return jsx(MenuItemButton, {
        icon: jsx(IconFolderOpenRegular, { size: 14 }),
        onSelect: () => {
          setMenuOpen(false);
          openPath('explorer', sessionCwd(rootCtx, sessionId), t);
        },
        children: t('explorer'),
      });
    }

    /**
     * 把本插件自己的会话动作注册进内置「…」菜单的 slot。
     * 排序放在内置条目之后（pin 100 / rename 200 / fork 300 / archive 400 /
     * session-id 450），分隔线由第一条的 separatorBefore 提供。
     */
    function registerSessionMenu(ctx) {
      const entries = [
        { id: 'row-menu-vscode', order: 500, Component: SessionVscodeMenuItem },
        { id: 'row-menu-explorer', order: 510, Component: SessionExplorerMenuItem },
      ];
      return ctx.slots.inject(SESSION_MENU_SLOT, function* () {
        for (const entry of entries) {
          yield ctx.slots.register({
            name: SESSION_MENU_SLOT,
            id: entry.id,
            order: entry.order,
            locale: NS,
          }, entry.Component);
        }
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
