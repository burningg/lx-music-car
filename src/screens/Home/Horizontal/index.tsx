import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { CarShell, MiniPlayer } from '@/components/car'
import { useNavActiveId } from '@/store/common/hook'
import { px } from '@/utils/pixelRatio'
import Header from './Header'
import Main from './Main'

// 迷你播放条位置随页面变化（设计稿）：歌单、搜索居中；排行榜、我的音乐靠右；设置页不显示
const MiniPlayerSlot = () => {
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
  const alignRight = id == 'nav_top' || id == 'nav_love'
  return (
    <View style={{
      alignItems: alignRight ? 'flex-end' : 'center',
      paddingRight: alignRight ? px(134) : 0,
      paddingTop: px(12),
      paddingBottom: px(24),
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
