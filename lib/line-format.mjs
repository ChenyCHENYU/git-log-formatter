import chalk from 'chalk'

// 单元分隔符（0x1f），提交信息与作者名中不会出现，替代早期版本的 "|"，
// 避免 subject 含竖线时字段错位
export const SEP = '\x1f'

// Conventional Commits：type(scope)!: subject。
// type 段允许中文但不含空白，因此 'Revert "feat: xxx"' 这类整体走默认着色
// type 段排除括号与感叹号，避免贪婪匹配把 (scope) / ! 吞进 type
const CC_RE = /^([^:\s()!]+)(\([^)]+\))?(!)?:\s+(.+)$/

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

// 把一行 `hash<sep>date<sep>subject<sep>author` 渲染成彩色输出；
// 段数不为 4 的行（--stat 统计、-p diff 等）原样透传
export function formatLine(line, color = chalk) {
  const parts = line.split(SEP)
  if (parts.length !== 4) return line
  const [hash, date, subject, author] = parts
  const head = color.red.bold(hash) + ' - ' + color.yellow(date) + ' '
  const tail = ' ' + color.green(`[${author}]`)
  const parsed = parseSubject(subject)
  if (parsed) {
    const typeLabel = `【${parsed.type}${parsed.scope ? `(${parsed.scope})` : ''}${parsed.breaking ? '!' : ''}】`
    return head + color.magenta(typeLabel) + ' ' + color.white(parsed.description) + tail
  }
  return head + color.magenta(subject) + tail
}

// `--oneline` 输出为 `hash subject`，行首短哈希上色保持观感统一
export function formatOneline(line, color = chalk) {
  const m = line.match(/^([0-9a-f]+) (.+)$/)
  if (!m) return line
  return color.red.bold(m[1]) + ' ' + color.white(m[2])
}
