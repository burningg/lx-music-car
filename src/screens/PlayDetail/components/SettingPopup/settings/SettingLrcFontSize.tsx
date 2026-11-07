import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import SettingSlider from './SettingSlider'

export default ({ direction, onPreview }: {
  direction: 'horizontal' | 'vertical'
  onPreview: (value: number | null) => void
}) => {
  const settingKey = direction == 'horizontal' ? 'playDetail.horizontal.style.lrcFontSize' : 'playDetail.vertical.style.lrcFontSize'
  const lrcFontSize = useSettingValue(settingKey)
  const t = useI18n()

  return (
    <SettingSlider
      label={t('play_detail_setting_lrc_font_size')}
      value={lrcFontSize}
      minimumValue={100}
      maximumValue={300}
      step={2}
      onValueChange={onPreview}
      onSlidingComplete={value => {
        updateSetting({ [settingKey]: value })
        onPreview(null)
      }}
    />
  )
}
