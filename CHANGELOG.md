# Changelog

## [Unreleased]

- **文件「打开方式」不再等待系统关联枚举。** Windows 首次枚举要启动 PowerShell、编译 C# 并调用 Shell COM，可能超过十秒；现在首次右键立即给「用默认程序打开」「在文件夹中显示」两条兜底，关联查询转到后台，结果到达后宿主原地重解析并换成程序列表。关联按扩展名缓存 5 分钟、超过 60 秒后台刷新，同一扩展名只发一次请求，晚到的答案不会被超时丢掉。
- **修正 Host Remote 返回值形状处理。** Client Remote 把结果包成 `{ ok: true, value }`，旧实现只认其中一种形状，正常的关联数组会被当成失败并写入负缓存；现在同时兼容 `{ ok: true, value }`、裸数组、裸 boolean 和 `{ opened: true }`，打开与「在文件夹中显示」的成功判定也同步修正。
- **「打开方式」读不到系统文件关联时，不再在兜底动作下重复解释原因。** 枚举失败时仍保留「用默认程序打开」和「在文件夹中显示」两条可用动作，但去掉它们下面的小字说明，菜单更干净；原生正文菜单与旧自绘菜单同步。

## 1.13.1 — 2026-11-14

- **0.2.2-rc.2 起二级菜单不再出现两个「>」箭头。** 宿主从这个版本开始自己给子菜单项画右箭头，本插件为旧宿主补的箭头仍会再画一个，「打开方式」「新会话默认权限」因此并排两个箭头。现在插件的兜底箭头只在宿主不画时出现：宿主条目自带箭头时把插件箭头隐藏；0.2.2-rc.1 及更早没有宿主箭头，仍由插件补。
- **0.2.2-rc.2 起会话右键菜单改由宿主的菜单贡献渲染，原生「在应用中打开」不再与「打开方式」重复。** 会话条目迁到宿主 `contextMenus`（保留置顶应用、删除等全部行为），面板里带插件标记时隐藏宿主自带的「在应用中打开」；行尾「…」菜单不受影响。0.2.2-rc.1 及更早继续走原来的 slot 注入，版本读不到时也按旧宿主处理，避免菜单整组消失。
- **会话正文右键也改用宿主原生菜单，不再和侧栏各画一套。** 0.2.2-rc.2 起在正文空白处右键会注册 `target:'conversation'` 的 `contextMenus` 贡献，由宿主渲染菜单壳；工具条按钮、打开方式（含文件卡片的多文件路径）、更多操作、状态组件开关和 `dsh-sidebar-organizer` 排序保持原有行为，原生壳沿用宿主的文字行、分隔线和键盘操作。0.2.2-rc.1 及更早继续使用插件自绘菜单。
- **正文原生菜单恢复工具条图标，并补回整组「打开方式」。** 工具条按钮里的 SVG 通过宿主的 `contextMenu.icon` keyed slot 原样渲染，不再只剩文字；会话头没有「打开方式」分体按钮时，只要会话有目录或指针下有文件，插件仍会补出置顶应用和「打开方式 ›」子菜单。文件卡片、交付文件、消息附件和 @ 文件引用继续按指针下的文件列程序，多文件时保留「N 个文件」提示；rc.1 及更早的自绘菜单不变。
- **「打开方式」被放到行尾「…」菜单时，不再误伤原生「在应用中打开」。** 原生去重标记现在只在会话行右键（`context` 手势）时添加；「…」或「两边」手势下的「打开方式」不带标记，宿主自带的「在应用中打开」保持可见。

## 1.13.0 — 2026-11-11

- **读不到系统文件关联时，「打开方式」不再是一条死胡同。** 宿主用 PowerShell 枚举系统为该文件登记的程序，只要有一个损坏的 Shell 关联让 `GetName` 抛异常，整次枚举就失败，子菜单此前只显示「宿主没有提供桌面打开能力」。现在改用「用默认程序打开」和「在文件夹中显示」两条兜底动作（分别是不带 `application` 的 `openWorkspacePath` 与 `action: 'reveal'`），并注明失败原因。

