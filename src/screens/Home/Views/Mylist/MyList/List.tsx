import { memo, useRef } from 'react'
import { FlatList, TouchableOpacity, View, type FlatListProps } from 'react-native'

import { useActiveListId, useListFetching, useMyList } from '@/store/list/hook'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { CarIcon, CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { getListMusicSync } from '@/utils/listManage'
import { setActiveList } from '@/core/list'
import { LIST_IDS } from '@/config/constant'
import Loading from '@/components/common/Loading'
import { type Position } from './ListMenu'

type FlatListType = FlatListProps<LX.List.MyListInfo>

const ITEM_HEIGHT = px(104)

const getListIcon = (id: string) => {
  switch (id) {
    case LIST_IDS.DEFAULT:
      return { icon: 'lucide-headphones', accent: false }
    case LIST_IDS.LOVE:
      return { icon: 'ph-heart-fill', accent: true }
    default:
      return { icon: 'lucide-list-music', accent: false }
  }
}

const ListRow = memo(({ item, active, onPress, onMore }: {
  item: LX.List.MyListInfo
  active: boolean
  onPress: () => void
  onMore: () => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  const fetching = useListFetching(item.id)
  const { icon, accent } = getListIcon(item.id)
  const count = getListMusicSync(item.id).length
  const name = item.id == LIST_IDS.DEFAULT
    ? t('list_name_default')
    : item.id == LIST_IDS.LOVE ? t('list_name_love') : item.name

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onMore}
      style={{
        height: px(92),
        flexDirection: 'row',
        alignItems: 'center',
        gap: px(16),
        paddingLeft: px(10),
        paddingRight: px(16),
        borderRadius: px(18),
        backgroundColor: active ? theme['glass-strong'] : undefined,
      }}
    >
      <View style={{
        width: px(56),
        height: px(56),
        borderRadius: px(12),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: accent ? theme['accent-soft'] : theme.glass,
      }}>
        {fetching
          ? <Loading color={theme['text-2']} />
          : <CarIcon name={icon} size={24} color={accent ? theme.accent : theme['text-2']} />}
      </View>
      <View style={{ flex: 1, gap: px(3) }}>
        <CarText size={19} weight={active ? '600' : '500'} numberOfLines={1}>{name}</CarText>
        {count ? <CarText size={14} color={theme['text-3']}>{t('board_track_count', { num: count })}</CarText> : null}
      </View>
    </TouchableOpacity>
  )
})

export default ({ onShowMenu }: {
  onShowMenu: (info: { listInfo: LX.List.MyListInfo, index: number }, position?: Position) => void
}) => {
  const flatListRef = useRef<FlatList>(null)
  const allList = useMyList()
  const activeListId = useActiveListId()

  const handleToggleList = (item: LX.List.MyListInfo) => {
    setActiveList(item.id)
  }

  const renderItem: FlatListType['renderItem'] = ({ item, index }) => (
    <ListRow
      key={item.id}
      item={item}
      active={activeListId == item.id}
      onPress={() => { handleToggleList(item) }}
      onMore={() => { onShowMenu({ listInfo: item, index }) }}
    />
  )
  const getkey: FlatListType['keyExtractor'] = item => item.id
  const getItemLayout: FlatListType['getItemLayout'] = (data, index) => {
    return { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
  }

  return (
    <FlatList
      ref={flatListRef}
      style={{ flexGrow: 0, flexShrink: 1 }}
      contentContainerStyle={{ gap: px(12), paddingBottom: px(40) }}
      data={allList}
      maxToRenderPerBatch={9}
      windowSize={9}
      removeClippedSubviews={true}
      initialNumToRender={18}
      renderItem={renderItem}
      keyExtractor={getkey}
      extraData={activeListId}
      getItemLayout={getItemLayout}
    />
  )
}
