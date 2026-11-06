import { getSongListSetting, saveSongListSetting } from '@/utils/data'
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { useI18n } from '@/lang'
import { px } from '@/utils/pixelRatio'
import HeaderBar, { type HeaderBarProps, type HeaderBarType } from './HeaderBar'
import songlistState, { type InitState, type SortInfo } from '@/store/songlist/state'
import List, { type ListType } from './List'


interface SonglistInfo {
  source: InitState['sources'][number]
  sortId: SortInfo['id']
  tagId: string
  tagName: string
}

// 推荐大卡标签：「排序 · 标签」，未选标签时只显示排序
const useFeaturedTag = (info: SonglistInfo | null) => {
  const t = useI18n()
  if (!info) return ''
  const sort = songlistState.sortList[info.source]?.find(s => s.id == info.sortId)
  return [sort ? t(`songlist_${sort.tid}`) : '', info.tagName].filter(Boolean).join(' · ')
}

// 设计稿歌单广场：内边距 44/0/0/72（右侧不留白，书架横向滚出屏幕），顶栏与书架间距 36
export default () => {
  const headerBarRef = useRef<HeaderBarType>(null)
  const listRef = useRef<ListType>(null)
  const songlistInfo = useRef<SonglistInfo>({ source: 'kw', sortId: '5', tagId: '', tagName: '' })
  const [tagInfo, setTagInfo] = useState<SonglistInfo | null>(null)
  const featuredTag = useFeaturedTag(tagInfo)
  const updateTagInfo = () => {
    setTagInfo({ ...songlistInfo.current })
  }

  useEffect(() => {
    void getSongListSetting().then(info => {
      songlistInfo.current.source = info.source
      songlistInfo.current.sortId = info.sortId
      songlistInfo.current.tagId = info.tagId
      songlistInfo.current.tagName = info.tagName
      updateTagInfo()
      headerBarRef.current?.setSource(info.source, info.sortId, info.tagName, info.tagId)
      listRef.current?.loadList(info.source, info.sortId, info.tagId)
    })
  }, [])

  const handleSortChange: HeaderBarProps['onSortChange'] = (id) => {
    songlistInfo.current.sortId = id
    updateTagInfo()
    void saveSongListSetting({ sortId: id })
    listRef.current?.loadList(songlistInfo.current.source, id, songlistInfo.current.tagId)
  }

  const handleTagChange: HeaderBarProps['onTagChange'] = (name, id) => {
    songlistInfo.current.tagId = id
    songlistInfo.current.tagName = name
    updateTagInfo()
    void saveSongListSetting({ tagName: name, tagId: id })
    listRef.current?.loadList(songlistInfo.current.source, songlistInfo.current.sortId, id)
  }

  const handleSourceChange: HeaderBarProps['onSourceChange'] = (source) => {
    songlistInfo.current.source = source
    songlistInfo.current.tagId = ''
    songlistInfo.current.tagName = ''
    songlistInfo.current.sortId = songlistState.sortList[source]![0].id
    updateTagInfo()
    void saveSongListSetting({ sortId: songlistInfo.current.sortId, source, tagId: '', tagName: '' })
    headerBarRef.current?.setSource(source, songlistInfo.current.sortId, '', songlistInfo.current.tagId)
    listRef.current?.loadList(source, songlistInfo.current.sortId, songlistInfo.current.tagId)
  }

  const handleRefresh = () => {
    listRef.current?.refresh()
  }

  return (
    <View style={{ flex: 1, paddingTop: px(44), paddingLeft: px(72), gap: px(36) }}>
      <HeaderBar
        ref={headerBarRef}
        onSortChange={handleSortChange}
        onTagChange={handleTagChange}
        onSourceChange={handleSourceChange}
        onRefresh={handleRefresh}
      />
      <List ref={listRef} featuredTag={featuredTag} />
    </View>
  )
}
