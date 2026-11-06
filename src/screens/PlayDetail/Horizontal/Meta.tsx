import { memo } from 'react'
import { View } from 'react-native'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import listState from '@/store/list/state'
import playerState from '@/store/player/state'

// 设计稿歌曲信息：来源行 + 歌名 60/700 + 音质标签 + 歌手/专辑 26
export default memo(() => {
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
    else if (qualitys.flac || qualitys.ape) quality = t('quality_lossless')
    else if (qualitys['320k']) quality = t('quality_high_quality')
  }

  const album = musicInfo.album

  return (
    <View style={{ height: px(176), gap: px(14) }}>
      <View style={{ height: px(23), flexDirection: 'row', alignItems: 'center', gap: px(8) }}>
        <View style={{ width: px(7), height: px(7), borderRadius: px(4), backgroundColor: theme.accent }} />
        <CarText size={16} color={theme['text-2']} numberOfLines={1}>
          {listName ? `${t('car_from_list')} · ${listName}` : sourceLabel}
        </CarText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: px(16) }}>
        <CarText size={60} weight="700" numberOfLines={1} style={{ flexShrink: 1 }}>{musicInfo.name}</CarText>
        {quality
          ? (
            <View style={{ marginTop: px(30), paddingVertical: px(4), paddingHorizontal: px(9), borderRadius: px(6), borderWidth: 1, borderColor: theme['badge-stroke'] }}>
              <CarText size={13} color={theme['text-2']}>{quality}</CarText>
            </View>
            )
          : null}
      </View>
      <CarText size={26} color={theme['text-2']} numberOfLines={1}>
        {album ? `${musicInfo.singer} — 《${album}》` : musicInfo.singer}
      </CarText>
    </View>
  )
})
