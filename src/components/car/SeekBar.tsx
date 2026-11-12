import { memo, useCallback, useRef, useState } from 'react'
import { PanResponder, View, type ColorValue } from 'react-native'
import { useDrag } from '@/utils/hooks'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'
import useWindowSize from '@/utils/hooks/useWindowSize'

export interface SeekBarProps {
  progress: number
  duration: number
  buffered?: number
  /** 可见条高度（设计稿 px） */
  barHeight?: number
  /** 触控区高度（设计稿 px） */
  touchHeight?: number
  /** 可见条在触控区中的位置，默认居中 */
  align?: 'center' | 'bottom'
  seekable?: boolean
  color?: ColorValue
  trackColor?: ColorValue
  /** 默认不显示，播放页使用 22px 拖动点。 */
  thumbSize?: number
  thumbColor?: ColorValue
  /** 轨道中心距触控区顶部的位置，默认居中。 */
  trackCenter?: number
}

const Bar = ({ width, color }: { width: `${number}%`, color?: ColorValue }) => (
  <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width, backgroundColor: color, borderRadius: 99 }} />
)

/**
 * 进度条：触控层与可见条同宽，onLayout 测的就是可见条宽度，
 * 加大触控区不影响点击位置换算
 */
export default memo(({ progress, duration, buffered, barHeight = 3, touchHeight = 24, align = 'center', seekable = true, color, trackColor, thumbSize = 0, thumbColor, trackCenter }: SeekBarProps) => {
  useWindowSize()
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
  const fraction = Math.min(Math.max(Number.isFinite(current) ? current : 0, 0), 1)
  return (
    <View
      style={{ height: px(touchHeight), justifyContent: align == 'bottom' ? 'flex-end' : 'center' }}
      onLayout={seekable ? onLayout : undefined}
      {...(seekable ? panResponder.panHandlers : null)}
    >
      <View style={{ height: px(barHeight), borderRadius: 99, backgroundColor: trackColor ?? theme['track-bg'], overflow: 'hidden', ...(trackCenter != null ? { position: 'absolute', left: 0, right: 0, top: px(trackCenter) - px(barHeight) / 2 } as const : {}) }}>
        {buffered != null ? <Bar width={`${Math.min(Math.max(buffered, 0), 1) * 100}%`} color={theme['glass-strong']} /> : null}
        <Bar width={`${fraction * 100}%`} color={color ?? theme.accent} />
      </View>
      {thumbSize > 0 ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: px(thumbSize), top: (trackCenter != null ? px(trackCenter) : px(touchHeight) / 2) - px(thumbSize) / 2 }}>
          <View style={{ position: 'absolute', left: `${fraction * 100}%`, width: px(thumbSize), height: px(thumbSize), borderRadius: px(thumbSize / 2), backgroundColor: thumbColor ?? theme['text-1'] }} />
        </View>
      ) : null}
    </View>
  )
})
