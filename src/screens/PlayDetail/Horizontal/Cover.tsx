import { memo, useEffect, useState } from 'react'
import { View } from 'react-native'
import Image from '@/components/common/Image'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useNavigationComponentDidAppear } from '@/navigation'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'

/** 设计稿封面：448×448，圆角 24，保留共享元素锚点 */
export default memo(({ componentId }: { componentId: string }) => {
  const theme = useTheme()
  const musicInfo = usePlayerMusicInfo()

  const [animated, setAnimated] = useState(!!commonState.componentIds.playDetail)
  const [pic, setPic] = useState(musicInfo.pic)
  useEffect(() => {
    if (animated) setPic(musicInfo.pic)
  }, [musicInfo.pic, animated])

  useNavigationComponentDidAppear(componentId, () => {
    setAnimated(true)
  })

  return (
    <View style={{
      width: px(448),
      height: px(448),
      borderRadius: px(24),
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme['art-stroke'],
      elevation: animated ? 3 : 0,
    }}>
      <Image url={pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} style={{ width: '100%', height: '100%' }} />
    </View>
  )
})
