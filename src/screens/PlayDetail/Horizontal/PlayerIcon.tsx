/* eslint-disable @typescript-eslint/no-var-requires */
import { Image, type ColorValue, type ImageSourcePropType } from 'react-native'
import { CarIcon } from '@/components/car'
import { px } from '@/utils/pixelRatio'

// Pen 的 Phosphor regular 图标；保留原始 SVG，128px PNG 供原生 Image 着色。
const icons: Record<string, ImageSourcePropType> = {
  'ph-shuffle': require('@/resources/images/player/shuffle.png'),
  'ph-repeat': require('@/resources/images/player/repeat.png'),
  'ph-queue': require('@/resources/images/player/queue.png'),
  'ph-corners-out': require('@/resources/images/player/corners-out.png'),
}

export default ({ name, size = 32, color }: { name: string, size?: number, color?: ColorValue }) => {
  const source = icons[name]
  return source
    ? <Image source={source} tintColor={color} resizeMode="contain" style={{ width: px(size), height: px(size) }} />
    : <CarIcon name={name} size={size} color={color} />
}
