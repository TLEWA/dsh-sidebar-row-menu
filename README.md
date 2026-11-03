# dsh-sidebar-row-menu

<img src="https://raw.githubusercontent.com/TLEWA/dsh-sidebar-row-menu/main/assets/icon-180.png" width="96" align="right" alt="插件图标" />

[![CI](https://github.com/TLEWA/dsh-sidebar-row-menu/actions/workflows/ci.yml/badge.svg)](https://github.com/TLEWA/dsh-sidebar-row-menu/actions/workflows/ci.yml)
[![Release](https://github.com/TLEWA/dsh-sidebar-row-menu/actions/workflows/release.yml/badge.svg)](https://github.com/TLEWA/dsh-sidebar-row-menu/releases)

[简体中文](README.md) · [English](README.en.md)

给 [DeepSeek Harness](https://github.com/deepseek-ai)（DSH）左侧边栏加右键菜单：

- **工作区行**：右键弹出菜单（复刻 `dsh-sidebar-context-menu` 的能力）；
- **工作区下层的会话行**：右键在指针处展开该行内置的「…」菜单，并追加本插件的条目。

工作区菜单用 DSH 官方的 `MenuSurface` + `MenuItemButton` 自绘（官方 `Menu` 的条目不支持
子菜单），视觉、行高、图标、危险色与分组分隔线都复用官方控件，键盘导航和“点外部关闭”
与内置菜单一致。会话菜单的内容来自
`sidebar.workspaces.session.menu.item` slot —— 内置动作和其他插件的动作都在里面，
本插件只追加自己的条目，不复制、不硬编码任何内置动作。

> 点行尾「…」按钮看到的菜单保持 DSH 原样；本插件自己的条目只在右键展开时出现。
> 右键展开的菜单不会因为鼠标移出而关闭（与工作区右键一致），只有点击外部、选中条目或按 Esc 才关闭。

## 功能

### 工作区行右键

| 菜单项 | 行为 |
| --- | --- |
| 新会话 | 展开该工作区并新建会话（等价于行尾 `+`） |
| 重命名 | 打开官方“重命名工作区”对话框 |
| 置顶的打开方式 | 被置顶的应用直接显示在一级菜单（例如「用 Visual Studio Code 打开」），点击后用该应用打开工作区目录 |
| 打开方式 | 二级菜单列出宿主提供的外部应用（编辑器、终端、文件管理器）；与会话菜单共用同一套应用列表、置顶与开关设置，鼠标悬浮自动展开 |
| 复制工作区路径 | 复制目录路径到剪贴板 |
| 在新标签中打开 | 仅在装有 `dsh-project-tabs`（暴露 `openWorkspaceInTab`）时出现 |
| 删除工作区 | 打开官方删除确认对话框；只删除工作区登记，会话保留并归入「未分组」 |
| 删除工作区及所有会话 | 先永久删除该工作区下的每个会话及其日志，全部成功后再删除工作区登记；任一会话删除失败则保留工作区，便于重试。工作区目录本身不删除 |

### 会话行右键

右键会话行不会另起一套菜单，而是展开该行自己的「…」菜单：

| 来源 | 条目 |
| --- | --- |
| DSH 内置 | 重命名、分叉会话、置顶 / 取消置顶、归档 / 取消归档、复制 Session ID |
| 其他插件 | 它们注册进 `sidebar.workspaces.session.menu.item` 的条目 |
| 本插件 | 置顶的打开方式（一级）、打开方式（二级菜单）、永久删除会话 / 删除所有已归档会话（默认仅已归档会话显示；可在设置里允许删除未归档会话） |

本插件追加的条目：

| 菜单项 | 行为 |
| --- | --- |
| 打开方式 | 二级菜单列出宿主提供的外部应用（编辑器、终端、文件管理器），用会话自己的 `cwd` 打开；取不到时退回所属工作区目录 |
| 置顶的打开方式 | 被置顶的应用直接显示在一级菜单（例如「用 Visual Studio Code 打开」）；未配置时自动置顶检测到的第一个编辑器，没有编辑器则置顶第一个应用。鼠标悬浮到「打开方式」会自动展开二级菜单 |
| 永久删除会话 | 默认只在已归档会话的右键菜单里出现；确认后永久删除这一个会话及其日志，不可恢复。在设置里开启「允许删除未归档会话」后，未归档会话也会出现这一项 |
| 删除所有已归档会话 | 只在已归档会话的右键菜单里出现；确认后永久删除全部已归档会话及其日志，不可恢复 |

「打开方式」的应用列表来自 DSH 内置的 `open-in-app` 路由，与 DSH 自己的「打开方式」
能力同源；应用名和图标都由本插件展示，可在设置里逐个隐藏，也可以把常用应用置顶到
一级菜单。两个删除入口由本插件自己的宿主路由完成，默认不会删除未归档会话；
开启「允许删除未归档会话」后才会对普通会话开放。删除不会级联删除 fork 子会话。

这些条目默认是**右键专属**：点行尾「…」按钮时它们不挂载。实现上使用一个只在右键展开瞬间
有效的窗口标记，窗口外的渲染直接返回 `null`。

如果想直接使用行尾「…」菜单，可以在设置 →「行菜单」→「同时放进「…」菜单」里逐个开启：
会话条目会挂进原生「…」菜单；工作区行开启任意一项后，本插件会接管行尾「…」按钮，用同一套
菜单展示官方「重命名 / 删除工作区」加上已开启的插件条目。全部关闭时「…」按钮保持 DSH 原样。

草稿会话（还没有任何消息的空白会话）没有内置「…」菜单，本插件同样不接管。
非工作区 / 非会话的侧边栏行（如“显示更多”）也不会被拦截。

### 设置

设置 →「行菜单」里可以开关本插件的每个新增项：

| 开关 | 作用 |
| --- | --- |
| 打开方式 | 关闭后工作区 / 会话菜单里不再出现「打开方式」和置顶应用 |
| 打开方式 → 应用 | 逐个隐藏应用；旁边的「置顶」按钮把应用移到一级菜单 |
| 永久删除会话 | 关闭后会话菜单里不再出现单条删除入口 |
| 允许删除未归档会话 | 默认关闭；开启后未归档会话的右键菜单也会出现「永久删除会话」，需先开启上一项 |
| 删除所有已归档会话 | 关闭后不再出现批量删除入口 |
| 同时放进「…」菜单 → 工作区 | 逐项把工作区行右键条目加进行尾「…」菜单：新会话、打开方式、复制工作区路径、在新标签中打开、删除工作区及所有会话。开启任意一项后「…」按钮改由本插件渲染 |
| 同时放进「…」菜单 → 会话 | 逐项把会话行右键条目加进原生「…」菜单：打开方式、永久删除会话、删除所有已归档会话 |

「同时放进「…」菜单」下的开关默认全部关闭，`…` 菜单在未开启时与 DSH 完全一致。

开关存在浏览器 `localStorage`（`dsh.sidebar-row-menu.items.v1`、
`dsh.sidebar-row-menu.open-with.v1`、`dsh.sidebar-row-menu.open-with.pinned.v1` 与
`dsh.sidebar-row-menu.ellipsis.v1`），
改完立即生效，不需要重启。置顶项在第一次配置前是自动推导的：优先置顶检测到的第一个
编辑器（通常是 VS Code），没有编辑器时置顶应用列表里的第一个。

### 与 dsh-session-menu 共存

同时安装 [`dsh-session-menu`](https://github.com/big-head-pigeon/dsh-session-menu) 时，
本插件会在会话菜单 slot 里检测对方注册的 `session-menu-open-with` /
`session-menu-delete` / `session-menu-delete-archived`，命中后自动隐藏自己的同名条目，设置页对应开关置灰并
提示“已由 dsh-session-menu 提供”。不会改动对方的配置，也不要求对方做任何适配。

## 安装

要求：

- DSH 桌面版（或 `dsh web`）已经至少启动过一次，profile 目录存在；
- Windows PowerShell 5.1+；
- 与 DSH 客户端内置包 `0.2.1-rc.5` 同代的行组件（见[兼容性](#兼容性)）。

### 从 npm 安装（推荐）

包已发布到 npm registry，DSH 的插件安装器可以直接按包名解析：

1. 打开侧边栏 **插件** 页 → **安装插件**；
2. 输入包名并确认：

   ```
   dsh-sidebar-row-menu
   ```

3. 安装完成后硬刷新（`Ctrl+Shift+R`）；宿主半边未生效时重启桌面端。

要固定版本，在包名后加版本号：

```
dsh-sidebar-row-menu@1.4.2
```

命令行等价写法：

```powershell
dsh plugin --profile desktop add dsh-sidebar-row-menu@1.4.2
```

### 从 GitHub 安装

DSH 桌面端通过 pnpm 安装 Git 依赖；本仓库的 `lib/` 已是可直接运行的产物，安装时
**不需要本地构建**。

1. 打开侧边栏 **插件** 页 → **安装插件**；
2. 粘贴仓库地址并确认：

   ```
   https://github.com/TLEWA/dsh-sidebar-row-menu
   ```

3. 安装完成后硬刷新（`Ctrl+Shift+R`）；宿主半边未生效时重启桌面端。

该地址跟随 `main` 的最新提交。要固定版本，在地址后加标签：

```
https://github.com/TLEWA/dsh-sidebar-row-menu#v1.4.2
```

也可以直接安装 Actions 打出的压缩包（不经过 Git）：

```
https://github.com/TLEWA/dsh-sidebar-row-menu/releases/download/v1.4.2/dsh-sidebar-row-menu-1.4.2.tgz
```

命令行等价写法：

```powershell
dsh plugin --profile desktop add github:TLEWA/dsh-sidebar-row-menu
```

自动化：每次 push / PR 由 GitHub Actions 执行语法检查、完整测试和打包校验；推送
`v*` 标签时自动创建 Release，附带 `dsh-sidebar-row-menu-<version>.tgz` 与
`SHA256SUMS.txt`。

### 插件市场

面向 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 的
提交材料（条目 YAML、预检脚本）只保留在本地，已加入 `.gitignore`，不随本仓库发布；
正式提交时只需把条目文件放进上游仓库的一个 PR。收录前请继续使用上面的 GitHub 地址安装。

### 手动安装（克隆仓库）

```powershell
git clone https://github.com/TLEWA/dsh-sidebar-row-menu.git dsh-sidebar-row-menu
cd dsh-sidebar-row-menu
powershell -NoProfile -File .\scripts\install.ps1
```

脚本做四件事（不依赖 pnpm）：

1. `%DSH_HOME%\plugins\dsh-sidebar-row-menu` → 本仓库（发布点目录联接，源码保持可编辑）；
2. 在 profile 的 `dependencies` 写 `link:../../plugins/dsh-sidebar-row-menu`；
3. `%DSH_HOME%\profiles\<profile>\node_modules\dsh-sidebar-row-menu` → 发布点；
4. 校验链接确实解析到本包的 `package.json` 且带 `dsh.bundle.patch`，才把包名追加到
   `dsh.profile.bundles`；写回前备份 `package.json`。

默认安装到 `desktop`，也可以：

```powershell
powershell -NoProfile -File .\scripts\install.ps1 -Profile both
powershell -NoProfile -File .\scripts\install.ps1 -Profile 'C:\Users\<you>\.dsh\profiles\web'
```

安装完：

- 先硬刷新界面（`Ctrl+Shift+R`）；客户端半边会在控制台打印
  `[dsh-sidebar-row-menu] installed`；
- 若右键没有任何反应，再重启桌面应用，让宿主半边和 bundle 树一起重新装载。

自检（宿主路由应返回 `400 bad-target`）：

```powershell
curl.exe -X POST http://127.0.0.1:10102/dsh-sidebar-row-menu/open `
  -H 'content-type: application/json' -d '{"target":"nope","path":"x"}'
```

然后在侧边栏分别右键一个工作区行和它下面的会话行：菜单应贴着鼠标弹出，样式与
内置「…」菜单一致；`Esc`、点空白处都能关闭。

卸载：

```powershell
powershell -NoProfile -File .\scripts\install.ps1 -Uninstall
```

只移除两个目录联接、依赖项和 bundle 条目，不碰仓库本身。

> 不要用 `dsh plugin add link:<绝对路径>`：pnpm 在 Windows 上把 `link:` 当成相对
> profile 的路径，跨盘时会生成坏链接；脚本正是为了绕开这一点。

### 从脚本安装切换到 pnpm 安装（npm / GitHub）

如果你先用 `scripts/install.ps1` 装过开发版，再在插件页输入 npm 包名或 GitHub 地址，pnpm 可能报：

```
[ERR_PNPM_EPERM] [importPackage ...\node_modules\dsh-sidebar-row-menu]
EPERM: operation not permitted, rename
'...\dsh-sidebar-row-menu_tmp_27508_27' -> '...\dsh-sidebar-row-menu'
```

原因是脚本在 `node_modules` 里留了一个目录联接，而 pnpm 导入新包时用 rename 覆盖目标；
Windows 不允许这样替换一个已存在的联接目录。先卸载脚本安装，再重试：

```powershell
powershell -NoProfile -File .\scripts\install.ps1 -Uninstall
```

如果卸载后目录仍在（或安装失败留下了 `*_tmp_*` 目录），手动删除后重试：

```powershell
cmd /c rmdir "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\dsh-sidebar-row-menu"
```

全新 profile 不会遇到这个问题；它只影响“先脚本安装、后 pnpm（npm 或 GitHub）安装”的切换场景。

## 开发

```powershell
npm run test        # 常规：node --test，逐文件子进程
npm run test:local  # 受限终端 / 沙箱：--test-isolation=none，同进程跑
npm run build       # npm pack（prepack 会先跑 check），产出 .tgz
```

测试覆盖宿主侧纯函数（路径校验、`vscode://file` 编码、loopback 判定、路由状态码）
和客户端模块（模块 id、导出、依赖白名单、监听器安装/卸载、slot 注册表），并用伪造的
`__reactFiber$`、DOM 与 `Menu` 宿主做集成测试：工作区右键的菜单项顺序、会话右键是否
展开内置菜单而不是自建菜单、草稿行是否被放过、复制工作区路径的 Toast 反馈都在断言里。
真实 fiber 与服务仍需在运行中的 GUI 里做人工验证。

目录：

```
lib/index.js          宿主入口：name / inject / apply，再导出可测试的纯函数
lib/host/security.js  loopback 请求围栏
lib/host/paths.js     路径校验、vscode://file 编码
lib/host/launch.js    VS Code / 资源管理器启动
lib/host/route.js     /open、/session/delete 与 /workspace/delete 路由、HTTP 状态码
lib/host/session-delete.js 会话日志目录的校验与删除（detach / rm / 复查）
lib/host/workspace-delete.js 删除工作区及其所有会话；会话失败时保留工作区
lib/client.js         客户端半边：fiber 解析、slot 注册、菜单挂载
cordis.patch.yml      bundle patch：把插件插进 profile 插件树
scripts/install.ps1   无 pnpm 的安装 / 卸载脚本
test/*.test.mjs       node:test
```

## 实现说明

### 为什么从 fiber 取数据

侧边栏行只暴露 `data-row-key`（`workspace:<key>` / `session:<id>`），工作区目录、
会话对象和动作回调都不在 DOM 上。行组件是：

- `ProjectRowItem({ group, actions, onCreate, ... })`，`actions` 仅在真实工作区行存在；
- `SessionNodeItem({ node, onRenameRequest, onOpen, ... })`，`node` 形如
  `{ id, title, blank, running, archived, pinned, updatedAt }`。

插件在 `contextmenu` 捕获阶段从目标节点拿 `__reactFiber$`，向上最多 60 层找匹配的
`memoizedProps`。找不到就完全不拦截，避免影响其他行和其他插件。

### 会话行为什么不硬编码

内置「…」菜单不是硬编码的按钮列表，而是
`renderSlot('sidebar.workspaces.session.menu.item', ...)` 的结果；内置的分叉、置顶、
归档，以及第三方插件的能力，都以 slot 条目形式注册。slot 的所有权由渲染器校验：
每个条目只能渲染自己声明过的子 slot，第三方无法直接把手伸进别人的 slot 重新排版。

因此会话行右键只做一件事：在行组件的 fiber 子树里找到那个 `Menu`，触发它 anchor
（省略号按钮）的点击，展开的自然是同一份 slot 内容。本插件自己的动作也通过
`ctx.slots.inject` + `ctx.slots.register` 注册进去，所以：

- 不依赖「分叉」「置顶」这些内置条目是否存在；
- 内置或别的插件以后新增条目，右键菜单自动出现；
- 不复制、不硬编码任何内置动作。

工作区行没有这样的 slot，所以工作区菜单仍由本插件自己组项。官方 `Menu` 的
`items` 只支持单层条目，无法表达子菜单，因此工作区菜单用 `MenuSurface` +
`MenuItemButton` 自绘：行、图标、危险色和分隔线都复用官方控件，交互与官方菜单一致。

### 为什么会话菜单能贴着鼠标

官方 `Menu` 的 `anchor` 是那个省略号按钮，默认位置就在按钮右侧。右键时插件临时把
该按钮及其两层祖先的 `getBoundingClientRect` 指到指针位置（`0×0` 矩形），官方 `Menu`
每帧读取锚点 rect 重新定位，于是面板出现在鼠标旁；面板从 `body` 移除时立即还原原始
方法，不影响按钮菜单的默认位置。

「…」按钮菜单与右键菜单共用同一个 `Menu` 实例和同一份 slot 内容，区别只在
`rightClickMenuUntil` 窗口：本插件条目只在窗口内挂载，窗口随菜单关闭一并清零。

### 为什么菜单是命令式挂载

右键事件不是 React 渲染流的一部分。工作区菜单按需创建一个 `0×0`、
`z-index:2147483647` 的容器，`createRoot` 渲染自绘面板；面板挂载后量一次尺寸，
再把左上角夹进视口，避免贴边时被裁掉。关闭时 `unmount()` 并移除容器。会话菜单不挂载任何
新容器，只是打开行内已有的官方菜单。

### 宿主路由

`POST /dsh-sidebar-row-menu/open`，body `{ target: 'vscode' | 'explorer', path }`。

- 只接受 loopback 请求（socket、Host、`Sec-Fetch-Site`、Origin 四重校验）；
- 只接受 POST，路径必须精确匹配，body ≤ 64 KB；
- `path` 必须是**已存在的绝对目录**（拒绝相对路径、NUL、文件、不存在的路径），
  避免把任意命令交给宿主；
- VS Code 解析顺序：`DSH_SCM_VSCODE` → 注册表 `HKCR\vscode\shell\open\command`
  → `%LOCALAPPDATA%` / `%ProgramFiles%` 下的 `bin\code.cmd` → `PATH`；
  都找不到时退回 `rundll32` 打开 `vscode://file/...`；
- spawn 用 `detached + stdio:'ignore'`，不设 `windowsHide`（否则资源管理器窗口会被隐藏）。

`POST /dsh-sidebar-row-menu/session/delete`，body `{ sessionIds: string[] }`。

- 同样的 loopback / POST / 路径 / 64 KB body 校验；`sessionIds` 必须是非空字符串数组，
  最多 500 个；
- 串行删除：先取消运行中的会话、detach 活会话，再按 `sessionPersistence.locate()` 找到
  会话目录；目录 basename 必须与会话 id 完全一致，否则拒绝删除（防误删父目录）；
- 删除后 3 次复查目录没有复活，再清理 `workspaceRegistry` 的归档 / 置顶记录并发出
  `api-session/removed`；
- 部分失败返回 `200` + `{ ok:false, deleted, failed, error }`，前端保留对话框并显示计数。

`POST /dsh-sidebar-row-menu/workspace/delete`，body `{ workspaceId: string }`。

- 同样的 loopback / POST / 64 KB body 校验；`workspaceId` 必须是非空字符串；
- 先读取 `workspaceRegistry.get(workspaceId).sessionIds`，用上面的会话删除流程逐个永久删除；
- 只有全部会话删除成功（包括本来就不存在的会话）才调用 `workspaceRegistry.delete()`；
  任一会话失败返回 `200` + `ok:false` 并保留工作区，避免留下无人管理的「未分组」会话；
- 未知工作区返回 `ok:true, missing:true`，不视为错误。

「打开方式」不经过本插件宿主：直接调用 DSH 内置的 `open-in-app/apps`、
`open-in-app/open`、`open-in-app/icon/<id>`。

## 兼容性

按 DSH 客户端 `0.2.1-rc.5` 的 `ProjectRowItem` / `SessionNodeItem` / `Menu` 实现。
DSH 升级若改动行组件或菜单定位实现：

- 工作区右键会静默不弹（不会报错、不影响原界面）；
- 会话右键会退回行尾「…」按钮旁，内容仍然正确。

## 已知限制

- 依赖 DSH 内置行组件的 props 形状。DSH 升级若改了这两个组件，右键会静默不弹。
- 会话右键依赖行内 `Menu` 组件仍在 fiber 子树里。找不到时退回点击行内操作区的
  省略号按钮，再找不到就放弃 —— 不会自建菜单，也不会误触行的打开动作。
- 永久删除默认只对**已归档**会话开放；在设置里开启「允许删除未归档会话」后，未归档
  会话也能从右键菜单直接删除。删除不会级联删除 fork 出来的子会话，需要时请分别删除。
- 删除操作直接作用于会话日志目录，宿主没有回收站；确认框里已明确提示不可恢复。
- 会话行「打开方式」的目录来自 `sessions.list` 的 `cwd`，取不到时退回
  所属工作区目录；未分组会话可能没有目录，此时会提示“没有可用的目录路径”。

## 许可与声明

- 代码：[MIT](LICENSE)。
- 更新日志：[CHANGELOG.md](CHANGELOG.md)。
- 第三方代码引用与许可证全文：[NOTICE.md](NOTICE.md) · [English](NOTICE.en.md)。
- AI 使用与代码来源声明：[AI_USAGE.md](AI_USAGE.md) · [English](AI_USAGE.en.md)。

本项目允许用于商业与非商业场景，但按 MIT 条款**不提供任何担保**；AI 辅助生成的
代码请在采用前自行审查。
