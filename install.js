import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

// 获取用户主目录
const homeDir = os.homedir();
const gitConfigPath = path.join(homeDir, ".gitconfig");

console.log("🚀 安装 git-lg 命令...\n");

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
  const lgMatch = gitConfigContent.match(/lg\s*=\s*"([^"]+)"/);
  if (lgMatch) {
    console.log("📝 现有别名:", lgMatch[0]);
  }

  // 询问用户是否覆盖
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => {
    rl.question("❓ 是否要覆盖现有别名？(y/N): ", resolve);
  });

  rl.close();

  if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
    console.log("❌ 取消安装，保留现有别名");
    process.exit(0);
  }

  console.log("🔄 正在覆盖现有别名...");

  // 移除现有的 lg 别名（更安全的正则表达式）
  gitConfigContent = gitConfigContent.replace(/^\s*lg\s*=\s*"[^"]*".*$/gm, "");
}

// 使用 npm root 获取全局 node_modules 路径
let npmRoot;
try {
  npmRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
} catch {
  // 如果 npm root 失败，尝试使用 bun
  try {
    npmRoot = execSync("bun pm -g bin", { encoding: "utf8" })
      .split("\n")[0]
      .replace("bun pm bin", "")
      .trim();
  } catch {
    npmRoot = path.join(homeDir, "node_modules");
  }
}

// 添加 lg 别名，使用动态路径（Windows路径需要转换为正斜杠）
const scriptPath = path.join(
  npmRoot,
  "git-log-formatter/bin/git-lg.js"
).replace(/\\/g, '/');
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

console.log("✅ 安装成功！");
console.log("\n📝 使用方法：");
console.log("  git lg              # 显示所有提交，自动分页");
console.log("  git lg -5           # 显示最近5个提交");
console.log("  git lg --oneline    # 使用简洁格式");
console.log('  git lg --grep="fix" # 搜索包含"fix"的提交');
console.log("\n🎨 现在您可以享受彩色的 git log 了！");
