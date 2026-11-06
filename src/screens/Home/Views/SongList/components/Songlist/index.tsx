import { useRef, forwardRef, useImperativeHandle } from 'react'
import { type ListInfoItem } from '@/store/songlist/state'
import List, { type ListProps, type ListType, type Status } from './List'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import { handlePlay } from '@/screens/SonglistDetail/listAction'

export interface SonglistProps {
  layout?: ListProps['layout']
  featuredTag?: ListProps['featuredTag']
  onRefresh: ListProps['onRefresh']
  onLoadMore: ListProps['onLoadMore']
}
export interface SonglistType {
  setList: (list: ListInfoItem[], showSource?: boolean) => void
  setStatus: (val: Status) => void
}

const handleOpenDetail = (item: ListInfoItem) => {
  navigations.pushSonglistDetailScreen(commonState.componentIds.home!, item)
}
const handlePlaySonglist = (item: ListInfoItem) => {
  void handlePlay(item.id, item.source)
}

export default forwardRef<SonglistType, SonglistProps>(({
  layout,
  featuredTag,
  onRefresh,
  onLoadMore,
}, ref) => {
  const listRef = useRef<ListType>(null)

  useImperativeHandle(ref, () => ({
    setList(list, showSource) {
      listRef.current?.setList(list, showSource)
    },
    setStatus(val) {
      listRef.current?.setStatus(val)
    },
  }))

  return (
    <List
      ref={listRef}
      layout={layout}
      featuredTag={featuredTag}
      onRefresh={onRefresh}
      onLoadMore={onLoadMore}
      onOpenDetail={handleOpenDetail}
      onPlay={handlePlaySonglist}
    />
  )
})
