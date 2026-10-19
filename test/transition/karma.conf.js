const featureFlags = require('../../scripts/feature-flags')
// Puppeteer 25 resolves its installed browser asynchronously.
// Karma accepts an async configuration function.

const define = {
  __DEV__: `true`,
  'process.env.CI': String(!!process.env.CI)
}

for (const key in featureFlags) {
  define[`process.env.${key}`] = String(featureFlags[key])
}

module.exports = async function (config) {
  process.env.CHROME_BIN =
    process.env.CHROME_BIN || (await require('puppeteer').executablePath())
  config.set({
    basePath: '.',
    frameworks: ['jasmine'],
    files: ['*.spec.ts'],
    preprocessors: {
      '*.spec.ts': ['esbuild']
    },
    esbuild: {
      define
    },
    browsers: ['ChromeHeadless'],
    plugins: ['karma-jasmine', 'karma-esbuild', 'karma-chrome-launcher'],
    singleRun: true
  })
}
