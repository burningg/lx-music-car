import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'

import Header from './Header'
import BoardInfo from './BoardInfo'
import BoardsList from '../BoardsList'
import MusicList, { type MusicListType, type BoardLoadedInfo } from '../MusicList'
import { getLeaderboardSetting, saveLeaderboardSetting } from '@/utils/data'
import { getBoardsList } from '@/core/leaderboard'
import { AmbientBackground, ListFade } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { handleCollect, handlePlay } from '../listAction'
import { type BoardItem } from '@/store/leaderboard/state'
import boardState from '@/store/leaderboard/state'

// 设计稿排行榜：内边距 44/72，顶栏 → 左榜单栏 400 + 右榜单详情
export default () => {
  const musicListRef = useRef<MusicListType>(null)
  const isUnmountedRef = useRef(false)
  const [source, setSource] = useState<LX.OnlineSource>('kw')
  const [boards, setBoards] = useState<BoardItem[]>([])
  const [board, setBoard] = useState<BoardItem | null>(null)
  const [loaded, setLoaded] = useState<BoardLoadedInfo>({ total: 0 })

  const loadBoards = async(currentSource: LX.OnlineSource, boundId?: string) => {
    return getBoardsList(currentSource).then(list => {
      if (isUnmountedRef.current) return
      setBoards(list)
      const target = list.find(item => item.id == boundId) ?? list[0]
      if (!target) return
      setBoard(target)
      setLoaded({ total: 0 })
      musicListRef.current?.loadList(currentSource, target.id)
      void saveLeaderboardSetting({ source: currentSource, boardId: target.id })
    }).catch(() => {
      if (isUnmountedRef.current) return
      setBoards([])
      setBoard(null)
    })
  }

  useEffect(() => {
    isUnmountedRef.current = false
    void getLeaderboardSetting().then(({ source, boardId }) => {
      if (isUnmountedRef.current) return
      setSource(source)
      void loadBoards(source, boardId)
    })

    return () => {
      isUnmountedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSourceChange = (nextSource: LX.OnlineSource) => {
    if (nextSource == source) return
    setSource(nextSource)
    setBoards([])
    setBoard(null)
    void loadBoards(nextSource)
  }

  const handleBoardPress = (item: BoardItem) => {
    if (item.id == board?.id) return
    setBoard(item)
    setLoaded({ total: 0 })
    musicListRef.current?.loadList(source, item.id)
    void saveLeaderboardSetting({ source, boardId: item.id })
  }

  const handlePlayBoard = (id: string) => {
    void handlePlay(id, boardState.listDetailInfo.list)
  }
  const handleCollectBoard = (id: string, name: string) => {
    void handleCollect(id, name, source)
  }

  return (
    <View style={{ flex: 1 }}>
      <AmbientBackground />
      <View style={{ flex: 1, paddingTop: px(44), paddingHorizontal: px(72), gap: px(28) }}>
        <Header source={source} sources={boardState.sources} onSourceChange={handleSourceChange} />
        <View style={{ flex: 1, flexDirection: 'row', gap: px(40) }}>
          <View style={{ width: px(400) }}>
            <BoardsList
              list={boards}
              activeId={board?.id ?? ''}
              source={source}
              onPress={handleBoardPress}
              onPlay={handlePlayBoard}
              onCollect={handleCollectBoard}
            />
          </View>
          <View style={{ flex: 1, gap: px(20) }}>
            <BoardInfo
              board={board}
              source={source}
              pic={loaded.pic}
              total={loaded.total}
              onPlay={() => { board && handlePlayBoard(board.id) }}
              onCollect={() => { board && handleCollectBoard(board.id, board.name) }}
            />
            <View style={{ flex: 1 }}>
              <MusicList ref={musicListRef} onLoaded={setLoaded} />
              <ListFade />
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
