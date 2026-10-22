import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkgFiles = ['bin', 'lib', 'postinstall.js', 'package.json']

// 拷贝一份最小包到指定目录（含/不含全局路径标记由调用方决定）
function stagePackage(target) {
  mkdirSync(target, { recursive: true })
  for (const f of pkgFiles) {
    cpSync(path.join(pkgRoot, f), path.join(target, f), { recursive: true })
  }
}

function baseEnv(home) {
  return {
    ...process.env,
    HOME: home,
    // postinstall 内部用 git config --global，隔离系统级配置
    GIT_CONFIG_SYSTEM: os.devnull,
    // 外层 CI=true（GitHub Actions）不应触发被测 postinstall 的跳过分支；
    // 跳过行为由"CI 环境跳过别名配置"用例显式覆盖
    CI: '',
  }
}

const runPostinstall = (dir, home) =>
  spawnSync('node', [path.join(dir, 'postinstall.js')], {
    encoding: 'utf8',
    env: baseEnv(home),
  })

const gitConfigGet = (home, key) => {
  const res = spawnSync('git', ['config', '--global', '--get', key], {
    encoding: 'utf8',
    env: baseEnv(home),
  })
  return res.status === 0 ? res.stdout.trim() : null
}

function setup() {
  const tmp = mkdtempSync(path.join(tmpdir(), 'glf-post-'))
  const home = path.join(tmp, 'home')
  mkdirSync(home)
  return {
    tmp,
    home,
    cleanup: () => rmSync(tmp, { recursive: true, force: true }),
  }
}

test('全局安装：空配置写入 lg 别名且不产生备份', () => {
  const { tmp, home, cleanup } = setup()
  try {
    const target = path.join(tmp, '.npm-global/node_modules/git-log-formatter')
    stagePackage(target)
    const res = runPostinstall(target, home)
    assert.equal(res.status, 0, res.stderr)
    const lg = gitConfigGet(home, 'alias.lg')
    assert.ok(lg && lg.includes(path.join(target, 'bin/git-lg.js')), `别名应指向包内脚本: ${lg}`)
    assert.equal(gitConfigGet(home, 'alias.lg-backup'), null)
  } finally {
    cleanup()
  }
})

test('无引号旧别名：备份、覆盖且只保留一个 lg（回归：文本替换遗留双别名）', () => {
  const { tmp, home, cleanup } = setup()
  try {
    writeFileSync(path.join(home, '.gitconfig'), '[alias]\n\tlg = log --oneline --graph\n')
    const target = path.join(tmp, '.npm-global/node_modules/git-log-formatter')
    stagePackage(target)
    const res = runPostinstall(target, home)
    assert.equal(res.status, 0, res.stderr)

    assert.equal(gitConfigGet(home, 'alias.lg-backup'), 'log --oneline --graph')

    const all = spawnSync('git', ['config', '--global', '--get-all', 'alias.lg'], {
      encoding: 'utf8',
      env: baseEnv(home),
    })
    const values = all.stdout.trim().split('\n').filter(Boolean)
    assert.equal(values.length, 1, `应只有一个 lg 别名，实际: ${values}`)
    assert.ok(values[0].includes('git-log-formatter'), '生效别名应指向本包')
  } finally {
    cleanup()
  }
})

test('带引号旧别名同样正确备份覆盖', () => {
  const { tmp, home, cleanup } = setup()
  try {
    writeFileSync(path.join(home, '.gitconfig'), '[alias]\n\tlg = "log --graph --pretty=format:%h %s"\n')
    const target = path.join(tmp, '.npm-global/node_modules/git-log-formatter')
    stagePackage(target)
    const res = runPostinstall(target, home)
    assert.equal(res.status, 0, res.stderr)
    assert.equal(gitConfigGet(home, 'alias.lg-backup'), 'log --graph --pretty=format:%h %s')
    assert.ok(gitConfigGet(home, 'alias.lg').includes('git-log-formatter'))
  } finally {
    cleanup()
  }
})

