import { memo } from 'react'
import { View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'

// 卡片内的一组设置：标题 20/500，内容在下方，与 SettingRow 同样的内边距与顶部分隔线
export default memo(({ title, children }: {
  title: string
  children: React.ReactNode | React.ReactNode[]
}) => {
  const theme = useTheme()
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: theme.hairline, paddingVertical: px(18), paddingHorizontal: px(28), gap: px(14) }}>
      <CarText size={20} weight="500">{title}</CarText>
      {children}
    </View>
  )
})
