import { TouchableOpacity, type ColorValue } from 'react-native'
import { CarText } from '@/components/car'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'
import PlayerIcon from './PlayerIcon'

export interface ActionButtonProps {
  icon: string
  label: string
  labelSize?: number
  color?: ColorValue
  labelColor?: ColorValue
  active?: boolean
  selected?: boolean
  onPress: () => void
  onLongPress?: () => void
  accessibilityHint?: string
}

/** Pen 底部带标签操作：96×88，圆角 20，32px 图标。 */
export default ({ icon, label, labelSize = 22, color, labelColor, active, selected, onPress, onLongPress, accessibilityHint }: ActionButtonProps) => {
  const theme = useTheme()
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.65}
      style={{ width: px(96), height: px(88), flexShrink: 0, borderRadius: px(20), padding: px(8), gap: px(6), alignItems: 'center', justifyContent: 'center', backgroundColor: active ? theme['accent-soft'] : undefined }}
    >
      <PlayerIcon name={icon} size={32} color={color ?? theme['text-2']} />
      <CarText size={labelSize} weight="500" lineHeight={1.4} color={labelColor ?? theme['text-2']} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{label}</CarText>
    </TouchableOpacity>
  )
}
