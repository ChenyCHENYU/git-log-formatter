#!/usr/bin/env node

import { execSync } from 'child_process'
import chalk from 'chalk'

// 确保颜色在Windows终端中正确显示
chalk.level = 1

// 获取命令行参数
const args = process.argv.slice(2)

// 构建 git log 命令，保留用户传递的参数
// 不添加任何默认限制，让 git log 自己决定默认行为
let gitLogCommand =
  'git log --color=never --pretty=format:"%h|%ad|%s|%an" --date=format:"%Y-%m-%d %H:%M:%S"'

// 如果用户提供了参数，将其添加到git log命令中
if (args.length > 0) {
  gitLogCommand += ' ' + args.join(' ')
}

// 检查是否需要使用分页器
const shouldUsePager =
  !args.includes('--oneline') &&
  !args.includes('-1') &&
  !args.includes('--grep') &&
  !args.includes('-n') &&
  !args.includes('--max-count') &&
  !args.includes('-5') &&
  !args.includes('--since') &&
  !args.includes('--after') &&
  !args.includes('--until') &&
  !args.includes('--before') &&
  !args.includes('--stat') &&
  !args.includes('--patch') &&
  !args.includes('-p')

try {
  // 获取git log输出
  const gitLog = execSync(gitLogCommand, { encoding: 'utf8' })

  // 检查是否使用了 --oneline 或其他简化格式
  const isOnelineFormat = args.includes('--oneline') || args.includes('-1')

  // 格式化每一行
  const formattedLines = gitLog
    .trim()
    .split('\n')
    .map(line => {
      // 如果是 oneline 格式，直接输出，不进行格式化
      if (isOnelineFormat) {
        return line
      }

      const parts = line.split('|')

      // 检查是否有足够的部分
      if (parts.length < 4) {
        return line
      }

      const [hash, date, subject, author] = parts

      // 分离类型和描述
      const match = subject.match(/^([^:]+):\s*(.+)$/)
      if (match) {
        const [, type, description] = match

        // 返回带颜色的格式
        return (
          chalk.red.bold(hash) +
          ' - ' +
          chalk.yellow(date) +
          ' ' +
          chalk.magenta('【' + type + '】') +
          ' ' +
          chalk.white(description) +
          ' ' +
          chalk.green('[' + author + ']')
        )
      } else {
        // 如果没有匹配到类型格式，使用默认颜色
        return (
          chalk.red.bold(hash) +
          ' - ' +
          chalk.yellow(date) +
          ' ' +
          chalk.magenta(subject) +
          ' ' +
          chalk.green('[' + author + ']')
        )
      }
    })

  // 输出结果
  const output = formattedLines.join('\n')

  // 检查是否需要分页
  const lines = output.split('\n')
  const terminalHeight = process.stdout.rows || 24

  // 如果行数超过终端高度且应该使用分页器，使用分页
  if (lines.length > terminalHeight && shouldUsePager) {
    // 使用execSync调用less进行分页，保留颜色
    try {
      // 使用管道方式传递给less，避免创建临时文件
      const { spawn } = await import('child_process')

      // 启动less进程
      const less = spawn('less', ['-R', '-F', '-X'], {
        stdio: ['pipe', 'inherit', 'inherit'],
      })

      // 将输出写入less的标准输入
      less.stdin.write(output)
      less.stdin.end()

      // 等待less进程结束
      await new Promise((resolve, reject) => {
        less.on('close', resolve)
        less.on('error', reject)
      })
    } catch {
      // 如果less失败，直接输出
      console.log(output)
    }
  } else {
    // 直接输出
    console.log(output)
  }
} catch (error) {
  console.error('Error:', error.message)
  process.exit(1)
}
