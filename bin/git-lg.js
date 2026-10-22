#!/usr/bin/env node

import { execFileSync } from 'child_process'
import chalk from 'chalk'

// 确保颜色在Windows终端中正确显示
chalk.level = 1

// 获取命令行参数（argv 已按 shell 规则切分，数组直传 git，无注入与转义问题）
const args = process.argv.slice(2)

// 构建 git log 参数，保留用户传递的参数
// 不添加任何默认限制，让 git log 自己决定默认行为
const gitLogArgs = [
  'log',
  '--color=never',
  '--pretty=format:%h|%ad|%s|%an',
  '--date=format:%Y-%m-%d %H:%M:%S',
  ...args,
]

// 检查是否需要使用分页器
// 短输出场景不进分页：数字简写（-5/-10）、带值形式（--grep=xx / -n 5）同样识别，
// 旧实现只硬编码了 '-5' 一个数字形式、漏掉所有 --xxx=yy 等号写法
const SHORT_OUTPUT_FLAGS = [
  '--oneline', '-1', '--grep', '--max-count', '-n',
  '--since', '--after', '--until', '--before',
  '--stat', '--patch', '-p', '-S', '-G',
]
const isShortOutput =
  SHORT_OUTPUT_FLAGS.some(
    (flag) => args.includes(flag) || args.some((a) => a.startsWith(flag + '='))
  ) || args.some((a) => /^-\d+$/.test(a))
const shouldUsePager = !isShortOutput

try {
  // 获取git log输出
  const gitLog = execFileSync('git', gitLogArgs, { encoding: 'utf8' })

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
