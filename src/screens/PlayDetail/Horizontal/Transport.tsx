import { memo, useCallback } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { useIsPlay } from '@/store/player/hook'
import { updateSetting } from '@/core/common'
import { MUSIC_TOGGLE_MODE_LIST, MUSIC_TOGGLE_MODE } from '@/config/constant'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { IconButton } from '@/components/car'
import { useI18n } from '@/lang'
import { toast } from '@/utils/tools'
import { px } from '@/utils/pixelRatio'

type PlayMode = typeof MUSIC_TOGGLE_MODE[keyof typeof MUSIC_TOGGLE_MODE]

const MODE_LABEL = {
  listLoop: 'play_list_loop',
  random: 'play_list_random',
  list: 'play_list_order',
  singleLoop: 'play_single_loop',
  none: 'play_single',
} as const

const handlePlayPrev = () => { void playPrev() }
const handlePlayNext = () => { void playNext() }

// 设计稿控制区：随机 32 / 上一首 48 / 播放 104 / 下一首 48 / 循环 32
export default memo(() => {
  const theme = useTheme()
  const t = useI18n()
  const isPlay = useIsPlay()
  const playMode = useSettingValue('player.togglePlayMethod') as PlayMode

  const toggleShuffle = useCallback(() => {
    updateSetting({ 'player.togglePlayMethod': playMode == MUSIC_TOGGLE_MODE.random ? MUSIC_TOGGLE_MODE.listLoop : MUSIC_TOGGLE_MODE.random })
  }, [playMode])

  const nextPlayMode = useCallback(() => {
    let index = MUSIC_TOGGLE_MODE_LIST.indexOf(playMode)
    if (++index >= MUSIC_TOGGLE_MODE_LIST.length) index = 0
    const mode = MUSIC_TOGGLE_MODE_LIST[index]
    updateSetting({ 'player.togglePlayMethod': mode })
    toast(t(MODE_LABEL[mode]))
  }, [playMode, t])

  const loopActive = playMode == MUSIC_TOGGLE_MODE.listLoop || playMode == MUSIC_TOGGLE_MODE.singleLoop

  return (
    <View style={{ height: px(104), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <IconButton
        icon="ms-shuffle"
        iconSize={32}
        size={32}
        color={playMode == MUSIC_TOGGLE_MODE.random ? theme.accent : theme['text-3']}
        onPress={toggleShuffle}
      />
      <IconButton icon="ph-skip-back-fill" iconSize={48} size={48} color={theme['text-1']} onPress={handlePlayPrev} />
      <IconButton
        icon={isPlay ? 'ph-pause-fill' : 'ph-play-fill'}
        iconSize={44}
        size={104}
        background={theme['text-1']}
        color={theme['on-primary']}
        onPress={togglePlay}
      />
      <IconButton icon="ph-skip-forward-fill" iconSize={48} size={48} color={theme['text-1']} onPress={handlePlayNext} />
      <IconButton
        icon="ms-repeat"
        iconSize={32}
        size={32}
        color={loopActive ? theme.accent : theme['text-3']}
        onPress={nextPlayMode}
      />
    </View>
  )
})
