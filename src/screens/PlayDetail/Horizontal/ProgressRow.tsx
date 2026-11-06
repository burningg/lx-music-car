import { memo } from 'react'
import { View } from 'react-native'
import Progress from '@/components/player/Progress'
import { useProgress } from '@/store/player/hook'
import { useBufferProgress } from '@/plugins/player'
import { useTheme } from '@/store/theme/hook'
import { CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { formatPlayTime2 } from '@/utils/common'

// 设计稿进度：6px 轨道 + 当前/剩余时间 16/500
export default memo(() => {
  const theme = useTheme()
  const { progress, maxPlayTime, nowPlayTimeStr } = useProgress()
  const buffered = useBufferProgress()
  const remain = maxPlayTime > 0 ? formatPlayTime2(Math.max(maxPlayTime - progress * maxPlayTime, 0)) : '--:--'

  return (
    <View style={{ height: px(43) }}>
      <View style={{ height: px(24) }}>
        <Progress progress={progress} duration={maxPlayTime} buffered={buffered} thickness={px(6)} />
      </View>
      <View style={{ height: px(19), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <CarText size={16} weight="500" num color={theme['text-3']}>{nowPlayTimeStr}</CarText>
        <CarText size={16} weight="500" num color={theme['text-3']}>{`-${remain}`}</CarText>
      </View>
    </View>
  )
})
