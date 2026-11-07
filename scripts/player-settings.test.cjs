/* Player-settings interaction/layout contracts; native screenshots verify text and Yoga layout. */
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')
const React = require('react')
const ShallowRenderer = require('react-shallow-renderer')
const root = path.resolve(__dirname, '..')
const folder = 'src/screens/PlayDetail/components/SettingPopup/'
const noop = () => {}
const native = {
  ...Object.fromEntries(['View', 'Pressable', 'Modal', 'ScrollView'].map(name => [name, name])),
  StyleSheet: { compose: (a, b) => [a, b], absoluteFillObject: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } },
  useWindowDimensions: () => ({ width: 1920, height: 1080 }),
  PanResponder: { create: handlers => ({ panHandlers: handlers }) },
}
function load(file, mocks = {}) {
  const filename = path.join(root, file)
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 }, fileName: filename,
  })
  const module = { exports: {} }
  const dependencies = {
    'react-native': native,
    '@/utils/pixelRatio': { px: value => value },
    './scale': { px: value => value }, '../scale': { px: value => value },
    '@/store/theme/hook': { useTheme: () => tokens.NOCTURNE_TOKENS },
    '@/lang': { useI18n: () => key => key },
    '@/components/car/CarIcon': 'CarIcon', '@/components/car/CarText': 'CarText',
    './Text': 'CarText', '../Text': 'CarText',
    ...mocks,
  }
  vm.runInNewContext(outputText, { module, exports: module.exports, require(id) {
    if (Object.hasOwn(dependencies, id)) return dependencies[id]
    if (id == 'react' || id == 'react/jsx-runtime') return require(id)
    throw new Error(`Unmocked dependency ${id}`)
  } }, { filename })
  return module.exports
}
const tokens = load('src/theme/tokens.ts')
function mount(Component, props = {}) {
  const renderer = new ShallowRenderer()
  renderer.render(React.createElement(Component, props))
  return { output: () => renderer.getRenderOutput(), render: props => renderer.render(React.createElement(Component, props)) }
}
function children(node) { return React.Children.toArray(node.props.children) }
function find(node, predicate) {
  if (!React.isValidElement(node)) return undefined
  if (predicate(node)) return node
  for (const child of children(node)) { const result = find(child, predicate); if (result) return result }
}
function style(node) {
  const value = typeof node.props.style == 'function' ? node.props.style({ pressed: false }) : node.props.style
  return Object.assign({}, ...[value].flat())
}
const settings = { 'player.volume': 0.57, 'player.playbackRate': 1.13, 'playDetail.horizontal.style.lrcFontSize': 220, 'playDetail.vertical.style.lrcFontSize': 210, 'playDetail.style.align': 'left', 'playDetail.isShowLyricProgressSetting': false }
function settingMocks(updates) {
  return {
    '@/store/setting/hook': { useSettingValue: key => settings[key] },
    '@/core/common': { updateSetting: value => updates.push(value) },
    './SettingSlider': 'SettingSlider',
  }
}
function slider(overrides = {}) {
  const changes = []; const commits = []
  const props = { label: 'Volume', value: 50, minimumValue: 0, maximumValue: 100, step: 1, onValueChange: value => changes.push(value), onSlidingComplete: value => commits.push(value), ...overrides }
  const component = load(folder + 'settings/SettingSlider.tsx').default
  const instance = mount(component, props)
  return { ...instance, changes, commits, props, rail: () => find(instance.output(), node => node.props.accessibilityRole == 'adjustable') }
}

test('sliders quantize and clamp volume, hundredths of speed, and even font sizes', () => {
  const { normalizeSettingValue: normalize } = load(folder + 'settings/SettingSlider.tsx')
  for (const [min, max, step] of [[0, 100, 1], [60, 200, 1], [100, 300, 2]]) {
    assert.equal(normalize(-999, min, max, step), min)
    assert.equal(normalize(999, min, max, step), max)
    assert.equal(normalize(min + step * 1.7, min, max, step), min + step * 2)
  }
})

test('tap and drag use the visible track width and commit only at release', () => {
  const s = slider()
  s.rail().props.onLayout({ nativeEvent: { layout: { width: 528 } } })
  s.rail().props.onPanResponderGrant({ nativeEvent: { locationX: 139 } })
  assert.equal(s.changes.at(-1), 25)
  assert.equal(s.rail().props.accessibilityValue.now, 25)
  assert.equal(s.commits.length, 0)
  s.rail().props.onPanResponderMove({}, { dx: 1000 })
  assert.equal(s.changes.at(-1), 100)
  s.rail().props.onPanResponderRelease()
  assert.deepEqual(s.commits, [100])
})

