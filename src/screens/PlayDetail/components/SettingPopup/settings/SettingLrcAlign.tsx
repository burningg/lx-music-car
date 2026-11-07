import { Pressable, View } from 'react-native'
import CarIcon from '@/components/car/CarIcon'
import SettingsText from '../Text'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { px } from '../scale'

const ALIGN_LIST = ['left', 'center', 'right'] as const

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const align = useSettingValue('playDetail.style.align')

  return (
    <View style={{ minHeight: px(80), flexDirection: 'row', alignItems: 'center', gap: px(24) }}>
      <SettingsText size={26} weight="500" lineHeight={1.4}>{t('play_detail_setting_alignment')}</SettingsText>
      <View accessibilityRole="radiogroup" style={{ flex: 1, flexDirection: 'row', padding: px(4), gap: px(4), minHeight: px(72), borderRadius: px(20), backgroundColor: theme.glass }}>
        {ALIGN_LIST.map(id => {
          const active = align == id
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityLabel={t(`play_detail_setting_lrc_align_${id}`)}
              accessibilityState={{ checked: active }}
              onPress={() => { updateSetting({ 'playDetail.style.align': id }) }}
              style={({ pressed }) => ({ flex: 1, minHeight: px(64), borderRadius: px(16), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: px(8), backgroundColor: active ? theme['glass-strong'] : 'transparent', opacity: pressed ? 0.6 : 1 })}
            >
              <CarIcon name={`ms-format-align-${id}`} size={24} color={active ? theme['text-1'] : theme['text-2']} />
              <SettingsText size={20} weight={active ? '600' : '500'} color={active ? theme['text-1'] : theme['text-2']}>{t(`play_detail_setting_lrc_align_${id}`)}</SettingsText>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