- **正文右键「打开方式」打开指针下的文件，而不是会话工作区。** 之前在本轮变更文件卡片、交付文件卡片、消息附件或 @ 文件引用上右键，置顶应用与「打开方式」二级菜单一律打开会话目录；现在按指针下的文件路径逐个打开（卡片点行只开该行，点空白开整卡），多文件时菜单顶部标出「N 个文件」，只有解析不出绝对路径时才退回会话目录。
- **文件目标不再走只接受目录的 `open-in-app/open` 路由（修复「打开失败：宿主没有找到对应程序」）。** 文件模式改用客户端 Remote 的 `session.workspacePathApplications` 列出系统为该文件登记的程序、`session.openWorkspacePath` 打开；宿主该路由在 wire 边界校验 `isDirectory()`，传文件必然 404。置顶项只在系统关联里也有同 id 时才平铺，二级菜单显示系统给的程序名与图标。
- **无法确认会话是否还在运行时，删除会保留日志并报失败。** 之前 `agents` 服务不可用会被当成「已停止」，运行中的会话可能在删除后继续写回目录；现在无法确认时按「仍在运行」处理，只有确实没有运行时句柄的冷会话才照常删除。
- **「在 VS Code 中打开」默认不再经过 `cmd.exe`。** 找到 `code.cmd` 时会优先用同装的 `Code.exe` 直接启动，避免路径里的 `%` 被 cmd 当环境变量展开；只有 `DSH_SCM_VSCODE` 显式指向 `.cmd` 时才保留 cmd 路径。
- **跨仓索引更正 `dsh-utf8-output` 的能力描述：** `GBK/CP936/CP932` → `GBK/CP936/GB18030`，与它实际只解码 UTF-8 与 GB18030 一致。

## 1.12.0 — 2026-11-11

- 接入 Codex PR 公共审阅规则与本仓重点，保留现有 CI、人工批准和发布行为。

### 中文摘要

- **全新的 DSH_HOME 第一次保存「新会话默认权限」不再报 ENOENT。** 之前写锁文件时父目录还不存在，第一次写入必失败；现在先建目录再拿锁。
- **删除工作区不再静默漏删 500 个以上的会话。** 之前批量删除只处理前 500 个会话，却仍返回成功并摘掉工作区登记，剩下的会话日志永远没人清理；现在按同一流程处理完全部会话，失败就保留工作区。
- **已归档会话超过 500 个时「删除所有已归档会话」不再整批失败。** 宿主单次最多接收 500 个 id，客户端现在按 500 一批串行提交并合并结果；之前一次 POST 全部 id 会被宿主 400 拒绝，入口等于不可用。
- **运行中的会话等不到停止时不再强删。** 之前最多等 3 秒就照常 `rm`，Windows 上容易撞上 EBUSY 并留下删不掉的目录；现在仍在上报失败并保留日志，让用户稍后重试。
- **「在 VS Code 中打开」启动失败不再假装成功。** 之前 `spawn` 的异步 `error` 被吞掉、`DSH_SCM_VSCODE` 也不校验，坏启动器仍返回 200，用户点击后没有任何反应；现在覆盖路径不存在直接返回 `vscode-launcher-missing`，异步启动失败返回 `spawn-failed`，解析失败的结果也不再永久缓存。
- **单独把「归档会话开关」放进工作区「…」菜单后，0.2.1 上入口不再消失。** 工作区省略号的接管判断漏掉了这个条目，单独启用时原生菜单照旧弹出；现在它和其它工作区条目一样会接管。
- **会话列表读不到时不再把冷会话当成「已删除」。** 之前 `listSessions` 抛错会被吞掉，日志还在盘上的会话被记为 missing 并返回成功，归档 / 置顶记录也被清掉；现在按失败上报并保留日志。

### Changed

- **The first permission-default write no longer fails on a fresh `DSH_HOME`.** The lock file was opened before its parent directory existed, so the very first save threw ENOENT; the directory is now created before the lock is taken.

## 1.11.2 — 2026-11-08

### 中文摘要

- **代码框 / 工具调用卡片上右键不再没反应。** 之前整张工具卡片被当成「不归空白右键菜单管」的区域，
  右键直接落到浏览器原生菜单；现在卡片标题（即使是 role=button 的代码框标题）和展开后的正文
  都会弹出插件菜单，只有卡片里的链接与输入控件继续让位给原生菜单。

### Changed

- **Right-click on code blocks and tool-call cards works again.** The whole tool card used to be
  treated as "not ours" by the blank-space right-click handler, so the native browser menu showed
  instead of the plugin menu. Card headers (even when they are `role=button`) and expanded bodies
  now open the plugin menu; links and form controls inside cards still fall back to the native menu.

## 1.11.1 — 2026-11-08

### 中文摘要

- **修好与新版 dsh-sidebar-organizer 的联动：被它收进「更多操作」的头部按钮，现在也出现在
  本插件自绘的「更多操作」二级菜单里。** 新版 organizer 的收纳行是直接插进宿主弹层的 DOM，
  不在宿主 Menu 的 `items` 里，所以之前只读 `items` 的子菜单会少掉这些行（例如
  「IP 防护」）。现在按 organizer 记在 `dsh.sidebar-organizer.layout.v1` 的收纳顺序补行，
  排在宿主条目之前（与它在原生弹层里的位置一致），点击时再点一次被收起来的原按钮。

### Changed

