# dsh-sidebar-row-menu

给 DeepSeek Harness（DSH）左侧边栏加右键菜单：

- **工作区行**：右键即弹菜单（复刻 `dsh-sidebar-context-menu` 的能力）；
- **工作区下层的会话行**：右键同样弹菜单，把同一套能力延伸到每一段对话。

菜单用 DSH 官方的 `Menu` 组件渲染，视觉、定位、键盘导航和“点外部关闭”都与内置
「…」菜单一致。工作区菜单由本插件组项；会话行右键则**直接展开该行内置的「…」菜单**，
内容来自 `sidebar.workspaces.session.menu.item` slot —— 内置动作和其他插件的动作都在
里面，本插件只追加自己的条目，不复制、不硬编码任何内置动作。

## 功能

### 工作区行右键

| 菜单项 | 行为 |
| --- | --- |
| 新会话 | 展开该工作区并新建会话（等价于行尾 `+`） |
| 重命名 | 打开官方“重命名工作区”对话框 |
| 使用 VS Code 打开 | 宿主在新窗口打开该工作区目录 |
| 在资源管理器中打开 | 宿主打开系统文件管理器 |
| 复制工作区路径 | 复制目录路径到剪贴板 |
| 在新标签中打开 | 仅在装有 `dsh-project-tabs`（暴露 `openWorkspaceInTab`）时出现 |
| 删除工作区 | 打开官方删除确认对话框 |

### 会话行右键（复用官方「…」菜单）

右键会话行不会另起一套菜单，而是展开该行自己的「…」菜单，所以菜单内容随已安装的
插件变化：

| 来源 | 条目 |
| --- | --- |
| DSH 内置 | 重命名、分叉会话、置顶 / 取消置顶、归档 / 取消归档、复制 Session ID |
| 其他插件 | 它们注册进 `sidebar.workspaces.session.menu.item` 的条目 |
| 本插件 | 使用 VS Code 打开、在资源管理器中打开、复制会话链接 |

本插件追加的三个条目：

| 菜单项 | 行为 |
| --- | --- |
| 使用 VS Code 打开 | 优先用会话自己的 `cwd`，取不到则用所属工作区目录 |
| 在资源管理器中打开 | 同上 |
| 复制会话链接 | 复制 `?session=<id>` 深链接 |

同一个条目也会出现在行尾「…」按钮的菜单里 —— 因为它就是同一个 slot。

草稿会话（还没有任何消息的空白会话）没有内置「…」菜单，本插件同样不接管。
非工作区 / 非会话的侧边栏行（如“显示更多”）也不会被拦截。

## 安装

要求：DSH 桌面版（或 `dsh web`）已经至少启动过一次，profile 目录存在；
Windows PowerShell 5.1+。

```powershell
cd C:\Users\TLEWA\Desktop\SideBar
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
powershell -NoProfile -File .\scripts\install.ps1 -Profile 'C:\Users\TLEWA\.dsh\profiles\web'
```

安装完：

- 先硬刷新界面（`Ctrl+Shift+R`）；客户端半边会在控制台打印
  `[dsh-sidebar-row-menu] installed`；
- 若右键没有任何反应，再重启桌面应用，让宿主半边和 bundle 树一起重新装载。

自检：

```powershell
# 宿主路由应返回 400 bad-target，说明插件已装载
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

## 开发

```powershell
npm run test        # 常规：node --test，逐文件子进程
npm run test:local  # 受限终端 / 沙箱：--test-isolation=none，同进程跑
```

测试覆盖宿主侧纯函数（路径校验、`vscode://file` 编码、loopback 判定、路由状态码）
和客户端模块（模块 id、导出、依赖白名单、监听器安装/卸载、slot 注册表），并用伪造的
`__reactFiber$`、DOM 与 `Menu` 宿主做集成测试：工作区右键的菜单项顺序、会话右键是否
展开内置菜单而不是自建菜单、草稿行是否被放过、复制链接的剪贴板内容都在断言里。
真实 fiber 与服务仍需在运行中的 GUI 里做人工验证。

目录：

```
lib/index.js         宿主半边：/open 路由、VS Code / 资源管理器启动、loopback 围栏
lib/client.js        客户端半边：fiber 解析、slot 注册、工作区菜单、会话菜单展开
cordis.patch.yml     bundle patch：把插件插进 profile 插件树
scripts/install.ps1  无 pnpm 的安装 / 卸载脚本
test/*.test.mjs      node:test
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
（省略号按钮）的点击，展开的自然是同一份 slot 内容。本插件自己的三个动作也通过
`ctx.slots.inject` + `ctx.slots.register` 注册进去，所以：

- 不依赖「分叉」「置顶」这些内置条目是否存在；
- 内置或别的插件以后新增条目，右键菜单自动出现；
- 同一份条目同时服务「…」按钮和右键，不会出现两套不一致的行为。

工作区行没有这样的 slot，所以工作区菜单仍由本插件自己组项。

### 为什么菜单是命令式挂载

右键事件不是 React 渲染流的一部分。工作区菜单按需创建一个 `0×0`、
`z-index:2147483647` 的容器，`createRoot` 渲染官方 `Menu`（`portal` + 显式
`getAnchorRect` 钉在鼠标位置），关闭时 `unmount()` 并移除容器。会话菜单不挂载任何
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

## 已知限制

- 依赖 DSH 内置行组件的 props 形状（按 `0.2.1-rc.5` 的 `ProjectRowItem` /
  `SessionNodeItem` 实现）。DSH 升级若改了这两个组件，右键会静默不弹（不会报错、
  不影响原界面）。
- 会话右键依赖行内 `Menu` 组件仍在 fiber 子树里。找不到时退回点击行内操作区的
  省略号按钮，再找不到就放弃 —— 不会自建菜单，也不会误触行的打开动作。
- 本插件不提供会话“删除”：DSH 官方只支持归档，归档后可恢复；强行删记录容易留下
  孤儿数据。会话的归档 / 取消归档由内置菜单条目负责。
- 会话行右键的 VS Code / 资源管理器目录来自 `sessions.list` 的 `cwd`，取不到时退回
  所属工作区目录；未分组会话可能没有目录，此时会提示“没有可用的目录路径”。

## 许可

MIT。部分实现改编自：

- [dsh-sidebar-context-menu](https://github.com/miao-ge/dsh-sidebar-context-menu)（MIT, miao-ge）
- dsh-workspace-menu（BSD-3-Clause, @0imzero）

完整声明与许可证文本见 [NOTICE.md](./NOTICE.md)。
