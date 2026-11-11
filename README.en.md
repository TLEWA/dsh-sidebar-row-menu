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

> The plugin's entries appear in the right-click menu by default. Settings → "Row
> menu" → "Menu placement" can move each entry to the "…" menu only, or show it in
> both (at least one side always stays on).
> On 0.2.2 both gestures share
> one host menu, so the plugin tells them apart by the gesture itself: a right-click
> sets a mark that is released once the menu panel has actually mounted, while the
> pointerdown on the "…" button clears it immediately. The "…" menu therefore only
> carries entries placed there (or on both sides). A right-click menu does not
> close when the pointer leaves it; it closes only on an outside click, an item
> selection, or Escape.

## Features

### Workspace row

On 0.2.2 the host renders this menu, and the plugin's items interleave with the
built-in Rename (100), Reveal in file manager (200) and Delete workspace (300),
using the same grouping rules as the session menu: New session 90, Open in new
tab 110, archived-session toggle 130, Copy workspace path 150, pinned app 210,
Open with 220, default permission for new sessions 225, Delete workspace and all
sessions 310. These items are right-click only by default; the row's "…"
menu keeps its native content unless you place entries under Settings → "Row
menu" → "Menu placement". On 0.2.1 the plugin draws the whole menu and
runs the official dialogs for Rename and Delete workspace.

| Item | Behavior |
| --- | --- |
| New session | Expands the workspace and starts a session (same as the row's `+`) |
| Rename (built-in) | Opens the official "Rename workspace" dialog; on 0.2.1 the plugin renders this item itself |
| Open in new tab | Only when `dsh-project-tabs` (exposing `openWorkspaceInTab`) is installed |
| Show / hide archived sessions | Only on workspaces that have archived sessions; the label follows the current state. "Show archived sessions" switches the sidebar's global archived filter to all conversations and then hides every other workspace's archived rows (including "Ungrouped"), so only this workspace's archived sessions appear; "Hide archived sessions" puts them back. Per-workspace choices persist across reloads; changing the global filter under "View options" wins over them |
| Copy workspace path | Copies the directory path |
| Reveal in file manager (built-in) | Opens the workspace directory in Explorer; provided by the host on 0.2.2, absent on 0.2.1 |
| Pinned open-with app | A pinned app shows directly at the top level (e.g. "Open with Visual Studio Code") and opens the workspace directory |
| Open with | A submenu of external apps (editors, terminals, file managers) sharing the session menu's catalog, pinning and toggles; hover expands it. Host menu items draw no submenu caret, so the plugin renders the label as text plus a right-aligned chevron, matching the session menu; the 0.2.1 self-drawn menu uses an arrow icon |
| Default permission for new sessions | A submenu of the host's native permission presets (read-only / workspace-write / danger-full-access). The chosen preset becomes the default for **sessions created afterwards in this workspace**; the effective one is checked on the right, and "Follow global default" clears the per-workspace value. Existing sessions are never changed |
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
| Delete all archived sessions | Only on archived sessions; permanently deletes every archived session and its transcript after confirmation. More than 500 archived sessions are sent in batches instead of failing on the per-request limit |

The "Open with" catalog comes from DSH's built-in `open-in-app` routes, so it is the
same source DSH itself uses; labels and icons are rendered by this plugin, each app
can be hidden in Settings, and frequently used apps can be pinned to the top level.
Both delete entries are served by this plugin's own host route. They leave
unarchived sessions alone by default; the opt-in switch extends the single-session
entry to them. Deletion never cascades into forked child sessions.

These entries appear in the **right-click menu** by default. To use them from the
row's "…" button, set each one under Settings → "Row menu" → "Menu placement":

- "…" menu: the entry appears only in the row's "…" menu and leaves the
  right-click menu;
- "Both": it appears on both sides;
- "Right-click menu": the default, right-click only.

Every entry must keep at least one side, so the switch for the last active side is
locked. Session entries and workspace entries (0.2.2) share the same
`contextMenus` providers and use the gesture mark to tell which menu is being
rendered; on 0.2.1 the plugin takes over the row's "…" button and draws the
workspace menu itself with the same placement rules.

Blank draft sessions have no right-click menu and are left alone. Rows that are
neither a workspace nor a session (e.g. "Show more") are not intercepted.

### Right-click in the conversation body

Right-clicking in the conversation body — blank space, thinking blocks, replies and tool
summaries (but not the composer, the header toolbar or tool cards themselves) — opens a
vertical menu that lists that toolbar in **visual** left-to-right order, each row carrying
the original button's icon:

- with `dsh-sidebar-organizer` installed and a customised "session header toolbar"
  layout, the menu follows its order; otherwise it is DSH's default order. The
  organizer reorders with CSS `order`, so DOM order is not screen order — the menu
  sorts by `getBoundingClientRect()` at right-click time;
- "Open with" is collapsed exactly like the workspace and session menus: pinned apps
  become top-level rows (e.g. "Open with Visual Studio Code") and the remaining apps
  move into an "Open with ›" submenu that expands on hover or click. The "Open with"
  master switch, per-app switches and pinning all apply; turning the master switch off
  removes the whole group;
- "More actions" no longer opens the header "…" popover: it expands in place like the
  other submenus and mirrors the host menu's entries (Copy session as Markdown, Download
  session log, Feedback, …), and picking one runs it immediately. Its row order follows
  `dsh-sidebar-organizer` too: dragging rows inside the "…" popover saves the order to
  `dsh.sidebar-organizer.host-menu-order.v1`, and this submenu re-sorts with it;
