import { memo } from 'react'
import { View } from 'react-native'
import { useI18n } from '@/lang'
import { useSourceListI18n } from '@/components/SourceSelector'
import { CarText, SegmentTabs } from '@/components/car'
import { px } from '@/utils/pixelRatio'

export interface HeaderProps {
  source: LX.OnlineSource
  sources: LX.OnlineSource[]
  onSourceChange: (source: LX.OnlineSource) => void
}

// 设计稿排行榜顶栏：标题 48/700 + 右侧来源分段（每段 48 高）
export default memo(({ source, sources, onSourceChange }: HeaderProps) => {
  const t = useI18n()
  const sourceList = useSourceListI18n(sources)
  const items = sourceList.map(({ label, action }) => ({ id: action as LX.OnlineSource, label }))

  return (
    <View style={{ height: px(70), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: px(24) }}>
      <CarText size={48} weight="700">{t('nav_top')}</CarText>
      <SegmentTabs items={items} activeId={source} onChange={onSourceChange} />
    </View>
  )
})
