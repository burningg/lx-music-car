/* Manual app backup contracts: node --test scripts/backup.test.cjs */
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const { gzipSync, gunzipSync } = require('node:zlib')
const ts = require('typescript')
const React = require('react')
const ShallowRenderer = require('react-shallow-renderer')
const root = path.resolve(__dirname, '..')
const folder = 'src/screens/Home/Views/Setting/settings/Backup/'
const json = value => JSON.parse(JSON.stringify(value))
const noop = () => {}
const logger = { error: noop, warn: noop, info: noop }

function evaluate(source, filename, mocks = {}, globals = {}) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: filename,
  })
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module, exports: module.exports, console: { ...console, warn: noop }, Date, Error, global: globals,
    require(id) {
      if (Object.hasOwn(mocks, id)) return mocks[id]
      if (['react', 'react/jsx-runtime'].includes(id)) return require(id)
      throw new Error(`Unmocked dependency: ${id} in ${filename}`)
    },
  }, { filename })
  return module.exports
}
function load(file, mocks = {}, globals = {}) {
  return evaluate(readFileSync(path.join(root, file), 'utf8'), file, mocks, globals)
}
const constants = load('src/config/constant.ts')
const keys = constants.storageDataPrefix
const defaults = load('src/config/defaultSetting.ts').default
const format = load('src/core/backup/format.ts', { '@/config/defaultSetting': { default: defaults, __esModule: true }, '@/config/constant': constants })
const music = {
  id: 'kw_123', name: '测试歌曲', singer: '歌手', source: 'kw', interval: '03:20',
  meta: { songId: '123', albumName: '专辑', qualitys: [{ type: '128k', size: null }], _qualitys: { '128k': { size: null } } },
}
const apiInfo = { id: 'user_api_test', name: '我的音源', description: '音源说明', author: 'author', homepage: '', version: '1.0', allowShowUpdateAlert: true }
const theme = {
  id: 'custom_test', name: '自定义主题', isDark: true, isCustom: true,
  config: {
    themeColors: { 'c-primary': '#123456', 'c-850': '#ffffff', 'c-450': '#cccccc' },
    extInfo: { 'c-app-background': '#000000', 'c-main-background': '#000000', 'bg-image': '', 'bg-image-position': 'center', 'bg-image-size': 'cover', 'c-badge-primary': '#fff', 'c-badge-secondary': '#ccc', 'c-badge-tertiary': '#aaa' },
  },
}
function backup() {
  return json({
    type: format.APP_BACKUP_TYPE, version: 1, appVersion: '1.0.0', createdAt: '2026-11-14T08:00:00.001Z',
    data: {
      setting: { ...defaults, 'common.apiSource': apiInfo.id, 'player.volume': 0.57, 'sync.enable': true, 'common.isAgreePact': true },
      fontSize: 1.2, themes: [theme], userApis: [{ info: apiInfo, script: '// 音源脚本\nconsole.log("source");' }],
      lists: { defaultList: [music], loveList: [music], userList: [{ id: 'list_road', name: '路上听', locationUpdateTime: null, list: [music] }] },
      dislikeRules: '不喜欢的歌@不喜欢的歌手',
    },
  })
}

