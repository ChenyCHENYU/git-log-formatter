// 分页器解析：遵循 git 的优先级 GIT_PAGER > core.pager > PAGER > less
export function resolvePager(env, corePager) {
  const first = (v) => (v && v.trim() ? v.trim() : null)
  return first(env.GIT_PAGER) || first(corePager) || first(env.PAGER) || 'less'
}

// 分页器命令切分为 argv；返回 null 表示不需要分页（直接打印）：
// - 空命令
// - cat（git 生态约定的"禁用分页"写法 GIT_PAGER=cat）
// 裸 less 自动补 -R -F -X（保色、一屏内自动退出、退出不清屏）；
// 用户自带参数或其他分页器（delta 等）原样尊重
export function pagerArgv(pagerSpec) {
  const argv = String(pagerSpec || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (argv.length === 0) return null
  if (/^cat(\.exe)?$/i.test(argv[0])) return null
  const base = argv[0].replace(/\\/g, '/').split('/').pop()
  if (/^less(\.exe)?$/i.test(base) && argv.length === 1) {
    return [argv[0], '-R', '-F', '-X']
  }
  return argv
}
