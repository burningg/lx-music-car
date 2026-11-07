import { useEffect, useRef, useState } from 'react'
import { PanResponder, Pressable, View } from 'react-native'
import CarIcon from '@/components/car/CarIcon'
import SettingsText from '../Text'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { px } from '../scale'

interface SettingSliderProps {
  label: string
  value: number
  minimumValue: number
  maximumValue: number
  step: number
  formatValue?: (value: number) => string
  hint?: string
  hintValue?: number
  onReset?: () => void
  showRange?: boolean
  prominent?: boolean
  onValueChange: (value: number) => void
  onSlidingComplete: (value: number) => void
}

export const normalizeSettingValue = (value: number, min: number, max: number, step: number) => (
  Math.min(max, Math.max(min, min + Math.round((value - min) / step) * step))
)

/** Pen 滑杆：圆形微调按钮、6px 轨道、28px 滑块；声音页使用更宽松的行高。 */
export default (props: SettingSliderProps) => {
  const theme = useTheme()
  const t = useI18n()
  const [draft, setDraft] = useState<number | null>(null)
  const railWidth = useRef(0)
  const drag = useRef({ active: false, startX: 0, value: props.value })
  const latest = useRef(props)
  latest.current = props
  const current = draft ?? props.value
  const format = props.formatValue ?? String

  const change = (value: number, complete = false) => {
    const { minimumValue, maximumValue, step, onValueChange, onSlidingComplete } = latest.current
    value = normalizeSettingValue(value, minimumValue, maximumValue, step)
    drag.current.value = value
    setDraft(complete ? null : value)
    onValueChange(value)
    if (complete) onSlidingComplete(value)
  }
  const changeAt = (x: number) => {
    const { minimumValue, maximumValue } = latest.current
    const width = railWidth.current - px(28)
    if (width <= 0) return
    change(minimumValue + (x - px(14)) / width * (maximumValue - minimumValue))
  }
  const completeDrag = () => {
    if (!drag.current.active) return
    drag.current.active = false
    setDraft(null)
    latest.current.onSlidingComplete(drag.current.value)
  }
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => {
      drag.current.active = true
      drag.current.startX = event.nativeEvent.locationX
      drag.current.value = latest.current.value
      changeAt(drag.current.startX)
    },
    onPanResponderMove: (_, gesture) => { changeAt(drag.current.startX + gesture.dx) },
    onPanResponderRelease: completeDrag,
    onPanResponderTerminate: completeDrag,
    onPanResponderTerminationRequest: () => false,
  })).current

  // 返回键/旋转等中断拖动时，也保存最后一次已经生效的值。
  useEffect(() => () => {
    if (drag.current.active) latest.current.onSlidingComplete(drag.current.value)
  }, [])

  const adjust = (offset: number) => { change(current + offset, true) }
  const progress = Math.min(1, Math.max(0, (current - props.minimumValue) / (props.maximumValue - props.minimumValue)))

  return (
    <View style={{ gap: px(props.prominent ? 8 : 4) }}>
      <View style={{ minHeight: px(props.prominent ? 60 : 40), flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
        <SettingsText size={26} weight="500" lineHeight={1.4} style={{ flex: 1 }}>{props.label}</SettingsText>
        {props.onReset ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('play_detail_setting_playback_rate_reset')}
            onPress={props.onReset}
            style={({ pressed }) => ({ minWidth: px(96), minHeight: px(60), borderRadius: px(16), flexDirection: 'row', gap: px(8), alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
          >
            <CarIcon name="lucide-rotate-ccw" size={20} color={theme['text-2']} />
            <SettingsText size={18} weight="500" color={theme['text-2']}>{t('play_detail_setting_playback_rate_reset')}</SettingsText>
          </Pressable>
        ) : null}
        {props.hint && (props.hintValue == null || current == props.hintValue) ? <SettingsText size={14} color={theme['text-2']}>{props.hint}</SettingsText> : null}
        <SettingsText size={props.prominent ? 40 : 32} weight="600" num lineHeight={1.2}>{format(current)}</SettingsText>
      </View>
      <View style={{ minHeight: px(props.prominent ? 80 : 64), flexDirection: 'row', alignItems: 'center', gap: px(20) }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('play_detail_setting_decrease')} ${props.label}`}
          accessibilityState={{ disabled: current <= props.minimumValue }}
          disabled={current <= props.minimumValue}
          onPress={() => { adjust(-props.step) }}
          style={({ pressed }) => ({ width: px(64), height: px(64), borderRadius: px(32), alignItems: 'center', justifyContent: 'center', backgroundColor: theme.glass, opacity: pressed ? 0.6 : 1 })}
        >
          <CarIcon name="lucide-minus" size={26} color={theme['text-2']} />
        </Pressable>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={props.label}
          accessibilityValue={{ min: props.minimumValue, max: props.maximumValue, now: current, text: format(current) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName == 'increment') adjust(props.step)
            else if (nativeEvent.actionName == 'decrement') adjust(-props.step)
          }}
          style={{ flex: 1, height: px(64), justifyContent: 'center', paddingHorizontal: px(14) }}
          onLayout={({ nativeEvent }) => { railWidth.current = nativeEvent.layout.width }}
          {...responder.panHandlers}
        >
          <View pointerEvents="none" style={{ height: px(6), borderRadius: px(3), backgroundColor: theme['player-settings-track'] }}>
            <View style={{ height: '100%', width: `${progress * 100}%`, borderRadius: px(3), backgroundColor: theme.accent }} />
            <View style={{ position: 'absolute', left: `${progress * 100}%`, top: -px(11), marginLeft: -px(14), width: px(28), height: px(28), borderRadius: px(14), backgroundColor: theme.accent, elevation: 4, shadowColor: theme['shadow-soft'], shadowOpacity: 1, shadowRadius: px(8), shadowOffset: { width: 0, height: px(2) } }} />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('play_detail_setting_increase')} ${props.label}`}
          accessibilityState={{ disabled: current >= props.maximumValue }}
          disabled={current >= props.maximumValue}
          onPress={() => { adjust(props.step) }}
          style={({ pressed }) => ({ width: px(64), height: px(64), borderRadius: px(32), alignItems: 'center', justifyContent: 'center', backgroundColor: theme.glass, opacity: pressed ? 0.6 : 1 })}
        >
          <CarIcon name="lucide-plus" size={26} color={theme['text-2']} />
        </Pressable>
      </View>
      {props.showRange ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: px(80) }}>
          <SettingsText size={14} num color={theme['text-2']} lineHeight={1.2}>{format(props.minimumValue)}</SettingsText>
          <SettingsText size={14} num color={theme['text-2']} lineHeight={1.2}>{format(props.maximumValue)}</SettingsText>
        </View>
      ) : null}
    </View>
  )
}