- **Restored the dsh-sidebar-organizer link: header buttons it tucks into the native
  "More actions" popup now show up in this plugin's own "More actions" submenu.** The
  organizer injects those rows straight into the host popup's DOM, so they never appear
  in the host Menu's `items` and a submenu built from `items` alone (e.g. "IP guard")
  lost them. They are now re-derived from the marked header buttons, ordered by
  `dsh.sidebar-organizer.layout.v1`, placed before the host items (matching their position
  in the native popup), and clicking one clicks the tucked original button.

## 1.11.0 — 2026-11-06

### 中文摘要

- **切换「新会话默认权限」失败时不再假装成功。** 网络或宿主出错时，菜单会回滚到原来
  的勾选项并弹出失败提示；之前乐观更新会留在界面上、实际没写盘，也没有任何反馈。
  同时修掉了「读设置」晚于「写设置」返回时用旧值覆盖新值的竞态。
- **一次网络抖动不再让「打开方式 / 置顶应用」条目消失。** 应用列表加载失败时保留上次
  成功的结果，而不是清空（旧行为会空白 10 秒）。
- **批量删除会话更快、计数更准。** 一次批量（含删除工作区）只解析一次会话索引，不再
  每个会话扫一遍全部会话（O(N²)），并改为 4 路并发执行；若目标会话已全部不存在，
  提示改为「会话已不存在，无需删除」，不再报「已删除 0 个」。
- **Windows 上从 `.cmd` / `.bat` 启动编辑器时路径不再被拆词。** 含空格或 `& ^ ( )` 的
  目录不会再传错，也堵掉了命令注入面。
- **权限设置文件更安全。** 写入加文件锁（避免并发读-改-写丢更新），读到损坏的 JSON 时
  报错而不是整表覆盖；从工作区子目录启动的会话也能命中该工作区的默认权限。
- **内部重构：客户端拆模块 + 打包。** `lib/client.js` 改为由 `src/client/**` 经 esbuild
  打包的产物，9 套重复的 localStorage store、5 处子菜单关闭逻辑、菜单挂载外壳都收敛
  成共用实现；仓库约定见 `AGENTS.md`。行为与 UI 不变。

### Changed

- **A failed "default permission for new sessions" change no longer pretends to
  succeed.** On a network or host error the menu rolls back to the previous checkmark
  and shows a failure toast; the optimistic update used to stay on screen even though
  nothing was persisted, with no feedback at all. A read that resolves after a write
  can no longer overwrite the newer value either.
- **One network hiccup no longer empties the "Open with / pinned apps" entries.** The
  app list keeps its last successful result on failure instead of clearing for 10
  seconds.
- **Batch session deletion is faster and counts correctly.** A batch (including
  deleting a whole workspace) resolves the session index once instead of listing every
  session per id (O(N²)) and runs with 4-way concurrency; when all targets were already
  gone the toast says "the sessions were already gone" instead of "deleted 0".
- **Windows `.cmd` / `.bat` editor launchers no longer split paths.** Directories with
  spaces or `& ^ ( )` are quoted correctly, closing the command-injection surface.
- **Safer permission store.** Writes take a file lock (no lost updates on concurrent
  read-modify-write) and a corrupt JSON file now fails loudly instead of being
  overwritten; sessions started from a workspace subdirectory resolve that workspace's
  default permission too.
- **Internal refactor: the client is now split into modules and bundled.**
  `lib/client.js` is a build artifact of `src/client/**` via esbuild; nine duplicated
  localStorage stores, five copies of submenu dismissal and the menu-mount shell now
  share one implementation. Conventions live in `AGENTS.md`; behaviour and UI are
  unchanged.

## 1.10.0 — 2026-11-06

### 中文摘要

- **工作区可以单独设置新会话的默认权限。** 工作区右键菜单新增「新会话默认权限」二级
  菜单，列出宿主原生的权限预设（仅可查看 / 工作区内修改 / 完全权限），当前生效的一项
  右侧打勾；选择后只影响该工作区之后新建的会话，已有会话不动。「跟随全局默认」清除
  本工作区的设置。设置存在 `$DSH_HOME/storages/dsh-sidebar-row-menu/permission-defaults.json`，
  由宿主插件在会话创建时通过 `permissionPresets` 原生接口落成会话事件，不靠客户端改默认值。
- **菜单条目可以只放进「…」菜单。** 设置 →「行菜单」→「菜单显示位置」把原来
  「同时放进「…」菜单」的开关改成三态：右键菜单 / 「…」菜单 / 两边，每个条目至少保留
  一边；旧配置自动迁移（开 → 两边，关 → 右键菜单）。

### Changed

- **A workspace can now set the default permission for its new sessions.** The
  workspace context menu gains a "Default permission for new sessions" submenu listing
  the host's native presets (read-only / workspace-write / danger-full-access) with the
  effective one checked. The choice applies only to sessions created afterwards in
  that workspace and never touches existing sessions; "Follow global default" clears
  it. The mapping is stored in
  `$DSH_HOME/storages/dsh-sidebar-row-menu/permission-defaults.json`, and the host
  plugin applies it through the native `permissionPresets` service when a session is
  created, so it is recorded as a normal permission event rather than by mutating the
  client default.
