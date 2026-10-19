'use strict'
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const fork = name => path.dirname(require.resolve(name + '/package.json'))
const braces = require(fork('braces'))
for (const api of ['parse', 'compile', 'expand', 'stringify']) {
  test(`braces ${api} bounds hostile nesting`, () => {
    assert.throws(() => braces[api]('{'.repeat(4000) + 'a,b' + '}'.repeat(4000)), { code: 'ERR_BRACES_LIMIT' })
  })
}
test('braces public API retains ranges, expansion and compilation', () => {
  assert.deepEqual(braces.expand('a/{b,c}/{1..3}'), ['a/b/1','a/b/2','a/b/3','a/c/1','a/c/2','a/c/3'])
  assert.equal(braces.stringify(braces.parse('a/{b,c}/d')), 'a/{b,c}/d')
  assert.equal(braces.compile('a/{b,c}/d'), 'a/(b|c)/d')
  assert.deepEqual(braces(['{a,b}', '{x,y}'], { expand: true }), ['a','b','x','y'])
})
test('braces direct helpers and Cartesian expansions terminate within budget', () => {
  const child = spawnSync(process.execPath, ['-e', `const assert=require('node:assert/strict'); const p=${JSON.stringify(fork('braces'))};
    for(const api of ['compile','expand','stringify']) { const ast={type:'root',nodes:[]};ast.nodes.push(ast);assert.throws(()=>require(p+'/lib/'+api)(ast),{code:'ERR_BRACES_LIMIT'}); }
    const b=require(p);for(const x of ['{a,b}'.repeat(20),'{1..1000000000}','{1000000000..1}'])assert.throws(()=>b.expand(x,{rangeLimit:false}),{code:'ERR_BRACES_LIMIT'});
    assert.deepEqual(b.expand('{5..1}'),['5','4','3','2','1']);`], { timeout: 1500, encoding: 'utf8' })
  assert.equal(child.error, undefined)
  assert.equal(child.status, 0, child.stderr)
})
for (const entry of ['', '/dist/sprintf.min.js']) {
  test(`sprintf bounds numeric precision and width: ${entry || 'main'}`, () => {
    const { sprintf, vsprintf } = require(fork('sprintf-js') + entry)
    for (const spec of ['f', 'e', 'g']) {
      assert.doesNotThrow(() => sprintf('%.1000000' + spec, 1.234))
      assert.ok(sprintf('%.1000000' + spec, 1.234).length < 110)
    }
    assert.equal(sprintf('%.0f', 1.6), '2')
    assert.equal(sprintf('%.0g', 1.6), '2')
    assert.equal(vsprintf('%04d %s', [7, 'ok']), '0007 ok')
    assert.throws(() => sprintf('%1000000000s', 'a'), SyntaxError)
  })
}
