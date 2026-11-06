/* eslint-disable @typescript-eslint/no-var-requires */
import { memo } from 'react'
import { Image, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'

const FADE_V = require('@/resources/images/ambient/fade-v.png')

/** 列表底部渐隐，避免内容被迷你播放条生硬截断；不拦截触摸 */
export default memo(({ height = 160, style }: { height?: number, style?: StyleProp<ViewStyle> }) => {
  const theme = useTheme()
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: px(height) }, style]}>
      <Image source={FADE_V} tintColor={theme.bg} resizeMode="stretch" style={{ width: '100%', height: '100%' }} />
    </View>
  )
})
