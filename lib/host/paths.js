/**
 * 路径校验与编码：客户端传来的路径必须先过这里，才会交给宿主命令。
 */

import { statSync } from 'node:fs';
import { isAbsolute } from 'node:path';

/**
 * 绝对路径 → vscode://file/<路径>。
 * 逐段 encodeURIComponent（盘符的 `:` 还原），这样空格 / 中文 / `#` 都不会破坏 URL。
 */
export function toVscodeFileUrl(path) {
  const forward = String(path).replace(/\\/g, '/');
  const rooted = forward.startsWith('/') ? forward : `/${forward}`;
  const encoded = rooted
    .split('/')
    .map((segment) => encodeURIComponent(segment).replace(/%3A/gi, ':'))
    .join('/');
  return `vscode://file${encoded}`;
}

/**
 * 规整客户端传来的路径：
 *  - 去掉 Windows「复制为路径」自带的两侧双引号；
 *  - 必须是绝对路径；
 *  - 必须存在且是目录。
 * @returns {{ path: string } | { error: string }}
 */
export function inspectOpenPath(rawPath) {
  let value = rawPath;
  if (typeof value !== 'string' || value.trim() === '') return { error: 'path-required' };
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  if (value.includes('\0')) return { error: 'path-invalid' };
  /* Windows 的盘符路径在 POSIX 判断下不是绝对路径，这里显式补一条。 */
  const absolute = isAbsolute(value) || /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith('\\\\');
  if (!absolute) return { error: 'path-not-absolute' };
  let stats;
  try {
    stats = statSync(value);
  } catch {
    return { error: 'path-not-found' };
  }
  if (!stats.isDirectory()) return { error: 'path-not-directory' };
  return { path: value };
}