function memoryEnvironment() {
  const raw = new Map()
  const files = new Map()
  const effects = []
  const fail = { storageWrites: 0, move: false, write: false, gzip: false, unlinkPath: '', unlinkCount: 0 }
  const storage = load('src/plugins/storage.ts', {
    '@react-native-async-storage/async-storage': {
      async getAllKeys() { return [...raw.keys()] },
      async getItem(key) { return raw.get(key) ?? null },
      async removeItem(key) { raw.delete(key) },
      async multiGet(requested) { return requested.map(key => [key, raw.get(key) ?? null]) },
      async multiSet(entries) {
        effects.push('storage-write')
        if (fail.storageWrites > 0) { fail.storageWrites--; throw new Error('Disk full') }
        for (const [key, value] of entries) raw.set(key, value)
      },
      async multiRemove(requested) { effects.push('storage-remove'); for (const key of requested) raw.delete(key) },
      async clear() { raw.clear() },
    },
    '@/utils/log': { log: logger },
  })
  const fs = {
    privateStorageDirectoryPath: '/data/user/0/cn.toside.music.car/files',
    temporaryDirectoryPath: '/data/user/0/cn.toside.music.car/cache',
    async existsFile(file) { return files.has(file) },
    async writeFile(file, text) {
      if (fail.write) throw new Error('File write failed')
      files.set(file, text); effects.push('file-write')
    },
    async readFile(file) { if (!files.has(file)) throw new Error(`Missing file: ${file}`); return files.get(file) },
    async moveFile(from, to) {
      if (fail.move) { files.delete(from); return }
      if (!files.has(from)) throw new Error('Move failed')
      files.set(to, files.get(from)); files.delete(from)
    },
    async unlink(file) {
      if (file === fail.unlinkPath && fail.unlinkCount > 0) { fail.unlinkCount--; return }
      files.delete(file)
    },
    async gzipFile(from, to) {
      if (fail.gzip) throw new Error('Compression failed')
      files.set(to, gzipSync(Buffer.from(files.get(from))).toString('base64'))
    },
    async unGzipFile(from, to) { files.set(to, gunzipSync(Buffer.from(files.get(from), 'base64')).toString()) },
  }
  function newRestoreModule() {
    return load('src/core/backup/storage.ts', { '@/config/constant': constants, '@/plugins/storage': storage, '@/utils/fs': fs, '@/utils/log': { log: logger }, './format': format })
  }
  const toolsSource = readFileSync(path.join(root, 'src/utils/tools.ts'), 'utf8')
  const fileTools = evaluate(
    "import { gzipFile, readFile, temporaryDirectoryPath, unGzipFile, unlink, writeFile } from '@/utils/fs'\n" +
    toolsSource.slice(toolsSource.indexOf('let backupTempFileId ='), toolsSource.indexOf('export const confirmDialog')),
    'file-tools.ts', { '@/utils/fs': fs },
  )
  const pendingPath = fs.privateStorageDirectoryPath + '/app-restore.pending.json'
  const rollbackPath = fs.privateStorageDirectoryPath + '/app-restore.rollback.json'
  return { raw, files, effects, fail, storage, fs, fileTools, newRestoreModule, restore: newRestoreModule(), pendingPath, rollbackPath }
}

async function seed(env) {
  await env.storage.saveDataMultiple([
    [keys.setting, { ...defaults, 'player.volume': 0.2, 'common.isAgreePact': false }],
    [keys.fontSize, 0.8], [keys.theme, []], [keys.userList, [{ id: 'old_list', name: 'old', locationUpdateTime: null }]],
    [keys.list + 'old_list', [music]], [keys.list + 'default', []],
    [keys.userApi, [{ ...apiInfo, id: 'user_api_old' }]], [keys.userApi + 'user_api_old', 'x'.repeat(510000)],
    [keys.dislikeList, 'old rule'], [keys.playInfo, { listId: 'old_list', index: 0 }],
    [keys.listPrevSelectId, 'old_list'], [keys.listScrollPosition, { old_list: 5 }],
    [keys.syncAuthKey, { secret: 'do not export' }], [keys.selectedManagedFolder, 'content://authorized-folder'],
    [keys.searchHistoryList, ['search history']], [keys.musicUrl + 'song', 'cached URL'],
  ])
  env.effects.length = 0
}
const snapshot = env => [...env.raw.entries()].sort(([a], [b]) => a.localeCompare(b))

test('round-trips settings, sources with scripts, themes, favorites and playlists', () => {
  const data = backup()
  assert.deepEqual(json(format.parseAppBackup(data)), data)
  assert.equal(data.data.setting['player.volume'], 0.57)
})

test('known settings get defaults and unknown storage-like fields are never imported', () => {
  const data = backup()
  delete data.data.setting['player.isEnableAudioOffload']
  data.data.setting[keys.syncAuthKey] = { secret: 'injection' }
  const parsed = format.parseAppBackup(data)
  assert.equal(parsed.data.setting['player.isEnableAudioOffload'], defaults['player.isEnableAudioOffload'])
  assert.equal(Object.hasOwn(parsed.data.setting, keys.syncAuthKey), false)
})

