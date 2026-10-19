const chalk = require('chalk')
const msgPath = process.env.GIT_PARAMS
const fs = require('fs')
const expectedPath = require('child_process').execFileSync(
  'git', ['rev-parse', '--git-path', 'COMMIT_EDITMSG'], { encoding: 'utf8' }
).trim()
let validPath = false
try {
  validPath = !!msgPath && fs.realpathSync(msgPath) === fs.realpathSync(expectedPath)
} catch (_) {}
if (!validPath) {
  throw new Error('Invalid commit message path')
}
const msg = fs.readFileSync(expectedPath, 'utf-8').trim()

const commitRE =
  /^(revert: )?(wip|release|feat|fix|polish|docs|style|refactor|perf|test|workflow|ci|chore|types|build)(\(.+\))?: .{1,50}/

if (!commitRE.test(msg)) {
  console.log()
  console.error(
    `  ${chalk.bgRed.white(' ERROR ')} ${chalk.red(
      `invalid commit message format.`
    )}\n\n` +
      chalk.red(
        `  Proper commit message format is required for automated changelog generation. Examples:\n\n`
      ) +
      `    ${chalk.green(`feat(compiler): add 'comments' option`)}\n` +
      `    ${chalk.green(
        `fix(v-model): handle events on blur (close #28)`
      )}\n\n` +
      chalk.red(`  See .github/COMMIT_CONVENTION.md for more details.\n`)
  )
  process.exit(1)
}
