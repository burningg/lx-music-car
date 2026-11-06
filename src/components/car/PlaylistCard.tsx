import { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import Image from '@/components/common/Image'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'
import CarText from './CarText'
import CarIcon from './CarIcon'

export interface PlaylistCardProps {
  /** 设计稿宽度，封面为正方形 */
  width?: number
  /** 直接指定 dp 宽度（网格按容器宽度计算时使用），优先于 width */
  rawWidth?: number
  title: string
  subtitle?: string
  pic?: string | null
  /** 共享元素转场锚点，必须直接落在 Image 上 */
  nativeID?: string
  onPress?: () => void
  onPlay?: () => void
}

// 设计稿 Playlist Card：封面圆角 20，右下角 52 圆形播放键，标题两行
export default memo(({ width = 300, rawWidth, title, subtitle, pic, nativeID, onPress, onPlay }: PlaylistCardProps) => {
  const theme = useTheme()
  const size = rawWidth ?? px(width)
  const playSize = px(52)
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{ width: size, gap: px(16) }}>
      <View>
        <Image url={pic} nativeID={nativeID} style={{ width: size, height: size, borderRadius: px(20) }} />
        {onPlay ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPlay}
            style={{
              position: 'absolute',
              right: px(16),
              bottom: px(16),
              width: playSize,
              height: playSize,
              borderRadius: playSize / 2,
              backgroundColor: 'rgba(10, 10, 12, 0.6)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CarIcon name="ph-play-fill" size={22} color="#F5F5F7" />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={{ gap: px(6) }}>
        <CarText size={19} weight="500" lineHeight={1.35} numberOfLines={2}>{title}</CarText>
        {subtitle ? <CarText size={14} numberOfLines={1} color={theme['text-3']}>{subtitle}</CarText> : null}
      </View>
    </TouchableOpacity>
  )
})