for (const [name, mutate] of [
  ['wrong product', b => { b.type = 'allData_v2' }],
  ['future format', b => { b.version = 999 }],
  ['invalid timestamp', b => { b.createdAt = 'not a date' }],
  ['missing settings', b => { delete b.data.setting }],
  ['empty settings', b => { b.data.setting = {} }],
  ['unknown-only settings', b => { b.data.setting = { surprise: true } }],
  ['wrong setting value type', b => { b.data.setting['player.volume'] = 'loud' }],
  ['non-finite setting', b => { b.data.setting['player.volume'] = Infinity }],
  ['invalid volume range', b => { b.data.setting['player.volume'] = -1 }],
  ['invalid playback rate', b => { b.data.setting['player.playbackRate'] = 0 }],
  ['invalid layout setting', b => { b.data.setting['playDetail.style.align'] = 'broken' }],
  ['invalid cache setting', b => { b.data.setting['player.cacheSize'] = 'Infinity' }],
  ['invalid font size', b => { b.data.fontSize = 0 }],
  ['missing source script', b => { delete b.data.userApis[0].script }],
  ['empty source script', b => { b.data.userApis[0].script = ' ' }],
  ['duplicate source ID', b => { b.data.userApis.push(b.data.userApis[0]) }],
  ['missing selected source', b => { b.data.setting['common.apiSource'] = 'user_api_missing' }],
  ['missing playlists', b => { delete b.data.lists.loveList }],
  ['duplicate list ID', b => { b.data.lists.userList.push(b.data.lists.userList[0]) }],
  ['reserved user list ID', b => { b.data.lists.userList[0].id = 'default' }],
  ['invalid song', b => { b.data.lists.defaultList[0].meta = null }],
  ['invalid song qualities', b => { b.data.lists.defaultList[0].meta.qualitys = [null] }],
  ['invalid theme', b => { b.data.themes[0].config.extInfo = null }],
]) {
  test(`rejects ${name} before staging or writing application data`, async() => {
    const env = memoryEnvironment(); await seed(env)
    const before = snapshot(env); const data = backup(); mutate(data)
    await assert.rejects(env.restore.stageAppRestore(data), format.BackupFormatError)
    assert.deepEqual(snapshot(env), before)
    assert.equal(env.files.size, 0)
    assert.deepEqual(env.effects, [])
  })
}

test('staging changes no live data; the next boot replaces data and drops stale chunks', async() => {
  const env = memoryEnvironment(); await seed(env)
  const before = snapshot(env)
  const data = backup(); data.data.userApis[0].script = '// large source\n' + 'x'.repeat(510000)
  await env.restore.stageAppRestore(data)
  assert.deepEqual(snapshot(env), before)
  assert.ok(env.files.has(env.pendingPath))
  await env.restore.applyPendingAppRestore()
  const setting = await env.storage.getData(keys.setting)
  assert.equal(setting['player.volume'], 0.57)
  assert.equal(setting['common.apiSource'], apiInfo.id)
  assert.equal(setting['common.isAgreePact'], false, 'agreement must not be imported')
  assert.equal(setting['sync.enable'], false, 'do not reconnect to an old sync server automatically')
  assert.equal(await env.storage.getData(keys.userApi + apiInfo.id), data.data.userApis[0].script)
  assert.deepEqual(json(await env.storage.getData(keys.userList)), [{ id: 'list_road', name: '路上听', locationUpdateTime: null }])
  assert.deepEqual(json(await env.storage.getData(keys.list + 'love')), [music])
  assert.equal(await env.storage.getData(keys.fontSize), 1.2)
  assert.equal(await env.storage.getData(keys.dislikeList), data.data.dislikeRules)
  for (const stale of [keys.userApi + 'user_api_old', keys.list + 'old_list', keys.playInfo, keys.listPrevSelectId, keys.listScrollPosition]) {
    assert.equal(await env.storage.getData(stale), null)
  }
  assert.equal([...env.raw.keys()].some(key => key.includes('user_api_old')), false)
  assert.deepEqual(json(await env.storage.getData(keys.syncAuthKey)), { secret: 'do not export' })
  assert.equal(await env.storage.getData(keys.selectedManagedFolder), 'content://authorized-folder')
  assert.deepEqual(json(await env.storage.getData(keys.searchHistoryList)), ['search history'])
  assert.equal(await env.storage.getData(keys.musicUrl + 'song'), 'cached URL')
  assert.equal(env.files.size, 0)
  assert.equal(env.restore.takeAppRestoreResult(), 'restored')
  assert.equal(env.restore.takeAppRestoreResult(), null)
  const after = snapshot(env)
  await env.restore.applyPendingAppRestore()
  assert.deepEqual(snapshot(env), after, 'ordinary launches do not back up or restore anything')
})

