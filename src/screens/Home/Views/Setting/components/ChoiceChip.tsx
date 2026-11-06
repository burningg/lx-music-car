import { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { type CheckBoxProps } from '@/components/common/CheckBox'
import { useTheme } from '@/store/theme/hook'
import { CarText, CarIcon } from '@/components/car'
import { px } from '@/utils/pixelRatio'

/**
 * 设置里的单选项，接口与 CheckBox 一致，可直接替换导入
 * - 传 label：渲染为胶囊（设计稿「界面字号」分段样式）
 * - 传 children：渲染为整行单选，用于带说明文字的选项
 */
export default memo(({ check, label, children, onChange, disabled, need }: CheckBoxProps) => {
  const theme = useTheme()
  const handlePress = () => {
    if (need && check) return
    onChange(!check)
  }

  if (!label) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        disabled={disabled}
        onPress={handlePress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: px(16),
          minHeight: px(56),
          paddingHorizontal: px(16),
          borderRadius: px(14),
          backgroundColor: check ? theme['accent-soft'] : undefined,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <View style={{ flex: 1 }}>{children}</View>
        {check ? <CarIcon name="lucide-check" size={22} color={theme.accent} /> : null}
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={handlePress}
      style={{
        marginRight: px(8),
        marginBottom: px(8),
        paddingVertical: px(9),
        paddingHorizontal: px(24),
        minHeight: px(44),
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: check ? theme['badge-stroke'] : theme.hairline,
        backgroundColor: check ? theme.elevated : theme.glass,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <CarText size={17} weight={check ? '600' : '400'} color={check ? theme['text-1'] : theme['text-2']}>{label}</CarText>
    </TouchableOpacity>
  )
})
