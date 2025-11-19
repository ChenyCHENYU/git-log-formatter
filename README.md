# Robot Admin Git Log Formatter

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

### 方法一：项目依赖安装（推荐，无感安装）

在您的项目中添加为开发依赖：

```bash
npm install --save-dev robot-admin-git-log
# 或使用 bun
bun add --dev robot-admin-git-log
```

安装时会自动配置 `git lg` 命令，无需手动设置！

### 方法二：一键安装

```bash
npx robot-admin-git-log install
```

这会自动在您的全局 `.gitconfig` 文件中添加所需的别名。

### 方法三：手动安装

1. 安装包：

```bash
npm install -g robot-admin-git-log
```

2. 在全局 `.gitconfig` 文件中添加别名：

```ini
[alias]
    lg = "!f() { npx robot-admin-git-log \"$@\"; }; f"
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

### 项目集成方式（推荐）

在项目的 `package.json` 中添加依赖：

```json
{
  "devDependencies": {
    "robot-admin-git-log": "^1.0.0"
  }
}
```

团队成员安装项目依赖时会自动获得 `git lg` 命令，无需额外配置！

### 全局安装方式

团队成员只需运行以下命令即可完成安装：

```bash
npx robot-admin-git-log install
```

无需手动配置任何文件，安装脚本会自动处理所有配置。

## 分页说明

- 默认情况下，当输出超过终端高度时自动使用分页器
- 对于特殊参数（如 `--oneline`、`-5` 等）不使用分页器
- 在分页器中，使用 `q` 键退出，使用方向键或 `j/k` 键导航

## 许可证

MIT
