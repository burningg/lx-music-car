import { memo } from 'react'
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native'
import { CarText, IconButton, NAV_RAIL_WIDTH } from '@/components/car'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import useWindowSize from '@/utils/hooks/useWindowSize'
import { px } from '@/utils/pixelRatio'

export interface VoiceSearchModalProps {
  visible: boolean
  isPreparing: boolean
  isProcessing: boolean
  onCancel: () => void
  prompt?: string
  hint?: string
}

const audioLevels = [10, 20, 28, 18, 10]

// U5jSt：720 × 344 的轻量弹框，在横屏主内容区域（扣除公共导航栏）居中。
export default memo(({ visible, isPreparing, isProcessing, onCancel, prompt, hint }: VoiceSearchModalProps) => {
  const t = useI18n()
  const theme = useTheme()
  const { width, height } = useWindowSize()
  const railWidth = width > height ? px(NAV_RAIL_WIDTH) : 0
  const isBusy = isPreparing || isProcessing

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={onCancel}
    >
      <View style={{ flex: 1, paddingLeft: railWidth, paddingVertical: px(24), alignItems: 'center', justifyContent: 'center' }}>
        <View accessible={false} style={[StyleSheet.absoluteFillObject, { backgroundColor: theme['voice-scrim'] }]} />
        <View
          accessibilityViewIsModal
          style={{
            width: Math.min(px(720), width - railWidth - px(48)),
            minHeight: px(344),
            borderRadius: px(24),
            backgroundColor: theme.surface,
            paddingTop: px(28),
            paddingRight: px(32),
            paddingBottom: px(40),
            paddingLeft: px(40),
            gap: px(20),
          }}
        >
          <View style={{ minHeight: px(64), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: px(16) }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: px(16) }}>
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                style={{ width: px(56), height: px(56), borderRadius: px(18), backgroundColor: theme['accent-soft'], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: px(4) }}
              >
                {isBusy ? <ActivityIndicator size={px(24)} color={theme.accent} /> : audioLevels.map((level, index) => (
                  <View key={index} style={{ width: px(4), height: px(level), borderRadius: px(2), backgroundColor: theme.accent }} />
                ))}
              </View>
              <CarText size={24} weight="500" lineHeight={1.4} accessibilityRole="header" accessibilityLiveRegion="polite" style={{ flex: 1 }}>
                {t(isPreparing ? 'search_voice_preparing' : isProcessing ? 'search_voice_processing' : 'search_voice_listening_title')}
              </CarText>
            </View>
            <IconButton icon="lucide-x" iconSize={24} size={64} radius={12} color={theme['text-2']} accessibilityLabel={t('search_voice_cancel')} onPress={onCancel} />
          </View>
          <View style={{ flexGrow: 1, minHeight: px(192), justifyContent: 'center', gap: px(14) }}>
            {/* 离线引擎只返回最终结果，不把设计稿示例文字冒充为实时转写。 */}
            <CarText size={38} weight="500" lineHeight={1.35}>{prompt ?? t('search_voice_listening')}</CarText>
            <CarText size={20} lineHeight={1.4} color={theme['text-2']}>{hint ?? t('search_voice_fill_hint')}</CarText>
          </View>
          <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: px(24), borderWidth: px(1), borderColor: theme.hairline }]} />
        </View>
      </View>
    </Modal>
  )
})
