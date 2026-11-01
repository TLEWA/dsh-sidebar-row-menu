# dsh-sidebar-row-menu

<img src="https://raw.githubusercontent.com/TLEWA/dsh-sidebar-row-menu/main/assets/icon-180.png" width="96" align="right" alt="Plugin icon" />

[![CI](https://github.com/TLEWA/dsh-sidebar-row-menu/actions/workflows/ci.yml/badge.svg)](https://github.com/TLEWA/dsh-sidebar-row-menu/actions/workflows/ci.yml)
[![Release](https://github.com/TLEWA/dsh-sidebar-row-menu/actions/workflows/release.yml/badge.svg)](https://github.com/TLEWA/dsh-sidebar-row-menu/releases)

[简体中文](README.md) · [English](README.en.md)

Right-click menus for the sidebar of [DeepSeek Harness](https://github.com/deepseek-ai) (DSH):

- **Workspace rows** — right-click opens a menu (a reimplementation of
  `dsh-sidebar-context-menu`'s capabilities);
- **Session rows nested under a workspace** — right-click opens that row's native
  "…" menu at the pointer, with the plugin's own entries appended.

Menus are rendered with DSH's official `Menu` component, so visuals, positioning,
keyboard navigation and click-outside dismissal match the built-in "…" menus.
The workspace menu is composed by this plugin. Session menu content comes from the
`sidebar.workspaces.session.menu.item` slot — built-in actions and other plugins'
actions are all there. This plugin only appends its own entries; it does not copy
or hardcode any built-in action.

> The "…" button menu stays exactly as DSH ships it. The plugin's three entries
> appear only when the menu is opened by right-click. A right-click menu does not
> close when the pointer leaves it (same as the workspace menu); it closes only on
> an outside click, an item selection, or Escape.

## Features

### Workspace row

| Item | Behavior |
| --- | --- |
| New session | Expands the workspace and starts a session (same as the row's `+`) |
| Rename | Opens the official "Rename workspace" dialog |
| Open in VS Code | Host opens the workspace directory in a new window |
| Open in Explorer | Host opens the system file manager |
| Copy workspace path | Copies the directory path |
| Open in new tab | Only when `dsh-project-tabs` (exposing `openWorkspaceInTab`) is installed |
| Delete workspace | Opens the official delete confirmation |

### Session row

Right-click does not build a second menu; it opens the row's own "…" menu:

| Source | Entries |
| --- | --- |
| DSH built-ins | Rename, Fork session, Pin / Unpin, Archive / Unarchive, Copy Session ID |
| Other plugins | Whatever they register into `sidebar.workspaces.session.menu.item` |
| This plugin | Open in VS Code, Open in Explorer, Copy session link |

The three entries added by this plugin:

| Item | Behavior |
| --- | --- |
| Open in VS Code | Uses the session's `cwd`, falling back to its workspace directory |
| Open in Explorer | Same as above |
| Copy session link | Copies the `?session=<id>` deep link |

These three are **right-click only**: they do not mount when the "…" button opens
the menu. A short-lived window flag is set before opening; outside that window the
entries render `null`.

Blank draft sessions have no native "…" menu and are left alone. Rows that are
neither a workspace nor a session (e.g. "Show more") are not intercepted.

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
dsh-sidebar-row-menu@1.3.3
```

Equivalent command line:

```powershell
dsh plugin --profile desktop add dsh-sidebar-row-menu@1.3.3
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
https://github.com/TLEWA/dsh-sidebar-row-menu#v1.3.3
```

Or install the tarball built by Actions directly, without Git:

```
https://github.com/TLEWA/dsh-sidebar-row-menu/releases/download/v1.3.3/dsh-sidebar-row-menu-1.3.3.tgz
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
skipped, and clipboard content for copy-link. Real fibers and services still need
a manual check in a running GUI.

Layout:

```
lib/index.js          host entry: name / inject / apply plus re-exported helpers
lib/host/security.js  loopback request fence
lib/host/paths.js     path validation, vscode://file encoding
lib/host/launch.js    VS Code / Explorer launching
lib/host/route.js     /open route and HTTP status codes
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
`memoizedProps`. If nothing matches it does not intercept at all.

### Why session actions are not hardcoded

The native "…" menu is not a hardcoded button list: it is
`renderSlot('sidebar.workspaces.session.menu.item', ...)`. Fork, pin, archive and
third-party actions are all slot entries. Slot ownership is enforced by the
renderer: an entry may only render child slots it declared itself, so a third
party cannot re-layout someone else's slot.

Therefore a session right-click does exactly one thing: find the `Menu` in the
row's fiber subtree and trigger its anchor (the ellipsis button). The same slot
content opens. The plugin's own three actions are registered through
`ctx.slots.inject` + `ctx.slots.register`, so:

- they do not depend on built-in fork/pin entries existing;
- new entries from DSH or other plugins show up automatically;
- no built-in action is copied or hardcoded.

Workspace rows have no such slot, so their menu is still composed by this plugin.

### Why the session menu appears at the pointer

The official `Menu` anchors to the ellipsis button, i.e. to the right of it. On
right-click the plugin temporarily points that button's (and two ancestors')
`getBoundingClientRect` at the pointer as a `0×0` rect. `Menu` re-reads the anchor
rect every frame, so the panel lands next to the cursor. The original methods are
restored as soon as the panel leaves `body`, so the button menu keeps its normal
position.

The "…" menu and the right-click menu share one `Menu` instance and one slot
content; the only difference is the `rightClickMenuUntil` window — the plugin's
three entries mount only inside it, and the window is cleared when the menu closes.

### Why the workspace menu is mounted imperatively

A contextmenu event is not part of React's render flow. The workspace menu creates
a `0×0`, `z-index:2147483647` host on demand, `createRoot`s the official `Menu`
(`portal` plus an explicit `getAnchorRect` pinned to the pointer), and unmounts and
removes the host on close. The session menu mounts nothing new; it only opens the
row's existing menu.

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

## Compatibility

Built against DSH client `0.2.1-rc.5` (`ProjectRowItem`, `SessionNodeItem`,
`Menu`). If a DSH upgrade changes those row components or the menu positioning:

- workspace right-click silently stops appearing (no error, no UI breakage);
- session right-click falls back to opening next to the "…" button, with correct content.

## Known limitations

- Depends on the props shape of the built-in row components. If DSH changes them,
  right-click silently does nothing.
- Session right-click depends on the row's `Menu` staying in the fiber subtree. If
  it is not found, the plugin clicks the row-actions ellipsis button; failing that
  it gives up — it never builds a competing menu and never triggers row open.
- Session "delete" is not offered: DSH officially supports archive (recoverable).
  Deleting records by force tends to leave orphan data. Archive/unarchive is
  handled by the built-in menu entry.
- The VS Code / Explorer directory for a session comes from `sessions.list`'s
  `cwd`, falling back to the workspace directory. Ungrouped sessions may have no
  directory; in that case a "no directory available" toast is shown.

## License and notices

- Code: [MIT](LICENSE).
- Third-party code and full license texts: [NOTICE.md](NOTICE.md) · [English](NOTICE.en.md).
- AI usage and code provenance: [AI_USAGE.md](AI_USAGE.md) · [English](AI_USAGE.en.md).

Commercial and non-commercial use are both allowed, but the project comes with
**no warranty** under the MIT terms; review AI-assisted code before relying on it.
