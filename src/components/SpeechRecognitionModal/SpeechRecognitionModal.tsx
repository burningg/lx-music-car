import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native'
import CarText from '@/components/car/CarText'
import IconButton from '@/components/car/IconButton'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import useWindowSize from '@/utils/hooks/useWindowSize'
import { px } from '@/utils/pixelRatio'
import useSpeechRecognition from './useSpeechRecognition'

export interface SpeechRecognitionModalProps {
  onResult: (text: string) => void
  onRecognizingChange?: (isRecognizing: boolean) => void
  prompt?: string
  hint?: string
  contentInsetLeft?: number
}

export interface SpeechRecognitionModalType {
  start: ReturnType<typeof useSpeechRecognition>['start']
  cancel: () => void
}

const audioLevels = [10, 20, 28, 18, 10]

// U5jSt：720 × 344 的轻量弹框；识别结果和内容区偏移均由调用方接收/提供。
export default forwardRef<SpeechRecognitionModalType, SpeechRecognitionModalProps>(({ onResult, onRecognizingChange, prompt, hint, contentInsetLeft = 0 }, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const { width } = useWindowSize()
  const { isRecognizing, isPreparing, isProcessing, start, cancel } = useSpeechRecognition(onResult)

  useImperativeHandle(ref, () => ({ start, cancel }), [start, cancel])
  useEffect(() => {
    onRecognizingChange?.(isRecognizing)
  }, [isRecognizing, onRecognizingChange])
  const isBusy = isPreparing || isProcessing

  return (
    <Modal
      visible={isRecognizing}
      transparent
      animationType="fade"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={cancel}
    >
      <View style={{ flex: 1, paddingLeft: contentInsetLeft, paddingVertical: px(24), alignItems: 'center', justifyContent: 'center' }}>
        <View accessible={false} style={[StyleSheet.absoluteFillObject, { backgroundColor: theme['voice-scrim'] }]} />
        <View
          accessibilityViewIsModal
          style={{
            width: Math.min(px(720), width - contentInsetLeft - px(48)),
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
                {t(isPreparing ? 'speech_recognition_preparing' : isProcessing ? 'speech_recognition_processing' : 'speech_recognition_listening_title')}
              </CarText>
            </View>
            <IconButton icon="lucide-x" iconSize={24} size={64} radius={12} color={theme['text-2']} accessibilityLabel={t('speech_recognition_cancel')} onPress={cancel} />
          </View>
          <View style={{ flexGrow: 1, minHeight: px(192), justifyContent: 'center', gap: px(14) }}>
            {/* 离线引擎只返回最终结果，不把设计稿示例文字冒充为实时转写。 */}
            <CarText size={38} weight="500" lineHeight={1.35}>{prompt ?? t('speech_recognition_listening')}</CarText>
            <CarText size={20} lineHeight={1.4} color={theme['text-2']}>{hint ?? t('speech_recognition_hint')}</CarText>
          </View>
          <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: px(24), borderWidth: px(1), borderColor: theme.hairline }]} />
        </View>
      </View>
    </Modal>
  )
})