- **Entries can live only in the "…" menu.** Settings → "Row menu" → "Menu placement"
  replaces the old "Also show in the '…' menu" switches with a tri-state choice per
  entry (right-click / "…" / both), always keeping at least one side; existing
  settings migrate automatically (on → both, off → right-click).

## 1.9.3 — 2026-11-06

### 中文摘要

- **二级菜单贴着屏幕右边缘时不再飞出去。** 之前子菜单按估算宽度（220）算位置，
  贴右边缘向左翻转时会和菜单之间空出一大截、还竖直跑到触发行上方。现在子菜单
  先测真实尺寸再定位：翻转后横向留 6px 间距、纵向和触发行齐平，箭头方向跟着翻转；
  底边 / 顶边超出屏幕时会被夹回视口内。主菜单定位也改成量真实宽高（原来是按入场
  动画中途的偏小尺寸夹取，贴右边缘会溢出几个像素），窗口 resize 或菜单行数变化会
  重新定位。

### Changed

- **Submenus no longer fly off when opened against the right screen edge.** The
  previous code estimated the submenu width (220px), so a left-flip near the edge left
  a large gap from the menu and landed above the trigger row. The submenu is now
  measured and then positioned: 6px horizontal gap when flipped, vertically aligned
  with the trigger row, and its chevron mirrors to match. Panels are clamped back into
  the viewport at the top and bottom edges. Menu surfaces also measure their real size
  (the old code measured mid-animation, which let them overflow by a few pixels at the
  right edge), and reposition on window resize or row-count changes.

## 1.9.2 — 2026-11-06

### 中文摘要

- **会话栏左上角的状态组件整体不进正文右键菜单。** 1.9.1 只隐藏了「本会话费用明细」，
  但 DSH 内置的后台任务计数（有任务运行时才出现）同样挂在会话栏左上角，现在按槽位
  统一处理：`conversation.session.header.actions` 里的组件一律视为状态入口，默认隐藏，
  不逐个认标签。设置 →「行菜单」的开关改名为「显示左上角状态组件」，打开后费用明细、
  后台任务计数等一起恢复；存储字段不变，旧配置照常生效。

### Changed

- **Status widgets in the top-left corner of the session header are excluded from
  the conversation-body menu as a group.** 1.9.1 only hid "Session cost", but DSH's
  built-in background-job counter (shown while jobs run) lives in the same corner.
  The rule is positional: everything injected into
  `conversation.session.header.actions` counts as a status widget and is hidden by
  default, with no per-label matching. The Settings → row menu switch is renamed to
  "Show top-left status widgets"; turning it on restores cost details, job counters
  and anything else added to that slot. The stored field is unchanged, so existing
  settings keep working.

## 1.9.1 — 2026-11-06

### 中文摘要

- **「本会话费用明细」默认不再出现在会话正文右键菜单里。** 这类费用 / 用量统计入口
  只有文字、点开是统计面板，和工具条按钮不同类，所以默认不列出。设置 →「行菜单」
  新增「显示费用明细」开关（默认关闭），需要时打开即可恢复；旧配置里没有这个字段时
  也按默认关闭处理，不用清缓存。

### Changed

- **Session cost entries are no longer listed in the conversation-body menu by
  default.** Cost / usage stats entries such as "Session cost" are text-only and open
  a stats panel, so they are now treated differently from toolbar buttons and stay
  hidden. A new "Show cost details" switch under Settings → row menu (off by default)
  brings them back; existing saved settings without the new field also default to
  hidden.

## 1.9.0 — 2026-11-06

### 中文摘要

- **新增「会话正文右键菜单」**：在会话正文里（空白处、思考过程、回复和工具摘要，输入框、
  工具条和工具卡片本身以外）右键，会按顶部工具条的**视觉顺序**从左到右列出那排按钮，
  每项带原按钮的图标；「更多操作」一类的溢出入口默认固定在最后一项。装了
  `dsh-sidebar-organizer` 且调整过「会话头部工具条」时，顺序跟随它的配置；没装时就是
  DSH 的默认顺序。organizer 用 CSS `order` 排序，DOM 顺序不代表屏幕顺序，所以菜单按
  `getBoundingClientRect()` 现算。点普通条目等于点原按钮：先关菜单再派发 `click`，
  宿主弹层仍锚在原按钮上；「更多操作」则不再打开右上角的「…」，而是像「打开方式」
  一样在本菜单里展开二级菜单，直接复刻宿主菜单的条目并执行，行序同样跟随
  `dsh-sidebar-organizer`（它在「…」弹层里拖动后保存的 host-menu-order）。有选中
  文字时让位给浏览器的选区菜单，消息里的输入控件和链接也保留原生菜单；工具卡片、
  输入框、工具条本身和侧栏行同样保留各自的原生右键菜单；找不到可用按钮时不接管
  原生菜单。设置 →「行菜单」
  里可以关闭整个菜单，或取消「更多」固定最后。
