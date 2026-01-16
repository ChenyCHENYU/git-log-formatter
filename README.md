# Git Log Formatter

一个美观的git日志格式化工具，提供彩色输出和智能分页功能。

## 特性

- 🌈 彩色输出，提高可读性
- 📝 自动解析提交类型和描述
- 📄 智能分页浏览（短输出直接显示，长输出自动分页）
- 🔧 兼容所有 git log 参数
- 🚀 零配置，开箱即用
- ⚡ 一键安装，自动配置别名
- 🎯 无感项目集成，作为依赖自动配置

## 安装

全局安装后自动配置 `git lg` 命令：

```bash
npm install -g git-log-formatter
```

就这么简单！安装完成后在任何 Git 仓库中都可以使用 `git lg`。

<details>
<summary>使用其他包管理器？点击展开</summary>

### pnpm

pnpm v10+ 默认阻止执行安装脚本（安全策略），需要允许：

```bash
pnpm add -g git-log-formatter --allow-build=git-log-formatter
```

### yarn / bun

```bash
yarn global add git-log-formatter
bun add -g git-log-formatter
```

</details>

### 本地安装（无需配置）

如果只想在项目中临时使用，无需全局安装：

```bash
# 添加到项目依赖
npm install --save-dev git-log-formatter

# 使用 npx 调用
npx git-log-formatter -10
npx git-log-formatter --grep="fix"
```

> **注意**：本地安装无法使用 `git lg` 快捷命令，需使用 `npx git-log-formatter`。

1. 全局安装包：

```bash
# npm
npm install -g git-log-formatter

# pnpm
pnpm add -g git-log-formatter

# yarn
yarn global add git-log-formatter

# bun
bun add -g git-log-formatter
```

2. 在全局 `.gitconfig` 文件中添加别名：

```ini
[alias]
    lg = "!f() { npx git-log-formatter \"$@\"; }; f"
```

## 使用方法

安装完成后，可以使用以下命令：

```bash
git lg              # 显示所有提交，自动分页
git lg -5           # 显示最近5个提交
git lg --oneline    # 使用简洁格式
git lg --grep="fix" # 搜索包含"fix"的提交
```

## 高级用法

### 指定显示的提交数量

```bash
git lg -50      # 显示最近50条提交
git lg -10      # 显示最近10条提交
```

### 使用 git log 参数

```bash
git lg --all                    # 显示所有分支的提交
git lg --grep="feat"            # 只显示包含"feat"的提交
git lg --since="2023-11-01"    # 显示指定日期之后的提交
git lg --author="张三"           # 只显示特定作者的提交
```

### 组合使用

```bash
git lg --grep="fix" -20        # 显示最近20条包含"fix"的提交
git lg --all --grep="feat"      # 在所有分支中搜索包含"feat"的提交
```

## 颜色说明

- 🔴 红色：提交哈希
- 🟡 黄色：提交日期
- 🟣 紫色：提交类型（如 feat、fix、docs 等）
- ⚪ 白色：提交描述
- 🟢 绿色：作者名称

## 团队使用

推荐在团队文档中统一安装命令：

```bash
npm install -g git-log-formatter
```

简单、可靠、零配置。

## 分页说明

- 默认情况下，当输出超过终端高度时自动使用分页器
- 对于特殊参数（如 `--oneline`、`-5` 等）不使用分页器
- 在分页器中，使用 `q` 键退出，使用方向键或 `j/k` 键导航

## 许可证

MIT
