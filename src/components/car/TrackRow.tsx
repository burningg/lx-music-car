import { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import Image from '@/components/common/Image'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'
import CarText from './CarText'
import CarIcon from './CarIcon'
import IconButton from './IconButton'

/** 行高固定，供 FlatList getItemLayout 使用 */
export const TRACK_ROW_HEIGHT = 76

export interface TrackRowProps {
  index: number
  title: string
  artist: string
  pic?: string | null
  /** 音质标签，如「无损」 */
  badge?: string
  duration?: string
  playing?: boolean
  selectMode?: boolean
  selected?: boolean
  onPress?: () => void
  onLongPress?: () => void
  onMore?: () => void
}

// 设计稿 Track Row：高 76，内边距 0/20，间距 20，圆角 16
export default memo(({ index, title, artist, pic, badge, duration, playing, selectMode, selected, onPress, onLongPress, onMore }: TrackRowProps) => {
  const theme = useTheme()
  const backgroundColor = selected ? theme['accent-soft'] : playing ? theme.glass : undefined

  let lead
  if (selectMode) {
    lead = (
      <View style={{
        width: px(28),
        height: px(28),
        borderRadius: px(9),
        borderWidth: 2,
        borderColor: selected ? theme.accent : theme['text-3'],
        backgroundColor: selected ? theme.accent : undefined,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {selected ? <CarIcon name="lucide-check" size={18} color={theme['on-primary']} /> : null}
      </View>
    )
  } else if (playing) {
    lead = <CarIcon name="lucide-audio-lines" size={24} color={theme.accent} />
  } else {
    lead = <CarText size={17} weight="500" num color={theme['text-3']}>{String(index + 1).padStart(2, '0')}</CarText>
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        height: px(TRACK_ROW_HEIGHT),
        flexDirection: 'row',
        alignItems: 'center',
        gap: px(20),
        paddingHorizontal: px(20),
        borderRadius: px(16),
        backgroundColor,
      }}
    >
      <View style={{ width: px(28), alignItems: 'center' }}>{lead}</View>
      <Image url={pic} style={{ width: px(52), height: px(52), borderRadius: px(10) }} />
      <View style={{ flex: 1, gap: px(3) }}>
        <CarText size={19} weight="500" numberOfLines={1} color={playing ? theme.accent : theme['text-1']}>{title}</CarText>
        <CarText size={15} numberOfLines={1} color={theme['text-2']}>{artist}</CarText>
      </View>
      {badge ? (
        <View style={{ paddingVertical: px(3), paddingHorizontal: px(7), borderRadius: px(5), borderWidth: 1, borderColor: theme['badge-stroke'] }}>
          <CarText size={12} weight="600" color={theme['text-3']}>{badge}</CarText>
        </View>
      ) : null}
      {duration ? <CarText size={16} num color={theme['text-3']}>{duration}</CarText> : null}
      {onMore && !selectMode ? <IconButton icon="lucide-ellipsis" iconSize={24} size={52} color={theme['text-3']} onPress={onMore} /> : null}
    </TouchableOpacity>
  )
})
