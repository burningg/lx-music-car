import { StyleSheet } from 'react-native'
import CarText, { type CarTextProps } from '@/components/car/CarText'

// Android 默认字体额外的上下留白不在 Pen 行高中，会逐行累积并裁掉底部预览。
export default ({ style, ...props }: CarTextProps) => (
  <CarText {...props} style={StyleSheet.compose({ includeFontPadding: false }, style)} />
)
