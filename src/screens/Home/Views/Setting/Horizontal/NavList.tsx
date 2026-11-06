import { memo, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { CarText, CarIcon } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { SETTING_SCREENS, normalizeSettingScreenId, type SettingScreenIds } from '../Main'

const ICONS: Record<SettingScreenIds, string> = {
  basic: 'lucide-palette',
  player: 'lucide-play',
  lyric_desktop: 'lucide-captions',
  search: 'lucide-search',
  list: 'lucide-list',
  sync: 'lucide-refresh-cw',
  backup: 'lucide-archive',
  other: 'lucide-sliders-horizontal',
  version: 'lucide-download',
}

const ListItem = memo(({ id, active, onPress }: {
  id: SettingScreenIds
  active: boolean
  onPress: (id: SettingScreenIds) => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => { onPress(id) }}
      style={{
        height: px(50),
        flexDirection: 'row',
        alignItems: 'center',
        gap: px(14),
        paddingHorizontal: px(16),
        borderRadius: px(14),
        backgroundColor: active ? theme['glass-strong'] : undefined,
      }}
    >
      <CarIcon name={ICONS[id]} size={22} color={active ? theme.accent : theme['text-2']} />
      <CarText size={18} weight={active ? '600' : '400'} color={active ? theme['text-1'] : theme['text-2']} numberOfLines={1}>{t(`setting_${id}`)}</CarText>
    </TouchableOpacity>
  )
})

// 设计稿左侧分区栏：宽 340，表面色底，右侧 1px 分隔
export default ({ onChangeId }: {
  onChangeId: (id: SettingScreenIds) => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  const [activeId, setActiveId] = useState(normalizeSettingScreenId(global.lx.settingActiveId))

  const handleChangeId = (id: SettingScreenIds) => {
    onChangeId(id)
    setActiveId(id)
    global.lx.settingActiveId = id
  }

  return (
    <ScrollView
      style={{ width: px(340), flexGrow: 0, backgroundColor: theme.surface, borderRightWidth: 1, borderRightColor: theme.hairline }}
      contentContainerStyle={{ paddingTop: px(60), paddingBottom: px(40), paddingLeft: px(32), paddingRight: px(20), gap: px(32) }}
    >
      <CarText size={36} weight="700">{t('nav_setting')}</CarText>
      <View style={{ gap: px(2) }}>
        {SETTING_SCREENS.map(id => <ListItem key={id} id={id} active={normalizeSettingScreenId(activeId) == id} onPress={handleChangeId} />)}
      </View>
    </ScrollView>
  )
}
