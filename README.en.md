# dsh-sidebar-row-menu

<img src="https://raw.githubusercontent.com/TLEWA/dsh-sidebar-row-menu/main/assets/icon-180.png" width="96" align="right" alt="Plugin icon" />

[![CI](https://github.com/TLEWA/dsh-sidebar-row-menu/actions/workflows/ci.yml/badge.svg)](https://github.com/TLEWA/dsh-sidebar-row-menu/actions/workflows/ci.yml)
[![Release](https://github.com/TLEWA/dsh-sidebar-row-menu/actions/workflows/release.yml/badge.svg)](https://github.com/TLEWA/dsh-sidebar-row-menu/releases)

[简体中文](README.md) · [English](README.en.md)

Right-click menus for the sidebar of [DeepSeek Harness](https://github.com/deepseek-ai) (DSH):

- **Workspace rows** — right-click opens a menu (since DSH 0.2.2 it is part of the
  host's native menu, with the plugin's items interleaved by `order`);
- **Session rows nested under a workspace** — right-click opens that row's own menu
  at the pointer, with the plugin's own entries appended.

DSH 0.2.2 turned the sidebar context menus into data: the host renders the workspace
menu and this plugin contributes its items by `order`; the session menu is still
rendered from its slot by the host, and the host also opens it at the pointer. On
0.2.2 the look, row height, icons, danger color, keyboard navigation and
click-outside / Escape dismissal are therefore exactly the built-in menu's — the
plugin only supplies entries. Hosts before 0.2.2 have no such service: the plugin
still draws the workspace menu with DSH's official `MenuSurface` + `MenuItemButton`,
and still moves the row's "…" menu to the pointer on right-click.

Session menu content comes from the `sidebar.workspaces.session.menu.item` slot —
built-in actions and other plugins' actions are all there. This plugin only appends
its own entries; it does not copy or hardcode any built-in action.

> The "…" button menu stays exactly as DSH ships it. The plugin's entries appear
> only when the menu is opened by right-click — on 0.2.2 that holds for workspace
> and session rows alike, and each entry can be opted into the "…" menu in Settings.
> On 0.2.2 both gestures share
> one host menu, so the plugin tells them apart by the gesture itself: a right-click
> sets a mark that is released once the menu panel has actually mounted, while the
> pointerdown on the "…" button clears it immediately. A right-click menu does not
> close when the pointer leaves it; it closes only on an outside click, an item
> selection, or Escape.

## Features

### Workspace row

On 0.2.2 the host renders this menu, and the plugin's items interleave with the
built-in Rename (100), Reveal in file manager (200) and Delete workspace (300),
using the same grouping rules as the session menu: New session 90, Open in new
tab 110, Copy workspace path 150, pinned app 210, Open with 220, Delete workspace
and all sessions 310. These items are right-click only by default; the row's "…"
menu keeps its native content unless you opt entries in under Settings → "Also
show in the "…" menu → workspace". On 0.2.1 the plugin draws the whole menu and
runs the official dialogs for Rename and Delete workspace.

| Item | Behavior |
| --- | --- |
| New session | Expands the workspace and starts a session (same as the row's `+`) |
| Rename (built-in) | Opens the official "Rename workspace" dialog; on 0.2.1 the plugin renders this item itself |
| Open in new tab | Only when `dsh-project-tabs` (exposing `openWorkspaceInTab`) is installed |
| Copy workspace path | Copies the directory path |
| Reveal in file manager (built-in) | Opens the workspace directory in Explorer; provided by the host on 0.2.2, absent on 0.2.1 |
| Pinned open-with app | A pinned app shows directly at the top level (e.g. "Open with Visual Studio Code") and opens the workspace directory |
| Open with | A submenu of external apps (editors, terminals, file managers) sharing the session menu's catalog, pinning and toggles; hover expands it. Host menu items draw no submenu caret, so the plugin appends a "›" to the label; the 0.2.1 self-drawn menu uses an arrow icon |
| Delete workspace (built-in) | Opens the official delete confirmation; removes only the workspace registration and leaves its sessions under "Ungrouped". On 0.2.1 the plugin renders this item itself |
| Delete workspace and all sessions | Permanently deletes every session and transcript under the workspace first, then the workspace registration. If any session fails, the workspace is kept so the user can retry. The directory itself is not deleted |

### Session row

Right-click does not build a second menu: on 0.2.2 the host opens the row's native
menu at the pointer, and on 0.2.1 the plugin triggers the row's "…" menu and moves
its anchor to the pointer. Either way the content comes from the same slot:

| Source | Entries |
| --- | --- |
| DSH built-ins | Rename, Fork session, Pin / Unpin, Archive / Unarchive, Copy Session ID |
| Other plugins | Whatever they register into `sidebar.workspaces.session.menu.item` |
| This plugin | Pinned open-with apps (top level), Open with (submenu), Delete session / Delete all archived sessions (archived rows by default; unarchived rows can be opted in) |

The entries added by this plugin:

| Item | Behavior |
| --- | --- |
| Open with | A submenu of external apps provided by the host (editors, terminals, file managers) opening the session's `cwd`; falls back to its workspace directory. Hovering the row expands the submenu |
| Pinned open-with app | A pinned app shows directly at the top level (e.g. "Open with Visual Studio Code"). Until configured, the first detected editor is pinned automatically, otherwise the first catalog app |
| Delete session | On archived sessions by default; permanently deletes that one session and its transcript after confirmation. Enable "Allow deleting unarchived sessions" in Settings to show it on unarchived rows too |
| Delete all archived sessions | Only on archived sessions; permanently deletes every archived session and its transcript after confirmation |

The "Open with" catalog comes from DSH's built-in `open-in-app` routes, so it is the
same source DSH itself uses; labels and icons are rendered by this plugin, each app
can be hidden in Settings, and frequently used apps can be pinned to the top level.
Both delete entries are served by this plugin's own host route. They leave
unarchived sessions alone by default; the opt-in switch extends the single-session
entry to them. Deletion never cascades into forked child sessions.

These entries are **right-click only by default**: they do not mount when the "…"
button opens the menu. There is no time window any more; the plugin sets a
right-click gesture mark and releases it only once the menu panel has actually
appeared (0.2.2 mounts the menu asynchronously), and the pointerdown on the "…"
button clears it at once. While the mark is live the entries render normally;
otherwise they render `null`.

To use them from the row's "…" button, enable them one by one under Settings →
"Row menu" → "Also show in the "…" menu":

- session entries mount into the native "…" menu;
- workspace entries on 0.2.2: the host menu is data-driven, so an enabled entry skips
  the gesture check and appears in the "…" menu; with everything off that menu keeps
  only the native items;
- workspace entries on 0.2.1: enabling any of them makes this plugin take over the
  row's "…" button and render the official "Rename / Delete workspace" items
  alongside the enabled plugin entries.

With everything off, the "…" button behaves exactly like DSH's own.

Blank draft sessions have no right-click menu and are left alone. Rows that are
neither a workspace nor a session (e.g. "Show more") are not intercepted.

### Settings

Settings → "Row menu" toggles every new entry:

| Switch | Effect |
| --- | --- |
| Open with | Hides "Open with" and every pinned app from workspace and session menus |
| Open with → applications | Hides individual applications; the adjacent "Pin" button promotes an app to the top level |
| Delete session | Hides the single-session delete entry in session menus |
| Allow deleting unarchived sessions | Off by default; also shows "Delete session permanently" on unarchived rows. Requires the previous switch |
| Delete all archived sessions | Hides the bulk-delete entry |
| Also show in the "…" menu → workspace | Adds workspace right-click entries one by one to the row's "…" menu: New session, Open with, Copy workspace path, Open in new tab, Delete workspace and all sessions. On 0.2.1 enabling any of them makes this plugin render the "…" menu |
| Also show in the "…" menu → session | Adds session right-click entries one by one to the native "…" menu: Open with, Delete session, Delete all archived sessions |

The "Also show in the "…" menu" switches are all off by default; until one is
enabled the "…" menu is exactly DSH's own.

On DSH 0.2.2 and later the "…" button and right-click share one host menu, yet the
plugin's entries still appear only on right-click; flipping a switch also puts that
entry into the "…" menu. On 0.2.1 workspace rows have no host menu to contribute to,
so the plugin takes over the "…" button and draws the menu itself.

Switches live in browser `localStorage` (`dsh.sidebar-row-menu.items.v1`,
`dsh.sidebar-row-menu.open-with.v1`, `dsh.sidebar-row-menu.open-with.pinned.v1` and
`dsh.sidebar-row-menu.ellipsis.v1`)
and apply immediately. Before the first explicit pin, the plugin derives one: the
first detected editor (usually VS Code), or the first catalog app when no editor
exists.

### Coexistence with dsh-session-menu

When [`dsh-session-menu`](https://github.com/big-head-pigeon/dsh-session-menu) is
installed, this plugin looks for its `session-menu-open-with` /
`session-menu-delete` / `session-menu-delete-archived` entries in the session menu slot. If present, the
matching entries here are hidden and the settings switches are disabled with a
"provided by dsh-session-menu" hint. No configuration of the other plugin is read
or changed.

## Install

Requirements:

- DSH Desktop (or `dsh web`) has been started at least once, so the profile exists;
- Windows PowerShell 5.1+;
- Row components from the `0.2.1-rc.5` generation (see [Compatibility](#compatibility)).

### Install from npm (recommended)

The package is published to the npm registry, and DSH's plugin installer can
resolve it directly by name:

1. Open **Plugins** in the sidebar → **Install plugin**;
2. Enter the package name and confirm:

   ```
   dsh-sidebar-row-menu
   ```

3. Hard-refresh (`Ctrl+Shift+R`); restart the desktop app if the host half is not active.

Pin a version by appending it to the name:

```
dsh-sidebar-row-menu@1.4.2
```

Equivalent command line:

```powershell
dsh plugin --profile desktop add dsh-sidebar-row-menu@1.4.2
```

### Install from GitHub

DSH Desktop installs Git dependencies through pnpm. The `lib/` directory in this
repository is already runnable, so **no local build is required**.

1. Open **Plugins** in the sidebar → **Install plugin**;
2. Paste the repository URL and confirm:

   ```
   https://github.com/TLEWA/dsh-sidebar-row-menu
   ```

3. Hard-refresh (`Ctrl+Shift+R`); restart the desktop app if the host half is not active.

That URL tracks the latest commit on `main`. Pin a tag for a stable version:

```
https://github.com/TLEWA/dsh-sidebar-row-menu#v1.4.2
```

Or install the tarball built by Actions directly, without Git:

```
https://github.com/TLEWA/dsh-sidebar-row-menu/releases/download/v1.4.2/dsh-sidebar-row-menu-1.4.2.tgz
```

Equivalent command line:

```powershell
dsh plugin --profile desktop add github:TLEWA/dsh-sidebar-row-menu
```

Automation: every push / pull request runs syntax checks, the full test suite and a
package verification in GitHub Actions; pushing a `v*` tag builds the tarball and
creates a GitHub Release with `dsh-sidebar-row-menu-<version>.tgz` and
`SHA256SUMS.txt`.

### Plugin marketplace

The submission material for the
[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
listing (entry YAML and preflight script) is kept locally and is git-ignored; it
is not part of this repository. Submitting only requires the entry file in one
pull request against the upstream catalogue. Until the plugin is listed, install
via the GitHub URL above.

### Manual install (clone the repository)

```powershell
git clone https://github.com/TLEWA/dsh-sidebar-row-menu.git dsh-sidebar-row-menu
cd dsh-sidebar-row-menu
powershell -NoProfile -File .\scripts\install.ps1
```

The script performs four steps and does not need pnpm:

1. junction `%DSH_HOME%\plugins\dsh-sidebar-row-menu` → this repository
   (the publish point; sources stay editable);
2. write `link:../../plugins/dsh-sidebar-row-menu` into the profile's `dependencies`;
3. junction `%DSH_HOME%\profiles\<profile>\node_modules\dsh-sidebar-row-menu` → publish point;
4. verify the junction resolves to this package's `package.json` and that it has
   `dsh.bundle.patch`, then append the package name to `dsh.profile.bundles`
   (backing up `package.json` first).

The default profile is `desktop`; other targets:

```powershell
powershell -NoProfile -File .\scripts\install.ps1 -Profile both
powershell -NoProfile -File .\scripts\install.ps1 -Profile 'C:\Users\<you>\.dsh\profiles\web'
```

After installing:

- hard-refresh the UI (`Ctrl+Shift+R`); the console prints
  `[dsh-sidebar-row-menu] installed` from the client half;
- if right-click still does nothing, restart the desktop app so the host half and
  bundle tree are reloaded together.

Self-check (the host route should answer `400 bad-target`):

```powershell
curl.exe -X POST http://127.0.0.1:10102/dsh-sidebar-row-menu/open `
  -H 'content-type: application/json' -d '{"target":"nope","path":"x"}'
```

Then right-click a workspace row and a session row beneath it: the menu should
open at the pointer and look identical to the built-in "…" menu. `Esc` and
clicking elsewhere close it.

Uninstall:

```powershell
powershell -NoProfile -File .\scripts\install.ps1 -Uninstall
```

This removes the two junctions, the dependency entry and the bundle entry; the
repository itself is untouched.

> Do not use `dsh plugin add link:<absolute path>`: on Windows pnpm treats `link:`
> as relative to the profile, and cross-drive paths produce broken links. The
> script exists to avoid exactly that.

### Switching from the script install to a pnpm install (npm / GitHub)

If you installed the development copy with `scripts/install.ps1` and then enter
the npm package name or the GitHub URL into the Plugins page, pnpm may fail with:

```
[ERR_PNPM_EPERM] [importPackage ...\node_modules\dsh-sidebar-row-menu]
EPERM: operation not permitted, rename
'...\dsh-sidebar-row-menu_tmp_27508_27' -> '...\dsh-sidebar-row-menu'
```

The script leaves a directory junction inside `node_modules`, and pnpm imports a
new package by renaming a temporary directory over the target; Windows will not
replace an existing junction that way. Uninstall the script install first, then
retry:

```powershell
powershell -NoProfile -File .\scripts\install.ps1 -Uninstall
```

If the directory is still there (or a failed attempt left `*_tmp_*` entries),
remove it manually and retry:

```powershell
cmd /c rmdir "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\dsh-sidebar-row-menu"
```

A fresh profile never hits this; it only affects the "script install, then
pnpm install (npm or GitHub)" transition.

## Development

```powershell
npm run test        # normal: node --test, one child process per file
npm run test:local  # restricted terminals / sandboxes: --test-isolation=none
npm run build       # npm pack (prepack runs check first), writes the .tgz
```

The suite covers host pure functions (path validation, `vscode://file` encoding,
loopback checks, route status codes) and the client module (module id, exports,
dependency whitelist, listener install/uninstall, slot registry). Integration
tests use a fake `__reactFiber$`, DOM and `Menu` host to assert workspace menu
ordering, session right-click delegating to the native menu, blank rows being
skipped, and the success toast shown when copying a workspace path. Real fibers and
services still need a manual check in a running GUI.

Layout:

```
lib/index.js          host entry: name / inject / apply plus re-exported helpers
lib/host/security.js  loopback request fence
lib/host/paths.js     path validation, vscode://file encoding
lib/host/launch.js    VS Code / Explorer launching
lib/host/route.js     /open, /session/delete and /workspace/delete routes, HTTP status codes
lib/host/session-delete.js transcript verification and deletion (detach / rm / re-check)
lib/host/workspace-delete.js workspace + all sessions deletion, workspace kept on failure
lib/client.js         browser half: fiber lookup, slot registration, menu mount
cordis.patch.yml      bundle patch inserting the plugin into the profile tree
scripts/install.ps1   pnpm-free install / uninstall
test/*.test.mjs       node:test
```

## How it works

### Why fiber props

Sidebar rows only expose `data-row-key` (`workspace:<key>` / `session:<id>`); the
workspace directory, session object and action callbacks are not in the DOM. The
row components are:

- `ProjectRowItem({ group, actions, onCreate, ... })` — `actions` exists only on
  real workspace rows;
- `SessionNodeItem({ node, onRenameRequest, onOpen, ... })` — `node` looks like
  `{ id, title, blank, running, archived, pinned, updatedAt }`.

The plugin reads `__reactFiber$` from the event target during the capture phase of
`contextmenu`, then walks up to 60 `return` links looking for matching
`memoizedProps`. If nothing matches it does not intercept at all. On 0.2.2 the fiber
is also used to tell whether the row already carries the host's own context menu
trigger (`memoizedProps.onContextMenu` is a function): if it does, the host opens the
menu at the pointer by itself and the plugin only drops a gesture mark, never
touching the event.

### Why session actions are not hardcoded

The native session menu is not a hardcoded button list: it is
`renderSlot('sidebar.workspaces.session.menu.item', ...)`. Fork, pin, archive and
third-party actions are all slot entries. Slot ownership is enforced by the
renderer: an entry may only render child slots it declared itself, so a third
party cannot re-layout someone else's slot.

So a session right-click never copies menu content:

- 0.2.2: the row component carries the host's `getTriggerProps` (its `onContextMenu`
  hands `kind:'session'` to `ctx.contextMenus`), so the host owns the gesture and the
  plugin does not even need to find a `Menu` or click a button;
- 0.2.1: find the `Menu` in the row's fiber subtree and trigger its anchor (the
  ellipsis button), which opens the same slot content.

The plugin's own actions are registered through `ctx.slots.inject` +
`ctx.slots.register`, so:

- they do not depend on built-in fork/pin entries existing;
- new entries from DSH or other plugins show up automatically;
- no built-in action is copied or hardcoded.

Workspace rows have no such slot on 0.2.1, so their menu is composed by this plugin.
Since 0.2.2 the host provides `ctx.contextMenus` and the workspace items become data
contributions — again just "adding its own items to the host's menu". The official
`Menu` accepts only a flat `items` list and cannot express submenus, so the 0.2.1
workspace menu is drawn with `MenuSurface` + `MenuItemButton`: rows, icons, danger
styling and separators reuse the official controls.

### Why the session menu appears at the pointer

On 0.2.2 there is nothing to do: the host's `onContextMenu` passes `clientX /
clientY` to `ctx.contextMenus.open()`, and the panel renders at the pointer.

On 0.2.1 the official `Menu` anchors to the ellipsis button, i.e. to the right of it.
On right-click the plugin temporarily points that button's (and two ancestors')
`getBoundingClientRect` at the pointer as a `0×0` rect. `Menu` re-reads the anchor
rect every frame, so the panel lands next to the cursor. The original methods are
restored as soon as the panel leaves `body`, so the button menu keeps its normal
position.

### Why the right-click entries never show in the "…" menu

On 0.2.2 both gestures open the same host menu, and React cannot tell where it came
from, so the plugin watches the gesture: a right-click sets an in-process mark, and a
`MutationObserver` waits for a new `[role="menu"]` panel to appear (0.2.2 mounts the
menu asynchronously, after every provider is ready); once the panel shows up the mark
is released 400 ms later, with a 3 s fallback in case another plugin swallows the
gesture. The `pointerdown` on the row's "…" button clears the mark immediately, and
only trusted input counts (`isTrusted`) — the synthetic `pointerdown` the plugin
re-dispatches is not a gesture.

Entries read the mark once while mounting, so a slow panel does not matter, and the
mark only lives until "the panel for this gesture appeared", never into the next one.

Workspace rows on 0.2.2 take a different path: the host menu is built from each
`ctx.contextMenus.register` provider's `resolve`, which has no React entry to read the
mark, so the provider checks the same mark while resolving. The "…" pointerdown
clears it before the host resolves, hence the entries show on right-click only; the
"Also show in the "…" menu → workspace" switches make the provider skip that check.

### Why the 0.2.1 menu is mounted imperatively

On 0.2.2 the host mounts every menu and the plugin creates no container. On 0.2.1 a
contextmenu event is not part of React's render flow, so the workspace menu creates
a `0×0`, `z-index:2147483647` host on demand and `createRoot`s a self-drawn panel;
after mount it measures once and clamps its corner into the viewport, then unmounts
and removes the host on close. The session menu mounts nothing new; it only opens
the row's existing menu.

### Host route

`POST /dsh-sidebar-row-menu/open`, body `{ target: 'vscode' | 'explorer', path }`.

- loopback only (socket, Host, `Sec-Fetch-Site` and Origin are all checked);
- POST only, exact path, body ≤ 64 KB;
- `path` must be an **existing absolute directory** (relative paths, NUL, files and
  missing paths are rejected) so the host never becomes a generic command runner;
- VS Code resolution order: `DSH_SCM_VSCODE` → registry
  `HKCR\vscode\shell\open\command` → `%LOCALAPPDATA%` / `%ProgramFiles%`
  `bin\code.cmd` → `PATH`; if none is found it falls back to `rundll32` with
  `vscode://file/...`;
- spawn uses `detached + stdio:'ignore'` and deliberately does **not** set
  `windowsHide` (otherwise Explorer windows would be hidden).

`POST /dsh-sidebar-row-menu/session/delete`, body `{ sessionIds: string[] }`.

- same loopback / POST / exact path / 64 KB body checks; `sessionIds` must be a
  non-empty array of non-empty strings, at most 500;
- sequential deletion: cancel a running session, detach a live one, then locate the
  transcript directory through `sessionPersistence.locate()`; the directory's
  basename must equal the session id or deletion is refused (no parent-directory
  misfires);
- after deleting, the directory is re-checked three times to ensure it did not come
  back, then the `workspaceRegistry` archive/pin records are cleared and
  `api-session/removed` is emitted;
- partial failures return `200` + `{ ok:false, deleted, failed, error }`; the dialog
  stays open and reports the counts.

`POST /dsh-sidebar-row-menu/workspace/delete`, body `{ workspaceId: string }`.

- same loopback / POST / 64 KB body checks; `workspaceId` must be a non-empty string;
- reads `workspaceRegistry.get(workspaceId).sessionIds` and permanently deletes each
  session with the flow above;
- only when every session was deleted (including sessions that were already gone)
  does it call `workspaceRegistry.delete()`; any failure returns `200` + `ok:false`
  and keeps the workspace, so no orphaned "Ungrouped" sessions are left behind;
- an unknown workspace returns `ok:true, missing:true` and is not an error.

"Open with" does not touch this plugin's host: it calls DSH's built-in
`open-in-app/apps`, `open-in-app/open` and `open-in-app/icon/<id>` directly.

## Compatibility

The package declares its supported DSH range in `package.json` as
`engines.dsh`: `>=0.2.1-rc.5 <0.3.0-0`. The DSH host uses it to refuse
incompatible installs, and the plugin market shows it as the supported version;
0.3 and later need re-verification before the upper bound is raised.

Built against DSH client `0.2.1-rc.5` and `0.2.2` (`ProjectRowItem`,
`SessionNodeItem`, `Menu`, `contextMenus`). DSH 0.2.2 moved the sidebar context
menus to a data-driven service, and the plugin picks the path by host capability:

- **0.2.2+**: workspace entries are registered with `ctx.contextMenus.register`
  (New session 90, Open in new tab 110, Copy workspace path 150, pinned app 210,
  Open with 220, Delete workspace and all sessions 310), interleaved by
  order with the native Rename (100), Reveal (200) and Delete workspace (300) and
  grouped with the same separators as the session menu.
  Right-click and the "…" button share the host's single menu; providers answer only
  during a right-click gesture (or when the matching "Also show in the "…" menu"
  switch is on).
- **0.2.1**: no `contextMenus` service, so the plugin keeps drawing its own
  workspace menu.
- **Session rows**: 0.2.2 still supports the
  `sidebar.workspaces.session.menu.item` extension point; the plugin entries keep
  mounting there, and right-click still opens the host menu at the pointer.

If a DSH upgrade changes those row components or the menu positioning:

- workspace right-click falls back to the self-drawn menu (0.2.1 path) or silently
  stops appearing (no error, no UI breakage);
- session right-click falls back to opening next to the "…" button, with correct content.

## Known limitations

- On 0.2.1 the plugin depends on the props shape of the built-in row components.
  From 0.2.2 the workspace entries use `contextMenus`, the session entries still
  use the legacy extension point, and `memoizedProps.onContextMenu` decides whether
  the host has taken the row over. If DSH changes that implementation, right-click
  may silently do nothing.
- On 0.2.1 session right-click depends on the row's `Menu` staying in the fiber
  subtree. If it is not found, the plugin clicks the row-actions ellipsis button;
  failing that it gives up — it never builds a competing menu and never triggers row
  open. On 0.2.2 no fallback is needed: the host is the trigger.
- Permanent deletion is offered for **archived** sessions by default; enable
  "Allow deleting unarchived sessions" to delete unarchived sessions from their
  right-click menu as well. Deletion does not cascade into forked child sessions —
  delete those separately when needed.
- Deletion works directly on the transcript directory; the host has no trash bin.
  The confirmation dialog states that it cannot be undone.
- The open-with directory for a session comes from `sessions.list`'s `cwd`,
  falling back to the workspace directory. Ungrouped sessions may have no
  directory; in that case a "no directory available" toast is shown.

## License and notices

- Code: [MIT](LICENSE).
- Changelog: [CHANGELOG.md](CHANGELOG.md).
- Third-party code and full license texts: [NOTICE.md](NOTICE.md) · [English](NOTICE.en.md).
- AI usage and code provenance: [AI_USAGE.md](AI_USAGE.md) · [English](AI_USAGE.en.md).

Commercial and non-commercial use are both allowed, but the project comes with
**no warranty** under the MIT terms; review AI-assisted code before relying on it.
