import { memo, useCallback, useRef, useState } from 'react'
import { PanResponder, View, type ColorValue } from 'react-native'
import { useDrag } from '@/utils/hooks'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'

export interface SeekBarProps {
  progress: number
  duration: number
  /** 可见条高度（设计稿 px） */
  barHeight?: number
  /** 触控区高度（设计稿 px） */
  touchHeight?: number
  /** 可见条在触控区中的位置，默认居中 */
  align?: 'center' | 'bottom'
  seekable?: boolean
  color?: ColorValue
  trackColor?: ColorValue
}

const Bar = ({ width, color }: { width: `${number}%`, color?: ColorValue }) => (
  <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width, backgroundColor: color, borderRadius: 99 }} />
)

/**
 * 进度条：触控层与可见条同宽，onLayout 测的就是可见条宽度，
 * 加大触控区不影响点击位置换算
 */
export default memo(({ progress, duration, barHeight = 3, touchHeight = 24, align = 'center', seekable = true, color, trackColor }: SeekBarProps) => {
  const theme = useTheme()
  const [dragging, setDragging] = useState(false)
  const [dragProgress, setDragProgress] = useState(0)
  const durationRef = useRef(duration)
  durationRef.current = duration

  const onSetProgress = useCallback((value: number) => {
    global.app_event.setProgress(value * durationRef.current)
  }, [])
  const { onLayout, onDragStart, onDragEnd, onDrag } = useDrag(onSetProgress, setDragging, setDragProgress)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        onDragStart(gestureState.dx, evt.nativeEvent.locationX)
      },
      onPanResponderMove: (evt, gestureState) => {
        onDrag(gestureState.dx)
      },
      onPanResponderRelease: () => {
        onDragEnd()
      },
    }),
  ).current

  const current = dragging ? dragProgress : progress
  return (
    <View
      style={{ height: px(touchHeight), justifyContent: align == 'bottom' ? 'flex-end' : 'center' }}
      onLayout={seekable ? onLayout : undefined}
      {...(seekable ? panResponder.panHandlers : null)}
    >
      <View style={{ height: px(barHeight), borderRadius: 99, backgroundColor: trackColor ?? theme['track-bg'], overflow: 'hidden' }}>
        <Bar width={`${Math.min(Math.max(current, 0), 1) * 100}%`} color={color ?? theme.accent} />
      </View>
    </View>
  )
})
