## 这个 PR 做了什么

DSH 0.2.2-rc.2 起，宿主自己给带子菜单的菜单项画右侧箭头，会话行右键也改成原生 `contextMenus` 渲染。插件原先无条件自绘箭头、并继续往旧 slot 注册会话条目，于是在 rc.2+ 上出现两个 `>`，会话菜单里原生「在应用中打开」与插件的「打开方式」也重复。本 PR 按宿主能力分支修复：

- **双箭头**：工作区的「打开方式」「新会话默认权限」保留插件兜底箭头；检测到宿主已经画了箭头（`button[aria-haspopup="menu"]:has(> svg)`）时用 CSS 隐藏插件箭头。0.2.2-rc.1 及更早没有宿主箭头，兜底箭头照常显示。
- **会话菜单跟进原生实现**：rc.2 起注册 `ctx.contextMenus` 原生贡献（置顶应用 495 / 打开方式 500 / 永久删除 510 / 删除所有已归档 520），不再注册旧 slot 条目；原生「在应用中打开」在带插件标记的面板里用 CSS 隐藏，避免与「打开方式」重复，行尾「…」菜单仍保留它。
- **兼容回退**：读不到 `__DSH_BOOT__.release.version` 时按旧宿主处理；`contextMenus` 服务未就绪时每 250ms 重试、40 次后回退到 slot。
- **手势稳定**：`menuGesture` 改为粘性，宿主异步重解析贡献时右键条目不会中途消失；「…」菜单仍按 placement 设置隐藏右键条目。

## 验证方式

- 真机 DSH 0.2.2-rc.3：会话右键 `panels=1`，原生「在应用中打开」`display:none`，插件「打开方式」只剩宿主箭头（`directSvgs=1`，插件角标 `display:none`）；工作区「打开方式」「新会话默认权限」各只有 1 个箭头；行尾「…」菜单按默认 placement 不出现插件条目。
- 回归测试：`npm test` 84/84 通过，`npm run check` 通过。
- 本地 gate：`npx --yes --package=github:TLEWA/dsh-plugin-ci#v1 dsh-ci-gate` → PASS 17 ok / 0 fail / 1 skip。

## 自检

- [x] 我读过 PROCESS.md 与 docs/gates.md
- [x] 本地 gate 全绿（`npx --yes --package=github:TLEWA/dsh-plugin-ci#v1 dsh-ci-gate`）
- [x] 新增或修改的行为有对应测试
- [x] 中英文文档与 CHANGELOG 已同步
- [x] 没有新增 .only / .skip / 抑制注释，没有复制 gate 脚本或改成 @main

## 发布影响

- [x] 不改变已发布行为（若改变，已在 CHANGELOG 写明破坏性变更）

仅影响 0.2.2-rc.2 及以上的预发布宿主；rc.1 及更早的行为保持不变，无破坏性变更。
