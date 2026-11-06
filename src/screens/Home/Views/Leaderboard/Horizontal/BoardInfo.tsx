import { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import Image from '@/components/common/Image'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { CarIcon, CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { type BoardItem } from '@/store/leaderboard/state'

export interface BoardInfoProps {
  board: BoardItem | null
  source: LX.OnlineSource
  /** 榜单封面，暂用榜首歌曲封面 */
  pic?: string
  total: number
  onPlay: () => void
  onCollect: () => void
}

// 设计稿榜单头：封面 112 + 来源/歌曲数 + 榜名 40/700 + 右侧 播放 / 收藏
export default memo(({ board, source, pic, total, onPlay, onCollect }: BoardInfoProps) => {
  const theme = useTheme()
  const t = useI18n()
  const sourceNameType = useSettingValue('common.sourceNameType')
  const sourceLabel = t(`source_${sourceNameType}_${source}`)

  return (
    <View style={{ minHeight: px(119), paddingHorizontal: px(20), flexDirection: 'row', alignItems: 'center', gap: px(28) }}>
      <View style={{
        width: px(112),
        height: px(112),
        borderRadius: px(18),
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme['art-stroke'],
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.glass,
      }}>
        {pic
          ? <Image url={pic} style={{ width: '100%', height: '100%' }} />
          : <CarIcon name="lucide-trophy" size={40} color={theme['text-3']} />}
      </View>
      <View style={{ flex: 1, gap: px(6) }}>
        <CarText size={15} weight="600" color={theme.accent} numberOfLines={1}>
          {total ? `${sourceLabel} · ${t('board_track_count', { num: total })}` : sourceLabel}
        </CarText>
        <CarText size={40} weight="700" numberOfLines={1}>{board?.name ?? ''}</CarText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(14) }}>
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!board}
          onPress={onPlay}
          style={{
            height: px(64),
            flexDirection: 'row',
            alignItems: 'center',
            gap: px(10),
            paddingHorizontal: px(32),
            borderRadius: px(18),
            backgroundColor: theme['text-1'],
          }}
        >
          <CarIcon name="ph-play-fill" size={22} color={theme['on-primary']} />
          <CarText size={19} weight="600" color={theme['on-primary']}>{t('play')}</CarText>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={!board}
          onPress={onCollect}
          style={{
            width: px(64),
            height: px(64),
            borderRadius: px(18),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme['glass-strong'],
          }}
        >
          <CarIcon name="ph-heart" size={26} color={theme['text-1']} />
        </TouchableOpacity>
      </View>
    </View>
  )
})
