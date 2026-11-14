# Changelog

## [Unreleased]

- **No more double ">" chevrons on submenu entries since 0.2.2-rc.2.** The host started drawing its own right-aligned chevron for submenu items in that release, while the plugin still added a fallback one for older hosts, so "Open with" and "Default permission for new sessions" showed two arrows side by side. The fallback chevron now renders only when the host does not draw one; 0.2.2-rc.1 and earlier still get the plugin's arrow.
- **Session context menus are rendered from host menu contributions since 0.2.2-rc.2, and the native "In app" / "Open in app" entry no longer duplicates "Open with".** Session entries move to the host `contextMenus` (pinned apps and the delete entries keep their behaviour); in a panel that carries the plugin marker the host's own open-in-app entry is hidden, while the row's "…" menu is untouched. 0.2.2-rc.1 and earlier keep the slot injection, and an unreadable host version falls back to the old path so the whole menu never disappears.

## 1.13.0 — 2026-11-11

- **"Open with" is no longer a dead end when the OS file associations cannot be read.** The host enumerates registered applications through PowerShell; a single broken Shell handler whose `GetName` throws makes the whole enumeration fail, and the submenu used to show only "The host offers no desktop opening here". It now falls back to "Open with the default application" and "Show in folder" (`openWorkspacePath` without an `application`, and `action: 'reveal'`), and explains why.

- **"Open with" in the conversation-body menu opens the file under the pointer, not the session workspace.** Right-clicking the changed-files card, a presented-file card, a message attachment or an @ file reference used to send the session directory to the pinned app and the "Open with" submenu; it now opens the file paths under the pointer (a row opens that row, blank card space opens the whole card), shows an "N files" note when several files are opened, and falls back to the session directory only when no absolute path can be resolved.
- **File targets no longer go through the directory-only `open-in-app/open` route (fixes "Open failed: no handler found on the host").** The file mode now asks the client Remote: `session.workspacePathApplications` lists the applications the OS registered for the file, and `session.openWorkspacePath` opens it. The host route validates `isDirectory()` at the wire boundary, so posting a file always returned 404. A pinned app becomes a top-level row only when the same id appears among those handlers; the submenu shows the OS-provided names and icons.
- **A session whose run state cannot be confirmed is no longer deleted on a guess.** When the `agents` service is unavailable the host used to treat the session as stopped and could delete a transcript that was still being written; it now reports the session as still running and keeps the log, and deletes only cold sessions that have no live handle at all.
- **"Open in VS Code" no longer goes through `cmd.exe` by default.** When `code.cmd` is found the sibling `Code.exe` is launched directly, so a `%` in the path is not expanded as an environment variable; the cmd path is kept only for an explicit `DSH_SCM_VSCODE` pointing at a `.cmd`.
- **Corrected the `dsh-utf8-output` blurb in the cross-plugin index:** `GBK/CP936/CP932` → `GBK/CP936/GB18030`, matching its actual UTF-8 + GB18030 decoders.

## 1.12.0 — 2026-11-11

- Adopt shared Codex PR review rules and repository-specific review guidance; preserve existing CI, human approval, and release behavior.

### Summary

The first permission-default write no longer fails on a fresh DSH_HOME. The archived-session toggle now works from the workspace ellipsis on 0.2.1.

### Changed

- **The first permission-default write no longer fails on a fresh `DSH_HOME`.** The lock file was opened before its parent directory existed, so the very first save threw ENOENT; the directory is now created before the lock is taken.
- **Deleting a workspace no longer silently skips sessions beyond 500.** The batch used to stop after the first 500 ids yet still report success and unregister the workspace, leaving the rest of the transcripts unmanaged; it now processes every session and keeps the workspace on any failure.
- **"Delete all archived sessions" no longer fails as a whole beyond 500 archived sessions.** The host accepts at most 500 ids per request, so the client now submits them in batches of 500 and merges the counts; previously one POST with every id was rejected with 400 and the entry was effectively unusable.
- **A session that does not stop within the wait is no longer force-deleted.** The host used to wait at most 3 seconds and then `rm` anyway, which easily hit EBUSY on Windows and left an undeletable directory; it now reports the failure and keeps the transcript so the user can retry.
- **"Open in VS Code" no longer pretends a failed launch succeeded.** The asynchronous `spawn` error used to be swallowed and `DSH_SCM_VSCODE` was never validated, so a broken launcher still returned 200 and the click did nothing; a missing override now returns `vscode-launcher-missing`, an asynchronous launch failure returns `spawn-failed`, and a failed resolution is no longer cached forever.
- **The archived-session toggle is reachable from the workspace "…" menu on 0.2.1.** The workspace-ellipsis takeover check omitted this entry, so enabling it alone left the native menu in place; it now takes over like the other workspace entries.
- **A cold session is no longer counted as deleted when the session list cannot be read.** A failing `listSessions` was swallowed and its existing transcript was reported as missing (success), clearing the archive/pin records too; the delete now reports the failure and keeps the transcript.

