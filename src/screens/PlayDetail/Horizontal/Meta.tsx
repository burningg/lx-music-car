import { memo } from 'react'
import { View } from 'react-native'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import useWindowSize from '@/utils/hooks/useWindowSize'
import listState from '@/store/list/state'
import playerState from '@/store/player/state'

// SPRSH 歌曲信息：464px 宽，来源行 + 歌名 52/700 + 音质标签 + 歌手/专辑 26
export default memo(() => {
  useWindowSize()
  const theme = useTheme()
  const t = useI18n()
  const musicInfo = usePlayerMusicInfo()
  const sourceNameType = useSettingValue('common.sourceNameType')

  const playMusicInfo = playerState.playMusicInfo.musicInfo
  const meta = playMusicInfo ? ('progress' in playMusicInfo ? playMusicInfo.metadata.musicInfo.meta : playMusicInfo.meta) : null
  const source = playMusicInfo ? ('progress' in playMusicInfo ? playMusicInfo.metadata.musicInfo.source : playMusicInfo.source) : null

  const sourceLabel = source == null
    ? ''
    : source == 'local' ? t('car_local_source') : t(`source_${sourceNameType}_${source}`)

  const listId = playerState.playMusicInfo.listId
  const listName = listId ? listState.allList.find(list => list.id == listId)?.name ?? '' : ''

  let quality: string | undefined
  if (meta && '_qualitys' in meta) {
    const qualitys = meta._qualitys
    if (qualitys.flac24bit) quality = t('quality_lossless_24bit')
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    else if (qualitys.flac || qualitys.ape) quality = t('car_quality_lossless')
    else if (qualitys['320k']) quality = t('quality_high_quality')
  }

  const album = musicInfo.album

  return (
    <View style={{ minWidth: 0, gap: px(12) }}>
      <View style={{ minHeight: px(28), minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: px(10) }}>
        <View style={{ width: px(8), height: px(8), flexShrink: 0, borderRadius: px(4), backgroundColor: theme.accent }} />
        <CarText size={20} lineHeight={1.4} color={theme['text-2']} numberOfLines={2} ellipsizeMode="tail" style={{ flex: 1, minWidth: 0 }}>
          {listName ? `${t('car_from_list')} · ${listName}` : sourceLabel}
        </CarText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(16) }}>
        <CarText size={52} weight="700" lineHeight={1.25} numberOfLines={1} ellipsizeMode="tail" style={{ flexShrink: 1, minWidth: 0, letterSpacing: px(-0.8) }}>{musicInfo.name}</CarText>
        {quality
          ? (
            <View style={{ flexShrink: 0, paddingVertical: px(5), paddingHorizontal: px(10), borderRadius: px(6), borderWidth: px(1), borderColor: theme['badge-stroke'] }}>
              <CarText size={18} weight="500" color={theme['text-2']}>{quality}</CarText>
            </View>
            )
          : null}
      </View>
      <CarText size={26} lineHeight={1.4} color={theme['text-2']} numberOfLines={1} ellipsizeMode="tail">
        {album ? `${musicInfo.singer} — 《${album}》` : musicInfo.singer}
      </CarText>
    </View>
  )
})