test('gesture termination saves the applied value and responder uses updated props', () => {
  const s = slider()
  const changes = []; const commits = []
  s.render({ ...s.props, minimumValue: 100, maximumValue: 300, step: 2, value: 220, onValueChange: value => changes.push(value), onSlidingComplete: value => commits.push(value) })
  s.rail().props.onLayout({ nativeEvent: { layout: { width: 528 } } })
  s.rail().props.onPanResponderGrant({ nativeEvent: { locationX: 264 } })
  s.rail().props.onPanResponderTerminate()
  assert.deepEqual(changes, [200])
  assert.deepEqual(commits, [200])
  assert.equal(s.changes.length, 0)
})

test('step buttons and accessibility actions share clamping and immediate commit', () => {
  const s = slider({ value: 60, minimumValue: 60, maximumValue: 200 })
  const decrease = find(s.output(), node => node.props.accessibilityLabel == 'play_detail_setting_decrease Volume')
  const increase = find(s.output(), node => node.props.accessibilityLabel == 'play_detail_setting_increase Volume')
  assert.equal(decrease.props.disabled, true)
  assert.equal(style(increase).height, 64)
  increase.props.onPress()
  assert.deepEqual(s.commits, [61])
  s.rail().props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } })
  assert.equal(s.commits.at(-1), 60)
})

test('volume percentages and 1.13× do not suffer floating-point truncation', () => {
  const updates = []; const live = []
  const Volume = load(folder + 'settings/SettingVolume.tsx', { ...settingMocks(updates), '@/plugins/player': { setVolume: value => live.push(value) } }).default
  const output = mount(Volume).output()
  assert.equal(output.props.value, 57)
  assert.equal(output.props.formatValue(57), '57%')
  output.props.onValueChange(42)
  output.props.onSlidingComplete(42)
  assert.deepEqual(live, [0.42])
  assert.equal(updates[0]['player.volume'], 0.42)
})

test('speed reset updates audio, lyrics, metadata and the saved rate', () => {
  const updates = []; const rates = []; const lyrics = []; const metadata = []
  const Rate = load(folder + 'settings/SettingPlaybackRate.tsx', {
    ...settingMocks(updates), '@/plugins/player': { setPlaybackRate: value => rates.push(value), updateMetaData: (...value) => metadata.push(value) },
    '@/core/lyric': { setPlaybackRate: value => lyrics.push(value) }, '@/store/player/state': { musicInfo: 'track', isPlay: true },
  }).default
  const output = find(mount(Rate).output(), node => node.type == 'SettingSlider')
  assert.equal(output.props.value, 113)
  assert.equal(output.props.formatValue(113), '1.13×')
  assert.equal(output.props.minimumValue, 60)
  assert.equal(output.props.maximumValue, 200)
  output.props.onValueChange(150)
  output.props.onSlidingComplete(150)
  output.props.onReset()
  assert.deepEqual(rates, [1.5, 1])
  assert.deepEqual(lyrics, [1.5, 1])
  assert.equal(updates.at(-1)['player.playbackRate'], 1)
  assert.deepEqual(metadata.at(-1), ['track', true, true])
})

test('font preview is live, persistence retains independent horizontal/vertical sizes', () => {
  for (const direction of ['horizontal', 'vertical']) {
    const updates = []; const previews = []
    const Font = load(folder + 'settings/SettingLrcFontSize.tsx', { ...settingMocks(updates), '@/config/defaultSetting': settings }).default
    const output = mount(Font, { direction, onPreview: value => previews.push(value) }).output()
    assert.equal(output.props.value, settings[`playDetail.${direction}.style.lrcFontSize`])
    assert.equal(output.props.step, 2)
    output.props.onValueChange(260)
    assert.equal(updates.length, 0)
    output.props.onSlidingComplete(260)
    assert.equal(updates[0][`playDetail.${direction}.style.lrcFontSize`], 260)
    assert.deepEqual(previews, [260, null])
  }
})

test('lyric dragging switch and three-way alignment persist their actual settings', () => {
  const updates = []
  const Switch = load(folder + 'settings/SettingLyricProgress.tsx', settingMocks(updates)).default
  const control = find(mount(Switch).output(), node => node.props.accessibilityRole == 'switch')
  assert.equal(control.props.accessibilityState.checked, false)
  control.props.onPress()
  assert.equal(updates.at(-1)['playDetail.isShowLyricProgressSetting'], true)
  const Align = load(folder + 'settings/SettingLrcAlign.tsx', settingMocks(updates)).default
  const group = find(mount(Align).output(), node => node.props.accessibilityRole == 'radiogroup')
  assert.equal(style(group).minHeight, 72)
  children(group).forEach((option, index) => {
    assert.equal(option.props.accessibilityState.checked, index == 0)
    option.props.onPress()
    assert.equal(updates.at(-1)['playDetail.style.align'], ['left', 'center', 'right'][index])
  })
})

