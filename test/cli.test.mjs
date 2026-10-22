import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const binPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../bin/git-lg.js')

const GIT_ENV = {
  ...process.env,
  // 隔离全局/系统 git 配置，避免读到宿主机配置
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
}

function makeRepo() {
  const repo = mkdtempSync(path.join(tmpdir(), 'glf-cli-'))
  const git = (...args) =>
    spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
      cwd: repo,
      env: GIT_ENV,
    })
  git('init', '-q')
  const commit = (date, subject) =>
    git('commit', '-q', '--allow-empty', '--date', date, '-m', subject)
  commit('2026-10-20T10:00:00', 'fix: 修复 A|B|C 三处调用')
  commit('2026-10-21T11:00:00', 'feat(api): 订单导出')
  commit('2026-10-22T12:00:00', '更新 README')
  return { repo, cleanup: () => rmSync(repo, { recursive: true, force: true }) }
}

function runCli(repo, args, extraEnv = {}) {
  const res = spawnSync('node', [binPath, ...args], {
    cwd: repo,
    env: { ...GIT_ENV, ...extraEnv },
    encoding: 'utf8',
  })
  assert.equal(res.status, 0, `git-lg ${args.join(' ')} 失败: ${res.stderr}`)
  return res.stdout
}

test('git-lg -1 输出格式化行而非原始管道符', () => {
  const { repo, cleanup } = makeRepo()
  try {
    const out = runCli(repo, ['-1'])
    // 最新一条提交是"更新 README"
    assert.match(out.trim(), /^\S+ - 2026-10-22 12:00:00 更新 README \[t\]$/)
    assert.ok(!out.includes('\x1f'), '不应残留分隔符')
    assert.ok(!out.includes('|'), '不应输出原始管道分隔行')
  } finally {
    cleanup()
  }
})

test('subject 含 | 时作者字段不丢失', () => {
  const { repo, cleanup } = makeRepo()
  try {
    const out = runCli(repo, ['--grep=修复'])
    assert.match(out, /【fix】 修复 A\|B\|C 三处调用 \[t\]/)
  } finally {
    cleanup()
  }
})

test('scope 提交显示完整类型标签', () => {
  const { repo, cleanup } = makeRepo()
  try {
    const out = runCli(repo, ['--grep=订单'])
    assert.match(out, /【feat\(api\)】 订单导出 \[t\]/)
  } finally {
    cleanup()
  }
})

test('--oneline 透传且输出不含分隔符', () => {
  const { repo, cleanup } = makeRepo()
  try {
    const out = runCli(repo, ['--oneline'])
    assert.ok(out.split('\n').length >= 3)
    assert.ok(!out.includes('\x1f'))
    assert.match(out, /^[0-9a-f]+ /)
  } finally {
    cleanup()
  }
})

test('非 TTY（管道/测试进程）输出不带 ANSI 码', () => {
  const { repo, cleanup } = makeRepo()
  try {
    const out = runCli(repo, ['-3'])
    assert.ok(!out.includes('\x1b['))
  } finally {
    cleanup()
  }
})

test('NO_COLOR 下不输出颜色码', () => {
  const { repo, cleanup } = makeRepo()
  try {
    const out = runCli(repo, ['-3'], { NO_COLOR: '1' })
    assert.ok(!out.includes('\x1b['))
  } finally {
    cleanup()
  }
})

test('空匹配正常退出且无输出', () => {
  const { repo, cleanup } = makeRepo()
  try {
    const out = runCli(repo, ['--grep=不存在的关键词'])
    assert.equal(out.trim(), '')
  } finally {
    cleanup()
  }
})