test('keeps an existing agreement and permits restoring an empty library', async() => {
  const env = memoryEnvironment()
  await env.storage.saveData(keys.setting, { ...defaults, 'common.isAgreePact': true })
  const data = backup(); data.data.setting['common.isAgreePact'] = false; data.data.setting['common.apiSource'] = ''
  data.data.userApis = []; data.data.lists = { defaultList: [], loveList: [], userList: [] }; data.data.themes = []
  await env.restore.stageAppRestore(data); await env.restore.applyPendingAppRestore()
  assert.equal((await env.storage.getData(keys.setting))['common.isAgreePact'], true)
  assert.deepEqual(json(await env.storage.getData(keys.userApi)), [])
  assert.deepEqual(json(await env.storage.getData(keys.userList)), [])
})

test('rolls back the complete previous snapshot after a storage write fails', async() => {
  const env = memoryEnvironment(); await seed(env)
  const before = snapshot(env)
  await env.restore.stageAppRestore(backup()); env.fail.storageWrites = 1
  await env.restore.applyPendingAppRestore()
  assert.deepEqual(snapshot(env), before)
  assert.equal(env.files.size, 0)
  assert.equal(env.restore.takeAppRestoreResult(), 'rolledBack')
})

test('retains the recovery journal if rollback fails, and recovers on a subsequent boot', async() => {
  const env = memoryEnvironment(); await seed(env)
  const before = snapshot(env)
  await env.restore.stageAppRestore(backup()); env.fail.storageWrites = 2
  await assert.rejects(env.restore.applyPendingAppRestore(), /Disk full/)
  assert.ok(env.files.has(env.rollbackPath)); assert.ok(env.files.has(env.pendingPath))
  const nextBoot = env.newRestoreModule()
  await nextBoot.applyPendingAppRestore()
  assert.deepEqual(snapshot(env), before)
  assert.equal(env.files.size, 0)
  assert.equal(nextBoot.takeAppRestoreResult(), 'rolledBack')
})

test('an interrupted restore recovers before initialization even if the pending marker was removed', async() => {
  const env = memoryEnvironment(); await seed(env)
  const before = snapshot(env)
  const selected = [keys.setting, keys.fontSize, keys.theme, keys.userList, keys.dislikeList, keys.playInfo, keys.listPrevSelectId, keys.listScrollPosition]
  const records = await env.storage.getDataMultiple([...env.raw.keys()].filter(key => selected.includes(key) || key.startsWith(keys.list) || key.startsWith(keys.userApi)))
  env.files.set(env.rollbackPath, JSON.stringify(records))
  await env.storage.removeData(keys.setting)
  await env.storage.saveData(keys.list + 'half_written', [music])
  const boot = env.newRestoreModule(); await boot.applyPendingAppRestore()
  assert.deepEqual(snapshot(env), before)
  assert.equal(boot.takeAppRestoreResult(), 'rolledBack')
})

test('fails before data removal when the recovery journal cannot be committed', async() => {
  const env = memoryEnvironment(); await seed(env); await env.restore.stageAppRestore(backup())
  const before = snapshot(env); env.fail.move = true
  await assert.rejects(env.restore.applyPendingAppRestore(), /commit/)
  assert.deepEqual(snapshot(env), before)
  assert.ok(env.files.has(env.pendingPath))
})

test('detects silent native rename failure and does not report a staged restore', async() => {
  const env = memoryEnvironment(); await seed(env); const before = snapshot(env); env.fail.move = true
  await assert.rejects(env.restore.stageAppRestore(backup()), /commit/)
  assert.deepEqual(snapshot(env), before)
  assert.equal(env.files.size, 0)
})

test('refuses a second staged restore instead of replacing the recovery payload', async() => {
  const env = memoryEnvironment(); await env.restore.stageAppRestore(backup())
  const pending = env.files.get(env.pendingPath)
  await assert.rejects(env.restore.stageAppRestore(backup()), /already pending/)
  assert.equal(env.files.get(env.pendingPath), pending)
})

