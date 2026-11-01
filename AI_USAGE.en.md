# AI Usage and Code Provenance

[简体中文](AI_USAGE.md) · [English](AI_USAGE.en.md)

This document describes how artificial intelligence (AI) was used in
`dsh-sidebar-row-menu`, how the result was reviewed, where the code came from, and
the limits of the warranty. It does not modify any term of [LICENSE](LICENSE) (MIT).

## 1. Summary

- The **source code and documentation were produced mainly with AI assistance**;
  the project owner specified requirements, reviewed the result and verified behavior.
- AI is not a copyright holder. The project is released under MIT; the rights and
  obligations of users are governed solely by MIT.
- The project comes with **no warranty**. AI-generated code may contain errors,
  omissions, or behavior unsuitable for your environment.
- Copyright and licenses for third-party code are listed separately in
  [NOTICE.en.md](NOTICE.en.md); they are not changed by this project's MIT license.

## 2. Tools and models

- Development environment: DeepSeek Harness (DSH) coding agent.
- Model: `deepseek-flash` (DeepSeek).
- Interaction: the owner described requirements, reported defects and confirmed
  behavior in natural language; the agent read DSH built-in packages and existing
  plugin sources, wrote/refactored code, docs and tests, and verified them locally.

## 3. Scope of AI involvement

| Area | AI involvement | Notes |
| --- | --- | --- |
| `lib/client.js` | High | Initial version and all refactors written by AI |
| `lib/host/*.js` | High | Split out of `lib/index.js` and rewritten by AI |
| `test/*.test.mjs` | High | Cases and fake DOM/fiber written by AI |
| `scripts/install.ps1` | High | Written by AI and executed locally |
| `README*.md` / `NOTICE*.md` / this file | High | Drafted by AI and kept in sync |
| Requirements, defect triage, final trade-offs | Human | Decided by the owner |

No human rewrote every line. Human review focused on **behavioral verification**:
reading critical paths, running tests, and exercising the menus in a real DSH client.

## 4. Verified and not verified

Verified:

- 11 automated tests (host pure functions, route status codes, client wiring, slot
  registration, menu item order, session right-click delegation, clipboard content);
- on a Windows DSH desktop client: workspace right-click opens at the pointer,
  session right-click opens the native menu at the pointer including the plugin entries;
- the host `/open` route returns the expected status codes locally.

Not fully verified:

- every DSH version, theme, zoom level and multi-monitor setup;
- the `darwin` / `linux` launch branches (present in code, not exercised);
- every possible combination with other third-party plugins (the slot design is
  meant to compose, but was not exhaustively tested).

## 5. Code provenance

- Adapted from `dsh-sidebar-context-menu` (MIT, miao-ge) and `dsh-workspace-menu`
  (BSD-3-Clause, @0imzero); the exact scope, copyright notices and full license
  texts are in [NOTICE.en.md](NOTICE.en.md).
- DSH built-in packages were read only for public interfaces, types and runtime
  behavior; **no source code from them is copied**.
- The Git history records each change; `v1.0.0`, `v1.1.0` and `v1.2.0` mark
  behavioral milestones.

## 6. Data and privacy

- The plugin runs locally and contains **no telemetry, analytics or remote requests**.
- The client reads workspace/session objects already in DSH's memory (title, `cwd`,
  archived/pinned state) to build menus and copy paths/links.
- The host route accepts loopback requests only and opens **existing absolute
  directories** only.
- Clipboard writes happen only when you click "Copy path / Copy link / Copy ID".

## 7. Recommendations

1. Before using it in production, read `lib/client.js` and `lib/host/*.js` and
   confirm the behavior matches your expectations.
2. Run `npm run test` (or `npm run test:local` in restricted environments).
3. Keep `NOTICE.md` and `LICENSE` to satisfy the upstream MIT / BSD-3-Clause
   attribution requirements.
4. If AI-generated code causes a problem, please open an issue or a PR; human
   fixes are welcome.

## 8. Disclaimer

The project is provided "as is", without any express or implied warranty,
including but not limited to merchantability, fitness for a particular purpose and
non-infringement. The authors and contributors are not liable for any direct or
indirect damages arising from its use. The complete terms are in [LICENSE](LICENSE).
