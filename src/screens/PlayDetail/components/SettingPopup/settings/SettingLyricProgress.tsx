import { Pressable, View } from 'react-native'
import SettingsText from '../Text'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { px } from '../scale'

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const enabled = useSettingValue('playDetail.isShowLyricProgressSetting')

  return (
    <View style={{ minHeight: px(88), flexDirection: 'row', alignItems: 'center', gap: px(24) }}>
      <View style={{ flex: 1, gap: px(6) }}>
        <SettingsText size={24} weight="500" lineHeight={1.5}>{t('play_detail_setting_show_lyric_progress_setting')}</SettingsText>
        <SettingsText size={18} color={theme['text-2']} lineHeight={1.3}>{t('play_detail_setting_lyric_progress_description')}</SettingsText>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={t('play_detail_setting_show_lyric_progress_setting')}
        accessibilityState={{ checked: enabled }}
        onPress={() => { updateSetting({ 'playDetail.isShowLyricProgressSetting': !enabled }) }}
        style={({ pressed }) => ({ width: px(72), height: px(64), justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
      >
        <View style={{ height: px(40), borderRadius: px(20), padding: px(4), justifyContent: 'center', alignItems: enabled ? 'flex-end' : 'flex-start', backgroundColor: enabled ? theme.accent : theme['player-settings-track'] }}>
          <View style={{ width: px(32), height: px(32), borderRadius: px(16), backgroundColor: '#FFFFFF', elevation: 2 }} />
        </View>
      </Pressable>
    </View>
  )
}
