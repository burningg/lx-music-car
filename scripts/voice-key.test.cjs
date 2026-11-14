// Run with: node --test scripts/voice-key.test.cjs (JDK required for the native press state-machine test).
const assert = require('node:assert/strict')
const { mkdtempSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')
const vm = require('node:vm')
const { spawnSync } = require('node:child_process')
const { EventEmitter } = require('node:events')
const { test } = require('node:test')
const ts = require('typescript')
const React = require('react')
const ShallowRenderer = require('react-shallow-renderer')

const root = path.resolve(__dirname, '..')
function load(file, dependencies, globals = {}) {
  const filename = path.join(root, file)
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  })
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module, exports: module.exports, global: globals,
    require(id) {
      assert.ok(Object.hasOwn(dependencies, id), `Unmocked dependency ${id}`)
      return dependencies[id]
    },
  }, { filename })
  return module.exports
}

function bridge({ OS = 'android', available = true, legacy = false } = {}) {
  const events = new EventEmitter()
  const enabled = []
  let created = 0
  const native = { setEnabled: value => enabled.push(value) }
  if (legacy) delete native.setEnabled
  const api = load('src/utils/nativeModules/voiceKey.ts', {
    'react-native': {
      Platform: { OS }, NativeModules: available ? { VoiceKeyModule: native } : {},
      NativeEventEmitter: class {
        constructor(module) { assert.equal(module, native); ++created }
        addListener(name, handler) { events.on(name, handler); return { remove: () => events.off(name, handler) } }
      },
    },
  })
  return { ...api, enabled, events, get created() { return created } }
}

for (const options of [{ OS: 'ios' }, { available: false }, { legacy: true }]) {
  test(`voice-key bridge is a no-op when unsupported: ${JSON.stringify(options)}`, () => {
    const ctx = bridge(options)
    const remove = ctx.onVoiceKey(() => assert.fail('unsupported platform callback'))
    remove()
    remove()
    assert.equal(ctx.created, 0)
    assert.deepEqual(ctx.enabled, [])
  })
}

test('voice-key bridge enables only with active subscribers and cleans up idempotently', () => {
  const ctx = bridge()
  const calls = []
  const first = ctx.onVoiceKey(() => calls.push('first'))
  const second = ctx.onVoiceKey(() => calls.push('second'))
  assert.deepEqual(ctx.enabled, [true])
  ctx.events.emit('voice-key', { keyCode: 304 })
  assert.deepEqual(calls, ['first', 'second'])
  first()
  first()
  assert.deepEqual(ctx.enabled, [true])
  ctx.events.emit('voice-key', { keyCode: 312 })
  assert.deepEqual(calls, ['first', 'second', 'second'])
  second()
  assert.deepEqual(ctx.enabled, [true, false])
  assert.equal(ctx.events.listenerCount('voice-key'), 0)
  const third = ctx.onVoiceKey(() => {})
  third()
  assert.deepEqual(ctx.enabled, [true, false, true, false])
})

function searchHook({ OS = 'android', navActiveId = 'nav_search', componentIds = { home: 'home-id' }, foreground = 'active' } = {}) {
  const cleanups = []
  const stateEvents = new EventEmitter()
  const appEvents = new EventEmitter()
  const state = { navActiveId, componentIds }
  const subscriptions = []
  let called = 0
  const appState = {
    currentState: foreground,
    addEventListener(name, handler) { appEvents.on(name, handler); return { remove: () => appEvents.off(name, handler) } },
  }
  const hook = load('src/screens/Home/Views/Search/HeaderBar/useVoiceKey.ts', {
    react: { ...React, useEffect: create => { if (!cleanups.length) cleanups.push(create()) } },
    'react-native': { Platform: { OS }, AppState: appState },
    '@/config/constant': { COMPONENT_IDS: { home: 'home' } },
    '@/store/common/state': { __esModule: true, default: state },
    '@/utils/nativeModules/voiceKey': {
      onVoiceKey: handler => {
        const subscription = { handler, removed: false }
        subscriptions.push(subscription)
        return () => { subscription.removed = true }
      },
    },
  }, { state_event: stateEvents }).default
  function Harness({ callback }) { hook(callback); return React.createElement('View') }
  const renderer = new ShallowRenderer()
  const render = (callback = () => { ++called }) => renderer.render(React.createElement(Harness, { callback }))
  render()
  return {
    state, subscriptions, stateEvents, appEvents, render,
    get called() { return called },
    nav(id) { state.navActiveId = id; stateEvents.emit('navActiveIdUpdated', id) },
    screens(ids) { state.componentIds = ids; stateEvents.emit('componentIdsUpdated', ids) },
    foreground(value) { appState.currentState = value; appEvents.emit('change', value) },
    unmount() { cleanups.forEach(cleanup => cleanup?.()); renderer.unmount() },
  }
}