test('exports the latest in-memory settings, full source scripts and library only', async() => {
  const b = backup()
  const exporter = load('src/core/backup/export.ts', {
    '../../../package.json': { version: '1.0.0' },
    '@/core/list': { getListMusics: async(id) => id === 'love' ? b.data.lists.loveList : id === 'default' ? b.data.lists.defaultList : b.data.lists.userList[0].list },
    '@/store/setting/state': { setting: b.data.setting },
    '@/store/list/state': { defaultList: { id: 'default' }, loveList: { id: 'love' }, userList: b.data.lists.userList.map(({ list, ...info }) => info) },
    '@/store/common/state': { fontSize: b.data.fontSize }, '@/store/userApi': { state: { list: [apiInfo] } },
    '@/utils/data': { getDislikeListRules: async() => b.data.dislikeRules, getUserApiScript: async() => b.data.userApis[0].script, getUserTheme: async() => b.data.themes },
    './format': format,
  })
  const result = await exporter.createAppBackup()
  assert.equal(result.data.setting['player.volume'], 0.57)
  assert.deepEqual(json(result.data), b.data)
  assert.equal(JSON.stringify(result).includes('sync_auth'), false)
  result.data.setting['player.volume'] = 0.9
  assert.equal(b.data.setting['player.volume'], 0.57, 'export is a detached snapshot')
})

test('compressed backup round-trip uses distinct temp files and cleans them up', async() => {
  const env = memoryEnvironment(); const b = backup()
  await Promise.all([env.fileTools.handleSaveFile('/Documents/a.lxmc', b), env.fileTools.handleSaveFile('/Documents/b.lxmc', { type: 'playList_v2', data: [] })])
  const [app, lists] = await Promise.all([env.fileTools.handleReadFile('/Documents/a.lxmc'), env.fileTools.handleReadFile('/Documents/b.lxmc')])
  assert.deepEqual(json(app), b); assert.equal(lists.type, 'playList_v2')
  assert.deepEqual([...env.files.keys()].sort(), ['/Documents/a.lxmc', '/Documents/b.lxmc'])
})

test('compression/decompression failures are propagated and temporary files are removed', async() => {
  const env = memoryEnvironment(); env.fail.gzip = true
  await assert.rejects(env.fileTools.handleSaveFile('/Documents/bad.lxmc', backup()), /Compression/)
  assert.equal(env.files.size, 0)
  env.files.set('/Documents/broken.lxmc', 'not gzip')
  await assert.rejects(env.fileTools.handleReadFile('/Documents/broken.lxmc'))
  assert.deepEqual([...env.files.keys()], ['/Documents/broken.lxmc'])
})

test('JSON backups and the legacy double-serialized JSON list format remain readable', async() => {
  const env = memoryEnvironment(); env.files.set('/Documents/app.JSON', JSON.stringify(backup()))
  assert.equal((await env.fileTools.handleReadFile('/Documents/app.JSON')).type, format.APP_BACKUP_TYPE)
  env.files.set('/Documents/list.json', JSON.stringify(JSON.stringify({ type: 'playList_v2', data: [] })))
  assert.equal((await env.fileTools.handleReadFile('/Documents/list.json')).type, 'playList_v2')
})

for (const privatePath of ['/storage/emulated/0/Android/data', '/sdcard/Android/data/cn.toside.music.car/files', '/sdcard/Android/obb/app', '/data/user/0/cn.toside.music.car/files', '/data/data/cn.toside.music.car/cache', 'content://com.android.externalstorage.documents/tree/primary%3AAndroid%2Fdata']) {
  test(`blocks uninstall-prone backup folder ${privatePath}`, () => { assert.equal(format.isAppPrivateBackupPath(privatePath), true) })
}
for (const publicPath of ['/storage/emulated/0/Download', '/storage/emulated/0/Documents', '/storage/USB-0001/backup', 'content://com.android.externalstorage.documents/tree/primary%3ADocuments']) {
  test(`accepts public backup folder ${publicPath}`, () => { assert.equal(format.isAppPrivateBackupPath(publicPath), false) })
}

