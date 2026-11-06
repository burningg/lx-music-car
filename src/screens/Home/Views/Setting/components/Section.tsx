import { View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'


interface Props {
  title: string
  desc?: string
  /** 卡片上方的独立区块，如主题色板 */
  header?: React.ReactNode
  children: React.ReactNode | React.ReactNode[]
}

// 设计稿设置页：标题 40/700 + 描述 16，下方选项收在一张圆角 22 的卡片里，行间用 1px 分隔线
export default ({ title, desc, header, children }: Props) => {
  const theme = useTheme()

  return (
    <View style={{ gap: px(28), paddingBottom: px(48) }}>
      <View style={{ gap: px(6) }}>
        <CarText size={40} weight="700">{title}</CarText>
        {desc ? <CarText size={16} color={theme['text-2']}>{desc}</CarText> : null}
      </View>
      {header}
      <View style={{
        padding: px(6),
        borderRadius: px(22),
        borderWidth: 1,
        borderColor: theme.hairline,
        backgroundColor: theme.surface,
      }}>
        {/* 每行自带顶部分隔线，内层裁剪并上移 1px 藏住第一条 */}
        <View style={{ overflow: 'hidden' }}>
          <View style={{ marginTop: -1 }}>
            {children}
          </View>
        </View>
      </View>
    </View>
  )
}
