#!/usr/bin/env node
/**
 * 把 src/client/**（ESM，多文件）打包成 lib/client.js（单文件）。
 *
 * 为什么要打包：DSH 的客户端模块系统只执行一个
 * `window.__ModuleLoader__.load({ id, factory })` 调用，factory 里拿到的
 * `require` 只能解析平台静态模块表。所以产物必须是单文件，源码可以拆。
 *
 * 用法：
 *   node scripts/build-client.mjs           # 生成 lib/client.js
 *   node scripts/build-client.mjs --check   # 只校验磁盘上的产物是否最新
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'src/client/index.js');
const output = join(root, 'lib/client.js');
const PLUGIN_ID = 'dsh-sidebar-row-menu';

/** 平台提供的模块：不打进产物，运行时由 factory 的 require 解析。 */
const EXTERNAL = [
  'react',
  'react/jsx-runtime',
  'react-dom/client',
  '@deepseek-ai/dsh-client-ui-primitives',
];

const HEADER = `/**
 * dsh-sidebar-row-menu — 客户端半边（构建产物，请勿手改）。
 *
 * 源码在 src/client/**，由 \`npm run build:client\` 生成这个文件：
 *   - 工作区行右键：本插件自绘的官方样式菜单；
 *   - 会话行右键：复用内置「…」菜单的 slot，只追加本插件的条目；
 *   - 会话正文空白处/工具栏右键：镜像右上角工具条。
 *
 * 产物外壳是 DSH 客户端模块系统的单文件约定：
 *   window.__ModuleLoader__.load({ id, factory: (require) => module.exports })
 * 里面的代码是 esbuild 的 cjs bundle，\`module\` / \`require\` 解析到
 * factory 参数与包装盒里的局部变量，所以平台模块不会被重复打包。
 *
 * 详细约定见 AGENTS.md。
 */
`;

async function build() {
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    external: EXTERNAL,
    write: false,
    logLevel: 'warning',
    charset: 'utf8',
  });
  const body = result.outputFiles[0].text;
  return (
    HEADER +
    "window.__ModuleLoader__.load({\n" +
    `  id: '${PLUGIN_ID}',\n` +
    '  factory: (require) => {\n' +
    '    var module = { exports: {} };\n' +
    '    var exports = module.exports;\n' +
    body +
    '\n    return module.exports;\n' +
    '  },\n' +
    '});\n'
  );
}

const next = await build();
const current = (() => {
  try {
    return readFileSync(output, 'utf8');
  } catch {
    return '';
  }
})();

if (process.argv.includes('--check')) {
  if (current !== next) {
    console.error('[build-client] lib/client.js 与 src/client/** 不一致，请运行 npm run build:client');
    process.exit(1);
  }
  console.log('[build-client] lib/client.js 是最新的');
} else {
  writeFileSync(output, next);
  console.log(`[build-client] 写入 lib/client.js（${next.length} 字节）`);
}
