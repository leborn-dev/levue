const version = process.argv[2] || process.env.VERSION
if (version && !require('semver').valid(version)) {
  throw new Error('invalid release version')
}
const cc = require('conventional-changelog')
const file = `./RELEASE_NOTE${version ? `_${version}` : ``}.md`
const fileStream = require('fs').createWriteStream(file)

cc({
  preset: 'angular',
  pkg: {
    transform (pkg) {
      pkg.version = `v${version}`
      return pkg
    }
  }
}).pipe(fileStream).on('close', () => {
  console.log(`Generated release note at ${file}`)
})
