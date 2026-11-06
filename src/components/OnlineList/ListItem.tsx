import { memo } from 'react'
import { View } from 'react-native'
import { useI18n } from '@/lang'
import { TrackRow, TRACK_ROW_HEIGHT, TRACK_ROW_GAP, TRACK_ROW_LARGE_HEIGHT, type TrackRowProps } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import useTrackCover from './useTrackCover'

/** 行高 + 行间距，供 getItemLayout 使用 */
export const getItemHeight = (size: TrackRowProps['size'] = 'default') => px((size == 'large' ? TRACK_ROW_LARGE_HEIGHT : TRACK_ROW_HEIGHT) + TRACK_ROW_GAP)
export const ITEM_HEIGHT = getItemHeight()

const useQualityTag = (musicInfo: LX.Music.MusicInfoOnline) => {
  const t = useI18n()
  if (musicInfo.meta._qualitys.flac24bit) return t('quality_lossless_24bit')
  if (musicInfo.meta._qualitys.flac ?? musicInfo.meta._qualitys.ape) return t('quality_lossless')
  if (musicInfo.meta._qualitys['320k']) return t('quality_high_quality')
  return undefined
}

export default memo(({ trackRowSize = 'default', item, index, showSource, onPress, onLongPress, onShowMenu, selectedList, isMultiSelectMode, playingId, isShowAlbumName, isShowInterval }: {
  trackRowSize?: TrackRowProps['size']
  item: LX.Music.MusicInfoOnline
  index: number
  showSource?: boolean
  onPress: (item: LX.Music.MusicInfoOnline, index: number) => void
  onLongPress: (item: LX.Music.MusicInfoOnline, index: number) => void
  onShowMenu: (item: LX.Music.MusicInfoOnline, index: number, position: { x: number, y: number, w: number, h: number }) => void
  selectedList: LX.Music.MusicInfoOnline[]
  isMultiSelectMode: boolean
  playingId: string | null
  isShowAlbumName: boolean
  isShowInterval: boolean
}) => {
  const badge = useQualityTag(item)
  const pic = useTrackCover(item)
  let artist = item.singer
  if (isShowAlbumName && item.meta.albumName) artist += ` · ${item.meta.albumName}`
  if (showSource) artist += ` · ${item.source}`

  return (
    <View style={{ height: getItemHeight(trackRowSize), paddingBottom: px(TRACK_ROW_GAP) }}>
      <TrackRow
        size={trackRowSize}
        index={index}
        title={item.name}
        artist={artist}
        pic={pic}
        badge={badge}
        duration={isShowInterval ? item.interval ?? undefined : undefined}
        playing={playingId == item.id}
        selectMode={isMultiSelectMode}
        selected={selectedList.includes(item)}
        onPress={() => { onPress(item, index) }}
        onLongPress={() => { onLongPress(item, index) }}
        onMore={(position) => { onShowMenu(item, index, position) }}
      />
    </View>
  )
}, (prevProps, nextProps) => {
  return !!(prevProps.trackRowSize === nextProps.trackRowSize &&
    prevProps.item === nextProps.item &&
    prevProps.index === nextProps.index &&
    prevProps.showSource === nextProps.showSource &&
    prevProps.isShowAlbumName === nextProps.isShowAlbumName &&
    prevProps.isShowInterval === nextProps.isShowInterval &&
    prevProps.isMultiSelectMode === nextProps.isMultiSelectMode &&
    (prevProps.playingId == prevProps.item.id) === (nextProps.playingId == nextProps.item.id) &&
    nextProps.selectedList.includes(nextProps.item) == prevProps.selectedList.includes(nextProps.item)
  )
})
