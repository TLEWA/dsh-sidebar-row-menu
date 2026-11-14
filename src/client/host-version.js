/**
 * 宿主版本探测：窗口上由宿主注入的 __DSH_BOOT__ 里带 release.version。
 *
 * 只用来做能力分支，不参与任何持久化。读不到版本时按「新宿主」处理：
 * 0.2.2-rc.1 及更早的构建同样带 boot 清单，真读不到通常是对端换了壳
 * （桌面端/测试），此时再按旧版降级反而会丢功能。
 */

/** 会话行右键从 0.2.2-rc.2 起由宿主原生提供。 */
const NATIVE_SESSION_MENU_SINCE = '0.2.2-rc.2';

/** 宿主声明的 release.version；拿不到时返回空串。 */
function readHostVersion() {
  try {
    const version = window?.__DSH_BOOT__?.release?.version;
    return typeof version === 'string' ? version : '';
  } catch {
    return '';
  }
}

/**
 * 解析 major.minor.patch[-pre]；解析失败返回 null。
 * 预发布标识按 semver 规则逐段比较（rc.2 > rc.1，正式版 > 任何预发布）。
 */
function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(value ?? '').trim());
  if (match === null) return null;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    pre: match[4] === undefined ? [] : match[4].split('.'),
  };
}

function comparePre(a, b) {
  // 没有预发布标识的版本号更大。
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return -1;
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const left = a[index];
    const right = b[index];
    const leftNumber = /^\d+$/.test(left) ? Number(left) : null;
    const rightNumber = /^\d+$/.test(right) ? Number(right) : null;
    if (leftNumber !== null && rightNumber !== null) {
      if (leftNumber !== rightNumber) return leftNumber < rightNumber ? -1 : 1;
    } else if (leftNumber !== null) {
      return -1;
    } else if (rightNumber !== null) {
      return 1;
    } else if (left !== right) {
      return left < right ? -1 : 1;
    }
  }
  if (a.length === b.length) return 0;
  return a.length < b.length ? -1 : 1;
}

/** value >= target 返回 true，小于返回 false；无法解析返回 null。 */
function versionAtLeast(value, target) {
  const have = parseVersion(value);
  const want = parseVersion(target);
  if (have === null || want === null) return null;
  for (let index = 0; index < 3; index += 1) {
    if (have.core[index] !== want.core[index]) return have.core[index] > want.core[index];
  }
  return comparePre(have.pre, want.pre) >= 0;
}

/**
 * 当前宿主是否原生提供会话行右键菜单。
 *
 * 读不到版本时按旧宿主处理：插件本身是靠 __DSH_BOOT__ 清单加载起来的，
 * 真机上这个清单必然存在；拿不到只可能是测试桩或第三方壳。此时退回
 * slot 注入不会丢功能，误判成新版却会让会话菜单整组消失。
 */
function hasNativeSessionMenu(version = readHostVersion()) {
  const supported = versionAtLeast(version, NATIVE_SESSION_MENU_SINCE);
  return supported === null ? false : supported;
}

export { NATIVE_SESSION_MENU_SINCE, hasNativeSessionMenu, parseVersion, readHostVersion, versionAtLeast };
