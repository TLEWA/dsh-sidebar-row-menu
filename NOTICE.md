# NOTICE / 第三方声明

[简体中文](NOTICE.md) · [English](NOTICE.en.md)

`dsh-sidebar-row-menu`（MIT）在实现过程中参考并改编了两个现有 DSH 插件的代码。
下列版权与许可条件适用于被改编的部分；其余代码版权归本项目贡献者所有。

## dsh-sidebar-context-menu

- 作者：miao-ge
- 版本：0.2.0
- 许可证：MIT
- 仓库：https://github.com/miao-ge/dsh-sidebar-context-menu
- 复用范围：
  - 宿主：loopback 围栏、JSON 请求体读取、detached spawn、VS Code 启动器探测、
    `vscode://file` 编码（现拆分在 `lib/host/security.js`、`lib/host/launch.js`、
    `lib/host/paths.js`、`lib/host/route.js`）；
  - 客户端：fiber 解析、官方 `Menu` 挂载、toast、`contextmenu` 捕获安装方式。

## dsh-workspace-menu

- 作者：@0imzero
- 版本：2.0.3
- 许可证：BSD-3-Clause
- 复用范围：客户端服务调用方式（`ctx.uiWorkspace` 的 pin / archive / unarchive /
  fork / openSession）与会话深链接 `?session=<id>` 的构造方式。v1.1 起会话动作
  改为官方 slot 条目，不再直接调用这些服务，但设计仍受其启发。

## DeepSeek Harness 内置包

本项目通过阅读 DSH 客户端内置包（`@deepseek-ai/dsh-client-ui-workspace`、
`@deepseek-ai/dsh-client-ui-renderer` 等，版本 `0.2.1-rc.5`）的公开接口与类型来对接
slot、`Menu` 和行组件 props。**没有复制其源代码**；内置包的版权归 DeepSeek 所有，
其许可不因本项目的 MIT 许可而改变。

## AI 辅助说明

本项目的代码与文档在 AI 辅助下完成，范围、验证方式与免责声明见
[AI_USAGE.md](AI_USAGE.md)。

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
