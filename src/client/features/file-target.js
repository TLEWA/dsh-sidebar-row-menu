/**
 * 正文右键时解析「指针下的文件」。
 *
 * 会话正文里的文件有几种截然不同的 DOM 形状，宿主没有统一的标记：
 *   - 本轮变更文件卡片 `[data-changed-files]`：每行一个按钮，绝对路径藏在同级
 *     `span[hidden]` 里（单文件卡片只有卡片头部，没有行）；
 *   - 交付文件卡片 `[data-presented-file]`：卡片按钮的 title 就是绝对路径；
 *   - 用户消息附件 `[data-message-attachments]`：`span[title]` 是文件名（可能是相对路径）；
 *   - 正文里的 @ 引用 chip `[data-ref-chip="file"]`：文本就是路径。
 * 都认不出来时返回 null，调用方退回会话工作区。
 */
const ABSOLUTE_PATH = /^(?:[A-Za-z]:[\\/]|\\\\|\/)/;
const MAX_PATH_LENGTH = 1024;

/** 事件目标可能是文本节点，统一取元素。 */
function elementOf(target) {
  if (target === null || target === undefined) return null;
  return target.nodeType === 3 ? target.parentElement : target;
}

/** 相对路径按会话目录拼成绝对路径；传进来的绝对路径原样返回。 */
function absolutePath(value, cwd) {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (raw === '' || raw.length > MAX_PATH_LENGTH) return '';
  if (ABSOLUTE_PATH.test(raw)) return raw;
  if (typeof cwd !== 'string' || cwd === '') return '';
  const base = cwd.replace(/[\\/]+$/, '');
  const separator = base.includes('\\') ? '\\' : '/';
  const rest = raw.replace(/^[\\/]+/, '').split(/[\\/]/).filter((part) => part !== '' && part !== '.');
  if (rest.length === 0) return '';
  return base + separator + rest.join(separator);
}

/** 去重 + 拼绝对路径，顺序保持 DOM 顺序。 */
function collectPaths(values, cwd) {
  const seen = new Set();
  const paths = [];
  for (const value of values) {
    const path = absolutePath(value, cwd);
    if (path === '' || seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }
  return paths;
}

/** 容器里所有 `span[hidden]` 的文本（变更文件卡片就是这么带绝对路径的）。 */
function hiddenTexts(scope) {
  if (scope === null || scope === undefined || typeof scope.querySelectorAll !== 'function') return [];
  const values = [];
  for (const node of scope.querySelectorAll('span[hidden]')) {
    if (typeof node?.textContent === 'string') values.push(node.textContent);
  }
  return values;
}

function attributeOf(node, name) {
  if (node === null || node === undefined || typeof node.getAttribute !== 'function') return '';
  const value = node.getAttribute(name);
  return typeof value === 'string' ? value : '';
}

/** 变更文件卡片：优先取指针所在那一行，卡片空白处则整张卡片。 */
function changedFilesTarget(start, cwd) {
  const card = start.closest('[data-changed-files]');
  if (card === null) return null;
  const row = start.closest('li');
  const insideRow = row !== null
    && typeof card.contains === 'function'
    && card.contains(row);
  const paths = collectPaths(hiddenTexts(insideRow ? row : card), cwd);
  if (paths.length === 0) return null;
  return { kind: 'changed-files', paths };
}

/** 交付文件卡片：title 上就是解析好的绝对路径。 */
function presentedTarget(start, cwd) {
  const card = start.closest('[data-presented-file]');
  if (card === null) return null;
  const titled = typeof card.querySelector === 'function' ? card.querySelector('[title]') : null;
  const paths = collectPaths([attributeOf(titled, 'title'), attributeOf(card, 'title')], cwd);
  if (paths.length === 0) return null;
  return { kind: 'presented', paths };
}

/** 用户消息附件：点了哪个附件就只开哪个，点空白行则开这一行的全部附件。 */
function attachmentsTarget(start, cwd) {
  const row = start.closest('[data-message-attachments]');
  if (row === null) return null;
  const chip = start.closest('[title]');
  const scope = chip !== null && typeof row.contains === 'function' && row.contains(chip) ? chip : row;
  const values = [];
  if (scope === chip) values.push(attributeOf(chip, 'title'));
  else if (typeof row.querySelectorAll === 'function') {
    for (const node of row.querySelectorAll('[title]')) values.push(attributeOf(node, 'title'));
  }
  if (values.length === 0) values.push(attributeOf(row, 'title'));
  // 附件本体在会话附件目录里，title 通常只有文件名；按会话目录拼出来的路径并不存在，
  // 打开它只会让编辑器新建一个空文件，所以只认绝对路径。
  const absolute = values.filter((value) => ABSOLUTE_PATH.test(String(value ?? '').trim()));
  if (absolute.length === 0) return null;
  const paths = collectPaths(absolute, cwd);
  if (paths.length === 0) return null;
  return { kind: 'attachments', paths };
}

/** 正文里的 @ 文件引用 chip（技能 / 命令 chip 不是文件，跳过）。 */
function refChipTarget(start, cwd) {
  const chip = start.closest('[data-ref-chip]');
  if (chip === null) return null;
  const kind = attributeOf(chip, 'data-ref-chip');
  if (kind !== '' && kind !== 'file') return null;
  const text = String(chip.textContent ?? '').replace(/^@/, '');
  const paths = collectPaths([text, attributeOf(chip, 'title')], cwd);
  if (paths.length === 0) return null;
  return { kind: 'ref-chip', paths };
}

/** 兜底：宿主的 title 里直接写着绝对路径（相对 title 不可信，宁可退回工作区）。 */
function titledTarget(start, cwd) {
  const node = start.closest('[title]');
  if (node === null) return null;
  const title = attributeOf(node, 'title').trim();
  if (!ABSOLUTE_PATH.test(title)) return null;
  const paths = collectPaths([title], cwd);
  if (paths.length === 0) return null;
  return { kind: 'title', paths };
}

/**
 * 解析右键落点下的文件。
 * @param target - contextmenu 事件的 target。
 * @param cwd - 当前会话目录，用来把相对路径补成绝对路径。
 * @returns `{ kind, paths }`（paths 为绝对路径数组），认不出来返回 null。
 */
function fileTargetAt(target, cwd) {
  const start = elementOf(target);
  if (start === null || typeof start.closest !== 'function') return null;
  const resolvers = [changedFilesTarget, presentedTarget, attachmentsTarget, refChipTarget, titledTarget];
  for (const resolve of resolvers) {
    let found = null;
    try {
      found = resolve(start, typeof cwd === 'string' ? cwd : '');
    } catch {
      found = null;
    }
    if (found !== null && Array.isArray(found.paths) && found.paths.length > 0) return found;
  }
  return null;
}

export { absolutePath, collectPaths, fileTargetAt };
