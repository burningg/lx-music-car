import { memo } from 'react'
import { View } from 'react-native'
import { useProgress } from '@/store/player/hook'
import { useBufferProgress } from '@/plugins/player'
import { useTheme } from '@/store/theme/hook'
import { CarText, SeekBar } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { formatPlayTime2 } from '@/utils/common'

// 设计稿进度：6px 轨道 + 当前/剩余时间 16/500
export default memo(() => {
  const theme = useTheme()
  const { progress, maxPlayTime, nowPlayTimeStr } = useProgress()
  const buffered = useBufferProgress()
  const remain = maxPlayTime > 0 ? formatPlayTime2(Math.max(maxPlayTime - progress * maxPlayTime, 0)) : '--:--'

  return (
    <View style={{ height: px(37) }}>
      <View style={{ position: 'absolute', top: -px(12), left: 0, right: 0 }}>
        <SeekBar progress={progress} duration={maxPlayTime} buffered={buffered} barHeight={6} touchHeight={30} color={theme['text-1']} />
      </View>
      <View style={{ marginTop: px(18), height: px(19), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <CarText size={16} weight="500" num color={theme['text-3']}>{nowPlayTimeStr}</CarText>
        <CarText size={16} weight="500" num color={theme['text-3']}>{`-${remain}`}</CarText>
      </View>
    </View>
  )
})