test('backup names include time with milliseconds, extension and an explicit timezone', () => {
  const a = format.getBackupFileName(new Date('2026-11-14T08:00:00.001Z'))
  const b = format.getBackupFileName(new Date('2026-11-14T08:00:00.002Z'))
  assert.match(a, /^lx-music-car-backup-.*001Z\.lxmc$/); assert.notEqual(a, b); assert.equal(a.includes(':'), false)
})

function actionsSetup({ input = backup(), confirm = true, stageFails = false, exportFails = false } = {}) {
  const events = []; const dialogs = []
  const actions = load(folder + 'appActions.ts', {
    '@/core/common': { exitApp: () => { events.push('exit') } },
    '@/core/backup/export': { createAppBackup: async() => { events.push('create'); return backup() } },
    '@/core/backup/format': format,
    '@/core/backup/storage': { stageAppRestore: async() => { events.push('stage'); if (stageFails) throw new Error('No space') } },
    '@/utils/tools': {
      toast: noop,
      handleReadFile: async() => { events.push('read'); return input },
      handleSaveFile: async(file) => { events.push('save:' + file); if (exportFails) throw new Error('No space') },
      confirmDialog: async(options) => { events.push('confirm'); dialogs.push(options); return confirm },
      tipDialog: async(options) => { events.push('success'); dialogs.push(options) },
    },
  }, { i18n: { t: (key, values) => key + JSON.stringify(values ?? {}) } })
  return { actions, events, dialogs }
}

test('cancelled import never stages, overwrites or exits', async() => {
  const { actions, events } = actionsSetup({ confirm: false })
  assert.equal(await actions.handleImportAppBackup('/backup.lxmc'), false)
  assert.deepEqual(events, ['read', 'confirm'])
})

test('invalid input is rejected before the destructive confirmation', async() => {
  const { actions, events } = actionsSetup({ input: { type: 'playList_v2', data: [] } })
  await assert.rejects(actions.handleImportAppBackup('/list.lxmc'), format.BackupFormatError)
  assert.deepEqual(events, ['read'])
})

test('restore confirmation shows counts, disallows background dismissal and exits only after staging', async() => {
  const { actions, events, dialogs } = actionsSetup()
  assert.equal(await actions.handleImportAppBackup('/backup.lxmc'), true)
  assert.deepEqual(events, ['read', 'confirm', 'stage', 'exit'])
  assert.equal(dialogs[0].danger, true); assert.equal(dialogs[0].bgClose, false)
  assert.match(dialogs[0].message, /"lists":3/); assert.match(dialogs[0].message, /"sources":1/)
})

test('failed staging does not close the app', async() => {
  const { actions, events } = actionsSetup({ stageFails: true })
  await assert.rejects(actions.handleImportAppBackup('/backup.lxmc'), /No space/)
  assert.equal(events.includes('exit'), false)
})

test('export confirms the actual path only after a successful write', async() => {
  const { actions, events, dialogs } = actionsSetup()
  await actions.handleExportAppBackup('/Documents/')
  assert.equal(events[0], 'create'); assert.match(events[1], /^save:\/Documents\/lx-music-car-backup-/); assert.equal(events[2], 'success')
  assert.ok(dialogs[0].message.includes('/Documents/lx-music-car-backup-'))
})

test('export failures never report success, and private folders are rejected before collection', async() => {
  const failed = actionsSetup({ exportFails: true })
  await assert.rejects(failed.actions.handleExportAppBackup('/Documents'), /No space/)
  assert.equal(failed.events.includes('success'), false)
  const blocked = actionsSetup()
  await assert.rejects(blocked.actions.handleExportAppBackup('/sdcard/Android/data/app'), blocked.actions.BackupLocationError)
  assert.deepEqual(blocked.events, [])
})

