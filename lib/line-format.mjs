import chalk from 'chalk'

// 单元分隔符（0x1f），提交信息与作者名中不会出现，替代早期版本的 "|"，
// 避免 subject 含竖线时字段错位
export const SEP = '\x1f'

// Conventional Commits：type(scope)!: subject。
// type 段排除括号与感叹号，避免贪婪匹配把 (scope) / ! 吞进 type；
// 同时排除空白，'Revert "feat: xxx"' 这类整体走默认着色
const CC_RE = /^([^:\s()!]+)(\([^)]+\))?(!)?:\s+(.+)$/

// 常见类型的标签分色；未列出的类型回退品红
const TYPE_COLORS = {
  feat: 'green',
  feature: 'green',
  fix: 'red',
  hotfix: 'red',
  bugfix: 'red',
  revert: 'red',
  perf: 'yellow',
  refactor: 'blue',
  docs: 'cyan',
  doc: 'cyan',
  style: 'cyan',
  test: 'magenta',
  chore: 'gray',
  build: 'gray',
  ci: 'gray',
  deps: 'gray',
}

// --graph 的连接线字符集（* 仅出现在提交行，单独成行的都是连接线）
const GRAPH_CHARS = /[|\\/_]/

export function parseSubject(subject) {
  const m = subject.match(CC_RE)
  if (!m) return null
  return {
    type: m[1],
    scope: m[2] ? m[2].slice(1, -1) : '',
    breaking: !!m[3],
    description: m[4],
  }
}

// 提交行结构：graph? hash <sep> %ad <sep> %at <sep> subject <sep> author <sep?> %d
// 段数不为 5/6、hash 段不合形或时间戳不可解析（--stat / -p 附属输出）返回 null
export function parseLine(line) {
  const parts = line.split(SEP)
  if (parts.length < 5 || parts.length > 6) return null
  const [hashRaw, date, ts, subject, author, refs = ''] = parts
  const m = hashRaw.match(/^([|\\/*_ ]*)([0-9a-f]{4,})$/)
  if (!m) return null
  const epoch = Number(ts)
  if (!Number.isFinite(epoch)) return null
  return {
    graph: m[1],
    hash: m[2],
    date,
    epoch,
    subject,
    author,
    refs: refs.trim(),
  }
}

// 纯 --graph 连接线（如 "|"、"|\\\\"），整行染色
export function isGraphConnector(line) {
  return line.length > 0 && /^[|\\/_ ]+$/.test(line) && GRAPH_CHARS.test(line)
}

// 显示宽度：CJK 等双宽字符按 2 列计
export function displayWidth(text) {
  let w = 0
  for (const ch of text) w += ch.codePointAt(0) > 0xff ? 2 : 1
  return w
}

// 按显示宽度右侧补空格（不截断超宽文本）
export function padDisplay(text, width) {
  const gap = width - displayWidth(text)
  return gap > 0 ? text + ' '.repeat(gap) : text
}

// 与绝对日期 "2025-10-12" 等宽，保证相对/绝对切换时列不移位
const DATE_COL_WIDTH = 10

// 智能相对时间：刚刚 / N分钟前 / N小时前 / N天前，7 天外同年显示 月-日、跨年带年份。
// 时钟偏差或未来时间一律显示"刚刚"
export function relativeDate(epochSec, now = Date.now()) {
  const diff = now - epochSec * 1000
  if (diff < 60e3) return '刚刚'
  if (diff < 3600e3) return `${Math.floor(diff / 60e3)}分钟前`
  if (diff < 86400e3) return `${Math.floor(diff / 3600e3)}小时前`
  if (diff < 7 * 86400e3) return `${Math.floor(diff / 86400e3)}天前`
  const d = new Date(epochSec * 1000)
  const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return d.getFullYear() === new Date(now).getFullYear() ? md : `${d.getFullYear()}-${md}`
}

// 把一行 git log 输出渲染成彩色文本：
// graph前缀 hash - 日期 【类型】 描述 [作者] (refs)
// 非提交行原样透传，纯连接线整行染 cyan
export function formatLine(line, color = chalk, opts = {}) {
  const { relativeDate: useRelative = false, now, showRefs = true } = opts
  const parsed = parseLine(line)
  if (!parsed) return isGraphConnector(line) ? color.cyan(line) : line

  const dateText = useRelative ? relativeDate(parsed.epoch, now) : parsed.date
  const graphText = parsed.graph ? color.cyan(parsed.graph) : ''
  const head =
    graphText +
    color.red.bold(parsed.hash) +
    ' - ' +
    color.yellow(padDisplay(dateText, DATE_COL_WIDTH)) +
    ' '
  const tail = ' ' + color.green(`[${parsed.author}]`)
  const refsText = showRefs && parsed.refs ? ' ' + color.cyan(parsed.refs) : ''

  const cc = parseSubject(parsed.subject)
  if (cc) {
    const label = `【${cc.type}${cc.scope ? `(${cc.scope})` : ''}${cc.breaking ? '!' : ''}】`
    const typeColor = TYPE_COLORS[cc.type.toLowerCase()] || 'magenta'
    return head + color[typeColor](label) + ' ' + color.white(cc.description) + tail + refsText
  }
  return head + color.magenta(parsed.subject) + tail + refsText
}

// `--oneline` 输出为 `graph? hash subject`，哈希与描述上色，graph 前缀染 cyan
export function formatOneline(line, color = chalk) {
  const m = line.match(/^([|\\/*_ ]*)([0-9a-f]+) (.+)$/)
  if (!m) return line
  return (m[1] ? color.cyan(m[1]) : '') + color.red.bold(m[2]) + ' ' + color.white(m[3])
}