function drawer(theme, props = {}, size = { width: 1920, height: 1080 }) {
  let imperative
  const updates = []
  const Component = load(folder + 'index.tsx', {
    ...settingMocks(updates),
    react: { ...React, useImperativeHandle: (_ref, create) => { imperative = create() } },
    'react-native': { ...native, useWindowDimensions: () => size },
    '@/store/theme/hook': { useTheme: () => theme },
    ...Object.fromEntries(['SettingVolume', 'SettingPlaybackRate', 'SettingLyricProgress', 'SettingLrcFontSize', 'SettingLrcAlign'].map(name => [`./settings/${name}`, name])),
  }).default
  const instance = mount(Component, { direction: 'horizontal', ...props })
  return { ...instance, show: () => imperative.show() }
}

test('dark/light tabbed drawer matches the revised Pen and isolates audio from lyrics', () => {
  for (const theme of [tokens.NOCTURNE_TOKENS, tokens.DAYLIGHT_TOKENS]) {
    const d = drawer(theme)
    assert.equal(d.output().props.visible, false)
    d.show()
    assert.equal(d.output().props.visible, true)
    const panel = find(d.output(), node => node.props.accessibilityViewIsModal)
    assert.equal(style(panel).width, 760)
    assert.equal(style(panel).height, 960)
    assert.equal(style(panel).borderRadius, 32)
    assert.equal(style(panel).backgroundColor, theme['player-settings-surface'])
    const audio = children(panel).find(node => typeof node.type == 'function')
    const a = mount(audio.type, audio.props)
    assert.ok(find(a.output(), node => node.type == 'SettingVolume'))
    assert.equal(find(a.output(), node => node.type == 'SettingLrcFontSize'), undefined)
    const tab = find(d.output(), node => node.props.accessibilityRole == 'tab' && node.props.accessibilityLabel == 'play_detail_setting_lyrics')
    assert.equal(tab.props.accessibilityState.selected, false)
    assert.ok(style(tab).minHeight >= 64)
    tab.props.onPress()
    const updatedPanel = find(d.output(), node => node.props.accessibilityViewIsModal)
    const content = children(updatedPanel).find(node => typeof node.type == 'function')
    const c = mount(content.type, content.props)
    assert.equal(find(c.output(), node => node.type == 'SettingVolume'), undefined)
    assert.equal(c.output().type, 'ScrollView')
    assert.equal(style(c.output()).flex, 1)
    find(c.output(), node => node.type == 'SettingLrcFontSize').props.onPreview(110)
    const preview = find(c.output(), node => node.props.children == 'play_detail_setting_preview_lyric')
    assert.equal(preview.props.size, 21)
    assert.equal(style(preview).textAlign, 'left')
  }
})

test('done, close, backdrop and back respect the existing dismissal contract', () => {
  let hidden = 0
  const d = drawer(tokens.NOCTURNE_TOKENS, { onHide: () => hidden++ })
  d.show()
  find(d.output(), node => node.type == 'Pressable' && children(node).some(child => child.props.children == 'play_detail_setting_done')).props.onPress()
  assert.equal(d.output().props.visible, false)
  assert.equal(hidden, 1)
  d.show()
  d.output().props.onRequestClose()
  assert.equal(hidden, 2)
  d.show()
  find(d.output(), node => node.type == 'Pressable' && children(node).some(child => child.props.name == 'lucide-x')).props.onPress()
  assert.equal(hidden, 3)
  d.show()
  find(d.output(), node => node.type == 'Pressable' && style(node).position == 'absolute').props.onPress()
  assert.equal(hidden, 4)
  const locked = drawer(tokens.NOCTURNE_TOKENS, { keyHide: false, bgHide: false, closeBtn: false })
  locked.show()
  locked.output().props.onRequestClose()
  assert.equal(locked.output().props.visible, true)
  assert.equal(find(locked.output(), node => node.props.name == 'lucide-x'), undefined)
  assert.equal(find(locked.output(), node => node.type == 'Pressable' && style(node).position == 'absolute').props.onPress, undefined)
})

test('compact portrait keeps panel inside the window', () => {
  const d = drawer(tokens.NOCTURNE_TOKENS, { direction: 'vertical' }, { width: 390, height: 844 })
  d.show()
  const panel = find(d.output(), node => node.props.accessibilityViewIsModal)
  assert.ok(style(panel).width <= 390 - 80)
  assert.ok(style(panel).height <= 844 - 80)
})

