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
const flush = async() => new Promise(resolve => { setImmediate(resolve) })

const playbackStates = Object.fromEntries(['None', 'Ready', 'Playing', 'Paused', 'Stopped', 'Buffering', 'Connecting'].map(state => [state, state]))

function setup({ permission = 'granted', available = true, locale = 'zh_cn', playbackState = 'Paused', initialized = true, pauseResult, resumeResult, searchPlayback = false, modal = false } = {}) {
  const messages = []; const results = []; const requests = []; const cleanups = []
  const listeners = {}
  const callbacks = {}
  const playback = { state: playbackState, initialized, events: [], pauseCalls: 0, playCalls: 0, stateReads: 0 }
  const playerState = { playMusicInfo: { musicInfo: { id: 'current-song' }, listId: 'list' } }
  const lx = { isPlayedStop: false }
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
  const useSpeechRecognition = load('src/components/SpeechRecognitionModal/useSpeechRecognition.ts', {
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
      startSpeechRecognition: language => {
        playback.events.push('recording-start')
        const result = deferred()
        requests.push({ language, ...result })
        return result.promise.finally(() => { playback.events.push('recording-stopped') })
      },
      cancelSpeechRecognition: () => { ++cancelled; playback.events.push('cancel-recording') },
    },
  }, { i18n: { locale } }).default
  const prepare = searchPlayback ? load('src/screens/Home/Views/Search/HeaderBar/prepareVoiceSearch.ts', {
    'react-native-track-player': {
      __esModule: true,
      State: playbackStates,
      default: {
        getState: async() => { ++playback.stateReads; return playback.state },
        pause: async() => {
          ++playback.pauseCalls
          playback.events.push('pause-request')
          await pauseResult
          playback.state = playback.state == 'Buffering' ? 'Connecting' : 'Paused'
          playback.events.push('paused')
        },
        play: async() => {
          ++playback.playCalls
          playback.events.push('resume-request')
          await resumeResult
          playback.state = 'Playing'
          playback.events.push('resumed')
        },
      },
    },
    '@/plugins/player': { isInitialized: () => playback.initialized },
    '@/store/player/state': { __esModule: true, default: playerState },
  }, { lx }).default : undefined
  function Harness() {
    const recognition = useSpeechRecognition(text => results.push(text))
    api = { ...recognition, start: () => recognition.start(prepare) }
    return React.createElement('View')
  }
  const Component = modal ? load('src/components/SpeechRecognitionModal/SpeechRecognitionModal.tsx', {
    react: { ...React, useImperativeHandle: (_, create) => { api = create() }, useEffect() {} },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { ActivityIndicator: 'ActivityIndicator', Modal: 'Modal', View: 'View', StyleSheet: { absoluteFillObject: {} } },
    '@/components/car/CarText': { default: 'CarText', __esModule: true },
    '@/components/car/IconButton': { default: 'IconButton', __esModule: true },
    '@/lang': { useI18n: () => key => key },
    '@/store/theme/hook': { useTheme: () => DAYLIGHT_TOKENS },
    '@/utils/hooks/useWindowSize': { default: () => ({ width: 1920, height: 1080 }), __esModule: true },
    '@/utils/pixelRatio': { px: n => n },
    './useSpeechRecognition': { default: useSpeechRecognition, __esModule: true },
  }).default : Harness
  const renderer = new ShallowRenderer()
  const render = () => renderer.render(React.createElement(Component, { onResult: text => results.push(text) }))
  render()
  return {
    messages,
    results,
    playback,
    playerState,
    lx,
    requests,
    listeners,
    appState,
    get api() { return api },
    get permissionRequests() { return permissionRequests },
    get cancelled() { return cancelled },
    unmount() { cleanups.splice(0).forEach(fn => fn()); renderer.unmount() },
    remount: render,
    output: () => renderer.getRenderOutput(),
  }
}