function find(node, predicate) {
  if (!React.isValidElement(node)) return undefined
  if (predicate(node)) return node
  for (const child of React.Children.toArray(node.props.children)) {
    const result = find(child, predicate); if (result) return result
  }
}
function mountBackup(actions) {
  const toasts = []; const choices = []
  const Component = load(folder + 'AppBackup.tsx', {
    'react-native': { View: 'View', StyleSheet: { create: styles => styles } },
    '@/components/common/ChoosePath': 'ChoosePath', '@/components/car': { CarText: 'CarText' },
    '@/store/theme/hook': { useTheme: () => ({ 'text-2': '#888888' }) }, '@/lang': { useI18n: () => key => key },
    '@/utils/hooks': { useUnmounted: () => ({ current: false }) }, '@/utils/log': { log: logger }, '@/utils/tools': { toast: message => toasts.push(message) },
    '@/core/backup/format': format, '../../components/SubTitle': 'SubTitle', '../../components/Button': 'Button',
    './appActions': { ...actions, BackupLocationError: class extends Error {} },
  }).default
  const renderer = new ShallowRenderer(); renderer.render(React.createElement(Component.type ?? Component))
  const output = () => renderer.getRenderOutput()
  const picker = () => find(output(), node => node.type === 'ChoosePath')
  picker().ref.current = { show: options => { choices.push(options) } }
  const button = action => find(output(), node => node.type === 'Button' && node.props.children === 'setting_backup_app_' + action)
  return { button, picker, choices, toasts }
}

test('UI offers only manual export/restore, chooses the right file mode and blocks duplicate operations', async() => {
  let finish; let writes = 0
  const view = mountBackup({ handleExportAppBackup: () => { writes++; return new Promise(resolve => { finish = resolve }) }, handleImportAppBackup: async() => false })
  view.button('export').props.onPress()
  assert.equal(view.choices[0].dirOnly, true)
  const pending = view.picker().props.onConfirm('/Documents')
  assert.equal(view.button('export').props.disabled, true); assert.equal(view.button('import').props.disabled, true)
  await view.picker().props.onConfirm('/Documents'); assert.equal(writes, 1)
  finish(); await pending
  assert.equal(view.button('export').props.disabled, false)
  view.button('import').props.onPress()
  assert.equal(view.choices.at(-1).dirOnly, false)
  assert.deepEqual(json(view.choices.at(-1).filter), ['lxmc', 'json'])
})

test('UI unlocks after cancel/error and stays locked after accepting a restore', async() => {
  let result = false
  const view = mountBackup({ handleExportAppBackup: async() => {}, handleImportAppBackup: async() => { if (result === 'error') throw new format.BackupFormatError('bad'); return result } })
  view.button('import').props.onPress(); await view.picker().props.onConfirm('/file')
  assert.equal(view.button('import').props.disabled, false)
  result = 'error'; await view.picker().props.onConfirm('/file')
  assert.equal(view.button('import').props.disabled, false); assert.deepEqual(view.toasts, ['setting_backup_app_invalid'])
  result = true; await view.picker().props.onConfirm('/file')
  assert.equal(view.button('import').props.disabled, true)
})

test('boot applies pending restore before reading font size and all feature initialization', () => {
  const app = readFileSync(path.join(root, 'src/app.ts'), 'utf8')
  assert.match(app, /applyPendingAppRestore\(\)\.then\(async\(\) => Promise\.all\(\[getFontSize\(\), windowSizeTools\.init\(\)\]\)\)/)
  assert.ok(app.indexOf('applyPendingAppRestore().then') < app.indexOf("await import('@/core/init')"))
})

test('all locales include the backup controls, warnings and confirmation placeholders', () => {
  const locales = ['zh-cn', 'zh-tw', 'en-us'].map(locale => JSON.parse(readFileSync(path.join(root, `src/lang/${locale}.json`))))
  const expected = Object.keys(locales[0]).filter(key => key.startsWith('setting_backup_app'))
  assert.equal(expected.length, 19)
  for (const messages of locales) {
    for (const key of expected) assert.equal(typeof messages[key], 'string')
    for (const placeholder of ['{date}', '{lists}', '{sources}']) assert.ok(messages.setting_backup_app_confirm.includes(placeholder))
    assert.ok(messages.setting_backup_app_storage_tip.includes('Android/data'))
  }
})


test('silent pending-file deletion failure cannot report success or replay a restore later', async() => {
  const env = memoryEnvironment(); await seed(env); const before = snapshot(env)
  await env.restore.stageAppRestore(backup())
  env.fail.unlinkPath = env.pendingPath; env.fail.unlinkCount = 1
  await env.restore.applyPendingAppRestore()
  assert.deepEqual(snapshot(env), before)
  assert.equal(env.restore.takeAppRestoreResult(), 'rolledBack')
  assert.equal(env.files.size, 0)
})