- sections are separated by faint rules automatically, and row height, padding,
  radius, 13px type and 14px icons match DSH's native context menus;
- a "More" style overflow trigger is pinned to the last row (can be switched off in
  Settings); buttons the organizer tucked into "More actions" do not show up on their
  own;
- the status widgets in the top-left corner of the session header (the
  `conversation.session.header.actions` slot: "Session cost", the background-job
  counter, …) are left out as a whole; turn on "Show top-left status widgets" in
  Settings to list them. The rule looks at the slot, not at labels, so status widgets
  that DSH or other plugins add there later stay hidden by default too;
- selecting an ordinary row is a real click: the menu closes, then a `click` is
  dispatched to the original header button, so "Find", "Toggle bottom panel" and
  friends still open their native popovers;
- a text selection wins: the plugin stays out of the way and lets the browser's
  selection menu appear; inputs and links inside messages also keep their native menu;
  tool cards, the composer, the toolbar itself and sidebar rows keep their own native
  context menus;
- when no usable toolbar button can be found (a draft session, or every button
  hidden), the plugin leaves the native menu alone.

### Settings

Settings → "Row menu" toggles every new entry:

| Switch | Effect |
| --- | --- |
| Open with | Hides "Open with" and every pinned app from workspace, session and conversation-body menus |
| Open with → applications | Hides individual applications; the adjacent "Pin" button promotes an app to the top level |
| Delete session | Hides the single-session delete entry in session menus |
| Allow deleting unarchived sessions | Off by default; also shows "Delete session permanently" on unarchived rows. Requires the previous switch |
| Delete all archived sessions | Hides the bulk-delete entry |
| Show archived sessions | Hides the workspace "Show / hide archived sessions" entry (on by default; the entry itself only appears when that workspace has archived sessions) |
| Menu placement → workspace | Per-entry choice between the right-click menu, the "…" menu, or both: New session, Default permission for new sessions, Open with, Copy workspace path, Open in new tab, archived-session toggle (placing it in the "…" menu also makes 0.2.1 take over the workspace ellipsis), Delete workspace and all sessions |
| Menu placement → session | Per-entry choice for session-row entries: Open with, Delete session, Delete all archived sessions |
| Enable blank-space context menu | Master switch for the conversation-body right-click menu (blank space, thinking blocks, replies; on by default); when off, that area keeps the browser/host native menu |
| Pin "More" to the far right | On by default; keeps a "More actions" style overflow trigger as the last row regardless of its current toolbar position |
| Show top-left status widgets | Off by default; also lists everything in the header's `conversation.session.header.actions` slot (Session cost, background-job counter, …) in the conversation-body menu |

Every placement defaults to "Right-click menu", so untouched installs keep the "…"
menu exactly as DSH ships it.

On DSH 0.2.2 and later the "…" button and right-click share one host menu; the
plugin tells them apart by the gesture mark, and only entries placed in "…" or
"Both" join that menu. On 0.2.1 workspace rows have no host menu to contribute to,
so the plugin takes over the "…" button and draws the menu itself with the same
placement rules.

