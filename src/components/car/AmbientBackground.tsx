/* eslint-disable @typescript-eslint/no-var-requires */
import { memo } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'

// 白色透明度渐变图，运行时用 tintColor 着色（项目未引入渐变库）
const GLOW = require('@/resources/images/ambient/glow.png')
const SHADE_H = require('@/resources/images/ambient/shade-h.png')
const SHADE_LIGHT_H = require('@/resources/images/ambient/shade-light-h.png')
// 设计稿落日氛围预模糊，含 180 × 3 的透明扩散边缘；不随当前歌曲封面变色。
// 生成脚本：scripts/generate-night-ambient.py
const NOCTURNE_ART = require('@/resources/images/ambient/nocturne-art.png')
const ART_SIZE = 1300
const ART_BLEED = 180 * 3

export interface AmbientBackgroundProps {
  /**
   * art：夜间固定落日暖棕氛围 + 右侧压暗，白天改为左上暖色晕染（正在播放、排行榜、歌单详情、评论）
   * glow：左上角一抹强调色光晕（搜索、我的音乐）
   */
  variant?: 'art' | 'glow'
}

const fill = StyleSheet.absoluteFillObject

/** 页面环境光，需放在页面根节点的第一个子元素，内容叠在其上 */
export default memo(({ variant = 'art' }: AmbientBackgroundProps) => {
  const theme = useTheme()

  if (variant == 'glow') {
    return (
      <View style={[fill, { overflow: 'hidden' }]} pointerEvents="none">
        <Image source={GLOW} tintColor={theme.accent} resizeMode="stretch" style={{ position: 'absolute', left: px(-200), top: px(-400), width: px(1100), height: px(900), opacity: 0.12 }} />
      </View>
    )
  }

  return (
    <View style={[fill, { overflow: 'hidden' }]} pointerEvents="none">
      {
        theme.isDark
          ? <Image
              source={NOCTURNE_ART}
              resizeMode="stretch"
              style={{ position: 'absolute', left: px(-120 - ART_BLEED), top: px(-240 - ART_BLEED), width: px(ART_SIZE + ART_BLEED * 2), height: px(ART_SIZE + ART_BLEED * 2), opacity: 0.75 }}
            />
          : <Image source={GLOW} tintColor="#F4A57A" resizeMode="stretch" style={{ position: 'absolute', left: px(-300), top: px(-320), width: px(1300), height: px(1300), opacity: 0.8 }} />
      }
      {/* 本地图片默认带素材宽高，absoluteFill 本身不会覆盖 512×4 的固有尺寸。 */}
      <Image source={theme.isDark ? SHADE_H : SHADE_LIGHT_H} tintColor={theme.bg} resizeMode="stretch" style={[fill, { width: '100%', height: '100%' }]} />
    </View>
  )
})