for (const contents of ['{broken', JSON.stringify({ type: 'wrong' })]) {
  test(`a corrupt staged file is discarded before mutation: ${contents}`, async() => {
    const env = memoryEnvironment(); await seed(env); const before = snapshot(env)
    env.files.set(env.pendingPath, contents)
    await env.restore.applyPendingAppRestore()
    assert.deepEqual(snapshot(env), before)
    assert.equal(env.restore.takeAppRestoreResult(), 'rolledBack')
    assert.deepEqual(env.effects, [])
    assert.equal(env.files.size, 0)
  })
}

test('long restore confirmations scroll within the viewport while keeping buttons outside the scroll area', () => {
  const Component = load('src/components/car/ConfirmDialog.tsx', {
    'react-native': Object.fromEntries(['View', 'Pressable', 'ScrollView', 'TouchableOpacity'].map(name => [name, name])),
    '@/store/theme/hook': { useTheme: () => ({}) }, '@/utils/pixelRatio': { px: value => value }, './CarIcon': 'CarIcon', './CarText': 'CarText',
  }).default
  const renderer = new ShallowRenderer()
  renderer.render(React.createElement(Component.type ?? Component, { options: { title: 'Restore', message: 'Long description', bgClose: false }, onCancel: noop, onConfirm: noop }))
  const output = renderer.getRenderOutput()
  const card = find(output, node => node.props.style?.maxHeight === '90%')
  assert.equal(card.props.style.maxWidth, '92%')
  const scroller = find(card, node => node.type === 'ScrollView')
  assert.equal(scroller.props.style.flexShrink, 1)
  assert.equal(find(scroller, node => node.type === 'TouchableOpacity'), undefined)
  assert.ok(find(card, node => node.type === 'TouchableOpacity'))
})


test('nullable source metadata from previously imported desktop playlists is normalized', () => {
  const b = backup(); b.data.lists.userList[0].source = null; b.data.lists.userList[0].sourceListId = null
  const list = format.parseAppBackup(b).data.lists.userList[0]
  assert.equal(list.source, undefined); assert.equal(list.sourceListId, undefined)
})

function legacyActionsSetup(input, saveFails = false) {
  const toasts = []; const events = []
  const actions = load(folder + 'actions.ts', {
    '@/config/constant': constants, '@/core/backup/format': format,
    '@/core/list': { getListMusics: async() => [], overwriteListFull: async() => { events.push('overwrite') } },
    '@/utils': { filterMusicList: list => list, fixNewMusicInfoQuality: value => value, toNewMusicInfo: value => value },
    '@/utils/log': { log: logger },
    '@/utils/tools': {
      toast: key => toasts.push(key), handleReadFile: async() => input,
      handleSaveFile: async() => { if (saveFails) throw new Error('write failed') },
      confirmDialog: async() => true, showImportTip: type => { events.push(type) }, tipDialog: async() => { events.push('app-backup-tip') },
    },
    '@/store/list/state': { defaultList: { id: 'default' }, loveList: { id: 'love' }, userList: [] },
  }, { i18n: { t: key => key } })
  return { actions, toasts, events }
}

test('legacy list importer redirects app backups and never claims to have imported them', async() => {
  const state = legacyActionsSetup(backup())
  state.actions.handleImportList('/app.lxmc'); await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(state.events, ['app-backup-tip'])
  assert.equal(state.toasts.includes('setting_backup_part_import_list_tip_success'), false)
})

test('legacy playlist files still import and failed list exports do not show success', async() => {
  const imported = legacyActionsSetup({ type: 'playList_v2', data: [] })
  imported.actions.handleImportList('/list.lxmc'); await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(imported.events, ['overwrite'])
  assert.ok(imported.toasts.includes('setting_backup_part_import_list_tip_success'))
  const failed = legacyActionsSetup(null, true)
  failed.actions.handleExportList('/Documents'); await new Promise(resolve => setImmediate(resolve))
  assert.equal(failed.toasts.includes('setting_backup_part_export_list_tip_success'), false)
  assert.ok(failed.toasts.some(message => message.startsWith('setting_backup_part_export_list_tip_failed')))
})
