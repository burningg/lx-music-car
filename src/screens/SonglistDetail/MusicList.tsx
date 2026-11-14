import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { View } from 'react-native'
import OnlineList, { type OnlineListType, type OnlineListProps } from '@/components/OnlineList'
import { clearListDetail, getListDetail, setListDetail, setListDetailInfo } from '@/core/songlist'
import songlistState from '@/store/songlist/state'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { CarText, ListFade } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { handlePlay } from './listAction'
import { useListInfo } from './state'
import { type OverviewInfo } from './Overview'

export interface MusicListProps {
  onInfo: (info: OverviewInfo) => void
}

export interface MusicListType {
  loadList: (source: LX.OnlineSource, listId: string) => void
}

export default forwardRef<MusicListType, MusicListProps>(({ onInfo }, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const listRef = useRef<OnlineListType>(null)
  const isUnmountedRef = useRef(false)
  const [total, setTotal] = useState(0)
  const info = useListInfo()

  const reportInfo = useCallback(() => {
    const detail = songlistState.listDetailInfo
    setTotal(detail.total)
    onInfo({
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      name: info.name || detail.info.name || '',
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      desc: detail.info.desc || info.desc || '',
      playCount: (info.play_count ?? detail.info.play_count) ?? '',
      total: detail.total,
      img: info.img ?? detail.info.img,
    })
  }, [info, onInfo])

  useImperativeHandle(ref, () => ({
    async loadList(source, id) {
      clearListDetail()
      const listDetailInfo = songlistState.listDetailInfo
      listRef.current?.setList([])
      if (listDetailInfo.id == id && listDetailInfo.source == source && listDetailInfo.list.length) {
        requestAnimationFrame(() => {
          listRef.current?.setList(listDetailInfo.list)
          reportInfo()
        })
      } else {
        listRef.current?.setStatus('loading')
        const page = 1
        setListDetailInfo(info.source, info.id)
        reportInfo()
        return getListDetail(id, source, page).then((listDetail) => {
          const result = setListDetail(listDetail, id, page)
          if (isUnmountedRef.current) return
          requestAnimationFrame(() => {
            reportInfo()
            listRef.current?.setList(result.list)
            listRef.current?.setStatus(songlistState.listDetailInfo.maxPage <= page ? 'end' : 'idle')
          })
        }).catch(() => {
          if (songlistState.listDetailInfo.list.length && page == 1) clearListDetail()
          listRef.current?.setStatus('error')
        })
      }
    },
  }), [info, reportInfo])

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])


  const handlePlayList: OnlineListProps['onPlayList'] = (index) => {
    const listDetailInfo = songlistState.listDetailInfo
    void handlePlay(listDetailInfo.id, listDetailInfo.source, listDetailInfo.list, index, { ...info, ...listDetailInfo.info })
  }
  const handleRefresh: OnlineListProps['onRefresh'] = () => {
    const page = 1
    listRef.current?.setStatus('refreshing')
    getListDetail(songlistState.listDetailInfo.id, songlistState.listDetailInfo.source, page, true).then((listDetail) => {
      const result = setListDetail(listDetail, songlistState.listDetailInfo.id, page)
      if (isUnmountedRef.current) return
      listRef.current?.setList(result.list)
      listRef.current?.setStatus(songlistState.listDetailInfo.maxPage <= page ? 'end' : 'idle')
      reportInfo()
    }).catch(() => {
      if (songlistState.listDetailInfo.list.length && page == 1) clearListDetail()
      listRef.current?.setStatus('error')
    })
  }
  const handleLoadMore: OnlineListProps['onLoadMore'] = () => {
    listRef.current?.setStatus('loading')
    const page = songlistState.listDetailInfo.list.length ? songlistState.listDetailInfo.page + 1 : 1
    getListDetail(songlistState.listDetailInfo.id, songlistState.listDetailInfo.source, page).then((listDetail) => {
      const result = setListDetail(listDetail, songlistState.listDetailInfo.id, page)
      if (isUnmountedRef.current) return
      listRef.current?.setList(result.list, true)
      listRef.current?.setStatus(songlistState.listDetailInfo.maxPage <= page ? 'end' : 'idle')
    }).catch(() => {
      if (songlistState.listDetailInfo.list.length && page == 1) clearListDetail()
      listRef.current?.setStatus('error')
    })
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{
        height: px(52),
        marginTop: 0,
        marginBottom: px(24),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: px(22),
      }}>
        <CarText size={27} weight="600">{t('car_all_songs')}</CarText>
        {total ? <CarText size={20} num color={theme['text-3']}>{String(total)}</CarText> : null}
      </View>
      <View style={{ flex: 1 }}>
        <OnlineList
          ref={listRef}
          trackRowSize="large"
          onPlayList={handlePlayList}
          playListOnPress
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          contentInsetBottom={px(150)}
        />
        <ListFade height={64} />
      </View>
    </View>
  )
})