test('重复安装幂等：不再刷新备份，别名保持指向当前安装', () => {
  const { tmp, home, cleanup } = setup()
  try {
    writeFileSync(path.join(home, '.gitconfig'), '[alias]\n\tlg = log --oneline\n')
    const target = path.join(tmp, '.npm-global/node_modules/git-log-formatter')
    stagePackage(target)
    runPostinstall(target, home)
    // 用户在两次安装之间改了自己的别名
    spawnSync('git', ['config', '--global', 'alias.lg', 'log --oneline --decorate'], {
      env: baseEnv(home),
    })
    const res = runPostinstall(target, home)
    assert.equal(res.status, 0, res.stderr)
    // 备份仍是第一次的用户别名，未被第二次覆盖
    assert.equal(gitConfigGet(home, 'alias.lg-backup'), 'log --oneline')
    assert.ok(gitConfigGet(home, 'alias.lg').includes(target))
  } finally {
    cleanup()
  }
})

test('本包旧路径切换不占用用户备份位', () => {
  const { tmp, home, cleanup } = setup()
  try {
    const target = path.join(tmp, '.npm-global/node_modules/git-log-formatter')
    stagePackage(target)
    // 模拟 nvm 切版本后残留的旧路径别名
    spawnSync(
      'git',
      ['config', '--global', 'alias.lg', '!f() { node "/old/nvm/path/git-log-formatter/bin/git-lg.js" "$@"; }; f'],
      { env: baseEnv(home) }
    )
    const res = runPostinstall(target, home)
    assert.equal(res.status, 0, res.stderr)
    assert.equal(gitConfigGet(home, 'alias.lg-backup'), null, '旧的本包别名不应进备份位')
    assert.ok(gitConfigGet(home, 'alias.lg').includes(target))
  } finally {
    cleanup()
  }
})

test('本地安装：不写任何全局配置', () => {
  const { tmp, home, cleanup } = setup()
  try {
    const target = path.join(tmp, 'project/node_modules/git-log-formatter')
    stagePackage(target)
    const res = runPostinstall(target, home)
    assert.equal(res.status, 0, res.stderr)
    assert.match(res.stdout, /已安装到项目中/)
    assert.equal(gitConfigGet(home, 'alias.lg'), null)
  } finally {
    cleanup()
  }
})

test('CI 环境跳过别名配置', () => {
  const { tmp, home, cleanup } = setup()
  try {
    const target = path.join(tmp, '.npm-global/node_modules/git-log-formatter')
    stagePackage(target)
    const res = spawnSync('node', [path.join(target, 'postinstall.js')], {
      encoding: 'utf8',
      env: { ...baseEnv(home), CI: 'true' },
    })
    assert.equal(res.status, 0, res.stderr)
    assert.match(res.stdout, /跳过/)
    assert.equal(gitConfigGet(home, 'alias.lg'), null)
  } finally {
    cleanup()
  }
})

test('残留的双 lg 别名被收敛为单个', () => {
  const { tmp, home, cleanup } = setup()
  try {
    // 旧版本文本替换 bug 的典型残留
    writeFileSync(
      path.join(home, '.gitconfig'),
      '[alias]\n    lg = "!f() { node \\"/old/bin/git-lg.js\\" \\"$@\\"; }; f"\n\tlg = log --oneline --graph\n'
    )
    const target = path.join(tmp, '.npm-global/node_modules/git-log-formatter')
    stagePackage(target)
    const res = runPostinstall(target, home)
    assert.equal(res.status, 0, res.stderr)
    const all = spawnSync('git', ['config', '--global', '--get-all', 'alias.lg'], {
      encoding: 'utf8',
      env: baseEnv(home),
    })
    const values = all.stdout.trim().split('\n').filter(Boolean)
    assert.equal(values.length, 1, `双别名应收敛为一个，实际: ${values}`)
    assert.ok(values[0].includes(target))
  } finally {
    cleanup()
  }
})
