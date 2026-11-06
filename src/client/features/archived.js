import { ARCHIVED_HIDDEN_KEY } from '../constants.js';
import { rootCtx, serviceOf } from '../runtime.js';

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


export { ARCHIVED_ROW_ATTR, UNGROUPED_OWNER, applyArchivedRows, archivedApplyTimer, archivedCountOfWorkspace, archivedHolders, archivedObserver, archivedRowMutation, archivedRowsVisibleIn, archivedWorkspaceIndex, findArchivedViewActions, hiddenArchivedWorkspaces, lastViewFilter, persistHiddenWorkspaces, readHiddenWorkspaces, readViewFilter, scheduleArchivedRows, startArchivedRows, syncViewFilter, toggleWorkspaceArchived, workspaceSessionIds, writeViewFilter };
