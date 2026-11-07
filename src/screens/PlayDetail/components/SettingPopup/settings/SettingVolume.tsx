import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { setVolume } from '@/plugins/player'
import SettingSlider from './SettingSlider'

export default () => {
  const volume = Math.round(useSettingValue('player.volume') * 100)
  const t = useI18n()

  return (
    <SettingSlider
      label={t('play_detail_setting_volume')}
      value={volume}
      minimumValue={0}
      maximumValue={100}
      step={1}
      prominent
      formatValue={value => `${value}%`}
      onValueChange={value => { void setVolume(value / 100) }}
      onSlidingComplete={value => { updateSetting({ 'player.volume': value / 100 }) }}
    />
  )
}
