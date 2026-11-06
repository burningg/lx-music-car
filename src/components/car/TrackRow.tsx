import { memo, useRef } from 'react'
import { TouchableOpacity, View } from 'react-native'
import Image from '@/components/common/Image'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'
import CarText from './CarText'
import CarIcon from './CarIcon'
import IconButton from './IconButton'

/** 行高固定，供 FlatList getItemLayout 使用 */
export const TRACK_ROW_HEIGHT = 92
export const TRACK_ROW_GAP = 12
export const TRACK_ROW_LARGE_HEIGHT = 112

/** 更多按钮在屏幕上的位置，用于弹出菜单定位 */
export interface TrackRowMorePosition { x: number, y: number, w: number, h: number }

export interface TrackRowProps {
  /** 详情页使用大号触控行，其他列表保留原尺寸。 */
  size?: 'default' | 'large'
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
  onMore?: (position: TrackRowMorePosition) => void
}

// 设计稿 Track Row：高 92，内边距 0/20，间距 20，圆角 16
export default memo(({ size = 'default', index, title, artist, pic, badge, duration, playing, selectMode, selected, onPress, onLongPress, onMore }: TrackRowProps) => {
  const theme = useTheme()
  const large = size == 'large'
  const moreRef = useRef<TouchableOpacity>(null)
  const handleMore = () => {
    moreRef.current?.measure((fx, fy, width, height, pageX, pageY) => {
      onMore?.({ x: Math.ceil(pageX), y: Math.ceil(pageY), w: Math.ceil(width), h: Math.ceil(height) })
    })
  }
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
    lead = <CarIcon name="lucide-audio-lines" size={large ? 28 : 24} color={theme.accent} />
  } else {
    lead = <CarText size={large ? 20 : 17} weight="500" num color={theme['text-3']}>{String(index + 1).padStart(2, '0')}</CarText>
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        height: px(large ? TRACK_ROW_LARGE_HEIGHT : TRACK_ROW_HEIGHT),
        flexDirection: 'row',
        alignItems: 'center',
        gap: px(large ? 22 : 20),
        paddingHorizontal: px(large ? 22 : 20),
        borderRadius: px(large ? 20 : 16),
        backgroundColor,
      }}
    >
      <View style={{ width: px(large ? 36 : 28), alignItems: 'center' }}>{lead}</View>
      <Image
        url={pic}
        style={{ width: px(large ? 72 : 60), height: px(large ? 72 : 60), borderRadius: px(large ? 16 : 10) }}
        fallback={(
          <View style={{ width: px(large ? 72 : 60), height: px(large ? 72 : 60), borderRadius: px(large ? 16 : 10), backgroundColor: theme['glass-strong'], alignItems: 'center', justifyContent: 'center' }}>
            <CarIcon name="lucide-list-music" size={large ? 32 : 28} color={theme['text-3']} />
          </View>
        )}
      />
      <View style={{ flex: 1, gap: px(large ? 6 : 3) }}>
        <CarText size={large ? 25 : 19} weight="500" numberOfLines={1} color={playing ? theme.accent : theme['text-1']}>{title}</CarText>
        <CarText size={large ? 19 : 15} numberOfLines={1} color={theme['text-2']}>{artist}</CarText>
      </View>
      {badge ? (
        <View style={{ paddingVertical: px(3), paddingHorizontal: px(7), borderRadius: px(5), borderWidth: 1, borderColor: theme['badge-stroke'] }}>
          <CarText size={large ? 16 : 12} weight="600" color={theme['text-3']}>{badge}</CarText>
        </View>
      ) : null}
      {duration ? <CarText size={large ? 20 : 16} num color={theme['text-3']}>{duration}</CarText> : null}
      {onMore && !selectMode ? <IconButton ref={moreRef} icon="lucide-ellipsis" iconSize={large ? 28 : 24} size={large ? 48 : 24} touchSize={64} color={theme['text-3']} onPress={handleMore} /> : null}
    </TouchableOpacity>
  )
})
