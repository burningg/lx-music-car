import { memo, useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { View } from 'react-native'
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view'
import CommentHot from './CommentHot'
import CommentNew from './CommentNew'
import { createStyle, toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { CarText, AmbientBackground, CarShell, IconButton, ListFade, SegmentTabs } from '@/components/car'
import { useI18n } from '@/lang'
import { COMPONENT_IDS } from '@/config/constant'
import { setComponentId } from '@/core/common'
import PageContent from '@/components/PageContent'
import playerState from '@/store/player/state'
import { pop } from '@/navigation'
import { px } from '@/utils/pixelRatio'
import SongPanel from './components/SongPanel'

type ActiveId = 'hot' | 'new'

const HotCommentPage = memo(({ activeId, musicInfo, onUpdateTotal }: {
  activeId: ActiveId
  musicInfo: LX.Music.MusicInfoOnline
  onUpdateTotal: (total: number) => void
}) => {
  const initedRef = useRef(false)
  const comment = useMemo(() => <CommentHot musicInfo={musicInfo} onUpdateTotal={onUpdateTotal} />, [musicInfo, onUpdateTotal])
  switch (activeId) {
    case 'hot':
      if (!initedRef.current) initedRef.current = true
      return comment
    default:
      return initedRef.current ? comment : null
  }
})

const NewCommentPage = memo(({ activeId, musicInfo, onUpdateTotal }: {
  activeId: ActiveId
  musicInfo: LX.Music.MusicInfoOnline
  onUpdateTotal: (total: number) => void
}) => {
  const initedRef = useRef(false)
  const comment = useMemo(() => <CommentNew musicInfo={musicInfo} onUpdateTotal={onUpdateTotal} />, [musicInfo, onUpdateTotal])
  switch (activeId) {
    case 'new':
      if (!initedRef.current) initedRef.current = true
      return comment
    default:
      return initedRef.current ? comment : null
  }
})

const TABS = [
  'hot',
  'new',
] as const

const getMusicInfo = (musicInfo: LX.Player.PlayMusic | null) => {
  if (!musicInfo) return null
  return 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
}

// 设计稿评论页：左歌曲信息 400 + 右评论 1184（标题/标签 + 列表）
export default memo(({ componentId }: {
  componentId: string
}) => {
  const pagerViewRef = useRef<PagerView>(null)
  const [activeId, setActiveId] = useState<ActiveId>('hot')
  const [musicInfo, setMusicInfo] = useState<LX.Music.MusicInfo | null>(getMusicInfo(playerState.playMusicInfo.musicInfo))
  const t = useI18n()
  const theme = useTheme()
  const [total, setTotal] = useState({ hot: 0, new: 0 })

  useEffect(() => {
    setComponentId(COMPONENT_IDS.comment, componentId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tabItems = useMemo(() => {
    return [
      { id: TABS[0], label: t('comment_tab_hot', { total: '' }).trim() },
      { id: TABS[1], label: t('comment_tab_new', { total: '' }).trim() },
    ] as const
  }, [t])

  const toggleTab = useCallback((id: ActiveId) => {
    setActiveId(id)
    pagerViewRef.current?.setPage(TABS.findIndex(tab => tab == id))
  }, [])

  const onPageSelected = useCallback(({ nativeEvent }: PagerViewOnPageSelectedEvent) => {
    setActiveId(TABS[nativeEvent.position])
  }, [])

  const refreshComment = useCallback(() => {
    if (!playerState.playMusicInfo.musicInfo) return
    let playerMusicInfo = playerState.playMusicInfo.musicInfo
    if ('progress' in playerMusicInfo) playerMusicInfo = playerMusicInfo.metadata.musicInfo

    if (musicInfo && musicInfo.id == playerMusicInfo.id) {
      toast(t('comment_refresh', { name: musicInfo.name }))
      return
    }
    setMusicInfo(playerMusicInfo)
  }, [musicInfo, t])

  const setHotTotal = useCallback((total: number) => {
    setTotal(totalInfo => ({ ...totalInfo, hot: total }))
  }, [])
  const setNewTotal = useCallback((total: number) => {
    setTotal(totalInfo => ({ ...totalInfo, new: total }))
  }, [])

  const back = useCallback(() => {
    void pop(componentId)
  }, [componentId])

  return (
    <PageContent>
      <CarShell componentId={componentId} activeId="now">
        <View style={{ flex: 1 }}>
          <AmbientBackground />
          {
            musicInfo == null
              ? null
              : (
                <View style={{ flex: 1, flexDirection: 'row', gap: px(80), paddingTop: px(48), paddingHorizontal: px(72) }}>
                  <SongPanel musicInfo={musicInfo} total={activeId == 'hot' ? total.hot : total.new} onBack={back} />
                  <View style={{ flex: 1 }}>
                    <View style={{ height: px(58), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <CarText size={32} weight="700">{t('car_comments')}</CarText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
                        <IconButton icon="lucide-refresh-cw" iconSize={22} size={52} background={theme.glass} onPress={refreshComment} />
                        <SegmentTabs items={tabItems} activeId={activeId} onChange={toggleTab} />
                      </View>
                    </View>
                    {
                      musicInfo.source == 'local'
                        ? (
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <CarText size={19} color={theme['text-2']}>{t('comment_not support')}</CarText>
                          </View>
                          )
                        : (
                          <View style={{ flex: 1, marginTop: px(20) }}>
                            <PagerView
                              ref={pagerViewRef}
                              onPageSelected={onPageSelected}
                              style={styles.pagerView}
                            >
                              <View collapsable={false} style={styles.pageStyle}>
                                <HotCommentPage activeId={activeId} musicInfo={musicInfo} onUpdateTotal={setHotTotal} />
                              </View>
                              <View collapsable={false} style={styles.pageStyle}>
                                <NewCommentPage activeId={activeId} musicInfo={musicInfo} onUpdateTotal={setNewTotal} />
                              </View>
                            </PagerView>
                            <ListFade height={100} />
                          </View>
                          )
                    }
                  </View>
                </View>
                )
          }
        </View>
      </CarShell>
    </PageContent>
  )
})

const styles = createStyle({
  pagerView: {
    flex: 1,
  },
  pageStyle: {
    flex: 1,
    overflow: 'hidden',
  },
})
