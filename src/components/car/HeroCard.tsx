/* eslint-disable @typescript-eslint/no-var-requires */
import { memo } from 'react'
import { Image as RNImage, TouchableOpacity, View } from 'react-native'
import Image from '@/components/common/Image'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'
import CarText from './CarText'
import CarIcon from './CarIcon'

const FADE_V = require('@/resources/images/ambient/fade-v.png')

export interface HeroCardProps {
  width?: number
  height?: number
  pic?: string | null
  tagIcon?: string
  tag?: string
  title: string
  subtitle?: string
  onPress?: () => void
  onPlay?: () => void
}

// 设计稿「最佳匹配」大卡：封面铺满，底部压暗，左上标签，左下标题，右下 72 圆形播放键
// 卡片压在封面上，文字固定用浅色，不随日夜主题变化
export default memo(({ width = 480, height = 358, pic, tagIcon = 'lucide-sparkles', tag, title, subtitle, onPress, onPlay }: HeroCardProps) => {
  const theme = useTheme()
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{ width: px(width), height: px(height), borderRadius: px(24), borderWidth: 1, borderColor: theme['art-stroke'], overflow: 'hidden' }}
    >
      <Image url={pic} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} />
      <RNImage source={FADE_V} tintColor="#000000" resizeMode="stretch" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%', opacity: 0.75 }} />
      <View style={{ flex: 1, padding: px(32), justifyContent: 'space-between' }}>
        {tag ? (
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: px(8), paddingVertical: px(7), paddingHorizontal: px(14), borderRadius: 999, backgroundColor: 'rgba(10, 10, 12, 0.5)' }}>
            <CarIcon name={tagIcon} size={16} color="#FF7A50" />
            <CarText size={15} weight="600" color="#F5F5F7">{tag}</CarText>
          </View>
        ) : <View />}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: px(20) }}>
          <View style={{ flex: 1, gap: px(8) }}>
            <CarText size={40} weight="700" color="#F5F5F7" numberOfLines={1}>{title}</CarText>
            {subtitle ? <CarText size={17} color="rgba(255, 255, 255, 0.7)" numberOfLines={1}>{subtitle}</CarText> : null}
          </View>
          {onPlay ? (
            <TouchableOpacity activeOpacity={0.7} onPress={onPlay} style={{ width: px(72), height: px(72), borderRadius: px(36), backgroundColor: '#F5F5F7', alignItems: 'center', justifyContent: 'center' }}>
              <CarIcon name="ph-play-fill" size={30} color="#08080A" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  )
})
