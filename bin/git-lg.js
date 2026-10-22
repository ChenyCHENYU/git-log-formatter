#!/usr/bin/env node

import { execFileSync, spawn } from 'child_process'
import chalk from 'chalk'
import { SEP, formatLine, formatOneline } from '../lib/line-format.mjs'
import { resolvePager, pagerArgv as buildPagerArgv } from '../lib/pager.mjs'

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

// git 配置一次读取：core.pager（分页器）与 lg.*（本工具行为开关）。
// 非 git 目录 / 无配置时 git 返回非 0，视为空配置
function readGitConfigMap() {
  try {
    const out = execFileSync('git', ['config', '--get-regexp', '^(lg\\.|core\\.pager$)'], {
      encoding: 'utf8',
    })
    const map = {}
    for (const row of out.trim().split('\n')) {
      if (!row) continue
      const sp = row.indexOf(' ')
      if (sp > 0) map[row.slice(0, sp)] = row.slice(sp + 1)
    }
    return map
  } catch {
    return {}
  }
}
const configs = readGitConfigMap()

// 用户显式传了 --date* 时尊重 git 的日期输出，不做相对化
const userDateFormat = args.some(
  (a) => a === '--date' || a.startsWith('--date=') || a === '--relative-date'
)
const formatOpts = {
  relativeDate: !userDateFormat && configs['lg.relativedate'] !== 'false',
  showRefs: configs['lg.showrefs'] !== 'false',
}

const gitLogArgs = [
  'log',
  '--color=never',
  `--pretty=format:%h${SEP}%ad${SEP}%at${SEP}%s${SEP}%an${SEP}%d`,
  '--date=format:%Y-%m-%d %H:%M:%S',
  ...args,
]

const isOneline = args.some(
  (a) => a === '--oneline' || a === '--pretty=oneline' || a === '--format=oneline'
)

try {
  // maxBuffer 提到 64MB：默认 1MB 在数万提交的仓库上会截断报错
  const gitLog = execFileSync('git', gitLogArgs, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  if (!gitLog.trim()) process.exit(0)

  const format = isOneline
    ? (line) => formatOneline(line)
    : (line) => formatLine(line, chalk, formatOpts)
  const output = gitLog.trim().split('\n').map(format).join('\n')

  const lines = output.split('\n')
  const terminalHeight = process.stdout.rows || 24
  const pagerArgv = buildPagerArgv(resolvePager(process.env, configs['core.pager']))

  // 超一屏才进分页；less -F 让一屏内的内容自动退出（观感同直接打印），
  // 因此无需按参数猜测"短输出"——--grep / --stat 结果过长也能正常分页
  if (isTTY && pagerArgv && lines.length > terminalHeight) {
    try {
      const pager = spawn(pagerArgv[0], pagerArgv.slice(1), {
        stdio: ['pipe', 'inherit', 'inherit'],
      })
      pager.stdin.write(output)
      pager.stdin.end()
      await new Promise((resolve, reject) => {
        pager.on('close', resolve)
        pager.on('error', reject)
      })
    } catch {
      // 分页器不可用时直接打印
      console.log(output)
    }
  } else {
    console.log(output)
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('错误：未找到 git 命令，请先安装 Git — https://git-scm.com')
  } else if (error.stderr) {
    // 优先透传 git 自身的错误信息（如空仓库 fatal），比拼接完整命令行的 message 清晰
    process.stderr.write(error.stderr)
  } else {
    console.error('Error:', error.message)
  }
  process.exit(1)
}
