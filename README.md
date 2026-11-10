# dsh-sidebar-row-menu

<img src="https://raw.githubusercontent.com/TLEWA/dsh-sidebar-row-menu/main/assets/icon-180.png" width="96" align="right" alt="插件图标" />

[![CI](https://github.com/TLEWA/dsh-sidebar-row-menu/actions/workflows/ci.yml/badge.svg)](https://github.com/TLEWA/dsh-sidebar-row-menu/actions/workflows/ci.yml)
[![Release](https://github.com/TLEWA/dsh-sidebar-row-menu/actions/workflows/release.yml/badge.svg)](https://github.com/TLEWA/dsh-sidebar-row-menu/releases)

[简体中文](README.md) · [English](README.en.md)

给 [DeepSeek Harness](https://github.com/deepseek-ai)（DSH）左侧边栏加右键菜单：

- **工作区行**：右键弹出菜单（DSH 0.2.2 起并入宿主原生菜单，条目按 order 与内置项交错）；
- **工作区下层的会话行**：右键在指针处展开该行自己的菜单，并追加本插件的条目。

DSH 0.2.2 把侧栏右键改成数据驱动：工作区菜单由宿主统一渲染，本插件按 order 把条目混排
进去；会话菜单仍由宿主渲染 slot 内容，右键也由宿主开在指针处。所以 0.2.2 上菜单的视觉、
行高、图标、危险色、键盘导航，以及“点外部关闭 / Esc 关闭”全部与内置菜单一致，本插件只
提供条目。0.2.1 及更早的宿主没有这套服务：工作区菜单仍由本插件用官方 `MenuSurface` +
`MenuItemButton` 自绘，会话右键仍由插件把行尾「…」菜单搬到指针处。

会话菜单的内容来自
`sidebar.workspaces.session.menu.item` slot —— 内置动作和其他插件的动作都在里面，
本插件只追加自己的条目，不复制、不硬编码任何内置动作。

> 本插件的条目默认只在右键展开时出现；设置 →「行菜单」→「菜单显示位置」可以逐项改成
> 只进「…」菜单、或两边都进（至少保留一边）。
> 0.2.2 上右键与「…」共用同一份宿主菜单，插件按“右键手势”区分：右键时打标，等菜单面板
> 真正挂载后才收尾；点「…」的按下事件会立刻清标，所以那个菜单只带设为「…」或「两边」的条目。
> 右键展开的菜单不会因为鼠标移出而关闭，只有点击外部、选中条目或按 Esc 才关闭。

## 功能

### 工作区行右键

0.2.2 上这份菜单由宿主渲染，本插件条目与内置「重命名」（100）、「在文件夹显示」（200）、
「删除工作区」（300）按 order 交错，分组规则与会话菜单一致：新会话 90、在新标签打开 110、
归档会话开关 130、复制工作区路径 150、置顶应用 210、打开方式 220、新会话默认权限 225、
删除工作区及所有会话 310。这些条目默认只出现在右键菜单；行尾「…」里的菜单保持原生，
想让它也带上插件条目，可在设置 →「行菜单」→「菜单显示位置」里逐项选择「…」或「两边」。
0.2.1 上整份菜单由本插件自绘，「重命名」「删除工作区」由插件调用官方对话框。

| 菜单项 | 行为 |
| --- | --- |
| 新会话 | 展开该工作区并新建会话（等价于行尾 `+`） |
| 重命名（内置） | 打开官方“重命名工作区”对话框；0.2.1 上由本插件代为渲染 |
| 在新标签中打开 | 仅在装有 `dsh-project-tabs`（暴露 `openWorkspaceInTab`）时出现 |
| 显示 / 隐藏已归档会话 | 只在该工作区有已归档会话时出现，文案随当前状态切换。点击「显示已归档会话」会把侧边栏的全局归档筛选切到「全部对话」，再藏起其他工作区（含「未分组」）的归档行，于是只有这个工作区的已归档会话露出来；点击「隐藏已归档会话」把它重新收回。逐工作区的选择存在本地、刷新后保持；在「视图选项」里改全局筛选则以全局选择为准 |
| 复制工作区路径 | 复制目录路径到剪贴板 |
| 在文件夹显示（内置） | 在资源管理器里打开工作区目录；0.2.2 由宿主提供，0.2.1 上不出现 |
| 置顶的打开方式 | 被置顶的应用直接显示在一级菜单（例如「用 Visual Studio Code 打开」），点击后用该应用打开工作区目录 |
| 打开方式 | 二级菜单列出宿主提供的外部应用（编辑器、终端、文件管理器）；与会话菜单共用同一套应用列表、置顶与开关设置，鼠标悬浮自动展开。宿主的菜单项不画二级箭头，本插件把标签渲染成「文字 + 右对齐箭头」，与会话菜单同一位置；0.2.1 自绘菜单画的是箭头图标 |
| 新会话默认权限 | 二级菜单列出宿主原生权限预设（仅可查看 / 工作区内修改 / 完全权限）。选中的预设成为**该工作区下以后新建会话**的默认权限，当前生效项右侧打勾；「跟随全局默认」清除本工作区的设置。只改新会话，不动已有会话 |
| 删除工作区（内置） | 打开官方删除确认对话框；只删除工作区登记，会话保留并归入「未分组」。0.2.1 上由本插件代为渲染 |
| 删除工作区及所有会话 | 先永久删除该工作区下的每个会话及其日志，全部成功后再删除工作区登记；任一会话删除失败则保留工作区，便于重试。工作区目录本身不删除 |

### 会话行右键

右键会话行不会另起一套菜单：0.2.2 由宿主把该行的原生菜单开在指针处；0.2.1 由本插件触发行尾
「…」菜单，并临时把它的锚点移到指针。两种情况下菜单内容都来自同一份 slot：

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
| 删除所有已归档会话 | 只在已归档会话的右键菜单里出现；确认后永久删除全部已归档会话及其日志，不可恢复。归档数超过 500 时自动分批请求宿主，不会因为单批上限而失败 |

「打开方式」的应用列表来自 DSH 内置的 `open-in-app` 路由，与 DSH 自己的「打开方式」
能力同源；应用名和图标都由本插件展示，可在设置里逐个隐藏，也可以把常用应用置顶到
一级菜单。两个删除入口由本插件自己的宿主路由完成，默认不会删除未归档会话；
开启「允许删除未归档会话」后才会对普通会话开放。删除不会级联删除 fork 子会话。

这些条目默认出现在**右键菜单**。想直接使用行尾「…」菜单，可以在设置 →「行菜单」→
「菜单显示位置」里逐项选择：

- 「…」菜单：条目只出现在行尾「…」打开的菜单里，右键菜单不再显示；
- 「两边」：右键和「…」都显示；
- 「右键菜单」：默认值，只在右键菜单里出现。

每个条目至少要保留一边，最后一边的开关会被锁住。会话条目与工作区条目（0.2.2）都走同一套
`contextMenus` provider，按手势标记决定当前是哪份菜单；工作区条目在 0.2.1 上由本插件接管
行尾「…」按钮自绘，规则一致。

草稿会话（还没有任何消息的空白会话）没有右键菜单，本插件同样不接管。
非工作区 / 非会话的侧边栏行（如“显示更多”）也不会被拦截。

### 会话正文右键

在会话正文里右键——空白处、思考过程、回复和工具摘要都可以（输入框、工具条和工具卡片
本身以外）——会弹出一份纵向菜单，把这排按钮按**屏幕视觉顺序**从左到右列出来，每项带
原按钮的图标：

- 装了 `dsh-sidebar-organizer` 且调整过「会话头部工具条」时，菜单顺序跟随它的排序；
  没装或没调整时就是 DSH 的默认顺序。organizer 用 CSS `order` 排序，DOM 顺序不等于
  屏幕顺序，所以菜单是按 `getBoundingClientRect()` 的横坐标现算的；
- 「打开方式」按工作区 / 会话右键菜单的同一套规则收纳：置顶的应用直接显示成一级行
  （如「用 Visual Studio Code 打开」），其余应用收进「打开方式 ›」二级菜单，悬浮或
  点击展开；设置里的「打开方式」总开关、逐应用开关和置顶都对它生效，总开关关闭时这
  一组整体不出现；
- 「更多操作」也不再点开右上角的「…」：和其它二级菜单一样在本菜单里展开，直接复刻
  宿主那份菜单的条目（复制会话为 Markdown、下载 Session 日志、反馈……），选中即执行；
  子菜单的行序同样跟随 `dsh-sidebar-organizer`——在「…」弹层里拖动过的顺序会写进
  `dsh.sidebar-organizer.host-menu-order.v1`，这里按同一份顺序重排；
- 不同分组之间自动加淡色分隔线，菜单项的高度、内边距、圆角、13px 字号和 14px 图标
  都与 DSH 原生右键菜单对齐；
- 「更多操作」一类的溢出入口固定放在最后一项（可在设置里关掉）；被 organizer 收进
  「更多操作」的按钮不会单独出现；
- 会话栏左上角的状态组件（`conversation.session.header.actions` 槽位：费用明细、
  后台任务计数等）整体不列进菜单，设置里打开「显示左上角状态组件」后才出现。这条规则
  按槽位判断、不认识具体标签，所以宿主或插件以后往这个槽位加的状态组件也默认隐藏；
- 点普通条目就是点原按钮：先关菜单，再把 `click` 派发给宿主工具条里的那个按钮，所以
  「查找」「展开底部面板」等弹出的仍是原生面板；
- 有选中文字时让位给浏览器的选区菜单；消息里的输入控件和链接也保留原生菜单；工具卡片、
  输入框、工具条本身以及侧栏行同样保留各自的原生菜单；
- 找不到任何可用的工具条按钮（比如草稿会话或按钮全被隐藏）时，不接管原生菜单。

### 设置

设置 →「行菜单」里可以开关本插件的每个新增项：

| 开关 | 作用 |
| --- | --- |
| 打开方式 | 关闭后工作区 / 会话菜单以及正文右键菜单里不再出现「打开方式」和置顶应用 |
| 打开方式 → 应用 | 逐个隐藏应用；旁边的「置顶」按钮把应用移到一级菜单 |
| 永久删除会话 | 关闭后会话菜单里不再出现单条删除入口 |
| 允许删除未归档会话 | 默认关闭；开启后未归档会话的右键菜单也会出现「永久删除会话」，需先开启上一项 |
| 删除所有已归档会话 | 关闭后不再出现批量删除入口 |
| 显示已归档会话 | 关闭后工作区菜单里不再出现「显示 / 隐藏已归档会话」（默认开启；该项只在当前工作区存在已归档会话时出现） |
| 菜单显示位置 → 工作区 | 逐项选择工作区行条目出现在右键菜单、「…」菜单，或两边：新会话、新会话默认权限、打开方式、复制工作区路径、在新标签中打开、归档会话开关（放进「…」菜单时，0.2.1 也会接管工作区省略号）、删除工作区及所有会话 |
| 菜单显示位置 → 会话 | 逐项选择会话行条目的显示位置：打开方式、永久删除会话、删除所有已归档会话 |
| 启用空白处右键菜单 | 会话正文（空白处、思考过程、回复）的右键菜单总开关（默认开启）；关闭后该区域恢复浏览器 / 宿主的原生菜单 |
| 「更多」固定在最右 | 默认开启；把「更多操作」一类的溢出入口固定在菜单最后一项，不受工具条当前顺序影响 |
| 显示左上角状态组件 | 默认关闭；打开后会话栏左上角 `conversation.session.header.actions` 槽位里的组件（费用明细、后台任务计数等）也会列进正文右键菜单 |

「菜单显示位置」默认全部是「右键菜单」，所以未改动时 `…` 菜单与 DSH 完全一致。

DSH 0.2.2 起行尾「…」与右键共用同一份宿主菜单，插件条目按手势标记区分当前是哪份菜单；
设为「…」或「两边」的条目才会进入「…」菜单。0.2.1 上工作区行没有宿主菜单可贡献，
改由插件接管「…」按钮自绘，显示规则相同。

开关存在浏览器 `localStorage`（`dsh.sidebar-row-menu.items.v1`、
`dsh.sidebar-row-menu.open-with.v1`、`dsh.sidebar-row-menu.open-with.pinned.v1`、
`dsh.sidebar-row-menu.placement.v1` 与 `dsh.sidebar-row-menu.blank-menu.v1`），
改完立即生效，不需要重启。旧版的 `dsh.sidebar-row-menu.ellipsis.v1`（布尔值）会在首次加载时
自动迁移成「两边 / 右键菜单」。置顶项在第一次配置前是自动推导的：优先置顶检测到的第一个
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
npm install
npm run build:client
npm run test
npm run test:local
npm run check
npm run build
```

客户端源码在 `src/client/**`（ESM，多文件），由 esbuild 打包成单文件 `lib/client.js`；
**不要手改 `lib/client.js`**，改完源码要重新构建。目录分层、命名、构建与发布约定见
[AGENTS.md](AGENTS.md)。

测试覆盖宿主侧纯函数（路径校验、`vscode://file` 编码、loopback 判定、路由状态码）
和客户端模块（模块 id、导出、依赖白名单、监听器安装/卸载、slot 注册表），并用伪造的
`__reactFiber$`、DOM 与 `Menu` 宿主做集成测试：工作区右键的菜单项顺序、会话右键是否
展开内置菜单而不是自建菜单、行自身带宿主 `onContextMenu` 时是否完全不拦截（只补一次
`pointerdown`）、点「…」后右键条目是否立刻消失、草稿行是否被放过、复制工作区路径的
Toast 反馈都在断言里。真实 fiber 与服务仍需在运行中的 GUI 里做人工验证。

目录：

```
lib/index.js          宿主入口：name / inject / apply，再导出可测试的纯函数
lib/host/security.js  loopback 请求围栏
lib/host/paths.js     路径校验、vscode://file 编码
lib/host/launch.js    VS Code / 资源管理器启动
lib/host/route.js     /open、/session/delete 与 /workspace/delete 路由、HTTP 状态码
lib/host/session-delete.js 会话日志目录的校验与删除（detach / rm / 复查）
lib/host/workspace-delete.js 删除工作区及其所有会话；会话失败时保留工作区
lib/client.js         客户端半边构建产物（由 src/client/** 打包，勿手改）
src/client/           客户端源码：i18n、常量、样式、store、ui、features
scripts/build-client.mjs  esbuild 打包脚本（--check 校验产物是否最新）
AGENTS.md             仓库约定：分层、命名、构建与发布
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
`memoizedProps`。找不到就完全不拦截，避免影响其他行和其他插件。0.2.2 上 fiber 还用来判断
这一行是否天生带宿主右键触发器（`memoizedProps.onContextMenu` 是函数）：有就说明宿主会把
菜单开在指针处，插件只补一个手势标记，不再干预事件。

### 归档会话为什么不是纯全局筛选

DSH 的归档可见性只有一个全局筛选（`archivedFilter`：隐藏已归档 / 全部对话 / 仅显示已归档），
没有逐工作区的概念。插件把「逐工作区」做成两层：先通过宿主视图动作把全局切到「全部对话」，
再把其他工作区（含「未分组」）的归档行用行内 `display:none` 藏起来；快照里的 `archivedSessionIds` 决定哪些
行是归档行，React 重渲染替换掉节点后由 MutationObserver 重新隐藏。插件不长期改写全局筛选：
用户在「视图选项」里改过之后，之前逐工作区的隐藏会被清空，完全跟随宿主的选择。

### 会话行为什么不硬编码

内置会话菜单不是硬编码的按钮列表，而是
`renderSlot('sidebar.workspaces.session.menu.item', ...)` 的结果；内置的分叉、置顶、
归档，以及第三方插件的能力，都以 slot 条目形式注册。slot 的所有权由渲染器校验：
每个条目只能渲染自己声明过的子 slot，第三方无法直接把手伸进别人的 slot 重新排版。

因此会话行右键从不复制菜单内容：

- 0.2.2：行组件自己带宿主的 `getTriggerProps`（`onContextMenu` 直接把 `kind:'session'`
  交给 `ctx.contextMenus`），右键由宿主处理，插件连「找 Menu、代点按钮」都不需要做；
- 0.2.1：在行组件的 fiber 子树里找到那个 `Menu`，触发它 anchor（省略号按钮）的点击，
  展开的自然是同一份 slot 内容。

本插件自己的动作也通过 `ctx.slots.inject` + `ctx.slots.register` 注册进去，所以：

- 不依赖「分叉」「置顶」这些内置条目是否存在；
- 内置或别的插件以后新增条目，右键菜单自动出现；
- 不复制、不硬编码任何内置动作。

工作区行在 0.2.1 上没有这样的 slot，所以菜单由本插件自己组项；0.2.2 起宿主提供
`ctx.contextMenus`，工作区条目改为数据贡献，同样只是“往宿主菜单里加自己的项”。
官方 `Menu` 的 `items` 只支持单层条目，无法表达子菜单，因此 0.2.1 的工作区菜单用
`MenuSurface` + `MenuItemButton` 自绘：行、图标、危险色和分隔线都复用官方控件。

### 为什么会话菜单能贴着鼠标

0.2.2 上什么都不用做：宿主的 `onContextMenu` 直接把 `clientX / clientY` 交给
`ctx.contextMenus.open()`，面板就渲染在指针处。

0.2.1 上官方 `Menu` 的 `anchor` 是那个省略号按钮，默认位置就在按钮右侧。右键时插件临时把
该按钮及其两层祖先的 `getBoundingClientRect` 指到指针位置（`0×0` 矩形），官方 `Menu`
每帧读取锚点 rect 重新定位，于是面板出现在鼠标旁；面板从 `body` 移除时立即还原原始
方法，不影响按钮菜单的默认位置。

### 为什么右键条目不会出现在「…」菜单里

0.2.2 上右键与「…」打开的是同一份宿主菜单，React 侧无法区分来源，只能看手势：右键时在
进程内打一个标记，用 `MutationObserver` 等一个新的 `[role="menu"]` 面板出现（0.2.2 的
菜单是异步挂载的，还要等 provider 就绪），面板出现后再延迟 400 ms 收尾；3 秒兜底防止手势
被别的插件吞掉。行尾「…」的 `pointerdown` 会立刻清标，只认真实输入（`isTrusted`），因为
插件自己补发的合成 `pointerdown` 不算手势。

条目在挂载时读一次标记，所以面板挂得晚也不影响；标记只活到“这次手势对应的面板出现”，
不会漏进下一次。

工作区行在 0.2.2 上走的是另一条路：宿主菜单的数据来自 `ctx.contextMenus.register` 的
`resolve`，没有 React 条目可以读标记，所以 provider 在解析时直接判断同一枚手势标记，
并且行尾「…」的 `pointerdown` 清标发生在宿主解析之前 —— 右键时按「右键菜单 / 两边」
返回条目，点「…」时按「… 菜单 / 两边」返回。「菜单显示位置」的开关让 provider 分别
跳过一侧的手势判断。

### 会话正文右键为什么按视觉顺序

工具条的顺序不体现在 DOM 里：`dsh-sidebar-organizer` 用 `element.style.order` 重排，
把图标收进「更多操作」时也是改 DOM 的可见性。所以会话正文右键不做任何缓存，而是在事件
发生的那一刻遍历 `conversation.session.header` 的 actions / utilities / corner 三组
slot：先取槽位的直接子节点，再把子节点里的按钮（分段按钮会拆成主按钮和箭头两个）摊平，
按 `getBoundingClientRect().left` 排序，最后按开关把「更多」压到末尾。这样 organizer
的配置、窗口宽度导致的折叠、插件临时隐藏按钮，全都自动反映到菜单里。

点条目不是复制动作，而是把 `click` 派发回工具条上的那个按钮（先关本插件菜单，等一帧
再点）：宿主弹出层仍以原按钮为锚点，菜单也不用手动同步任何状态。「更多操作」是例外：
它的按钮只负责打开宿主弹出层，所以改为顺着 React fiber 找到宿主 Menu 的 `items` /
`onSelect`（最多向上 8 层，取第一个同时有数组 items 和函数 onSelect 的 props），在本
菜单里自绘二级菜单并直接调用 `onSelect(id)`。

命中区域只认 `conversation.session` 内、且不在 header / composer / 工具卡片 / 可交互
元素里的目标；消息节点内部允许右键（思考过程、回复、工具摘要），只有输入控件、链接和
`contenteditable` 会让位。`window.getSelection()` 有非空选中文本时也直接放行，把选区
菜单留给浏览器。命中不了就完全不 `preventDefault`，原生菜单照旧。

「打开方式」在工具条里是一对分段按钮（主按钮 + 箭头），摊平后会把一组动作拆成两行。
所以收集阶段先认出这组分段按钮（两个以上按钮、容器类名带 split、或箭头按钮的
`aria-label` 是「更多打开方式」），把它标记成 open-with 组；渲染时不再照抄这两个按钮，
而是复用工作区 / 会话菜单的那套渲染：从 `useApps` / `usePinned` / `useChildren` 取宿主
应用列表，置顶应用画成一级行，其余收进「打开方式」二级菜单（`submenuGeometry` 负责翻转
和夹边）。会话目录取当前选中会话的 `cwd`（`[data-row-key^="session:"][aria-selected="true"]`，
取不到时退回会话 store 里 `retainedBy.mainView > 0` 的那一行）；应用列表或目录还没就绪时
才退回原来的两个分段按钮。分组切换（打开方式 / actions / utilities / corner / 更多）时给
下一行加 `separatorBefore`，分隔线、行高、图标尺寸都用原生菜单同一组数值，0.5px 线画在
`dsrm-sep` 上。

「打开方式」在工具条里是一对分段按钮（主按钮 + 箭头），摊平后会把一组动作拆成两行。
所以收集阶段先认出这组分段按钮（两个以上按钮、容器类名带 split、或箭头按钮的
`aria-label` 是「更多打开方式」），把它标记成 open-with 组；渲染时不再照抄这两个按钮，
而是复用工作区 / 会话菜单的那套渲染：从 `useApps` / `usePinned` / `useChildren` 取宿主
应用列表，置顶应用画成一级行，其余收进「打开方式」二级菜单（`submenuGeometry` 负责翻转
和夹边）。会话目录取当前选中会话的 `cwd`（`[data-row-key^="session:"][aria-selected="true"]`，
取不到时退回会话 store 里 `retainedBy.mainView > 0` 的那一行）；应用列表或目录还没就绪时
才退回原来的两个分段按钮。分组切换（打开方式 / actions / utilities / corner / 更多）时给
下一行加 `separatorBefore`，分隔线、行高、图标尺寸都用原生菜单同一组数值，0.5px 线画在
`dsrm-sep` 上。

### 为什么 0.2.1 的菜单是命令式挂载

0.2.2 的菜单全部由宿主挂载，插件不创建任何容器。0.2.1 上右键事件不是 React 渲染流的一部分，
工作区菜单按需创建一个 `0×0`、`z-index:2147483647` 的容器，`createRoot` 渲染自绘面板；面板
挂载后量一次尺寸，再把左上角夹进视口，避免贴边时被裁掉。关闭时 `unmount()` 并移除容器。
会话菜单不挂载任何新容器，只是打开行内已有的官方菜单。

### 宿主路由

`POST /dsh-sidebar-row-menu/open`，body `{ target: 'vscode' | 'explorer', path }`。

- 只接受 loopback 请求（socket、Host、`Sec-Fetch-Site`、Origin 四重校验）；
- 只接受 POST，路径必须精确匹配，body ≤ 64 KB；
- `path` 必须是**已存在的绝对目录**（拒绝相对路径、NUL、文件、不存在的路径），
  避免把任意命令交给宿主；
- VS Code 解析顺序：`DSH_SCM_VSCODE` → 注册表 `HKCR\vscode\shell\open\command`
  → `%LOCALAPPDATA%` / `%ProgramFiles%` 下的 `bin\code.cmd` → `PATH`；
  都找不到时退回 `rundll32` 打开 `vscode://file/...`；没找到启动器的结果不再永久缓存，
  装好 VS Code 后下一次点击会重新探测；
- `DSH_SCM_VSCODE` 必须是已存在的文件；指向不存在的路径时直接返回 500
  `vscode-launcher-missing`，不会静默回退到别的启动器；
- spawn 用 `detached + stdio:'ignore'`，不设 `windowsHide`（否则资源管理器窗口会被隐藏）；
  异步启动失败（`error` 事件）返回 500 `spawn-failed`，不再假报成功。

`POST /dsh-sidebar-row-menu/session/delete`，body `{ sessionIds: string[] }`。

- 同样的 loopback / POST / 路径 / 64 KB body 校验；`sessionIds` 必须是非空字符串数组，
  最多 500 个；
- 删除前先取消运行中的会话并最多等 3 秒；仍未停止时该会话按失败上报、保留日志，
  不在句柄还开着时强删；随后 detach 活会话，再按 `sessionPersistence.locate()` 找到
  会话目录；目录 basename 必须与会话 id 完全一致，否则拒绝删除（防误删父目录）；
- 删除冷会话前先读一次会话列表；列表查询失败时按失败上报，不会把会话当成「本来就不存在」
  并算作删除成功；
- 删除后 3 次复查目录没有复活，再清理 `workspaceRegistry` 的归档 / 置顶记录并发出
  `api-session/removed`；
- 部分失败返回 `200` + `{ ok:false, deleted, failed, error }`，前端保留对话框并显示计数。

`POST /dsh-sidebar-row-menu/workspace/delete`，body `{ workspaceId: string }`。

- 同样的 loopback / POST / 64 KB body 校验；`workspaceId` 必须是非空字符串；
- 先读取 `workspaceRegistry.get(workspaceId).sessionIds`，用上面的会话删除流程逐个永久删除；
  会话数超过 500 时继续分批删除，不会只删前 500 个就返回成功；
- 只有全部会话删除成功（包括本来就不存在的会话）才调用 `workspaceRegistry.delete()`；
  任一会话失败返回 `200` + `ok:false` 并保留工作区，避免留下无人管理的「未分组」会话；
- 未知工作区返回 `ok:true, missing:true`，不视为错误。

「打开方式」不经过本插件宿主：直接调用 DSH 内置的 `open-in-app/apps`、
`open-in-app/open`、`open-in-app/icon/<id>`。

## 兼容性

本包在 `package.json` 的 `engines.dsh` 中声明支持范围：`>=0.2.1-rc.5 <0.3.0-0`。
DSH 宿主按该范围拒绝安装不兼容的宿主，插件市场也按它显示支持版本；0.3 起需要重新验证后
再放宽上限。

按 DSH 客户端 `0.2.1-rc.5` 与 `0.2.2` 的 `ProjectRowItem` / `SessionNodeItem` / `Menu`
与 `contextMenus` 实现适配。DSH 0.2.2 起把侧栏右键菜单改成数据驱动，本包按宿主能力自动选路：

- **0.2.2 及以上**：工作区行改用 `ctx.contextMenus.register` 贡献动作
  （新会话 90、新标签 110、复制路径 150、置顶应用 210、打开方式 220、新会话默认权限 225、
  删除工作区及所有会话 310），
  与原生「重命名」「在文件夹显示」「删除工作区」按 order 交错排列；分组分隔线与会话菜单同一
  套规则。右键与「…」共用同一份宿主菜单，插件不再自绘，也不再接管「…」按钮。provider 解析时
  按右键手势与每项的「菜单显示位置」决定是否返回条目。会话行由宿主自己把原生
  菜单开在指针处，本包条目继续从 `sidebar.workspaces.session.menu.item` 渲染；
- **0.2.1**：没有 `contextMenus` 服务，保持原来的自绘工作区菜单；会话右键仍由插件把
  行尾「…」菜单搬到指针。

设置页的导航图标走宿主的 `settings.section.icon` slot（0.2.2 新增）：图标只接收
`{ size, active }`，用 16px 网格、1.5 描边和 `currentColor` 跟宿主自绘图标保持同一套笔触。
0.2.1 没有这个 slot，注册被跳过，设置页照常注册并保留宿主默认的齿轮图标。

DSH 升级若改动行组件或菜单定位实现：

- 工作区右键会退回自绘菜单（0.2.1 路径），或静默不弹（不会报错、不影响原界面）；
- 会话右键会退回行尾「…」按钮旁，内容仍然正确。

## 已知限制

- 0.2.1 下依赖 DSH 内置行组件的 props 形状；0.2.2 起工作区条目改走 `contextMenus`，
  会话条目仍依赖旧扩展点，并用 `memoizedProps.onContextMenu` 判断这一行是否已由宿主接管。
  DSH 升级若改掉对应实现，右键可能静默不弹。
- 0.2.1 的会话右键依赖行内 `Menu` 组件仍在 fiber 子树里。找不到时退回点击行内操作区的
  省略号按钮，再找不到就放弃 —— 不会自建菜单，也不会误触行的打开动作。0.2.2 上不需要
  这段回退，宿主自己就是触发器。
- 永久删除默认只对**已归档**会话开放；在设置里开启「允许删除未归档会话」后，未归档
  会话也能从右键菜单直接删除。删除不会级联删除 fork 出来的子会话，需要时请分别删除。
- 删除操作直接作用于会话日志目录，宿主没有回收站；确认框里已明确提示不可恢复。
- 会话行「打开方式」的目录来自 `sessions.list` 的 `cwd`，取不到时退回
  所属工作区目录；未分组会话可能没有目录，此时会提示“没有可用的目录路径”。
- 正文右键依赖会话头部三组 slot（`conversation.session.header.actions` /
  `.utilities` / `.corner`）的 DOM，以及宿主工具条里那个 Menu 的 React fiber
  （「更多操作」二级菜单从这里读 items / onSelect）；宿主若改掉这些扩展点或 fiber
  结构，对应菜单会静默退回原生行为，不会影响消息、输入框和工具条自己的右键。

## 我的其他 DSH 项目

侧栏右键只是 DSH 的一小块。下面这些插件都由我维护，按需取用。

- **[dsh-sidebar-organizer](https://github.com/TLEWA/dsh-sidebar-organizer)** —— 七区域布局整理器：侧栏、侧栏底部、对话标签、输入框、会话头部、右侧栏、设置导航都能长按拖拽排序，面板可以收进「更多」再拖回来。
- **[dsh-better-choice](https://github.com/TLEWA/dsh-better-choice)** —— `ask_user_question` 增强：右键选项补备注，选之前先拿同一份上下文旁问模型一句。
- **[dsh-if](https://github.com/TLEWA/dsh-if)** —— `/if` 命令：让模型结合上文判断条件，成立才把下面的指令作为用户消息发出。
- **[dsh-utf8-output](https://github.com/TLEWA/dsh-utf8-output)** —— 修复 Windows 下 DSH 子进程 GBK/CP936/CP932 输出乱码。
- **[dsh-opencode-go-router](https://github.com/TLEWA/dsh-opencode-go-router)** —— 上下文折叠或系统提示被重写后轮换 OpenCode Go 路由，少丢一点提示缓存。
- **[dsh-fastload](https://github.com/TLEWA/dsh-fastload)** —— 长会话首屏历史瘦身：缩小首次打开时的历史页，同时保留用户实际看到的尾部内容。
- **[dsh-ptc-noargs](https://github.com/TLEWA/dsh-ptc-noargs)** —— 修复 PTC `run_code` 中无参工具调用被拒绝的问题：把省略或 `undefined` 的首参归一化为 `{}`。

## 许可与声明

- 代码：[MIT](LICENSE)。
- 更新日志：[CHANGELOG.md](CHANGELOG.md)。
- 第三方代码引用与许可证全文：[NOTICE.md](NOTICE.md) · [English](NOTICE.en.md)。
- AI 使用与代码来源声明：[AI_USAGE.md](AI_USAGE.md) · [English](AI_USAGE.en.md)。

本项目允许用于商业与非商业场景，但按 MIT 条款**不提供任何担保**；AI 辅助生成的
代码请在采用前自行审查。

## Codex PR 审阅

本仓采用[中心 CI](https://github.com/TLEWA/dsh-plugin-ci)的 v1 公共审阅规则，实际规则保存在 AGENTS.md。云端 Codex 审阅 PR 及新提交，维护者最终批准并合并；审阅结论必须对应最新提交。审阅消耗订阅用量，漏触发时可用 `@codex review` 补审。
