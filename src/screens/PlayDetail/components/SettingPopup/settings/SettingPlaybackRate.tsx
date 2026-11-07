import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { setPlaybackRate, updateMetaData } from '@/plugins/player'
import { setPlaybackRate as setLyricPlaybackRate } from '@/core/lyric'
import playerState from '@/store/player/state'
import SettingsText from '../Text'
import { px } from '../scale'
import SettingSlider from './SettingSlider'

const RATE_PRESETS = [75, 100, 125, 150, 200]

export default () => {
  const playbackRate = Math.round(useSettingValue('player.playbackRate') * 100)
  const [draft, setDraft] = useState<number | null>(null)
  const t = useI18n()
  const theme = useTheme()

  const applyRate = (value: number) => {
    const rate = value / 100
    updateSetting({ 'player.playbackRate': rate })
    void setLyricPlaybackRate(rate)
    void updateMetaData(playerState.musicInfo, playerState.isPlay, true)
    setDraft(null)
  }
  const selectRate = (value: number) => {
    void setPlaybackRate(value / 100)
    applyRate(value)
  }

  return (
    <View style={{ gap: px(24) }}>
      <SettingSlider
        label={t('play_detail_setting_playback_rate')}
        value={playbackRate}
        minimumValue={60}
        maximumValue={200}
        step={1}
        prominent
        formatValue={value => `${(value / 100).toFixed(2)}×`}
        onReset={() => { selectRate(100) }}
        onValueChange={value => {
          setDraft(value)
          void setPlaybackRate(value / 100)
        }}
        onSlidingComplete={applyRate}
      />
      <View accessibilityRole="radiogroup" accessibilityLabel={t('play_detail_setting_playback_rate')} style={{ flexDirection: 'row', gap: px(10) }}>
        {RATE_PRESETS.map(value => {
          const active = (draft ?? playbackRate) == value
          const label = `${(value / 100).toFixed(value % 50 ? 2 : 1)}×`
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={`${t('play_detail_setting_playback_rate')} ${label}`}
              accessibilityState={{ checked: active }}
              onPress={() => { selectRate(value) }}
              style={({ pressed }) => ({ flex: 1, minHeight: px(64), borderRadius: px(16), alignItems: 'center', justifyContent: 'center', borderWidth: px(1), borderColor: active ? theme.accent : 'transparent', backgroundColor: active ? theme['accent-soft'] : theme.glass, opacity: pressed ? 0.6 : 1 })}
            >
              <SettingsText size={22} num weight={active ? '600' : '500'} color={active ? theme.accent : theme['text-2']}>{label}</SettingsText>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
