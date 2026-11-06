import { memo, useEffect, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
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
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: px(8) }}>
      <CarText size={27} weight="600" lineHeight={1.3} num numberOfLines={1} style={{ flexShrink: 1 }}>{value}</CarText>
      <CarText size={18} color={theme['text-2']}>{label}</CarText>
    </View>
  )
}

// 详情页使用大封面和独立统计行；长标题/简介可滚动，不挤压或裁切文字。
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
    height: px(72),
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: px(12),
    borderRadius: px(20),
  }

  return (
    <ScrollView
      style={{ width: px(432), flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ paddingBottom: px(16) }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.6} onPress={onBack} style={{ minHeight: px(52), flexDirection: 'row', alignItems: 'center', gap: px(10) }}>
          <CarIcon name="lucide-chevron-left" size={26} color={theme['text-2']} />
          <CarText size={20} color={theme['text-2']}>{t('nav_songlist')}</CarText>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onCollect}
          accessibilityRole="button"
          accessibilityLabel={t('collect')}
          style={{ width: px(52), height: px(52), borderRadius: px(18), backgroundColor: theme.glass, alignItems: 'center', justifyContent: 'center' }}
        >
          <CarIcon name="ph-heart" size={26} color={theme['text-1']} />
        </TouchableOpacity>
      </View>
      <View style={{ marginTop: px(24), width: '100%', aspectRatio: 1, borderRadius: px(24), overflow: 'hidden', borderWidth: px(1), borderColor: theme['art-stroke'] }}>
        <Image nativeID={`${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_to_${listInfo.id}`} url={pic} style={{ width: '100%', height: '100%' }} />
      </View>
      <View style={{ marginTop: px(24), gap: px(12) }} nativeID={NAV_SHEAR_NATIVE_IDS.songlistDetail_title}>
        <CarText size={44} weight="700" lineHeight={1.2} numberOfLines={2}>{info.name}</CarText>
        {info.desc ? <CarText size={20} lineHeight={1.4} color={theme['text-2']} numberOfLines={3}>{info.desc}</CarText> : null}
      </View>
      <View style={{ marginTop: px(16), flexDirection: 'row', alignItems: 'center', gap: px(24) }}>
        <Stat value={String(info.total || 0)} label={t('car_playlist_songs')} />
        {info.playCount ? <Stat value={info.playCount} label={t('car_playlist_plays')} /> : null}
      </View>
      <View style={{ marginTop: px(24), flexDirection: 'row', gap: px(16) }}>
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.8} onPress={onPlay} style={{ ...playBtn, backgroundColor: theme['text-1'] }}>
          <CarIcon name="ph-play-fill" size={26} color={theme['on-primary']} />
          <CarText size={22} weight="600" color={theme['on-primary']}>{t('play')}</CarText>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} onPress={onShuffle} style={{ ...playBtn, backgroundColor: theme['glass-strong'] }}>
          <CarIcon name="ph-shuffle-bold" size={26} color={theme['text-1']} />
          <CarText size={22} weight="600">{t('play_list_random')}</CarText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
})
