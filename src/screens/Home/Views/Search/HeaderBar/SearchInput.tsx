import { useCallback, useRef, forwardRef, useImperativeHandle, useState } from 'react'
import { View, type ViewProps } from 'react-native'
import Input, { type InputType, type InputProps } from '@/components/common/Input'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { CarIcon, IconButton } from '@/components/car'
import { px, sp } from '@/utils/pixelRatio'

export interface SearchInputProps {
  onEdit?: () => void
  onLayout?: ViewProps['onLayout']
  onChangeText: (text: string) => void
  onSubmit: (text: string) => void
  onBlur: () => void
  onTouchStart: () => void
}

export interface SearchInputType {
  setText: (text: string) => void
  focus: () => void
  blur: () => void
}

// 设计稿搜索框：高 64 胶囊，左侧搜索图标，右侧 36 圆形清除键
export default forwardRef<SearchInputType, SearchInputProps>(({ onEdit, onChangeText, onSubmit, onBlur, onTouchStart, onLayout }, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const [text, setText] = useState('')
  const inputRef = useRef<InputType>(null)

  useImperativeHandle(ref, () => ({
    setText(text) {
      setText(text)
    },
    focus() {
      inputRef.current?.focus()
    },
    blur() {
      inputRef.current?.blur()
    },
  }))

  const handleChangeText = (text: string) => {
    onEdit?.()
    setText(text)
    onChangeText(text.trim())
  }

  const handleClearText = useCallback(() => {
    onEdit?.()
    setText('')
    onChangeText('')
    onSubmit('')
  }, [onEdit, onChangeText, onSubmit])

  const handleSubmit = useCallback<NonNullable<InputProps['onSubmitEditing']>>(({ nativeEvent: { text } }) => {
    onEdit?.()
    onSubmit(text)
  }, [onEdit, onSubmit])

  return (
    <View onLayout={onLayout} style={{
      flex: 1,
      height: px(64),
      flexDirection: 'row',
      alignItems: 'center',
      gap: px(14),
      paddingLeft: px(24),
      paddingRight: px(14),
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.hairline,
      backgroundColor: theme['surface-2'],
    }}>
      <CarIcon name="lucide-search" size={26} color={theme['text-2']} />
      <Input
        ref={inputRef}
        placeholder={t('search_placeholder')}
        value={text}
        size={22}
        style={{ height: px(56), fontSize: sp(22), paddingLeft: 0, color: theme['text-1'], fontWeight: '500' }}
        placeholderTextColor={theme['text-3']}
        selectionColor={theme.accent}
        onChangeText={handleChangeText}
        onBlur={onBlur}
        onFocus={() => {
          onEdit?.()
          onTouchStart()
        }}
        onSubmitEditing={handleSubmit}
        onTouchStart={onTouchStart}
      />
      {text ? <IconButton icon="lucide-x" iconSize={18} size={36} background={theme['glass-strong']} onPress={handleClearText} /> : null}
    </View>
  )
})
