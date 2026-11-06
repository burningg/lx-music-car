import { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import Image from '@/components/common/Image'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { CarIcon, CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { formatPlayCount } from '@/utils'

export interface SongPanelProps {
  musicInfo: LX.Music.MusicInfo
  /** 当前标签页的评论总数 */
  total: number
  onBack: () => void
}

// 设计稿评论页左栏：返回 → 封面 240 → 歌名 40/700 + 歌手/专辑 → 评论数胶囊
export default memo(({ musicInfo, total, onBack }: SongPanelProps) => {
  const theme = useTheme()
  const t = useI18n()
  const album = musicInfo.meta.albumName

  return (
    <View style={{ width: px(400) }}>
      <TouchableOpacity activeOpacity={0.6} onPress={onBack} style={{ height: px(25), flexDirection: 'row', alignItems: 'center', gap: px(6), alignSelf: 'flex-start' }}>
        <CarIcon name="lucide-chevron-left" size={22} color={theme['text-2']} />
        <CarText size={17} color={theme['text-2']}>{t('car_now_playing')}</CarText>
      </TouchableOpacity>
      <View style={{ marginTop: px(32), width: px(360), height: px(360), borderRadius: px(24), overflow: 'hidden', borderWidth: 1, borderColor: theme['art-stroke'] }}>
        <Image url={musicInfo.meta.picUrl} style={{ width: '100%', height: '100%' }} />
      </View>
      <View style={{ marginTop: px(32), gap: px(8) }}>
        <CarText size={40} weight="700" numberOfLines={2}>{musicInfo.name}</CarText>
        <CarText size={18} color={theme['text-2']} numberOfLines={1}>
          {album ? `${musicInfo.singer} — 《${album}》` : musicInfo.singer}
        </CarText>
      </View>
      <View style={{
        marginTop: px(32),
        alignSelf: 'flex-start',
        height: px(43),
        flexDirection: 'row',
        alignItems: 'center',
        gap: px(10),
        paddingHorizontal: px(16),
        borderRadius: 999,
        backgroundColor: theme.glass,
      }}>
        <CarIcon name="lucide-message-circle" size={20} color={theme['text-2']} />
        <CarText size={16} weight="500">{t('car_comment_count', { num: formatPlayCount(total) })}</CarText>
      </View>
    </View>
  )
})
