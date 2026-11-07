/* Songlist and leaderboard queue regressions: node --test scripts/songlist-playback.test.cjs */
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')
const React = require('react')
const ShallowRenderer = require('react-shallow-renderer')

const noop = () => {}
const flush = async() => { for (let i = 0; i < 20; i++) await Promise.resolve() }
const track = id => ({ id, name: id, singer: 'Artist', source: 'kw', meta: { albumName: '', picUrl: '' } })
const songs = Array.from({ length: 7 }, (_, i) => track(`song-${i + 1}`))
const info = { id: 'online-playlist', source: 'kw', name: 'Playlist' }
const boardInfo = { id: 'kw__16', source: 'kw' }
const detail = () => ({ ...info, info: { name: info.name }, list: songs, total: songs.length })
const native = { View: 'View', FlatList: 'FlatList', RefreshControl: 'RefreshControl' }
const theme = { 'text-3': '#999', 'c-primary': '#f70' }
const compiled = new Map()
function load(file, mocks = {}, globals = {}) {
  if (!compiled.has(file)) {
    compiled.set(file, ts.transpileModule(readFileSync(path.resolve(__dirname, '..', file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
      fileName: file,
    }).outputText)
  }
  const dependencies = {
    react: { ...React, useImperativeHandle: (ref, create) => { if (ref) ref.current = create() } },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': native,
    '@/utils/pixelRatio': { px: value => value },
    '@/store/theme/hook': { useTheme: () => theme },
    '@/lang': { useI18n: () => key => key },
    ...mocks,
  }
  const module = { exports: {} }
  vm.runInNewContext(compiled.get(file), {
    module,
    exports: module.exports,
    console,
    requestAnimationFrame: fn => fn(),
    ...globals,
    require(id) {
      assert.ok(Object.hasOwn(dependencies, id), `Unmocked dependency ${id} in ${file}`)
      return dependencies[id]
    },
  }, { filename: file })
  return module.exports
}
function mount(Component, props = {}) {
  const renderer = new ShallowRenderer()
  renderer.render(React.createElement(Component, props))
  return () => renderer.getRenderOutput()
}
function find(node, type) {
  if (!React.isValidElement(node)) return undefined
  if (node.type == type) return node
  return React.Children.toArray(node.props.children).map(child => find(child, type)).find(Boolean)
}

// Use the real player, index calculation, state actions and queue filtering;
// mock only native playback, storage, network and event transport.
function playback(kind = 'songlist') {
  const listeners = new Map()
  const appEvent = new Proxy({ on: (name, listener) => listeners.set(name, listener) }, { get: (target, key) => target[key] ?? noop })
  const globals = { global: { lx: { isPlayedStop: false, homePagerIdle: true }, app_event: appEvent, state_event: appEvent, i18n: { t: key => key } } }
  const state = load('src/store/player/state.ts').default
  const constants = load('src/config/constant.ts')
  const setting = { 'list.isClickPlayList': false, 'player.togglePlayMethod': 'listLoop', 'player.isAutoCleanPlayedList': true }
  const queues = { default: [track('favorite-1'), track('favorite-2')], temp: [] }
  const listState = { tempListMeta: { id: '' } }
  const mocks = {
    '@/config/constant': constants,
    '@/store/player/state': state,
    '@/store/setting/state': { setting },
    '@/utils/listManage': { getListMusicSync: id => queues[id] ?? [] },
    '@/utils': { arrPush: (array, items) => array.push(...items), arrUnshift: (array, items) => array.unshift(...items), formatPlayTime2: String },
  }
  const action = load('src/store/player/action.ts', { ...mocks, './state': state }, globals).default
  mocks['@/store/player/action'] = action
  mocks['@/core/player/progress'] = load('src/core/player/progress.ts', mocks, globals)
  const playInfo = load('src/core/player/playInfo.ts', mocks, globals)
  const playedList = load('src/core/player/playedList.ts', mocks, globals)
  const utils = load('src/core/player/utils.ts', {
    ...mocks,
    './playedList': playedList,
    '@/store/dislikeList': { state: { dislikeInfo: { names: new Set(), musicNames: new Set(), singerNames: new Set() } } },
  }, globals)
  const listActions = {
    async setTempList(id, list) {
      queues.temp = list
      listState.tempListMeta = { id }
      playInfo.updatePlayIndex()
    },
  }
  const playerMocks = {
    ...mocks,
    '@/plugins/player': { isInitialized: () => true, setStop: async() => {}, isEmpty: () => false },
    '@/core/player/playStatus': { setStatusText: noop, setIsPlay: noop },
    '@/core/player/playInfo': playInfo,
    '@/core/player/playedList': playedList,
    '@/core/player/tempPlayList': { clearTempPlayeList: () => action.clearTempPlayeList(), removeTempPlayList: index => action.removeTempPlayList(index) },
    '@/core/music': {},
    '@/utils/message': {},
    '@/utils/common': { getRandom: min => min },
    './utils': utils,
    'react-native-background-timer': { clearTimeout: noop },
    '@/utils/tools': { debounceBackgroundTimer: () => noop },
    '@/core/list': listActions,
    '@/core/dislikeList': {},
  }
  const player = load('src/core/player/player.ts', playerMocks, globals)
  let resolveFull
  const fullList = new Promise(resolve => { resolveFull = resolve })
  const playlist = load(kind == 'leaderboard' ? 'src/screens/Home/Views/Leaderboard/listAction.ts' : 'src/screens/SonglistDetail/listAction.ts', {
    ...mocks,
    '@/core/list': listActions,
    '@/core/player/player': player,
    [kind == 'leaderboard' ? '@/core/leaderboard' : '@/core/songlist']: { getListDetail: async() => ({ list: songs }), getListDetailAll: () => fullList },
    '@/store/list/state': listState,
    '@/core/syncSourceList': noop,
    '@/utils/tools': {},
  }, globals)
  const initEvents = load('src/core/init/player/player.ts', {
    ...playerMocks,
    '@/core/player/player': player,
    '@/plugins/player/playList': { delayUpdateMusicInfo: noop },
  }, globals).default
  return { state, setting, queues, listState, player, playlist, initEvents, listeners, resolveFull }
}

function onlineList(props, setting, singlePlays) {
  const OnlineList = load('src/components/OnlineList/index.tsx', {
    './List': 'List',
    './ListMenu': 'ListMenu',
    './MultipleModeBar': 'MultipleModeBar',
    '@/components/MusicMultiAddModal': 'MusicMultiAddModal',
    '@/components/MusicAddModal': 'MusicAddModal',
    './listAction': { handlePlay: music => singlePlays.push(music.id) },
    '@/utils/tools': { createStyle: value => value },
    '@/store/setting/state': { setting },
  }).default
  return mount(OnlineList, { onRefresh: noop, onLoadMore: noop, ...props })()
}
function rows(props, setting, singlePlays) {
  const List = load('src/components/OnlineList/List.tsx', {
    './ListItem': { __esModule: true, default: 'ListItem', getItemHeight: () => 104 },
    './MultipleModeBar': { MULTI_SELECT_BAR_HEIGHT: 60 },
    './listAction': { handlePlay: music => singlePlays.push(music.id) },
    '@/utils/tools': { createStyle: value => value },
    '@/store/setting/state': { setting },
    '@/store/setting/hook': { useSettingValue: () => false },
    '@/store/player/hook': { usePlayerMusicInfo: () => ({ id: null }) },
    '@/components/common/Text': 'Text',
  }, { global: { lx: { homePagerIdle: true } } }).default
  const ref = React.createRef()
  const output = mount(List, { ...props, ref })
  ref.current.setList(songs, false, false)
  return {
    ref,
    press(index) {
      const row = output().props.renderItem({ item: songs[index], index })
      row.props.onPress(songs[index], index)
    },
  }
}
function detailList(onPlay) {
  const MusicList = load('src/screens/SonglistDetail/MusicList.tsx', {
    '@/components/OnlineList': 'OnlineList',
    '@/core/songlist': {},
    '@/store/songlist/state': { listDetailInfo: detail() },
    '@/components/car': { CarText: 'CarText', ListFade: 'ListFade' },
    './listAction': { handlePlay: onPlay },
    './state': { useListInfo: () => info },
  }).default
  return find(mount(MusicList, { onInfo: noop })(), 'OnlineList').props
}

function leaderboardList(onPlay) {
  const MusicList = load('src/screens/Home/Views/Leaderboard/MusicList.tsx', {
    '@/components/OnlineList': 'OnlineList',
    '@/core/leaderboard': {},
    '@/store/leaderboard/state': { listDetailInfo: { ...boardInfo, list: songs, total: songs.length } },
    './listAction': { handlePlay: onPlay },
  }).default
  return find(mount(MusicList)(), 'OnlineList').props
}

for (const entry of ['row', 'menu']) {
  for (const next of ['manual', 'ended']) {
    test(`leaderboard ${entry}: ${next} next goes from the third song to the fourth, not recent listening`, async() => {
      const ctx = playback('leaderboard')
      await ctx.initEvents(ctx.setting)
      await ctx.player.playList('default', 0)
      const recentBefore = [...ctx.queues.default]
      // Switching into a board must replace the old queue and clear pending/history entries.
      ctx.state.playedList.push({ listId: 'default', musicInfo: recentBefore[0], isTempPlay: false })
      ctx.state.tempPlayList.push({ listId: 'default', musicInfo: recentBefore[1], isTempPlay: true })
      const singlePlays = []
      let started
      const props = leaderboardList((...args) => { started = ctx.playlist.handlePlay(...args) })
      const online = onlineList(props, ctx.setting, singlePlays)
      if (entry == 'row') rows(find(online, 'List').props, ctx.setting, singlePlays).press(2)
      else find(online, 'ListMenu').props.onPlay({ musicInfo: songs[2], index: 2 })
      await flush()
      assert.deepEqual(singlePlays, [], 'board playback must not use the default/recent-listening action')
      assert.equal(ctx.state.playInfo.playerListId, 'temp')
      assert.equal(ctx.listState.tempListMeta.id, `board__${boardInfo.id}`)
      assert.equal(ctx.state.playInfo.playerPlayIndex, 2)
      assert.equal(ctx.state.playMusicInfo.musicInfo.id, songs[2].id)
      assert.equal(ctx.state.playedList.length, 0)
      assert.equal(ctx.state.tempPlayList.length, 0)
      if (next == 'manual') await ctx.player.playNext()
      else {
        ctx.listeners.get('playerEnded')()
        await flush()
      }
      assert.equal(ctx.state.playMusicInfo.musicInfo.id, songs[3].id)
      assert.equal(ctx.state.playInfo.playerPlayIndex, 3)
      ctx.resolveFull(songs)
      await started
      assert.equal(ctx.state.playInfo.playerPlayIndex, 3, 'finishing the full board load must not restart playback')
      await ctx.player.playPrev()
      assert.equal(ctx.state.playMusicInfo.musicInfo.id, songs[2].id)
      assert.deepEqual(ctx.queues.default, recentBefore)
    })
  }
}

for (const entry of ['row', 'menu']) {
  test(`${entry} playback starts at the selected song and manual/automatic next stay in its playlist`, async() => {
    const ctx = playback()
    await ctx.initEvents(ctx.setting)
    await ctx.player.playList('default', 0)
    const favoritesBefore = [...ctx.queues.default]
    const singlePlays = []
    let started
    const props = detailList((...args) => { started = ctx.playlist.handlePlay(...args) })
    assert.equal(props.playListOnPress, true, 'detail must override the old disabled click-playlist setting')
    const online = onlineList(props, ctx.setting, singlePlays)
    if (entry == 'row') rows(find(online, 'List').props, ctx.setting, singlePlays).press(3)
    else find(online, 'ListMenu').props.onPlay({ musicInfo: songs[3], index: 3 })
    await flush()
    assert.deepEqual(singlePlays, [])
    assert.equal(ctx.state.playInfo.playerListId, 'temp')
    assert.equal(ctx.state.playInfo.playerPlayIndex, 3)
    assert.equal(ctx.state.playMusicInfo.musicInfo.id, songs[3].id)
    await ctx.player.playNext()
    assert.equal(ctx.state.playMusicInfo.musicInfo.id, songs[4].id)
    ctx.listeners.get('playerEnded')()
    await flush()
    assert.equal(ctx.state.playMusicInfo.musicInfo.id, songs[5].id)
    await ctx.player.playPrev()
    assert.equal(ctx.state.playMusicInfo.musicInfo.id, songs[4].id)
    ctx.resolveFull(songs)
    await started
    assert.equal(ctx.state.playInfo.playerPlayIndex, 4, 'background completion must not restart playback')
    assert.deepEqual(ctx.queues.default, favoritesBefore, 'playing a songlist must not add songs to favorites/default')
  })
}

test('other online lists retain their setting and fall back to single playback without a playlist handler', () => {
  for (const enabled of [false, true]) {
    for (const hasHandler of [false, true]) {
      for (const override of [undefined, false, true]) {
        const setting = { 'list.isClickPlayList': enabled }
        const singlePlays = []
        const playlistPlays = []
        const onPlayList = hasHandler ? index => playlistPlays.push(index) : undefined
        const online = onlineList({ onPlayList, playListOnPress: override }, setting, singlePlays)
        rows(find(online, 'List').props, setting, singlePlays).press(2)
        find(online, 'ListMenu').props.onPlay({ musicInfo: songs[2], index: 2 })
        const playsPlaylist = (override ?? enabled) && hasHandler
        assert.deepEqual(playlistPlays, playsPlaylist ? [2, 2] : [])
        assert.deepEqual(singlePlays, playsPlaylist ? [] : [songs[2].id, songs[2].id])
      }
    }
  }
})

test('multi-selection selects songs without changing the playback queue', () => {
  const played = []
  const list = rows({ playListOnPress: true, onPlayList: index => played.push(index), onSelectAll: noop }, {}, played)
  list.ref.current.setIsMultiSelectMode(true)
  list.press(3)
  assert.deepEqual(played, [])
  assert.equal(list.ref.current.getSelectedList()[0].id, songs[3].id)
})

test('the overview play button starts at the current song when present, otherwise the first song', () => {
  for (const [current, expected] of [[songs[3], 3], [track('outside-playlist'), 0], [null, 0]]) {
    const calls = []
    const settings = []
    const Screen = load('src/screens/SonglistDetail/index.tsx', {
      './MusicList': 'MusicList',
      './Overview': 'Overview',
      '@/components/PageContent': 'PageContent',
      '@/components/car': { AmbientBackground: 'AmbientBackground', CarShell: 'CarShell', MiniPlayer: 'MiniPlayer', MINI_PLAYER_HEIGHT: 72 },
      '@/core/common': { updateSetting: value => settings.push(value) },
      '@/config/constant': { MUSIC_TOGGLE_MODE: { random: 'random' } },
      '@/store/songlist/state': { listDetailInfo: detail() },
      '@/store/player/state': { playMusicInfo: { musicInfo: current } },
      './state': { ListInfoContext: React.createContext(info) },
      '@/navigation': {},
      '@/utils/tools': { toast: noop },
      './listAction': { handlePlay: (...args) => calls.push(args) },
    }).default
    const overview = find(mount(Screen, { componentId: 'detail', info })(), 'Overview')
    overview.props.onPlay()
    assert.deepEqual(calls[0], [info.id, info.source, songs, expected])
    overview.props.onShuffle()
    assert.equal(settings[0]['player.togglePlayMethod'], 'random')
    assert.equal(calls[1][3], 0, 'shuffle keeps its existing starting behavior')
  }
})

test('loading the full playlist extends the queue without resetting the selected position', async() => {
  const ctx = playback()
  const started = ctx.playlist.handlePlay(info.id, info.source, songs.slice(0, 4), 3)
  await flush()
  assert.equal(ctx.state.playMusicInfo.musicInfo.id, songs[3].id)
  ctx.resolveFull(songs)
  await started
  await ctx.player.playNext()
  assert.equal(ctx.state.playMusicInfo.musicInfo.id, songs[4].id)
})

test('a late full-playlist response cannot replace a newer playlist queue', async() => {
  const ctx = playback()
  const started = ctx.playlist.handlePlay(info.id, info.source, songs, 3)
  await flush()
  const newer = [track('newer-1'), track('newer-2')]
  ctx.queues.temp = newer
  ctx.listState.tempListMeta.id = 'kw__another-playlist'
  await ctx.player.playList('temp', 0)
  ctx.resolveFull(songs)
  await started
  await ctx.player.playNext()
  assert.equal(ctx.state.playMusicInfo.musicInfo.id, 'newer-2')
})