## 1.11.2 — 2026-11-08

### Summary

Right-clicking code blocks and tool-call cards works again.

### Changed

- **Right-click on code blocks and tool-call cards works again.** The whole tool card used to be
  treated as "not ours" by the blank-space right-click handler, so the native browser menu showed
  instead of the plugin menu. Card headers (even when they are `role=button`) and expanded bodies
  now open the plugin menu; links and form controls inside cards still fall back to the native menu.

## 1.11.1 — 2026-11-08

### Summary

Restored the dsh-sidebar-organizer integration for header buttons tucked into the native More actions popup.

### Changed

- **Restored the dsh-sidebar-organizer link: header buttons it tucks into the native
  "More actions" popup now show up in this plugin's own "More actions" submenu.** The
  organizer injects those rows straight into the host popup's DOM, so they never appear
  in the host Menu's `items` and a submenu built from `items` alone (e.g. "IP guard")
  lost them. They are now re-derived from the marked header buttons, ordered by
  `dsh.sidebar-organizer.layout.v1`, placed before the host items (matching their position
  in the native popup), and clicking one clicks the tucked original button.

## 1.11.0 — 2026-11-06

### Summary

Failed permission changes no longer pretend to succeed, plus app-list, batch-deletion, Windows launcher and permission-store fixes and a bundled client refactor.

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

### Summary

A workspace can set the default permission for its new sessions, and menu entries can live only in the ellipsis menu.

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

### Summary

Submenus are measured before positioning and no longer fly off screen edges.

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

### Summary

All top-left status widgets in the session header are excluded from the conversation-body menu as a group.

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

### Summary

Session cost entries are hidden from the conversation-body menu by default.

### Changed

- **Session cost entries are no longer listed in the conversation-body menu by
  default.** Cost / usage stats entries such as "Session cost" are text-only and open
  a stats panel, so they are now treated differently from toolbar buttons and stay
  hidden. A new "Show cost details" switch under Settings → row menu (off by default)
  brings them back; existing saved settings without the new field also default to
  hidden.

## 1.9.0 — 2026-11-06

### Summary

New conversation-body right-click menu that mirrors the session header toolbar.

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

### Summary

A custom settings-section icon is registered on DSH 0.2.2 and later.

### Added

- **Custom settings icon on DSH 0.2.2 and later.** The settings section now
  registers a navigation icon through the host's `settings.section.icon` slot
  instead of falling back to the default gear: three rows with a trailing
  submenu chevron, drawn on the host's 16px grid with a 1.5px rounded stroke and
  `currentColor`, so it follows the selected/unselected state on its own. On
  hosts without the slot (0.2.1 and below) the registration is skipped and the
  settings section keeps working with the host's own glyph.

## 1.7.0 — 2026-11-05

### Summary

Per-workspace show/hide toggle for archived sessions in the workspace menu.

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

### Summary

Workspace entries can opt into the native ellipsis menu on DSH 0.2.2, with icon, separator and grouping fixes.

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

### Summary

Session-row right-click entries now appear every time on DSH 0.2.2.

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

### Summary

DSH 0.2.2 native context-menu support and the untitled-session delete fix.

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

### Summary

Declared the supported DSH range: `engines.dsh` is `>=0.2.1-rc.5 <0.3.0-0`.

### Changed

- **Declared the supported DSH range**: `package.json` now carries
  `engines.dsh: ">=0.2.1-rc.5 <0.3.0-0"`. DSH refuses to install or activate the
  plugin on a host outside that range, and the plugin market lists the range on the
  card instead of treating the plugin as undeclared. No runtime code changed.

## 1.4.2 — 2026-11-03

### Summary

Delete workspace and all sessions, plus opt-in entries in the native ellipsis menu.

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

### Summary

New switch to allow permanently deleting unarchived sessions.

### Added

- **Allow deleting unarchived sessions** (off by default): a new switch in
  Settings → "Row menu" extends the existing "Delete session permanently" entry to
  unarchived session rows. The confirmation dialog, host route and transcript
  cleanup are unchanged; without the switch the entry stays archived-only.

## 1.4.0 — 2026-11-03

### Summary

Open-with submenu, permanent session deletion, settings, coexistence detection, and a self-drawn workspace menu.

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
