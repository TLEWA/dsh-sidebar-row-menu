# Changelog

## 1.8.0 — 2026-11-05

### 新增

- **DSH 0.2.2 起，设置页改用本插件自己的导航图标。** 设置分区现在通过宿主的
  `settings.section.icon` slot 注册导航图标，不再退回默认的齿轮。图标造型是「三行
  条目 + 行尾子菜单箭头」，沿用宿主自绘图标的规范：16px 网格、1.5 描边、圆头，
  颜色取 `currentColor`，选中与未选中状态自动跟随。0.2.1 及更早的宿主没有这个
  slot，注册会被跳过，设置页照常注册并保留宿主自己的图标。

## 1.7.0 — 2026-11-05

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

## 1.5.1 — 2026-11-05

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

## 1.5.0 — 2026-11-05

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

### 中文摘要

- **支持 DSH 0.2.2 的原生右键菜单**：宿主提供 `ctx.contextMenus` 时，工作区行条目改为
  数据贡献注册，按 order 与原生项交错排列（新会话 90、置顶应用 150、打开方式 180、
  复制工作区路径 250、在新标签打开 260、删除工作区及所有会话 310；原生为重命名 100、
  在文件夹显示 200、删除工作区 300）。右键与行尾「…」共用宿主同一份菜单。0.2.1 上仍
  走自绘工作区菜单；会话行条目继续通过 `sidebar.workspaces.session.menu.item` 扩展点渲染。
- 修复未命名会话「永久删除」确认框显示空标题的问题，回退为「未命名会话」。
- 0.2.2 的设置页隐藏工作区行「同时放进「…」菜单」开关（该版本右键与「…」共用同一份
  菜单，开关无从生效）；会话行的同类开关保留且仍然有效。

## 1.4.3 — 2026-11-04

### Changed

- **Declared the supported DSH range**: `package.json` now carries
  `engines.dsh: ">=0.2.1-rc.5 <0.3.0-0"`. DSH refuses to install or activate the
  plugin on a host outside that range, and the plugin market lists the range on the
  card instead of treating the plugin as undeclared. No runtime code changed.

### 中文摘要

- 在 `package.json` 中声明 `engines.dsh: ">=0.2.1-rc.5 <0.3.0-0"`：范围外的 DSH 会拒绝
  安装/激活，插件市场会显示支持版本，不再当作“未声明”。运行代码无改动。

## 1.4.2 — 2026-11-03

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

### 中文摘要

- 工作区右键新增「删除工作区及所有会话」：先逐个永久删除会话日志，全部成功后再删除
  工作区登记；任一会话失败则保留工作区便于重试。内置「删除工作区」行为不变（会话归入
  「未分组」）。新增宿主路由 `POST /dsh-sidebar-row-menu/workspace/delete`。
- 设置 →「行菜单」新增「同时放进「…」菜单」：可逐项把插件右键条目加进行尾「…」菜单。
  会话条目走原生 slot；工作区开启任意一项后由插件接管「…」按钮，保留官方「重命名 /
  删除工作区」。全部默认关闭，未开启时「…」菜单与 DSH 原样一致。

## 1.4.1 — 2026-11-03

### Added

- **Allow deleting unarchived sessions** (off by default): a new switch in
  Settings → "Row menu" extends the existing "Delete session permanently" entry to
  unarchived session rows. The confirmation dialog, host route and transcript
  cleanup are unchanged; without the switch the entry stays archived-only.

### 中文摘要

- 设置 →「行菜单」新增「允许删除未归档会话」开关（默认关闭）。开启后，未归档会话的
  右键菜单也会出现「永久删除会话」，确认后按原有宿主路由删除日志；关闭时维持仅已归档
  会话可见。

## 1.4.0 — 2026-11-03

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

### 中文摘要

- 工作区 / 会话右键菜单新增「打开方式」二级菜单（复用 DSH 内置 `open-in-app` 应用列表），
  常用应用可置顶到一级菜单，默认自动置顶第一个编辑器。
- 已归档会话新增「永久删除会话」和「删除所有已归档会话」，由本插件宿主路由完成，
  不级联删除 fork 子会话，无回收站。
- 设置 →「行菜单」新增各项开关、应用逐个显隐与置顶。
- 与 `dsh-session-menu` 共存时自动隐藏重复条目，并在设置里说明冲突。
- 工作区菜单改为 `MenuSurface` + `MenuItemButton` 自绘以支持子菜单，恢复分组分隔线。

## 1.3.5

- Release 1.3.5. See the GitHub release notes for details.

## 1.3.4

- Use the official toast for copy feedback and remove the redundant session-link item.

## 1.3.3

- Prime the row action pointer so menu extensions render in the first frame.
