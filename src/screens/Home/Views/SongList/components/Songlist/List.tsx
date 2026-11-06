import { useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react'
import { FlatList, View, RefreshControl, type FlatListProps } from 'react-native'

import ListItem, { FeaturedItem } from './ListItem'
import { type ListInfoItem } from '@/store/songlist/state'
import { useLayout } from '@/utils/hooks'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { px } from '@/utils/pixelRatio'
import { CarText } from '@/components/car'

type FlatListType = FlatListProps<ListInfoItem>

const CARD_WIDTH = 300
const GRID_MIN_WIDTH = 240
const GAP = 24

export interface ListProps {
  /**
   * shelf：横向一排（歌单广场），首项为推荐大卡
   * grid：多列网格（搜索歌单结果）
   */
  layout?: 'shelf' | 'grid'
  /** shelf 首张大卡的标签文字 */
  featuredTag?: string
  onRefresh: () => void
  onLoadMore: () => void
  onOpenDetail: (item: ListInfoItem, index: number) => void
  onPlay: (item: ListInfoItem, index: number) => void
}
export type Status = 'loading' | 'refreshing' | 'end' | 'error' | 'idle'

export interface ListType {
  setList: (list: ListInfoItem[], showSource?: boolean) => void
  setStatus: (val: Status) => void
}

export default forwardRef<ListType, ListProps>(({ layout = 'grid', featuredTag = '', onRefresh, onLoadMore, onOpenDetail, onPlay }, ref) => {
  const flatListRef = useRef<FlatList>(null)
  const [currentList, setList] = useState<ListInfoItem[]>([])
  const [showSource, setShowSource] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const { onLayout, width } = useLayout()
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    setList(list, showSource = false) {
      setList(list)
      setShowSource(showSource)
      if (!list.length) flatListRef.current?.scrollToOffset({ offset: 0, animated: false })
    },
    setStatus(val) {
      setStatus(val)
    },
  }))

  const handleLoadMore = () => {
    if (status != 'idle') return
    onLoadMore()
  }

  const gap = px(GAP)
  const rowInfo = useMemo(() => {
    const num = Math.max(Math.floor((width + gap) / (px(GRID_MIN_WIDTH) + gap)), 2)
    return { num, width: Math.floor((width - gap * (num - 1)) / num) }
  }, [width, gap])

  const gridList = useMemo(() => {
    if (layout != 'grid') return currentList
    const list = [...currentList]
    let whiteItemNum = list.length % rowInfo.num
    if (whiteItemNum > 0) whiteItemNum = rowInfo.num - whiteItemNum
    for (let i = 0; i < whiteItemNum; i++) {
      list.push({ id: `white__${i}`, play_count: '', author: '', name: '', img: '', desc: '', source: '' as LX.OnlineSource })
    }
    return list
  }, [currentList, rowInfo, layout])

  const renderItem: FlatListType['renderItem'] = ({ item, index }) => {
    if (layout == 'shelf' && index == 0) {
      return <FeaturedItem item={item} index={index} tag={featuredTag} showSource={showSource} onPress={onOpenDetail} onPlay={onPlay} />
    }
    return (
      <ListItem
        item={item}
        index={index}
        width={layout == 'shelf' ? px(CARD_WIDTH) : rowInfo.width}
        showSource={showSource}
        onPress={onOpenDetail}
        onPlay={onPlay}
      />
    )
  }
  const getkey: FlatListType['keyExtractor'] = item => item.id
  const refreshControl = useMemo(() => (
    <RefreshControl
      colors={[theme.accent]}
      refreshing={status == 'refreshing'}
      onRefresh={onRefresh} />
  ), [status, onRefresh, theme])
  const footer = <Footer status={status} onLoadMore={onLoadMore} />

  if (width == 0) return <View style={{ flex: 1 }} onLayout={onLayout} />

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {
        layout == 'shelf'
          ? (
              // 横向列表无法下拉刷新，刷新入口在页面顶栏
              <FlatList
                ref={flatListRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                data={currentList}
                renderItem={renderItem}
                keyExtractor={getkey}
                contentContainerStyle={{ gap, paddingRight: px(72), alignItems: 'flex-start' }}
                maxToRenderPerBatch={4}
                windowSize={5}
                removeClippedSubviews={true}
                onEndReachedThreshold={0.6}
                onEndReached={handleLoadMore}
                ListFooterComponent={footer}
                ListFooterComponentStyle={{ alignSelf: 'center' }}
              />
            )
          : (
              <FlatList
                key={String(rowInfo.num)}
                ref={flatListRef}
                numColumns={rowInfo.num}
                columnWrapperStyle={{ gap }}
                contentContainerStyle={{ gap: px(32), paddingBottom: px(120) }}
                data={gridList}
                maxToRenderPerBatch={4}
                windowSize={8}
                removeClippedSubviews={true}
                renderItem={renderItem}
                keyExtractor={getkey}
                onEndReachedThreshold={0.6}
                onEndReached={handleLoadMore}
                refreshControl={refreshControl}
                ListFooterComponent={footer}
              />
            )
      }
    </View>
  )
})

const Footer = ({ status, onLoadMore }: {
  status: Status
  onLoadMore: () => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  let label: 'list_loading' | 'list_end' | 'list_error' | null = null
  switch (status) {
    case 'loading':
      label = 'list_loading'
      break
    case 'end':
      label = 'list_end'
      break
    case 'error':
      label = 'list_error'
      break
  }
  if (!label) return null
  return (
    <CarText
      size={16}
      color={theme['text-3']}
      onPress={label == 'list_error' ? onLoadMore : undefined}
      style={{ textAlign: 'center', padding: px(20) }}
    >{t(label)}</CarText>
  )
}
