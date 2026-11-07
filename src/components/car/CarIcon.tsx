import { memo } from 'react'
import type { ColorValue, StyleProp, TextStyle } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'
import useWindowSize from '@/utils/hooks/useWindowSize'

export interface CarIconProps {
  /** icomoon 图标名，设计稿图标为 lucide-* / ph-* / ms-* */
  name: string
  /** 设计稿尺寸 */
  size?: number
  color?: ColorValue
  style?: StyleProp<TextStyle>
}

export default memo(({ name, size = 24, color, style }: CarIconProps) => {
  // memo 不会因 px() 的缩放缓存变化而刷新，必须订阅窗口尺寸。
  useWindowSize()
  const theme = useTheme()
  return <Icon name={name} rawSize={px(size)} color={(color ?? theme['text-1']) as string} style={style} />
})
