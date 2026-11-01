# NOTICE / Third-party notices

[简体中文](NOTICE.md) · [English](NOTICE.en.md)

`dsh-sidebar-row-menu` (MIT) was implemented with reference to, and adaptation of,
two existing DSH plugins. The copyright and license conditions below apply to the
adapted portions; all remaining code is copyright its contributors.

## dsh-sidebar-context-menu

- Author: miao-ge
- Version: 0.2.0
- License: MIT
- Repository: https://github.com/miao-ge/dsh-sidebar-context-menu
- Reused:
  - host: loopback fence, JSON body reader, detached spawn, VS Code launcher
    detection, `vscode://file` encoding (now split across
    `lib/host/security.js`, `lib/host/launch.js`, `lib/host/paths.js`,
    `lib/host/route.js`);
  - client: fiber lookup, official `Menu` mounting, toast, capture-phase
    `contextmenu` installation.

## dsh-workspace-menu

- Author: @0imzero
- Version: 2.0.3
- License: BSD-3-Clause
- Reused: the client-service call pattern (`ctx.uiWorkspace` pin / archive /
  unarchive / fork / openSession) and the `?session=<id>` deep-link construction.
  Since v1.1 the session actions are official slot entries rather than direct
  service calls, but the design was informed by this plugin.

## DeepSeek Harness built-in packages

The project interoperates with slots, `Menu` and row-component props by reading the
public interfaces and types of DSH client packages
(`@deepseek-ai/dsh-client-ui-workspace`, `@deepseek-ai/dsh-client-ui-renderer`,
etc., version `0.2.1-rc.5`). **No source code from those packages is copied.**
Their copyright remains with DeepSeek and is not relicensed by this project's MIT
license.

## AI assistance

Code and documentation were produced with AI assistance. Scope, verification and
disclaimers are documented in [AI_USAGE.en.md](AI_USAGE.en.md).

---

### MIT License (dsh-sidebar-context-menu)

Copyright (c) miao-ge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### BSD-3-Clause License (dsh-workspace-menu)

Copyright (c) 2025, @0imzero

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
