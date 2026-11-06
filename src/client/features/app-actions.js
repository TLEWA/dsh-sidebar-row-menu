import { openApplication } from '../store/apps.js';
import { toast } from '../toast.js';
import { h } from '../ui/jsx.js';

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
/** 菜单项里的「当前默认」勾：宿主菜单没有 checked 字段，只能自绘。 */
function permissionCheck() {
  return h('svg', {
    className: 'dsrm-check',
    width: 14,
    height: 14,
    viewBox: '0 0 16 16',
    'aria-hidden': 'true',
  }, h('path', {
    d: 'M3.2 8.4 6.3 11.5 12.8 5',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 1.7,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  }));
}

/** 权限子菜单的图标：一把小锁，避免与「打开方式」的箭头混淆。 */
const ContextMenuPermissionIcon = () => h('svg', {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  'aria-hidden': 'true',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 1.4,
},
h('rect', { x: 3.2, y: 7, width: 9.6, height: 6.6, rx: 1.6 }),
h('path', { d: 'M5.4 7V5.4a2.6 2.6 0 0 1 5.2 0V7' }));


export { ContextMenuPermissionIcon, openAppAt, permissionCheck };
