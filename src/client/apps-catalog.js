import { ICON_ROUTE } from './constants.js';
import { en, zh } from './i18n.js';
import { jsx } from './platform.js';

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


export { APP_NAMES, appIcon, appLabel };
