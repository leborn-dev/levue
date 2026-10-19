import { parse, ParserPlugin } from '@babel/parser'
import MagicString from 'magic-string'

const defaultExportRE = /(^[^\S\n]*|;[^\S\n]*)export(\s*)default\b/m
const exportDefaultClassRE =
  /(^[^\S\n]*|;[^\S\n]*)export\s+default\s+class\s+([\w$]+)/m

/**
 * Utility for rewriting `export default` in a script block into a variable
 * declaration so that we can inject things into it
 */
export function rewriteDefault(
  input: string,
  as: string,
  parserPlugins?: ParserPlugin[]
): string {
  if (!hasDefaultExport(input)) {
    return input + `\nconst ${as} = {}`
  }

  let replaced: string | undefined

  const classMatch = input.match(exportDefaultClassRE)
  if (classMatch) {
    replaced =
      input.replace(exportDefaultClassRE, '$1class $2') +
      `\nconst ${as} = ${classMatch[2]}`
  } else {
    replaced = input.replace(defaultExportRE, `$1const ${as} =`)
  }
  if (!hasDefaultExport(replaced)) {
    return replaced
  }

  // if the script somehow still contains `default export`, it probably has
  // multi-line comments or template strings. fallback to a full parse.
  const s = new MagicString(input)
  const ast = parse(input, {
    sourceType: 'module',
    plugins: parserPlugins
  }).program.body
  ast.forEach(node => {
    if (node.type === 'ExportDefaultDeclaration') {
      if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
        let start: number =
          node.declaration.decorators && node.declaration.decorators.length > 0
            ? node.declaration.decorators[
                node.declaration.decorators.length - 1
              ].end!
            : node.start!
        s.overwrite(start, node.declaration.id.start!, ` class `)
        s.append(`\nconst ${as} = ${node.declaration.id.name}`)
      } else {
        s.overwrite(node.start!, node.declaration.start!, `const ${as} = `)
      }
    }
    if (node.type === 'ExportNamedDeclaration') {
      for (const specifier of node.specifiers) {
        if (
          specifier.type === 'ExportSpecifier' &&
          specifier.exported.type === 'Identifier' &&
          specifier.exported.name === 'default'
        ) {
          if (node.source) {
            if (specifier.local.name === 'default') {
              const end = specifierEnd(input, specifier.local.end!, node.end)
              s.prepend(
                `import { default as __VUE_DEFAULT__ } from ${input.slice(
                  node.source.start!,
                  node.source.end!
                )}\n`
              )
              s.overwrite(specifier.start!, end, ``)
              s.append(`\nconst ${as} = __VUE_DEFAULT__`)
              continue
            } else {
              const end = specifierEnd(input, specifier.exported.end!, node.end)
              s.prepend(
                `import { ${input.slice(
                  specifier.local.start!,
                  specifier.local.end!
                )} } from ${input.slice(
                  node.source.start!,
                  node.source.end!
                )}\n`
              )
              s.overwrite(specifier.start!, end, ``)
              s.append(`\nconst ${as} = ${specifier.local.name}`)
              continue
            }
          }
          const end = specifierEnd(input, specifier.end!, node.end)
          s.overwrite(specifier.start!, end, ``)
          s.append(`\nconst ${as} = ${specifier.local.name}`)
        }
      }
    }
  })
  return s.toString()
}

export function hasDefaultExport(input: string): boolean {
  // A conservative linear precheck; the parser resolves comments and reexports.
  return (
    defaultExportRE.test(input) ||
    (/\bexport\s*[/\{]/.test(input) && /\bdefault\b/.test(input))
  )
}

function specifierEnd(
  input: string,
  end: number,
  nodeEnd: number | undefined | null
) {
  // export { default   , foo } ...
  let hasCommas = false
  let oldEnd = end
  while (end < nodeEnd!) {
    if (/\s/.test(input.charAt(end))) {
      end++
    } else if (input.charAt(end) === ',') {
      end++
      hasCommas = true
      break
    } else if (input.charAt(end) === '}') {
      break
    }
  }
  return hasCommas ? end : oldEnd
}
