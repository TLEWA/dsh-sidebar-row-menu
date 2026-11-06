import { NS } from '../constants.js';
import { Button, Fragment, Modal, jsx, useState } from '../platform.js';
import { rootCtx, serviceOf } from '../runtime.js';
import { isMainSession } from '../store/archived.js';
import { closeDelete, postDelete, postWorkspaceDelete, useDeleteRequest } from '../store/delete-request.js';
import { toast } from '../toast.js';
import { h } from '../ui/jsx.js';

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
        // 会话本来就不在了（例如另一个窗口先删掉）：报「已不存在」而不是「已删除 0 个」。
        if (!workspace && (result.deleted ?? 0) === 0 && (result.missing ?? 0) > 0) {
          if (wasMain) serviceOf(rootCtx, 'uiWorkspace')?.clearMain?.();
          closeDelete();
          toast(t('delete.alreadyGone'), 'success');
          return;
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


export { DeleteConfirmForm, DeleteDialog, registerDeleteDialog };