- **空白菜单里的「打开方式」按工作区 / 会话右键的方式收纳**：置顶应用显示为一级行，
  其余应用收进「打开方式」二级菜单（悬浮或点击展开），设置里的总开关、逐应用开关和
  置顶全部生效；同时菜单的分组之间自动加淡色分隔线，行高、内边距、圆角、字号和图标
  尺寸都与 DSH 原生右键菜单对齐。

### Added

- **Right-click menu in the conversation body.** Right-clicking in the conversation
  body — blank space, thinking blocks, replies and tool summaries, but not the
  composer, the header toolbar or tool cards themselves — now opens a vertical menu
  that lists that toolbar in visual left-to-right order, each row reusing the
  original button's icon; a "More actions" style overflow trigger is pinned to the
  last row by default. With `dsh-sidebar-organizer` installed and a customised
  "session header toolbar" layout the order follows the organizer; otherwise it is
  DSH's default order. The organizer reorders with CSS `order`, so DOM order is not
  screen order — the menu sorts by `getBoundingClientRect()` at right-click time.
  Selecting an ordinary row closes the menu and dispatches a real `click` to the
  original header button, so host popovers stay anchored to their trigger.
  "More actions" no longer opens the header "…" popover: it expands in place like
  the other submenus, mirrors the host menu's entries and runs the selected one;
  its row order follows `dsh-sidebar-organizer`'s saved host-menu order as well.
  A text selection wins and receives the browser's selection menu; inputs and links
  inside messages also keep their native menu, as do tool cards, the composer, the
  toolbar itself and sidebar rows. No usable button means the native menu is left
  alone. The menu and the pin-More-last behaviour can both be switched off under
  Settings → row menu.
- **"Open with" inside the blank-space menu is collapsed like the workspace and
  session menus.** Pinned apps render as top-level rows and the remaining apps move
  into an "Open with" submenu that expands on hover or click; the master switch,
  per-app switches and pinning all apply. Sections are now separated by faint rules
  automatically, and row height, padding, radius, type size and icon size match
  DSH's native context menus.

## 1.8.0 — 2026-11-05

### 中文摘要

- **DSH 0.2.2 起，设置页改用本插件自己的导航图标。** 设置分区现在通过宿主的
  `settings.section.icon` slot 注册导航图标，不再退回默认的齿轮。图标造型是「三行
  条目 + 行尾子菜单箭头」，沿用宿主自绘图标的规范：16px 网格、1.5 描边、圆头，
  颜色取 `currentColor`，选中与未选中状态自动跟随。0.2.1 及更早的宿主没有这个
  slot，注册会被跳过，设置页照常注册并保留宿主自己的图标。

### Added

- **Custom settings icon on DSH 0.2.2 and later.** The settings section now
  registers a navigation icon through the host's `settings.section.icon` slot
  instead of falling back to the default gear: three rows with a trailing
  submenu chevron, drawn on the host's 16px grid with a 1.5px rounded stroke and
  `currentColor`, so it follows the selected/unselected state on its own. On
  hosts without the slot (0.2.1 and below) the registration is skipped and the
  settings section keeps working with the host's own glyph.

## 1.7.0 — 2026-11-05

### 中文摘要

- **工作区菜单可以按工作区显示 / 隐藏已归档会话**：某个工作区的分组里存在已归档
  会话时，它的右键菜单（以及开启后的行尾「…」菜单）会出现「显示已归档会话」/
  「隐藏已归档会话」，沿用原生「查看」选项里的归档图标。DSH 只提供一套全局归档
  过滤，插件把它切到「全部会话」，并隐藏其他工作区（含「未分组」）的已归档行，
  这样每个工作区都能独立展开自己的归档；选择跨刷新保留，宿主全局过滤一旦被改动
  就清掉该状态，让原生的全局选择保持权威。该条目可在 设置 → 行菜单 里关掉，且只在
  工作区确实有已归档会话时出现。

### Added

- **Per-workspace archived-session toggle in the workspace menu.** A workspace
  whose group holds archived sessions now gets "Show archived sessions" /
  "Hide archived sessions" in its right-click menu (and in the row's "…" menu
  when opted in), using the same archive glyphs as the native View options
  items. DSH only offers one global archived filter; the plugin switches it to
  "all conversations" and hides every other workspace's (and "Ungrouped")
  archived rows, so each workspace can reveal its own archived sessions
  independently. The choice persists across reloads, and changing the native filter clears it so the
  host's global choice stays authoritative. The entry can be switched off under
  Settings → row menu and is only shown when the workspace actually has
  archived sessions.

