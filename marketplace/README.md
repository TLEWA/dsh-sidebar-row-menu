# 插件市场提交准备

目标列表：[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)（贡献指南见
[contributing.md](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)）。

本目录只放**待提交的条目文件**，不参与 npm 打包，也不影响插件运行。

## 当前状态

| 项目 | 状态 |
| --- | --- |
| 仓库地址 | https://github.com/TLEWA/dsh-sidebar-row-menu |
| `dsh.bundle` manifest | 已声明（`package.json` → `dsh.bundle.patch`） |
| `cordis.patch.yml` | 已存在，含 `insert` 行 |
| 许可证 | MIT |
| 分类 | `ui` |
| 图标 | `assets/icon-180.png`（180×180 PNG，GitHub 托管） |
| 预构建包 | Release 里的无版本号 `dsh-sidebar-row-menu.tgz`（`latest/download/` 别名） |
| `dsh-plugin` topic | **待添加**（见下方第 1 步） |
| 仓库创建时间 | `2026-11-01T18:06:42Z` |
| 可提交时间 | `2026-11-02T18:06:42Z`，即 **2026-11-03 02:06（北京时间）** |

## 提交前检查

```powershell
npm run marketplace:check          # 含 GitHub 在线检查
npm run marketplace:check -- --offline   # 只查本地文件
```

脚本会核对：`dsh.bundle`、patch 内容、MIT、仓库字段、图标尺寸、条目字段、
仓库年龄、`dsh-plugin` topic、tarball 与图标的可访问性。全部 `PASS` 才是 `READY`。

## 提交步骤

1. **给仓库加 topic**（必须）：GitHub 仓库页 → About 齿轮 → Topics 添加
   `dsh-plugin`；保留现有的 `dsh`、`deepseek-harness`、`plugin`、`sidebar`、
   `context-menu`、`vscode`。
2. Fork `awesome-dsh-plugin/awesome-dsh-plugin`。
3. 在新分支添加**一个文件**：
   `data/plugins/TLEWA__dsh-sidebar-row-menu.yml`，内容就是本目录下的
   [`TLEWA__dsh-sidebar-row-menu.yml`](TLEWA__dsh-sidebar-row-menu.yml)。
4. 不要改该仓库的两个 README，它们由 `data/plugins/*.yml` 自动生成。
5. 提交 PR，标题建议：`Add TLEWA/dsh-sidebar-row-menu`。
   正文一句话说明插件做什么即可；如被 `held: author`，按评论改同一分支。

## 条目说明

- `category: ui`：插件只改侧边栏行的右键交互，不涉及模型、会话存储或工具协议。
- 描述只写实际存在的行为：工作区/会话行的指针处右键菜单，以及在 VS Code、
  资源管理器中打开、复制路径、复制会话链接。没有写“多少个功能”这类数字。
- `tarball` 使用 `latest/download/` + 不带版本号的文件名，因此不会在下次发版后因
  文件名变化而 404；release 工作流会同时上传带版本号和不带版本号的两份资产。
  注意：`latest` 指向按发布时间最新的 release，仓库不要随意把旧 release 标成 latest。

- 没有声明 `screenshots.json`：目前没有可用的真实界面截图，市场会回退到从
  README 抽取图片；等有截图后再加，不伪造截图。

## 收录后

不需要再改本仓库。若条目需要更新（描述、分类、tarball），改的是列表仓库里
自己那一个 yml，并只改自己那一条。
