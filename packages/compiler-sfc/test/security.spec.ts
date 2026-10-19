import { rewriteDefault } from '../src'
import { compile } from './util'
import { parse as parseJS } from '@babel/parser'

describe('SFC security boundaries', () => {
  it('serializes inferred filenames as data', () => {
    const filename = "src/Foo';globalThis.injected=true;.vue"
    const result = compile(
      '<script setup>const n = 1</script>',
      {},
      { filename }
    )
    expect(() =>
      parseJS(result.content, { sourceType: 'module' })
    ).not.toThrow()
    expect(result.content).toContain(
      JSON.stringify("Foo';globalThis.injected=true;")
    )
  })
  it('preserves quoted source module names when rewriting reexports', () => {
    const result = rewriteDefault(
      `export { default } from "./foo'bar.js"`,
      '_default'
    )
    expect(() => parseJS(result, { sourceType: 'module' })).not.toThrow()
  })
  it('rewrites whitespace and named export adversarial inputs in linear time', () => {
    const start = performance.now()
    expect(rewriteDefault('\n'.repeat(50000), '_default')).toContain(
      'const _default = {}'
    )
    expect(
      rewriteDefault('export const a = "' + '.'.repeat(50000) + '"', '_default')
    ).toContain('const _default = {}')
    expect(performance.now() - start).toBeLessThan(300)
  })
})

it('preserves comments between export tokens', () => {
  expect(
    rewriteDefault(
      'const a = {}; export /* note */ { a as default }',
      '_default'
    )
  ).toContain('const _default = a')
  expect(rewriteDefault('export /* note */ default {}', '_default')).toContain(
    'const _default = {}'
  )
})

it('handles a long extensionless filename without quadratic matching', () => {
  const start = performance.now()
  const result = compile(
    '<script setup>const n = 1</script>',
    {},
    { filename: '.'.repeat(50000) + '!' }
  )
  expect(performance.now() - start).toBeLessThan(300)
  expect(result.content).not.toContain('__name:')
})
