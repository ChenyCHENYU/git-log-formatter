#!/usr/bin/env node

import { execFileSync, spawn } from 'child_process'
import chalk from 'chalk'
import { SEP, formatLine, formatOneline } from '../lib/line-format.mjs'

// 获取命令行参数（argv 已按 shell 规则切分，数组直传 git，无注入与转义问题）
const args = process.argv.slice(2)

// stdout 非终端（重定向、管道给其他命令）时不上色也不分页；
// TTY 但 chalk 探测不到颜色（如旧版 Windows conhost）时兜底提亮。
// NO_COLOR / FORCE_COLOR 交给 chalk 自身处理，不强制覆盖
const isTTY = process.stdout.isTTY
if (isTTY && !process.env.NO_COLOR && chalk.level === 0) chalk.level = 1

// `git lg | head` 等下游提前关管的场景静默退出，避免 EPIPE 崩溃
process.stdout.on('error', (e) => {
  if (e.code === 'EPIPE') process.exit(0)
  throw e
})

const gitLogArgs = [
  'log',
  '--color=never',
  `--pretty=format:%h${SEP}%ad${SEP}%s${SEP}%an`,
  '--date=format:%Y-%m-%d %H:%M:%S',
  ...args,
]

const isOneline = args.some(
  (a) => a === '--oneline' || a === '--pretty=oneline' || a === '--format=oneline',
)

try {
  // maxBuffer 提到 64MB：默认 1MB 在数万提交的仓库上会截断报错
  const gitLog = execFileSync('git', gitLogArgs, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  if (!gitLog.trim()) process.exit(0)

  const format = isOneline ? formatOneline : formatLine
  const output = gitLog.trim().split('\n').map((line) => format(line)).join('\n')

  const lines = output.split('\n')
  const terminalHeight = process.stdout.rows || 24

  // 超一屏才进分页；less -F 让一屏内的内容自动退出（观感同直接打印），
  // 因此无需按参数猜测"短输出"——--grep / --stat 结果过长也能正常分页
  if (isTTY && lines.length > terminalHeight) {
    try {
      // -R 保留颜色，-F 一屏内直接退出，-X 退出不清屏
      const less = spawn('less', ['-R', '-F', '-X'], {
        stdio: ['pipe', 'inherit', 'inherit'],
      })
      less.stdin.write(output)
      less.stdin.end()
      await new Promise((resolve, reject) => {
        less.on('close', resolve)
        less.on('error', reject)
      })
    } catch {
      // less 不可用（如未装补充工具的 Windows）时直接打印
      console.log(output)
    }
  } else {
    console.log(output)
  }
} catch (error) {
  // 优先透传 git 自身的错误信息（如空仓库 fatal），比拼接完整命令行的 message 清晰
  if (error.stderr) process.stderr.write(error.stderr)
  else console.error('Error:', error.message)
  process.exit(1)
}
