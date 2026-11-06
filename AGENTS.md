# 仓库约定（AGENTS.md）

本仓库是 [DeepSeek Harness](https://github.com/deepseek-ai) 的插件
`dsh-sidebar-row-menu`：宿主半边在 `lib/`，客户端半边是 **`src/client/**` 的源码 +
esbuild 打包出的单文件 `lib/client.js`**。

## 硬性约束

1. **不要手改 `lib/client.js`。** 它是构建产物，任何手工修改都会在下次构建时丢失。
   客户端改动只写 `src/client/**`，然后运行 `npm run build:client`。
2. **客户端只有一个产物文件。** DSH 的客户端模块系统直接执行
   `window.__ModuleLoader__.load({ factory })`，没有打包步骤的旧版插件靠单文件分发；
   所以源码可以拆多文件，但必须打包回一个 `lib/client.js`，且 `package.json` 的
   `exports["./client"]` 指向它。
3. **平台模块只能从 `src/client/platform.js` 引入。** react / react-dom / ui-primitives
   由 DSH 的静态模块表提供，构建脚本把它们标成 external；分散 import 会让
   「插件依赖了平台哪些导出」不可见，也容易漏配 external。
4. **不新增运行时依赖。** 运行时只有宿主平台模块；`esbuild` 是唯一的 devDependency。
5. **对外导出的名字保持稳定**（`apply` / `inject` / `name` / `closeMenu` / `closeToast`），
   测试与宿主都按这些名字取值。

## 目录与分层

```
src/client/
  index.js        入口：apply(ctx)、slot 注册、样式安装、生命周期清理
  platform.js     平台模块的唯一入口（react / react-dom / ui-primitives）
  constants.js    存储键、路由前缀、菜单 order、slot 名等常量
  i18n.js         zh / en 词条（全部文案都要走 t()）
  styles.js       全部 CSS（一次注入，类名前缀 dsrm-）
  apps-catalog.js 应用 id → 名称 / 图标
  dom.js          fiber 解析、行/工作区/会话定位
  runtime.js      运行期单例：rootCtx、菜单挂载（beginMenu / closeMenu）、服务查找
  toast.js        Toast 宿主
  host-api.js     调宿主 HTTP 路由、剪贴板、cwd 解析
  slot-ownership.js  slot 条目归属判断（避免与内置条目重复）
  lib/create-store.js  持久化 store 工厂（localStorage + useSyncExternalStore 样板）
  store/*.js     9 个小状态：items / placements / blank-menu / children / pinned /
                 apps / permission / archived / delete-request
  ui/*.js        jsx 辅助、菜单定位、子菜单关闭、右键手势标记
  features/*.js  功能块：工作区菜单、会话菜单、空白正文菜单、打开方式、设置页、
                 删除确认框、归档可见性、行右键入口
```

## 编码约定

- 文件名 kebab-case；React hook 以 `use` 开头，工厂函数以 `create` 开头。
- 新增持久化状态：用 `lib/create-store.js` 的 `createStore`，不要再手写
  `publish / subscribe / snapshot` 三件套。
- 菜单挂载：统一用 `runtime.js` 的 `beginMenu(slotName).render(...)`，由 `closeMenu()`
  统一卸载；不要各自 `createRoot` 挂 `menuHost`。
- 菜单关闭：菜单级用 `ui/dismiss.js` 的 `useDismissOnOutside`，悬浮子菜单用
  `useSubmenuDismiss` + `useHoverSubmenu`；不要再逐个组件写 mousedown / keydown。
- i18n：所有用户可见文案进 `i18n.js`，中英各一条，键名用 `域.名字`。
- 样式：只写 `styles.js`，类名 `dsrm-` 前缀，跟随宿主 CSS 变量（不要硬编码颜色）。
- 容错：`catch` 不允许完全留空，至少 `console.warn` 或注释说明为什么可以忽略。
- 宿主服务可能晚于插件就绪：用 `serviceOf(ctx, name)`，缺失时降级而不是抛错。

## 构建与校验

```bash
npm install             # 只装 esbuild
npm run build:client    # src/client/** → lib/client.js
npm test                # pretest 会先构建；然后跑 host / manifest / client 测试
npm run check           # 语法检查 + 构建产物与源码一致性（不一致即失败）
npm pack                # prepack 会构建 + check，产出 .tgz
```

改完客户端代码务必 `npm run build:client && npm test`；只改 `lib/host/**` 时也跑一遍
`npm test`。提交前 `git status` 应包含 `lib/client.js`（产物）与源码改动。

## 发布

1. 升 `package.json` 版本，CHANGELOG 按现有双语格式加一节；
2. `npm test` / `npm run check` 全绿；
3. 在真实 DSH GUI 里用 CDP 验证受影响的菜单（右键、权限切换、删除确认、设置页）；
4. 打 tag（`vX.Y.Z`）由 release workflow 打包发布；`lib/client.js` 必须已被构建并提交。
