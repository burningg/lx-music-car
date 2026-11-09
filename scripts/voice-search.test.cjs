// Run with: node --test scripts/voice-search.test.cjs
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')
const React = require('react')
const ShallowRenderer = require('react-shallow-renderer')

function load(file, dependencies, globals = {}) {
  const filename = path.resolve(__dirname, '..', file)
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  })
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    global: globals,
    setTimeout,
    clearTimeout,
    require(id) {
      assert.ok(Object.hasOwn(dependencies, id), `Unmocked dependency ${id}`)
      return dependencies[id]
    },
  }, { filename })
  return module.exports
}

function deferred() {
  let resolve, reject
  const promise = new Promise((_resolve, _reject) => { resolve = _resolve; reject = _reject })
  return { promise, resolve, reject }
}
const flush = async() => { for (let i = 0; i < 12; ++i) await Promise.resolve() }

function setup({ permission = 'granted', available = true, locale = 'zh_cn' } = {}) {
  const messages = []; const results = []; const requests = []; const cleanups = []
  const listeners = {}
  const callbacks = {}
  let api; let permissionRequests = 0; let cancelled = 0
  const appState = {
    currentState: 'active',
    addEventListener(name, callback) {
      const list = callbacks[name] ??= new Set()
      list.add(callback)
      listeners[name] = (...args) => { let result; for (const cb of [...list]) result = cb(...args); return result }
      return { remove() { list.delete(callback); if (!list.size) delete listeners[name] } }
    },
  }
  const useVoiceSearch = load('src/screens/Home/Views/Search/HeaderBar/useVoiceSearch.ts', {
    react: { ...React, useEffect: create => { if (!cleanups.length) cleanups.push(create()) } },
    'react-native': {
      AppState: appState,
      BackHandler: { addEventListener: appState.addEventListener },
      PermissionsAndroid: {
        PERMISSIONS: { RECORD_AUDIO: 'microphone' },
        RESULTS: { GRANTED: 'granted', NEVER_ASK_AGAIN: 'never' },
        request: async name => { assert.equal(name, 'microphone'); ++permissionRequests; return permission },
      },
    },
    '@/lang': { useI18n: () => key => key },
    '@/utils/tools': { toast: message => messages.push(message) },
    '@/utils/nativeModules/speechRecognition': {
      isSpeechRecognitionAvailable: async() => available,
      onSpeechRecognitionState: handler => appState.addEventListener('speech', handler).remove,
      startSpeechRecognition: language => { const result = deferred(); requests.push({ language, ...result }); return result.promise },
      cancelSpeechRecognition: () => { ++cancelled },
    },
  }, { i18n: { locale } }).default
  function Harness() { api = useVoiceSearch(text => results.push(text)); return React.createElement('View') }
  const renderer = new ShallowRenderer()
  renderer.render(React.createElement(Harness))
  return {
    messages,
    results,
    requests,
    listeners,
    appState,
    get api() { return api },
    get permissionRequests() { return permissionRequests },
    get cancelled() { return cancelled },
    unmount() { cleanups.forEach(fn => fn()); renderer.unmount() },
  }
}

for (const [locale, language] of [['zh_cn', 'zh-CN'], ['zh_tw', 'zh-TW'], ['en_us', 'en-US']]) {
  test(`STT uses ${language}, trims final text and clears busy state`, async() => {
    const ctx = setup({ locale })
    const running = ctx.api.start()
    await flush()
    assert.equal(ctx.api.isRecognizing, true)
    assert.equal(ctx.requests[0].language, language)
    ctx.requests[0].resolve('  周杰伦  ')
    await running
    assert.deepEqual(ctx.results, ['周杰伦'])
    assert.equal(ctx.api.isRecognizing, false)
    assert.deepEqual(ctx.messages, [])
  })
}

for (const [permission, message] of [['denied', 'search_voice_permission'], ['never', 'search_voice_permission_settings']]) {
  test(`permission ${permission} never starts the microphone`, async() => {
    const ctx = setup({ permission })
    await ctx.api.start()
    assert.deepEqual(ctx.messages, [message])
    assert.equal(ctx.requests.length, 0)
    assert.equal(ctx.api.isRecognizing, false)
  })
}

