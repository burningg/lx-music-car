import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import type { InitState as SearchState } from '@/store/search/state'
import type { Source as MusicSource } from '@/store/search/music/state'
import type { Source as SongListSource } from '@/store/search/songlist/state'
import MusicList, { type MusicListType, type MusicResultInfo } from './MusicList'
import BlankView, { type BlankViewType } from './BlankView'
import SonglistList from './SonglistList'

interface ListProps {
  onSearch: (keyword: string) => void
  /** 歌曲搜索结果，空白页与歌单搜索时为 null */
  onResult: (info: MusicResultInfo | null) => void
}
export interface ListType {
  loadList: (text: string, source: MusicSource | SongListSource, type: SearchState['searchType']) => void
}

export default forwardRef<ListType, ListProps>(({ onSearch, onResult }, ref) => {
  const [listType, setListType] = useState<SearchState['searchType']>('music')
  const [showBlankView, setShowListView] = useState(true)
  const listRef = useRef<MusicListType>(null)
  const blankViewRef = useRef<BlankViewType>(null)

  useImperativeHandle(ref, () => ({
    loadList(text, source, type) {
      onResult(null)
      if (text) {
        setShowListView(false)
        setListType(type)
        // const listDetailInfo = searchMusicState.listDetailInfo
        requestAnimationFrame(() => {
          listRef.current?.loadList(text, source)
        })
      } else {
        setShowListView(true)
        requestAnimationFrame(() => {
          blankViewRef.current?.show(source)
        })
      }
    },
  }), [onResult])

  return (
    showBlankView
      ? <BlankView ref={blankViewRef} onSearch={onSearch} />
      : listType == 'songlist'
        ? <SonglistList ref={listRef} />
        : <MusicList ref={listRef} onResult={onResult} />
  )
})
