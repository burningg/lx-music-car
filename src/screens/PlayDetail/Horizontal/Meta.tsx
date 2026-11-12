import { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { usePlayerMusicInfo, usePlayMusicInfo } from '@/store/player/hook'
import { useMyList } from '@/store/list/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import useWindowSize from '@/utils/hooks/useWindowSize'
import listState from '@/store/list/state'
import { LIST_IDS } from '@/config/constant'
import { setActiveList } from '@/core/list'
import { setNavActiveId } from '@/core/common'
import { navigations, popToRoot } from '@/navigation'

// SPRSH 歌曲信息：464px 宽，来源行 + 歌名 52/700 + 音质标签 + 歌手/专辑 26
export default memo(({ componentId }: { componentId: string }) => {
  useWindowSize()
  const theme = useTheme()
  const t = useI18n()
  const musicInfo = usePlayerMusicInfo()
  const { musicInfo: playMusicInfo, listId } = usePlayMusicInfo()
  const lists = useMyList()
  const sourceNameType = useSettingValue('common.sourceNameType')

  const meta = playMusicInfo ? ('progress' in playMusicInfo ? playMusicInfo.metadata.musicInfo.meta : playMusicInfo.meta) : null
  const source = playMusicInfo ? ('progress' in playMusicInfo ? playMusicInfo.metadata.musicInfo.source : playMusicInfo.source) : null

  const sourceLabel = source == null
    ? ''
    : source == 'local' ? t('car_local_source') : t(`source_${sourceNameType}_${source}`)

  const sourceList = playMusicInfo ? lists.find(list => list.id == listId) : undefined
  const onlineList = playMusicInfo && listId == LIST_IDS.TEMP ? listState.tempListMeta.songlistInfo : undefined
  const listName = sourceList?.name ?? onlineList?.name ?? ''
  const canOpenList = !!(sourceList ?? onlineList)

  const handleOpenList = () => {
    if (sourceList) {
      setActiveList(sourceList.id)
      setNavActiveId('nav_love')
      void popToRoot(componentId)
    } else if (onlineList) {
      navigations.pushSonglistDetailScreen(componentId, onlineList)
    }
  }

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
      {/* PpGhw：来源歌单可点击；仅有平台来源时保留文本展示。 */}
      <TouchableOpacity
        onPress={handleOpenList}
        disabled={!canOpenList}
        accessibilityRole={canOpenList ? 'button' : undefined}
        activeOpacity={0.6}
        hitSlop={{ top: px(10), bottom: px(10) }}
        style={{ minHeight: px(28), minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: px(10) }}
      >
        <View style={{ width: px(8), height: px(8), flexShrink: 0, borderRadius: px(4), backgroundColor: theme.accent }} />
        <CarText size={20} lineHeight={1.4} color={theme['text-2']} numberOfLines={2} ellipsizeMode="tail" style={{ flex: 1, minWidth: 0 }}>
          {listName ? `${t('car_from_list')} · ${listName}` : sourceLabel}
        </CarText>
      </TouchableOpacity>
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
