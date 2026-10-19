'use strict'
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const vm = require('node:vm')
const root = path.resolve(__dirname, '..')

test('release notes reject paths before creating a file', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'vue-release-'))
  try {
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/gen-release-note.js'), 'x/../../escaped'], { cwd, encoding: 'utf8' })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /invalid release version/)
    assert.deepEqual(fs.readdirSync(cwd), [])
  } finally { fs.rmSync(cwd, { recursive: true, force: true }) }
})
test('commit verification only reads Git COMMIT_EDITMSG', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'vue-commit-invalid-'))
  try {
    assert.equal(spawnSync('git', ['init', '-q'], { cwd }).status, 0)
    fs.writeFileSync(path.join(cwd, '.git/COMMIT_EDITMSG'), 'fix(security): preserve safe input boundaries\n')
    fs.writeFileSync(path.join(cwd, 'package.json'), '{}\n')
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/verify-commit-msg.js')], { cwd, env: { ...process.env, GIT_PARAMS: 'package.json' }, encoding: 'utf8' })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Invalid commit message path/)
  } finally { fs.rmSync(cwd, { recursive: true, force: true }) }
})
test('Firebase example requires an explicit project configuration', () => {
  let initialized = false
  const sandbox = { Vue: function () {}, window: {}, document: { getElementById: () => ({ textContent: '' }) }, firebase: { initializeApp() { initialized = true }, database() { return { ref() { return {} } } } } }
  vm.runInNewContext(fs.readFileSync(path.join(root, 'examples/classic/firebase/app.js'), 'utf8'), sandbox)
  assert.equal(initialized, false)
})

test('commit verification accepts Git hook paths in a separate repository', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'vue-commit-'))
  try {
    assert.equal(spawnSync('git', ['init', '-q'], { cwd }).status, 0)
    const msg = path.join(cwd, '.git/COMMIT_EDITMSG')
    fs.writeFileSync(msg, 'fix(security): preserve safe input boundaries\n')
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/verify-commit-msg.js')], { cwd, env: { ...process.env, GIT_PARAMS: msg }, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
  } finally { fs.rmSync(cwd, { recursive: true, force: true }) }
})
test('Firebase example initializes only the explicitly supplied project', () => {
  const config = { apiKey: 'test-placeholder', databaseURL: 'https://example.invalid' }
  let actual
  let options
  const sandbox = {
    window: { FIREBASE_CONFIG: config },
    firebase: { initializeApp(value) { actual = value }, database() { return { ref: () => ({}) } } },
    Vue: function (value) { options = value }
  }
  vm.runInNewContext(fs.readFileSync(path.join(root, 'examples/classic/firebase/app.js'), 'utf8'), sandbox)
  assert.equal(actual, config)
  assert.ok(options.methods.addUser)
  assert.ok(options.methods.removeUser)
})
test('elastic header uses a pinned HTTPS script with SRI', () => {
  const html = fs.readFileSync(path.join(root, 'examples/classic/elastic-header/index.html'), 'utf8')
  assert.doesNotMatch(html, /<script[^>]+src="http:/)
  assert.match(html, /dynamics\.js@1\.1\.5\/lib\/dynamics\.js" integrity="sha384-[A-Za-z0-9+/=]+" crossorigin="anonymous"/)
})
