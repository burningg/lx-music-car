import { memo, useCallback, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import Image from '@/components/common/Image'
import { navigations } from '@/navigation'
import { useIsPlay, usePlayerMusicInfo, useProgress } from '@/store/player/hook'
import { usePageVisible } from '@/store/common/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import { collectMusic, playNext, playPrev, togglePlay, uncollectMusic } from '@/core/player/player'
import { setLoadErrorPicUrl, setMusicInfo } from '@/core/player/playInfo'
import { COMPONENT_IDS, LIST_IDS, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { useKeyboard } from '@/utils/hooks'
import { px } from '@/utils/pixelRatio'
import CarText from './CarText'
import IconButton from './IconButton'
import SeekBar from './SeekBar'
import { useCurrentMusicLoved } from './hooks'

/** 设计稿 Mini Player 尺寸，页面按此预留底部空间 */
export const MINI_PLAYER_WIDTH = 1100
export const MINI_PLAYER_HEIGHT = 92

const handlePlayPrev = () => { void playPrev() }
const handlePlayNext = () => { void playNext() }
const handleOpenDetail = () => {
  if (!playerState.musicInfo.id) return
  navigations.pushPlayDetailScreen(commonState.componentIds.home!)
}
const handleJumpPosition = () => {
  const listId = playerState.playMusicInfo.listId
  if (!listId || listId == LIST_IDS.DOWNLOAD) return
  global.app_event.jumpListPosition()
}

const Progress = ({ autoUpdate }: { autoUpdate: boolean }) => {
  const { progress, maxPlayTime } = useProgress(autoUpdate)
  const seekable = useSettingValue('common.allowProgressBarSeek')
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <SeekBar progress={progress} duration={maxPlayTime} barHeight={3} touchHeight={seekable ? 20 : 3} align="bottom" seekable={seekable} trackColor="transparent" />
    </View>
  )
}

const Controls = () => {
  const theme = useTheme()
  const isPlay = useIsPlay()
  const loved = useCurrentMusicLoved()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
      <IconButton icon={loved ? 'ph-heart-fill' : 'ph-heart'} iconSize={26} color={loved ? theme.accent : theme['text-2']} onPress={loved ? uncollectMusic : collectMusic} />
      <IconButton icon="ph-skip-back-fill" iconSize={32} onPress={handlePlayPrev} />
      <IconButton icon={isPlay ? 'ph-pause-fill' : 'ph-play-fill'} iconSize={26} size={60} color={theme['on-primary']} background={theme['text-1']} onPress={togglePlay} />
      <IconButton icon="ph-skip-forward-fill" iconSize={32} onPress={handlePlayNext} />
    </View>
  )
}

// 设计稿 Mini Player：1100×92，圆角 26，左封面 64，右控制区，底部 3px 进度
export default memo(({ isHome = false }: { isHome?: boolean }) => {
  const theme = useTheme()
  const musicInfo = usePlayerMusicInfo()
  const { keyboardShown } = useKeyboard()
  const autoHidePlayBar = useSettingValue('common.autoHidePlayBar')
  const [autoUpdate, setAutoUpdate] = useState(true)

  usePageVisible([COMPONENT_IDS.home], useCallback((visible) => {
    if (isHome) setAutoUpdate(visible)
  }, [isHome]))

  const handlePicError = useCallback((url: string | number) => {
    setLoadErrorPicUrl(url as string)
    setMusicInfo({ pic: null })
  }, [])

  if (autoHidePlayBar && keyboardShown) return null

  const subtitle = musicInfo.album ? `${musicInfo.singer} · ${musicInfo.album}` : musicInfo.singer
  return (
    <View style={{
      width: px(MINI_PLAYER_WIDTH),
      height: px(MINI_PLAYER_HEIGHT),
      borderRadius: px(26),
      borderWidth: 1,
      borderColor: theme['art-stroke'],
      backgroundColor: theme['mini-bg'],
      overflow: 'hidden',
      elevation: 16,
    }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: px(20), paddingLeft: px(14), paddingRight: px(28) }}>
        <TouchableOpacity activeOpacity={0.7} onPress={handleOpenDetail} onLongPress={isHome ? handleJumpPosition : undefined}>
          <Image url={musicInfo.pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} onError={handlePicError} style={{ width: px(64), height: px(64), borderRadius: px(14) }} />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={handleOpenDetail} onLongPress={handleJumpPosition} style={{ flex: 1, gap: px(4) }}>
          <CarText size={20} weight="600" numberOfLines={1}>{musicInfo.name}</CarText>
          <CarText size={15} numberOfLines={1} color={theme['text-2']}>{subtitle}</CarText>
        </TouchableOpacity>
        <Controls />
      </View>
      <Progress autoUpdate={autoUpdate} />
    </View>
  )
})
