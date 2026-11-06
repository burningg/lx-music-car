import { memo, type ReactNode } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'
import CarText from './CarText'
import Toggle from './Toggle'

export interface SettingRowProps {
  title: string
  desc?: string
  /** 右侧控件；传 toggle 时自动渲染开关 */
  right?: ReactNode
  toggle?: { value: boolean, onChange: (value: boolean) => void }
  disabled?: boolean
  onPress?: () => void
}

// 设计稿 Setting Row：内边距 18/28，间距 24，圆角 18
export default memo(({ title, desc, right, toggle, disabled, onPress }: SettingRowProps) => {
  const theme = useTheme()
  const handlePress = toggle ? () => { toggle.onChange(!toggle.value) } : onPress
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled ?? !handlePress}
      onPress={handlePress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: px(24),
        paddingVertical: px(18),
        paddingHorizontal: px(28),
        borderRadius: px(18),
        minHeight: px(72),
      }}
    >
      <View style={{ flex: 1, gap: px(4) }}>
        <CarText size={20} weight="500">{title}</CarText>
        {desc ? <CarText size={15} color={theme['text-2']}>{desc}</CarText> : null}
      </View>
      {toggle ? <Toggle value={toggle.value} disabled={disabled} onChange={toggle.onChange} /> : right}
    </TouchableOpacity>
  )
})
