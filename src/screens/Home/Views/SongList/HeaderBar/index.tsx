import { forwardRef, useImperativeHandle, useRef } from 'react'
import { View } from 'react-native'
import SortTab, { type SortTabProps, type SortTabType } from './SortTab'
import SourceSelector, {
  type SourceSelectorType,
  type SourceSelectorProps,
} from './SourceSelector'
import { type Source } from '@/store/songlist/state'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { CarText, IconButton } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import Tag, { type TagType, type TagProps } from './Tag'
import OpenList, { type OpenListType } from './OpenList'

export interface HeaderBarProps {
  onSortChange: SortTabProps['onSortChange']
  onTagChange: TagProps['onTagChange']
  onSourceChange: SourceSelectorProps['onSourceChange']
  onRefresh: () => void
}

export interface HeaderBarType {
  setSource: (source: Source, sortId: string, tagName: string, tagId: string) => void
}

// 设计稿顶栏：左「歌单」+ 排序分段，右 标签 / 打开 / 来源 分段组 + 圆形按钮
// 设计稿右侧圆形按钮是语音，暂无对应功能；横向书架不能下拉刷新，这里放刷新
export default forwardRef<HeaderBarType, HeaderBarProps>(({ onSortChange, onTagChange, onSourceChange, onRefresh }, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const sortTabRef = useRef<SortTabType>(null)
  const tagRef = useRef<TagType>(null)
  const openListRef = useRef<OpenListType>(null)
  const sourceSelectorRef = useRef<SourceSelectorType>(null)

  useImperativeHandle(ref, () => ({
    setSource(source, sortId, tagName, tagId) {
      sortTabRef.current?.setSource(source, sortId)
      tagRef.current?.setSelectedTagInfo(source, tagName, tagId)
      sourceSelectorRef.current?.setSource(source)
      openListRef.current?.setInfo(source)
    },
  }), [])

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: px(72), zIndex: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(36) }}>
        <CarText size={48} weight="700">{t('nav_songlist')}</CarText>
        <SortTab ref={sortTabRef} onSortChange={onSortChange} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(20) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(4), padding: px(5), borderRadius: 999, borderWidth: 1, borderColor: theme.hairline, backgroundColor: theme.glass }}>
          <Tag ref={tagRef} onTagChange={onTagChange} />
          <OpenList ref={openListRef} />
          <SourceSelector ref={sourceSelectorRef} onSourceChange={onSourceChange} />
        </View>
        <IconButton icon="lucide-refresh-cw" iconSize={24} size={58} background={theme.glass} onPress={onRefresh} />
      </View>
    </View>
  )
})
