#!/usr/bin/env node

import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 检测是否为全局安装
function isGlobalInstall() {
  try {
    const globalNodeModules = execSync("npm root -g", {
      encoding: "utf8",
    }).trim();
    return (
      __dirname.startsWith(globalNodeModules) ||
      __dirname.includes("node_modules\\pnpm\\global") ||
      __dirname.includes("node_modules/pnpm/global") ||
      __dirname.includes(".npm-global") ||
      __dirname.includes("/.local/share/pnpm") ||
      __dirname.includes("\\AppData\\Local\\pnpm")
    );
  } catch {
    return false;
  }
}

// 本地安装提示
if (!isGlobalInstall()) {
  console.log("📦 Git Log Formatter 已安装到项目中");
  console.log("\n💡 使用方法：npx git-log-formatter");
  console.log("\n✨ 如需全局 `git lg` 命令，请全局安装：");
  console.log("  npm install -g git-log-formatter");
  console.log(
    "  pnpm add -g git-log-formatter --allow-build=git-log-formatter"
  );
  process.exit(0);
}

// 全局安装：自动配置 git alias
const homeDir = os.homedir();
const gitConfigPath = path.join(homeDir, ".gitconfig");

console.log("🚀 正在配置全局 git lg 命令...\n");

// 检查 .gitconfig 文件是否存在
if (!fs.existsSync(gitConfigPath)) {
  console.log("❌ 未找到 .gitconfig 文件");
  console.log("请先配置 Git：");
  console.log('  git config --global user.name "您的名字"');
  console.log('  git config --global user.email "您的邮箱"');
  process.exit(1);
}

// 读取现有的 .gitconfig 文件
let gitConfigContent = fs.readFileSync(gitConfigPath, "utf8");

// 检查是否已经存在 lg 别名
if (gitConfigContent.includes("[alias]") && gitConfigContent.includes("lg =")) {
  console.log("⚠️ 检测到已存在 git-lg 别名");

  // 提取现有别名显示给用户
  const lgMatch = gitConfigContent.match(/^\s*lg\s*=\s*"([^"]+)"/m);
  if (lgMatch) {
    console.log("📝 现有别名:", lgMatch[0].trim());
  }

  // 原别名备份为 lg-backup（仅首次，避免反复安装时覆盖备份）
  if (!/lg-backup\s*=/.test(gitConfigContent)) {
    gitConfigContent = gitConfigContent.replace(
      /^(\s*)lg\s*=\s*"([^"]+)".*$/gm,
      "$1lg-backup = \"$2\""
    );
    console.log("💾 原别名已备份为 lg-backup（在 ~/.gitconfig 中可随时恢复）");
  }

  console.log("🔄 覆盖现有 lg 别名为 git-log-formatter");

  // 移除现有的 lg 别名（备份已保留）
  gitConfigContent = gitConfigContent.replace(/^\s*lg\s*=\s*"[^"]*".*$/gm, "");
}

// 确定包的安装路径
// 使用当前脚本的实际位置（postinstall.js 在包的根目录）
const packagePath = __dirname;

// 添加 lg 别名，使用动态路径（Windows路径需要转换为正斜杠）
const scriptPath = path.join(packagePath, "bin/git-lg.js").replace(/\\/g, "/");
const lgAlias = `lg = "!f() { node \\"${scriptPath}\\" \\"$@\\"; }; f"`;

if (gitConfigContent.includes("[alias]")) {
  // 如果已经存在 [alias] 部分，插入到 [alias] 部分之后
  gitConfigContent = gitConfigContent.replace(
    /\[alias\]/,
    `[alias]\n    ${lgAlias}`
  );
} else {
  // 如果不存在 [alias] 部分，添加整个部分
  gitConfigContent += `\n[alias]\n    ${lgAlias}\n`;
}

// 写入更新后的配置
fs.writeFileSync(gitConfigPath, gitConfigContent);

console.log("✅ 全局 git lg 命令配置成功！");
console.log("\n📝 现在可以在任何 Git 仓库中使用：");
console.log("  git lg              # 显示所有提交，自动分页");
console.log("  git lg -5           # 显示最近5个提交");
console.log("  git lg --oneline    # 使用简洁格式");
console.log('  git lg --grep="fix" # 搜索包含"fix"的提交');
console.log("\n🎨 享受彩色的 git log 吧！");
