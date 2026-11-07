// Run with: node --test scripts/android-build.test.cjs
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')
const gradle = readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8')
const scripts = require('../package.json').scripts
const wrapper = readFileSync(path.join(__dirname, 'gradle.cjs'), 'utf8')

function block(source, name) {
  const start = source.indexOf(`${name} {`)
  assert.notEqual(start, -1, `Missing Gradle block: ${name}`)
  let depth = 1
  const bodyStart = source.indexOf('{', start) + 1
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === '{') depth++
    if (source[i] === '}' && --depth === 0) return source.slice(bodyStart, i)
  }
  assert.fail(`Unclosed Gradle block: ${name}`)
}

function runWrapper(platform, result) {
  const calls = []
  const errors = []
  let exitCode
  vm.runInNewContext(wrapper, {
    require: name => name === 'node:child_process'
      ? { spawnSync: (...args) => { calls.push(args); return result } }
      : require(name),
    __dirname,
    console: { error: message => errors.push(message) },
    process: {
      platform,
      argv: ['node', 'scripts/gradle.cjs', 'assembleStandalone', '-PreactNativeArchitectures=arm64-v8a'],
      exit: code => { exitCode = code },
    },
  })
  return { calls, errors, exitCode }
}

test('standalone bundles production JS while debug keeps Metro/Fast Refresh', () => {
  assert.match(block(gradle, 'react'), /debuggableVariants\s*=\s*\["debug"\]/)
  const buildTypes = block(gradle, 'buildTypes')
  const standalone = block(buildTypes, 'standalone')
  assert.match(standalone, /initWith release/)
  assert.match(standalone, /matchingFallbacks\s*=\s*\["release"\]/)
  assert.match(standalone, /debuggable false/)
  assert.match(standalone, /signingConfig signingConfigs\.debug/)
  assert.doesNotMatch(standalone, /applicationIdSuffix|versionCode|versionNameSuffix/)
  assert.match(block(buildTypes, 'release'), /signingConfig signingConfigs\.release/)
  const application = readFileSync(path.join(root, 'android/app/src/main/java/cn/toside/music/mobile/MainApplication.java'), 'utf8')
  assert.match(application, /boolean getUseDeveloperSupport\(\)\s*\{\s*return BuildConfig\.DEBUG;/)
})

test('local builds can configure without private release signing properties', () => {
  const signing = block(gradle, 'signingConfigs')
  assert.match(block(signing, 'if (keystorePropertiesFile.exists())'), /keystorePropertiesFile\.withInputStream/)
})

test('daily install is explicitly standalone, with no running packager required', () => {
  assert.equal(scripts.android, 'react-native run-android --mode standalone --no-packager --active-arch-only')
  assert.equal(scripts.dev, 'react-native run-android --active-arch-only')
  assert.equal(scripts['pack:android:standalone'], 'node scripts/gradle.cjs assembleStandalone')
  assert.equal(scripts['pack:android:debug'], 'node scripts/gradle.cjs assembleDebug')
  assert.equal(scripts['pack:android'], 'node scripts/gradle.cjs assembleRelease')
  assert.equal(scripts.clear, 'node scripts/gradle.cjs clean')
})

for (const platform of ['darwin', 'linux', 'win32']) {
  test(`Gradle wrapper uses android cwd and forwards args on ${platform}`, () => {
    const { calls, errors, exitCode } = runWrapper(platform, { status: 0 })
    assert.equal(calls.length, 1)
    const [command, args, options] = calls[0]
    assert.equal(command, platform === 'win32' ? 'gradlew.bat' : './gradlew')
    assert.deepEqual(args, ['assembleStandalone', '-PreactNativeArchitectures=arm64-v8a'])
    assert.equal(options.cwd, path.join(root, 'android'))
    assert.equal(options.stdio, 'inherit')
    assert.equal(options.shell, platform === 'win32')
    assert.equal(exitCode, 0)
    assert.deepEqual(errors, [])
  })
}

test('Gradle failures propagate to npm instead of reporting success', () => {
  assert.equal(runWrapper('darwin', { status: 17 }).exitCode, 17)
  assert.equal(runWrapper('darwin', { status: null, signal: 'SIGTERM' }).exitCode, 1)
  const failure = runWrapper('win32', { status: null, error: new Error('spawn failed') })
  assert.equal(failure.exitCode, 1)
  assert.deepEqual(failure.errors, ['Unable to start Gradle: spawn failed'])
})
