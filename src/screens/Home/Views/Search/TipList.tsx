import { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react'
import { FlatList, Pressable, StyleSheet, View, type LayoutRectangle } from 'react-native'
import { CarIcon, CarText } from '@/components/car'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'
import musicSdk from '@/utils/musicSdk'
import searchState, { type InitState as SearchState } from '@/store/search/state'
import { setSearchText, setTipList, setTipListInfo } from '@/core/search/search'
import { debounce } from '@/utils'

export const ITEM_HEIGHT = 64
const MAX_VISIBLE_ITEMS = 6
const PANEL_PADDING = 8

export const debounceTipSearch = debounce((keyword: string, source: SearchState['temp_source'], callback: (list: string[]) => void) => {
  void musicSdk[source].tipSearch.search(keyword).then(callback).catch(() => { callback([]) })
}, 200)

interface TipListProps {
  anchor: LayoutRectangle | null
  availableHeight: number
  onSearch: (keyword: string) => void
}
export interface TipListType {
  search: (keyword: string) => void
  show: () => void
  hide: () => void
}

// 车机搜索建议：与输入框同宽，使用车机尺寸，不复用手机版全宽列表。
export default forwardRef<TipListType, TipListProps>(({ anchor, availableHeight, onSearch }, ref) => {
  const theme = useTheme()
  const [list, setList] = useState<string[]>([])
  const visibleListRef = useRef(false)
  const isUnmountedRef = useRef(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  const hide = () => {
    visibleListRef.current = false
    setList([])
  }

  useImperativeHandle(ref, () => ({
    search(keyword) {
      const requestId = ++requestIdRef.current
      setSearchText(keyword)
      setTipListInfo(keyword, searchState.temp_source)
      setTipList([])
      setList([])
      if (!keyword) return

      debounceTipSearch(keyword, searchState.temp_source, (items) => {
        if (isUnmountedRef.current || requestId != requestIdRef.current || keyword != searchState.tipListInfo.text) return
        setTipList(items)
        // 失焦、提交或点击空白后，迟到的请求只能更新缓存，不能重新打开浮层。
        if (visibleListRef.current) setList(items)
      })
    },
    show() {
      visibleListRef.current = true
      if (searchState.tipListInfo.text == searchState.searchText) {
        setList([...searchState.tipListInfo.list])
      }
    },
    hide,
  }), [])

  const top = anchor ? anchor.y + anchor.height + px(12) : 0
  const maxHeight = Math.min(px(ITEM_HEIGHT * MAX_VISIBLE_ITEMS + PANEL_PADDING * 2), availableHeight - top)
  if (!anchor || !list.length || maxHeight <= 0) return null

  return (
    <View style={[StyleSheet.absoluteFillObject, { top, zIndex: 10 }]} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFillObject} onPress={hide} accessible={false} />
      <View style={{
        marginLeft: anchor.x,
        width: anchor.width,
        maxHeight,
        padding: px(PANEL_PADDING),
        borderRadius: px(24),
        borderWidth: px(1),
        borderColor: theme.hairline,
        backgroundColor: theme.elevated,
        elevation: 8,
        overflow: 'hidden',
      }}>
        <FlatList
          data={list}
          style={{ flexGrow: 0 }}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          initialNumToRender={MAX_VISIBLE_ITEMS}
          keyExtractor={(item, index) => `${item}-${index}`}
          getItemLayout={(_, index) => ({ length: px(ITEM_HEIGHT), offset: px(ITEM_HEIGHT) * index, index })}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item}
              onPress={() => {
                hide()
                onSearch(item)
              }}
              style={({ pressed }) => ({
                height: px(ITEM_HEIGHT),
                flexDirection: 'row',
                alignItems: 'center',
                gap: px(16),
                paddingHorizontal: px(16),
                borderRadius: px(16),
                backgroundColor: pressed ? theme['glass-strong'] : 'transparent',
              })}
            >
              <CarIcon name="lucide-search" size={22} color={theme['text-3']} />
              <CarText size={22} weight="500" numberOfLines={1} style={{ flex: 1 }}>{item}</CarText>
              <CarIcon name="lucide-chevron-right" size={18} color={theme['text-3']} />
            </Pressable>
          )}
        />
      </View>
    </View>
  )
})
