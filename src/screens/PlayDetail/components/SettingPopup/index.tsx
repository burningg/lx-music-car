import { forwardRef, useImperativeHandle, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { type PopupProps } from '@/components/common/Popup'
import CarIcon from '@/components/car/CarIcon'
import SettingsText from './Text'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { px } from './scale'
import SettingLyricProgress from './settings/SettingLyricProgress'
import SettingVolume from './settings/SettingVolume'
import SettingPlaybackRate from './settings/SettingPlaybackRate'
import SettingLrcFontSize from './settings/SettingLrcFontSize'
import SettingLrcAlign from './settings/SettingLrcAlign'

export interface SettingPopupProps extends Omit<PopupProps, 'children'> {
  direction: 'vertical' | 'horizontal'
}

export interface SettingPopupType {
  show: () => void
}

type SettingsTab = 'audio' | 'lyrics'

const SettingsContent = ({ direction, tab }: Pick<SettingPopupProps, 'direction'> & { tab: SettingsTab }) => {
  const t = useI18n()
  const theme = useTheme()
  const [previewSize, setPreviewSize] = useState<number | null>(null)
  const fontSize = useSettingValue(direction == 'horizontal' ? 'playDetail.horizontal.style.lrcFontSize' : 'playDetail.vertical.style.lrcFontSize')
  const align = useSettingValue('playDetail.style.align')

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: px(tab == 'audio' ? 40 : 24), paddingTop: px(tab == 'audio' ? 24 : 0), paddingBottom: px(4) }} showsVerticalScrollIndicator={false}>
      {tab == 'audio' ? <>
        <SettingVolume />
        <View style={{ height: px(1), backgroundColor: theme.hairline }} />
        <SettingPlaybackRate />
      </> : <>
        <View style={{ minHeight: px(144), justifyContent: 'center', gap: px(12) }}>
          <SettingsText size={18} color={theme['text-2']} lineHeight={1.4}>{t('play_detail_setting_preview')}</SettingsText>
          <SettingsText size={42 * (previewSize ?? fontSize) / 220} weight="600" lineHeight={1.3} numberOfLines={1} style={{ textAlign: align }}>{t('play_detail_setting_preview_lyric')}</SettingsText>
          <SettingsText size={24} color={theme['text-3']} lineHeight={1.4} numberOfLines={1} style={{ textAlign: align }}>{t('play_detail_setting_preview_next')}</SettingsText>
        </View>
        <SettingLrcFontSize direction={direction} onPreview={setPreviewSize} />
        <SettingLrcAlign />
        <View style={{ height: px(1), backgroundColor: theme.hairline }} />
        <SettingLyricProgress />
      </>}
    </ScrollView>
  )
}

/** Pen 12 / 12b：声音与歌词分屏，760×960 浮层；保留可滚动内容与固定关闭入口。 */
export default forwardRef<SettingPopupType, SettingPopupProps>(({
  direction, position = direction == 'horizontal' ? 'right' : 'bottom', onHide, keyHide = true, bgHide = true, closeBtn = true, title,
}, ref) => {
  const [visible, setVisible] = useState(false)
  const [tab, setTab] = useState<SettingsTab>('audio')
  const { width, height } = useWindowDimensions()
  const t = useI18n()
  const theme = useTheme()
  const inset = px(40)
  const horizontal = position == 'left' || position == 'right'

  const hide = () => {
    if (!visible) return
    setVisible(false)
    onHide?.()
  }
  useImperativeHandle(ref, () => ({ show: () => { setVisible(true) } }))

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={() => { if (keyHide) hide() }}>
      <View style={{ flex: 1, padding: inset, alignItems: horizontal ? (position == 'left' ? 'flex-start' : 'flex-end') : 'center', justifyContent: horizontal ? 'center' : (position == 'top' ? 'flex-start' : 'flex-end') }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('close')} style={[StyleSheet.absoluteFillObject, { backgroundColor: theme['player-settings-scrim'] }]} onPress={bgHide ? hide : undefined} />
        <View
          accessibilityViewIsModal
          style={{ width: Math.min(px(760), width - inset * 2), height: Math.min(px(960), height - inset * 2), maxHeight: '100%', borderRadius: px(32), paddingTop: px(36), paddingHorizontal: px(40), paddingBottom: px(32), gap: px(24), backgroundColor: theme['player-settings-surface'], elevation: 24, shadowColor: theme['shadow-strong'], shadowOpacity: 1, shadowRadius: px(60), shadowOffset: { width: 0, height: px(20) } }}
        >
          <View style={{ minHeight: px(70), flexDirection: 'row', alignItems: 'center', gap: px(24) }}>
            <View style={{ flex: 1, gap: px(6) }}>
              <SettingsText size={36} weight="600" lineHeight={1.2} accessibilityRole="header">{title ?? t('play_detail_setting_title')}</SettingsText>
              <SettingsText size={18} lineHeight={1.4} color={theme['text-2']}>{t('play_detail_setting_description')}</SettingsText>
            </View>
            {closeBtn ? (
              <Pressable accessibilityRole="button" accessibilityLabel={t('close')} onPress={hide} style={({ pressed }) => ({ width: px(64), height: px(64), borderRadius: px(32), alignItems: 'center', justifyContent: 'center', backgroundColor: theme.glass, opacity: pressed ? 0.6 : 1 })}>
                <CarIcon name="lucide-x" size={26} color={theme['text-2']} />
              </Pressable>
            ) : null}
          </View>
          <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: px(32), borderBottomWidth: px(1), borderBottomColor: theme.hairline }}>
            {(['audio', 'lyrics'] as const).map(id => (
              <Pressable
                key={id}
                accessibilityRole="tab"
                accessibilityLabel={t(`play_detail_setting_${id}`)}
                accessibilityState={{ selected: tab == id }}
                onPress={() => { setTab(id) }}
                style={({ pressed }) => ({ flex: 1, minHeight: px(64), alignItems: 'center', justifyContent: 'center', borderBottomWidth: px(3), borderBottomColor: tab == id ? theme.accent : 'transparent', opacity: pressed ? 0.6 : 1 })}
              >
                <SettingsText size={24} weight={tab == id ? '600' : '500'} color={tab == id ? theme['text-1'] : theme['text-2']}>{t(`play_detail_setting_${id}`)}</SettingsText>
              </Pressable>
            ))}
          </View>
          {visible ? <SettingsContent key={tab} direction={direction} tab={tab} /> : null}
          <View style={{ minHeight: px(64), flexDirection: 'row', alignItems: 'center', gap: px(24) }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: px(10) }}>
              <CarIcon name="lucide-check" size={20} color={theme['text-2']} />
              <SettingsText size={18} color={theme['text-2']} style={{ flexShrink: 1 }}>{t('play_detail_setting_auto_apply')}</SettingsText>
            </View>
            <Pressable accessibilityRole="button" onPress={hide} style={({ pressed }) => ({ minWidth: px(144), minHeight: px(64), borderRadius: px(20), paddingHorizontal: px(20), alignItems: 'center', justifyContent: 'center', backgroundColor: theme['text-1'], opacity: pressed ? 0.8 : 1 })}>
              <SettingsText size={22} weight="600" color={theme['on-primary']}>{t('play_detail_setting_done')}</SettingsText>
            </Pressable>
          </View>
          <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: px(32), borderWidth: px(1), borderColor: theme['art-stroke'] }]} />
        </View>
      </View>
    </Modal>
  )
})
