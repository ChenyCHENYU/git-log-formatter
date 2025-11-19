#!/usr/bin/env node

/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-11-19 22:39:29
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2025-11-20 00:19:11
 * @FilePath: \git-log-formatter\postinstall.js
 * @Description:
 * Copyright (c) 2025 by CHENY, All Rights Reserved 😎.
 */

import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

// 获取用户主目录
const homeDir = os.homedir();
const gitConfigPath = path.join(homeDir, ".gitconfig");

// 检查是否在项目目录中（检查是否有 package.json）
const projectPackageJsonPath = path.join(process.cwd(), "package.json");
const isProjectInstall = fs.existsSync(projectPackageJsonPath);

if (!isProjectInstall) {
  // 如果不是项目安装，显示使用说明
  console.log("🎨 Robot Admin Git Log Formatter 已安装！");
  console.log("\n📝 使用方法：");
  console.log(
    "  npx robot-admin-git-log              # 显示所有提交，自动分页"
  );
  console.log("  npx robot-admin-git-log -5           # 显示最近5个提交");
  console.log("  npx robot-admin-git-log --oneline    # 使用简洁格式");
  console.log('  npx robot-admin-git-log --grep="fix" # 搜索包含"fix"的提交');
  console.log(
    "\n💡 提示：运行 npx robot-admin-git-log install 可配置 git 别名"
  );
  process.exit(0);
}

console.log("🚀 正在为项目配置 git-lg 命令...\n");

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
  console.log("🔍 现有别名可能会与新版本冲突");

  // 提取现有别名显示给用户
  const lgMatch = gitConfigContent.match(/lg\s*=\s*"([^"]+)"/);
  if (lgMatch) {
    console.log("📝 现有别名:", lgMatch[0]);
  }

  // 在项目安装时，自动覆盖（因为项目环境需要统一）
  console.log("🔄 项目环境：自动覆盖现有别名以确保一致性");

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

// 添加别名配置
let aliasSection = "\n[alias]\n";
if (gitConfigContent.includes("[alias]")) {
  // 如果已经存在 [alias] 部分，只需要添加 lg 别名
  aliasSection = "\n    ";
} else {
  // 如果不存在 [alias] 部分，需要添加整个部分
  gitConfigContent += "\n[alias]";
}

// 添加 lg 别名，使用动态路径
const lgAlias = `lg = "!f() { node \\"${path.join(
  npmRoot,
  "robot-admin-git-log/bin/git-lg.js"
)}\\" \\"$@\\"; }; f"`;
gitConfigContent += aliasSection + lgAlias + "\n";

// 写入更新后的配置
fs.writeFileSync(gitConfigPath, gitConfigContent);

console.log("✅ 项目 git-lg 命令配置成功！");
console.log("\n📝 现在可以在项目中使用：");
console.log("  git lg              # 显示所有提交，自动分页");
console.log("  git lg -5           # 显示最近5个提交");
console.log("  git lg --oneline    # 使用简洁格式");
console.log('  git lg --grep="fix" # 搜索包含"fix"的提交');
console.log("\n🎨 享受彩色的 git log 吧！");
