import { memo } from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'

export interface ToggleProps {
  value: boolean
  disabled?: boolean
  onChange?: (value: boolean) => void
}

// 设计稿 Toggle：64×36，内边距 4，圆钮 28
export default memo(({ value, disabled, onChange }: ToggleProps) => {
  const theme = useTheme()
  const knob = px(28)
  return (
    <Pressable
      disabled={disabled}
      hitSlop={px(14)}
      onPress={() => onChange?.(!value)}
      style={{
        width: px(64),
        height: px(36),
        padding: px(4),
        borderRadius: px(18),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: value ? 'flex-end' : 'flex-start',
        backgroundColor: value ? theme.accent : theme['track-bg'],
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <View style={{ width: knob, height: knob, borderRadius: knob / 2, backgroundColor: '#FFFFFF', elevation: 2 }} />
    </Pressable>
  )
})
