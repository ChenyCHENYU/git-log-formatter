import test from 'node:test'
import assert from 'node:assert/strict'
import chalk from 'chalk'
import { SEP, formatLine, formatOneline, parseSubject } from '../lib/line-format.mjs'

// 测试进程 stdout 非 TTY，chalk.level 为 0，输出即纯文本
const line = (hash, date, subject, author) => [hash, date, subject, author].join(SEP)

test('subject 含 | 不再干扰字段解析', () => {
  const out = formatLine(
    line('abc1234', '2026-10-22 10:00:00', 'fix: 修复 A|B|C 三处调用', 'CHENY')
  )
  assert.equal(out, 'abc1234 - 2026-10-22 10:00:00 【fix】 修复 A|B|C 三处调用 [CHENY]')
})

test('author 含 | 完整保留', () => {
  const out = formatLine(line('abc1234', '2026-10-22 10:00:00', 'chore: 更新依赖', 'A|B'))
  assert.equal(out, 'abc1234 - 2026-10-22 10:00:00 【chore】 更新依赖 [A|B]')
})

test('非提交行（--stat / -p 附属输出）原样透传', () => {
  const statLine = ' bin/git-lg.js | 15 +++++++---'
  assert.equal(formatLine(statLine), statLine)
})

test('parseSubject 识别 Conventional Commits', () => {
  assert.deepEqual(parseSubject('feat(api): 订单导出'), {
    type: 'feat',
    scope: 'api',
    breaking: false,
    description: '订单导出',
  })
  assert.deepEqual(parseSubject('feat!: 移除旧接口'), {
    type: 'feat',
    scope: '',
    breaking: true,
    description: '移除旧接口',
  })
  // 中文前缀且无空白仍可识别
  assert.deepEqual(parseSubject('修复: 登录态丢失'), {
    type: '修复',
    scope: '',
    breaking: false,
    description: '登录态丢失',
  })
})

test('parseSubject 拒绝非规范前缀', () => {
  // 前缀含空白的 Revert 提交不应被当成 type
  assert.equal(parseSubject('Revert "feat: 订单导出"'), null)
  assert.equal(parseSubject('Merge branch \'dev\''), null)
  assert.equal(parseSubject('普通描述没有冒号'), null)
})

test('scope 与破坏性标记进入类型标签', () => {
  const scoped = formatLine(line('a1b2c3d', '2026-10-22 10:00:00', 'refactor(core)!: 拆分渲染层', 'CHENY'))
  assert.equal(scoped, 'a1b2c3d - 2026-10-22 10:00:00 【refactor(core)!】 拆分渲染层 [CHENY]')
})

test('无类型前缀走默认着色', () => {
  const out = formatLine(line('a1b2c3d', '2026-10-22 10:00:00', '更新 README', 'CHENY'))
  assert.equal(out, 'a1b2c3d - 2026-10-22 10:00:00 更新 README [CHENY]')
})

test('formatOneline 识别 hash 行', () => {
  assert.equal(formatOneline('abc1234 fix: 修复解析'), 'abc1234 fix: 修复解析')
  const mangled = 'not a hash line'
  assert.equal(formatOneline(mangled), mangled)
})

test('开启颜色后输出包含 ANSI 码', () => {
  const original = chalk.level
  chalk.level = 3
  try {
    const out = formatLine(line('abc1234', '2026-10-22 10:00:00', 'fix: x', 'CHENY'))
    assert.match(out, /\x1b\[31m/) // 哈希红色加粗
    assert.match(out, /\x1b\[35m/) // 类型品红
  } finally {
    chalk.level = original
  }
})
