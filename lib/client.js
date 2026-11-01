/**
 * dsh-sidebar-row-menu — 客户端半边。
 *
 * 在 DSH 左侧边栏的「工作区行」和「工作区下层的会话行」上点右键，弹出官方样式的菜单。
 *
 * 工作区行：
 *   新会话 / 重命名 / 使用 VS Code 打开 / 在资源管理器中打开 / 复制工作区路径
 *   /（装了 dsh-project-tabs 时）在新标签中打开 / 删除工作区
 *
 * 会话行：
 *   重命名 / 分叉会话 / 置顶（取消置顶）/ 使用 VS Code 打开 / 在资源管理器中打开
 *   / 复制会话链接 / 复制 Session ID / 归档（取消归档）
 *
 * 实现要点：
 *  1. 菜单本体用官方组件 `Menu`（@deepseek-ai/dsh-client-ui-primitives），它负责
 *     定位、视口夹取、键盘导航、点外部 / Esc 关闭；右键是命令式事件，所以按需
 *     mount 一个 react-dom/client root，关闭时 unmount 并摘掉容器。
 *  2. 行上没有把 workspaceId / cwd / 会话对象暴露到 DOM，所以从右键目标节点上的
 *     __reactFiber$ 向上找对应组件的 props：
 *       - 工作区行：ProjectRowItem 的 { group, actions }，actions.rename/delete 只在
 *         真实工作区行存在；
 *       - 会话行：SessionNodeItem 的 { node, onRenameRequest }，node 形如
 *         { id, title, blank, running, archived, pinned, updatedAt }。
 *     data-row-key（workspace: / session:）只做廉价前置过滤，找不到组件就完全不拦截。
 *  3. 重命名 / 删除工作区 / 重命名会话都调用行组件自己的回调，和内置「…」按钮、
 *     双击标题走完全相同的官方对话框；本插件不复制这些对话框。
 *  4. 分叉、置顶、归档、取消归档走客户端服务 ctx.get('uiWorkspace')，与内置菜单
 *     同一套 RPC。归档正在运行的会话时先弹一个自己的确认框，再带
 *     { stopActivity: true } 调用；未运行但被宿主以 workspace/session-active 拒绝时，
 *     同样退回确认框。
 *  5. 「打开 VS Code / 资源管理器」浏览器做不到，POST 给宿主 /dsh-sidebar-row-menu/open。
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

    const { useCallback, useState, Fragment } = require('react');
    const { jsx, jsxs } = require('react/jsx-runtime');
    const { createRoot } = require('react-dom/client');
    const {
      Menu,
      Modal,
      Button,
      writeClipboard,
      IconEditOutlineRegular,
      IconTrashOutlineRegular,
      IconCodeOutlineRegular,
      IconFolderOpenRegular,
      IconProjectAddOutlineRegular,
      IconNewChatOutlineRegular,
      IconBranchOutlineRegular,
      IconPinOutlineRegular,
      IconPinFillRegular,
      IconArchiveOutlineRegular,
      IconUnarchiveOutlineRegular,
      IconLinkOutlineRegular,
      IconCopyOutlineRegular,
    } = require('@deepseek-ai/dsh-client-ui-primitives');

    /** 宿主路由（与 lib/index.js 保持一致）。 */
    const OPEN_ENDPOINT = '/dsh-sidebar-row-menu/open';
    /** 运行时探测用标记属性（也是离线冒烟测试的抓手）。 */
    const MENU_ATTR = 'data-dsh-sidebar-row-menu';
    const DIALOG_ATTR = 'data-dsh-sidebar-row-menu-dialog';
    /** 本地化命名空间。 */
    const NS = 'sidebar-row-menu';

    /* ------------------------------------------------------------ 文案 */

    const zh = {
      newSession: '新会话',
      rename: '重命名',
      fork: '分叉会话',
      pin: '置顶会话',
      unpin: '取消置顶',
      archive: '归档会话',
      unarchive: '取消归档',
      vscode: '使用 VS Code 打开',
      explorer: '在资源管理器中打开',
      copyPath: '复制工作区路径',
      copyLink: '复制会话链接',
      copyId: '复制 Session ID',
      openInTab: '在新标签中打开',
      deleteWorkspace: '删除工作区',
      copied: '已复制',
      copyFailed: '复制失败，请重试',
      noPath: '没有可用的目录路径',
      openFailed: '打开失败：宿主没有找到对应程序',
      actionFailed: '操作失败，请稍后重试',
      archiveFailed: '归档失败，请稍后重试',
      unarchiveFailed: '取消归档失败，请稍后重试',
      pinFailed: '置顶失败，请稍后重试',
      forkFailed: '分叉失败，请稍后重试',
      archived: '已归档，可在“显示已归档”中找回',
      archiveConfirmTitle: '停止并归档此会话？',
      archiveConfirmDesc: '“{title}”仍有正在进行的工作。归档会先停止它，之后仍可取消归档。',
      archiveConfirmHint: '继续后，当前回答、子代理和后台任务都会被停止。',
      archiveConfirmAction: '停止并归档',
      archivePending: '正在停止并归档…',
      cancel: '取消',
      close: '关闭',
      untitled: '未命名会话',
    };
    const en = {
      newSession: 'New session',
      rename: 'Rename',
      fork: 'Fork session',
      pin: 'Pin session',
      unpin: 'Unpin session',
      archive: 'Archive session',
      unarchive: 'Unarchive session',
      vscode: 'Open in VS Code',
      explorer: 'Reveal in File Explorer',
      copyPath: 'Copy workspace path',
      copyLink: 'Copy session link',
      copyId: 'Copy Session ID',
      openInTab: 'Open in new tab',
      deleteWorkspace: 'Delete workspace',
      copied: 'Copied',
      copyFailed: 'Copy failed, please retry',
      noPath: 'No usable directory path',
      openFailed: 'Open failed: no handler found on the host',
      actionFailed: 'Action failed, please retry',
      archiveFailed: 'Archive failed, please retry',
      unarchiveFailed: 'Unarchive failed, please retry',
      pinFailed: 'Pin failed, please retry',
      forkFailed: 'Fork failed, please retry',
      archived: 'Archived. Find it under “Show archived”',
      archiveConfirmTitle: 'Stop and archive this session?',
      archiveConfirmDesc: '“{title}” still has work in progress. Archiving stops it first; you can unarchive later.',
      archiveConfirmHint: 'Continuing stops the current turn, subagents, and background jobs.',
      archiveConfirmAction: 'Stop and archive',
      archivePending: 'Stopping and archiving…',
      cancel: 'Cancel',
      close: 'Close',
      untitled: 'Untitled session',
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
     * node 上有 id / updatedAt / blank，足以和别的 treeitem 区分开。
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
          && typeof props.onRenameRequest === 'function'
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

    /** 当前挂着的菜单 / 对话框宿主与 React root。 */
    let menuHost = null;
    let menuRoot = null;
    let dialogHost = null;
    let dialogRoot = null;
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

    /** 关掉当前确认对话框。 */
    function closeDialog() {
      const host = dialogHost;
      const root = dialogRoot;
      dialogHost = null;
      dialogRoot = null;
      unmountAt(host, root);
    }

    /* ------------------------------------------------------------ 小工具 */

    /** 小提示条：复制 / 打开失败之类给一句反馈。 */
    function toast(message) {
      if (document.body === null) return;
      const el = document.createElement('div');
      el.textContent = message;
      el.style.cssText = [
        'position:fixed',
        'left:50%',
        'bottom:28px',
        'transform:translateX(-50%)',
        'z-index:2147483647',
        'padding:8px 14px',
        'border-radius:8px',
        'font-size:13px',
        'font-family:inherit',
        'background:var(--dsw-alias-button-elevated-fill,#2f2f31)',
        'color:var(--dsw-alias-label-primary,#ececec)',
        'box-shadow:0 6px 20px rgba(0,0,0,.35)',
        'pointer-events:none',
        'white-space:nowrap',
      ].join(';');
      document.body.appendChild(el);
      window.setTimeout(() => el.remove(), 2600);
    }

    /** 取客户端服务；ctx.get 是 cordis 的正规入口，ctx[name] 只作兜底。 */
    function serviceOf(ctx, name) {
      try {
        const value = ctx.get?.(name);
        if (value !== undefined && value !== null) return value;
      } catch (error) {
        console.warn('[dsh-sidebar-row-menu] service lookup failed:', name, error);
      }
      return ctx[name] ?? null;
    }

    function errorMessage(reason) {
      if (reason instanceof Error) return reason.message;
      if (typeof reason === 'string') return reason;
      return '';
    }

    /** 宿主拒绝归档运行中的会话时用的错误码。 */
    function isSessionActiveError(error) {
      const code = error?.rpcError?.code ?? error?.code ?? '';
      if (code === 'workspace/session-active') return true;
      return String(error?.message ?? '').includes('workspace/session-active');
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
        toast(ok ? t('copied') : t('copyFailed'));
      } catch (error) {
        console.warn('[dsh-sidebar-row-menu] clipboard failed:', error);
        toast(t('copyFailed'));
      }
    }

    /** ?session=<id> 深链接（与 dsh-workspace-menu / 内置 toast 的格式一致）。 */
    function deepLink(sessionId) {
      const url = new URL(window.location.href);
      url.searchParams.set('session', sessionId);
      return url.toString();
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

    function isArchived(ctx, node, sessionId) {
      if (typeof node.archived === 'boolean') return node.archived;
      const ids = serviceOf(ctx, 'workspaces')?.list?.getSnapshot?.()?.archivedSessionIds;
      return Array.isArray(ids) && ids.includes(sessionId);
    }

    function isPinned(ctx, node, sessionId) {
      if (typeof node.pinned === 'boolean') return node.pinned;
      const ids = serviceOf(ctx, 'workspaces')?.list?.getSnapshot?.()?.pinnedSessionIds;
      return Array.isArray(ids) && ids.includes(sessionId);
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

    /** 工作区行右键菜单。 */
    function openWorkspaceMenu(props, x, y) {
      const ctx = rootCtx;
      if (ctx === null) return;
      const t = localeOf(ctx);
      const group = props.group ?? {};
      const workspaceId = typeof group.workspaceId === 'string' ? group.workspaceId : '';
      const cwd = workspaceCwd(ctx, group);

      const tabs = ctx.get?.('projectTabs') ?? globalThis.__DSH_PROJECT_TABS__ ?? null;
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

    /** 会话行右键菜单。 */
    function openSessionMenu(props, x, y) {
      const ctx = rootCtx;
      if (ctx === null) return;
      const t = localeOf(ctx);
      const node = props.node ?? {};
      const sessionId = String(node.id ?? '');
      const title = typeof node.title === 'string' ? node.title : '';
      if (sessionId === '') return;

      const archived = isArchived(ctx, node, sessionId);
      const pinned = isPinned(ctx, node, sessionId);
      const cwd = sessionCwd(ctx, sessionId);

      const items = [];
      items.push({ id: 'rename', label: t('rename'), icon: jsx(IconEditOutlineRegular, {}) });
      items.push({ id: 'fork', label: t('fork'), icon: jsx(IconBranchOutlineRegular, {}) });
      if (!archived) {
        items.push({
          id: pinned ? 'unpin' : 'pin',
          label: t(pinned ? 'unpin' : 'pin'),
          icon: pinned ? jsx(IconPinFillRegular, {}) : jsx(IconPinOutlineRegular, {}),
        });
      }
      items.push({ id: 'sep1', type: 'separator' });
      items.push({ id: 'vscode', label: t('vscode'), icon: jsx(IconCodeOutlineRegular, { size: 14 }) });
      items.push({ id: 'explorer', label: t('explorer'), icon: jsx(IconFolderOpenRegular, { size: 14 }) });
      items.push({ id: 'sep2', type: 'separator' });
      items.push({ id: 'copy-link', label: t('copyLink'), icon: jsx(IconLinkOutlineRegular, { size: 14 }) });
      items.push({ id: 'copy-id', label: t('copyId'), icon: jsx(IconCopyOutlineRegular, { size: 14 }) });
      items.push({ id: 'sep3', type: 'separator' });
      items.push({
        id: archived ? 'unarchive' : 'archive',
        label: t(archived ? 'unarchive' : 'archive'),
        icon: archived ? jsx(IconUnarchiveOutlineRegular, {}) : jsx(IconArchiveOutlineRegular, {}),
        danger: !archived,
      });

      const ui = serviceOf(ctx, 'uiWorkspace');

      const onSelect = (id) => {
        if (id === 'rename') {
          try {
            props.onRenameRequest(sessionId, title);
          } catch (error) {
            console.warn('[dsh-sidebar-row-menu] session rename failed:', error);
          }
          return;
        }
        if (ui === null || ui === undefined) {
          toast(t('actionFailed'));
          return;
        }
        if (id === 'fork') {
          Promise.resolve().then(() => ui.forkSession(sessionId, (childId) => {
            try {
              ui.openSession(childId);
            } catch (error) {
              console.warn('[dsh-sidebar-row-menu] open forked session failed:', error);
            }
          }, { allowMigration: false })).catch((reason) => {
            console.warn('[dsh-sidebar-row-menu] fork failed:', reason);
            toast(t('forkFailed'));
          });
          return;
        }
        if (id === 'pin' || id === 'unpin') {
          const call = id === 'pin' ? ui.pinSession : ui.unpinSession;
          Promise.resolve().then(() => call.call(ui, sessionId)).catch((reason) => {
            console.warn('[dsh-sidebar-row-menu] pin failed:', reason);
            toast(t('pinFailed'));
          });
          return;
        }
        if (id === 'vscode' || id === 'explorer') {
          openPath(id, cwd, t);
          return;
        }
        if (id === 'copy-link') {
          copyText(deepLink(sessionId), t);
          return;
        }
        if (id === 'copy-id') {
          copyText(sessionId, t);
          return;
        }
        if (id === 'unarchive') {
          Promise.resolve().then(() => ui.unarchiveSession(sessionId)).catch((reason) => {
            console.warn('[dsh-sidebar-row-menu] unarchive failed:', reason);
            toast(t('unarchiveFailed'));
          });
          return;
        }
        if (id === 'archive') {
          archiveSession(ctx, ui, sessionId, title, node, t);
        }
      };

      showMenu(items, onSelect, x, y);
    }

    /* ------------------------------------------------------------ 归档确认 */

    /** 归档确认框。Modal 负责焦点 / Esc / 遮罩，这里只管一次请求的状态。 */
    function ArchiveDialog({ title, onConfirm, onClose, t }) {
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');

      const confirm = () => {
        if (busy) return;
        setBusy(true);
        setError('');
        Promise.resolve()
          .then(onConfirm)
          .then(() => onClose())
          .catch((reason) => {
            setBusy(false);
            setError(errorMessage(reason) || t('actionFailed'));
          });
      };

      return jsx(Modal, {
        open: true,
        onClose: busy ? () => {} : onClose,
        closeLabel: t('close'),
        title: t('archiveConfirmTitle'),
        description: t('archiveConfirmDesc', { title: title === '' ? t('untitled') : title }),
        footer: jsxs(Fragment, {
          children: [
            jsx(Button, {
              variant: 'outline',
              disabled: busy,
              onClick: onClose,
              children: t('cancel'),
            }),
            jsx(Button, {
              variant: 'outline',
              disabled: busy,
              onClick: confirm,
              children: t('archiveConfirmAction'),
            }),
          ],
        }),
      }, jsx('div', {
        role: busy ? 'status' : 'alert',
        style: {
          minHeight: '20px',
          fontSize: '13px',
          lineHeight: '1.6',
          color: 'var(--dsw-alias-label-secondary, #a1a1aa)',
        },
      }, busy ? t('archivePending') : (error === '' ? t('archiveConfirmHint') : error)));
    }

    function openArchiveDialog(ctx, sessionId, title, t) {
      const ui = serviceOf(ctx, 'uiWorkspace');
      if (ui === null || ui === undefined) {
        toast(t('actionFailed'));
        return;
      }
      closeDialog();
      dialogHost = document.createElement('div');
      dialogHost.setAttribute(DIALOG_ATTR, '1');
      dialogHost.style.cssText = 'position:fixed;inset:0;z-index:2147483647';
      document.body.appendChild(dialogHost);
      dialogRoot = createRoot(dialogHost);
      dialogRoot.render(jsx(ArchiveDialog, {
        title,
        t,
        onClose: () => closeDialog(),
        onConfirm: () => Promise.resolve()
          .then(() => ui.archiveSession(sessionId, { stopActivity: true }))
          .then(() => toast(t('archived'))),
      }));
    }

    /** 归档入口：运行中先确认；宿主以 session-active 拒绝时也退回确认。 */
    function archiveSession(ctx, ui, sessionId, title, node, t) {
      const running = node.running === true;
      if (running) {
        openArchiveDialog(ctx, sessionId, title, t);
        return;
      }
      Promise.resolve()
        .then(() => ui.archiveSession(sessionId))
        .then(() => toast(t('archived')))
        .catch((reason) => {
          if (isSessionActiveError(reason)) {
            openArchiveDialog(ctx, sessionId, title, t);
            return;
          }
          console.warn('[dsh-sidebar-row-menu] archive failed:', reason);
          toast(t('archiveFailed'));
        });
    }

    /* -------------------------------------------------------------- 安装 */

    /** 全局 contextmenu 拦截：只有命中工作区 / 会话行才接管。 */
    function onContextMenu(event) {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (target === null || target === undefined || typeof target.closest !== 'function') return;

      const row = target.closest('[data-row-key]');
      if (row === null) return;
      const rowKey = row.getAttribute('data-row-key') ?? '';
      let kind = '';
      if (rowKey.startsWith('workspace:')) kind = 'workspace';
      else if (rowKey.startsWith('session:')) kind = 'session';
      else return;

      const props = kind === 'workspace' ? resolveWorkspaceRow(target) : resolveSessionRow(target);
      if (props === null) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      if (kind === 'workspace') openWorkspaceMenu(props, event.clientX, event.clientY);
      else openSessionMenu(props, event.clientX, event.clientY);
    }

    function install() {
      window.addEventListener('contextmenu', onContextMenu, true);
      console.info('[dsh-sidebar-row-menu] installed');
      return () => {
        window.removeEventListener('contextmenu', onContextMenu, true);
        closeMenu();
        closeDialog();
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
      const teardown = install();
      if (ctx !== null && typeof ctx.effect === 'function') {
        ctx.effect(() => () => {
          rootCtx = null;
          teardown();
        }, 'sidebar-row-menu: row context menus');
      }
    }

    exports.apply = apply;
    exports.inject = ['locale', 'sessions', 'workspaces', 'uiWorkspace'];
    exports.name = 'sidebar-row-menu';
    return module.exports;
  },
});
