import { memo, useRef } from 'react'
import { View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { useCurrentMusicLoved } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import useWindowSize from '@/utils/hooks/useWindowSize'
import ActionButton from './ActionButton'
import { collectMusic, uncollectMusic } from '@/core/player/player'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import MusicAddModal, { type MusicAddModalType } from '@/components/MusicAddModal'

// p9GxJ5：收藏 / 歌词 / 队列；长按保留添加到歌单与评论入口。
interface SecondaryProps {
  lyricsVisible: boolean
  onToggleLyrics: () => void
  onQueue: () => void
}

export default memo(({ lyricsVisible, onToggleLyrics, onQueue }: SecondaryProps) => {
  useWindowSize()
  const theme = useTheme()
  const t = useI18n()
  const loved = useCurrentMusicLoved()
  const musicAddModalRef = useRef<MusicAddModalType>(null)

  const openComment = () => {
    navigations.pushCommentScreen(commonState.componentIds.playDetail!)
  }
  const showAddMusic = () => {
    const musicInfo = playerState.playMusicInfo.musicInfo
    if (!musicInfo) return
    musicAddModalRef.current?.show({
      musicInfo: 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo,
      isMove: false,
      listId: playerState.playMusicInfo.listId!,
    })
  }

  return (
    <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: px(20) }}>
      <ActionButton
        icon={loved ? 'ph-heart-fill' : 'ph-heart'}
        label={t(loved ? 'car_collected' : 'collect')}
        selected={loved}
        color={loved ? theme.accent : theme['text-2']}
        onPress={loved ? uncollectMusic : collectMusic}
        onLongPress={showAddMusic}
        accessibilityHint={t('car_hold_add_to_list')}
      />
      <ActionButton
        icon="lucide-message-square-quote"
        label={t('play_detail_setting_lyrics')}
        active={lyricsVisible}
        selected={lyricsVisible}
        color={lyricsVisible ? theme.accent : theme['text-2']}
        labelColor={lyricsVisible ? theme.accent : theme['text-2']}
        onPress={onToggleLyrics}
        onLongPress={openComment}
        accessibilityHint={t('car_hold_comments')}
      />
      <ActionButton icon="ph-queue" label={t('car_queue')} color={theme['text-1']} onPress={onQueue} />
      <MusicAddModal ref={musicAddModalRef} />
    </View>
  )
})
