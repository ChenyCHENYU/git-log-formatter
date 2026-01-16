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
import { fileURLToPath } from "url";

// 获取当前脚本所在目录（ES module 中的 __dirname 替代）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取用户主目录
const homeDir = os.homedir();
const gitConfigPath = path.join(homeDir, ".gitconfig");

// 检查是否在项目目录中（检查是否有 package.json）
const projectPackageJsonPath = path.join(process.cwd(), "package.json");
const isProjectInstall = fs.existsSync(projectPackageJsonPath);

if (!isProjectInstall) {
  // 如果不是项目安装，显示使用说明
  console.log("🎨 Git Log Formatter 已安装！");
  console.log("\n📝 使用方法：");
  console.log("  npx git-log-formatter              # 显示所有提交，自动分页");
  console.log("  npx git-log-formatter -5           # 显示最近5个提交");
  console.log("  npx git-log-formatter --oneline    # 使用简洁格式");
  console.log('  npx git-log-formatter --grep="fix" # 搜索包含"fix"的提交');
  console.log("\n💡 提示：运行 npx git-log-formatter install 可配置 git 别名");
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

console.log("✅ 项目 git-lg 命令配置成功！");
console.log("\n📝 现在可以在项目中使用：");
console.log("  git lg              # 显示所有提交，自动分页");
console.log("  git lg -5           # 显示最近5个提交");
console.log("  git lg --oneline    # 使用简洁格式");
console.log('  git lg --grep="fix" # 搜索包含"fix"的提交');
console.log("\n🎨 享受彩色的 git log 吧！");
