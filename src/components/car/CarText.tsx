import { memo } from 'react'
import { Text, StyleSheet, type TextProps, type ColorValue } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { sp } from '@/utils/pixelRatio'
import useWindowSize from '@/utils/hooks/useWindowSize'
import { getFontStyle, type FontWeight } from '@/theme/fonts'

export interface CarTextProps extends TextProps {
  /** 设计稿字号 */
  size?: number
  weight?: FontWeight
  color?: ColorValue
  /** 数字、时间等使用 Inter */
  num?: boolean
  /** 行高倍数 */
  lineHeight?: number
}

export default memo(({ size = 19, weight = '400', color, num = false, lineHeight, style, children, ...props }: CarTextProps) => {
  useWindowSize()
  const theme = useTheme()
  const fontSize = sp(size)

  return (
    <Text
      style={StyleSheet.compose({
        fontSize,
        color: color ?? theme['text-1'],
        lineHeight: lineHeight ? Math.round(fontSize * lineHeight) : undefined,
        ...getFontStyle(weight, num),
      }, style)}
      {...props}
    >{children}</Text>
  )
})
