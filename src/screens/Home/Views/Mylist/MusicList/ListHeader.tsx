import { memo, useEffect, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useActiveListId } from '@/store/list/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { CarText, IconButton } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { getListMusicSync } from '@/utils/listManage'
import listState from '@/store/list/state'
import { LIST_IDS } from '@/config/constant'

const useActiveListInfo = () => {
  const activeId = useActiveListId()
  const langId = useSettingValue('common.langId')
  const t = useI18n()
  const [count, setCount] = useState(0)

  useEffect(() => {
    const update = () => { setCount(getListMusicSync(listState.activeListId).length) }
    update()
    const handleChange = (ids: string[]) => {
      if (ids.includes(listState.activeListId)) update()
    }
    global.state_event.on('mylistToggled', update)
    global.app_event.on('myListMusicUpdate', handleChange)
    return () => {
      global.state_event.off('mylistToggled', update)
      global.app_event.off('myListMusicUpdate', handleChange)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, langId])

  let name = ''
  switch (activeId) {
    case LIST_IDS.TEMP:
      name = t('list_name_temp')
      break
    case LIST_IDS.DEFAULT:
      name = t('list_name_default')
      break
    case LIST_IDS.LOVE:
      name = t('list_name_love')
      break
    default:
      name = listState.allList.find(l => l.id === activeId)?.name ?? ''
  }

  return { name, count }
}

export interface ListHeaderProps {
  multiSelect: boolean
  onLocate: () => void
  onSearch: () => void
  onSort: () => void
  onMultiSelect: () => void
  onMore: () => void
  onExitMultiSelect: () => void
}

// 设计稿列表头：歌单名 40/700 + 歌曲数，右侧 5 个 56×56 工具按钮（多选时换成「完成」）
export default memo(({ multiSelect, onLocate, onSearch, onSort, onMultiSelect, onMore, onExitMultiSelect }: ListHeaderProps) => {
  const theme = useTheme()
  const t = useI18n()
  const { name, count } = useActiveListInfo()

  const tools = [
    { key: 'locate', icon: 'lucide-crosshair', onPress: onLocate },
    { key: 'search', icon: 'lucide-search', onPress: onSearch },
    { key: 'sort', icon: 'lucide-arrow-down-up', onPress: onSort },
    { key: 'select', icon: 'lucide-list-checks', onPress: onMultiSelect },
    { key: 'more', icon: 'lucide-ellipsis', onPress: onMore },
  ]

  return (
    <View style={{ height: px(87), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: px(24) }}>
      <View style={{ flex: 1, gap: px(6), paddingLeft: px(20) }}>
        <CarText size={40} weight="700" numberOfLines={1}>{name}</CarText>
        <CarText size={16} color={theme['text-2']} numberOfLines={1}>{t('board_track_count', { num: count })}</CarText>
      </View>
      {
        multiSelect
          ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onExitMultiSelect}
              style={{ height: px(56), minWidth: px(95), paddingHorizontal: px(24), borderRadius: px(18), alignItems: 'center', justifyContent: 'center', backgroundColor: theme['text-1'] }}
            >
              <CarText size={18} weight="600" color={theme['on-primary']}>{t('cancel')}</CarText>
            </TouchableOpacity>
            )
          : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
              {tools.map(tool => (
                <IconButton key={tool.key} icon={tool.icon} iconSize={24} size={56} radius={18} color={theme['text-2']} background={theme.glass} onPress={tool.onPress} />
              ))}
            </View>
            )
      }
    </View>
  )
})
