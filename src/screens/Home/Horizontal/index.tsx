import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { CarShell, MiniPlayer } from '@/components/car'
import { useNavActiveId } from '@/store/common/hook'
import { px } from '@/utils/pixelRatio'
import useWindowSize from '@/utils/hooks/useWindowSize'
import Header from './Header'
import Main from './Main'

// 迷你播放条统一在内容区底部居中，页面切换时保持相同宽度和位置；设置页不显示
const MiniPlayerSlot = () => {
  useWindowSize()
  const id = useNavActiveId()
  const [multiSelect, setMultiSelect] = useState(false)

  useEffect(() => {
    const handleChange = (visible: boolean) => { setMultiSelect(visible) }
    global.app_event.on('myListMultiSelectChanged', handleChange)
    return () => {
      global.app_event.off('myListMultiSelectChanged', handleChange)
    }
  }, [])

  // 我的音乐多选时由多选浮条接管底部，迷你播放条让位
  if (id == 'nav_setting' || (id == 'nav_love' && multiSelect)) return null
  return (
    <View pointerEvents="box-none" style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: px(24),
      alignItems: 'center',
    }}>
      <MiniPlayer isHome />
    </View>
  )
}

export default () => {
  return (
    <CarShell>
      <Header />
      <Main />
      <MiniPlayerSlot />
    </CarShell>
  )
}
