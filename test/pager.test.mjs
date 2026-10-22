import test from 'node:test'
import assert from 'node:assert/strict'
import { resolvePager, pagerArgv } from '../lib/pager.mjs'

test('resolvePager 遵循 GIT_PAGER > core.pager > PAGER > less', () => {
  assert.equal(resolvePager({ GIT_PAGER: 'delta' }, 'less -S'), 'delta')
  assert.equal(resolvePager({ PAGER: 'more' }, 'less -S'), 'less -S') // core.pager 优先于 PAGER
  assert.equal(resolvePager({ PAGER: 'more' }, null), 'more')
  assert.equal(resolvePager({}, null), 'less')
})

test('resolvePager 跳过空白值', () => {
  assert.equal(resolvePager({ GIT_PAGER: '  ', PAGER: 'more' }, ''), 'more')
})

test('pagerArgv：裸 less 自动补 -R -F -X', () => {
  assert.deepEqual(pagerArgv('less'), ['less', '-R', '-F', '-X'])
  assert.deepEqual(pagerArgv('/usr/bin/less'), ['/usr/bin/less', '-R', '-F', '-X'])
})

test('pagerArgv：用户自带参数或其他分页器原样尊重', () => {
  assert.deepEqual(pagerArgv('less -S'), ['less', '-S'])
  assert.deepEqual(pagerArgv('delta'), ['delta'])
  assert.deepEqual(pagerArgv('more'), ['more'])
})

test('pagerArgv：cat 与空命令不分页', () => {
  assert.equal(pagerArgv('cat'), null)
  assert.equal(pagerArgv('CAT.EXE'), null)
  assert.equal(pagerArgv(''), null)
  assert.equal(pagerArgv(null), null)
  assert.equal(pagerArgv('   '), null)
})
