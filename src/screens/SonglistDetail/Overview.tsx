import { memo, useEffect, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import Image from '@/components/common/Image'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { CarIcon, CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { useNavigationComponentDidAppear } from '@/navigation'
import { useListInfo } from './state'

export interface OverviewInfo {
  name: string
  desc: string
  playCount: string
  total: number
  img?: string
}

export interface OverviewProps {
  componentId: string
  info: OverviewInfo
  onBack: () => void
  onPlay: () => void
  onShuffle: () => void
  onCollect: () => void
}

const Stat = ({ value, label }: { value: string, label: string }) => {
  const theme = useTheme()
  return (
    <View style={{ height: px(30), flexDirection: 'row', alignItems: 'flex-end', gap: px(8) }}>
      <CarText size={30} weight="600" num numberOfLines={1}>{value}</CarText>
      <CarText size={14} color={theme['text-3']} style={{ paddingBottom: px(2) }}>{label}</CarText>
    </View>
  )
}

// 设计稿歌单详情左栏：返回 → 封面 200 + 数据 → 名称/简介 → 播放 / 随机播放
export default memo(({ componentId, info, onBack, onPlay, onShuffle, onCollect }: OverviewProps) => {
  const theme = useTheme()
  const t = useI18n()
  const listInfo = useListInfo()
  const [pic, setPic] = useState(info.img)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    if (animated) setPic(info.img)
  }, [info.img, animated])

  useNavigationComponentDidAppear(componentId, () => {
    setAnimated(true)
  })

  const playBtn = {
    flex: 1,
    height: px(64),
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: px(10),
    borderRadius: px(18),
  }

  return (
    <View style={{ width: px(440) }}>
      <TouchableOpacity activeOpacity={0.6} onPress={onBack} style={{ marginTop: px(67), height: px(25), flexDirection: 'row', alignItems: 'center', gap: px(6), alignSelf: 'flex-start' }}>
        <CarIcon name="lucide-chevron-left" size={22} color={theme['text-2']} />
        <CarText size={17} color={theme['text-2']}>{t('nav_songlist')}</CarText>
      </TouchableOpacity>
      <View style={{ marginTop: px(28), flexDirection: 'row', gap: px(28) }}>
        <View style={{ width: px(200), height: px(200), borderRadius: px(20), overflow: 'hidden', borderWidth: 1, borderColor: theme['art-stroke'] }}>
          <Image nativeID={`${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_to_${listInfo.id}`} url={pic} style={{ width: '100%', height: '100%' }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', gap: px(18) }}>
          <Stat value={String(info.total || 0)} label={t('car_playlist_songs')} />
          {info.playCount ? <Stat value={info.playCount} label={t('car_playlist_plays')} /> : null}
        </View>
      </View>
      <View style={{ marginTop: px(28), gap: px(10) }} nativeID={NAV_SHEAR_NATIVE_IDS.songlistDetail_title}>
        <CarText size={44} weight="700" numberOfLines={2}>{info.name}</CarText>
        {info.desc ? <CarText size={16} color={theme['text-2']} numberOfLines={3}>{info.desc}</CarText> : null}
      </View>
      <View style={{ marginTop: px(28), flexDirection: 'row', gap: px(14) }}>
        <TouchableOpacity activeOpacity={0.8} onPress={onPlay} style={{ ...playBtn, backgroundColor: theme['text-1'] }}>
          <CarIcon name="ph-play-fill" size={22} color={theme['on-primary']} />
          <CarText size={19} weight="600" color={theme['on-primary']}>{t('play')}</CarText>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={onShuffle} style={{ ...playBtn, backgroundColor: theme['glass-strong'] }}>
          <CarIcon name="ph-shuffle-bold" size={22} color={theme['text-1']} />
          <CarText size={19} weight="600">{t('play_list_random')}</CarText>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onCollect}
          style={{ width: px(64), height: px(64), borderRadius: px(18), alignItems: 'center', justifyContent: 'center', backgroundColor: theme['glass-strong'] }}
        >
          <CarIcon name="ph-heart" size={26} color={theme['text-1']} />
        </TouchableOpacity>
      </View>
    </View>
  )
})
