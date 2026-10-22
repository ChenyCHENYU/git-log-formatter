import test from 'node:test'
import assert from 'node:assert/strict'
import chalk from 'chalk'
import {
  SEP,
  formatLine,
  formatOneline,
  parseSubject,
  parseLine,
  isGraphConnector,
  displayWidth,
  padDisplay,
  relativeDate,
} from '../lib/line-format.mjs'

// 测试进程 stdout 非 TTY，chalk.level 为 0，输出即纯文本
const makeLine = ({ hash = 'abc1234', date = '2026-10-22 10:00:00', ts = 1795000000, subject, author = 'CHENY', refs = '', graph = '' }) =>
  graph + hash + SEP + date + SEP + ts + SEP + subject + SEP + author + (refs ? SEP + refs : '')

const ABS = { relativeDate: false }

test('subject 含 | 不再干扰字段解析', () => {
  const out = formatLine(makeLine({ subject: 'fix: 修复 A|B|C 三处调用' }), chalk, ABS)
  assert.equal(
    out,
    'abc1234 - 2026-10-22 10:00:00 【fix】 修复 A|B|C 三处调用 [CHENY]'
  )
})

test('author 含 | 完整保留', () => {
  const out = formatLine(makeLine({ subject: 'chore: 更新依赖', author: 'A|B' }), chalk, ABS)
  assert.equal(out, 'abc1234 - 2026-10-22 10:00:00 【chore】 更新依赖 [A|B]')
})

test('refs (%d) 追加在行尾', () => {
  const out = formatLine(makeLine({ subject: 'fix: x', refs: '(HEAD -> main, tag: v1.2.0)' }), chalk, ABS)
  assert.ok(out.endsWith('[CHENY] (HEAD -> main, tag: v1.2.0)'))
})

test('showRefs: false 隐藏 refs', () => {
  const out = formatLine(
    makeLine({ subject: 'fix: x', refs: '(HEAD -> main)' }),
    chalk,
    { ...ABS, showRefs: false }
  )
  assert.ok(out.endsWith('[CHENY]'))
})

test('非提交行（--stat / -p 附属输出）原样透传', () => {
  const statLine = ' bin/git-lg.js | 15 +++++++---'
  assert.equal(formatLine(statLine, chalk, ABS), statLine)
})

test('--graph 前缀被提取并保留', () => {
  const out = formatLine(makeLine({ graph: '* ', subject: 'fix: x' }), chalk, ABS)
  assert.match(out, /^\* abc1234 - /)
  const out2 = formatLine(makeLine({ graph: '| \\ ', subject: 'fix: x' }), chalk, ABS)
  assert.match(out2, /^\| \\ abc1234 - /)
})

test('纯连接线整行识别', () => {
  assert.equal(isGraphConnector('|'), true)
  assert.equal(isGraphConnector('|\\'), true)
  assert.equal(isGraphConnector('* '), false) // 含提交内容的行不是连接线
  assert.equal(isGraphConnector(''), false)
  assert.equal(isGraphConnector(' bin/x.js | 15 +++'), false)
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
  assert.deepEqual(parseSubject('修复: 登录态丢失'), {
    type: '修复',
    scope: '',
    breaking: false,
    description: '登录态丢失',
  })
})

test('parseSubject 拒绝非规范前缀', () => {
  assert.equal(parseSubject('Revert "feat: 订单导出"'), null)
  assert.equal(parseSubject("Merge branch 'dev'"), null)
  assert.equal(parseSubject('普通描述没有冒号'), null)
})

test('scope 与破坏性标记进入类型标签', () => {
  const out = formatLine(
    makeLine({ hash: 'a1b2c3d', subject: 'refactor(core)!: 拆分渲染层' }),
    chalk,
    ABS
  )
  assert.equal(out, 'a1b2c3d - 2026-10-22 10:00:00 【refactor(core)!】 拆分渲染层 [CHENY]')
})

test('无类型前缀走默认着色', () => {
  const out = formatLine(makeLine({ subject: '更新 README' }), chalk, ABS)
  assert.equal(out, 'abc1234 - 2026-10-22 10:00:00 更新 README [CHENY]')
})

