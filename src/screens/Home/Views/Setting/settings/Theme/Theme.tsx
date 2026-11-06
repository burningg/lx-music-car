import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { View, TouchableOpacity, Image, type ImageSourcePropType } from 'react-native'
import { setTheme } from '@/core/theme'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { BG_IMAGES, getAllThemes, type LocalTheme } from '@/theme/themes'
import { CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'

const PER_ROW = 9
const COLLAPSED_COUNT = PER_ROW - 1

interface SwatchInfo {
  id: string
  name: string
  background: string
  primary: string
  isDark: boolean
  image?: ImageSourcePropType
}

const toSwatch = (theme: LX.Theme | LocalTheme, name: string): SwatchInfo => {
  const { themeColors, extInfo } = theme.config
  const background = extInfo['c-main-background'].startsWith('rgba(0, 0, 0, 0)') ? themeColors['c-primary-light-1000'] : extInfo['c-main-background']
  return {
    id: theme.id,
    name,
    background,
    primary: themeColors['c-primary'],
    isDark: theme.isDark,
    image: !theme.isCustom && extInfo['bg-image'] ? BG_IMAGES[extInfo['bg-image'] as keyof typeof BG_IMAGES] : undefined,
  }
}

const Swatch = memo(({ info, active, onPress }: { info: SwatchInfo, active: boolean, onPress: (id: string) => void }) => {
  const theme = useTheme()
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => { onPress(info.id) }} style={{ flex: 1, gap: px(10), alignItems: 'center' }}>
      <View style={{
        alignSelf: 'stretch',
        height: px(84),
        padding: px(12),
        gap: px(6),
        justifyContent: 'flex-end',
        borderRadius: px(16),
        borderWidth: active ? 3 : 1,
        borderColor: active ? theme.accent : theme.hairline,
        backgroundColor: info.background,
        overflow: 'hidden',
      }}>
        {info.image ? <Image source={info.image} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: 0.6 }} /> : null}
        <View style={{ width: px(44), height: px(6), borderRadius: px(3), backgroundColor: info.primary }} />
        <View style={{ width: px(28), height: px(6), borderRadius: px(3), backgroundColor: info.isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(26, 22, 18, 0.18)' }} />
      </View>
      <CarText size={15} weight={active ? '600' : '400'} color={active ? theme['text-1'] : theme['text-2']} numberOfLines={1}>{info.name}</CarText>
    </TouchableOpacity>
  )
})

const MoreSwatch = ({ label, count, onPress }: { label: string, count: number, onPress: () => void }) => {
  const theme = useTheme()
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={{ flex: 1, gap: px(10), alignItems: 'center' }}>
      <View style={{ alignSelf: 'stretch', height: px(84), borderRadius: px(16), borderWidth: 1, borderColor: theme.hairline, backgroundColor: theme.glass, alignItems: 'center', justifyContent: 'center' }}>
        <CarText size={22} weight="600" num>+{count}</CarText>
      </View>
      <CarText size={15} color={theme['text-2']} numberOfLines={1}>{label}</CarText>
    </TouchableOpacity>
  )
}

interface ThemeInfo {
  themes: Readonly<LocalTheme[]>
  userThemes: LX.Theme[]
  dataPath: string
}
const initInfo: ThemeInfo = { themes: [], userThemes: [], dataPath: '' }

// 设计稿主题区：标题行（主题 · N 套 · 当前 X）+ 每行 9 个色块，收起时显示前 8 个和「+N 全部主题」
export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const activeId = useSettingValue('theme.id')
  const [showAll, setShowAll] = useState(false)
  const [themeInfo, setThemeInfo] = useState(initInfo)
  const handleSetTheme = useCallback((id: string) => {
    requestAnimationFrame(() => {
      setTheme(id)
    })
  }, [])

  useEffect(() => {
    void getAllThemes().then(setThemeInfo)
  }, [])

  const swatches = useMemo(() => [
    ...themeInfo.themes.map(item => toSwatch(item, t(`theme_${item.id}`))),
    ...themeInfo.userThemes.map(item => toSwatch(item, item.name)),
  ], [themeInfo, t])

  const rows = useMemo(() => {
    let items: Array<SwatchInfo | null> = swatches
    if (!showAll && swatches.length > PER_ROW) {
      items = swatches.slice(0, COLLAPSED_COUNT)
      // 当前主题不在前 8 个时替换最后一个，保证收起后也能看到
      const activeIndex = swatches.findIndex(s => s.id == activeId)
      if (activeIndex >= COLLAPSED_COUNT) items[COLLAPSED_COUNT - 1] = swatches[activeIndex]
      items.push(null)
    }
    const result: Array<Array<SwatchInfo | null>> = []
    for (let i = 0; i < items.length; i += PER_ROW) result.push(items.slice(i, i + PER_ROW))
    return result
  }, [swatches, showAll, activeId])

  const activeName = swatches.find(s => s.id == activeId)?.name ?? ''

  return (
    <View style={{ gap: px(16) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <CarText size={20} weight="600">{t('setting_basic_theme')}</CarText>
        <CarText size={15} color={theme['text-3']}>{t('setting_basic_theme_count', { total: swatches.length, name: activeName })}</CarText>
      </View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: 'row', gap: px(14) }}>
          {row.map(info => info
            ? <Swatch key={info.id} info={info} active={info.id == activeId} onPress={handleSetTheme} />
            : <MoreSwatch key="more" label={t('setting_basic_theme_more_btn_show')} count={swatches.length - COLLAPSED_COUNT} onPress={() => { setShowAll(true) }} />,
          )}
          {Array.from({ length: PER_ROW - row.length }, (_, i) => <View key={`pad_${i}`} style={{ flex: 1 }} />)}
        </View>
      ))}
    </View>
  )
})
