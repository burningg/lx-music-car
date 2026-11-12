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
import useWindowSize from '@/utils/hooks/useWindowSize'
import ActionButton from './ActionButton'

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

// drstA：576px 居中控制组，24px 间距，112px 主播放按钮。
export default memo(() => {
  useWindowSize()
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

  const accentLabel = theme.isDark ? theme.accent : '#A93616'

  return (
    <View style={{ width: px(576), height: px(112), flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: px(24) }}>
      <ActionButton
        icon="ph-shuffle"
        label={t('play_list_random')}
        labelSize={20}
        selected={playMode == MUSIC_TOGGLE_MODE.random}
        color={playMode == MUSIC_TOGGLE_MODE.random ? theme.accent : theme['text-2']}
        labelColor={playMode == MUSIC_TOGGLE_MODE.random ? accentLabel : theme['text-2']}
        onPress={toggleShuffle}
      />
      <IconButton icon="ph-skip-back-fill" iconSize={44} size={88} background={theme.glass} color={theme['text-1']} accessibilityLabel={t('play_prev')} onPress={handlePlayPrev} />
      <IconButton
        icon={isPlay ? 'ph-pause-fill' : 'ph-play-fill'}
        iconSize={48}
        size={112}
        background={theme['text-1']}
        color={theme['on-primary']}
        style={{ shadowColor: theme['shadow-soft'], shadowOffset: { width: 0, height: px(16) }, shadowRadius: px(40), shadowOpacity: 1, elevation: 3 }}
        accessibilityLabel={t(isPlay ? 'pause' : 'play')}
        onPress={togglePlay}
      />
      <IconButton icon="ph-skip-forward-fill" iconSize={44} size={88} background={theme.glass} color={theme['text-1']} accessibilityLabel={t('play_next')} onPress={handlePlayNext} />
      <ActionButton
        icon="ph-repeat"
        label={t(playMode == MUSIC_TOGGLE_MODE.listLoop ? 'car_list_loop' : MODE_LABEL[playMode])}
        labelSize={20}
        selected={loopActive}
        color={loopActive ? theme.accent : theme['text-2']}
        labelColor={loopActive ? accentLabel : theme['text-2']}
        onPress={nextPlayMode}
      />
    </View>
  )
})
