import { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Keyboard, Platform, View } from 'react-native'
import SourceSelector, {
  type SourceSelectorType as _SourceSelectorType,
  type SourceSelectorProps as _SourceSelectorProps,
} from '@/components/SourceSelector'
import SearchInput, { type SearchInputType, type SearchInputProps } from './SearchInput'
import { useI18n } from '@/lang'
import { CarText, IconButton, NAV_RAIL_WIDTH } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { useTheme } from '@/store/theme/hook'
import SpeechRecognitionModal, { type SpeechRecognitionModalType } from '@/components/SpeechRecognitionModal'
import useWindowSize from '@/utils/hooks/useWindowSize'
import prepareVoiceSearch from './prepareVoiceSearch'
import useVoiceKey from './useVoiceKey'
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

// 设计稿顶栏：标题 48/700 + 搜索框 + 来源胶囊 + 独立 64px 强调色语音按钮
export default forwardRef<HeaderBarType, HeaderBarProps>(({ onSourceChange, onTipSearch, onSearch, onHideTipList, onShowTipList, onSearchInputLayout }, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const { width, height } = useWindowSize()
  const speechRecognitionRef = useRef<SpeechRecognitionModalType>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const sourceSelectorRef = useRef<SourceSelectorType>(null)
  const searchInputRef = useRef<SearchInputType>(null)
  const cancelVoice = useCallback(() => { speechRecognitionRef.current?.cancel() }, [])
  const handleVoiceResult = (text: string) => {
    searchInputRef.current?.setText(text)
    onTipSearch(text)
  }

  useImperativeHandle(ref, () => ({
    setSourceList(list, source) {
      sourceSelectorRef.current?.setSourceList(list, source)
    },
    setText(text) {
      cancelVoice()
      searchInputRef.current?.setText(text)
    },
    blur() {
      searchInputRef.current?.blur()
    },
  }), [cancelVoice])

  const startVoice = () => {
    if (isRecognizing) return
    searchInputRef.current?.blur()
    Keyboard.dismiss()
    onHideTipList()
    void speechRecognitionRef.current?.start(prepareVoiceSearch)
  }
  useVoiceKey(startVoice)

  const handleVoice = () => {
    if (isRecognizing) cancelVoice()
    else startVoice()
  }

  return (
    <View style={{ height: px(70), flexDirection: 'row', alignItems: 'center', gap: px(20), zIndex: 2 }}>
      <CarText size={48} weight="700" style={{ marginRight: px(16) }}>{t('nav_search')}</CarText>
      <SearchInput
        ref={searchInputRef}
        onEdit={cancelVoice}
        onLayout={onSearchInputLayout}
        onChangeText={onTipSearch}
        onSubmit={onSearch}
        onBlur={onHideTipList}
        onTouchStart={onShowTipList}
      />
      <SourceSelector ref={sourceSelectorRef} onSourceChange={onSourceChange} variant="pill" />
      {Platform.OS == 'android' ? (
        <View>
          <IconButton
            icon={isRecognizing ? 'lucide-x' : 'lucide-mic'}
            iconSize={26}
            size={64}
            color={theme['on-primary']}
            background={theme.accent}
            accessibilityLabel={t(isRecognizing ? 'speech_recognition_cancel' : 'speech_recognition_start')}
            accessibilityState={{ busy: isRecognizing }}
            onPress={handleVoice}
          />
          <SpeechRecognitionModal
            ref={speechRecognitionRef}
            onResult={handleVoiceResult}
            onRecognizingChange={setIsRecognizing}
            prompt={t('search_voice_listening')}
            hint={t('search_voice_fill_hint')}
            contentInsetLeft={width > height ? px(NAV_RAIL_WIDTH) : 0}
          />
        </View>
      ) : null}
    </View>
  )
})
