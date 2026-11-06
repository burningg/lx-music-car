import { useCallback, useRef } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { type BoardItem } from '@/store/leaderboard/state'
import { CarIcon, CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'

export interface ListItemProps {
  item: BoardItem
  index: number
  active: boolean
  source: LX.OnlineSource
  onPress: (item: BoardItem) => void
  onLongPress: (item: BoardItem, position: { x: number, y: number, w: number, h: number }) => void
}

// 设计稿榜单行：400×104，封面 60，选中行玻璃底 + 右侧 4×28 强调色标记
export default ({ item, index, active, source, onPress, onLongPress }: ListItemProps) => {
  const theme = useTheme()
  const t = useI18n()
  const sourceNameType = useSettingValue('common.sourceNameType')
  const buttonRef = useRef<TouchableOpacity>(null)

  const handleLongPress = useCallback(() => {
    buttonRef.current?.measure((fx, fy, width, height, pageX, pageY) => {
      onLongPress(item, { x: Math.ceil(pageX), y: Math.ceil(pageY), w: Math.ceil(width), h: Math.ceil(height) })
    })
  }, [item, onLongPress])

  return (
    <TouchableOpacity
      ref={buttonRef}
      key={item.id}
      activeOpacity={0.7}
      onPress={() => { onPress(item) }}
      onLongPress={handleLongPress}
      style={{
        height: px(104),
        flexDirection: 'row',
        alignItems: 'center',
        gap: px(16),
        paddingHorizontal: px(16),
        borderRadius: px(18),
        backgroundColor: active ? theme['glass-strong'] : undefined,
      }}
    >
      <View style={{
        width: px(60),
        height: px(60),
        borderRadius: px(12),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.glass,
      }}>
        <CarIcon name="lucide-trophy" size={26} color={active ? theme.accent : theme['text-3']} />
      </View>
      <View style={{ flex: 1, gap: px(3) }}>
        <CarText size={19} weight="600" numberOfLines={1}>{item.name}</CarText>
        <CarText size={14} color={theme['text-3']} numberOfLines={1}>{t(`source_${sourceNameType}_${source}`)}</CarText>
      </View>
      {active ? <View style={{ width: px(4), height: px(28), borderRadius: px(2), backgroundColor: theme.accent }} /> : null}
    </TouchableOpacity>
  )
}
