import { memo, useRef } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { useStatusText } from '@/store/player/hook'
import { useI18n } from '@/lang'
import { CarIcon, CarText, IconButton, useCurrentMusicLoved } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { collectMusic, uncollectMusic } from '@/core/player/player'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import MusicAddModal, { type MusicAddModalType } from '@/components/MusicAddModal'

// 设计稿副操作行：左侧输出信息胶囊，右侧 收藏 / 评论 / 添加到歌单
export default memo(() => {
  const theme = useTheme()
  const t = useI18n()
  const statusText = useStatusText()
  const loved = useCurrentMusicLoved()
  const sourceNameType = useSettingValue('common.sourceNameType')
  const musicAddModalRef = useRef<MusicAddModalType>(null)

  const playMusicInfo = playerState.playMusicInfo.musicInfo
  const source = playMusicInfo ? ('progress' in playMusicInfo ? playMusicInfo.metadata.musicInfo.source : playMusicInfo.source) : null
  const sourceLabel = source == null
    ? ''
    : source == 'local' ? t('car_local_source') : t(`source_${sourceNameType}_${source}`)

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
    <View style={{ height: px(42), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ height: px(42), flexDirection: 'row', alignItems: 'center', gap: px(10), paddingHorizontal: px(16), borderRadius: 999, backgroundColor: theme.glass }}>
        <CarIcon name="lucide-speaker" size={18} color={theme['text-2']} />
        <CarText size={15} color={theme['text-2']} numberOfLines={1}>{statusText || sourceLabel}</CarText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
        <IconButton
          icon={loved ? 'ph-heart-fill' : 'ph-heart'}
          iconSize={28}
          size={44}
          color={loved ? theme.accent : theme['text-2']}
          onPress={loved ? uncollectMusic : collectMusic}
        />
        <IconButton icon="lucide-message-square-quote" iconSize={26} size={44} color={theme['text-2']} onPress={openComment} />
        <IconButton icon="lucide-list-music" iconSize={26} size={44} color={theme['text-2']} onPress={showAddMusic} />
      </View>
      <MusicAddModal ref={musicAddModalRef} />
    </View>
  )
})
