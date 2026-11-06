import { appLabel } from '../apps-catalog.js';
import { NS } from '../constants.js';
import { IconTriangleRightFillRegular, Switch, jsx, useEffect, useState } from '../platform.js';
import { takenOver } from '../slot-ownership.js';
import { ensureApps, useApps } from '../store/apps.js';
import { setBlankMenu, useBlankMenu } from '../store/blank-menu.js';
import { childOn, setChild, useChildren } from '../store/children.js';
import { setItem, useItems } from '../store/items.js';
import { effectivePinned, togglePinned, usePinned } from '../store/pinned.js';
import { setPlacement, showsInContext, showsInEllipsis, usePlacements } from '../store/placements.js';
import { h } from '../ui/jsx.js';

const SETTINGS_ROWS = [
  ['openWith', 'settings.openWith.label', 'settings.openWith.hint'],
  ['deleteSession', 'settings.deleteSession.label', 'settings.deleteSession.hint'],
  ['deleteUnarchived', 'settings.deleteUnarchived.label', 'settings.deleteUnarchived.hint'],
  ['deleteArchived', 'settings.deleteArchived.label', 'settings.deleteArchived.hint'],
  ['archivedSessions', 'settings.archivedSessions.label', 'settings.archivedSessions.hint'],
];

/** 菜单显示位置；按行分组，避免用户分不清工作区项和会话项。 */
const PLACEMENT_ROWS = [
  ['workspace', 'settings.ellipsisWorkspace', [
    ['newSession', 'settings.ellipsis.newSession.label', 'settings.ellipsis.newSession.hint'],
    ['permissionDefault', 'settings.ellipsis.permissionDefault.label', 'settings.ellipsis.permissionDefault.hint'],
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

/** 会话空白处右键菜单的开关；顺序跟随工具条，这里只管总开关。 */
const BLANK_MENU_ROWS = [
  ['enabled', 'settings.blankMenu.enabled.label', 'settings.blankMenu.enabled.hint'],
  ['keepMoreLast', 'settings.blankMenu.keepMoreLast.label', 'settings.blankMenu.keepMoreLast.hint'],
  ['showCostMeter', 'settings.blankMenu.showCostMeter.label', 'settings.blankMenu.showCostMeter.hint'],
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
  const placements = usePlacements();
  const blank = useBlankMenu();
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

  const placementSwitch = (key, mode, labelKey) => {
    const inContext = showsInContext(key);
    const inEllipsis = showsInEllipsis(key);
    const checked = mode === 'context' ? inContext : inEllipsis;
    // 三态里只剩一边时，那个开关锁住：不允许把条目从两边都关掉。
    const locked = mode === 'context' ? !inEllipsis : !inContext;
    const onChange = (next) => {
      if (mode === 'context') {
        setPlacement(key, next ? (inEllipsis ? 'both' : 'context') : 'ellipsis');
      } else {
        setPlacement(key, next ? (inContext ? 'both' : 'ellipsis') : 'context');
      }
    };
    return h('span', { className: 'dsrm-placement-choice' },
      h('span', { className: 'dsrm-placement-choice-label' }, t(labelKey)),
      jsx(Switch, {
        checked,
        disabled: locked,
        label: t(labelKey),
        title: locked ? t('settings.placement.locked') : undefined,
        onChange,
      }),
    );
  };

  const placementGroups = PLACEMENT_ROWS.map(([groupKey, titleKey, rows]) => h('div', {
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
      h('div', { className: 'dsrm-settings-controls dsrm-placement-controls' },
        placementSwitch(key, 'context', 'settings.placement.context'),
        placementSwitch(key, 'ellipsis', 'settings.placement.ellipsis'),
      ),
    ))),
  ));

  const blankRows = BLANK_MENU_ROWS.map(([key, labelKey, hintKey]) => h('div', {
    className: 'dsrm-settings-row',
    key,
  },
    h('div', { className: 'dsrm-settings-copy' },
      h('div', { className: 'dsrm-settings-label' }, t(labelKey)),
      h('div', { className: 'dsrm-settings-hint' }, t(hintKey)),
    ),
    h('div', { className: 'dsrm-settings-controls' },
      jsx(Switch, {
        checked: blank[key] !== false,
        disabled: key === 'keepMoreLast' && blank.enabled === false,
        label: t(labelKey),
        onChange: (next) => setBlankMenu(key, next),
      }),
    ),
  ));

  return h('div', { className: 'dsrm-settings' },
    h('h2', { className: 'dsrm-settings-title' }, t('settings.title')),
    anyConflict ? h('div', { className: 'dsrm-settings-note' }, t('settings.conflictNote')) : null,
    h('div', { className: 'dsrm-settings-list' }, rows),
    h('h2', { className: 'dsrm-settings-title dsrm-settings-subtitle' }, t('settings.ellipsisTitle')),
    h('div', { className: 'dsrm-settings-note' }, t('settings.ellipsisHint')),
    h('div', { className: 'dsrm-settings-groups' }, placementGroups),
    h('h2', { className: 'dsrm-settings-title dsrm-settings-subtitle' }, t('settings.blankMenuTitle')),
    h('div', { className: 'dsrm-settings-note' }, t('settings.blankMenuNote')),
    h('div', { className: 'dsrm-settings-list' }, blankRows),
  );
}

/* ---------------------------------------------------------- 菜单 */

/**
 * 工作区行右键菜单。官方 Menu 的 items 只认单层条目，不支持子菜单，
 * 所以这里自绘 panel；普通行仍用 MenuItemButton，分隔线与菜单外观和官方一致。
 */
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


export { BLANK_MENU_ROWS, PLACEMENT_ROWS, SETTINGS_ROWS, SettingsNavIcon, SettingsSection, registerSettings };
