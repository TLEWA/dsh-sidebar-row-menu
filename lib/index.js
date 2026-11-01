/**
 * dsh-sidebar-row-menu — 宿主半边（host half）。
 *
 * 只做一件事：把 `/open` 路由挂到 ctx.webServer 上，让浏览器端能请宿主用系统
 * 命令打开目录。具体实现拆成三个模块：
 *
 *   lib/host/security.js  loopback 请求围栏
 *   lib/host/paths.js     路径校验与 vscode:// URL 编码
 *   lib/host/launch.js    VS Code / 资源管理器启动
 *   lib/host/route.js     HTTP 边界与状态码
 *
 * 浏览器自己不能打开资源管理器，所以这一小块必须放在 host。
 * 请求体：{ target: 'vscode' | 'explorer', path: '<绝对目录路径>' }
 *
 * 实现参考 dsh-sidebar-context-menu v0.2.0（MIT, miao-ge）；额外要求路径
 * 必须存在且是目录，因为右键对象既可能是工作区，也可能是会话自己的 cwd。
 */

import { createOpenRoute } from './host/route.js';

export const name = 'sidebar-row-menu';
/** cordis 依赖：网页服务器服务（ctx.webServer）。 */
export const inject = ['webServer'];

export { isLoopbackRequest } from './host/security.js';
export { inspectOpenPath, toVscodeFileUrl } from './host/paths.js';
export { resolveVscodeLauncher } from './host/launch.js';
export { createOpenRoute } from './host/route.js';

/**
 * 注册打开路由。
 * @param ctx - 宿主插件上下文（带 webServer 服务）。
 */
export function apply(ctx) {
  const route = createOpenRoute();
  try {
    ctx.effect(() => ctx.webServer.register(route), 'dsh-sidebar-row-menu: /open route');
  } catch (error) {
    // 注册失败不应该拖垮整个插件树：客户端菜单里的两个「打开」会用不了，其余照常。
    ctx.logger?.warn?.('[dsh-sidebar-row-menu] route registration failed:', error);
  }
}
