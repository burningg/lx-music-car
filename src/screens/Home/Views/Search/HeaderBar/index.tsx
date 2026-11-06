import { useRef, forwardRef, useImperativeHandle } from 'react'
import { View } from 'react-native'
import SourceSelector, {
  type SourceSelectorType as _SourceSelectorType,
  type SourceSelectorProps as _SourceSelectorProps,
} from '@/components/SourceSelector'
import SearchInput, { type SearchInputType, type SearchInputProps } from './SearchInput'
import { useI18n } from '@/lang'
import { CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { type Source as MusicSource } from '@/store/search/music/state'
import { type Source as SonglistSource } from '@/store/search/songlist/state'

type Sources = Readonly<Array<MusicSource | SonglistSource>>
type SourceSelectorProps = _SourceSelectorProps<Sources>
type SourceSelectorType = _SourceSelectorType<Sources>

export interface HeaderBarProps {
  onSearchInputLayout?: SearchInputProps['onLayout']
  onSourceChange: SourceSelectorProps['onSourceChange']
  onTipSearch: SearchInputProps['onChangeText']
  onSearch: SearchInputProps['onSubmit']
  onHideTipList: SearchInputProps['onBlur']
  onShowTipList: SearchInputProps['onTouchStart']
}

export interface HeaderBarType {
  setSourceList: SourceSelectorType['setSourceList']
  setText: SearchInputType['setText']
  blur: SearchInputType['blur']
}

// 设计稿顶栏：标题 48/700 + 搜索框 + 来源胶囊（语音搜索暂无对应功能，未加入）
export default forwardRef<HeaderBarType, HeaderBarProps>(({ onSourceChange, onTipSearch, onSearch, onHideTipList, onShowTipList, onSearchInputLayout }, ref) => {
  const t = useI18n()
  const sourceSelectorRef = useRef<SourceSelectorType>(null)
  const searchInputRef = useRef<SearchInputType>(null)

  useImperativeHandle(ref, () => ({
    setSourceList(list, source) {
      sourceSelectorRef.current?.setSourceList(list, source)
    },
    setText(text) {
      searchInputRef.current?.setText(text)
    },
    blur() {
      searchInputRef.current?.blur()
    },
  }), [])

  return (
    <View style={{ height: px(70), flexDirection: 'row', alignItems: 'center', gap: px(20), zIndex: 2 }}>
      <CarText size={48} weight="700" style={{ marginRight: px(16) }}>{t('nav_search')}</CarText>
      <SearchInput
        ref={searchInputRef}
        onLayout={onSearchInputLayout}
        onChangeText={onTipSearch}
        onSubmit={onSearch}
        onBlur={onHideTipList}
        onTouchStart={onShowTipList}
      />
      <SourceSelector ref={sourceSelectorRef} onSourceChange={onSourceChange} variant="pill" />
    </View>
  )
})
