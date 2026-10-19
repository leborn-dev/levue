'use strict'
const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const puppeteer = require('puppeteer')
const root = path.resolve(__dirname, '..')

// Standalone network integration: run explicitly with a supplied Chrome executable.
for (const file of ['benchmarks/reorder-list/index.html', 'examples/classic/select2/index.html']) {
  test(`${file}: external distributions are pinned and integrity checked`, () => {
    const html = fs.readFileSync(path.join(root, file), 'utf8')
    const tags = html.match(/<(?:script|link)\b[^>]*(?:src|href)="https:[^"]+"[^>]*>/g) || []
    assert.equal(tags.length, file.startsWith('benchmarks') ? 1 : 3)
    for (const tag of tags) {
      assert.match(tag, /https:\/\/cdn\.jsdelivr\.net\/npm\/[^@"]+@\d+\.\d+\.\d+\//)
      assert.match(tag, /integrity="sha384-[A-Za-z0-9+/=]+"/)
      assert.match(tag, /crossorigin="anonymous"/)
    }
  })
}

test('reorder benchmark preserves shuffle, keyed rows, select, add and remove', { timeout: 60000 }, async () => {
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(pathToFileURL(path.join(root, 'benchmarks/reorder-list/index.html')).href)
    await page.waitForFunction(() => typeof _ === 'function' && window.vm && vm.items.length === 1000)
    const security = await page.evaluate(() => {
      _.merge({}, JSON.parse('{"__proto__":{"__levue_cdn_polluted__":true}}'))
      const polluted = Object.prototype.__levue_cdn_polluted__ === true
      delete Object.prototype.__levue_cdn_polluted__
      return { polluted, version: _.VERSION }
    })
    assert.equal(security.polluted, false, 'the shipped lodash must not pollute Object.prototype')
    assert.equal(security.version, '4.18.1')
    const before = await page.$$eval('tr td:first-child', cells => cells.map(c => c.textContent))
    await page.click('button:first-of-type')
    await page.waitForFunction(old => JSON.stringify(vm.items.map(x => String(x.id))) !== JSON.stringify(old), {}, before)
    const shuffled = await page.$$eval('tr td:first-child', cells => cells.map(c => c.textContent))
    assert.notDeepEqual(shuffled, before)
    assert.deepEqual(shuffled.slice().sort(), before.slice().sort())
    await page.click('tr:first-child a')
    await page.waitForSelector('tr.danger')
    assert.equal(await page.$eval('tr.danger td', el => el.textContent), shuffled[0])
    await page.click('button:nth-of-type(2)')
    await page.waitForFunction(() => vm.items.length === 1001 && document.querySelectorAll('tr').length === 1001)
    await page.click('tr:first-child button')
    await page.waitForFunction(() => vm.items.length === 1000 && document.querySelectorAll('tr').length === 1000)
    assert.equal(await page.$$eval('tr.danger', rows => rows.length), 0)
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})

test('Select2 preserves Vue 2 input, value/options updates, escaping and cleanup', { timeout: 60000 }, async () => {
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(pathToFileURL(path.join(root, 'examples/classic/select2/index.html')).href)
    await page.waitForFunction(() => window.vm && window.jQuery && jQuery.fn.select2)
    assert.equal(await page.evaluate(() => jQuery.fn.jquery), '3.7.1')
    await page.click('.select2-selection')
    await page.waitForSelector('.select2-results__option')
    for (const option of await page.$$('.select2-results__option')) {
      if (await option.evaluate(el => el.textContent.trim() === 'World')) {
        await option.click()
        break
      }
    }
    await page.waitForFunction(() => vm.selected === '2' && vm.$el.querySelector('p').textContent.includes('2'))
    await page.evaluate(() => { vm.selected = '1' })
    await page.waitForFunction(() => document.querySelector('.select2-selection__rendered').textContent === 'Hello')
    await page.evaluate(() => {
      vm.options = [{ id: 1, text: 'Hello' }, { id: 3, text: '<img src=x onerror="window.__levue_select2_xss__=true">' }]
    })
    await page.waitForFunction(() => !!document.querySelector('option[value="3"]'))
    await page.evaluate(() => { vm.selected = '3' })
    await page.waitForFunction(() => document.querySelector('.select2-selection__rendered').textContent.includes('<img'))
    assert.equal(await page.$eval('.select2-selection__rendered', el => el.querySelectorAll('img').length), 0)
    assert.equal(await page.evaluate(() => !!window.__levue_select2_xss__), false)
    await page.evaluate(() => { vm.$children[0].$destroy() })
    assert.equal(await page.$eval('select', el => jQuery(el).data('select2') === undefined), true)
    assert.equal(await page.$$eval('.select2-container', nodes => nodes.length), 0)
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})
