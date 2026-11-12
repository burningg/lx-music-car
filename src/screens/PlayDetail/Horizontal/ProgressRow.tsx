import { memo } from 'react'
import { View } from 'react-native'
import { useProgress } from '@/store/player/hook'
import { useBufferProgress } from '@/plugins/player'
import { useTheme } from '@/store/theme/hook'
import { CarText, SeekBar } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import useWindowSize from '@/utils/hooks/useWindowSize'
import { formatPlayTime2 } from '@/utils/common'

// ESlgG：72px 操作区，8px 强调色轨道、22px 拖动点与时间。
export default memo(() => {
  useWindowSize()
  const theme = useTheme()
  const { progress, maxPlayTime, nowPlayTimeStr } = useProgress()
  const buffered = useBufferProgress()
  const remain = maxPlayTime > 0 ? formatPlayTime2(Math.max(maxPlayTime - progress * maxPlayTime, 0)).replace(/^0(?=\d:)/, '') : '--:--'

  return (
    <View style={{ height: px(72), justifyContent: 'center', gap: px(8) }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <SeekBar progress={progress} duration={maxPlayTime} buffered={buffered} barHeight={8} touchHeight={72} trackCenter={18.5} thumbSize={22} color={theme.accent} thumbColor={theme['text-1']} />
      </View>
      <View pointerEvents="none" style={{ height: px(32) }} />
      <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <CarText size={22} weight="500" num color={theme['text-2']}>{nowPlayTimeStr.replace(/^0(?=\d:)/, '')}</CarText>
        <CarText size={22} weight="500" num color={theme['text-2']}>{`-${remain}`}</CarText>
      </View>
    </View>
  )
})
