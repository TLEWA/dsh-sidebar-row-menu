
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

export { fiberOf, resolveSessionRow, resolveWorkspaceRow };
