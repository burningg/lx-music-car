import { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'
import CarText from './CarText'

export interface SegmentTabsProps<T extends string> {
  items: ReadonlyArray<{ id: T, label: string }>
  activeId: T
  compact?: boolean
  onChange: (id: T) => void
}

// 设计稿分段切换：玻璃底胶囊，内边距 5，选中段用浮层色
const SegmentTabs = <T extends string>({ items, activeId, compact = false, onChange }: SegmentTabsProps<T>) => {
  const theme = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: px(4), padding: px(5), borderRadius: 999, backgroundColor: theme.glass, alignSelf: 'flex-start' }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 999, borderWidth: px(1), borderColor: theme.hairline }} />
      {items.map(item => {
        const active = item.id == activeId
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.7}
            disabled={active}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => { onChange(item.id) }}
            style={{ minHeight: px(compact ? 43 : 48), justifyContent: 'center', paddingHorizontal: px(compact ? 24 : 26), borderRadius: 999, backgroundColor: active ? theme.elevated : undefined }}
          >
            <CarText size={compact ? 17 : 18} weight={active ? '600' : '400'} color={active ? theme['text-1'] : theme['text-2']}>{item.label}</CarText>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default memo(SegmentTabs) as typeof SegmentTabs