for (const options of [
  { OS: 'ios' }, { navActiveId: 'nav_love' }, { navActiveId: 'nav_top' }, { navActiveId: 'nav_songlist' }, { navActiveId: 'nav_setting' },
  { componentIds: {} }, { componentIds: { home: 'home-id', playDetail: 'player-id' } },
  { componentIds: { home: 'home-id', songlistDetail: 'list-id' } }, { foreground: 'background' },
]) {
  test(`search does not subscribe while hidden: ${JSON.stringify(options)}`, () => {
    const ctx = searchHook(options)
    assert.equal(ctx.subscriptions.length, 0)
    ctx.unmount()
  })
}

test('search listens only while visible, guards queued events and refreshes its callback', () => {
  const ctx = searchHook()
  const first = ctx.subscriptions[0]
  first.handler()
  assert.equal(ctx.called, 1)
  ctx.render(() => { ctx.state.latest = true })
  first.handler()
  assert.equal(ctx.state.latest, true)
  assert.equal(ctx.subscriptions.length, 1, 'rerender must not briefly disable native key ownership')
  ctx.render()
  ctx.state.navActiveId = 'nav_setting'
  first.handler()
  assert.equal(ctx.called, 1, 'queued event rechecks current navigation even before its notification')
  ctx.nav('nav_setting')
  assert.equal(first.removed, true)
  ctx.nav('nav_search')
  assert.equal(ctx.subscriptions.length, 2)
  ctx.subscriptions[1].handler()
  assert.equal(ctx.called, 2)
  ctx.unmount()
  ctx.subscriptions[1].handler()
  assert.equal(ctx.called, 2, 'unmounted pages ignore delayed events')
  assert.equal(ctx.stateEvents.eventNames().length, 0)
  assert.equal(ctx.appEvents.eventNames().length, 0)
})

test('detail pages and background disable voice keys and returning restores one listener', () => {
  const ctx = searchHook()
  ctx.screens({ home: 'home-id', playDetail: 'player-id' })
  assert.equal(ctx.subscriptions[0].removed, true)
  ctx.subscriptions[0].handler()
  assert.equal(ctx.called, 0)
  ctx.screens({ home: 'home-id' })
  assert.equal(ctx.subscriptions.length, 2)
  ctx.foreground('background')
  assert.equal(ctx.subscriptions[1].removed, true)
  ctx.subscriptions[1].handler()
  assert.equal(ctx.called, 0)
  ctx.foreground('active')
  ctx.foreground('active')
  assert.equal(ctx.subscriptions.length, 3)
  ctx.subscriptions[2].handler()
  assert.equal(ctx.called, 1)
  ctx.unmount()
  assert.ok(ctx.subscriptions.every(subscription => subscription.removed))
})

test('initial home registration enables listening even if search mounts before its parent effect', () => {
  const ctx = searchHook({ componentIds: {} })
  ctx.screens({ home: 'home-id' })
  assert.equal(ctx.subscriptions.length, 1)
  ctx.unmount()
})

test('native window route is registered separately from speech and leaves ordinary keys alone', () => {
  const native = path.join(root, 'android/app/src/main/java/cn/toside/music/car')
  const activity = readFileSync(path.join(native, 'MainActivity.java'), 'utf8')
  const module = readFileSync(path.join(native, 'utils/VoiceKeyModule.java'), 'utf8')
  const pkg = readFileSync(path.join(native, 'utils/UtilsPackage.java'), 'utf8')
  assert.match(activity, /boolean dispatchKeyEvent\(KeyEvent event\)/)
  assert.match(activity, /VoiceKeyHandler\.isVoiceKey\(event\.getKeyCode\(\)\)/)
  assert.match(activity, /voiceKeys\.dispatchKeyEvent\(event\)/)
  assert.match(activity, /return super\.dispatchKeyEvent\(event\)/)
  assert.match(module, /LifecycleState\.RESUMED/)
  assert.match(module, /VoiceKeyHandler\.Action\.TRIGGER/)
  assert.match(module, /\.emit\("voice-key", data\)/)
  assert.match(module, /onHostPause\(\) \{ keys\.setEnabled\(false\); \}/)
  assert.match(pkg, /new VoiceKeyModule\(reactContext\)/)
})

test('native press state machine handles release, repeat, cancellation, page changes and key identity', () => {
  const output = mkdtempSync(path.join(tmpdir(), 'lx-voice-key-jvm-'))
  try {
    const sources = [
      path.join(root, 'android/app/src/main/java/cn/toside/music/car/utils/VoiceKeyHandler.java'),
      path.join(__dirname, 'fixtures/voice-key/VoiceKeyHandlerTest.java'),
    ]
    const compile = spawnSync('javac', ['-d', output, ...sources], { encoding: 'utf8' })
    assert.equal(compile.status, 0, `javac failed: ${compile.error ?? compile.stderr}`)
    const run = spawnSync('java', ['-cp', output, 'VoiceKeyHandlerTest'], { encoding: 'utf8' })
    assert.equal(run.status, 0, `native press test failed: ${run.error ?? run.stderr}`)
    assert.match(run.stdout, /Voice key press lifecycle passed/)
  } finally {
    rmSync(output, { recursive: true, force: true })
  }
})
