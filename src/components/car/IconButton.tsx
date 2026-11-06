import { forwardRef, memo } from 'react'
import { TouchableOpacity, type ColorValue, type StyleProp, type ViewStyle } from 'react-native'
import { px } from '@/utils/pixelRatio'
import CarIcon from './CarIcon'

export interface IconButtonProps {
  icon: string
  /** 图标尺寸 */
  iconSize?: number
  /** 触控区尺寸，设计稿最小 64 */
  size?: number
  color?: ColorValue
  /** 圆形底色 */
  background?: ColorValue
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  onPress?: () => void
  onLongPress?: () => void
}

export default memo(forwardRef<TouchableOpacity, IconButtonProps>(({ icon, iconSize = 28, size = 64, color, background, disabled, style, onPress, onLongPress }, ref) => {
  const boxSize = px(size)
  return (
    <TouchableOpacity
      ref={ref}
      activeOpacity={0.6}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[{
        width: boxSize,
        height: boxSize,
        borderRadius: boxSize / 2,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }, style]}
    >
      <CarIcon name={icon} size={iconSize} color={color} />
    </TouchableOpacity>
  )
}))