function setupSearch(options = {}) {
  return setup({ ...options, searchPlayback: true })
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

for (const [permission, message] of [['denied', 'speech_recognition_permission'], ['never', 'speech_recognition_permission_settings']]) {
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
  assert.deepEqual(ctx.messages, ['speech_recognition_unavailable'])
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
  await flush()
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
  ['E_NO_MATCH', 'speech_recognition_no_match'], ['E_TIMEOUT', 'speech_recognition_no_match'],
  ['E_NETWORK', 'speech_recognition_network'], ['E_AUDIO', 'speech_recognition_audio'],
  ['E_BUSY', 'speech_recognition_busy'], ['E_LANGUAGE', 'speech_recognition_language'],
  ['E_MODEL', 'speech_recognition_model_error'],
  ['E_PERMISSION', 'speech_recognition_permission'], ['E_RECOGNITION', 'speech_recognition_failed'],
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
  assert.deepEqual(ctx.messages, ['speech_recognition_no_match'])
})

test('shared voice entry exports the modal and recognition hook without page dependencies', () => {
  const SpeechRecognitionModal = () => null
  const useSpeechRecognition = () => ({})
  const shared = load('src/components/SpeechRecognitionModal/index.ts', {
    './SpeechRecognitionModal': { __esModule: true, default: SpeechRecognitionModal },
    './useSpeechRecognition': { __esModule: true, default: useSpeechRecognition },
  })
  assert.equal(shared.default, SpeechRecognitionModal)
  assert.equal(shared.useSpeechRecognition, useSpeechRecognition)
})

