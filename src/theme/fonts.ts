import type { TextStyle } from 'react-native'

export type FontWeight = '400' | '500' | '600' | '700'

// 数字与英文使用打包的 Inter（android/app/src/main/assets/fonts/Inter-*.ttf）
// Android 自定义字体按文件名区分字重，不能再叠加 fontWeight，否则会被二次加粗
const INTER_FAMILY: Record<FontWeight, string> = {
  400: 'Inter-Regular',
  500: 'Inter-Medium',
  600: 'Inter-SemiBold',
  700: 'Inter-Bold',
}

/** 中文使用系统字体（Android 自带 Noto Sans CJK），字重直接走 fontWeight */
export const getFontStyle = (weight: FontWeight, num: boolean): TextStyle => {
  return num
    ? { fontFamily: INTER_FAMILY[weight], fontVariant: ['tabular-nums'] }
    : { fontWeight: weight }
}
