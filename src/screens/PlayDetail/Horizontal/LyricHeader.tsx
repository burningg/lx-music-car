import { TouchableOpacity, View } from 'react-native'
import { CarText } from '@/components/car'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { px } from '@/utils/pixelRatio'
import PlayerIcon from './PlayerIcon'

export default ({ onFullscreen }: { onFullscreen: () => void }) => {
  const theme = useTheme()
  const t = useI18n()
  return (
    <View style={{ height: px(64), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <CarText size={24} weight="500" color={theme['text-2']}>{t('play_detail_setting_lyrics')}</CarText>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('car_fullscreen_lyrics')}
        onPress={onFullscreen}
        style={{ height: px(64), borderRadius: px(20), backgroundColor: theme.glass, flexDirection: 'row', gap: px(12), paddingHorizontal: px(20), alignItems: 'center' }}
      >
        <PlayerIcon name="ph-corners-out" size={28} color={theme['text-1']} />
        <CarText size={20} weight="500">{t('car_fullscreen')}</CarText>
      </TouchableOpacity>
    </View>
  )
}