test('missing service is reported before asking for microphone access', async() => {
  const ctx = setup({ available: false })
  await ctx.api.start()
  assert.deepEqual(ctx.messages, ['search_voice_unavailable'])
  assert.equal(ctx.permissionRequests, 0)
})

test('cancellation while permission is pending never starts recording', async() => {
  const permission = deferred()
  const ctx = setup({ permission: permission.promise })
  const running = ctx.api.start()
  await flush()
  ctx.api.cancel()
  permission.resolve('granted')
  await running
  assert.equal(ctx.requests.length, 0)
  assert.deepEqual(ctx.results, [])
})

test('first-time permission grant waits for foreground resume before starting STT', async() => {
  const permission = deferred()
  const ctx = setup({ permission: permission.promise })
  const running = ctx.api.start()
  await flush()
  ctx.appState.currentState = 'background'
  ctx.listeners.change('background')
  permission.resolve('granted')
  await flush()
  assert.equal(ctx.requests.length, 0)
  ctx.appState.currentState = 'active'
  ctx.listeners.change('active')
  await flush()
  assert.equal(ctx.requests.length, 1)
  ctx.requests[0].resolve('首次授权')
  await running
  assert.deepEqual(ctx.results, ['首次授权'])
})

test('cancellation during foreground resume never starts STT', async() => {
  const ctx = setup()
  ctx.appState.currentState = 'background'
  const running = ctx.api.start()
  await flush()
  ctx.api.cancel()
  ctx.appState.currentState = 'active'
  ctx.listeners.change('active')
  await running
  assert.equal(ctx.requests.length, 0)
})

test('repeated starts are gated and stale results cannot overwrite a new session', async() => {
  const ctx = setup()
  const first = ctx.api.start()
  await ctx.api.start()
  await flush()
  assert.equal(ctx.requests.length, 1)
  ctx.api.cancel()
  const second = ctx.api.start()
  await flush()
  ctx.requests[0].resolve('旧文字')
  await first
  assert.deepEqual(ctx.results, [])
  assert.equal(ctx.api.isRecognizing, true)
  ctx.requests[1].resolve('新文字')
  await second
  assert.deepEqual(ctx.results, ['新文字'])
  assert.equal(ctx.cancelled, 1)
})

for (const action of ['back', 'background', 'unmount']) {
  test(`${action} cancels recording and ignores late callbacks`, async() => {
    const ctx = setup()
    const running = ctx.api.start()
    await flush()
    if (action == 'back') assert.equal(ctx.listeners.hardwareBackPress(), true)
    if (action == 'background') ctx.listeners.change('background')
    if (action == 'unmount') ctx.unmount()
    ctx.requests[0].resolve('不要回填')
    await running
    assert.equal(ctx.cancelled, 1)
    assert.deepEqual(ctx.results, [])
    assert.deepEqual(ctx.messages, [])
    if (action == 'unmount') assert.equal(Object.keys(ctx.listeners).length, 0)
  })
}

for (const [code, message] of [
  ['E_NO_MATCH', 'search_voice_no_match'], ['E_TIMEOUT', 'search_voice_no_match'],
  ['E_NETWORK', 'search_voice_network'], ['E_AUDIO', 'search_voice_audio'],
  ['E_BUSY', 'search_voice_busy'], ['E_LANGUAGE', 'search_voice_language'],
  ['E_MODEL', 'search_voice_model_error'],
  ['E_PERMISSION', 'search_voice_permission'], ['E_RECOGNITION', 'search_voice_failed'],
  ['E_CANCELLED', null],
]) {
  test(`${code} preserves input and resets the session`, async() => {
    const ctx = setup()
    const running = ctx.api.start()
    await flush()
    ctx.requests[0].reject({ code })
    await running
    assert.deepEqual(ctx.messages, message ? [message] : [])
    assert.deepEqual(ctx.results, [])
    assert.equal(ctx.api.isRecognizing, false)
  })
}

