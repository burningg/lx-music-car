import { useEffect, useReducer } from 'react'
import { FlatList, Modal, Pressable, View } from 'react-native'
import { CarText, IconButton, TrackRow } from '@/components/car'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { usePlayInfo, usePlayMusicInfo } from '@/store/player/hook'
import playerState from '@/store/player/state'
import { getList } from '@/core/player/playInfo'
import { playListById, playNext } from '@/core/player/player'
import { addTempPlayList, removeTempPlayList } from '@/core/player/tempPlayList'
import { px } from '@/utils/pixelRatio'

interface QueueItem { musicInfo: LX.Player.PlayMusic, listId: string, tempIndex?: number }

/** 展示播放器真实列表（含优先播放项），不复用“添加到歌单”弹窗冒充队列。 */
export default ({ onClose }: { onClose: () => void }) => {
  const theme = useTheme()
  const t = useI18n()
  const { playerListId } = usePlayInfo()
  const current = usePlayMusicInfo()
  const [, refresh] = useReducer((count: number) => count + 1, 0)

  useEffect(() => {
    global.app_event.on('myListMusicUpdate', refresh)
    global.state_event.on('playTempPlayListChanged', refresh)
    return () => {
      global.app_event.off('myListMusicUpdate', refresh)
      global.state_event.off('playTempPlayListChanged', refresh)
    }
  }, [])

  const items: QueueItem[] = [
    ...playerState.tempPlayList.map((item, tempIndex) => ({ musicInfo: item.musicInfo, listId: item.listId, tempIndex })),
    ...(playerListId ? getList(playerListId).map(musicInfo => ({ musicInfo, listId: playerListId })) : []),
  ]
  if (!items.length && current.musicInfo) items.push({ musicInfo: current.musicInfo, listId: current.listId ?? '' })

  const select = (item: QueueItem) => {
    if (item.tempIndex != null) {
      removeTempPlayList(item.tempIndex)
      addTempPlayList([{ listId: item.listId, musicInfo: item.musicInfo, isTop: true }])
      void playNext()
    } else if (item.listId) {
      void playListById(item.listId, item.musicInfo.id)
    }
  }

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: '#00000066' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('close')} onPress={onClose} style={{ flex: 1 }} />
        <View style={{ width: px(800), maxWidth: '90%', height: '100%', padding: px(40), backgroundColor: theme['surface-2'], gap: px(24) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <CarText size={32} weight="700">{`${t('car_queue')} · ${items.length}`}</CarText>
            <IconButton icon="lucide-x" size={64} accessibilityLabel={t('close')} onPress={onClose} />
          </View>
          <FlatList
            data={items}
            keyExtractor={(item, index) => `${index}:${item.musicInfo.id}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: px(12) }}
            ListEmptyComponent={<CarText size={24} color={theme['text-2']}>{t('car_queue_empty')}</CarText>}
            renderItem={({ item, index }) => {
              const music = 'progress' in item.musicInfo ? item.musicInfo.metadata.musicInfo : item.musicInfo
              return <TrackRow index={index + 1} title={music.name} artist={music.singer} playing={current.musicInfo?.id == item.musicInfo.id} onPress={() => { select(item) }} />
            }}
          />
        </View>
      </View>
    </Modal>
  )
}