test('parseLine 校验 hash 段与时间戳', () => {
  assert.equal(parseLine(['not a hash', 'd', '1', 's', 'a'].join(SEP)), null)
  assert.equal(parseLine(['abc1234', 'd', 'NaN', 's', 'a'].join(SEP)), null)
  const ok = parseLine(makeLine({ graph: '| ' }))
  assert.equal(ok.graph, '| ')
  assert.equal(ok.hash, 'abc1234')
})

// 相对时间用本地时区构造，保证 CI 任意时区下断言稳定
test('relativeDate 梯度正确', () => {
  const now = new Date(2026, 5, 15, 12, 0, 0).getTime()
  const at = (dt) => Math.floor(dt.getTime() / 1000)
  assert.equal(relativeDate(at(new Date(now - 30e3)), now), '刚刚')
  assert.equal(relativeDate(at(new Date(now - 5 * 60e3)), now), '5分钟前')
  assert.equal(relativeDate(at(new Date(now - 3 * 3600e3)), now), '3小时前')
  assert.equal(relativeDate(at(new Date(now - 3 * 86400e3)), now), '3天前')
  assert.equal(relativeDate(at(new Date(2026, 4, 1)), now), '05-01')
  assert.equal(relativeDate(at(new Date(2025, 4, 1)), now), '2025-05-01')
  // 未来时间显示刚刚
  assert.equal(relativeDate(at(new Date(now + 60e3)), now), '刚刚')
})

test('formatLine 相对模式对齐日期列', () => {
  const now = new Date(2026, 5, 15, 12, 0, 0).getTime()
  const recent = formatLine(
    makeLine({ subject: 'fix: x', ts: Math.floor((now - 3 * 3600e3) / 1000) }),
    chalk,
    { relativeDate: true, now }
  )
  assert.match(recent, /^abc1234 - 3小时前 {4}【fix】 x \[CHENY\]$/) // "3小时前"占7列补到10列，加列后间隔空格
  const old = formatLine(
    makeLine({ subject: 'fix: y', ts: Math.floor(new Date(2025, 4, 1).getTime() / 1000) }),
    chalk,
    { relativeDate: true, now }
  )
  assert.match(old, /^abc1234 - 2025-05-01 【fix】 y \[CHENY\]$/) // 10 列刚好不补
})

test('displayWidth 与 padDisplay 处理双宽字符', () => {
  assert.equal(displayWidth('abc'), 3)
  assert.equal(displayWidth('刚刚'), 4)
  assert.equal(padDisplay('刚刚', 6), '刚刚  ')
  assert.equal(padDisplay('1234567890', 5), '1234567890') // 超宽不截断
})

test('formatOneline 识别 hash 行与 graph 前缀', () => {
  assert.equal(formatOneline('abc1234 fix: 修复解析'), 'abc1234 fix: 修复解析')
  assert.equal(formatOneline('* abc1234 fix: 修复解析'), '* abc1234 fix: 修复解析')
  const mangled = 'not a hash line'
  assert.equal(formatOneline(mangled), mangled)
})

test('类型分色：feat 绿、fix 红、chore 灰、未知品红', () => {
  const original = chalk.level
  chalk.level = 3
  try {
    const render = (subject) =>
      formatLine(makeLine({ subject }), chalk, ABS)
    assert.match(render('feat: 新功能'), /\x1b\[32m【feat】/) // green
    assert.match(render('fix: 修复'), /\x1b\[31m【fix】/) // red
    assert.match(render('chore: 杂务'), /\x1b\[90m【chore】/) // gray
    assert.match(render('custom: 未知类型'), /\x1b\[35m【custom】/) // 默认品红
    // 哈希红色加粗、refs cyan 依旧
    assert.match(
      formatLine(makeLine({ subject: 'feat: x', refs: '(HEAD -> main)' }), chalk, ABS),
      /\x1b\[31m\x1b\[1mabc1234/
    )
    assert.match(
      formatLine(makeLine({ subject: 'feat: x', refs: '(HEAD -> main)' }), chalk, ABS),
      /\x1b\[36m\(HEAD -> main\)/
    )
  } finally {
    chalk.level = original
  }
})