## 1.6.0 — 2026-11-05

### 中文摘要

- **0.2.2 上工作区条目默认只出现在右键菜单**：工作区 provider 解析时检查同一枚
  右键手势标记，行尾「…」的 `pointerdown` 会先清标，所以「…」菜单保持原生内容。
- **工作区行可以在设置里「同时放进「…」菜单」**：逐项开启后 provider 跳过手势判断，
  对应条目也会进入宿主的「…」菜单；0.2.2 上这组开关不再隐藏，说明文字改成描述
  共用菜单 + 手势区分的真实行为。0.2.1 仍由插件接管「…」按钮自绘。
- **0.2.2 的「打开方式」恢复图标**：数据贡献的条目本身没有图标，现在注册
  `contextMenu.icon`（`sidebar-row-menu.open-with`）并由动作引用，与 0.2.1 自绘
  菜单一致。
- **125%–150% 缩放下菜单分隔线可见**：宿主用的是 0.5px 细线，在分数像素比下会被
  摊成约 0.4px 而像「消失」；现在该区间内分隔线（含 0.2.1 的 `.dsrm-sep`）补到
  1px，1x 与 2x 显示不变。
- **工作区菜单改用会话菜单的分组规则**：原来「打开方式」组夹在复制路径之前，分隔线
  落点与会话菜单不一致；现在顺序为行内动作 → 复制路径/在文件夹显示 → 打开方式组 →
  删除，两份菜单都分成同样三块。
- **「打开方式」恢复子菜单箭头**：宿主不给子菜单父项画箭头，但 label 是当元素渲染的，
  所以工作区条目改成「文字 + 右对齐箭头」的 label，与会话菜单的箭头位置一致（不再是
  贴在文字后面的「›」）；0.2.1 自绘菜单仍用自己的箭头图标。

### Added

- **Workspace entries can opt into the native "…" menu on DSH 0.2.2.** The
  workspace-row entries (New session, pinned app, Open with, Copy workspace path,
  Open in new tab, Delete workspace and all sessions) are now right-click only by
  default, matching the session rows: a provider answers only while a right-click
  gesture is active. Enabling the matching switch under Settings → "Also show in the
  "…" menu → workspace" makes it skip that check, so the entry also lands in the
  host's "…" menu.

### Fixed

- **"Open with" keeps its icon on DSH 0.2.2.** The entry is contributed to the
  host menu as data, so it had no icon of its own; it now registers an
  `contextMenu.icon` slot (`sidebar-row-menu.open-with`) and points the action at
  it, matching the self-drawn 0.2.1 menu.
- **Menu separators stay visible at 125–150% display scaling.** The host draws
  0.5px hairlines; at fractional device pixel ratios one of them was painted as a
  ~0.4px smear and read as missing. A `min-resolution: 1.2dppx` media query now
  thickens menu separators (and the 0.2.1 `.dsrm-sep`) to 1px in that range, and
  leaves 1x and 2x displays untouched.
- **The workspace menu follows the session menu's grouping.** On 0.2.2 the entries
  were interleaved as right-click group → pinned/open-with → copy path, so the
  separator before "Open with" landed in a different place than in the session
  menu. The workspace providers now use the session order — row actions, then
  Copy path/Reveal, then the open-with group, then Delete — so both menus split
  into the same three blocks.
- **"Open with" shows its submenu affordance again.** Host menu items draw no
  caret for submenu parents. The action's label is rendered by the host as an
  element, so the workspace entry now passes a label that lays the text out with
  a right-aligned chevron, matching the session menu's arrow instead of a "›"
  glued to the text (the 0.2.1 self-drawn menu keeps its own arrow icon).

### Changed

- **The workspace-row switches are no longer hidden on 0.2.2.** The section note now
  explains that 0.2.2 shares one host menu between right-click and the `…` button
  while the plugin's entries still follow the gesture, and that the switches opt
  individual entries into that shared menu. This reverses the 1.5.0 decision to hide
  the group.

## 1.5.1 — 2026-11-05

### 中文摘要

- **修复 0.2.2 上会话行右键菜单「有时没有插件条目」**：条目原来用 `contextmenu`
  之后 400 ms 的时间窗口判断，而 0.2.2 的菜单是异步挂载的，替换已有菜单时还会
  先卸载旧面板再挂新面板，这次卸载会把窗口清掉，于是下一次菜单可能不带插件条目。
  改为「右键手势标记」：只有菜单面板真正挂载后才收尾，右键稳定带条目，行尾「…」
  打开的菜单仍然保持原生内容。
  0.2.2 上也不再拦截 `contextmenu` 后转成「…」点击：行本身已带宿主触发器，直接
  由宿主把菜单开在指针处（不改锚点、不补发点击）。
