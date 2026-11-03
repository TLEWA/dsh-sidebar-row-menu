# Changelog

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
