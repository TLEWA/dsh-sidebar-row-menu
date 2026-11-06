import { appIcon, appLabel } from '../apps-catalog.js';
import { MENU_ATTR, MORE_LABEL_RE, ORGANIZER_MENU_ORDER_KEY } from '../constants.js';
import { fiberOf } from '../dom.js';
import { localeOf } from './workspace-menu.js';
import { sessionCwd } from '../host-api.js';
import { Fragment, IconChevronRightOutlineRegular, IconRightUpOutlineRegular, MenuItemButton, MenuSurface, createRoot, jsx, useEffect, useRef, useState } from '../platform.js';
import { beginMenu, closeMenu, rootCtx, serviceOf } from '../runtime.js';
import { ensureApps, openApplication, useApps } from '../store/apps.js';
import { useBlankMenu } from '../store/blank-menu.js';
import { childOn, useChildren } from '../store/children.js';
import { useItems } from '../store/items.js';
import { effectivePinned, usePinned } from '../store/pinned.js';
import { toast } from '../toast.js';
import { h } from '../ui/jsx.js';
import { useDismissOnOutside, useHoverSubmenu, useSubmenuDismiss } from '../ui/dismiss.js';
import { chevronClass, useMenuPos, useSubmenuPos } from '../ui/position.js';

const HEADER_SLOT_SELECTORS = [
  { section: 'actions', selector: '[data-slot="conversation.session.header.actions"]' },
  { section: 'utilities', selector: '[data-slot="conversation.session.header.utilities"]' },
  { section: 'corner', selector: '[data-slot="conversation.session.header.corner"]' },
];
/** 这些区域里的右键不归空白菜单管：工具条、输入框与工具卡片本身。 */
const BLANK_BLOCKERS = [
  '[data-slot="conversation.header"]',
  '[data-slot="conversation.session.header"]',
  '[data-slot="conversation.composer"]',
  '[data-slot="tool.call.toolview"]',
].join(',');
/** 消息正文里仍然让位的控件：输入类与链接用浏览器/宿主的原生菜单。 */
const BLANK_MESSAGE_CONTROL_SELECTORS = [
  'input',
  'textarea',
  'select',
  'a[href]',
  '[contenteditable="true"]',
];
const BLANK_MESSAGE_CONTROLS = BLANK_MESSAGE_CONTROL_SELECTORS.join(',');
/** 可交互节点：空白处右键不抢它们的原生菜单（含上面那批控件）。 */
const BLANK_INTERACTIVE = [
  'button',
  ...BLANK_MESSAGE_CONTROL_SELECTORS,
  'summary',
  'label',
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
  '[aria-haspopup]',
].join(',');

/** 节点是否有非零面积且和视口相交。 */
function isOnScreen(node) {
  if (node === null || node === undefined || typeof node.getBoundingClientRect !== 'function') return false;
  const rect = node.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const viewportWidth = typeof window.innerWidth === 'number' ? window.innerWidth : 0;
  const viewportHeight = typeof window.innerHeight === 'number' ? window.innerHeight : 0;
  return rect.bottom > 0 && rect.right > 0 && rect.top < viewportHeight && rect.left < viewportWidth;
}

