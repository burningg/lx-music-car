import { memo, useEffect, useState } from 'react'
import { View } from 'react-native'
import Image from '@/components/common/Image'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useNavigationComponentDidAppear } from '@/navigation'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'
import useWindowSize from '@/utils/hooks/useWindowSize'

/** SPRSH 封面：320×320，圆角 18，保留共享元素锚点 */
export default memo(({ componentId }: { componentId: string }) => {
  useWindowSize()
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
      width: px(320),
      height: px(320),
      borderRadius: px(18),
      backgroundColor: theme.bg,
      shadowColor: theme['shadow-strong'],
      shadowOffset: { width: 0, height: px(24) },
      shadowRadius: px(60),
      shadowOpacity: animated ? 1 : 0,
      elevation: animated ? 3 : 0,
    }}>
      <View style={{ flex: 1, borderRadius: px(18), overflow: 'hidden', borderWidth: 1, borderColor: theme['art-stroke'] }}>
        <Image url={pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} style={{ width: '100%', height: '100%' }} />
      </View>
    </View>
  )
})
