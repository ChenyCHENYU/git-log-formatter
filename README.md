<div align="center">

<img src="./docs/assets/banner.svg" alt="git-log-formatter" width="100%" />

**一眼看懂的 git log** —— 彩色格式化 · 智能相对时间 · 类型分色 · 自动分页

[![npm version](https://img.shields.io/npm/v/git-log-formatter?style=flat-square&color=818CF8&labelColor=0B1020)](https://www.npmjs.com/package/git-log-formatter)
[![npm downloads](https://img.shields.io/npm/dm/git-log-formatter?style=flat-square&color=22D3EE&labelColor=0B1020)](https://www.npmjs.com/package/git-log-formatter)
[![CI](https://img.shields.io/github/actions/workflow/status/ChenyCHENYU/git-log-formatter/ci.yml?style=flat-square&label=CI&labelColor=0B1020)](https://github.com/ChenyCHENYU/git-log-formatter/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-MIT-C084FC?style=flat-square&labelColor=0B1020)](./LICENSE)
[![Node](https://img.shields.io/badge/Node-%E2%89%A5%2018-5FA04E?style=flat-square&labelColor=0B1020&logo=node.js&logoColor=white)](https://nodejs.org/)

[安装](#安装) · [使用](#使用) · [输出示例](#输出示例) · [工作原理](#工作原理) · [FAQ](#faq)

</div>

## 它解决什么问题

`git log` 默认输出信息密度低：哈希、日期、作者、描述挤在一起没有层次，提交类型（feat / fix / refactor）完全不可见，`HEAD` 在哪个分支也看不到。

git-log-formatter 把每条提交渲染成一行彩色结构化输出：哈希、**智能相对时间**、按语义分色的**提交类型**、描述、作者、`HEAD`/分支/tag 各归其位；输出超过一屏时自动分页，短输出直接打印。

```
a1b2c3d - 3小时前      【feat】 订单导出支持异步任务 [CHENY] (HEAD -> main)
```

## 安装

**全局安装（推荐）**——自动配置 `git lg` 全局别名，任何仓库直接 `git lg`：

```bash
npm install -g git-log-formatter
# pnpm 需要允许安装脚本：
pnpm add -g git-log-formatter --allow-build=git-log-formatter
```

**项目内安装**（不写全局配置）：

```bash
npm install git-log-formatter -D
npx git-lg
```

## 使用

所有 `git log` 参数原样透传：

```bash
git lg                    # 全部分支提交，超一屏自动分页
git lg -5                 # 最近 5 条
git lg --oneline          # 简洁格式（同样上色）
git lg --graph            # 提交图，连接线青色
git lg --grep="fix"       # 搜索提交
git lg --stat             # 带文件统计
git lg --author="CHENY"   # 按作者过滤
git lg dev..main          # 范围查询
```

**行为开关**（写在 git config 里，无需额外配置文件）：

```bash
git config --global lg.relativeDate false   # 关闭智能相对时间，回到绝对时间
git config --global lg.showRefs false       # 隐藏 HEAD/分支/tag 装饰
```

**分页器**遵循 git 同款优先级：`GIT_PAGER` > `core.pager` > `PAGER` > `less`。`GIT_PAGER=cat` 禁用分页；裸 `less` 自动补 `-R -F -X`，自带参数或其他分页器（如 delta）原样尊重。

## 输出示例

```
a1b2c3d - 3小时前      【feat】 订单导出支持异步任务 [CHENY] (HEAD -> main)
4d5e6f7 - 3天前       【fix】 修复登录态丢失 [wang]
8a9b0c1 - 2025-11-30  【refactor(api)】 抽离表格请求层 [CHENY]
7d8e9f0 - 05-10       更新依赖 [li]
```

- **智能相对时间**：刚刚 / N分钟前 / N小时前 / N天前，7 天外同年显示 `月-日`、跨年带年份，并按显示宽度对齐；传 `--date=*` 或配置 `lg.relativeDate false` 回到绝对时间
- **refs 一并显示**：`HEAD -> 分支`、tag 等装饰信息显示在行尾
- **类型分色**：feat 绿、fix 红、refactor 蓝、docs/test 青/紫、chore 灰，未知类型品红；`feat(api):`、`feat!:` 的 scope 与破坏性标记一并显示
- **--graph 支持**：连接线与前缀整体染青色，配合 `git lg --graph` 使用

## 工作原理

1. 以 `--color=never --pretty=format` 加不可见分隔符（`\x1f`）调用 `git log` 取数（哈希、日期、时间戳、描述、作者、refs），其余参数透传——提交信息或作者名里的 `|` 等字符不会干扰解析
2. 逐行解析后用 chalk 上色：哈希红色加粗、日期黄色（智能相对时间并按显示宽度对齐）、类型按语义分色、描述白色、作者绿色、refs 青色；`--oneline` 透传时同样给哈希与描述上色
3. **智能分页**：输出超过一屏时管道给分页器（`GIT_PAGER` > `core.pager` > `PAGER` > `less`，裸 less 补 `-R -F -X`），一屏内的内容自动退出，行为与 git 默认分页器一致；分页器不可用时自动降级为直接打印
4. 输出被重定向或管道给其他命令（非终端）时自动去色，并尊重 `NO_COLOR` 环境变量

**关于安装脚本**：全局安装时 postinstall 会通过 `git config --global` 写入 `lg` 别名（检测到已有 `lg` 别名时先备份为 `lg-backup` 再覆盖，重复安装幂等）；项目内安装只打印提示、不写任何配置，CI 环境自动跳过。不想被写配置就用项目内安装或 npx。

## FAQ

<details>
<summary><b>为什么我的输出没有进分页？</b></summary>

输出不超过一屏时直接打印；超过一屏时进入 `less -F`，此时如果内容恰好缩到一屏内（如窗口变大），`-F` 会让 less 自动退出，观感同直接打印。这是与 git 默认分页器一致的行为。

</details>

<details>
<summary><b>已经配置过自己的 git lg 别名会冲突吗？</b></summary>

全局安装时脚本通过 `git config --global` 检测已有 `lg` 别名，先把原别名**备份为 `lg-backup`**（仅首次，重复安装不会刷新备份）再覆盖为指向本包，随时可用 `git config --global --get alias.lg-backup` 查看并恢复。想完全不被触碰，请用项目内安装方式。

</details>

<details>
<summary><b>Windows 支持吗？</b></summary>

支持，CI 在 ubuntu / macOS / Windows 三平台跑全量测试。Windows Terminal 与 VS Code 终端原生支持 ANSI 颜色；分页器按 `GIT_PAGER` > `core.pager` > `PAGER` > `less` 解析，系统没有 `less` 时自动降级为直接打印。

</details>

## 兼容性

| 项目 | 要求 |
|------|------|
| Node.js | `>= 18` |
| Git | `>= 2.x` |
| 依赖 | 仅 `chalk` 一个运行时依赖，测试用内置 `node:test` |

## 开发

```bash
npm test   # node --test test/（格式化逻辑 / CLI / postinstall 全覆盖）
```

## 版本历史

见 [GitHub Releases](https://github.com/ChenyCHENYU/git-log-formatter/releases) 与 [提交记录](https://github.com/ChenyCHENYU/git-log-formatter/commits/main)。

## 贡献

欢迎提交 [Issue](https://github.com/ChenyCHENYU/git-log-formatter/issues) 与 Pull Request。

## 许可证

[MIT](./LICENSE) © 2025-present CHENY

## 作者

**CHENY** · [GitHub @ChenyCHENYU](https://github.com/ChenyCHENYU)

---

<div align="center">
  <sub>如果这个工具对你有帮助，欢迎点一个 ⭐ 让更多人看到。</sub>
</div>
