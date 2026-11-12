/* Fork update regressions: node --test scripts/version-update.test.cjs */
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')

const pkg = require('../package.json')
const published = require('../publish/version.json')
const root = path.resolve(__dirname, '..')
const compiled = new Map()
function load(file, dependencies, globals = {}) {
  if (!compiled.has(file)) {
    compiled.set(file, ts.transpileModule(readFileSync(path.join(root, file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: file,
    }).outputText)
  }
  const module = { exports: {} }
  vm.runInNewContext(compiled.get(file), {
    module,
    exports: module.exports,
    ...globals,
    require(id) {
      assert.ok(Object.hasOwn(dependencies, id), `Unmocked dependency ${id} in ${file}`)
      return dependencies[id]
    },
  }, { filename: file })
  return module.exports
}

const project = load('src/config/project.ts', { '../../package.json': pkg })
const channels = [
  'https://raw.githubusercontent.com/burningg/lx-music-car/master/publish/version.json',
  'https://cdn.jsdelivr.net/gh/burningg/lx-music-car@master/publish/version.json',
  'https://fastly.jsdelivr.net/gh/burningg/lx-music-car@master/publish/version.json',
  'https://gcore.jsdelivr.net/gh/burningg/lx-music-car@master/publish/version.json',
]
const release = version => ({ name: pkg.name, version, desc: 'Car release', history: [] })

function setupUpdates(respond = () => ({ body: published }), supportedAbis = ['arm64-v8a']) {
  const requests = []
  const downloads = []
  const installations = []
  const stopped = []
  const api = load('src/utils/version.js', {
    '../../package.json': pkg,
    '@/config/project': project,
    '@/config/constant': { APP_PROVIDER_NAME: 'cn.toside.music.car.provider' },
    '@/utils/request': {
      httpGet(url, options, callback) {
        requests.push(url)
        const result = respond(url, requests.length)
        callback(result.error, { statusCode: result.status ?? 200 }, result.body)
      },
    },
    '@/utils/fs': {
      temporaryDirectoryPath: '/tmp',
      stopDownload(id) { stopped.push(id) },
      downloadFile(url, savePath, options) {
        downloads.push({ url, savePath })
        options.begin({ statusCode: 200, contentLength: 100 })
        options.progress({ contentLength: 100, bytesWritten: 100 })
        return { jobId: downloads.length, promise: Promise.resolve() }
      },
    },
    '@/utils/nativeModules/utils': {
      getSupportedAbis: async() => supportedAbis,
      installApk: async(...args) => { installations.push(args) },
    },
  })
  return { api, requests, downloads, installations, stopped }
}

function setupCore(getVersionInfo, ignoreVersion = null) {
  const state = load('src/store/version/state.ts', { '../../../package.json': pkg }).default
  const utils = load('src/utils/index.ts', {
    './common': {},
    he: {},
    '@/utils/simplify-chinese-main': {},
  })
  let modals = 0
  const tips = []
  const api = load('src/core/version.ts', {
    '@/utils': { compareVer: utils.compareVer },
    '@/utils/version': { getVersionInfo },
    '@/store/version/state': { default: state },
    '@/store/version/action': {
      default: {
        setVersionInfo(info) { Object.assign(state.versionInfo, info) },
        setVisibleModal(visible) { state.showModal = visible },
      },
    },
    '@/utils/data': {
      getIgnoreVersion: async() => ignoreVersion,
      getIgnoreVersionFailTipTime: async() => 0,
      saveIgnoreVersionFailTipTime() {},
    },
    '@/navigation': { showVersionModal() { modals++ } },
    'react-native-navigation': { Navigation: {} },
    '@/utils/tools': { toast(message) { tips.push(message) } },
  }, { global: { i18n: { t: key => key } } })
  return { api, state, tips, get modals() { return modals } }
}

test('fork distribution identity is independent of original author credit', () => {
  assert.equal(project.PROJECT_URL, 'https://github.com/burningg/lx-music-car')
  assert.equal(project.PROJECT_REPOSITORY, 'burningg/lx-music-car')
  assert.equal(pkg.author.name, 'lyswhut')
  assert.equal(pkg.bugs.url, `${project.PROJECT_URL}/issues`)
  assert.equal(pkg.homepage, `${project.PROJECT_URL}#readme`)
  const differentAuthor = load('src/config/project.ts', {
    '../../package.json': { ...pkg, author: { name: 'another-contributor' } },
  })
  assert.equal(differentAuthor.PROJECT_URL, project.PROJECT_URL)
})

test('published metadata starts from the car version without upstream history', () => {
  assert.equal(published.name, pkg.name)
  assert.equal(published.version, pkg.version)
  assert.deepEqual(published.history, [])
  assert.match(published.desc, /LX Music Car/)
  assert.doesNotMatch(published.desc, /1\.9\.2/)
})

test('same-version car metadata does not trigger an update popup', async() => {
  const updates = setupUpdates()
  const core = setupCore(updates.api.getVersionInfo)
  await core.api.checkUpdate()
  assert.equal(core.state.versionInfo.isLatest, true)
  assert.equal(core.state.versionInfo.isUnknown, false)
  assert.equal(core.state.versionInfo.status, 'idle')
  assert.equal(core.modals, 0)
  assert.deepEqual(updates.requests, channels.slice(0, 1))
})

test('upstream 1.9.2 and unmarked old fork metadata are rejected on every channel', async() => {
  for (const body of [
    { version: '1.9.2', desc: 'Upstream', history: [] },
    { name: 'lx-music-mobile', version: '1.9.2', desc: 'Upstream', history: [] },
  ]) {
    const updates = setupUpdates(() => ({ body }))
    await assert.rejects(updates.api.getVersionInfo(), /Invalid release metadata/)
    assert.deepEqual(updates.requests, channels)
    const core = setupCore(updates.api.getVersionInfo)
    await core.api.checkUpdate()
    assert.equal(core.modals, 0)
    assert.equal(core.state.versionInfo.isUnknown, true)
    assert.equal(core.state.versionInfo.status, 'error')
  }
})

test('invalid or stale metadata falls back only to a valid car mirror', async() => {
  for (const body of [null, {}, { version: '1.9.2' }, release(''), release(192), release('../1.9.2')]) {
    const updates = setupUpdates((url, attempt) => ({ body: attempt === 1 ? body : release('1.0.1') }))
    assert.equal((await updates.api.getVersionInfo()).version, '1.0.1')
    assert.deepEqual(updates.requests, channels.slice(0, 2))
  }
})

test('network errors retry then fall back within the fork only', async() => {
  const updates = setupUpdates(url => url === channels[0]
    ? { error: new Error('offline') }
    : { body: release('1.0.1') })
  assert.equal((await updates.api.getVersionInfo()).version, '1.0.1')
  assert.deepEqual(updates.requests, [...Array(3).fill(channels[0]), channels[1]])
})

test('all missing or offline channels fail without consulting upstream', async() => {
  for (const result of [{ status: 404 }, { error: new Error('offline') }]) {
    const updates = setupUpdates(() => result)
    await assert.rejects(updates.api.getVersionInfo())
    assert.deepEqual(updates.requests, channels.flatMap(url => Array(3).fill(url)))
  }
})

test('a newer car release prompts even after a previous latest-version check', async() => {
  let version = '1.0.0'
  const updates = setupUpdates(() => ({ body: release(version) }))
  const core = setupCore(updates.api.getVersionInfo)
  await core.api.checkUpdate()
  assert.equal(core.state.versionInfo.isLatest, true)
  version = '1.0.1'
  await core.api.checkUpdate()
  assert.equal(core.state.versionInfo.isLatest, false)
  assert.equal(core.state.versionInfo.newVersion.version, version)
  assert.equal(core.modals, 1)
})

test('an ignored car version does not prompt', async() => {
  const core = setupCore(async() => release('1.0.1'), '1.0.1')
  await core.api.checkUpdate()
  assert.equal(core.state.versionInfo.isLatest, false)
  assert.equal(core.modals, 0)
})

test('a failed recheck clears stale latest-version state without prompting an update', async() => {
  let offline = false
  const core = setupCore(async() => {
    if (offline) throw new Error('offline')
    return release('1.0.0')
  })
  await core.api.checkUpdate()
  offline = true
  await core.api.checkUpdate()
  assert.equal(core.state.versionInfo.isLatest, false)
  assert.equal(core.state.versionInfo.isUnknown, true)
  assert.equal(core.state.versionInfo.status, 'error')
  assert.equal(core.modals, 0)
})

test('older car releases never prompt a downgrade', async() => {
  const core = setupCore(async() => release('0.9.0'))
  await core.api.checkUpdate()
  assert.equal(core.state.versionInfo.isLatest, true)
  assert.equal(core.modals, 0)
})

test('APK downloads use fork releases, car filenames and the matching provider', async() => {
  for (const abi of ['arm64-v8a', 'armeabi-v7a', 'x86_64', 'x86', 'universal']) {
    const updates = setupUpdates(undefined, abi === 'universal' ? ['unsupported-abi'] : [abi])
    const progress = []
    await updates.api.downloadNewVersion('1.0.1', (...args) => progress.push(args))
    assert.deepEqual(updates.downloads, [{
      url: `${project.PROJECT_URL}/releases/download/v1.0.1/lx-music-car-v1.0.1-${abi}.apk`,
      savePath: '/tmp/lx-music-car.apk',
    }])
    assert.deepEqual(updates.installations, [['/tmp/lx-music-car.apk', 'cn.toside.music.car.provider']])
    assert.deepEqual(progress, [[100, 0], [100, 100]])
    await updates.api.downloadNewVersion('1.0.1')
    assert.deepEqual(updates.stopped, [1])
  }
})

test('release generation writes the project marker and preserves car history', async() => {
  const writes = new Map()
  const version = JSON.parse(JSON.stringify(published))
  const packageCopy = JSON.parse(JSON.stringify(pkg))
  const noColor = value => value
  const publish = load('publish/utils/updateChangeLog.js', {
    fs: {
      readFileSync: file => file === '../changeLog.md' ? '### Fixes\n\n- Car update\n' : '## [1.0.0] - 2026-11-12\n',
      writeFileSync: (file, content) => writes.set(file, content),
    },
    './index': { jp: file => file, formatTime: () => '2026-11-12' },
    '../../package.json': packageCopy,
    '../version.json': version,
    chalk: { blue: noColor, green: noColor },
    './parseChangelog': { parseChangelog: async() => [{ version: '1.0.0' }] },
  }, { console: { log() {} } })
  await publish('1.0.1')
  const next = JSON.parse(writes.get('../version.json'))
  assert.equal(next.name, pkg.name)
  assert.equal(next.version, '1.0.1')
  assert.deepEqual(next.history.map(item => item.version), ['1.0.0'])
  assert.equal(JSON.parse(writes.get('../../package.json')).versionCode, pkg.versionCode + 1)
})

test('About download entry uses the same fork repository', () => {
  const about = readFileSync(path.join(root, 'src/screens/Home/Views/Setting/settings/About.tsx'), 'utf8')
  assert.match(about, /openUrl\(`\$\{PROJECT_URL\}\/releases`\)/)
  assert.ok(!about.includes('openUrl(\'https://github.com/lyswhut/lx-music-mobile/releases\')'))
})
