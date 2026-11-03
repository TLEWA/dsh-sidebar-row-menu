/**
 * dsh-sidebar-row-menu — 宿主半边（host half）。
 *
 * 两件事：
 *  1. `/open` 让浏览器请宿主用系统命令打开目录；
 *  2. `/session/delete` 永久删除会话日志（默认由 UI 对已归档会话开放；
 *
 * 具体实现拆成四个模块：
 *
 *   lib/host/security.js        loopback 请求围栏
 *   lib/host/paths.js           路径校验与 vscode:// URL 编码
 *   lib/host/launch.js          VS Code / 资源管理器启动
 *   lib/host/session-delete.js  停跑、摘运行时、删日志、清归档记录
 *   lib/host/route.js           HTTP 边界与状态码
 *
 * 浏览器自己不能打开资源管理器，也不该直接删会话日志，所以这些必须放在 host。
 * 打开请求体：{ target: 'vscode' | 'explorer', path: '<绝对目录路径>' }
 * 删除请求体：{ sessionIds: ['<会话 id>', ...] }
 *
 * 删除流程参考 dsh-session-menu v0.1.3（MIT, big-head-pigeon），不引入 Typert 依赖。
 */

import { createOpenRoute } from './host/route.js';

export const name = 'sidebar-row-menu';
/** cordis 依赖：网页服务器 + 删除会话时需要读写的宿主服务。 */
export const inject = ['webServer', 'sessions', 'sessionPersistence', 'sessionQuery', 'workspaceRegistry'];

export { isLoopbackRequest } from './host/security.js';
export { inspectOpenPath, toVscodeFileUrl } from './host/paths.js';
export { resolveVscodeLauncher } from './host/launch.js';
export { createOpenRoute, handleSessionDeleteRequest } from './host/route.js';
export { DELETE_BATCH_LIMIT, removeSession, removeSessions } from './host/session-delete.js';

/**
 * 注册路由。
 * @param ctx - 宿主插件上下文（带 webServer 与会话服务）。
 */
export function apply(ctx) {
  const route = createOpenRoute(ctx);
  try {
    ctx.effect(() => ctx.webServer.register(route), 'dsh-sidebar-row-menu: routes');
  } catch (error) {
    // 注册失败不应该拖垮整个插件树：打开与删除会用不了，其余功能照常。
    ctx.logger?.warn?.('[dsh-sidebar-row-menu] route registration failed:', error);
  }
}