test('search owns result handling, prompts, layout and playback preparation', () => {
  let api; let voiceKey; let cancelled = 0; let blurred = 0; let dismissed = 0; let hidden = 0
  const changes = []; const searches = []; const inputValues = []; const starts = []
  const prepareVoiceSearch = async() => {}
  const design = JSON.parse(readFileSync(path.resolve(__dirname, '../design/lx-music-car-claude.pen'), 'utf8'))
  const railWidth = findNode(design, 'sOwkY').width
  const Header = load('src/screens/Home/Views/Search/HeaderBar/index.tsx', {
    react: { ...React, useImperativeHandle: (_, create) => { api = create() } },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { View: 'View', Platform: { OS: 'android' }, Keyboard: { dismiss() { ++dismissed } } },
    '@/components/SourceSelector': { default: 'SourceSelector', __esModule: true },
    './SearchInput': { default: 'SearchInput', __esModule: true },
    './prepareVoiceSearch': { default: prepareVoiceSearch, __esModule: true },
    './useVoiceKey': { default: handler => { voiceKey = handler }, __esModule: true },
    '@/lang': { useI18n: () => key => key },
    '@/components/car': { CarText: 'CarText', IconButton: 'IconButton', NAV_RAIL_WIDTH: railWidth },
    '@/utils/pixelRatio': { px: n => n },
    '@/utils/hooks/useWindowSize': { default: () => ({ width: 1920, height: 1080 }), __esModule: true },
    '@/store/theme/hook': { useTheme: () => ({ accent: '#E8562A', 'on-primary': '#fff' }) },
    '@/components/SpeechRecognitionModal': { __esModule: true, default: 'SpeechRecognitionModal' },
  }).default
  const renderer = new ShallowRenderer()
  renderer.render(React.createElement(Header, {
    onTipSearch: text => changes.push(text), onSearch: text => searches.push(text), onHideTipList: () => { ++hidden },
  }))
  const nodes = React.Children.toArray(renderer.getRenderOutput().props.children)
  assert.equal(nodes[1].type, 'SearchInput')
  nodes[1].ref.current = { setText: text => inputValues.push(text), blur() { ++blurred } }
  assert.equal(nodes[2].type, 'SourceSelector')
  const button = nodes[3].props.children[0]
  const searchPage = design.children.find(n => n.id == 'x7pOo')
  const header = searchPage.children.find(n => n.name == 'Main').children.find(n => n.name == 'Header')
  const voice = header.children.find(n => n.name == 'Voice')
  assert.equal(button.props.size, voice.width)
  assert.equal(button.props.size, voice.height)
  assert.equal(button.props.iconSize, voice.children[0].width)
  assert.equal(button.props.icon, 'lucide-mic')
  assert.equal(button.props.background, '#E8562A')
  assert.equal(button.props.color, '#fff')
  assert.equal(button.props.accessibilityLabel, 'speech_recognition_start')
  const modal = nodes[3].props.children[1]
  assert.equal(modal.type, 'SpeechRecognitionModal')
  assert.equal(modal.props.prompt, 'search_voice_listening')
  assert.equal(modal.props.hint, 'search_voice_fill_hint')
  assert.equal(modal.props.contentInsetLeft, railWidth)
  for (const prop of ['visible', 'isPreparing', 'isProcessing']) assert.equal(Object.hasOwn(modal.props, prop), false)
  modal.ref.current = { start: async prepare => { starts.push(prepare) }, cancel() { ++cancelled } }
  button.props.onPress()
  assert.deepEqual(starts, [prepareVoiceSearch])
  assert.equal(blurred, 1)
  assert.equal(dismissed, 1)
  assert.equal(hidden, 1)
  voiceKey()
  assert.deepEqual(starts, [prepareVoiceSearch, prepareVoiceSearch], 'hardware key uses the same preparation and result path')
  assert.equal(blurred, 2)
  assert.equal(dismissed, 2)
  assert.equal(hidden, 2)
  modal.props.onRecognizingChange(true)
  voiceKey()
  assert.equal(starts.length, 2, 'hardware wake does not restart an active recognition')
  assert.equal(cancelled, 0, 'hardware wake is not the touch button cancel toggle')
  const busyButton = React.Children.toArray(renderer.getRenderOutput().props.children)[3].props.children[0]
  assert.equal(busyButton.props.icon, 'lucide-x')
  assert.equal(busyButton.props.accessibilityState.busy, true)
  assert.equal(busyButton.props.accessibilityLabel, 'speech_recognition_cancel')
  busyButton.props.onPress()
  assert.equal(cancelled, 1)
  cancelled = 0
  modal.props.onResult('周杰伦')
  assert.deepEqual(inputValues, ['周杰伦'])
  assert.deepEqual(changes, ['周杰伦'])
  assert.deepEqual(searches, [], 'recognition only fills the input; it never submits a search')
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

test('processing state shows final decoding without returning partial text and is cleared on cancellation', async() => {
  const ctx = setup()
  const running = ctx.api.start()
  await flush()
  ctx.listeners.speech('listening')
  ctx.listeners.speech('processing')
  assert.equal(ctx.api.isPreparing, false)
  assert.equal(ctx.api.isProcessing, true)
  assert.deepEqual(ctx.results, [])
  ctx.api.cancel()
  assert.equal(ctx.api.isProcessing, false)
  ctx.listeners.speech('processing')
  assert.equal(ctx.api.isProcessing, false)
  ctx.requests[0].resolve('迟到的结果')
  await running
  assert.deepEqual(ctx.results, [])
})


const { DAYLIGHT_TOKENS, NOCTURNE_TOKENS } = load('src/theme/tokens.ts', {})
const voiceDesign = JSON.parse(readFileSync(path.resolve(__dirname, '../design/lx-music-car-claude.pen'), 'utf8'))
function findNode(node, id) {
  if (node.id == id) return node
  for (const child of node.children ?? []) {
    const found = findNode(child, id)
    if (found) return found
  }
}
const navRailDesign = findNode(voiceDesign, 'sOwkY')
const backdropDesign = findNode(voiceDesign, 'U5jSt')
const dialogDesign = backdropDesign.children[0]

function renderVoiceModal({ theme = DAYLIGHT_TOKENS, width = 1920, height = 1080, scale = 1, visible = true, isPreparing = false, isProcessing = false, onCancel = () => {}, ...props } = {}) {
  let api; let resultHandler
  const starts = []; const states = []
  const VoiceModal = load('src/components/SpeechRecognitionModal/SpeechRecognitionModal.tsx', {
    react: { ...React, useImperativeHandle: (_, create) => { api = create() }, useEffect: create => { create() } },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { ActivityIndicator: 'ActivityIndicator', Modal: 'Modal', View: 'View', StyleSheet: { absoluteFillObject: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } } },
    '@/components/car/CarText': { default: 'CarText', __esModule: true },
    '@/components/car/IconButton': { default: 'IconButton', __esModule: true },
    '@/lang': { useI18n: () => key => key },
    '@/store/theme/hook': { useTheme: () => theme },
    '@/utils/hooks/useWindowSize': { default: () => ({ width, height }), __esModule: true },
    '@/utils/pixelRatio': { px: n => n * scale },
    './useSpeechRecognition': {
      __esModule: true,
      default: onResult => {
        resultHandler = onResult
        return { isRecognizing: visible, isPreparing, isProcessing, start: async prepare => { starts.push(prepare) }, cancel: onCancel }
      },
    },
  }).default
  const renderer = new ShallowRenderer()
  renderer.render(React.createElement(VoiceModal, { onResult() {}, onRecognizingChange: state => states.push(state), ...props }))
  const modal = renderer.getRenderOutput()
  const overlay = modal.props.children
  const [scrim, dialog] = React.Children.toArray(overlay.props.children)
  const [header, transcript, border] = React.Children.toArray(dialog.props.children)
  const [status, close] = React.Children.toArray(header.props.children)
  const [indicator, title] = React.Children.toArray(status.props.children)
  return { modal, overlay, scrim, dialog, header, transcript, border, close, indicator, title, api, resultHandler, starts, states }
}

for (const [mode, theme] of [['light', DAYLIGHT_TOKENS], ['dark', NOCTURNE_TOKENS]]) {
  test(`voice dialog matches U5jSt geometry and ${mode} design tokens`, () => {
    const { modal, overlay, scrim, dialog, header, transcript, border, close, indicator, title } = renderVoiceModal({ theme, contentInsetLeft: navRailDesign.width })
    assert.equal(modal.props.transparent, true)
    // The backdrop still has an old 112px inset in Pen; center against the enlarged shared rail.
    assert.equal(overlay.props.style.paddingLeft, navRailDesign.width)
    assert.equal(dialog.props.style.width, dialogDesign.width)
    assert.equal(dialog.props.style.minHeight, dialogDesign.height)
    assert.equal(dialog.props.style.borderRadius, dialogDesign.cornerRadius)
    assert.deepEqual([
      dialog.props.style.paddingTop, dialog.props.style.paddingRight,
      dialog.props.style.paddingBottom, dialog.props.style.paddingLeft,
    ], dialogDesign.padding)
    assert.equal(dialog.props.style.gap, dialogDesign.gap)
    for (const [token, actual] of [
      ['surface', dialog.props.style.backgroundColor],
      ['voice-scrim', scrim.props.style[1].backgroundColor],
      ['text-1', theme['text-1']],
      ['accent', theme.accent],
    ]) {
      const value = voiceDesign.variables[token].value.find(v => v.theme.mode == mode).value
      assert.equal(actual, value)
    }
    assert.equal(border.props.style[1].borderColor, theme.hairline)
    assert.equal(header.props.style.minHeight, 64)
    assert.equal(close.props.size, 64)
    assert.equal(close.props.radius, 12)
    assert.equal(close.props.iconSize, 24)
    assert.equal(close.props.color, theme['text-2'])
    assert.equal(title.props.children, 'speech_recognition_listening_title')
    assert.equal(title.props.size, 24)
    assert.equal(title.props.accessibilityLiveRegion, 'polite')
    assert.equal(indicator.props.style.width, 56)
    assert.equal(indicator.props.style.backgroundColor, theme['accent-soft'])
    const levels = React.Children.toArray(indicator.props.children)
    assert.deepEqual(levels.map(bar => bar.props.style.height), [10, 20, 28, 18, 10])
    assert.ok(levels.every(bar => bar.props.style.width == 4 && bar.props.style.backgroundColor == theme.accent))
    const [words, hint] = React.Children.toArray(transcript.props.children)
    assert.equal(words.props.size, 38)
    assert.equal(words.props.lineHeight, 1.35)
    assert.equal(words.props.children, 'speech_recognition_listening', 'show an honest prompt, not a fabricated transcript')
    assert.equal(hint.props.size, 20)
    assert.equal(hint.props.children, 'speech_recognition_hint', 'default guidance must not refer to any business action')
  })
}

test('standalone speech modal returns text through onResult and starts without business configuration', async() => {
  const results = []
  const { api, resultHandler, starts, states, overlay, dialog } = renderVoiceModal({ onResult: text => results.push(text) })
  await api.start()
  assert.deepEqual(starts, [undefined])
  resultHandler('这是一段普通的语音内容')
  assert.deepEqual(results, ['这是一段普通的语音内容'])
  assert.deepEqual(states, [true])
  assert.equal(overlay.props.style.paddingLeft, 0, 'the caller owns any navigation rail inset')
  assert.equal(dialog.props.style.width, 720)
})

for (const locale of ['zh-cn', 'zh-tw', 'en-us']) {
  test(`${locale} provides neutral speech prompts and localized recognition errors`, () => {
    const messages = JSON.parse(readFileSync(path.resolve(__dirname, `../src/lang/${locale}.json`), 'utf8'))
    const sources = ['SpeechRecognitionModal.tsx', 'useSpeechRecognition.ts'].map(file => readFileSync(path.resolve(__dirname, '../src/components/SpeechRecognitionModal', file), 'utf8')).join('\n')
    const keys = new Set([...sources.matchAll(/'(speech_recognition_[^']+)'/g)].map(match => match[1]))
    for (const key of keys) assert.ok(messages[key], `missing ${key}`)
    assert.notEqual(messages.speech_recognition_listening, messages.search_voice_listening)
    assert.notEqual(messages.speech_recognition_hint, messages.search_voice_fill_hint)
  })
}

test('shared voice modal accepts page-specific prompts and hints', () => {
  const { transcript, title } = renderVoiceModal({ prompt: '说出想听的歌曲', hint: '识别结果将交给当前页面处理' })
  const [words, hint] = React.Children.toArray(transcript.props.children)
  assert.equal(words.props.children, '说出想听的歌曲')
  assert.equal(hint.props.children, '识别结果将交给当前页面处理')
  assert.equal(title.props.children, 'speech_recognition_listening_title')
})

test('voice modal follows recognition visibility and cancels through close, ref and Android back', () => {
  let cancelled = 0
  const { modal, close, api, states } = renderVoiceModal({ visible: false, onCancel: () => { ++cancelled } })
  assert.equal(modal.props.visible, false)
  assert.equal(close.props.accessibilityLabel, 'speech_recognition_cancel')
  close.props.onPress()
  modal.props.onRequestClose()
  api.cancel()
  assert.equal(cancelled, 3)
  assert.deepEqual(states, [false])
})

for (const [state, label] of [['isPreparing', 'speech_recognition_preparing'], ['isProcessing', 'speech_recognition_processing']]) {
  test(`${state} displays progress instead of a listening indicator`, () => {
    const { title, indicator } = renderVoiceModal({ [state]: true })
    assert.equal(title.props.children, label)
    assert.equal(indicator.props.children.type, 'ActivityIndicator')
  })
}

test('voice modal centers in the remaining content width at every landscape scale', () => {
  for (const [width, height, scale] of [[1920, 1080, 1], [1280, 720, 2 / 3], [960, 540, 0.5], [800, 720, 1]]) {
    const railWidth = navRailDesign.width * scale
    const { overlay, dialog } = renderVoiceModal({ width, height, scale, contentInsetLeft: railWidth })
    assert.equal(overlay.props.style.paddingLeft, railWidth)
    assert.equal(overlay.props.style.alignItems, 'center')
    assert.equal(dialog.props.style.width, Math.min(dialogDesign.width * scale, width - railWidth - 48 * scale))
    assert.ok(dialog.props.style.width + railWidth + 48 * scale <= width, 'dialog leaves side clearance beside the wider rail')
  }
})

test('voice modal fits narrow portrait windows without a navigation rail offset', () => {
  const { overlay, dialog, transcript } = renderVoiceModal({ width: 640, height: 1000 })
  assert.equal(overlay.props.style.paddingLeft, 0)
  assert.equal(dialog.props.style.width, 592)
  assert.equal(dialog.props.style.height, undefined, 'dialog may grow for larger fonts and translations')
  assert.equal(transcript.props.children[0].props.numberOfLines, undefined, 'do not truncate the speech prompt')
})


for (const outcome of ['success', 'cancel']) {
  test(`standalone modal manages the real recognition lifecycle: ${outcome}`, async() => {
    const ctx = setup({ modal: true })
    assert.equal(ctx.output().props.visible, false)
    const running = ctx.api.start()
    await flush()
    assert.equal(ctx.output().props.visible, true)
    assert.equal(ctx.requests.length, 1)
    if (outcome == 'cancel') {
      ctx.output().props.onRequestClose()
      assert.equal(ctx.output().props.visible, false)
      assert.equal(ctx.cancelled, 1)
    }
    ctx.requests[0].resolve('  普通语音内容  ')
    await running
    assert.deepEqual(ctx.results, outcome == 'success' ? ['普通语音内容'] : [])
    assert.equal(ctx.output().props.visible, false)
    assert.equal(ctx.playback.stateReads, 0)
    ctx.unmount()
    assert.equal(Object.keys(ctx.listeners).length, 0)
  })
}

test('standalone recognition handles arbitrary text without accessing playback or search state', async() => {
  const ctx = setup({ playbackState: 'Playing' })
  const running = ctx.api.start()
  await flush()
  ctx.requests[0].resolve('  明天上午开会  ')
  await running
  assert.deepEqual(ctx.results, ['明天上午开会'])
  assert.equal(ctx.playback.stateReads, 0)
  assert.equal(ctx.playback.pauseCalls, 0)
  assert.equal(ctx.playback.playCalls, 0)
  assert.equal(ctx.playback.state, 'Playing')
})

for (const playbackState of ['Playing', 'Buffering']) {
  test(`${playbackState} music pauses before recording and resumes after recognition`, async() => {
    const ctx = setupSearch({ playbackState })
    const running = ctx.api.start()
    await flush()
    assert.deepEqual(ctx.playback.events, ['pause-request', 'paused', 'recording-start'])
    assert.equal(ctx.playback.playCalls, 0)
    ctx.listeners.speech('processing')
    assert.equal(ctx.playback.playCalls, 0, 'stay paused while final decoding is pending')
    ctx.requests[0].resolve('周杰伦')
    await running
    assert.deepEqual(ctx.results, ['周杰伦'])
    assert.deepEqual(ctx.playback.events, ['pause-request', 'paused', 'recording-start', 'recording-stopped', 'resume-request', 'resumed'])
    assert.equal(ctx.playback.state, 'Playing')
    assert.equal(ctx.api.isRecognizing, false)
  })
}

for (const playbackState of ['Paused', 'Stopped', 'None', 'Ready', 'Connecting']) {
  test(`${playbackState} playback is not started by voice recognition`, async() => {
    const ctx = setupSearch({ playbackState })
    const running = ctx.api.start()
    await flush()
    ctx.requests[0].resolve('歌名')
    await running
    assert.equal(ctx.playback.pauseCalls, 0)
    assert.equal(ctx.playback.playCalls, 0)
    assert.equal(ctx.playback.state, playbackState)
  })
}

test('voice recognition works before the music player has been initialized', async() => {
  const ctx = setupSearch({ initialized: false })
  const running = ctx.api.start()
  await flush()
  ctx.requests[0].resolve('歌名')
  await running
  assert.equal(ctx.playback.stateReads, 0)
  assert.equal(ctx.playback.playCalls, 0)
})

for (const options of [{ permission: 'denied' }, { available: false }]) {
  test(`failed prerequisites ${JSON.stringify(options)} do not interrupt music`, async() => {
    const ctx = setupSearch({ playbackState: 'Playing', ...options })
    await ctx.api.start()
    assert.equal(ctx.playback.pauseCalls, 0)
    assert.equal(ctx.playback.playCalls, 0)
    assert.equal(ctx.requests.length, 0)
  })
}

for (const result of ['E_NO_MATCH', 'E_TIMEOUT', 'E_AUDIO', 'E_MODEL', 'E_CANCELLED', 'empty']) {
  test(`${result} restores the music paused for this session`, async() => {
    const ctx = setupSearch({ playbackState: 'Playing' })
    const running = ctx.api.start()
    await flush()
    if (result == 'empty') ctx.requests[0].resolve(' ')
    else ctx.requests[0].reject({ code: result })
    await running
    assert.equal(ctx.playback.playCalls, 1)
    assert.equal(ctx.playback.state, 'Playing')
    assert.equal(ctx.api.isRecognizing, false)
  })
}

for (const action of ['cancel', 'back', 'background', 'unmount']) {
  test(`${action} restores playback only after the microphone stops`, async() => {
    const ctx = setupSearch({ playbackState: 'Playing' })
    const running = ctx.api.start()
    await flush()
    if (action == 'cancel') ctx.api.cancel()
    if (action == 'back') ctx.listeners.hardwareBackPress()
    if (action == 'background') {
      ctx.appState.currentState = 'background'
      ctx.listeners.change('background')
    }
    if (action == 'unmount') ctx.unmount()
    await flush()
    assert.equal(ctx.cancelled, 1)
    assert.equal(ctx.playback.playCalls, 0)
    ctx.requests[0].reject({ code: 'E_CANCELLED' })
    await running
    assert.equal(ctx.playback.playCalls, 1)
    assert.deepEqual(ctx.results, [])
    if (action != 'unmount') ctx.api.cancel()
    assert.equal(ctx.playback.playCalls, 1, 'cleanup is idempotent')
  })
}

test('recording waits for the asynchronous pause operation', async() => {
  const pausing = deferred()
  const ctx = setupSearch({ playbackState: 'Playing', pauseResult: pausing.promise })
  const running = ctx.api.start()
  await flush()
  assert.equal(ctx.playback.pauseCalls, 1)
  assert.equal(ctx.requests.length, 0)
  pausing.resolve()
  await flush()
  assert.equal(ctx.requests.length, 1)
  ctx.requests[0].resolve('完成')
  await running
  assert.equal(ctx.playback.playCalls, 1)
})

for (const action of ['cancel', 'background', 'unmount']) {
  test(`${action} while pausing restores music without opening the microphone`, async() => {
    const pausing = deferred()
    const ctx = setupSearch({ playbackState: 'Playing', pauseResult: pausing.promise })
    const running = ctx.api.start()
    await flush()
    if (action == 'cancel') ctx.api.cancel()
    if (action == 'unmount') ctx.unmount()
    if (action == 'background') {
      ctx.appState.currentState = 'background'
      ctx.listeners.change('background')
    }
    pausing.resolve()
    await running
    assert.equal(ctx.requests.length, 0)
    assert.equal(ctx.playback.playCalls, 1)
    assert.equal(ctx.playback.state, 'Playing')
  })
}

test('a failed pause aborts recognition instead of recording over music', async() => {
  const pausing = deferred()
  const ctx = setupSearch({ playbackState: 'Playing', pauseResult: pausing.promise })
  const running = ctx.api.start()
  await flush()
  pausing.reject(new Error('pause failed'))
  await running
  assert.equal(ctx.requests.length, 0)
  assert.equal(ctx.playback.playCalls, 0)
  assert.deepEqual(ctx.messages, ['speech_recognition_failed'])
  assert.equal(ctx.api.isRecognizing, false)
})

for (const change of ['track', 'stop', 'destroy', 'scheduled-stop', 'already-playing']) {
  test(`playback ${change} during recognition is not overridden on completion`, async() => {
    const ctx = setupSearch({ playbackState: 'Playing' })
    const running = ctx.api.start()
    await flush()
    if (change == 'track') ctx.playerState.playMusicInfo = { musicInfo: { id: 'other-song' }, listId: 'list' }
    if (change == 'stop') ctx.playback.state = 'Stopped'
    if (change == 'destroy') ctx.playback.initialized = false
    if (change == 'scheduled-stop') ctx.lx.isPlayedStop = true
    if (change == 'already-playing') ctx.playback.state = 'Playing'
    ctx.requests[0].resolve('完成')
    await running
    assert.equal(ctx.playback.playCalls, 0)
  })
}

test('cancel then immediately retry waits for old recorder cleanup and never resumes during new recording', async() => {
  const resuming = deferred()
  const ctx = setupSearch({ playbackState: 'Playing', resumeResult: resuming.promise })
  const first = ctx.api.start()
  await flush()
  ctx.api.cancel()
  const second = ctx.api.start()
  await flush()
  assert.equal(ctx.requests.length, 1)
  ctx.requests[0].reject({ code: 'E_CANCELLED' })
  await flush()
  assert.equal(ctx.playback.playCalls, 1)
  assert.equal(ctx.requests.length, 1, 'wait until previous resume completes')
  resuming.resolve()
  await first
  await flush()
  assert.equal(ctx.requests.length, 2)
  assert.equal(ctx.playback.pauseCalls, 2)
  assert.equal(ctx.playback.state, 'Paused')
  assert.equal(ctx.api.isRecognizing, true)
  assert.equal(ctx.playback.playCalls, 1)
  ctx.requests[1].resolve('新的结果')
  await second
  assert.deepEqual(ctx.results, ['新的结果'])
  assert.equal(ctx.playback.playCalls, 2)
  assert.equal(ctx.playback.state, 'Playing')
})

test('resume failure still cleans up recognition and allows later sessions', async() => {
  const resuming = deferred()
  const ctx = setupSearch({ playbackState: 'Playing', resumeResult: resuming.promise })
  const first = ctx.api.start()
  await flush()
  ctx.requests[0].resolve('第一次')
  await flush()
  resuming.reject(new Error('resume failed'))
  await first
  assert.equal(ctx.api.isRecognizing, false)
  assert.deepEqual(ctx.results, ['第一次'])
  const second = ctx.api.start()
  await flush()
  ctx.requests[1].resolve('第二次')
  await second
  assert.deepEqual(ctx.results, ['第一次', '第二次'])
  assert.equal(ctx.playback.playCalls, 1, 'do not start originally paused music on the next session')
})


test('reopening search waits for playback restoration from the unmounted session', async() => {
  const ctx = setupSearch({ playbackState: 'Playing' })
  const first = ctx.api.start()
  await flush()
  ctx.unmount()
  ctx.remount()
  const second = ctx.api.start()
  await flush()
  assert.equal(ctx.requests.length, 1)
  ctx.requests[0].reject({ code: 'E_CANCELLED' })
  await first
  await flush()
  assert.equal(ctx.requests.length, 2)
  assert.equal(ctx.playback.pauseCalls, 2)
  assert.equal(ctx.playback.playCalls, 1)
  assert.equal(ctx.playback.state, 'Paused')
  ctx.requests[1].resolve('完成')
  await second
  assert.equal(ctx.playback.playCalls, 2)
})