/** 找当前可见的会话头部（多标签时可能有多个，取视口内面积最大的那个）。 */
function activeSessionHeader() {
  if (typeof document.querySelectorAll !== 'function') return null;
  let best = null;
  let bestArea = 0;
  for (const slot of document.querySelectorAll('[data-slot="conversation.session.header"]')) {
    const header = (typeof slot.closest === 'function' ? slot.closest('header') : null) ?? slot.parentElement;
    if (header === null || header === undefined || typeof header.getBoundingClientRect !== 'function') continue;
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

/** 按钮的可读标签：aria-label / title 优先，最后才用文本。 */
function headerButtonLabel(button) {
  const value = button.getAttribute('aria-label')
    || button.getAttribute('title')
    || button.textContent
    || '';
  return String(value).replace(/\s+/g, ' ').trim();
}

/** 把按钮里的图标抄成可序列化的形状；MenuItemButton 的 icon 接受任意 React 节点。 */
function headerButtonIcon(button) {
  const svg = typeof button.querySelector === 'function' ? button.querySelector('svg') : null;
  if (svg !== null && typeof svg.outerHTML === 'string' && svg.outerHTML !== '') {
    return { html: svg.outerHTML };
  }
  const img = typeof button.querySelector === 'function' ? button.querySelector('img[src]') : null;
  if (img !== null) {
    const src = img.getAttribute('src');
    if (typeof src === 'string' && src !== '') return { src };
  }
  return null;
}

function isMoreTrigger(button, label) {
  if (MORE_LABEL_RE.test(label)) return true;
  const className = typeof button.className === 'string' ? button.className : '';
  return /morebutton/i.test(className);
}

/**
 * 从按钮的 fiber 往上找宿主 Menu 的控制器（items + onSelect）。
 * 「更多操作」按钮的 props 本身只有 onClick，真正的菜单项和选择回调挂在
 * 宿主的 Menu 组件上；拿到后就能在自己的子菜单里直接调用，而不必点开右上角。
 */
function findHeaderMenuController(button) {
  try {
    let fiber = fiberOf(button);
    for (let depth = 0; depth < 8 && fiber !== null && fiber !== undefined; depth += 1) {
      const props = fiber.memoizedProps;
      if (props !== null && typeof props === 'object'
        && Array.isArray(props.items) && props.items.length > 0
        && typeof props.onSelect === 'function') {
        return { items: props.items, onSelect: props.onSelect };
      }
      fiber = fiber.return;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * 宿主的「打开方式」是一整个 split 控件（主按钮 + 更多打开方式箭头）。
 * 空白菜单要把它收成和原生右键一样的「置顶应用 + 打开方式子菜单」，
 * 所以收集时就标出来，后续整组替换；认不出来时保持逐按钮原样。
 */
function isOpenWithSplit(unit, candidates) {      if (candidates.length < 2) return false;
  const className = typeof unit?.className === 'string' ? unit.className : '';
  if (/split/i.test(className)) return true;
  return candidates.some((candidate) => /更多打开方式|more open/i.test(headerButtonLabel(candidate)));
}

/**
 * 收集工具条上的按钮，按屏幕从左到右排序；「更多」按开关压到末尾。
 * 只统计真实可见、可点、有标签的节点：隐藏槽位、被 organizer 收进「…」的
 * 按钮不会出现在这里（那正是用户配置后的结果）。
 */
function collectHeaderToolbarItems(header, keepMoreLast) {
  const found = [];
  const seen = new Set();
  if (header === null || header === undefined || typeof header.querySelector !== 'function') return found;

  for (const slot of HEADER_SLOT_SELECTORS) {
    const container = header.querySelector(slot.selector);
    if (container === null || container === undefined) continue;
    const units = typeof container.children === 'object' && container.children !== null
      ? Array.from(container.children)
      : [];
    for (const unit of units) {
      const candidates = [];
      if (unit !== null && unit !== undefined && typeof unit.matches === 'function'
        && unit.matches(BLANK_INTERACTIVE)) {
        candidates.push(unit);
      }
      if (unit !== null && unit !== undefined && typeof unit.querySelectorAll === 'function') {
        for (const node of unit.querySelectorAll(BLANK_INTERACTIVE)) {
          if (node !== unit) candidates.push(node);
        }
      }
      const openWith = isOpenWithSplit(unit, candidates);
      for (const button of candidates) {
        if (seen.has(button)) continue;
        if (button.disabled === true) continue;
        if (button.getAttribute('aria-disabled') === 'true') continue;
        if (!isOnScreen(button)) continue;
        const label = headerButtonLabel(button);
        if (label === '') continue;
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
          stats: slot.section === 'actions',
          section: slot.section,
          left: rect.left,
          top: rect.top,
        });
      }
    }
  }

  found.sort((a, b) => (a.left - b.left) || (a.top - b.top));
  if (!keepMoreLast) return found;
  return [...found.filter((item) => !item.more), ...found.filter((item) => item.more)];
}

/** 有选中文字时让位给浏览器的选区右键菜单。 */
function hasTextSelection() {
  try {
    if (typeof window === 'undefined' || typeof window.getSelection !== 'function') return false;
    const selection = window.getSelection();
    if (selection === null || selection === undefined) return false;
    return String(selection).trim() !== '';
  } catch {
    return false;
  }
}

/**
 * 右键是否落在会话正文里（工具条、输入框、工具卡片之外，且没有选中文字）。
 * 消息正文（思考过程、回复、工具摘要……）放宽到只避开输入控件与链接：
 * 思考标题本身是 role=button，但右键它也应该出菜单。
 */
function isBlankConversationTarget(target) {
  if (target === null || target === undefined) return false;
  const start = target.nodeType === 3 ? target.parentElement : target;
  if (start === null || start === undefined || typeof start.closest !== 'function') return false;
  if (start.closest('[data-row-key]') !== null) return false;
  if (start.closest('[data-slot="conversation.session"]') === null) return false;
  if (start.closest(BLANK_BLOCKERS) !== null) return false;
  if (hasTextSelection()) return false;
  if (start.closest('[data-slot="conversation.chat.node"]') !== null) {
    return start.closest(BLANK_MESSAGE_CONTROLS) === null;
  }
  if (start.closest(BLANK_INTERACTIVE) !== null) return false;
  return true;
}

function headerIconNode(icon) {
  if (icon === null || icon === undefined) return undefined;
  if (typeof icon.html === 'string' && icon.html !== '') {
    return h('span', {
      className: 'dsrm-header-icon',
      'aria-hidden': 'true',
      dangerouslySetInnerHTML: { __html: icon.html },
    });
  }
  if (typeof icon.src === 'string' && icon.src !== '') {
    return h('img', { className: 'dsrm-header-icon-img', src: icon.src, alt: '' });
  }
  return undefined;
}

/** 当前正在看的会话：先看侧栏高亮行，没有就看主视图保留的会话。 */
function selectedSessionId() {
  try {
    if (typeof document.querySelector === 'function') {
      const row = document.querySelector('[data-row-key^="session:"][aria-selected="true"]');
      const key = typeof row?.getAttribute === 'function' ? row.getAttribute('data-row-key') : '';
      if (typeof key === 'string' && key.startsWith('session:')) return key.slice('session:'.length);
    }
  } catch {
    /* ignore */
  }
  const sessions = serviceOf(rootCtx, 'sessions');
  const byId = sessions?.list?.getSnapshot?.()?.byId;
  if (byId === null || byId === undefined || typeof byId !== 'object') return '';
  for (const row of Object.values(byId)) {
    if (typeof row?.id === 'string' && (row?.retainedBy?.mainView ?? 0) > 0) return row.id;
  }
  return '';
}

/**
 * 空白菜单里的「打开方式」组：与原生工作区 / 会话右键同一套数据 ——
 * 置顶应用直接平铺，其余收进「打开方式」子菜单；开关、置顶与子项都在设置页配置。
 */
function BlankOpenWithRows({ t, cwd, separatorBefore, onClose }) {
  const apps = useApps();
  useChildren();
  usePinned();
  const [open, setOpen] = useState(false);
  const hostRef = useRef(null);
  const { closeSoon, openNow } = useHoverSubmenu(setOpen, ensureApps);

  useSubmenuDismiss(open, setOpen, hostRef);

  // 面板先隐藏挂载再量真实尺寸，位置按真实宽高算。
  const box = useSubmenuPos(open, hostRef, [apps.status, apps.ids]);

  const pick = (appId) => {
    setOpen(false);
    onClose();
    openApplication(appId, cwd).then((ok) => {
      if (!ok) toast(t('openFailed'));
    });
  };

  const pinnedIds = new Set(effectivePinned(apps.ids).filter((id) => childOn(id)));
  const enabledApps = apps.ids.filter((id) => childOn(id));
  const submenuApps = enabledApps.filter((id) => !pinnedIds.has(id));

  let panelBody;
  if (apps.status === 'error') {
    panelBody = h('div', { className: 'dsrm-submenu-empty' }, t('settings.appsError'));
  } else if (apps.ids.length === 0) {
    panelBody = h('div', { className: 'dsrm-submenu-empty' }, apps.status === 'loading' ? t('settings.appsLoading') : t('settings.appsUnavailable'));
  } else if (submenuApps.length === 0) {
    panelBody = h('div', { className: 'dsrm-submenu-empty' }, t('settings.appsAllOff'));
  } else {
    panelBody = submenuApps.map((id) => jsx(MenuItemButton, {
      key: id,
      onSelect: () => pick(id),
      icon: appIcon(id),
      children: appLabel(id, t),
    }));
  }

  return h(Fragment, null,
    separatorBefore ? h('div', { className: 'dsrm-sep', role: 'separator' }) : null,
    Array.from(pinnedIds).map((id) => jsx(MenuItemButton, {
      key: `pinned-${id}`,
      onSelect: () => pick(id),
      icon: appIcon(id),
      children: t('openWithApp', { name: appLabel(id, t) }),
    })),
    h('div', {
      className: 'dsrm-openwith',
      ref: hostRef,
      onPointerOver: openNow,
      onPointerEnter: openNow,
      onPointerLeave: closeSoon,
    },
      jsx(MenuItemButton, {
        onSelect: () => {
          if (open) setOpen(false);
          else openNow();
        },
        icon: jsx(IconRightUpOutlineRegular, { size: 14 }),
        children: h('span', { className: 'dsrm-host-label' },
          h('span', { className: 'dsrm-host-label-text' }, t('openWith')),
          jsx(IconChevronRightOutlineRegular, { size: 12, className: chevronClass(box) }),
        ),
      }),
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
    ),
  );
}

/**
 * dsh-sidebar-organizer 把「更多操作」弹层的行序存在 localStorage 里（按行文字），
 * 只对宿主弹层写 CSS `order`。自己的二级菜单必须按同一份顺序排，才能看起来联动。
 */
function organizerMenuOrder() {
  try {
    const raw = window.localStorage.getItem(ORGANIZER_MENU_ORDER_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function orderMoreItems(entries) {
  const saved = organizerMenuOrder();
  if (saved.length === 0) return entries;
  const rank = new Map(saved.map((label, index) => [label, index]));
  return entries
    .map((entry, index) => ({ entry, index, rank: rank.has(entry.label) ? rank.get(entry.label) : saved.length }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((item) => item.entry);
}

/**
 * 空白菜单里的「更多操作」：直接读宿主 Menu 的 items / onSelect，
 * 在自己的子菜单里复刻那几项（复制 / 下载 / 反馈……），不再点开右上角的「…」。
 */
function BlankMoreRows({ label, icon, controller, separatorBefore, onClose, children }) {
  const [open, setOpen] = useState(false);
  const hostRef = useRef(null);
  const { closeSoon, openNow } = useHoverSubmenu(setOpen);
  const entries = orderMoreItems(controller.items);

  useSubmenuDismiss(open, setOpen, hostRef);

  // 面板先隐藏挂载再量真实尺寸，位置按真实宽高算。
  const box = useSubmenuPos(open, hostRef, [entries.length]);

  const pick = (id) => {
    setOpen(false);
    onClose();
    try {
      controller.onSelect(id);
    } catch (error) {
      console.warn('[dsh-sidebar-row-menu] header menu action failed:', error);
    }
  };

  return h(Fragment, null,
    separatorBefore ? h('div', { className: 'dsrm-sep', role: 'separator' }) : null,
    h('div', {
      className: 'dsrm-openwith dsrm-more',
      ref: hostRef,
      onPointerOver: openNow,
      onPointerEnter: openNow,
      onPointerLeave: closeSoon,
    },
      jsx(MenuItemButton, {
        onSelect: () => {
          if (open) setOpen(false);
          else openNow();
        },
        icon: headerIconNode(icon),
        children: h('span', { className: 'dsrm-host-label' },
          h('span', { className: 'dsrm-host-label-text' }, children ?? label),
          jsx(IconChevronRightOutlineRegular, { size: 12, className: chevronClass(box) }),
        ),
      }),
      open ? h(MenuSurface, {
        role: 'group',
        'aria-label': label,
        className: 'dsrm-submenu',
        style: {
          left: box?.left ?? 0,
          top: box?.top ?? 0,
          visibility: box === null ? 'hidden' : 'visible',
        },
      }, entries.map((entry, index) => jsx(MenuItemButton, {
        key: typeof entry.id === 'string' ? entry.id : `more-item-${index}`,
        onSelect: () => pick(entry.id),
        disabled: entry.disabled === true,
        icon: entry.icon === null || entry.icon === undefined
          ? undefined
          : h('span', { className: 'dsrm-header-icon' }, entry.icon),
        children: entry.label,
      }))) : null,
    ),
  );
}

/**
 * 工具条按钮的纵向菜单。每条点下去是「真的按一下」原按钮：
 * 先关菜单再派发 click，宿主弹出层才能正常锚定到原按钮。
 * 「打开方式」整组换成和原生右键一致的置顶应用 + 子菜单，其余按钮原样复刻。
 */
function HeaderToolbarMenu({ x, y, items, t, sessionId, onClose }) {
  const hostRef = useRef(null);
  const pos = useMenuPos(hostRef, x, y, []);
  const itemsConfig = useItems();
  const blankMenu = useBlankMenu();
  const apps = useApps();
  useChildren();
  usePinned();

  useDismissOnOutside(hostRef, onClose);

  // 位置由 useMenuPos 统一夹取：菜单行数随工具条内容变化，尺寸变了再夹一次。

  const cwd = typeof sessionId === 'string' && sessionId !== '' ? sessionCwd(rootCtx, sessionId) : '';
  const enabledApps = apps.ids.filter((id) => childOn(id));
  // 工具条上的 split「打开方式」只有在能拿到会话目录、且设置里开着时才接管；
  // 否则保留宿主的两个原按钮，菜单仍然是工具条的镜像。
  const ownOpenWith = itemsConfig.openWith !== false
    && cwd !== ''
    && enabledApps.length > 0
    && items.some((item) => item.openWith);

  const rows = [];
  let section = '';
  const takeSeparator = (next) => {
    const separator = section !== '' && section !== next;
    section = next;
    return separator;
  };
  let openWithDone = false;
  items.forEach((item, index) => {
    // 费用 / 后台任务这类状态入口默认隐藏，设置里打开「显示状态与费用」才出现。
    if (item.stats && blankMenu.showCostMeter !== true) return;
    // 设置里关掉「打开方式」时，空白菜单也不出现这一组，和工作区 / 会话右键一致。
    if (item.openWith && itemsConfig.openWith === false) return;
    if (item.openWith && ownOpenWith) {
      if (!openWithDone) {
        openWithDone = true;
        rows.push(jsx(BlankOpenWithRows, {
          key: 'open-with',
          t,
          cwd,
          separatorBefore: takeSeparator('open-with'),
          onClose,
        }));
      }
      return;
    }
    if (item.more && item.menu !== null && item.menu !== undefined) {
      rows.push(jsx(BlankMoreRows, {
        key: `${index}:more`,
        label: item.label,
        icon: item.icon,
        // 宿主弹层的行序由 dsh-sidebar-organizer 用 CSS order 控制，这里的
        // 子菜单是自绘的，必须按它保存的顺序重排才能保持联动。
        controller: { items: orderMoreItems(item.menu.items), onSelect: item.menu.onSelect },
        separatorBefore: takeSeparator('more'),
        onClose,
        children: item.label,
      }));
      return;
    }
    rows.push(jsx(MenuItemButton, {
      key: `${index}:${item.label}`,
      separatorBefore: takeSeparator(item.openWith ? 'open-with' : (item.more ? 'more' : (item.section || 'toolbar'))),
      onSelect: () => {
        onClose();
        // 等菜单卸载完再点：否则宿主的弹出层会被面板的全局 dismiss 立刻收掉。
        window.setTimeout(() => {
          try {
            item.button.click();
          } catch (error) {
            console.warn('[dsh-sidebar-row-menu] toolbar action click failed:', error);
          }
        }, 0);
      },
      icon: headerIconNode(item.icon),
      children: item.label,
    }));
  });

  return h('div', {
    className: 'dsrm-menu',
    ref: hostRef,
    style: {
      left: pos?.left ?? x,
      top: pos?.top ?? y,
      visibility: pos === null ? 'hidden' : 'visible',
    },
  }, h(MenuSurface, { role: 'group', className: 'dsrm-menu-surface dsrm-header-menu' }, rows));
}

function openHeaderToolbarMenu(items, x, y, sessionId = '') {
  if (items.length === 0) return;
  beginMenu('header-toolbar').render(jsx(HeaderToolbarMenu, {
    x,
    y,
    items,
    t: localeOf(rootCtx),
    sessionId,
    onClose: () => closeMenu(),
  }));
}

export { BLANK_BLOCKERS, BLANK_INTERACTIVE, BLANK_MESSAGE_CONTROLS, BlankMoreRows, BlankOpenWithRows, HEADER_SLOT_SELECTORS, HeaderToolbarMenu, activeSessionHeader, collectHeaderToolbarItems, findHeaderMenuController, hasTextSelection, headerButtonIcon, headerButtonLabel, headerIconNode, isBlankConversationTarget, isMoreTrigger, isOnScreen, isOpenWithSplit, openHeaderToolbarMenu, orderMoreItems, organizerMenuOrder, selectedSessionId };
