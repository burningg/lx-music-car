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
  View: 'View',
  Image: 'Image',
  FlatList: 'FlatList',
  StyleSheet: { absoluteFillObject: fill, create: value => value },
}
function load(file, mocks = {}) {
  const filename = path.join(root, file)
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  })
  const module = { exports: {} }
  const dependencies = {
    'react-native': native,
    '@/utils/pixelRatio': { px: size => size, sp: size => size },
    '@/utils/hooks/useWindowSize': () => ({ width: 1920, height: 1080 }),
    ...mocks,
  }
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
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
function ambient(mode, props = {}, scale = 1) {
  const Background = load('src/components/car/AmbientBackground.tsx', {
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

test('night ambient uses the design art bounds with baked transparent bleed, not a viewport-sized cover', () => {
  const design = JSON.parse(readFileSync(path.join(root, 'design/lx-music-car-claude.pen'), 'utf8'))
  const player = design.children.find(node => node.id == 'SEv9u')
  const art = player.children.find(node => node.name == 'Ambient Art')
  const bleed = art.effect.radius * 3
  for (const scale of [0.5, 1, 1.5]) {
    const output = ambient('dark', {}, scale)
    const backdrop = children(output)[0]
    const bounds = style(backdrop)
    assert.ok(backdrop.props.source.uri.endsWith('nocturne-art.png'))
    assert.equal(bounds.left, (art.x - bleed) * scale)
    assert.equal(bounds.top, (art.y - bleed) * scale)
    assert.equal(bounds.width, (art.width + bleed * 2) * scale)
    assert.equal(bounds.height, (art.height + bleed * 2) * scale)
    assert.equal(bounds.right, undefined)
    assert.equal(bounds.bottom, undefined)
    assert.equal(bounds.opacity, art.opacity)
    assert.equal(backdrop.props.source.width, (art.width + bleed * 2) / 4)
    assert.equal(backdrop.props.source.height, (art.height + bleed * 2) / 4)
    assert.equal(backdrop.props.blurRadius, undefined, 'blur is baked, not recalculated by Android')
    assert.equal(backdrop.props.resizeMode, 'stretch')
    assert.equal(children(output).length, 2, 'only ambient and horizontal shade; no extra bottom blackout')
  }
})

test('night ambient works without player state, artwork URLs or network access', () => {
  // ambient() deliberately provides no player hook or remote-image mocks. Any
  // renewed dependency on the current song (including empty covers) fails loading.
  const output = ambient('dark')
  for (const image of children(output)) {
    assert.ok(image.props.source.uri.startsWith('@/resources/images/ambient/'))
    assert.equal(image.props.source.headers, undefined)
    assert.equal(image.props.blurRadius, undefined)
  }
  assert.equal(find(output, node => node.props.source?.uri.endsWith('fade-v.png')), undefined)
})

test('daylight uses its own shade and warm glow, never the dark cover or bottom fade', () => {
  const output = ambient('light')
  assert.equal(find(output, node => node.props.source?.uri.endsWith('nocturne-art.png')), undefined)
  assert.equal(find(output, node => node.props.source?.uri.endsWith('fade-v.png')), undefined)
  assert.ok(children(output).at(-1).props.source.uri.endsWith('shade-light-h.png'))
  const glow = children(output)[0]
  assert.equal(glow.props.tintColor, '#F4A57A')
  assert.equal(style(glow).top, -320)
})

test('glow-only pages keep an accent-tinted, non-interactive background without artwork', () => {
  for (const mode of ['dark', 'light']) {
    const output = ambient(mode, { variant: 'glow' })
    assert.equal(children(output).length, 1)
    assert.equal(children(output)[0].props.tintColor, palettes[mode].accent)
    assert.equal(output.props.pointerEvents, 'none')
  }
})

function player(scale = 1) {
  const Player = load('src/screens/PlayDetail/Horizontal/index.tsx', {
    '@/utils/nativeModules/utils': {},
    '@/core/common': {},
    '@/config/constant': {},
    '@/components/PageContent': 'PageContent',
    '@/store/common/state': {},
    '@/navigation': {},
    '@/utils/pixelRatio': { px: size => size * scale },
    '@/components/car': { AmbientBackground: 'AmbientBackground', CarShell: 'CarShell' },
    ...Object.fromEntries(['TopBar', 'Cover', 'Meta', 'ProgressRow', 'Transport', 'Secondary', 'Lyric'].map(name => [`./${name}`, name])),
  })
  return find(render(Player, { componentId: 'player' }), node => node.type == 'CarShell')
}

test('player background is underneath both the rail and the two-column content', () => {
  const Shell = load('src/components/car/CarShell.tsx', {
    '@/components/common/StatusBar': 'StatusBar', './NavRail': 'NavRail', './OverlayHost': 'OverlayHost',
  })
  const shell = render(Shell, { background: React.createElement('AmbientBackground'), children: React.createElement('Content') })
  const row = children(shell)[1]
  assert.equal(children(row)[0].type, 'AmbientBackground')
  assert.equal(children(row)[1].type, 'NavRail')
  assert.equal(children(children(row)[2])[0].type, 'Content')

  const output = player()
  assert.equal(output.props.background.type, 'AmbientBackground')
  assert.equal(find(output, node => node.type == 'AmbientBackground'), undefined, 'do not render a second background confined to the content column')
})

test('playback and every CarShell page use the same rail without page-specific sizing', () => {
  const Shell = load('src/components/car/CarShell.tsx', {
    '@/components/common/StatusBar': 'StatusBar', './NavRail': 'NavRail', './OverlayHost': 'OverlayHost',
  })
  const output = player()
  assert.equal(Object.hasOwn(output.props, 'navRailSize'), false)
  for (const activeId of ['now', 'nav_songlist', 'nav_search', 'nav_top', 'nav_love', 'nav_setting']) {
    const rail = find(render(Shell, { ...output.props, activeId }), node => node.type == 'NavRail')
    assert.equal(Object.hasOwn(rail.props, 'size'), false)
    assert.equal(rail.props.componentId, 'player')
    assert.equal(rail.props.activeId, activeId)
  }
  const homeRail = find(render(Shell, { children: React.createElement('Content') }), node => node.type == 'NavRail')
  assert.equal(Object.hasOwn(homeRail.props, 'size'), false)
  assert.equal(homeRail.props.componentId, undefined)
  assert.equal(homeRail.props.activeId, undefined)
})

test('SPRSH stacks cover and controls next to a wider six-line lyric viewport at every car scale', () => {
  const design = JSON.parse(readFileSync(path.join(root, 'design/lx-music-car-claude.pen'), 'utf8'))
  const page = design.children.find(node => node.id == 'SEv9u')
  const main = page.children.find(node => node.id == 'SPRSH')
  const rail = page.children.find(node => node.id == 'oNiqn')
  const [stackDesign, lyricDesign] = main.children
  const infoDesign = stackDesign.children.find(node => node.id == 'lAYoo')
  for (const scale of [0.5, 2 / 3, 1, 1.5]) {
    const output = player(scale)
    const row = find(output, node => style(node).flexDirection == 'row')
    const [stack, lyric] = children(row)
    assert.equal(children(row).length, 2)
    assert.equal(style(row).gap, main.gap * scale)
    assert.equal(style(row).alignItems, 'center')
    assert.equal(style(stack).flex, 1)
    assert.equal(style(stack).minWidth, 0)
    assert.equal(style(stack).alignItems, 'center')
    assert.equal(style(stack).gap, stackDesign.gap * scale)
    assert.equal(style(stack).flexDirection ?? 'column', 'column')
    const [cover, info] = children(stack)
    assert.equal(cover.type, 'Cover')
    assert.equal(cover.props.componentId, 'player')
    assert.equal(style(info).width, infoDesign.width * scale)
    const content = find(output, node => style(node).paddingHorizontal != null)
    const stackWidth = (page.width - rail.width) * scale - style(content).paddingHorizontal * 2 - style(row).gap - style(lyric).width
    assert.ok(stackWidth >= style(info).width, 'the enlarged rail leaves room for the playback controls')
    assert.equal(style(info).maxWidth, '100%')
    assert.equal(style(info).minWidth, 0)
    assert.equal(style(info).gap, infoDesign.gap * scale)
    assert.deepEqual(children(info).map(node => node.type), ['Meta', 'ProgressRow', 'Transport', 'Secondary'])
    assert.equal(style(lyric).width, lyricDesign.width * scale)
    assert.equal(style(lyric).height, 552 * scale)
    assert.equal(style(lyric).maxHeight, '100%')
    const sixLineHeight = lyricDesign.children.reduce((height, line) => height + line.fontSize * line.lineHeight + lyricDesign.gap, 0)
    assert.ok(style(lyric).height >= sixLineHeight * scale, 'six default lines including their vertical padding must fit')
    assert.equal(children(lyric)[0].type, 'Lyric')
  }
})

test('compact artwork keeps its rounded clipping, external shadow and shared-element image anchor', () => {
  for (const scale of [0.5, 1, 1.5]) {
    const Cover = load('src/screens/PlayDetail/Horizontal/Cover.tsx', {
      '@/store/theme/hook': { useTheme: () => ({ ...palettes.dark, 'shadow-strong': '#0009', 'art-stroke': '#fff2' }) },
      '@/store/player/hook': { usePlayerMusicInfo: () => ({ pic: 'current-cover' }) },
      '@/navigation': { useNavigationComponentDidAppear: noop },
      '@/config/constant': { NAV_SHEAR_NATIVE_IDS: { playDetail_pic: 'cover-anchor' } },
      '@/store/common/state': { componentIds: { playDetail: 'player' } },
      '@/utils/pixelRatio': { px: size => size * scale },
      '@/components/common/Image': 'Image',
    })
    const cover = render(Cover, { componentId: 'player' })
    assert.equal(style(cover).width, 320 * scale)
    assert.equal(style(cover).height, 320 * scale)
    assert.equal(style(cover).borderRadius, 18 * scale)
    assert.equal(style(cover).overflow, undefined, 'the artwork shadow must not be clipped')
    assert.equal(style(cover).shadowColor, '#0009')
    assert.equal(style(cover).shadowRadius, 60 * scale)
    assert.equal(style(cover).shadowOffset.height, 24 * scale)
    const clip = children(cover)[0]
    assert.equal(style(clip).overflow, 'hidden')
    assert.equal(style(clip).borderRadius, 18 * scale)
    const image = children(clip)[0]
    assert.equal(image.type, 'Image')
    assert.equal(image.props.url, 'current-cover')
    assert.equal(image.props.nativeID, 'cover-anchor')
  }
})

function metadata(musicInfo, track, listName = '') {
  const Meta = load('src/screens/PlayDetail/Horizontal/Meta.tsx', {
    '@/store/theme/hook': { useTheme: () => palettes.dark },
    '@/store/player/hook': { usePlayerMusicInfo: () => musicInfo },
    '@/store/setting/hook': { useSettingValue: () => 'alias' },
    '@/lang': { useI18n: () => key => key },
    '@/components/car': { CarText: 'CarText' },
    '@/store/list/state': { allList: [{ id: 'playlist', name: listName }] },
    '@/store/player/state': { playMusicInfo: { musicInfo: track, listId: 'playlist' } },
  })
  return render(Meta)
}

test('368px metadata uses compact typography and truncates long titles without squeezing quality', () => {
  const song = { name: 'Long title '.repeat(30), singer: 'Long artist '.repeat(20), album: 'Long album '.repeat(20) }
  const listName = 'Long playlist '.repeat(30)
  const output = metadata(song, { source: 'kw', meta: { _qualitys: { flac: true } } }, listName)
  const [source, titleRow, artist] = children(output)
  assert.equal(style(output).height, undefined, 'metadata grows with the user font preference')
  assert.equal(style(output).gap, 10)
  const sourceText = children(source)[1]
  assert.ok(sourceText.props.children.endsWith(listName))
  assert.equal(style(sourceText).flexShrink, 1)
  assert.equal(style(sourceText).minWidth, 0)
  const [title, quality] = children(titleRow)
  assert.equal(title.props.children, song.name)
  assert.equal(title.props.size, 44)
  assert.equal(title.props.lineHeight, 1.3)
  assert.equal(style(title).letterSpacing, -0.8)
  assert.equal(style(title).flexShrink, 1)
  assert.equal(style(titleRow).alignItems, 'center')
  assert.equal(style(quality).flexShrink, 0)
  assert.equal(style(quality).marginTop, undefined)
  assert.equal(children(quality)[0].props.children, 'quality_lossless')
  assert.equal(artist.props.size, 22)
  assert.equal(artist.props.lineHeight, 1.4)
  for (const text of [sourceText, title, artist]) {
    assert.equal(text.props.numberOfLines, 1)
    assert.equal(text.props.ellipsizeMode, 'tail')
  }
})

test('compact metadata preserves local-source and empty-player fallbacks', () => {
  const local = metadata({ name: 'Local song', singer: 'Artist', album: '' }, { source: 'local', meta: {} })
  const [source, title, artist] = children(local)
  assert.equal(children(source)[1].props.children, 'car_local_source')
  assert.equal(children(title).length, 1)
  assert.equal(artist.props.children, 'Artist')
  const empty = metadata({ name: '', singer: '', album: '' }, null)
  assert.equal(children(children(empty)[0])[1].props.children, '')
  assert.equal(children(children(empty)[1]).length, 1)
})

test('compact secondary row reserves action space and retains favorite, comment and add-to-list callbacks', () => {
  for (const loved of [false, true]) {
    const calls = []
    const track = { source: 'kw', meta: {} }
    let added
    const Secondary = load('src/screens/PlayDetail/Horizontal/Secondary.tsx', {
      '@/store/theme/hook': { useTheme: () => palettes.dark },
      '@/store/setting/hook': { useSettingValue: () => 'alias' },
      '@/store/player/hook': { useStatusText: () => 'Long playback status '.repeat(20) },
      '@/lang': { useI18n: () => key => key },
      '@/components/car': { CarText: 'CarText', CarIcon: 'CarIcon', IconButton: 'IconButton', useCurrentMusicLoved: () => loved },
      '@/core/player/player': { collectMusic: () => calls.push('collect'), uncollectMusic: () => calls.push('uncollect') },
      '@/navigation': { navigations: { pushCommentScreen: id => calls.push(id) } },
      '@/store/common/state': { componentIds: { playDetail: 'player' } },
      '@/store/player/state': { playMusicInfo: { musicInfo: track, listId: 'playlist' } },
      '@/components/MusicAddModal': 'MusicAddModal',
    })
    const output = render(Secondary)
    const [status, actions, modal] = children(output)
    assert.equal(style(status).flexShrink, 1)
    assert.equal(style(status).minWidth, 0)
    assert.equal(children(status)[1].props.ellipsizeMode, 'tail')
    assert.equal(style(actions).flexShrink, 0)
    assert.equal(style(actions).gap, 28)
    const buttons = children(actions)
    assert.deepEqual(buttons.map(button => button.props.size), [28, 26, 26])
    modal.ref.current = { show: value => { added = value } }
    buttons.forEach(button => button.props.onPress())
    assert.deepEqual(calls, [loved ? 'uncollect' : 'collect', 'player'])
    assert.equal(added.musicInfo, track)
    assert.equal(added.listId, 'playlist')
    assert.equal(added.isMove, false)
  }
})

function lyrics(mode = 'dark', fontSize = 220, scale = 1) {
  const Lyric = load('src/screens/PlayDetail/Horizontal/Lyric.tsx', {
    '@/plugins/lyric': { useLrcSet: () => [], useLrcPlay: () => ({ line: 3 }) },
    '@/store/theme/hook': { useTheme: () => palettes[mode] },
    '@/store/setting/hook': {
      useSettingValue: key => ({
        'playDetail.horizontal.style.lrcFontSize': fontSize,
        'playDetail.style.align': 'right',
        'playDetail.isShowLyricProgressSetting': false,
      })[key],
    },
    '@/utils/pixelRatio': { px: size => size * scale, sp: size => size * scale },
    '@/components/common/Text': { AnimatedColorText: 'AnimatedColorText' },
    '@/theme/fonts': { getFontStyle: weight => ({ fontWeight: weight }) },
    '@/store/player/state': {},
    '@/utils/scroll': { scrollTo: noop },
    '../components/PlayLine': 'PlayLine',
  })
  return find(render(Lyric), node => node.type == 'FlatList')
}

test('lyric brightness, weight and size follow the six-line design in both themes', () => {
  for (const mode of ['dark', 'light']) {
    const list = lyrics(mode)
    for (const [index, opacity, size, weight] of [[0, 0.48, 36, '400'], [1, 0.48, 36, '400'], [2, 0.65, 36, '400'], [3, 1, 64, '700'], [4, 0.75, 40, '500'], [5, 0.58, 36, '400'], [6, 0.46, 36, '400']]) {
      const item = list.props.renderItem({ item: { text: '歌词', extendedLyrics: ['Translation'] }, index })
      const output = render(item.type, item.props)
      const [text, translation] = children(output)
      assert.equal(text.props.color, palettes[mode]['text-1'])
      assert.equal(text.props.opacity, opacity)
      assert.equal(style(text).fontSize, size)
      assert.equal(style(text).lineHeight, size * 1.35)
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
  assert.equal(style(text).fontSize, 48)
  assert.equal(style(text).lineHeight, 48 * 1.35)
})