- **文档与市场文案改为描述 0.2.2 的真实行为**：README（中英）、npm 描述与市场条目
  不再写成「插件自绘侧栏菜单」，而是说明 0.2.2 由宿主渲染菜单、插件按 `order` 贡献
  条目（工作区项混排、会话行扩展宿主开在指针处的菜单），0.2.1 上保留自绘工作区菜单。

### Fixed

- **Session-row right-click entries appear every time on DSH 0.2.2.** The entries
  (pinned app, Open with, permanent delete, delete archived) used to be gated by a
  400 ms time window measured from the `contextmenu` event. 0.2.2 mounts the menu
  asynchronously and, when a menu is already open, tears the previous panel down
  before mounting the new one — that teardown reset the window, so the next menu
  could come up without the plugin entries. The gate is now a gesture mark that is
  cleared only once the menu panel has actually mounted, so right-click keeps its
  entries while the row's `…` button still opens the untouched native menu.
  On 0.2.2 the plugin also stops intercepting `contextmenu` and forwarding it as an
  ellipsis click: the row already carries the host trigger, so the host opens its
  own menu at the pointer (no anchor rewriting, no synthetic click).

### Changed

- **Docs and registry metadata describe the 0.2.2 behavior.** README (both languages),
  the npm description and the marketplace entry no longer present the plugin as a
  self-drawn sidebar menu. They now state that DSH 0.2.2 renders the menus and the
  plugin contributes entries (workspace items interleaved by `order`, session rows
  extended in the host menu opened at the pointer), and that 0.2.1 keeps the
  self-drawn workspace menu.

## 1.5.0 — 2026-11-05

### 中文摘要

- **支持 DSH 0.2.2 的原生右键菜单**：宿主提供 `ctx.contextMenus` 时，工作区行条目改为
  数据贡献注册，按 order 与原生项交错排列（新会话 90、置顶应用 150、打开方式 180、
  复制工作区路径 250、在新标签打开 260、删除工作区及所有会话 310；原生为重命名 100、
  在文件夹显示 200、删除工作区 300）。右键与行尾「…」共用宿主同一份菜单。0.2.1 上仍
  走自绘工作区菜单；会话行条目继续通过 `sidebar.workspaces.session.menu.item` 扩展点渲染。
- 修复未命名会话「永久删除」确认框显示空标题的问题，回退为「未命名会话」。
- 0.2.2 的设置页隐藏工作区行「同时放进「…」菜单」开关（该版本右键与「…」共用同一份
  菜单，开关无从生效）；会话行的同类开关保留且仍然有效。

### Added

- **DSH 0.2.2 native context menus**: on hosts that expose `ctx.contextMenus`, the
  workspace-row entries are registered as data contributions instead of a self-drawn
  menu. Entries keep their positions relative to the host items —
  New session 90, pinned app 150, Open with 180, Copy workspace path 250,
  Open in new tab 260, Delete workspace and all sessions 310 — so they interleave
  with the native Rename (100), Reveal (200) and Delete workspace (300). Right-click
  and the row's `…` button open the same menu, because the host now shares one menu
  between them. On 0.2.1 the plugin still draws its own workspace menu. Session-row
  entries keep using the `sidebar.workspaces.session.menu.item` extension point.

### Fixed

- The permanent-delete confirmation falls back to “Untitled session” instead of
  showing an empty `会话「」` for sessions whose title has not been generated yet.
- On 0.2.2 the settings page now hides the workspace-row “Also show in the … menu”
  switches: the host shares one native menu between right-click and the `…` button,
  so those per-entry toggles could never take effect there. The session-row switches
  still work and stay visible.

## 1.4.3 — 2026-11-04

### 中文摘要

- 在 `package.json` 中声明 `engines.dsh: ">=0.2.1-rc.5 <0.3.0-0"`：范围外的 DSH 会拒绝
  安装/激活，插件市场会显示支持版本，不再当作“未声明”。运行代码无改动。

### Changed

- **Declared the supported DSH range**: `package.json` now carries
  `engines.dsh: ">=0.2.1-rc.5 <0.3.0-0"`. DSH refuses to install or activate the
  plugin on a host outside that range, and the plugin market lists the range on the
  card instead of treating the plugin as undeclared. No runtime code changed.

## 1.4.2 — 2026-11-03

### 中文摘要

- 工作区右键新增「删除工作区及所有会话」：先逐个永久删除会话日志，全部成功后再删除
  工作区登记；任一会话失败则保留工作区便于重试。内置「删除工作区」行为不变（会话归入
  「未分组」）。新增宿主路由 `POST /dsh-sidebar-row-menu/workspace/delete`。
- 设置 →「行菜单」新增「同时放进「…」菜单」：可逐项把插件右键条目加进行尾「…」菜单。
  会话条目走原生 slot；工作区开启任意一项后由插件接管「…」按钮，保留官方「重命名 /
  删除工作区」。全部默认关闭，未开启时「…」菜单与 DSH 原样一致。

