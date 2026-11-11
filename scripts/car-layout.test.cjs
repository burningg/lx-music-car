/* Layout-contract tests: run with node --test scripts/car-layout.test.cjs.
 * Shallow renders verify source dimensions/callbacks, not native text or Yoga layout.
 * No Android device, generated data, network access or new dependencies required.
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
const theme = { 'text-1': '#fff', 'text-2': '#aaa', 'text-3': '#777', accent: '#f75' }
const native = Object.fromEntries(['View', 'TouchableOpacity', 'Pressable', 'Modal', 'ScrollView', 'FlatList', 'RefreshControl'].map(name => [name, name]))
const identityScale = { px: size => size, sp: size => size }
const defaults = {
  'react-native': native,
  '@/utils/pixelRatio': identityScale,
  '@/utils/hooks/useWindowSize': () => ({ width: 1920, height: 1080 }),
  '@/store/theme/hook': { useTheme: () => theme },
  '@/lang': { useI18n: () => key => key },
  '@/components/common/Image': 'Image',
  './CarIcon': 'CarIcon',
  './CarText': 'CarText',
  './IconButton': 'IconButton',
  './useTrackCover': { default: item => item.meta.picUrl, __esModule: true },
}

function load(file, mocks = {}, globals = {}) {
  const filename = path.join(root, file)
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  })
  const module = { exports: {} }
  const dependencies = { ...defaults, ...mocks }
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require(id) {
      if (Object.hasOwn(dependencies, id)) return dependencies[id]
      if (id == 'react' || id == 'react/jsx-runtime') return require(id)
      throw new Error(`Unmocked dependency ${id} in ${file}`)
    },
    global: globals,
  }, { filename })
  return module.exports
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
function flatStyle(node) { return Object.assign({}, ...[node.props.style].flat()) }
function scaler(width, height, density = 1, fontScale = 1, userFontSize = 1) {
  let size = { width: width / density, height: height / density }
  let invalidate = noop
  const tools = { getSize: () => size, onSizeChanged: fn => { invalidate = fn } }
  const ratio = {
    get: () => density,
    getFontScale: () => fontScale,
    getPixelSizeForLayoutSize: value => value * density,
    roundToNearestPixel: value => Math.round(value * density) / density,
  }
  const api = load('src/utils/pixelRatio.ts', {
    'react-native': { PixelRatio: ratio },
    './windowSizeTools': { windowSizeTools: tools },
  }, { lx: { fontSize: userFontSize } })
  return { ...api, resize(w, h) { size = { width: w / density, height: h / density }; invalidate() } }
}

test('1920×1080 uses 1:1 design dimensions; density does not enlarge buttons', () => {
  for (const density of [1, 1.5, 2, 3]) {
    const { px } = scaler(1920, 1080, density)
    for (const size of [6, 14, 26, 56, 60, 64, 92, 104, 303, 512, 552, 766, 1100]) {
      assert.equal(px(size) * density, size)
    }
  }
})

test('1080-height baseline, rotation and resize use the same fit scale', () => {
  const api = scaler(1920, 720)
  assert.equal(api.px(60), 40)
  api.resize(1080, 1920)
  assert.equal(api.px(60), 60)
  api.resize(1280, 720)
  assert.equal(api.px(60), 40)
})

test('font preferences scale text but never button geometry', () => {
  const api = scaler(1920, 1080, 2, 1.2, 1.3)
  assert.equal(api.px(64), 32)
  assert.equal(api.sp(24), 13)
})

// ShallowRenderer omits effects. Run this hook's mount effect explicitly, retaining
// React's real useState so a window notification must update the component
// without renderer.render(), changed props, a clock tick or a simulated click.
function responsiveComponent(file, props, mocks = {}) {
  const scale = scaler(960, 540)
  let size = { width: 960, height: 540 }
  const listeners = new Set()
  let mountEffect
  const useWindowSize = load('src/utils/hooks/useWindowSize.ts', {
    react: { ...React, useEffect: effect => { mountEffect ??= effect } },
    '@/utils/windowSizeTools': { windowSizeTools: {
      getSize: () => size,
      onSizeChanged: listener => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    } },
  }).default
  const Component = load(file, {
    ...mocks,
    '@/utils/pixelRatio': scale,
    '@/utils/hooks/useWindowSize': useWindowSize,
  }).default
  const renderer = new ShallowRenderer()
  // This renderer incorrectly applies memo's prop bailout to local state updates.
  // Unwrap memo here; React Native bypasses that bailout for hook state updates.
  renderer.render(React.createElement(Component.type ?? Component, props))
  return {
    output: () => renderer.getRenderOutput(),
    mount: () => mountEffect(),
    listeners,
    resize(width, height) {
      size = { width, height }
      scale.resize(width, height)
      for (const listener of listeners) listener(size)
    },
  }
}

const railMocks = {
  '@/navigation': { navigations: { pushPlayDetailScreen: noop }, popToRoot: noop },
  '@/store/common/hook': { useNavActiveId: () => 'nav_search' },
  '@/store/setting/hook': { useSettingValue: () => true },
  '@/store/common/state': { componentIds: { home: 'home' } },
  '@/store/player/state': { musicInfo: { id: 'track' } },
  '@/core/common': { exitApp: noop, setNavActiveId: noop },
  '@/utils/tools': { confirmDialog: noop, exitApp: noop },
  './hooks': { useClock: () => '09:43' },
}

test('memoized car controls rescale on window changes without clicking or changing props', () => {
  const cases = [
    {
      file: 'CarIcon', props: { name: 'lucide-search', size: 28, color: '#777' },
      mocks: { '@/components/common/Icon': { Icon: 'Icon' } },
      value: output => output.props.rawSize, designSize: 28,
    },
    {
      file: 'CarText', props: { size: 22, children: '09:43' },
      mocks: {
        'react-native': { Text: 'Text', StyleSheet: { compose: (a, b) => [a, b] } },
        '@/theme/fonts': { getFontStyle: () => ({}) },
      },
      value: output => flatStyle(output).fontSize, designSize: 22,
    },
    {
      file: 'IconButton', props: { icon: 'lucide-search', size: 64 },
      value: output => flatStyle(output).width, designSize: 64,
    },
    {
      file: 'SegmentTabs', props: { compact: true, items: [{ id: 'song', label: '歌曲' }], activeId: 'song', onChange: noop },
      value: output => output.props.style.padding, designSize: 5,
    },
    {
      file: 'NavRail', props: {}, mocks: railMocks,
      value: output => output.props.style.width, designSize: 112,
    },
    {
      file: 'NavRail',
      props: { size: 'large' },
      mocks: railMocks,
      value: output => output.props.style.width,
      designSize: 160,
    },
  ]
  for (const { file, props, mocks, value, designSize } of cases) {
    const component = responsiveComponent(`src/components/car/${file}.tsx`, props, mocks)
    assert.equal(value(component.output()), Math.round(designSize / 2), file)
    const unmount = component.mount()
    assert.equal(component.listeners.size, 1, `${file} subscribes to window changes`)
    component.resize(1920, 1080)
    assert.equal(value(component.output()), designSize, `${file} grows without interaction`)
    component.resize(960, 540)
    assert.equal(value(component.output()), Math.round(designSize / 2), `${file} shrinks without interaction`)
    unmount()
    assert.equal(component.listeners.size, 0, `${file} removes its listener`)
  }
})

test('first layout correction between render and subscription is not lost', () => {
  const icon = responsiveComponent('src/components/car/CarIcon.tsx', { name: 'lucide-heart', size: 28 }, {
    '@/components/common/Icon': { Icon: 'Icon' },
  })
  assert.equal(icon.output().props.rawSize, 14)
  icon.resize(1920, 1080)
  assert.equal(icon.output().props.rawSize, 14, 'no listener has mounted yet')
  const unmount = icon.mount()
  assert.equal(icon.output().props.rawSize, 28, 'subscription catches up before any click')
  unmount()
})

test('every rail icon and touch target keep the same size when selected', () => {
  const NavRail = load('src/components/car/NavRail.tsx', railMocks).default
  const rail = render(NavRail)
  const buttons = children(rail).slice(1).flatMap(children)
  assert.equal(buttons.length, 8, 'five tabs plus home, exit and settings')
  for (const button of buttons) {
    const idle = render(button.type, { ...button.props, active: false })
    const active = render(button.type, { ...button.props, active: true })
    assert.equal(idle.props.style.width, active.props.style.width)
    assert.equal(idle.props.style.height, active.props.style.height)
    assert.equal(children(idle)[0].props.size, children(active)[0].props.size)
    assert.equal(children(idle)[0].props.size, button.props.iconSize)
  }
})

test('oNiqn enlarges only the opted-in rail and preserves default navigation dimensions', () => {
  const design = JSON.parse(readFileSync(path.join(root, 'design/lx-music-car-claude.pen'), 'utf8'))
  const instance = design.children.find(node => node.id == 'SEv9u').children.find(node => node.id == 'oNiqn')
  const overrides = instance.descendants
  for (const [width, height, density] of [[1920, 1080, 1], [1280, 720, 1], [1920, 1080, 2]]) {
    const scale = scaler(width, height, density)
    const { default: NavRail, NAV_RAIL_WIDTH } = load('src/components/car/NavRail.tsx', { ...railMocks, '@/utils/pixelRatio': scale })
    assert.equal(NAV_RAIL_WIDTH, 112)
    for (const size of [undefined, 'large']) {
      const large = size == 'large'
      const rail = render(NavRail, { size, activeId: 'now' })
      const [clock, nav, bottom] = children(rail)
      assert.equal(flatStyle(rail).width, scale.px(large ? instance.width : 112))
      assert.equal(flatStyle(rail).paddingVertical, scale.px(40))
      assert.equal(clock.props.size, 22)
      assert.equal(flatStyle(nav).gap, scale.px(large ? overrides.q4bHg.gap : 14))
      assert.equal(flatStyle(nav).paddingHorizontal, scale.px(large ? overrides.q4bHg.padding[1] : 0))
      assert.equal(children(nav).length, 5)
      const ids = ['fuc4s', 'hswUy', 'I3Kqj', 'xZFVB', 'WVMvr']
      const iconIds = ['pRDAM', 'RfyDO', 'zWpoJ', 'nznH1', 'wcl2K']
      children(nav).forEach((button, index) => {
        const output = render(button.type, button.props)
        const geometry = large ? overrides[ids[index]] : { height: 64, cornerRadius: 20 }
        assert.equal(flatStyle(output).width, scale.px(geometry.height))
        assert.equal(flatStyle(output).height, scale.px(geometry.height))
        assert.equal(flatStyle(output).borderRadius, scale.px(geometry.cornerRadius))
        assert.equal(output.props.disabled, index == 0)
        const icon = children(output)[0]
        assert.equal(icon.props.size, large ? overrides[iconIds[index]].width : 28)
        assert.equal(icon.props.color, theme[index == 0 ? 'text-1' : large ? 'text-2' : 'text-3'])
      })
      const actions = children(bottom)
      assert.equal(actions.length, 3, 'optional home and exit remain available')
      for (const button of actions.slice(0, 2)) assert.equal(flatStyle(render(button.type, button.props)).height, scale.px(56))
      const settings = render(actions[2].type, actions[2].props)
      assert.equal(flatStyle(settings).width, scale.px(large ? overrides.UndJK.width : 56))
      assert.equal(flatStyle(settings).height, scale.px(large ? overrides.UndJK.height : 56))
      assert.equal(flatStyle(settings).borderRadius, scale.px(large ? overrides.UndJK.cornerRadius : 28))
      assert.equal(children(settings)[0].props.size, large ? overrides.ANp4O.width : 24)
      const navHeight = children(nav).reduce((sum, button) => sum + scale.px(button.props.size), 0) + flatStyle(nav).gap * 4
      const bottomHeight = actions.reduce((sum, button) => sum + scale.px(button.props.size), 0) + flatStyle(bottom).gap * 2
      assert.ok(navHeight + bottomHeight + scale.px(80 + 22 * 1.3) <= height / density, 'buttons and default clock fit with both optional actions enabled')
    }
  }
})

test('large rail preserves playback and home-tab navigation callbacks', () => {
  const calls = []
  const state = { musicInfo: { id: 'track' } }
  const NavRail = load('src/components/car/NavRail.tsx', {
    ...railMocks,
    '@/navigation': {
      navigations: { pushPlayDetailScreen: id => calls.push(['player', id]) },
      popToRoot: id => calls.push(['pop', id]),
    },
    '@/store/player/state': state,
    '@/core/common': { exitApp: noop, setNavActiveId: id => calls.push(['tab', id]) },
  }).default
  const rail = render(NavRail, { size: 'large', componentId: 'player', activeId: 'now' })
  const tabs = children(children(rail)[1])
  const ids = ['nav_songlist', 'nav_search', 'nav_top', 'nav_love']
  tabs.slice(1).forEach((button, index) => {
    button.props.onPress()
    assert.deepEqual(calls.splice(0), [['pop', 'player'], ['tab', ids[index]]])
  })
  children(children(rail)[2]).at(-1).props.onPress()
  assert.deepEqual(calls.splice(0), [['pop', 'player'], ['tab', 'nav_setting']])
  for (const componentId of [undefined, 'detail']) {
    const output = render(NavRail, { size: 'large', componentId })
    children(children(output)[1])[0].props.onPress()
    assert.deepEqual(calls.splice(0), [['player', componentId ?? 'home']])
  }
  state.musicInfo.id = ''
  tabs[0].props.onPress()
  assert.deepEqual(calls, [], 'an empty queue cannot open playback')
})

test('icon layout, rounded rectangle radius and expanded hit area are independent', () => {
  const { default: Button } = load('src/components/car/IconButton.tsx')
  const tool = render(Button, { icon: 'search', size: 56, radius: 18 })
  assert.equal(flatStyle(tool).width, 56)
  assert.equal(flatStyle(tool).borderRadius, 18)
  const bare = render(Button, { icon: 'more', size: 24 })
  assert.equal(flatStyle(bare).width, 24)
  assert.equal(bare.props.hitSlop.left, 20)
  assert.equal(bare.props.hitSlop.right, 20)
})

test('track rows and both virtualized list strides share 92 + 12 metrics', () => {
  const row = load('src/components/car/TrackRow.tsx')
  assert.equal(row.TRACK_ROW_HEIGHT, 92)
  assert.equal(row.TRACK_ROW_GAP, 12)
  const output = render(row.default, { index: 0, title: 'Track', artist: 'Artist', onMore: noop })
  assert.equal(output.props.style.height, 92)
  assert.equal(find(output, n => n.type == 'Image').props.style.width, 60)
  assert.equal(find(output, n => n.type == 'IconButton').props.size, 24)
  for (const file of ['src/components/OnlineList/ListItem.tsx', 'src/screens/Home/Views/Mylist/MusicList/ListItem.tsx']) {
    const item = load(file, { '@/components/car': { ...row, TrackRow: 'TrackRow' } })
    assert.equal(item.ITEM_HEIGHT, 104)
  }
})

test('library art supports 508×303 while search-grid cards remain square', () => {
  const Card = load('src/components/car/PlaylistCard.tsx').default
  const wide = render(Card, { rawWidth: 508, artHeight: 303, titleLines: 1, title: 'Playlist' })
  const image = find(wide, n => n.type == 'Image')
  assert.equal(image.props.style.width, 508)
  assert.equal(image.props.style.height, 303)
  assert.equal(find(wide, n => n.type == 'CarText').props.numberOfLines, 1)
  const square = render(Card, { rawWidth: 240, title: 'Search result' })
  assert.equal(find(square, n => n.type == 'Image').props.style.height, 240)
})

test('library uses two columns and keeps original indices for open/play callbacks', () => {
  const List = load('src/screens/Home/Views/SongList/components/Songlist/List.tsx', {
    './ListItem': { __esModule: true, default: 'ListItem', FeaturedItem: 'FeaturedItem' },
    '@/utils/hooks': { useLayout: () => ({ width: 1664, onLayout: noop }) },
    '@/components/car': { CarText: 'CarText' },
  }).default
  const output = render(List, { layout: 'shelf', onRefresh: noop, onLoadMore: noop, onOpenDetail: noop, onPlay: noop })
  const list = find(output, n => n.type == 'FlatList')
  assert.equal(list.props.numColumns, 2)
  assert.equal(list.props.columnWrapperStyle.gap, 24)
  const card = list.props.renderItem({ item: { id: 'second' }, index: 0 })
  assert.equal(card.props.width, 508)
  assert.equal(card.props.artHeight, 303)
  assert.equal(card.props.index, 1)
  assert.equal(card.props.onPress, noop)
  assert.equal(card.props.onPlay, noop)
  assert.equal(list.props.refreshControl.props.onRefresh, noop)
})

test('compact font selector has 43px segments, 53px outer height and 17px labels', () => {
  const Tabs = load('src/components/car/SegmentTabs.tsx').default
  const output = render(Tabs, { compact: true, items: [{ id: '1', label: '标准' }], activeId: '1', onChange: noop })
  const button = find(output, n => n.type == 'TouchableOpacity')
  assert.equal(button.props.style.minHeight, 43)
  assert.equal(button.props.style.paddingHorizontal, 24)
  assert.equal(button.props.style.minHeight + output.props.style.padding * 2, 53)
  assert.equal(find(button, n => n.type == 'CarText').props.size, 17)
})

test('font selector preserves legacy custom preferences until explicitly changed', () => {
  let saved
  const FontSize = load('src/screens/Home/Views/Setting/settings/Basic/FontSize.tsx', {
    '@/components/car': { CarText: 'CarText', SegmentTabs: 'SegmentTabs' },
    '@/core/common': { setFontSize: value => { saved = value } },
    '@/store/common/hook': { useFontSize: () => 0.9 },
  }).default
  const output = render(FontSize)
  const tabs = find(output, n => n.type == 'SegmentTabs')
  assert.equal(tabs.props.items.length, 3)
  assert.equal(tabs.props.activeId, '0.9')
  assert.equal(saved, undefined)
  tabs.props.onChange('1.3')
  assert.equal(saved, 1.3)
})

test('song menu is vertically centered and quick actions fit the 596px sheet', () => {
  const Sheet = load('src/components/car/Sheet.tsx').default
  const output = render(Sheet, {
    header: { title: 'Track', pic: 'cover' },
    quick: [0, 1, 2].map(id => ({ action: String(id), label: 'Action', icon: 'play' })),
    actions: [0, 1, 2, 3, 4].map(id => ({ action: String(id), label: 'Action' })),
    onPress: noop,
  })
  const wrapper = children(output)[0]
  assert.equal(wrapper.props.style.justifyContent, 'center')
  const panel = children(wrapper)[1]
  assert.equal(panel.props.style.width, 596)
  const quick = find(panel, n => n.props.style?.paddingVertical == 12)
  assert.equal(quick.props.style.gap, 10)
  assert.equal(quick.props.style.paddingHorizontal, 4)
  const button = children(quick)[0]
  assert.equal(button.props.style.height, 96)
  const quickWidth = 596 - 12 * 2
  assert.equal((quickWidth - 4 * 2 - 10 * 2) / 3, 181 + 1 / 3)
  // 12px padding, 4px gaps, header/divider/quick group, five 64px actions.
  assert.equal(24 + 108 + 1 + 120 + 3 * 4 + 5 * 64 + 4 * 4, 601)
})

test('mini player controls occupy 258px rather than 288px', () => {
  const playerActions = Object.fromEntries(['collectMusic', 'playNext', 'playPrev', 'togglePlay', 'uncollectMusic'].map(key => [key, noop]))
  const Player = load('src/components/car/MiniPlayer.tsx', {
    '@/navigation': { navigations: {} },
    '@/store/player/hook': { usePlayerMusicInfo: () => ({}), useIsPlay: () => true },
    '@/store/common/hook': { usePageVisible: noop },
    '@/store/setting/hook': { useSettingValue: () => false },
    '@/store/common/state': {},
    '@/store/player/state': {},
    '@/core/player/player': playerActions,
    '@/core/player/playInfo': { setLoadErrorPicUrl: noop, setMusicInfo: noop },
    '@/config/constant': { COMPONENT_IDS: {}, LIST_IDS: {}, NAV_SHEAR_NATIVE_IDS: {} },
    '@/utils/hooks': { useKeyboard: () => ({ keyboardShown: false }) },
    './SeekBar': 'SeekBar',
    './hooks': { useCurrentMusicLoved: () => false },
  }).default
  const output = render(Player)
  assert.equal(output.props.style.width, 1100)
  assert.equal(output.props.style.height, 92)
  const controlsNode = children(children(output)[0]).at(-1)
  const controls = render(controlsNode.type)
  assert.equal(controls.props.style.gap, 36)
  const width = children(controls).reduce((sum, node) => sum + node.props.size, 0) + 3 * controls.props.style.gap
  assert.equal(width, 258)
})

test('mini player catches initial window correction and resizes without navigation or playback changes', () => {
  const component = responsiveComponent('src/components/car/MiniPlayer.tsx', { isHome: true }, {
    '@/navigation': { navigations: {} },
    '@/store/player/hook': { usePlayerMusicInfo: () => ({}), useIsPlay: () => true },
    '@/store/common/hook': { usePageVisible: noop },
    '@/store/setting/hook': { useSettingValue: () => false },
    '@/store/common/state': {},
    '@/store/player/state': {},
    '@/core/player/player': Object.fromEntries(['collectMusic', 'playNext', 'playPrev', 'togglePlay', 'uncollectMusic'].map(key => [key, noop])),
    '@/core/player/playInfo': { setLoadErrorPicUrl: noop, setMusicInfo: noop },
    '@/config/constant': { COMPONENT_IDS: {}, LIST_IDS: {}, NAV_SHEAR_NATIVE_IDS: {} },
    '@/utils/hooks': { useKeyboard: () => ({ keyboardShown: false }) },
    './SeekBar': 'SeekBar',
    './hooks': { useCurrentMusicLoved: () => false },
  })
  assert.equal(component.output().props.style.width, 550)
  component.resize(1920, 1080)
  const unmount = component.mount()
  assert.equal(component.listeners.size, 1)
  assert.equal(component.output().props.style.width, 1100)
  assert.equal(component.output().props.style.height, 92)
  component.resize(960, 540)
  assert.equal(component.output().props.style.width, 550)
  assert.equal(component.output().props.style.height, 46)
  unmount()
  assert.equal(component.listeners.size, 0)
})

for (const activeId of ['nav_songlist', 'nav_search', 'nav_top', 'nav_love']) {
  test(`home mini player uses the same centered overlay on ${activeId}`, () => {
    const Home = load('src/screens/Home/Horizontal/index.tsx', {
      '@/components/car': { CarShell: 'CarShell', MiniPlayer: 'MiniPlayer' },
      '@/store/common/hook': { useNavActiveId: () => activeId },
      './Header': 'Header',
      './Main': 'Main',
    }).default
    const output = render(Home)
    const slot = children(output).at(-1)
    const bar = render(slot.type)
    assert.equal(bar.props.style.position, 'absolute')
    assert.equal(bar.props.style.left, 0)
    assert.equal(bar.props.style.right, 0)
    assert.equal(bar.props.style.bottom, 24)
    assert.equal(bar.props.style.alignItems, 'center')
    assert.equal(bar.props.style.paddingRight ?? 0, 0)
    assert.equal(bar.props.pointerEvents, 'box-none')
    const player = children(bar)[0]
    assert.equal(player.type, 'MiniPlayer')
    assert.deepEqual(player.props, { isHome: true })
  })
}

test('home mini player stays hidden in settings and yields to my-list multi-select', () => {
  let activeId = 'nav_setting'
  let multiSelect = false
  const Home = load('src/screens/Home/Horizontal/index.tsx', {
    react: { ...React, useState: () => [multiSelect, noop] },
    '@/components/car': { CarShell: 'CarShell', MiniPlayer: 'MiniPlayer' },
    '@/store/common/hook': { useNavActiveId: () => activeId },
    './Header': 'Header',
    './Main': 'Main',
  }).default
  const slot = children(render(Home)).at(-1)
  assert.equal(render(slot.type), null)
  activeId = 'nav_love'
  assert.notEqual(render(slot.type), null)
  multiSelect = true
  assert.equal(render(slot.type), null)
  activeId = 'nav_top'
  assert.notEqual(render(slot.type), null)
})

test('featured playlist uses 592×766 art and a 68px play button', () => {
  const { FeaturedItem } = load('src/screens/Home/Views/SongList/components/Songlist/ListItem.tsx', {
    '@/config/constant': { NAV_SHEAR_NATIVE_IDS: {} },
    '@/components/car': { PlaylistCard: 'PlaylistCard', HeroCard: 'HeroCard' },
  })
  const item = { id: 'playlist', name: 'Playlist', source: 'kw' }
  let opened
  let played
  const output = render(FeaturedItem, {
    item,
    index: 0,
    showSource: false,
    onPress: (value, index) => { opened = [value, index] },
    onPlay: (value, index) => { played = [value, index] },
  })
  assert.equal(output.props.width, 592)
  assert.equal(output.props.height, 766)
  assert.equal(output.props.playSize, 68)
  output.props.onPress()
  output.props.onPlay()
  assert.equal(opened[0], item)
  assert.equal(played[0], item)
  assert.equal(played[1], 0)
})

test('playlist overview uses large artwork, uncropped stats and two 208×72 actions', () => {
  const Overview = load('src/screens/SonglistDetail/Overview.tsx', {
    '@/components/car': { CarIcon: 'CarIcon', CarText: 'CarText' },
    '@/config/constant': { NAV_SHEAR_NATIVE_IDS: {} },
    '@/navigation': { useNavigationComponentDidAppear: noop },
    './state': { useListInfo: () => ({ id: 'playlist' }) },
  }).default
  const output = render(Overview, { componentId: 'detail', info: { name: 'Playlist', total: 50, playCount: '15.4万' }, onCollect: noop, onBack: noop, onPlay: noop, onShuffle: noop })
  const actions = children(output).at(-1)
  assert.equal(children(actions).length, 2)
  assert.equal((output.props.style.width - actions.props.style.gap) / 2, 208)
  assert.equal(children(actions)[0].props.style.height, 72)
  const collect = find(output, node => node.props.accessibilityLabel == 'collect')
  assert.equal(collect.props.onPress, noop)
  assert.equal(collect.props.style.height, 52)
  assert.equal(output.type, 'ScrollView', 'long descriptions must not clip or push controls offscreen permanently')
  assert.equal(output.props.style.width, 432)
  const artwork = children(output)[1]
  assert.equal(artwork.props.style.width, '100%')
  assert.equal(artwork.props.style.aspectRatio, 1)
  const stats = children(output)[3]
  for (const statNode of children(stats)) {
    const stat = render(statNode.type, statNode.props)
    assert.equal(stat.props.style.height, undefined, 'never constrain a 30px font to a 30px box')
    assert.equal(children(stat)[0].props.lineHeight, 1.3)
  }
  for (const action of children(actions)) assert.equal(action.props.onPress, noop)
})

test('lyrics apply car scaling once to spacing and 36/64px text', () => {
  const Lyric = load('src/screens/PlayDetail/Horizontal/Lyric.tsx', {
    'react-native': { ...native, StyleSheet: { create: value => value } },
    '@/utils/pixelRatio': { px: size => size / 2, sp: size => size / 2 },
    '@/plugins/lyric': { useLrcSet: () => [], useLrcPlay: () => ({ line: 1 }) },
    '@/store/setting/hook': {
      useSettingValue: key => ({
        'playDetail.horizontal.style.lrcFontSize': 220,
        'playDetail.style.align': 'left',
        'playDetail.isShowLyricProgressSetting': false,
      })[key],
    },
    '@/components/common/Text': { AnimatedColorText: 'AnimatedColorText' },
    '@/theme/fonts': { getFontStyle: weight => ({ fontWeight: weight }) },
    '@/store/player/state': {},
    '@/utils/scroll': { scrollTo: noop },
    '../components/PlayLine': 'PlayLine',
  }).default
  const list = find(render(Lyric), node => node.type == 'FlatList')
  assert.equal(list.props.style.paddingLeft, 8)
  const item = { text: 'Lyric', extendedLyrics: ['Translation'] }
  for (const [index, size] of [[0, 18], [1, 32]]) {
    const line = list.props.renderItem({ item, index })
    const output = render(line.type, line.props)
    assert.equal(output.props.style.paddingVertical, 9)
    assert.equal(children(output)[0].props.style.fontSize, size)
    assert.equal(children(output)[1].props.style.paddingTop, 2.5)
  }
})

test('playlist heading matches the large track rows and keeps a 24px gap', () => {
  const MusicList = load('src/screens/SonglistDetail/MusicList.tsx', {
    '@/components/OnlineList': 'OnlineList',
    '@/components/car': { CarText: 'CarText', ListFade: 'ListFade' },
    '@/core/songlist': {},
    '@/store/songlist/state': {},
    './listAction': { handlePlay: noop },
    './state': { useListInfo: () => ({}) },
  }).default
  const output = render(MusicList, { onInfo: noop })
  const header = children(output)[0]
  assert.equal(header.props.style.height, 52)
  assert.equal(header.props.style.marginTop, 0)
  assert.equal(header.props.style.marginBottom, 24)
  assert.equal(children(header)[0].props.size, 27)
  assert.equal(find(output, node => node.type == 'OnlineList').props.trackRowSize, 'large')
})

test('large track rows increase text, art and menu targets without changing default rows', () => {
  const row = load('src/components/car/TrackRow.tsx')
  const output = render(row.default, { size: 'large', index: 0, title: 'Track', artist: 'Artist', duration: '04:29', onMore: noop })
  assert.equal(output.props.style.height, row.TRACK_ROW_LARGE_HEIGHT)
  assert.equal(row.TRACK_ROW_LARGE_HEIGHT, 112)
  assert.equal(find(output, node => node.type == 'Image').props.style.width, 72)
  assert.equal(find(output, node => node.props.children == 'Track').props.size, 25)
  assert.equal(find(output, node => node.props.children == 'Artist').props.size, 19)
  assert.equal(find(output, node => node.type == 'IconButton').props.size, 48)
  const regular = render(row.default, { index: 0, title: 'Track', artist: 'Artist' })
  assert.equal(regular.props.style.height, 92)
  assert.equal(find(regular, node => node.props.children == 'Track').props.size, 19)
})

test('large online list rows share their virtualized stride and retain actions and selection', () => {
  const row = load('src/components/car/TrackRow.tsx')
  const itemModule = load('src/components/OnlineList/ListItem.tsx', { '@/components/car': { ...row, TrackRow: 'TrackRow' } })
  const List = load('src/components/OnlineList/List.tsx', {
    './ListItem': { ...itemModule, __esModule: true, default: 'ListItem' },
    '@/utils/tools': { createStyle: value => value },
    '@/store/setting/state': { setting: {} },
    './MultipleModeBar': { MULTI_SELECT_BAR_HEIGHT: 60 },
    '@/components/common/Text': 'Text',
    './listAction': { handlePlay: noop },
    '@/store/setting/hook': { useSettingValue: () => true },
    '@/store/player/hook': { usePlayerMusicInfo: () => ({ id: 'test' }) },
  }).default
  const item = { id: 'test', name: 'Track', singer: 'Artist', interval: '04:29', meta: { _qualitys: {} } }
  const props = { item, index: 2, onPress: noop, onLongPress: noop, onShowMenu: noop, selectedList: [item], isMultiSelectMode: false, playingId: item.id, isShowInterval: true }
  for (const [size, height] of [['default', 104], ['large', 124]]) {
    const list = render(List, { trackRowSize: size, onRefresh: noop })
    assert.equal(list.props.showsVerticalScrollIndicator, size != 'large')
    const cell = list.props.renderItem({ item, index: 2 })
    const output = render(itemModule.default, { ...props, trackRowSize: cell.props.trackRowSize })
    assert.equal(output.props.style.height, height)
    assert.equal(itemModule.getItemHeight(size), height)
    assert.equal(list.props.getItemLayout(null, 2).length, height)
    assert.equal(list.props.getItemLayout(null, 2).offset, height * 2)
    const track = children(output)[0]
    assert.equal(track.props.size, size)
    assert.equal(track.props.playing, true)
    assert.equal(track.props.selected, true)
    assert.equal(track.props.duration, '04:29')
    track.props.onPress()
    track.props.onLongPress()
    track.props.onMore({ x: 10, y: 10, w: 48, h: 48 })
  }
  const halfSize = load('src/components/OnlineList/ListItem.tsx', {
    '@/components/car': { ...row, TrackRow: 'TrackRow' },
    '@/utils/pixelRatio': { px: value => value / 2 },
  })
  assert.equal(halfSize.getItemHeight('large'), 62)
})

test('track artwork keeps its dimensions and uses a bundled themed music icon as fallback', () => {
  const row = load('src/components/car/TrackRow.tsx')
  const glyphs = JSON.parse(readFileSync(path.join(root, 'src/resources/fonts/selection.json'), 'utf8')).icons.map(icon => icon.properties.name)
  for (const size of ['default', 'large']) {
    const output = render(row.default, { size, index: 0, title: 'Track', artist: 'Artist', pic: 'https://example.com/cover.jpg' })
    const image = find(output, node => node.type == 'Image')
    const fallback = image.props.fallback
    assert.equal(image.props.url, 'https://example.com/cover.jpg')
    assert.equal(fallback.props.style.width, image.props.style.width)
    assert.equal(fallback.props.style.height, image.props.style.height)
    const icon = children(fallback)[0]
    assert.equal(icon.props.name, 'lucide-list-music')
    assert.ok(glyphs.includes(icon.props.name))
  }
})

test('custom image fallback handles missing and failed covers without changing other images', () => {
  const Image = load('src/components/common/Image.tsx', {
    'react-native': { ...native, Image: 'NativeImage', StyleSheet: { compose: (a, b) => [a, b] } },
    '@/theme': { BorderRadius: { normal: 8 } },
    '@/utils/tools': { createStyle: value => value },
    '@/utils/hooks': { useLayout: () => ({ width: 72, onLayout: noop }) },
    './Text': 'Text',
  }).default
  const fallback = React.createElement('MusicPlaceholder')
  const style = { width: 72, height: 72 }
  assert.equal(render(Image, { style, fallback }), fallback)
  assert.notEqual(render(Image, { style }).type, fallback.type)
  const renderer = new ShallowRenderer()
  renderer.render(React.createElement(Image.type, { url: 'https://example.com/missing.jpg', style, fallback }))
  assert.equal(renderer.getRenderOutput().type, 'NativeImage')
  renderer.getRenderOutput().props.onError()
  assert.equal(renderer.getRenderOutput(), fallback)
})

test('playlist detail retains the mini player and reserves space above it for scrollable content', () => {
  const Screen = load('src/screens/SonglistDetail/index.tsx', {
    './MusicList': 'MusicList',
    './Overview': 'Overview',
    '@/components/PageContent': 'PageContent',
    '@/components/car': { AmbientBackground: 'AmbientBackground', CarShell: 'CarShell', MiniPlayer: 'MiniPlayer', MINI_PLAYER_HEIGHT: 92 },
    '@/core/common': {},
    '@/config/constant': { COMPONENT_IDS: {}, MUSIC_TOGGLE_MODE: {} },
    '@/store/songlist/state': {},
    '@/store/player/state': {},
    './state': { ListInfoContext: { Provider: 'ListInfoProvider' } },
    '@/navigation': {},
    '@/utils/tools': {},
    './listAction': {},
  }).default
  const output = render(Screen, { componentId: 'playlist-screen', info: { name: 'Playlist' } })
  const player = find(output, node => node.type == 'MiniPlayer')
  assert.equal(player.props.componentId, 'playlist-screen')
  const slot = find(output, node => children(node).some(child => child.type == 'MiniPlayer'))
  assert.equal(slot.props.style.position, 'absolute')
  assert.equal(slot.props.style.bottom, 24)
  assert.equal(slot.props.style.alignItems, 'center')
  assert.equal(slot.props.pointerEvents, 'box-none')
  const content = find(output, node => node.props.style?.flexDirection == 'row')
  assert.equal(content.props.style.paddingTop, 60)
  assert.equal(content.props.style.gap, 64)
  assert.equal(content.props.style.paddingBottom, 92 + slot.props.style.bottom + 20)
  assert.ok(find(content, node => node.type == 'MusicList'))
  assert.ok(find(content, node => node.type == 'Overview'))
})

test('mini player opens playback from its host screen while retaining home navigation and controls', () => {
  const opened = []
  const called = []
  const state = { musicInfo: { id: 'current-track' } }
  const Player = load('src/components/car/MiniPlayer.tsx', {
    '@/navigation': { navigations: { pushPlayDetailScreen: id => opened.push(id) } },
    '@/store/player/hook': { usePlayerMusicInfo: () => ({ name: 'Current song', singer: 'Artist', album: 'Album', pic: 'cover' }), useIsPlay: () => true },
    '@/store/common/hook': { usePageVisible: noop },
    '@/store/setting/hook': { useSettingValue: () => false },
    '@/store/common/state': { componentIds: { home: 'home-screen' } },
    '@/store/player/state': state,
    '@/core/player/player': Object.fromEntries(['collectMusic', 'playNext', 'playPrev', 'togglePlay', 'uncollectMusic'].map(key => [key, () => called.push(key)])),
    '@/core/player/playInfo': { setLoadErrorPicUrl: noop, setMusicInfo: noop },
    '@/config/constant': { COMPONENT_IDS: {}, LIST_IDS: {}, NAV_SHEAR_NATIVE_IDS: {} },
    '@/utils/hooks': { useKeyboard: () => ({ keyboardShown: false }) },
    './SeekBar': 'SeekBar',
    './hooks': { useCurrentMusicLoved: () => false },
  }).default
  const detail = render(Player, { componentId: 'playlist-screen' })
  const row = children(detail)[0]
  const [cover, title, controlsNode] = children(row)
  assert.equal(find(cover, node => node.type == 'Image').props.url, 'cover')
  assert.equal(children(title)[0].props.children, 'Current song')
  assert.equal(children(title)[1].props.children, 'Artist · Album')
  cover.props.onPress()
  title.props.onPress()
  assert.deepEqual(opened, ['playlist-screen', 'playlist-screen'])
  assert.equal(cover.props.onLongPress, undefined)
  assert.equal(title.props.onLongPress, undefined)
  const controls = render(controlsNode.type)
  for (const button of children(controls)) button.props.onPress()
  assert.deepEqual(called, ['collectMusic', 'playPrev', 'togglePlay', 'playNext'])
  const home = render(Player, { isHome: true })
  const homeCover = children(children(home)[0])[0]
  homeCover.props.onPress()
  assert.equal(opened.at(-1), 'home-screen')
  assert.equal(typeof homeCover.props.onLongPress, 'function')
  state.musicInfo.id = null
  cover.props.onPress()
  assert.equal(opened.length, 3)
})

test('settings hide About and fall back to Basic for a previously selected hidden page', () => {
  const sections = { basic: 'Basic', player: 'Player', lyric_desktop: 'LyricDesktop', search: 'Search', list: 'List', sync: 'Sync', backup: 'Backup', other: 'Other', version: 'Version' }
  const mocks = Object.fromEntries(Object.values(sections).map(name => [`./settings/${name}`, name]))
  const globals = { lx: { settingActiveId: 'about' } }
  const main = load('src/screens/Home/Views/Setting/Main.tsx', mocks, globals)
  assert.deepEqual(Array.from(main.SETTING_SCREENS), Object.keys(sections))
  for (const [id, component] of Object.entries(sections)) {
    globals.lx.settingActiveId = id
    assert.equal(render(main.default).type, component)
    assert.equal(main.normalizeSettingScreenId(id), id)
  }
  for (const id of ['about', 'unknown', '']) {
    globals.lx.settingActiveId = id
    assert.equal(render(main.default).type, 'Basic')
    assert.equal(main.normalizeSettingScreenId(id), 'basic')
  }
})

test('settings navigation excludes About, highlights Basic for stale selection and keeps other entries working', () => {
  const globals = { lx: { settingActiveId: 'about' } }
  const sections = ['Basic', 'Player', 'LyricDesktop', 'Search', 'List', 'Sync', 'Backup', 'Other', 'Version']
  const main = load('src/screens/Home/Views/Setting/Main.tsx', Object.fromEntries(sections.map(name => [`./settings/${name}`, name])), globals)
  const Nav = load('src/screens/Home/Views/Setting/Horizontal/NavList.tsx', {
    '../Main': main,
    '@/components/car': { CarText: 'CarText', CarIcon: 'CarIcon' },
  }, globals).default
  const changed = []
  const renderer = new ShallowRenderer()
  renderer.render(React.createElement(Nav, { onChangeId: id => changed.push(id) }))
  const getItems = () => children(children(renderer.getRenderOutput())[1])
  const items = getItems()
  assert.equal(items.length, 9)
  assert.equal(items.some(item => item.props.id == 'about'), false)
  assert.deepEqual(items.filter(item => item.props.active).map(item => item.props.id), ['basic'])
  const update = items.find(item => item.props.id == 'version')
  render(update.type, update.props).props.onPress()
  assert.deepEqual(changed, ['version'])
  assert.equal(globals.lx.settingActiveId, 'version')
  assert.deepEqual(getItems().filter(item => item.props.active).map(item => item.props.id), ['version'])
})
