import { memo, useCallback, useMemo, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import Image from '@/components/common/Image'
import { useTheme } from '@/store/theme/hook'
import { CarIcon, CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { formatPlayCount } from '@/utils'
import { useI18n } from '@/lang'
import { type Comment } from '../utils'
import CommentImage from './CommentImage'

const AVATAR_COLORS = ['#FF7A50', '#4FB3E8', '#B48CFF', '#6FCF97', '#F2C94C', '#FF8FB1']

const getAvatarColor = (name: string) => {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

const Avatar = memo(({ comment }: { comment: Comment }) => {
  const [error, setError] = useState(false)
  const handleError = useCallback(() => { setError(true) }, [])
  const color = useMemo(() => getAvatarColor(comment.userName || ''), [comment.userName])
  const size = px(52)

  if (comment.avatar && !error) {
    return <Image url={comment.avatar} onError={handleError} style={{ width: size, height: size, borderRadius: size / 2 }} />
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}33`, alignItems: 'center', justifyContent: 'center' }}>
      <CarText size={20} weight="600" color={color}>{(comment.userName || '?').slice(0, 1)}</CarText>
    </View>
  )
})

const ReplyLine = ({ comment }: { comment: Comment }) => {
  const theme = useTheme()
  return (
    <CarText size={16} color={theme['text-2']} selectable>
      <CarText size={16} weight="600" color={theme.accent}>{comment.userName}：</CarText>
      {comment.text}
    </CarText>
  )
}

// 设计稿评论行：头像 52 + 昵称/时间 + 正文 19 + 回复玻璃块 + 右侧点赞
export default memo(({ comment }: { comment: Comment }) => {
  const theme = useTheme()
  const t = useI18n()

  const like = comment.likedCount
    ? (
      <View style={{ width: px(64), alignItems: 'center', gap: px(4) }}>
        <CarIcon name="ph-heart-fill" size={26} color={theme.accent} />
        <CarText size={14} weight="500" num color={theme.accent}>{formatPlayCount(comment.likedCount)}</CarText>
      </View>
      )
    : (
      <View style={{ width: px(64), alignItems: 'center' }}>
        <CarIcon name="ph-heart" size={26} color={theme['text-3']} />
      </View>
      )

  return (
    <View style={{ paddingVertical: px(20), paddingHorizontal: px(20), flexDirection: 'row', gap: px(20) }}>
      <Avatar comment={comment} />
      <View style={{ flex: 1, gap: px(10) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
          <CarText size={17} weight="600" numberOfLines={1} style={{ flexShrink: 1 }}>{comment.userName}</CarText>
          {comment.timeStr ? <CarText size={14} color={theme['text-3']} numberOfLines={1}>{comment.timeStr}</CarText> : null}
          {comment.location ? <CarText size={14} color={theme['text-3']} numberOfLines={1}>{t('location', { location: comment.location })}</CarText> : null}
        </View>
        <TextBody comment={comment} />
        {comment.images?.length
          ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(10), marginTop: px(4) }}>
              {comment.images.map((url, index) => <CommentImage key={String(index)} url={url} />)}
            </View>
            )
          : null}
        {comment.reply?.length
          ? (
            <View style={{ marginTop: px(2), borderRadius: px(14), backgroundColor: theme.glass, padding: px(16), gap: px(8) }}>
              {comment.reply.map(c => <ReplyLine comment={c} key={c.id} />)}
            </View>
            )
          : null}
      </View>
      {like}
    </View>
  )
})

const TextBody = memo(({ comment }: { comment: Comment }) => {
  const theme = useTheme()
  const [show, setShow] = useState(false)
  const { text, length } = useMemo(() => {
    const limit = 160
    return { text: comment.text, length: comment.text.length > limit ? limit : 0 }
  }, [comment.text])

  return (
    <View>
      <CarText size={19} lineHeight={1.5} selectable>
        {length && !show ? `${text.slice(0, length)}……` : text}
      </CarText>
      {length
        ? (
          <TouchableOpacity style={{ marginTop: px(8), alignSelf: 'flex-start' }} onPress={() => { setShow(!show) }}>
            <CarText size={16} color={theme.accent}>{show ? global.i18n.t('comment_hide_text') : global.i18n.t('comment_show_text')}</CarText>
          </TouchableOpacity>
          )
        : null}
    </View>
  )
})
