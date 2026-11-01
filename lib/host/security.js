/**
 * 本机请求围栏：只允许 loopback 发起的调用，避免该路由变成任意 URL 打开器。
 */

/** 判断 IPv4 是否落在 127/8。 */
function isIPv4Loopback(value) {
  const parts = String(value).split('.');
  if (parts.length !== 4 || parts[0] !== '127') return false;
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

/** socket 的 remoteAddress 是否为本机（含 ::1 与 IPv4-mapped）。 */
function isLoopbackAddress(address) {
  if (typeof address !== 'string' || address === '') return false;
  const normalized = address.toLowerCase();
  if (normalized === '::1') return true;
  if (normalized.startsWith('::ffff:')) return isIPv4Loopback(normalized.slice(7));
  return isIPv4Loopback(normalized);
}

/** Host 头里的主机名是否为本机（localhost / [::1] / 127/8）。 */
function isLoopbackHostname(hostname) {
  if (hostname === 'localhost' || hostname === '[::1]') return true;
  return isIPv4Loopback(hostname);
}

/**
 * 请求级信任围栏：socket 必须来自本机、Host 必须是本机名、且跨站请求拒绝。
 */
export function isLoopbackRequest(request) {
  if (!isLoopbackAddress(request.socket?.remoteAddress)) return false;
  const host = request.headers?.host;
  if (typeof host !== 'string') return false;
  let hostUrl;
  try {
    hostUrl = new URL(`http://${host}`);
  } catch {
    return false;
  }
  if (!isLoopbackHostname(hostUrl.hostname)) return false;
  if (request.headers['sec-fetch-site'] === 'cross-site') return false;
  const origin = request.headers.origin;
  if (origin === undefined) return true;
  try {
    return new URL(origin).host === hostUrl.host;
  } catch {
    return false;
  }
}

export { isLoopbackAddress, isLoopbackHostname };
