import { useRef } from 'react'
import { ScrollView } from 'react-native'
import ListItem from './ListItem'
import ListMenu, { type ListMenuType, type Position } from './ListMenu'
import { type BoardItem } from '@/store/leaderboard/state'
import { px } from '@/utils/pixelRatio'

export interface BoardsListProps {
  list: BoardItem[]
  activeId: string
  source: LX.OnlineSource
  onPress: (item: BoardItem) => void
  onPlay: (id: string) => void
  onCollect: (id: string, name: string) => void
}

// 设计稿榜单栏：宽 400，行高 80、行距 6
export default ({ list, activeId, source, onPress, onPlay, onCollect }: BoardsListProps) => {
  const listMenuRef = useRef<ListMenuType>(null)

  const handleLongPress = (item: BoardItem, position: Position) => {
    const index = list.findIndex(board => board.id == item.id)
    listMenuRef.current?.show({ listId: item.id, name: item.name, index }, position)
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: px(6), paddingBottom: px(140) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps={'always'}
      >
        {list.map((item, index) => (
          <ListItem
            key={item.id}
            item={item}
            index={index}
            active={activeId == item.id}
            source={source}
            onPress={onPress}
            onLongPress={handleLongPress}
          />
        ))}
      </ScrollView>
      <ListMenu
        ref={listMenuRef}
        onHideMenu={() => {}}
        onPlay={({ listId }) => { onPlay(listId) }}
        onCollect={({ listId, name }) => { onCollect(listId, name) }}
      />
    </>
  )
}
