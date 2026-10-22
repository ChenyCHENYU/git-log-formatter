<div align="center">

<img src="./docs/assets/banner.svg" alt="git-log-formatter" width="100%" />

**一眼看懂的 git log** —— 彩色格式化 + 智能分页

[![npm version](https://img.shields.io/npm/v/git-log-formatter?style=flat-square&color=818CF8&labelColor=0B1020)](https://www.npmjs.com/package/git-log-formatter)
[![npm downloads](https://img.shields.io/npm/dm/git-log-formatter?style=flat-square&color=22D3EE&labelColor=0B1020)](https://www.npmjs.com/package/git-log-formatter)
[![License](https://img.shields.io/badge/License-MIT-C084FC?style=flat-square&labelColor=0B1020)](./LICENSE)
[![Node](https://img.shields.io/badge/Node-%E2%89%A5%2016-5FA04E?style=flat-square&labelColor=0B1020&logo=node.js&logoColor=white)](https://nodejs.org/)

[安装](#安装) · [使用](#使用) · [输出示例](#输出示例) · [工作原理](#工作原理) · [FAQ](#faq)

</div>

## 它解决什么问题

`git log` 默认输出信息密度低：哈希、日期、作者、描述挤在一起没有层次，提交类型（feat / fix / refactor）完全不可见。

git-log-formatter 把每条提交渲染成一行彩色结构化输出，哈希、时间、**提交类型**、描述、作者各归其位；输出超过一屏时自动进入 `less` 分页，短输出直接打印。

```
a1b2c3d - 2026-10-21 10:30:45 【feat】 订单导出支持异步任务 [CHENY]
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
git lg -5                 # 最近 5 条（短输出直接打印）
git lg --oneline          # 简洁格式（原文透传，不做格式化）
git lg --grep="fix"       # 搜索提交
git lg --stat             # 带文件统计
git lg dev..main          # 范围查询
```

## 输出示例

```
a1b2c3d - 2026-10-21 10:30:45 【feat】  订单导出支持异步任务 [CHENY]
4d5e6f7 - 2026-10-20 18:12:03 【fix】   修复登录态丢失 [wang]
8a9b0c1 - 2026-10-20 09:44:31 【refactor】 抽离表格请求层 [CHENY]
7d8e9f0 - 2026-10-19 22:05:17  chore: 更新依赖 [li]
```

符合 `type: subject` 约定式提交的行会高亮提交类型；不符合的按普通描述着色。

## 工作原理

1. 以 `--color=never --pretty=format:"%h|%ad|%s|%an"` 调用 `git log`，其余参数透传
2. 逐行解析后用 chalk 上色：哈希红色加粗、日期黄色、类型品红、描述白色、作者绿色
3. **智能分页**：输出行数超过终端高度且非 `--oneline` / `-n` / `--grep` / `--stat` 等短输出场景时，管道给 `less -R -F -X`（保留颜色、短内容不进分页、退出不清屏）；`less` 不可用时直接打印

**关于安装脚本**：全局安装时 postinstall 会向 `~/.gitconfig` 写入 `lg` 别名（如检测到已有 `lg` 别名会提示并覆盖为指向本包）；项目内安装只打印提示、不写任何配置。不想被写配置就用项目内安装或 npx。

## FAQ

<details>
<summary><b>为什么我的输出没有进分页？</b></summary>

行数未超过终端高度，或你传了 `-n` / `--grep` / `--stat` 等参数（视为短输出场景）时直接打印，这是预期行为。

</details>

<details>
<summary><b>已经配置过自己的 git lg 别名会冲突吗？</b></summary>

全局安装时脚本检测到已有 `lg` 别名，会把原别名**备份为 `lg-backup`** 后再覆盖为指向本包（`~/.gitconfig` 中随时可恢复）。想完全不被触碰，请用项目内安装方式。

</details>

<details>
<summary><b>Windows 支持吗？</b></summary>

支持。颜色按 Windows 终端兼容级别输出；分页依赖系统 `less`，不可用时自动降级为直接打印。

</details>

## 兼容性

| 项目 | 要求 |
|------|------|
| Node.js | `>= 16` |
| Git | `>= 2.x` |
| 依赖 | 仅 `chalk` 一个运行时依赖 |

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
