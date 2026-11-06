import { memo } from 'react'
import { View } from 'react-native'
import { type ListInfoItem } from '@/store/songlist/state'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { useI18n } from '@/lang'
import { PlaylistCard, HeroCard } from '@/components/car'

export const getSonglistNativeId = (item: ListInfoItem) => `${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_from_${item.id}`

const useSubtitle = (item: ListInfoItem, showSource: boolean) => {
  const t = useI18n()
  const parts: string[] = []
  if (item.author) parts.push(item.author)
  if (item.play_count) parts.push(t('songlist_play_count', { num: item.play_count }))
  if (showSource) parts.push(item.source)
  return parts.join(' · ')
}

export interface ListItemProps {
  item: ListInfoItem
  index: number
  /** 卡片 dp 宽度 */
  width: number
  showSource: boolean
  onPress: (item: ListInfoItem, index: number) => void
  onPlay: (item: ListInfoItem, index: number) => void
}

export default memo(({ item, index, width, showSource, onPress, onPlay }: ListItemProps) => {
  const subtitle = useSubtitle(item, showSource)
  // 网格末行的占位项
  if (!item.source) return <View style={{ width }} />
  return (
    <PlaylistCard
      rawWidth={width}
      title={item.name}
      subtitle={subtitle}
      pic={item.img}
      nativeID={getSonglistNativeId(item)}
      onPress={() => { onPress(item, index) }}
      onPlay={() => { onPlay(item, index) }}
    />
  )
})

/** 歌单广场首张推荐大卡 */
export const FeaturedItem = memo(({ item, index, tag, showSource, onPress, onPlay }: Omit<ListItemProps, 'width'> & { tag: string }) => {
  const subtitle = useSubtitle(item, showSource)
  return (
    <HeroCard
      width={540}
      height={368}
      tagIcon="lucide-moon"
      tag={tag}
      title={item.name}
      titleSize={30}
      titleLines={2}
      subtitle={subtitle}
      pic={item.img}
      nativeID={getSonglistNativeId(item)}
      onPress={() => { onPress(item, index) }}
      onPlay={() => { onPlay(item, index) }}
    />
  )
})
