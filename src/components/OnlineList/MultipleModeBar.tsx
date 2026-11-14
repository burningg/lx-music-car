import { useState, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { Animated, View, TouchableOpacity } from 'react-native'

import { CarText } from '@/components/car'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'

export type SelectMode = 'single' | 'range'

export const MULTI_SELECT_BAR_HEIGHT = px(40)

export interface MultipleModeBarProps {
  onSwitchMode: (mode: SelectMode) => void
  onSelectAll: (isAll: boolean) => void
  onExitSelectMode: () => void
}
export interface MultipleModeBarType {
  show: () => void
  setIsSelectAll: (isAll: boolean) => void
  setSwitchMode: (mode: SelectMode) => void
  exitSelectMode: () => void
}

export default forwardRef<MultipleModeBarType, MultipleModeBarProps>(({ onSelectAll, onSwitchMode, onExitSelectMode }, ref) => {
  const [visible, setVisible] = useState(false)
  const [animatePlayed, setAnimatPlayed] = useState(true)
  const animFade = useRef(new Animated.Value(0)).current
  const animTranslateY = useRef(new Animated.Value(0)).current
  const [selectMode, setSelectMode] = useState<SelectMode>('single')
  const [isSelectAll, setIsSelectAll] = useState(false)
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    show() {
      handleShow()
    },
    setIsSelectAll(isAll) {
      setIsSelectAll(isAll)
    },
    setSwitchMode(mode: SelectMode) {
      setSelectMode(mode)
    },
    exitSelectMode() {
      handleHide()
    },
  }))

  const handleShow = useCallback(() => {
    setVisible(true)
    setAnimatPlayed(false)
    requestAnimationFrame(() => {
      animTranslateY.setValue(20)
      Animated.parallel([
        Animated.timing(animFade, {
          toValue: 0.92,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(animTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setAnimatPlayed(true)
      })
    })
  }, [animFade, animTranslateY])

  const handleHide = useCallback(() => {
    setAnimatPlayed(false)
    Animated.parallel([
      Animated.timing(animFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(animTranslateY, {
        toValue: 20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(finished => {
      if (!finished) return
      setVisible(false)
      setAnimatPlayed(true)
    })
  }, [animFade, animTranslateY])

  const handleSelectAll = useCallback(() => {
    const selectAll = !isSelectAll
    setIsSelectAll(selectAll)
    onSelectAll(selectAll)
  }, [isSelectAll, onSelectAll])

  const component = useMemo(() => {
    return (
      <Animated.View style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: '100%',
        height: MULTI_SELECT_BAR_HEIGHT,
        flexDirection: 'row',
        borderBottomWidth: px(1),
        borderBottomColor: theme.hairline,
        backgroundColor: theme['surface-2'],
        opacity: animFade,
        transform: [{ translateY: animTranslateY }],
      }}>
        <View style={{ flexDirection: 'row', flex: 1 }}>
          <TouchableOpacity
            onPress={() => { onSwitchMode('single') }}
            style={{
              paddingHorizontal: px(18),
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selectMode == 'single' ? theme['accent-soft'] : undefined,
              borderRadius: px(8),
            }}
          >
            <CarText size={15} weight="500" color={selectMode == 'single' ? theme.accent : theme['text-1']}>{global.i18n.t('list_select_single')}</CarText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { onSwitchMode('range') }}
            style={{
              paddingHorizontal: px(18),
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selectMode == 'range' ? theme['accent-soft'] : undefined,
              borderRadius: px(8),
            }}
          >
            <CarText size={15} weight="500" color={selectMode == 'range' ? theme.accent : theme['text-1']}>{global.i18n.t('list_select_range')}</CarText>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleSelectAll} style={{ paddingHorizontal: px(18), alignItems: 'center', justifyContent: 'center' }}>
          <CarText size={15} weight="500" color={theme['text-1']}>{global.i18n.t(isSelectAll ? 'list_select_unall' : 'list_select_all')}</CarText>
        </TouchableOpacity>
        <TouchableOpacity onPress={onExitSelectMode} style={{ paddingHorizontal: px(18), alignItems: 'center', justifyContent: 'center' }}>
          <CarText size={15} weight="500" color={theme['text-2']}>{global.i18n.t('list_select_cancel')}</CarText>
        </TouchableOpacity>
      </Animated.View>
    )
  }, [animFade, animTranslateY, selectMode, theme, handleSelectAll, isSelectAll, onExitSelectMode, onSwitchMode])

  return !visible && animatePlayed ? null : component
})
