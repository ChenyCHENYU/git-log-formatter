#!/usr/bin/env node

import path from "path";
import { execFileSync, execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// 本地安装只提示，不写任何配置
if (!isGlobalInstall()) {
  console.log("📦 Git Log Formatter 已安装到项目中");
  console.log("\n💡 使用方法：npx git-lg");
  console.log("\n✨ 如需全局 `git lg` 命令，请全局安装：");
  console.log("  npm install -g git-log-formatter");
  console.log(
    "  pnpm add -g git-log-formatter --allow-build=git-log-formatter"
  );
  process.exit(0);
}

// CI 环境不写用户配置
if (process.env.CI) {
  console.log("🤖 检测到 CI 环境，跳过 git lg 别名配置");
  process.exit(0);
}

console.log("🚀 正在配置全局 git lg 命令...\n");

const scriptPath = path.join(__dirname, "bin/git-lg.js").replace(/\\/g, "/");
const lgAlias = `!f() { node "${scriptPath}" "$@"; }; f`;

// 一律通过 `git config --global` 读写：execFileSync 数组传参不经 shell 无需转义，
// 无引号旧别名、~/.gitconfig 与 XDG（~/.config/git/config）路径、重复项清理由 git 正确处理
const run = (args) => execFileSync("git", args, { encoding: "utf8" });
const read = (key) => {
  try {
    return run(["config", "--global", "--get", key]).trim();
  } catch {
    return null;
  }
};

try {
  const existing = read("alias.lg");

  if (existing === lgAlias) {
    console.log("✅ 别名已指向当前安装，无需重复配置");
  } else {
    // 指向本包其他路径（nvm 切版本、npm↔pnpm 重装）时直接切换，不当作用户别名备份
    const isOtherSelfInstall =
      existing && existing.includes("git-log-formatter");

    if (existing && !isOtherSelfInstall) {
      console.log(`⚠️ 检测到已有 lg 别名：${existing}`);
      if (!read("alias.lg-backup")) {
        run(["config", "--global", "--replace-all", "alias.lg-backup", existing]);
        console.log("💾 原别名已备份为 lg-backup（git config --global --get alias.lg-backup 可查看）");
      }
      console.log("🔄 覆盖为 git-log-formatter");
    }
    // --replace-all 同时清理早期版本文本替换 bug 可能残留的重复 lg 别名
    run(["config", "--global", "--replace-all", "alias.lg", lgAlias]);
  }

  // 写入后读回校验，避免静默失败
  const applied = read("alias.lg");
  if (applied !== lgAlias) {
    throw new Error(`写入后校验失败，当前值为：${applied}`);
  }

  console.log("✅ 全局 git lg 命令配置成功！");
} catch (error) {
  console.log("❌ 别名配置失败：", String(error.message).split("\n")[0]);
  console.log("可手动执行：");
  console.log(
    `  git config --global alias.lg '!f() { node "${scriptPath}" "$@"; }; f'`
  );
}

console.log("\n📝 现在可以在任何 Git 仓库中使用：");
console.log("  git lg              # 显示所有提交，自动分页");
console.log("  git lg -5           # 显示最近 5 个提交");
console.log("  git lg --oneline    # 简洁格式，同样上色");
console.log('  git lg --grep="fix" # 搜索提交，结果超一屏自动分页');
