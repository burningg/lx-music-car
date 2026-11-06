import { memo } from 'react'
import { View } from 'react-native'
import { TrackRow, TRACK_ROW_HEIGHT, TRACK_ROW_GAP } from '@/components/car'
import { px } from '@/utils/pixelRatio'

export const ITEM_HEIGHT = px(TRACK_ROW_HEIGHT + TRACK_ROW_GAP)

export default memo(({ item, index, activeIndex, onPress, onShowMenu, onLongPress, selectedList, isMultiSelectMode, isShowAlbumName, isShowInterval }: {
  item: LX.Music.MusicInfo
  index: number
  activeIndex: number
  onPress: (item: LX.Music.MusicInfo, index: number) => void
  onLongPress: (item: LX.Music.MusicInfo, index: number) => void
  onShowMenu: (item: LX.Music.MusicInfo, index: number, position: { x: number, y: number, w: number, h: number }) => void
  selectedList: LX.List.ListMusics
  isMultiSelectMode: boolean
  isShowAlbumName: boolean
  isShowInterval: boolean
}) => {
  let artist = item.singer
  if (isShowAlbumName && item.meta.albumName) artist += ` · ${item.meta.albumName}`

  return (
    <View style={{ height: ITEM_HEIGHT, paddingBottom: px(TRACK_ROW_GAP) }}>
      <TrackRow
        index={index}
        title={item.name}
        artist={artist}
        pic={item.meta.picUrl}
        duration={isShowInterval ? item.interval ?? undefined : undefined}
        playing={activeIndex == index}
        selectMode={isMultiSelectMode}
        selected={selectedList.includes(item)}
        onPress={() => { onPress(item, index) }}
        onLongPress={() => { onLongPress(item, index) }}
        onMore={(position) => { onShowMenu(item, index, position) }}
      />
    </View>
  )
}, (prevProps, nextProps) => {
  return !!(prevProps.item === nextProps.item &&
    prevProps.index === nextProps.index &&
    prevProps.isShowAlbumName === nextProps.isShowAlbumName &&
    prevProps.isShowInterval === nextProps.isShowInterval &&
    prevProps.isMultiSelectMode === nextProps.isMultiSelectMode &&
    prevProps.activeIndex != nextProps.index &&
    nextProps.activeIndex != nextProps.index &&
    nextProps.selectedList.includes(nextProps.item) == prevProps.selectedList.includes(prevProps.item)
  )
})
