import { createBundleRunner } from '../src/bundle-renderer/create-bundle-runner'
import { createCompiler } from '../src/optimizing-compiler/index'
import { baseOptions } from 'web/compiler/options'
const { compile } = createCompiler(baseOptions)

describe('SSR security boundaries', () => {
  it('accepts own bundle filenames that collide with Object.prototype', async () => {
    const runner = createBundleRunner(
      'constructor',
      { constructor: 'module.exports = function(ctx) { return ctx.value }' },
      undefined,
      true
    )
    expect(await runner({ value: 'ok' })).toBe('ok')
  })
  it('does not dispatch a method named by request data', async () => {
    for (const mode of [true, false, 'once']) {
      const runner = createBundleRunner(
        'entry.js',
        { 'entry.js': 'module.exports = function(ctx) { return ctx.method }' },
        undefined,
        mode
      )
      expect(await runner({ method: 'constructor' })).toBe('constructor')
      expect(await runner({ method: '__proto__' })).toBe('__proto__')
    }
  })
  it('rejects nonfunction exports in reusable modes', async () => {
    for (const mode of [false, 'once']) {
      const runner = createBundleRunner(
        'entry.js',
        { 'entry.js': 'module.exports = { constructor: "unexpected" }' },
        undefined,
        mode
      )
      await expect(runner({ method: 'constructor' })).rejects.toThrow(
        'bundle export should be a function'
      )
    }
  })
  it('does not compile inherited metadata as SSR source', () => {
    Object.defineProperty(Object.prototype, 'classBinding', {
      configurable: true,
      value: 'globalThis.__polluted_ssr__ = true'
    })
    try {
      expect(
        compile('<div id="safe"><span>{{ value }}</span></div>').render
      ).not.toContain('__polluted_ssr__')
    } finally {
      delete Object.prototype['classBinding']
    }
  })
})
