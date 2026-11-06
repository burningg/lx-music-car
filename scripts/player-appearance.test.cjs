/* Player appearance regressions. Run with node --test scripts/player-appearance.test.cjs.
 * These shallow-render contracts complement native dark/light screenshot checks.
 */
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')
const React = require('react')
const ShallowRenderer = require('react-shallow-renderer')

const root = path.resolve(__dirname, '..')
const noop = () => {}
const fill = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }
const native = {
  View: 'View', Image: 'Image', FlatList: 'FlatList',
  StyleSheet: { absoluteFillObject: fill, create: value => value },
}
function load(file, mocks = {}) {
  const filename = path.join(root, file)
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  })
  const module = { exports: {} }
  const dependencies = { 'react-native': native, '@/utils/pixelRatio': { px: size => size, sp: size => size }, ...mocks }
  vm.runInNewContext(outputText, {
    module, exports: module.exports,
    require(id) {
      if (Object.hasOwn(dependencies, id)) return dependencies[id]
      if (id == 'react' || id == 'react/jsx-runtime') return require(id)
      if (id.endsWith('.png')) {
        const image = readFileSync(path.join(root, id.replace('@/', 'src/')))
        assert.equal(image.subarray(1, 4).toString(), 'PNG')
        return { uri: id, width: image.readUInt32BE(16), height: image.readUInt32BE(20) }
      }
      throw new Error(`Unmocked dependency ${id} in ${file}`)
    },
  }, { filename })
  return module.exports.default
}
function render(Component, props = {}) {
  const renderer = new ShallowRenderer()
  renderer.render(React.createElement(Component, props))
  return renderer.getRenderOutput()
}
function children(node) { return React.Children.toArray(node.props.children) }
function find(node, predicate) {
  if (!React.isValidElement(node)) return undefined
  if (predicate(node)) return node
  for (const child of children(node)) {
    const found = find(child, predicate)
    if (found) return found
  }
}
function style(node) { return Object.assign({}, ...[node.props.style].flat()) }
const palettes = {
  dark: { isDark: true, bg: '#08080A', 'text-1': '#F5F5F7', 'text-2': '#A1A1A6', accent: '#FF7A50' },
  light: { isDark: false, bg: '#F5F3EF', 'text-1': '#1A1714', 'text-2': '#6B665F', accent: '#E8562A' },
}
function ambient(mode, pic = 'https://example.test/cover.png', props = {}, scale = 1) {
  const Background = load('src/components/car/AmbientBackground.tsx', {
    '@/components/common/Image': { defaultHeaders: { 'User-Agent': 'test' } },
    '@/store/player/hook': { usePlayerMusicInfo: () => ({ pic }) },
    '@/store/theme/hook': { useTheme: () => palettes[mode] },
    '@/utils/pixelRatio': { px: size => size * scale },
  })
  return render(Background, props)
}

test('dark/light shade explicitly overrides the local PNG intrinsic 512×4 dimensions', () => {
  for (const mode of ['dark', 'light']) {
    const output = ambient(mode)
    const shade = children(output).at(-1)
    assert.equal(shade.props.source.width, 512)
    assert.equal(shade.props.source.height, 4)
    // Mirrors React Native Image's [{ width: source.width, height: source.height }, props.style].
    const resolved = { width: shade.props.source.width, height: shade.props.source.height, ...style(shade) }
    assert.equal(resolved.width, '100%')
    assert.equal(resolved.height, '100%')
    assert.equal(shade.props.tintColor, palettes[mode].bg)
    assert.equal(shade.props.resizeMode, 'stretch')
    assert.equal(output.props.pointerEvents, 'none')
    assert.equal(style(output).overflow, 'hidden')
  }
})

test('blurred artwork bleeds past all viewport edges instead of ending in a fixed rectangle', () => {
  for (const scale of [0.5, 1, 1.5]) {
    const output = ambient('dark', undefined, {}, scale)
    const art = find(output, node => node.props.blurRadius != null)
    const bounds = style(art)
    for (const edge of ['top', 'right', 'bottom', 'left']) assert.ok(bounds[edge] < 0)
    assert.equal(bounds.width, undefined)
    assert.equal(bounds.height, undefined)
    assert.equal(bounds.opacity, 0.75)
    assert.equal(art.props.blurRadius, 180 * scale)
    const bottomFade = find(output, node => node.props.source?.uri.endsWith('fade-v.png'))
    assert.equal(style(bottomFade).width, '100%')
    assert.equal(style(bottomFade).bottom, 0)
    assert.equal(bottomFade.props.tintColor, palettes.dark.bg)
  }
})

test('daylight uses its own shade and warm glow, never the dark cover or bottom fade', () => {
  const output = ambient('light')
  assert.equal(find(output, node => node.props.blurRadius != null), undefined)
  assert.equal(find(output, node => node.props.source?.uri.endsWith('fade-v.png')), undefined)
  assert.ok(children(output).at(-1).props.source.uri.endsWith('shade-light-h.png'))
  const glow = children(output)[0]
  assert.equal(glow.props.tintColor, '#F4A57A')
  assert.equal(style(glow).top, -320)
})

test('empty artwork stays on the themed background and local artwork uses a file URI', () => {
  assert.equal(find(ambient('dark', ''), node => node.props.blurRadius != null), undefined)
  for (const pic of ['/storage/emulated/0/cover.jpg', 'file:///cache/cover.jpg', 'https://example.test/cover.jpg']) {
    const image = find(ambient('dark', pic), node => node.props.blurRadius != null)
    assert.equal(image.props.source.uri, pic.startsWith('/') ? `file://${pic}` : pic)
    assert.equal(image.props.source.headers['User-Agent'], 'test')
  }
})

