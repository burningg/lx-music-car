import { useState, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { Animated, TouchableOpacity, View } from 'react-native'

import { CarIcon, CarText } from '@/components/car'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { px } from '@/utils/pixelRatio'

export type SelectMode = 'single' | 'range'

export interface MultipleModeBarProps {
  onSwitchMode: (mode: SelectMode) => void
  onSelectAll: (isAll: boolean) => void
  onExitSelectMode: () => void
  onPlayLater: () => void
  onAdd: () => void
  onMove: () => void
  onRemove: () => void
}
export interface MultipleModeBarType {
  show: () => void
  setVisibleBar: (visible: boolean) => void
  setIsSelectAll: (isAll: boolean) => void
  setSwitchMode: (mode: SelectMode) => void
  exitSelectMode: () => void
}

// 设计稿多选浮条：1200×92，圆角 26，左侧模式分段，右侧批量操作
export default forwardRef<MultipleModeBarType, MultipleModeBarProps>(({
  onSelectAll,
  onSwitchMode,
  onExitSelectMode,
  onPlayLater,
  onAdd,
  onMove,
  onRemove,
}, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const [visible, setVisible] = useState(false)
  const [animatePlayed, setAnimatPlayed] = useState(true)
  const animFade = useRef(new Animated.Value(0)).current
  const animTranslateY = useRef(new Animated.Value(0)).current
  const [selectMode, setSelectMode] = useState<SelectMode>('single')
  const [isSelectAll, setIsSelectAll] = useState(false)
  const [visibleBar, setVisibleBar] = useState(true)

  useImperativeHandle(ref, () => ({
    show() {
      handleShow()
    },
    setVisibleBar(visible) {
      setVisibleBar(visible)
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
          toValue: 1,
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

  const segStyle = {
    height: px(45),
    minWidth: px(78),
    paddingHorizontal: px(22),
    borderRadius: 999,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }
  const actionStyle = {
    height: px(64),
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: px(10),
    paddingHorizontal: px(20),
    borderRadius: px(18),
  }

  const component = useMemo(() => {
    return (
      <Animated.View style={{
        position: 'absolute',
        alignSelf: 'center',
        width: px(1200),
        bottom: px(24),
        height: px(92),
        borderRadius: px(26),
        borderWidth: 1,
        borderColor: theme['art-stroke'],
        backgroundColor: theme['mini-bg'],
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: px(20),
        paddingRight: px(14),
        gap: px(8),
        elevation: 16,
        opacity: visibleBar ? animFade : 0,
        transform: [{ translateY: animTranslateY }],
      }}>
        <View style={{ height: px(55), flexDirection: 'row', gap: px(4), padding: px(5), borderRadius: 999, backgroundColor: theme.glass }}>
          <TouchableOpacity onPress={() => { onSwitchMode('single') }} style={{ ...segStyle, backgroundColor: selectMode == 'single' ? theme.elevated : undefined }}>
            <CarText size={17} weight={selectMode == 'single' ? '600' : '400'} color={selectMode == 'single' ? theme['text-1'] : theme['text-2']}>{t('list_select_single')}</CarText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { onSwitchMode('range') }} style={{ ...segStyle, backgroundColor: selectMode == 'range' ? theme.elevated : undefined }}>
            <CarText size={17} weight={selectMode == 'range' ? '600' : '400'} color={selectMode == 'range' ? theme['text-1'] : theme['text-2']}>{t('car_select_range')}</CarText>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSelectAll} style={{ ...segStyle, backgroundColor: isSelectAll ? theme.elevated : undefined }}>
            <CarText size={17} weight={isSelectAll ? '600' : '400'} color={isSelectAll ? theme['text-1'] : theme['text-2']}>
              {t(isSelectAll ? 'list_select_unall' : 'list_select_all')}
            </CarText>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={onPlayLater} style={actionStyle}>
          <CarIcon name="lucide-list-start" size={24} color={theme['text-1']} />
          <CarText size={18} weight="500">{t('play_later')}</CarText>
        </TouchableOpacity>
        <TouchableOpacity onPress={onAdd} style={actionStyle}>
          <CarIcon name="lucide-folder-plus" size={24} color={theme['text-1']} />
          <CarText size={18} weight="500">{t('add_to')}</CarText>
        </TouchableOpacity>
        <TouchableOpacity onPress={onMove} style={actionStyle}>
          <CarIcon name="lucide-folder-input" size={24} color={theme['text-1']} />
          <CarText size={18} weight="500">{t('move_to')}</CarText>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRemove} style={{ ...actionStyle, paddingHorizontal: px(24), backgroundColor: '#FF4D4F24' }}>
          <CarIcon name="lucide-trash-2" size={24} color="#FF6B6B" />
          <CarText size={18} weight="600" color="#FF6B6B">{t('list_remove')}</CarText>
        </TouchableOpacity>
      </Animated.View>
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animFade, animTranslateY, theme, visibleBar, selectMode, isSelectAll, handleSelectAll, onSwitchMode, onPlayLater, onAdd, onMove, onRemove, t])

  return !visible && animatePlayed ? null : component
})