Switches live in browser `localStorage` (`dsh.sidebar-row-menu.items.v1`,
`dsh.sidebar-row-menu.open-with.v1`, `dsh.sidebar-row-menu.open-with.pinned.v1`,
`dsh.sidebar-row-menu.placement.v1` and `dsh.sidebar-row-menu.blank-menu.v1`)
and apply immediately. The legacy `dsh.sidebar-row-menu.ellipsis.v1` booleans are
migrated on first load (true → "Both", false → "Right-click menu"). Before the
first explicit pin, the plugin derives one: the
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
npm install
npm run build:client
npm run test
npm run test:local
npm run check
npm run build
```

The client half lives in `src/client/**` (ESM, multiple files) and is bundled into the
single file `lib/client.js` by esbuild. **Do not edit `lib/client.js` by hand** — change
the sources and rebuild. Layout rules, naming and the release checklist are in
[AGENTS.md](AGENTS.md).

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
lib/client.js         browser half build artifact (bundled from src/client/**, do not edit)
src/client/           browser sources: i18n, constants, styles, stores, ui, features
scripts/build-client.mjs  esbuild bundler (--check verifies the artifact is fresh)
AGENTS.md             repository conventions: layering, naming, build and release
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

### Why archived sessions cannot use the global filter alone

DSH exposes one global archived-visibility filter (`archivedFilter`: hide archived /
all conversations / archived only) and no per-workspace equivalent. The plugin builds
the per-workspace layer on top of it: it drives the host view action to "all
conversations", then hides other workspaces' (and "Ungrouped") archived rows with an inline
`display:none`. The snapshot's `archivedSessionIds` tells it which rows are archived,
and a MutationObserver re-applies the hiding whenever React replaces the row nodes.
The plugin does not keep the global filter hostage: once the user picks a filter under
"View options", the per-workspace hidden set is cleared and the host's choice wins.

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
clears it before the host resolves, so the provider returns entries for the
right-click side or the "…" side according to each entry's "Menu placement".

### Why the conversation-body menu sorts by screen position

Toolbar order is not in the DOM: `dsh-sidebar-organizer` reorders with
`element.style.order`, and tucking an icon into "More actions" changes DOM
visibility. The conversation-body menu therefore caches nothing; at right-click time
it walks the `conversation.session.header` actions / utilities / corner slots, takes
each slot's direct children, flattens the buttons inside them (a split control
becomes its main button and its chevron), sorts by
`getBoundingClientRect().left`, and finally moves "More" to the end when that
switch is on. Organizer layouts, width-driven collapsing and temporarily hidden
buttons are all reflected automatically.

Selecting a row does not duplicate the action: it closes the plugin menu, waits one
tick, then dispatches `click` to the original header button, so host popovers stay
anchored to their real trigger. "More actions" is the exception — its button only
opens a host popover, so the menu walks the React fiber upwards (up to 8 levels) to
the host Menu's `items` / `onSelect`, renders the second level itself and calls
`onSelect(id)` directly.

Hit testing only accepts targets inside `conversation.session` that are outside the
header, composer, tool cards and interactive elements; inside a message node,
right-clicks are allowed (thinking blocks, replies, tool summaries) and only inputs,
links and `contenteditable` yield. A non-empty `window.getSelection()` also yields,
leaving the selection menu to the browser. When nothing matches, the event is left
untouched and the native menu opens as before.

"Open with" is a split control in the toolbar (main button plus chevron), so
flattening it would produce two rows. Collection therefore detects the split first
(two or more buttons, a split-ish container class, or a chevron labelled "More open
with"), tags that unit as the open-with group, and rendering reuses the workspace /
session menu treatment: the app catalog comes from `useApps` / `usePinned` /
`useChildren`, pinned apps render as top-level rows and the rest go into the
"Open with" submenu positioned by `submenuGeometry`. The session's `cwd` comes from
the selected row (`[data-row-key^="session:"][aria-selected="true"]`, falling back to
the sessions store row with `retainedBy.mainView > 0`); if the catalog or `cwd` is not
ready yet, the original split buttons are shown instead. When the logical section
changes (open-with / actions / utilities / corner / More), the next row gets
`separatorBefore`; the rule matches native menus (0.5px, 3px 8px margins, 12% white)
along with row height, padding and 14px icons.

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
  `vscode://file/...`; a failed resolution is no longer cached forever, so the next
  click re-probes after VS Code is installed;
- when `bin\code.cmd` is found, the sibling `Code.exe` is preferred so the launch
  bypasses `cmd.exe`; only an explicit `DSH_SCM_VSCODE` pointing at a `.cmd`/`.bat`
  keeps the cmd path, where `%VAR%` in the path is still expanded by cmd (Windows
  directory names almost never contain `%`);
- `DSH_SCM_VSCODE` must point to an existing file; a missing path now returns 500
  `vscode-launcher-missing` instead of silently falling back to another launcher;
- spawn uses `detached + stdio:'ignore'` and deliberately does **not** set
  `windowsHide` (otherwise Explorer windows would be hidden); an asynchronous
  launch failure (`error` event) now returns 500 `spawn-failed` instead of
  pretending the app started.

`POST /dsh-sidebar-row-menu/session/delete`, body `{ sessionIds: string[] }`.

- same loopback / POST / exact path / 64 KB body checks; `sessionIds` must be a
  non-empty array of non-empty strings, at most 500;
- before deleting, a running session is cancelled and given up to 3 seconds to stop;
  if it is still running the session is reported as failed and its transcript kept
  rather than removing files under an open handle; a live session is then detached
  and the transcript directory located through `sessionPersistence.locate()`; the
  directory's basename must equal the session id or deletion is refused (no
  parent-directory misfires);
- a cold session is looked up in the session list before deleting; when that query fails
  the session is reported as failed instead of being counted as already gone;
- after deleting, the directory is re-checked three times to ensure it did not come
  back, then the `workspaceRegistry` archive/pin records are cleared and
  `api-session/removed` is emitted;
- partial failures return `200` + `{ ok:false, deleted, failed, error }`; the dialog
  stays open and reports the counts.

`POST /dsh-sidebar-row-menu/workspace/delete`, body `{ workspaceId: string }`.

- same loopback / POST / 64 KB body checks; `workspaceId` must be a non-empty string;
- reads `workspaceRegistry.get(workspaceId).sessionIds` and permanently deletes each
  session with the flow above; workspaces with more than 500 sessions keep going in
  further batches instead of reporting success after the first 500;
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
  Open with 220, default permission for new sessions 225, Delete workspace and all
  sessions 310), interleaved by
  order with the native Rename (100), Reveal (200) and Delete workspace (300) and
  grouped with the same separators as the session menu.
  Right-click and the "…" button share the host's single menu; providers answer per
  entry according to the right-click gesture and that entry's "Menu placement".
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
- The conversation-body menu depends on the DOM of the three session-header slots
  (`conversation.session.header.actions` / `.utilities` / `.corner`) and on the
  host Menu's React fiber behind "More actions" (the second-level menu reads its
  items / onSelect). If DSH changes those extension points or the fiber shape, the
  affected menu silently falls back to native behaviour and still does not affect
  messages, the composer or the toolbar's own menus.

## Other DSH projects I work on

Right-click menus are only one corner of DSH. These are the other plugins I maintain — take what fits.

- **[dsh-sidebar-organizer](https://github.com/TLEWA/dsh-sidebar-organizer)** — a layout organizer for seven regions: sidebar, sidebar footer, conversation tabs, composer, session header, right panel, and settings navigation all support long-press drag to reorder, and panels can be tucked into "More".
- **[dsh-better-choice](https://github.com/TLEWA/dsh-better-choice)** — an `ask_user_question` enhancement: right-click an option to add a note, or ask the model a side question with the same context before choosing.
- **[dsh-if](https://github.com/TLEWA/dsh-if)** — the `/if` command: let the model judge a condition from prior context, then send the instruction below it as a user message only when it holds.
- **[dsh-utf8-output](https://github.com/TLEWA/dsh-utf8-output)** — fixes GBK/CP936/GB18030 mojibake from DSH subprocess output on Windows.
- **[dsh-opencode-go-router](https://github.com/TLEWA/dsh-opencode-go-router)** — rotates OpenCode Go routing after a context fold or a system-prompt rewrite, so less of the prompt cache is lost.
- **[dsh-fastload](https://github.com/TLEWA/dsh-fastload)** — trims the first history page of long sessions while preserving the tail the user actually sees.
- **[dsh-ptc-noargs](https://github.com/TLEWA/dsh-ptc-noargs)** — fixes rejected argument-less tool calls in PTC `run_code` by normalizing an omitted or `undefined` first argument to `{}`.

## License and notices

- Code: [MIT](LICENSE).
- Changelog: [CHANGELOG.md](CHANGELOG.md).
- Third-party code and full license texts: [NOTICE.md](NOTICE.md) · [English](NOTICE.en.md).
- AI usage and code provenance: [AI_USAGE.md](AI_USAGE.md) · [English](AI_USAGE.en.md).

Commercial and non-commercial use are both allowed, but the project comes with
**no warranty** under the MIT terms; review AI-assisted code before relying on it.

## Codex PR review

This repository adopts the v1 shared review block in AGENTS.md from [central CI](https://github.com/TLEWA/dsh-plugin-ci). Cloud Codex reviews PRs and new commits; maintainers retain final approval and merging. Review results must cover the latest commit. Review consumes subscription usage; use `@codex review` for missing results.
