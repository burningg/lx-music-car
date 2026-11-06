import { useRef, useEffect, useState, useCallback } from 'react'
import { type LayoutChangeEvent, type LayoutRectangle, View } from 'react-native'

// import music from '@/utils/musicSdk'
// import InsetShadow from 'react-native-inset-shadow'
// import TipList from './components/TipList'
// import MusicList from './components/MusicList'
import HeaderBar, { type HeaderBarProps, type HeaderBarType } from './HeaderBar'
import searchState, { type SearchType } from '@/store/search/state'
import searchMusicState from '@/store/search/music/state'
import searchSonglistState from '@/store/search/songlist/state'
import { getSearchSetting, saveSearchSetting } from '@/utils/data'
import { createStyle } from '@/utils/tools'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { AmbientBackground, CarText, HeroCard, ListFade } from '@/components/car'
import { handlePlay } from '@/components/OnlineList/listAction'
import { px } from '@/utils/pixelRatio'
import SearchTypeSelector from './SearchTypeSelector'
import type { MusicResultInfo } from './MusicList'
import TipList, { type TipListType } from './TipList'
import List, { type ListType } from './List'
import { addHistoryWord } from '@/core/search/search'


interface SearchInfo {
  temp_source: LX.OnlineSource
  source: LX.OnlineSource | 'all'
  searchType: 'music' | 'songlist'
}

const BestMatch = ({ info }: { info: LX.Music.MusicInfoOnline }) => {
  const t = useI18n()
  return (
    <HeroCard
      pic={info.meta.picUrl}
      tag={t('search_best_match')}
      title={info.name}
      subtitle={[t('search_type_music'), info.singer, info.meta.albumName].filter(Boolean).join(' · ')}
      onPlay={() => { handlePlay(info) }}
    />
  )
}

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const [result, setResult] = useState<MusicResultInfo | null>(null)
  const handleResult = useCallback((info: MusicResultInfo | null) => {
    setResult(info?.list.length ? info : null)
  }, [])
  const headerBarRef = useRef<HeaderBarType>(null)
  const searchTipListRef = useRef<TipListType>(null)
  const listRef = useRef<ListType>(null)
  const [availableHeight, setAvailableHeight] = useState(0)
  const [inputLayout, setInputLayout] = useState<LayoutRectangle | null>(null)
  const searchInfo = useRef<SearchInfo>({ temp_source: 'kw', source: 'kw', searchType: 'music' })

  useEffect(() => {
    void getSearchSetting().then(info => {
      // info.type = 'music'
      searchInfo.current.temp_source = info.temp_source
      searchInfo.current.source = info.source
      searchInfo.current.searchType = info.type
      switch (info.type) {
        case 'music':
          headerBarRef.current?.setSourceList(searchMusicState.sources, info.source)
          break
        case 'songlist':
          headerBarRef.current?.setSourceList(searchSonglistState.sources, info.source)
          break
      }
      headerBarRef.current?.setText(searchState.searchText)
      listRef.current?.loadList(searchState.searchText, searchInfo.current.source, searchInfo.current.searchType)
    })

    const handleTypeChange = (type: SearchType) => {
      searchInfo.current.searchType = type
      void saveSearchSetting({ type })
      listRef.current?.loadList(searchState.searchText, searchInfo.current.source, type)
    }
    global.app_event.on('searchTypeChanged', handleTypeChange)

    return () => {
      global.app_event.off('searchTypeChanged', handleTypeChange)
    }
  }, [])


  const handleLayout = (e: LayoutChangeEvent) => {
    setAvailableHeight(e.nativeEvent.layout.height)
  }

  const handleSourceChange: HeaderBarProps['onSourceChange'] = (source) => {
    searchInfo.current.source = source
    void saveSearchSetting({ source })
    listRef.current?.loadList(searchState.searchText, source, searchInfo.current.searchType)
  }
  const handleTipSearch: HeaderBarProps['onTipSearch'] = (text) => {
    searchTipListRef.current?.search(text)
    searchTipListRef.current?.show()
  }
  const handleHideTipList = () => {
    searchTipListRef.current?.hide()
  }
  const handleSearch: HeaderBarProps['onSearch'] = (text) => {
    handleHideTipList()
    searchTipListRef.current?.search(text)
    headerBarRef.current?.setText(text)
    headerBarRef.current?.blur()
    void addHistoryWord(text)
    listRef.current?.loadList(text, searchInfo.current.source, searchInfo.current.searchType)
  }
  const handleShowTipList: HeaderBarProps['onShowTipList'] = () => {
    searchTipListRef.current?.show()
  }

  // 设计稿：内边距 60/72/152/72；顶栏 → 类型切换 + 结果数 → 左侧最佳匹配 + 右侧歌曲列表
  return (
    <View style={styles.container}>
      <AmbientBackground variant="glow" />
      <View style={{ flex: 1, paddingTop: px(60), paddingHorizontal: px(72), paddingBottom: px(152) }}>
        <View style={{ flex: 1, gap: px(32) }} onLayout={handleLayout}>
          <HeaderBar
            ref={headerBarRef}
            onSearchInputLayout={({ nativeEvent: { layout } }) => { setInputLayout(layout) }}
            onSourceChange={handleSourceChange}
            onTipSearch={handleTipSearch}
            onSearch={handleSearch}
            onHideTipList={handleHideTipList}
            onShowTipList={handleShowTipList}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <SearchTypeSelector />
            {result ? <CarText size={17} color={theme['text-2']}>{t('search_result_count', { total: result.total })}</CarText> : null}
          </View>
          <View style={styles.content}>
            <View style={{ flex: 1, flexDirection: 'row', gap: px(36) }}>
              {result ? <BestMatch info={result.list[0]} /> : null}
              <View style={{ flex: 1 }}>
                <List ref={listRef} onSearch={handleSearch} onResult={handleResult} />
                <ListFade height={32} />
              </View>
            </View>
          </View>
          <TipList ref={searchTipListRef} anchor={inputLayout} availableHeight={availableHeight} onSearch={handleSearch} />
        </View>
      </View>
    </View>
  )
}

const styles = createStyle({
  container: {
    width: '100%',
    flex: 1,
  },
  content: {
    flex: 1,
  },
})
