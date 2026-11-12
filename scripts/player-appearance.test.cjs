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
  TouchableOpacity: 'TouchableOpacity',
  Modal: 'Modal',
  Pressable: 'Pressable',
  StyleSheet: { absoluteFillObject: fill, create: value => value },
}
function load(file, mocks = {}, globals = {}, runtime = {}) {
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
    global: globals,
    exports: module.exports,
    ...runtime,
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

function player(scale = 1, interactive = false) {
  const Player = load('src/screens/PlayDetail/Horizontal/index.tsx', {
    '@/utils/nativeModules/utils': {},
    '@/core/common': {},
    '@/config/constant': {},
    '@/components/PageContent': 'PageContent',
    '@/store/common/state': {},
    '@/navigation': {},
    '@/utils/pixelRatio': { px: size => size * scale },
    '@/components/car': { AmbientBackground: 'AmbientBackground', CarShell: 'CarShell' },
    ...Object.fromEntries(['TopBar', 'Cover', 'Meta', 'ProgressRow', 'Transport', 'Secondary', 'Lyric', 'LyricHeader', 'Queue'].map(name => [`./${name}`, name])),
  })
  const renderer = new ShallowRenderer()
  renderer.render(React.createElement(Player.type ?? Player, { componentId: 'player' }))
  return interactive ? renderer : find(renderer.getRenderOutput(), node => node.type == 'CarShell')
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

test('SEv9u and AHpf9 match the revised Pen geometry at every car scale', () => {
  const design = JSON.parse(readFileSync(path.join(root, 'design/lx-music-car-claude.pen'), 'utf8'))
  for (const pageId of ['SEv9u', 'AHpf9']) {
    const page = design.children.find(node => node.id == pageId)
    const main = page.children.at(-1)
    const [rowDesign, bottomDesign] = main.children
    const [stackDesign, lyricDesign] = rowDesign.children
    const lyricBody = lyricDesign.children[1]
    const lyricHeight = lyricDesign.children[0].height + lyricDesign.gap + lyricBody.children.reduce((height, line) => height + line.fontSize * line.lineHeight, 0) + lyricBody.gap * (lyricBody.children.length - 1)
    for (const scale of [0.5, 2 / 3, 1, 1.5]) {
      const output = player(scale)
      const content = children(output)[0]
      assert.equal(style(content).paddingTop, main.padding[0] * scale)
      assert.equal(style(content).paddingHorizontal, main.padding[1] * scale)
      assert.equal(style(content).paddingBottom, main.padding[2] * scale)
      assert.equal(style(content).gap, main.gap * scale)
      const [row, bottom] = children(content)
      const [stack, lyric] = children(row)
      assert.equal(style(row).gap, rowDesign.gap * scale)
      assert.equal(style(row).alignItems, 'center')
      assert.equal(style(stack).width, stackDesign.width * scale)
      assert.equal(style(stack).gap, stackDesign.gap * scale)
      assert.deepEqual(children(stack).map(node => node.type), ['Cover', 'Meta'])
      assert.equal(children(stack)[1].props.componentId, 'player')
      assert.equal(children(stack)[0].props.componentId, 'player')
      assert.equal(style(lyric).flex, 1)
      assert.equal(style(lyric).minWidth, 0)
      assert.ok(Math.abs(style(lyric).height - lyricHeight * scale) < 0.001)
      assert.equal(style(lyric).gap, lyricDesign.gap * scale)
      assert.equal(children(lyric)[0].type, 'LyricHeader')
      assert.ok(find(lyric, node => node.type == 'Lyric'))
      assert.equal(find(output, node => node.type == 'TopBar'), undefined, 'no extra toolbar in the revised design')
      assert.equal(style(bottom).gap, bottomDesign.gap * scale)
      assert.equal(children(bottom)[0].type, 'ProgressRow')
      const actions = children(bottom)[1]
      assert.equal(style(actions).height, bottomDesign.children[1].height * scale)
      assert.equal(style(actions).gap, bottomDesign.children[1].gap * scale)
      assert.equal(style(children(actions)[0]).flex, 1, 'empty output area balances the right actions')
      assert.deepEqual(children(actions).slice(1).map(node => node.type), ['Transport', 'Secondary'])
    }
  }
})

test('full-screen lyrics, lyric visibility and queue controls work without changing playback', () => {
  const renderer = player(1, true)
  const get = type => find(renderer.getRenderOutput(), node => node.type == type)
  get('LyricHeader').props.onFullscreen()
  assert.equal(get('Cover'), undefined)
  assert.ok(get('TopBar'))
  assert.ok(get('Lyric'))
  assert.ok(get('Transport'))
  get('TopBar').props.onBack()
  assert.ok(get('Cover'))
  assert.ok(get('LyricHeader'))
  get('Secondary').props.onToggleLyrics()
  assert.equal(get('Lyric'), undefined)
  assert.equal(get('Secondary').props.lyricsVisible, false)
  get('Secondary').props.onToggleLyrics()
  assert.ok(get('Lyric'))
  get('Secondary').props.onQueue()
  assert.ok(get('Queue'))
  get('Queue').props.onClose()
  assert.equal(get('Queue'), undefined)
})

test('464px artwork keeps its rounded clipping, external shadow and shared-element image anchor', () => {
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
    assert.equal(style(cover).width, 464 * scale)
    assert.equal(style(cover).height, 464 * scale)
    assert.equal(style(cover).borderRadius, 20 * scale)
    assert.equal(style(cover).overflow, undefined, 'the artwork shadow must not be clipped')
    assert.equal(style(cover).shadowColor, '#0009')
    assert.equal(style(cover).shadowRadius, 64 * scale)
    assert.equal(style(cover).shadowOffset.height, 24 * scale)
    const clip = children(cover)[0]
    assert.equal(style(clip).overflow, 'hidden')
    assert.equal(style(clip).borderRadius, 20 * scale)
    const image = children(clip)[0]
    assert.equal(image.type, 'Image')
    assert.equal(image.props.url, 'current-cover')
    assert.equal(image.props.nativeID, 'cover-anchor')
  }
})

function metadata(musicInfo, track, listName = '', options = {}) {
  const lists = options.lists ?? (listName ? [{ id: 'playlist', name: listName }] : [])
  const playMusicInfo = { musicInfo: track, listId: options.listId ?? 'playlist' }
  const calls = options.calls ?? []
  const Meta = load('src/screens/PlayDetail/Horizontal/Meta.tsx', {
    '@/store/theme/hook': { useTheme: () => palettes.dark },
    '@/store/player/hook': { usePlayerMusicInfo: () => musicInfo, usePlayMusicInfo: () => playMusicInfo },
    '@/store/list/hook': { useMyList: () => lists },
    '@/store/setting/hook': { useSettingValue: () => 'alias' },
    '@/lang': { useI18n: () => key => key },
    '@/components/car': { CarText: 'CarText' },
    '@/store/list/state': { tempListMeta: options.tempListMeta ?? { id: '' } },
    '@/config/constant': { LIST_IDS: { TEMP: 'temp' } },
    '@/core/list': { setActiveList: id => calls.push(['list', id]) },
    '@/core/common': { setNavActiveId: id => calls.push(['tab', id]) },
    '@/navigation': {
      popToRoot: id => calls.push(['root', id]),
      navigations: { pushSonglistDetailScreen: (id, info) => calls.push(['detail', id, info]) },
    },
  })
  return render(Meta, { componentId: 'player-screen' })
}

test('464px metadata uses the Pen typography and truncates long titles without squeezing quality', () => {
  const song = { name: 'Long title '.repeat(30), singer: 'Long artist '.repeat(20), album: 'Long album '.repeat(20) }
  const listName = 'Long playlist '.repeat(30)
  const output = metadata(song, { source: 'kw', meta: { _qualitys: { flac: true } } }, listName)
  const [source, titleRow, artist] = children(output)
  assert.equal(style(output).height, undefined, 'metadata grows with the user font preference')
  assert.equal(style(output).gap, 12)
  const sourceText = children(source)[1]
  assert.ok(sourceText.props.children.endsWith(listName))
  assert.equal(style(sourceText).flex, 1)
  assert.equal(style(sourceText).minWidth, 0)
  const [title, quality] = children(titleRow)
  assert.equal(title.props.children, song.name)
  assert.equal(title.props.size, 52)
  assert.equal(title.props.lineHeight, 1.25)
  assert.equal(style(title).letterSpacing, -0.8)
  assert.equal(style(title).flexShrink, 1)
  assert.equal(style(titleRow).alignItems, 'center')
  assert.equal(style(quality).flexShrink, 0)
  assert.equal(style(quality).marginTop, undefined)
  assert.equal(children(quality)[0].props.children, 'car_quality_lossless')
  assert.equal(artist.props.size, 26)
  assert.equal(artist.props.lineHeight, 1.4)
  assert.equal(sourceText.props.numberOfLines, 2)
  assert.equal(sourceText.props.size, 20)
  assert.equal(children(quality)[0].props.size, 18)
  for (const text of [title, artist]) {
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

test('PpGhw opens the exact local playlist in My Music without changing playback', () => {
  for (const id of ['default', 'love', 'custom-list']) {
    const calls = []
    const source = children(metadata({ name: 'Song' }, { source: 'kw', meta: {} }, '', {
      lists: [{ id, name: 'Source playlist' }], listId: id, calls,
    }))[0]
    assert.equal(source.type, 'TouchableOpacity')
    assert.equal(source.props.disabled, false)
    assert.equal(source.props.accessibilityRole, 'button')
    assert.equal(children(source)[1].props.children, 'car_from_list · Source playlist')
    source.props.onPress()
    assert.deepEqual(calls, [['list', id], ['tab', 'nav_love'], ['root', 'player-screen']])
  }
})

test('PpGhw opens the online playlist snapshot from the playback queue', () => {
  const calls = []
  const info = { id: 'online-source', source: 'wy', name: 'Online playlist', author: 'Author', img: 'cover' }
  const source = children(metadata({ name: 'Song' }, { source: 'wy', meta: {} }, '', {
    listId: 'temp', tempListMeta: { id: 'wy__online-source', songlistInfo: info }, calls,
  }))[0]
  assert.equal(source.props.disabled, false)
  assert.equal(children(source)[1].props.children, 'car_from_list · Online playlist')
  source.props.onPress()
  assert.deepEqual(calls, [['detail', 'player-screen', info]])
})

test('PpGhw is inert for missing/deleted lists, non-songlist queues, and an empty player', () => {
  for (const [track, options] of [
    [{ source: 'kw', meta: {} }, { listId: 'deleted-list' }],
    [{ source: 'local', meta: {} }, { listId: 'download' }],
    [{ source: 'kw', meta: {} }, { listId: 'temp', tempListMeta: { id: 'board__kw__16' } }],
    [null, { listId: 'playlist', lists: [{ id: 'playlist', name: 'Old playlist' }] }],
  ]) {
    const calls = []
    const source = children(metadata({ name: '' }, track, '', { ...options, calls }))[0]
    assert.equal(source.props.disabled, true)
    assert.equal(source.props.accessibilityRole, undefined)
    source.props.onPress()
    assert.deepEqual(calls, [])
  }
})

test('secondary actions match Pen and preserve favorite, comments and add-to-list behavior', () => {
  for (const loved of [false, true]) {
    const calls = []
    const track = { source: 'kw', meta: {} }
    let added
    const Secondary = load('src/screens/PlayDetail/Horizontal/Secondary.tsx', {
      '@/store/theme/hook': { useTheme: () => palettes.dark },
      '@/lang': { useI18n: () => key => key },
      '@/components/car': { useCurrentMusicLoved: () => loved },
      './ActionButton': 'ActionButton',
      '@/core/player/player': { collectMusic: () => calls.push('collect'), uncollectMusic: () => calls.push('uncollect') },
      '@/navigation': { navigations: { pushCommentScreen: id => calls.push(id) } },
      '@/store/common/state': { componentIds: { playDetail: 'player' } },
      '@/store/player/state': { playMusicInfo: { musicInfo: track, listId: 'playlist' } },
      '@/components/MusicAddModal': 'MusicAddModal',
    })
    const output = render(Secondary, { lyricsVisible: true, onToggleLyrics: () => calls.push('lyrics'), onQueue: () => calls.push('queue') })
    assert.equal(style(output).flex, 1)
    assert.equal(style(output).gap, 20)
    assert.equal(style(output).justifyContent, 'flex-end')
    const [favorite, lyric, queue, modal] = children(output)
    assert.equal(favorite.props.label, loved ? 'car_collected' : 'collect')
    assert.equal(lyric.props.active, true)
    assert.equal(queue.props.icon, 'ph-queue')
    modal.ref.current = { show: value => { added = value } }
    for (const button of [favorite, lyric, queue]) button.props.onPress()
    favorite.props.onLongPress()
    lyric.props.onLongPress()
    assert.deepEqual(calls, [loved ? 'uncollect' : 'collect', 'lyrics', 'queue', 'player'])
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
    for (const [index, opacity, size, weight] of [[0, 1, 40, '400'], [1, 1, 40, '400'], [2, 1, 44, '500'], [3, 1, 72, '700'], [4, 0.82, 48, '500'], [5, 1, 40, '400'], [6, 1, 40, '400']]) {
      const item = list.props.renderItem({ item: { text: '歌词', extendedLyrics: ['Translation'] }, index })
      const output = render(item.type, item.props)
      const [text, translation] = children(output)
      assert.equal(text.props.color, palettes[mode][index == 3 ? 'accent' : index == 4 ? 'text-1' : 'text-2'])
      assert.equal(text.props.opacity, opacity)
      assert.equal(style(text).fontSize, size)
      assert.equal(style(text).lineHeight, size * (index == 3 ? 1.3 : 1.4))
      assert.equal(style(text).fontWeight, weight)
      assert.equal(style(text).textAlign, 'right', 'preserve user alignment')
      assert.equal(translation.props.opacity, opacity)
      assert.equal(translation.props.color, palettes[mode]['text-2'])
    }
  }
})

test('lyric jumps wait for new line heights and share the sequential-scroll center anchor', () => {
  let activeLine = 2
  let cursor = 0
  let effects = []
  const refs = []
  const timers = new Map()
  const scrolls = []
  const indexCalls = []
  const data = Array.from({ length: 8 }, (_, index) => ({ text: String(index), extendedLyrics: [] }))
  const Lyric = load('src/screens/PlayDetail/Horizontal/Lyric.tsx', {
    react: {
      ...React,
      useRef: initial => refs[cursor++] ?? (refs[cursor - 1] = { current: initial }),
      useEffect: effect => effects.push(effect),
      useCallback: callback => callback,
      useMemo: factory => factory(),
    },
    '@/plugins/lyric': { useLrcSet: () => data, useLrcPlay: () => ({ line: activeLine }) },
    '@/store/theme/hook': { useTheme: () => palettes.dark },
    '@/store/setting/hook': { useSettingValue: () => false },
    '@/components/common/Text': { AnimatedColorText: 'AnimatedColorText' },
    '@/theme/fonts': { getFontStyle: noop },
    '@/store/player/state': {},
    '@/utils/scroll': { scrollTo: (list, info, offset) => { scrolls.push(offset); return noop } },
    '../components/PlayLine': 'PlayLine',
  }, {}, {
    requestAnimationFrame: callback => callback(),
    setTimeout: (callback, delay) => { timers.set(callback, delay); return callback },
    clearTimeout: callback => timers.delete(callback),
  })
  const draw = () => { cursor = 0; effects = []; return find(Lyric(), node => node.type == 'FlatList') }
  const flush = () => { const callbacks = [...timers.keys()]; timers.clear(); callbacks.forEach(callback => callback()) }
  let list = draw()
  list.ref.current = { scrollToOffset: noop, scrollToIndex: args => indexCalls.push(args) }
  list.props.onLayout({ nativeEvent: { layout: { height: 550.4 } } })
  effects.forEach(effect => effect())
  flush()
  assert.equal(indexCalls.at(-1).index, 2)
  assert.equal(indexCalls.at(-1).viewPosition, 0.5)
  assert.ok(Math.abs(indexCalls.at(-1).viewOffset - (228.4 - 550.4 / 2)) < 0.001)

  activeLine = 3
  list = draw()
  effects[2]()
  assert.deepEqual([...timers.values()], [600])
  list.props.ListHeaderComponent.props.onLayout({ nativeEvent: { layout: { height: 1000 } } })
  for (const [index, height] of [88, 88, 93.6, 125.6].entries()) {
    list.props.renderItem({ item: data[index], index }).props.onLayout(index, height, 500)
  }
  list.props.onScroll({ nativeEvent: { layoutMeasurement: { height: 550.4 } } })
  flush()
  assert.ok(Math.abs(scrolls.at(-1) - (1000 + 88 + 88 + 93.6 + 125.6 / 2 - 228.4)) < 0.001)

  activeLine = 6
  list = draw()
  effects[2]()
  assert.deepEqual([...timers.values()], [100], 'jump waits for native typography relayout instead of using stale metrics')
  assert.equal(indexCalls.length, 1)
  flush()
  assert.equal(indexCalls.at(-1).index, 6)
  list.props.onLayout({ nativeEvent: { layout: { height: 800 } } })
  flush()
  assert.ok(Math.abs(indexCalls.at(-1).viewOffset - 800 * (228.4 / 550.4 - 0.5)) < 0.001, 'fullscreen/resize realigns to the same anchor')
})

test('neighboring lyric lines rerender when the active index changes, not only when highlighted', () => {
  const list = lyrics()
  const line = list.props.renderItem({ item: { text: '歌词', extendedLyrics: [] }, index: 1 })
  assert.equal(line.type.compare(line.props, { ...line.props }), true)
  assert.equal(line.type.compare(line.props, { ...line.props, activeLine: 4 }), false)
  assert.equal(line.type.compare(line.props, { ...line.props, lineNum: 2 }), false)
  assert.equal(line.type.compare(line.props, { ...line.props, onLayout: noop }), false)
})

test('lyrics do not add a fade absent from the Pen, while font preference still scales text', () => {
  const list = lyrics('dark', 330, 0.5)
  assert.equal(list.props.fadingEdgeLength, 0)
  const line = list.props.renderItem({ item: { text: '歌词', extendedLyrics: [] }, index: 3 })
  const text = children(render(line.type, line.props))[0]
  assert.equal(style(text).fontSize, 54)
  assert.equal(style(text).lineHeight, 54 * 1.3)
})

test('transport matches the Pen hit targets and preserves every playback mode', () => {
  const modes = ['listLoop', 'random', 'list', 'singleLoop', 'none']
  for (const mode of modes) for (const appearance of ['dark', 'light']) {
    const calls = []
    const changes = []
    const theme = { ...palettes[appearance], glass: '#fff1', 'on-primary': '#08080A' }
    const Transport = load('src/screens/PlayDetail/Horizontal/Transport.tsx', {
      '@/store/setting/hook': { useSettingValue: () => mode },
      '@/store/theme/hook': { useTheme: () => theme },
      '@/store/player/hook': { useIsPlay: () => true },
      '@/core/common': { updateSetting: value => changes.push(value['player.togglePlayMethod']) },
      '@/config/constant': { MUSIC_TOGGLE_MODE: Object.fromEntries(modes.map(value => [value, value])), MUSIC_TOGGLE_MODE_LIST: modes },
      '@/core/player/player': { playPrev: () => calls.push('prev'), playNext: () => calls.push('next'), togglePlay: () => calls.push('play') },
      '@/components/car': { IconButton: 'IconButton' },
      '@/lang': { useI18n: () => key => key },
      '@/utils/tools': { toast: noop },
      './ActionButton': 'ActionButton',
    })
    const output = render(Transport)
    const [shuffle, previous, play, next, repeat] = children(output)
    assert.equal(style(output).width, 576)
    assert.equal(style(output).gap, 24)
    assert.deepEqual([previous, play, next].map(node => node.props.size), [88, 112, 88])
    assert.deepEqual([previous, play, next].map(node => node.props.iconSize), [44, 48, 44])
    assert.equal(play.props.icon, 'ph-pause-fill')
    assert.equal(previous.props.background, theme.glass)
    assert.equal(shuffle.props.labelSize, 20)
    assert.equal(repeat.props.labelSize, 20)
    const looping = ['listLoop', 'singleLoop'].includes(mode)
    assert.equal(repeat.props.color, looping ? theme.accent : theme['text-2'])
    if (looping) assert.equal(repeat.props.labelColor, appearance == 'dark' ? theme.accent : '#A93616')
    for (const button of [shuffle, previous, play, next, repeat]) button.props.onPress()
    assert.deepEqual(calls, ['prev', 'play', 'next'])
    assert.deepEqual(changes, [mode == 'random' ? 'listLoop' : 'random', modes[(modes.indexOf(mode) + 1) % modes.length]])
  }
})

test('labeled actions and fullscreen entry use exact Pen dimensions and colors', () => {
  const theme = { ...palettes.dark, 'accent-soft': '#FF7A5024', glass: '#FFFFFF0F' }
  const mocks = { '@/store/theme/hook': { useTheme: () => theme }, '@/components/car': { CarText: 'CarText' }, './PlayerIcon': 'PlayerIcon' }
  const Action = load('src/screens/PlayDetail/Horizontal/ActionButton.tsx', mocks)
  const button = render(Action, { icon: 'ph-heart', label: '收藏', active: true, selected: true, onPress: noop })
  assert.equal(style(button).width, 96)
  assert.equal(style(button).height, 88)
  assert.equal(style(button).borderRadius, 20)
  assert.equal(style(button).gap, 6)
  assert.equal(style(button).backgroundColor, theme['accent-soft'])
  assert.equal(children(button)[0].props.size, 32)
  assert.equal(children(button)[1].props.size, 22)
  assert.equal(button.props.accessibilityState.selected, true)
  const Header = load('src/screens/PlayDetail/Horizontal/LyricHeader.tsx', { ...mocks, '@/lang': { useI18n: () => key => key } })
  let opened = false
  const header = render(Header, { onFullscreen: () => { opened = true } })
  assert.equal(style(header).height, 64)
  const [title, fullscreen] = children(header)
  assert.equal(title.props.size, 24)
  assert.equal(style(fullscreen).height, 64)
  assert.equal(style(fullscreen).borderRadius, 20)
  assert.equal(children(fullscreen)[0].props.size, 28)
  fullscreen.props.onPress()
  assert.equal(opened, true)
})

test('full-width progress has a 72px touch target, accent track, thumb and elapsed/remaining times', () => {
  const Progress = load('src/screens/PlayDetail/Horizontal/ProgressRow.tsx', {
    '@/store/player/hook': { useProgress: () => ({ progress: 0.4, maxPlayTime: 200, nowPlayTimeStr: '01:20' }) },
    '@/plugins/player': { useBufferProgress: () => 0.6 },
    '@/store/theme/hook': { useTheme: () => palettes.dark },
    '@/components/car': { CarText: 'CarText', SeekBar: 'SeekBar' },
    '@/utils/common': { formatPlayTime2: value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` },
  })
  const output = render(Progress)
  assert.equal(style(output).height, 72)
  const seek = find(output, node => node.type == 'SeekBar')
  assert.equal(seek.props.barHeight, 8)
  assert.equal(seek.props.touchHeight, 72)
  assert.equal(seek.props.thumbSize, 22)
  assert.equal(seek.props.color, palettes.dark.accent)
  assert.equal(seek.props.buffered, 0.6)
  const times = children(children(output).at(-1))
  assert.deepEqual(times.map(node => node.props.children), ['1:20', '-2:00'])
  assert.ok(times.every(node => node.props.size == 22 && node.props.num && node.props.color == palettes.dark['text-2']))
})

test('optional seek thumb clamps inside the track without changing seek coordinates or mini player defaults', () => {
  const positions = []
  const Seek = load('src/components/car/SeekBar.tsx', {
    'react-native': { ...native, PanResponder: { create: handlers => ({ panHandlers: handlers }) } },
    '@/utils/hooks': { useDrag: onSet => ({ onLayout: noop, onDragStart: (dx, x) => onSet(x / 100), onDragEnd: noop, onDrag: noop }) },
    '@/store/theme/hook': { useTheme: () => palettes.dark },
  }, { app_event: { setProgress: value => positions.push(value) } })
  for (const [progress, left] of [[-1, '0%'], [0.5, '50%'], [2, '100%'], [NaN, '0%']]) {
    const output = render(Seek, { progress, duration: 200, thumbSize: 22, touchHeight: 72, barHeight: 8 })
    const thumbTrack = children(output)[1]
    positions.push(style(children(thumbTrack)[0]).left)
    assert.equal(style(thumbTrack).right, 22)
    assert.equal(style(children(thumbTrack)[0]).left, left)
    assert.equal(style(children(thumbTrack)[0]).width, 22)
  }
  const basic = render(Seek, { progress: 0.5, duration: 200 })
  assert.equal(children(basic).length, 1, 'mini-player must not gain a thumb')
  basic.props.onPanResponderGrant({ nativeEvent: { locationX: 25 } }, { dx: 0 })
  assert.equal(positions.at(-1), 50, 'seeking still uses the full track width and current duration')
})

test('queue shows real current and play-later tracks, allows selection and can close', () => {
  const current = { id: 'song-1', name: 'Song one', singer: 'Artist', meta: {} }
  const next = { id: 'song-2', name: 'Song two', singer: 'Artist', meta: {} }
  const calls = []
  const Queue = load('src/screens/PlayDetail/Horizontal/Queue.tsx', {
    '@/components/car': { CarText: 'CarText', IconButton: 'IconButton', TrackRow: 'TrackRow' },
    '@/store/theme/hook': { useTheme: () => palettes.dark },
    '@/lang': { useI18n: () => key => key },
    '@/store/player/hook': { usePlayInfo: () => ({ playerListId: 'playlist' }), usePlayMusicInfo: () => ({ musicInfo: current }) },
    '@/store/player/state': { tempPlayList: [{ listId: 'later', musicInfo: next }] },
    '@/core/player/playInfo': { getList: () => [current, next] },
    '@/core/player/player': { playListById: (list, id) => calls.push([list, id]), playNext: () => calls.push('next') },
    '@/core/player/tempPlayList': { removeTempPlayList: index => calls.push(index), addTempPlayList: items => calls.push(items[0].isTop) },
  })
  const output = render(Queue, { onClose: () => calls.push('close') })
  const list = find(output, node => node.type == 'FlatList')
  assert.equal(list.props.data.length, 3)
  assert.equal(list.props.data[0].tempIndex, 0)
  const currentRow = list.props.renderItem({ item: list.props.data[1], index: 1 })
  assert.equal(currentRow.props.playing, true)
  assert.equal(currentRow.props.title, 'Song one')
  currentRow.props.onPress()
  list.props.renderItem({ item: list.props.data[0], index: 0 }).props.onPress()
  output.props.onRequestClose()
  assert.deepEqual(calls, [['playlist', 'song-1'], 0, true, 'next', 'close'])
})
