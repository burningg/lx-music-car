import { useRef } from 'react'
import { ScrollView, View } from 'react-native'
import NavList from './NavList'
import Main, { type MainType } from '../Main'
import { ListFade } from '@/components/car'
import { px } from '@/utils/pixelRatio'

// 设计稿设置页：左侧分区栏 + 右侧内容（内边距 44/72/0/56），底部渐隐
export default () => {
  const mainRef = useRef<MainType>(null)
  const scrollRef = useRef<ScrollView>(null)

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <NavList onChangeId={(id) => {
        mainRef.current?.setActiveId(id)
        scrollRef.current?.scrollTo({ y: 0, animated: false })
      }} />
      <View style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps={'always'} contentContainerStyle={{ paddingTop: px(44), paddingLeft: px(56), paddingRight: px(72) }}>
          <Main ref={mainRef} />
        </ScrollView>
        <ListFade height={80} />
      </View>
    </View>
  )
}
