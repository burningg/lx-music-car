import { memo } from 'react'
import { View } from 'react-native'
import { CarText, SegmentTabs } from '@/components/car'
import { useI18n } from '@/lang'
import { setFontSize } from '@/core/common'
import { useFontSize } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'

// 未包含的旧字号仍然保留；只有用户主动点选时才写入新值。
const SIZES = [1, 1.1, 1.3] as const

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const size = useFontSize()
  const custom = !SIZES.some(value => value == size)
  const items = [
    { id: '1', label: t('setting_basic_font_size_100') },
    { id: '1.1', label: t('setting_basic_font_size_110') },
    { id: '1.3', label: t('car_font_size_extra_large') },
  ]

  return (
    <View style={{ minHeight: px(103), paddingVertical: px(24), paddingHorizontal: px(28), gap: px(24), flexDirection: 'row', alignItems: 'center', borderTopWidth: px(1), borderTopColor: theme.hairline }}>
      <View style={{ flex: 1, gap: px(4) }}>
        <CarText size={20} weight="500">{t('car_font_size')}</CarText>
        <CarText size={15} color={theme['text-2']}>
          {t('car_font_size_desc')}{custom ? ` · ${Math.round(size * 100)}%` : ''}
        </CarText>
      </View>
      <SegmentTabs compact items={items} activeId={String(size)} onChange={value => { setFontSize(Number(value)) }} />
    </View>
  )
})