test('empty final results never erase the input', async() => {
  const ctx = setup()
  const running = ctx.api.start()
  await flush()
  ctx.requests[0].resolve('   ')
  await running
  assert.deepEqual(ctx.results, [])
  assert.deepEqual(ctx.messages, ['search_voice_no_match'])
})

test('header follows the design: separate accent mic after source; STT fills without submission', () => {
  let resultHandler; let inputRef; let api; let cancelled = 0
  const changes = []; const searches = []; const inputValues = []
  const Header = load('src/screens/Home/Views/Search/HeaderBar/index.tsx', {
    react: { ...React, useImperativeHandle: (_, create) => { api = create() } },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { View: 'View', Platform: { OS: 'android' }, Keyboard: { dismiss() {} } },
    '@/components/SourceSelector': { default: 'SourceSelector', __esModule: true },
    './SearchInput': { default: 'SearchInput', __esModule: true },
    '@/lang': { useI18n: () => key => key },
    '@/components/car': { CarText: 'CarText', IconButton: 'IconButton' },
    '@/utils/pixelRatio': { px: n => n },
    '@/store/theme/hook': { useTheme: () => ({ accent: '#E8562A', 'on-primary': '#fff' }) },
    './useVoiceSearch': {
      __esModule: true,
      default: handler => {
        resultHandler = handler
        return { isRecognizing: false, start() {}, cancel() { ++cancelled } }
      },
    },
  }).default
  const renderer = new ShallowRenderer()
  renderer.render(React.createElement(Header, {
    onTipSearch: text => changes.push(text), onSearch: text => searches.push(text),
  }))
  const nodes = React.Children.toArray(renderer.getRenderOutput().props.children)
  assert.equal(nodes[1].type, 'SearchInput')
  inputRef = nodes[1].ref
  inputRef.current = { setText: text => inputValues.push(text) }
  assert.equal(nodes[2].type, 'SourceSelector')
  const button = nodes[3].props.children[0]
  const design = JSON.parse(readFileSync(path.resolve(__dirname, '../design/lx-music-car-claude.pen'), 'utf8'))
  const searchPage = design.children.find(n => n.id == 'x7pOo')
  const header = searchPage.children.find(n => n.name == 'Main').children.find(n => n.name == 'Header')
  const voice = header.children.find(n => n.name == 'Voice')
  assert.equal(button.props.size, voice.width)
  assert.equal(button.props.size, voice.height)
  assert.equal(button.props.iconSize, voice.children[0].width)
  assert.equal(button.props.icon, 'lucide-mic')
  assert.equal(button.props.background, '#E8562A')
  assert.equal(button.props.color, '#fff')
  assert.equal(button.props.accessibilityLabel, 'search_voice_start')
  resultHandler('周杰伦')
  assert.deepEqual(inputValues, ['周杰伦'])
  assert.deepEqual(changes, ['周杰伦'])
  assert.deepEqual(searches, [])
  api.setText('新的搜索')
  nodes[1].props.onEdit()
  assert.equal(cancelled, 2)
})

test('native bridge remains safe on non-Android and older APKs', async() => {
  for (const OS of ['android', 'ios']) {
    const bridge = load('src/utils/nativeModules/speechRecognition.ts', { 'react-native': { Platform: { OS }, NativeModules: {} } })
    assert.equal(await bridge.isSpeechRecognitionAvailable(), false)
    await assert.rejects(bridge.startSpeechRecognition('zh-CN'), { code: 'E_UNAVAILABLE' })
    bridge.cancelSpeechRecognition()
  }
})

test('offline loading/listening states update without filling or submitting partial text', async() => {
  const ctx = setup()
  const running = ctx.api.start()
  await flush()
  assert.equal(ctx.api.isPreparing, true)
  ctx.listeners.speech('listening')
  assert.equal(ctx.api.isPreparing, false)
  assert.deepEqual(ctx.results, [])
  ctx.api.cancel()
  ctx.listeners.speech('loading')
  assert.equal(ctx.api.isPreparing, false, 'late state events must not revive a cancelled session')
  ctx.requests[0].resolve('旧结果')
  await running
  assert.deepEqual(ctx.results, [])
})