### Added

- **Delete workspace and all sessions**: a new workspace row entry removes every
  session transcript under the workspace first, then drops the workspace
  registration. The built-in "Delete workspace" is unchanged and still keeps
  sessions under "Ungrouped". If any session fails to delete, the workspace is kept
  so the user can retry. Backed by a new `POST /dsh-sidebar-row-menu/workspace/delete`
  route.
- **Also show in the "…" menu**: every plugin right-click entry can now be added
  individually to the row's native "…" menu (Settings → "Row menu" → "Also show in
  the "…" menu"). Session entries mount through the existing session slot;
  workspace entries make the plugin render the "…" menu with the official
  Rename / Delete workspace items plus the enabled entries. All switches are off by
  default, so the native menu is untouched until opted in.

## 1.4.1 — 2026-11-03

### 中文摘要

- 设置 →「行菜单」新增「允许删除未归档会话」开关（默认关闭）。开启后，未归档会话的
  右键菜单也会出现「永久删除会话」，确认后按原有宿主路由删除日志；关闭时维持仅已归档
  会话可见。

### Added

- **Allow deleting unarchived sessions** (off by default): a new switch in
  Settings → "Row menu" extends the existing "Delete session permanently" entry to
  unarchived session rows. The confirmation dialog, host route and transcript
  cleanup are unchanged; without the switch the entry stays archived-only.

## 1.4.0 — 2026-11-03

### 中文摘要

- 工作区 / 会话右键菜单新增「打开方式」二级菜单（复用 DSH 内置 `open-in-app` 应用列表），
  常用应用可置顶到一级菜单，默认自动置顶第一个编辑器。
- 已归档会话新增「永久删除会话」和「删除所有已归档会话」，由本插件宿主路由完成，
  不级联删除 fork 子会话，无回收站。
- 设置 →「行菜单」新增各项开关、应用逐个显隐与置顶。
- 与 `dsh-session-menu` 共存时自动隐藏重复条目，并在设置里说明冲突。
- 工作区菜单改为 `MenuSurface` + `MenuItemButton` 自绘以支持子菜单，恢复分组分隔线。

### Added

- **Open with** submenu on both workspace and session row menus. The app list comes
  from DSH's built-in `open-in-app` endpoints (`/open-in-app/apps`,
  `/open-in-app/open`, `/open-in-app/icon/<id>`), so it matches the apps DSH itself
  offers. Hovering the row expands the submenu.
- **Pinned open-with apps**: a pinned app is shown directly at the top level (for
  example "Open with Visual Studio Code"). Until configured, the first detected
  editor is pinned automatically, otherwise the first catalog app. Pinning and
  per-app visibility live in the plugin settings.
- **Delete session**: permanently deletes one archived session and its transcript.
  The entry only appears on archived sessions.
- **Delete all archived sessions**: permanently deletes every archived session and
  its transcript, again only from an archived row.
- **Settings section** ("Row menu") with switches for open with, delete session and
  delete archived sessions, plus per-app visibility and pinning. Settings are stored
  in `localStorage` and apply immediately.
- **Host route** `POST /dsh-sidebar-row-menu/session/delete` with the same loopback
  fence as the open route; it stops a running session, detaches it, removes the
  transcript directory after verifying its name, then clears archive/pin state and
  emits `api-session/removed`.
- **Coexistence detection** with `dsh-session-menu`: when it is installed and owns a
  matching entry (`session-menu-open-with`, `session-menu-delete`,
  `session-menu-delete-archived`), the duplicate entry from this plugin is hidden and
  the settings row explains the conflict.

### Changed

- The workspace row menu is now drawn with `MenuSurface` + `MenuItemButton`, sharing
  the same open-with submenu, app catalog and pinning as the session menu. The old
  flat "Open in VS Code" / "Open in Explorer" items were replaced.
- Session row entries are now "pinned app" + "Open with" + archived-session deletion
  instead of the flat VS Code / Explorer items.
- Group separators are back in both menus.
- Custom submenu panels use `role="group"` so meow-memory's `[role="menu"]` injection
  does not add a fake "memory participation" row inside them.

### Notes

- Permanent deletion is irreversible. It only applies to archived sessions, does not
  cascade to forked child sessions, and there is no recycle bin.
- The open-with feature needs DSH with the built-in `open-in-app` routes; on hosts
  without them the submenu shows an "apps unavailable" hint.

## 1.3.5

- 1.3.5 发布，详见 GitHub Release 说明。
- Release 1.3.5. See the GitHub release notes for details.

## 1.3.4

- 复制反馈改用宿主自带的 Toast，并删除与内置重复的会话链接条目。
- Use the official toast for copy feedback and remove the redundant session-link item.

## 1.3.3

- 预热行操作指针，让菜单扩展在第一帧就渲染出来。
- Prime the row action pointer so menu extensions render in the first frame.
