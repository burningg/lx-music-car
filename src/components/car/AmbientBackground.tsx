/* eslint-disable @typescript-eslint/no-var-requires */
import { memo } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { defaultHeaders } from '@/components/common/Image'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'

// 白色透明度渐变图，运行时用 tintColor 着色（项目未引入渐变库）
const GLOW = require('@/resources/images/ambient/glow.png')
const SHADE_H = require('@/resources/images/ambient/shade-h.png')

export interface AmbientBackgroundProps {
  /**
   * art：夜间铺模糊封面 + 右侧压暗，白天改为左上暖色晕染（正在播放、排行榜、歌单详情、评论）
   * glow：左上角一抹强调色光晕（搜索、我的音乐）
   */
  variant?: 'art' | 'glow'
}

const fill = StyleSheet.absoluteFillObject

/** 页面环境光，需放在页面根节点的第一个子元素，内容叠在其上 */
export default memo(({ variant = 'art' }: AmbientBackgroundProps) => {
  const theme = useTheme()
  const musicInfo = usePlayerMusicInfo()

  if (variant == 'glow') {
    return (
      <View style={fill} pointerEvents="none">
        <Image source={GLOW} tintColor={theme.accent} resizeMode="stretch" style={{ position: 'absolute', left: px(-200), top: px(-400), width: px(1100), height: px(900), opacity: 0.12 }} />
      </View>
    )
  }

  return (
    <View style={fill} pointerEvents="none">
      {
        theme.isDark
          ? musicInfo.pic
            ? <Image
                source={{ uri: musicInfo.pic, headers: defaultHeaders }}
                blurRadius={px(60)}
                resizeMode="cover"
                style={{ position: 'absolute', left: px(-120), top: px(-420), width: px(1300), height: px(1300), opacity: 0.75 }}
              />
            : null
          : <Image source={GLOW} tintColor="#F4A57A" resizeMode="stretch" style={{ position: 'absolute', left: px(-300), top: px(-500), width: px(1300), height: px(1300), opacity: 0.8 }} />
      }
      <Image source={SHADE_H} tintColor={theme.bg} resizeMode="stretch" style={fill} />
    </View>
  )
})
