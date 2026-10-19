import { parseHTML } from 'compiler/parser/html-parser'
import { compile } from 'web/compiler/index'

function eventsFor(input: string) {
  const events: any[] = []
  parseHTML(input, {
    start: (tag, attrs, unary, start, end) =>
      events.push(['start', tag, attrs, unary, start, end]),
    end: (tag, start, end) => events.push(['end', tag, start, end]),
    chars: (text, start, end) => events.push(['chars', text, start, end])
  })
  return events
}

for (const [tag, mixedCase] of [
  ['script', 'ScRiPt'],
  ['style', 'StYlE'],
  ['textarea', 'TeXtArEa']
]) {
  it(`preserves ${tag} content and case-insensitive closing-tag positions`, () => {
    const open = `<${mixedCase} data-mode="sample">`
    const body = 'plain <b>markup</b><!--comment--><![CDATA[text]]>&lt;\n'
    const close = `</${mixedCase} data-note="sample">`
    const input = '<div>' + open + body + close + '<p>after</p></div>'
    const events = eventsFor(input)
    const start = 5 + open.length + body.length
    expect(events.filter(event => event[0] === 'chars')).toEqual([
      ['chars', body, undefined, undefined],
      ['chars', 'after', start + close.length + 3, start + close.length + 8]
    ])
    expect(events.find(event => event[0] === 'end')).toEqual([
      'end',
      mixedCase,
      start,
      start + close.length
    ])
    expect(events[1]).toEqual([
      'start',
      mixedCase,
      [{ name: 'data-mode', value: 'sample' }],
      false,
      5,
      5 + open.length
    ])
    expect(events[events.length - 1]).toEqual([
      'end',
      'div',
      input.length - 6,
      input.length
    ])
  })

  it(`emits an empty ${tag} text callback before its end callback`, () => {
    const open = `<${tag}>`
    const close = `</${tag}>`
    expect(eventsFor(open + close).slice(1)).toEqual([
      ['chars', '', undefined, undefined],
      ['end', tag, open.length, open.length + close.length]
    ])
  })
}

it('preserves textarea leading-newline handling and source positions', () => {
  const input = '<textarea>\n\nFirst\nSecond</textarea><p>after</p>'
  const events = eventsFor(input)
  expect(
    events.filter(event => event[0] === 'chars').map(event => event[1])
  ).toEqual(['First\nSecond', 'after'])
  expect(events.find(event => event[0] === 'end')).toEqual([
    'end',
    'textarea',
    input.indexOf('</textarea>'),
    input.indexOf('<p>')
  ])
})

it('keeps successive plaintext parses independent', () => {
  for (const word of ['first', 'second', 'third']) {
    for (const tag of ['script', 'style', 'textarea']) {
      const events = eventsFor(`<${tag}>${word}</${tag}>`)
      expect(events[1]).toEqual(['chars', word, undefined, undefined])
      expect(events[2][1]).toBe(tag)
    }
  }
})

it('compiles an ordinary large plaintext document within a bounded budget', () => {
  const body = 'ordinary text\n'.repeat(20000)
  const start = performance.now()
  const result = compile(
    `<div><textarea>${body}</textarea><p>{{ message }}</p></div>`
  )
  expect(performance.now() - start).toBeLessThan(1000)
  expect(result.ast!.tag).toBe('div')
  expect(result.render).toContain('ordinary text')
  expect(result.render).toContain('_s(message)')
})