test('glow-only pages keep an accent-tinted, non-interactive background without artwork', () => {
  for (const mode of ['dark', 'light']) {
    const output = ambient(mode, undefined, { variant: 'glow' })
    assert.equal(children(output).length, 1)
    assert.equal(children(output)[0].props.tintColor, palettes[mode].accent)
    assert.equal(output.props.pointerEvents, 'none')
  }
})

test('player background is underneath both the rail and the responsive information column', () => {
  const Shell = load('src/components/car/CarShell.tsx', {
    '@/components/common/StatusBar': 'StatusBar', './NavRail': 'NavRail', './OverlayHost': 'OverlayHost',
  })
  const shell = render(Shell, { background: React.createElement('AmbientBackground'), children: React.createElement('Content') })
  const row = children(shell)[1]
  assert.equal(children(row)[0].type, 'AmbientBackground')
  assert.equal(children(row)[1].type, 'NavRail')
  assert.equal(children(children(row)[2])[0].type, 'Content')

  const Player = load('src/screens/PlayDetail/Horizontal/index.tsx', {
    '@/utils/nativeModules/utils': {}, '@/core/common': {}, '@/config/constant': {},
    '@/components/PageContent': 'PageContent', '@/store/common/state': {}, '@/navigation': {},
    '@/components/car': { AmbientBackground: 'AmbientBackground', CarShell: 'CarShell' },
    ...Object.fromEntries(['TopBar', 'Cover', 'Meta', 'ProgressRow', 'Transport', 'Secondary', 'Lyric'].map(name => [`./${name}`, name])),
  })
  const player = find(render(Player, { componentId: 'player' }), node => node.type == 'CarShell')
  assert.equal(player.props.background.type, 'AmbientBackground')
  assert.equal(find(player, node => node.type == 'AmbientBackground'), undefined, 'do not render a second background confined to the content column')
  const info = find(player, node => children(node).some(child => child.type == 'Meta'))
  assert.equal(style(info).flex, 1)
  assert.equal(style(info).minWidth, 0)
  assert.equal(style(info).width, undefined)
  const lyric = find(player, node => children(node).some(child => child.type == 'Lyric'))
  assert.equal(style(lyric).width, 440)
  assert.equal(style(lyric).height, 340)
})

function lyrics(mode = 'dark', fontSize = 220, scale = 1) {
  const Lyric = load('src/screens/PlayDetail/Horizontal/Lyric.tsx', {
    '@/plugins/lyric': { useLrcSet: () => [], useLrcPlay: () => ({ line: 3 }) },
    '@/store/theme/hook': { useTheme: () => palettes[mode] },
    '@/store/setting/hook': { useSettingValue: key => ({
      'playDetail.horizontal.style.lrcFontSize': fontSize,
      'playDetail.style.align': 'right',
      'playDetail.isShowLyricProgressSetting': false,
    })[key] },
    '@/utils/pixelRatio': { px: size => size * scale, sp: size => size * scale },
    '@/components/common/Text': { AnimatedColorText: 'AnimatedColorText' },
    '@/theme/fonts': { getFontStyle: weight => ({ fontWeight: weight }) },
    '@/store/player/state': {}, '@/utils/scroll': { scrollTo: noop }, '../components/PlayLine': 'PlayLine',
  })
  return find(render(Lyric), node => node.type == 'FlatList')
}

test('lyric brightness, weight and size follow the six-line design in both themes', () => {
  for (const mode of ['dark', 'light']) {
    const list = lyrics(mode)
    for (const [index, opacity, size, weight] of [[0, 0.15, 20, '400'], [1, 0.2, 20, '400'], [2, 0.35, 20, '400'], [3, 1, 36, '700'], [4, 0.5, 22, '500'], [5, 0.3, 20, '400'], [6, 0.15, 20, '400']]) {
      const item = list.props.renderItem({ item: { text: '歌词', extendedLyrics: ['Translation'] }, index })
      const output = render(item.type, item.props)
      const [text, translation] = children(output)
      assert.equal(text.props.color, palettes[mode]['text-1'])
      assert.equal(text.props.opacity, opacity)
      assert.equal(style(text).fontSize, size)
      assert.equal(style(text).fontWeight, weight)
      assert.equal(style(text).textAlign, 'right', 'preserve user alignment')
      assert.equal(translation.props.opacity, opacity)
      assert.equal(translation.props.color, palettes[mode][index == 3 ? 'text-2' : 'text-1'])
    }
  }
})

test('neighboring lyric lines rerender when the active index changes, not only when highlighted', () => {
  const list = lyrics()
  const line = list.props.renderItem({ item: { text: '歌词', extendedLyrics: [] }, index: 1 })
  assert.equal(line.type.compare(line.props, { ...line.props }), true)
  assert.equal(line.type.compare(line.props, { ...line.props, activeLine: 4 }), false)
  assert.equal(line.type.compare(line.props, { ...line.props, lineNum: 2 }), false)
  assert.equal(line.type.compare(line.props, { ...line.props, onLayout: noop }), false)
})

test('lyric edge fade scales with the screen, while font preference still scales text', () => {
  const list = lyrics('dark', 330, 0.5)
  assert.equal(list.props.fadingEdgeLength, 16)
  const line = list.props.renderItem({ item: { text: '歌词', extendedLyrics: [] }, index: 3 })
  const text = children(render(line.type, line.props))[0]
  assert.equal(style(text).fontSize, 27)
  assert.equal(style(text).lineHeight, 27 * 1.3)
})
