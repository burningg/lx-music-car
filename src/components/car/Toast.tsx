import { memo, useEffect, useRef } from 'react'
import { Animated, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'
import CarIcon from './CarIcon'
import CarText from './CarText'
import { type ToastDuration } from './overlay'

// 设计稿 Toast：400×60 顶部胶囊，浅色底 + 强调色图标 + 深色文字
export default memo(({ message, duration, onHide }: { message: string, duration: ToastDuration, onHide: () => void }) => {
  const theme = useTheme()
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start()

    const timer = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(onHide)
    }, duration == 'long' ? 3200 : 2000)

    return () => { clearTimeout(timer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: px(60), alignItems: 'center' }}>
      <Animated.View style={{
        minWidth: px(400),
        maxWidth: px(900),
        height: px(60),
        paddingHorizontal: px(24),
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: px(12),
        backgroundColor: theme['text-1'],
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-px(16), 0] }) }],
        elevation: 12,
      }}>
        <CarIcon name="lucide-circle-check" size={22} color={theme.accent} />
        <CarText size={18} weight="600" color={theme['on-primary']} numberOfLines={2}>{message}</CarText>
      </Animated.View>
    </View>
  )
})
