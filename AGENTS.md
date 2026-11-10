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

## CI 与 PR

本仓库已接入中心仓 `TLEWA/dsh-plugin-ci`。通用规则以中心仓的
[PROCESS.md](https://github.com/TLEWA/dsh-plugin-ci/blob/v1/PROCESS.md) 与
[docs/gates.md](https://github.com/TLEWA/dsh-plugin-ci/blob/v1/docs/gates.md) 为准；
这里只列本仓库最容易踩的线。

1. 从最新 `main` 开 `feat/`、`fix/`、`docs/`、`chore/` 或 `refactor/` 分支；
   不要直接改 `main`。
2. 同一个 PR 提交代码、测试、双语 README/CHANGELOG。改 `src/client/**` 必须同时提交
   `lib/client.js`，且 `npm run check` 必须通过。
3. push 前本地跑 gate；以 gate 的 `fix:` 修根因，不要加 `.only`/`.skip`/抑制注释，
   也不要复制 gate 脚本：

   ```bash
   npx --yes --package=github:TLEWA/dsh-plugin-ci#v1 dsh-ci-gate
   npm test
   ```

4. 按 `.github/PULL_REQUEST_TEMPLATE.md` 勾选；等 `ci / ci-ok` 全绿后由维护者合并。
5. 修改 `.github/workflows/**`、`.github/PULL_REQUEST_TEMPLATE.md`、`AGENTS.md` 或
   `ci.config.json` 属于 CI 变更，PR 必须加 `ci-change` 标签；`human-approved` 只能由人加，
   模型不得自行添加。
6. 模型不得执行 `npm publish`，不得自行改版本号。发布只走 `release.yml` 的 tag 流程。

## 发布

1. 升 `package.json` 版本，CHANGELOG 按现有双语格式加一节；
2. `npm test` / `npm run check` 全绿；
3. 在真实 DSH GUI 里用 CDP 验证受影响的菜单（右键、权限切换、删除确认、设置页）；
4. 打 tag（`vX.Y.Z`）由 release workflow 打包发布；`lib/client.js` 必须已被构建并提交。

<!-- dsh-review-policy:v1:start -->
## Code Review Rules

- 用中文报告可证明的严重缺陷，写清触发条件、实际影响和最小相关代码位置；避免风格建议及重复 CI 已完成的机械检查。未返回审阅结果不表示通过。
- 检查宿主兼容性与用户数据边界：插件不得意外改变非目标请求、消息、配置或持久化数据；判断影响时遵守本仓明确记录的兼容例外。
- 检查异常、取消、卸载与重复初始化路径：钩子、监听器和共享状态应正确清理；失败回退不得造成重复执行、数据丢失或泄漏敏感信息。
- 审阅只发表意见。不得自动修复、添加人工批准标签、合并、改版本或发布；保留现有 CI 与人工批准流程。
<!-- dsh-review-policy:v1:end -->

### 本仓审阅重点

- 检查危险删除操作的权限、确认、完整分页和失败保留日志；菜单必须兼容宿主原生 slot，不重复注册或污染其他插件存储。
