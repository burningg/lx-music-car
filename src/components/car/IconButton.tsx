import { forwardRef, memo } from 'react'
import { TouchableOpacity, type ColorValue, type StyleProp, type ViewStyle } from 'react-native'
import { px } from '@/utils/pixelRatio'
import CarIcon from './CarIcon'

export interface IconButtonProps {
  icon: string
  /** 图标尺寸 */
  iconSize?: number
  /** 可见按钮的布局尺寸；裸图标可用 touchSize 扩展触控区 */
  size?: number
  /** 圆角设计值，默认圆形 */
  radius?: number
  /** 最小触控尺寸，不参与布局 */
  touchSize?: number
  color?: ColorValue
  /** 圆形底色 */
  background?: ColorValue
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  onPress?: () => void
  onLongPress?: () => void
}

export default memo(forwardRef<TouchableOpacity, IconButtonProps>(({ icon, iconSize = 28, size = 64, radius = size / 2, touchSize = 64, color, background, disabled, style, onPress, onLongPress }, ref) => {
  const boxSize = px(size)
  const inset = Math.max(0, (px(touchSize) - boxSize) / 2)
  return (
    <TouchableOpacity
      ref={ref}
      activeOpacity={0.6}
      accessibilityRole="button"
      hitSlop={{ top: inset, bottom: inset, left: inset, right: inset }}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[{
        width: boxSize,
        height: boxSize,
        borderRadius: px(radius),
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
