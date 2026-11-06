import { useRef } from 'react'
import { View } from 'react-native'

import MusicList from './MusicList'
import ListsPanel, { type ListsPanelType } from './MyList'
import { AmbientBackground } from '@/components/car'

// 设计稿我的音乐：左歌单栏 440 + 右歌曲列表
export default () => {
  const listsPanelRef = useRef<ListsPanelType>(null)

  return (
    <View style={{ flex: 1 }}>
      <AmbientBackground variant="glow" />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <ListsPanel ref={listsPanelRef} />
        <View style={{ flex: 1 }}>
          <MusicList
            onShowListMenu={() => { listsPanelRef.current?.showActiveListMenu() }}
            onShowSort={() => { listsPanelRef.current?.showSort() }}
          />
        </View>
      </View>
    </View>
  )
}
