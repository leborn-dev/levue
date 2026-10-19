import Vue from 'vue'
import { compile } from 'web/compiler/index'
import { parseHTML } from 'compiler/parser/html-parser'
import { defineReactive } from 'core/observer/index'

// These inputs are data/ambient properties, not trusted template expressions.
describe('compiler security boundaries', () => {
  for (const key of [
    'staticClass',
    'staticStyle',
    'classBinding',
    'styleBinding',
    ':class',
    ':style',
    'v-if'
  ]) {
    it(`does not compile inherited ${key} as source`, () => {
      Object.defineProperty(Object.prototype, key, {
        configurable: true,
        value: 'globalThis.__polluted_compiler__ = true'
      })
      try {
        const result = compile(
          '<div id="safe"><span>{{ message }}</span></div>'
        )
        expect(result.render).not.toContain('__polluted_compiler__')
      } finally {
        delete Object.prototype[key]
      }
    })
  }

  it('sets an own __proto__ data key without changing the prototype', () => {
    const data = {}
    const value = { polluted: true }
    Vue.set(data, '__proto__', value)
    expect(Object.getPrototypeOf(data)).toBe(Object.prototype)
    expect(Object.prototype.hasOwnProperty.call(data, '__proto__')).toBe(true)
    expect(data['__proto__']).toBe(value)
  })

  it('parses a malformed plaintext closing tag in linear time', () => {
    const input = '<script>' + '<'.repeat(60000) + '</textarea>'
    let text = ''
    const start = performance.now()
    parseHTML(input, {
      chars: chunk => {
        text += chunk
      }
    })
    expect(performance.now() - start).toBeLessThan(300)
    expect(text).toContain('</textarea>')
  })

  it('preserves trusted expressions, inline templates and event statements', () => {
    const result = Vue.compile(
      '<div><button @click.stop="count += 2">{{ count * 2 }}</button><x inline-template><p>{{ msg }}</p></x></div>'
    )
    const vm = new Vue({
      data: { count: 1 },
      render: result.render,
      staticRenderFns: result.staticRenderFns
    })
    const vnode = vm._render()
    expect(vnode.children![0].children![0].text).toBe('2')
    vnode.children![0].data!.on!.click({ stopPropagation() {} })
    expect(vm.count).toBe(3)
  })
})

it('does not observe an inherited __proto__ as a reactive property value', () => {
  const target = {}
  const other = {}
  try {
    defineReactive(target, '__proto__')
    Vue.set(other, '__levue_polluted__', true)
    expect(
      Object.prototype.hasOwnProperty.call(
        Object.prototype,
        '__levue_polluted__'
      )
    ).toBe(false)
    expect(
      Object.prototype.hasOwnProperty.call(Object.prototype, '__ob__')
    ).toBe(false)
    expect(Object.getPrototypeOf(target)).toBe(Object.prototype)
    expect(target['__proto__']).toBeUndefined()
    const inherited = Object.create({ normal: 3 })
    defineReactive(inherited, 'normal')
    expect(inherited.normal).toBe(3)
    inherited.normal = 4
    expect(inherited.normal).toBe(4)
  } finally {
    delete Object.prototype['__levue_polluted__']
    delete Object.prototype['__ob__']
  }
})

it('does not reuse inherited observer metadata when adding a property', () => {
  const prototype = Vue.observable({ existing: true })
  const child = Object.create(prototype)
  Vue.set(child, 'ownField', 42)
  expect(Object.prototype.hasOwnProperty.call(child, 'ownField')).toBe(true)
  expect(Object.prototype.hasOwnProperty.call(prototype, 'ownField')).toBe(
    false
  )
  expect(child.ownField).toBe(42)
})
