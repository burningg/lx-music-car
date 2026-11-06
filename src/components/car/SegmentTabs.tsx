import { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'
import CarText from './CarText'

export interface SegmentTabsProps<T extends string> {
  items: ReadonlyArray<{ id: T, label: string }>
  activeId: T
  onChange: (id: T) => void
}

// 设计稿分段切换：玻璃底胶囊，内边距 5，选中段用浮层色
const SegmentTabs = <T extends string>({ items, activeId, onChange }: SegmentTabsProps<T>) => {
  const theme = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: px(4), padding: px(5), borderRadius: 999, borderWidth: 1, borderColor: theme.hairline, backgroundColor: theme.glass, alignSelf: 'flex-start' }}>
      {items.map(item => {
        const active = item.id == activeId
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.7}
            disabled={active}
            onPress={() => { onChange(item.id) }}
            style={{ minHeight: px(48), justifyContent: 'center', paddingHorizontal: px(26), borderRadius: 999, backgroundColor: active ? theme.elevated : undefined }}
          >
            <CarText size={18} weight={active ? '600' : '400'} color={active ? theme['text-1'] : theme['text-2']}>{item.label}</CarText>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default memo(SegmentTabs) as typeof SegmentTabs
