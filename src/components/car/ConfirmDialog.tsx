import { memo } from 'react'
import { Pressable, TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'
import CarIcon from './CarIcon'
import CarText from './CarText'
import { type ConfirmOptions } from './overlay'

const DANGER = '#E5484D'

// 设计稿确认框：640 宽居中卡片，图标 + 标题 30/700 + 说明 18 + 双按钮
export default memo(({ options, onCancel, onConfirm }: {
  options: ConfirmOptions
  onCancel: () => void
  onConfirm: () => void
}) => {
  const theme = useTheme()
  const danger = options.danger ?? false
  const single = options.single ?? false
  const confirmColor = danger ? DANGER : theme.accent
  const confirmTextColor = danger ? '#FFFFFF' : theme['on-primary']
  const iconBg = danger ? '#FF4D4F24' : theme['accent-soft']
  const iconColor = danger ? '#FF4D4F' : theme.accent

  const buttonStyle = {
    flex: 1,
    height: px(68),
    borderRadius: px(20),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
      <Pressable
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        onPress={options.bgClose === false ? undefined : onCancel}
      />
      <View style={{
        width: px(640),
        minHeight: px(375),
        borderRadius: px(32),
        padding: px(40),
        gap: px(28),
        backgroundColor: theme.elevated,
        borderWidth: 1,
        borderColor: theme['art-stroke'],
        elevation: 24,
      }}>
        <View style={{ width: px(64), height: px(64), borderRadius: px(20), backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
          <CarIcon name={danger ? 'lucide-trash-2' : 'lucide-info'} size={30} color={iconColor} />
        </View>
        <View style={{ gap: px(12) }}>
          {options.title ? <CarText size={30} weight="700">{options.title}</CarText> : null}
          <CarText size={18} color={theme['text-2']} lineHeight={1.5}>{options.message}</CarText>
        </View>
        <View style={{ flexDirection: 'row', gap: px(14), marginTop: 'auto' }}>
          {single
            ? (
              <TouchableOpacity activeOpacity={0.8} onPress={onConfirm} style={{ ...buttonStyle, backgroundColor: confirmColor }}>
                <CarText size={20} weight="600" color={confirmTextColor}>{options.confirmButtonText}</CarText>
              </TouchableOpacity>
              )
            : (
              <>
                <TouchableOpacity activeOpacity={0.7} onPress={onCancel} style={{ ...buttonStyle, backgroundColor: theme['glass-strong'] }}>
                  <CarText size={20} weight="600">{options.cancelButtonText}</CarText>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} onPress={onConfirm} style={{ ...buttonStyle, backgroundColor: confirmColor }}>
                  <CarText size={20} weight="600" color={confirmTextColor}>{options.confirmButtonText}</CarText>
                </TouchableOpacity>
              </>
              )}
        </View>
      </View>
    </View>
  )
})