test('all settings icons exist in the bundled font and new copy exists in every language', () => {
  const selection = JSON.parse(readFileSync(path.join(root, 'src/resources/fonts/selection.json')))
  for (const name of ['lucide-minus', 'lucide-plus', 'lucide-rotate-ccw', 'ms-format-align-left', 'ms-format-align-center', 'ms-format-align-right']) {
    assert.ok(selection.icons.some(icon => icon.properties.name == name), name)
  }
  const langs = ['zh-cn', 'zh-tw', 'en-us'].map(lang => JSON.parse(readFileSync(path.join(root, `src/lang/${lang}.json`))))
  const keys = Object.keys(langs[0]).filter(key => key.startsWith('play_detail_setting_'))
  for (const lang of langs) for (const key of keys) assert.equal(typeof lang[key], 'string', key)
})


test('fractional layout scaling avoids cumulative rounding in compact drawers', () => {
  const { px } = load(folder + 'scale.ts', { '@/utils/pixelRatio': { px: value => Math.round(value * 2 / 3) } })
  assert.equal(px(64) * 3, px(192))
  assert.ok(Math.abs(px(60) + px(960) + px(60) - 720) < 1e-9)
})

test('settings text removes Android font padding without changing other car screens', () => {
  const Text = load(folder + 'Text.tsx').default
  const output = mount(Text, { size: 32, style: { textAlign: 'right' }, children: 'Player settings' }).output()
  assert.equal(style(output).includeFontPadding, false)
  assert.equal(style(output).textAlign, 'right')
  assert.equal(output.props.size, 32)
})

test('default size hint follows the draft, not a stale saved setting', () => {
  const s = slider({ value: 220, minimumValue: 100, maximumValue: 300, step: 2, hint: 'Default', hintValue: 220 })
  assert.ok(find(s.output(), node => node.props.children == 'Default'))
  s.rail().props.onLayout({ nativeEvent: { layout: { width: 528 } } })
  s.rail().props.onPanResponderGrant({ nativeEvent: { locationX: 264 } })
  assert.equal(find(s.output(), node => node.props.children == 'Default'), undefined)
})


test('preset speeds apply native audio, lyrics and metadata without a save step', () => {
  const updates = []; const rates = []; const lyrics = []; const metadata = []
  const Rate = load(folder + 'settings/SettingPlaybackRate.tsx', {
    ...settingMocks(updates), '@/plugins/player': { setPlaybackRate: value => rates.push(value), updateMetaData: (...value) => metadata.push(value) },
    '@/core/lyric': { setPlaybackRate: value => lyrics.push(value) }, '@/store/player/state': { musicInfo: 'track', isPlay: false },
  }).default
  const instance = mount(Rate)
  const group = find(instance.output(), node => node.props.accessibilityRole == 'radiogroup')
  assert.equal(children(group).length, 5)
  children(group).forEach((option, index) => {
    const expected = [0.75, 1, 1.25, 1.5, 2][index]
    assert.ok(style(option).minHeight >= 64)
    option.props.onPress()
    assert.equal(rates.at(-1), expected)
    assert.equal(lyrics.at(-1), expected)
    assert.equal(updates.at(-1)['player.playbackRate'], expected)
    assert.deepEqual(metadata.at(-1), ['track', false, true])
  })
  find(instance.output(), node => node.type == 'SettingSlider').props.onValueChange(125)
  const selected = find(instance.output(), node => node.props.accessibilityRole == 'radio' && node.props.accessibilityState.checked)
  assert.equal(selected.props.accessibilityLabel, 'play_detail_setting_playback_rate 1.25×')
})

test('reopening settings retains the last tab and content remounts across tabs', () => {
  const d = drawer(tokens.NOCTURNE_TOKENS)
  d.show()
  find(d.output(), node => node.props.accessibilityRole == 'tab' && node.props.accessibilityLabel == 'play_detail_setting_lyrics').props.onPress()
  const lyrics = find(d.output(), node => typeof node.type == 'function')
  assert.ok(lyrics.key.endsWith('$lyrics'))
  d.output().props.onRequestClose()
  assert.equal(find(d.output(), node => typeof node.type == 'function'), undefined)
  d.show()
  const selected = find(d.output(), node => node.props.accessibilityRole == 'tab' && node.props.accessibilityState.selected)
  assert.equal(selected.props.accessibilityLabel, 'play_detail_setting_lyrics')
  find(d.output(), node => node.props.accessibilityRole == 'tab' && node.props.accessibilityLabel == 'play_detail_setting_audio').props.onPress()
  assert.ok(find(d.output(), node => typeof node.type == 'function').key.endsWith('$audio'))
})

test('audio controls use spacious rows and round fine-adjustment buttons', () => {
  const s = slider({ prominent: true })
  const plus = find(s.output(), node => node.props.accessibilityLabel == 'play_detail_setting_increase Volume')
  assert.equal(style(plus).borderRadius, 32)
  const value = find(s.output(), node => node.props.num && node.props.size == 40)
  assert.ok(value)
  assert.equal(value.props.color, undefined)
})
