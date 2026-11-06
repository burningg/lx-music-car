import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useI18n } from '@/lang'
import { Sheet, type SheetType, type SheetAction, type SheetHeader, type SheetQuickAction } from '@/components/car'
import { type Position } from '@/components/common/Menu'
import { hasDislike } from '@/core/dislikeList'
import { hasMusicUrlByMusic } from '@/utils/data'

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfoOnline
  selectedList: LX.Music.MusicInfoOnline[]
  index: number
  single: boolean
}
const initSelectInfo = {}

const hasUrlCache = async(musicInfo: LX.Music.MusicInfo) => {
  return hasMusicUrlByMusic(musicInfo)
}

export interface ListMenuProps {
  onPlay: (selectInfo: SelectInfo) => void
  onPlayLater: (selectInfo: SelectInfo) => void
  onAdd: (selectInfo: SelectInfo) => void
  onCopyName: (selectInfo: SelectInfo) => void
  onMusicSourceDetail: (selectInfo: SelectInfo) => void
  onRemoveCache: (selectInfo: SelectInfo) => void
  onDislikeMusic: (selectInfo: SelectInfo) => void
}
export interface ListMenuType {
  show: (selectInfo: SelectInfo, position?: Position) => void
}

export type {
  Position,
}

interface SheetState {
  header?: SheetHeader
  quick: SheetQuickAction[]
  actions: SheetAction[]
}

export default forwardRef<ListMenuType, ListMenuProps>((props: ListMenuProps, ref) => {
  const t = useI18n()
  const sheetRef = useRef<SheetType>(null)
  const selectInfoRef = useRef<SelectInfo>(initSelectInfo as SelectInfo)
  const [sheetState, setSheetState] = useState<SheetState>({ quick: [], actions: [] })

  const buildActions = (musicInfo: LX.Music.MusicInfo): SheetAction[] => [
    { action: 'copyName', icon: 'lucide-copy', label: t('copy_name') },
    { action: 'musicSourceDetail', icon: 'lucide-info', label: t('music_source_detail') },
    { action: 'removeCache', icon: 'lucide-refresh-cw', disabled: true, label: t('list_remove_cache') },
    { action: 'dislike', icon: 'lucide-x', disabled: hasDislike(musicInfo), label: t('dislike') },
  ]

  useImperativeHandle(ref, () => ({
    show(selectInfo) {
      selectInfoRef.current = selectInfo
      const musicInfo = selectInfo.musicInfo
      const actions = buildActions(musicInfo)
      setSheetState({
        header: {
          title: musicInfo.name,
          subtitle: [musicInfo.singer, musicInfo.interval, t(`source_alias_${musicInfo.source}`)].filter(Boolean).join(' · '),
          pic: musicInfo.meta.picUrl,
        },
        quick: [
          { action: 'play', icon: 'lucide-play', label: t('play'), primary: true },
          { action: 'playLater', icon: 'lucide-list-start', label: t('play_later') },
          { action: 'add', icon: 'lucide-folder-plus', label: t('add_to') },
        ],
        actions,
      })
      requestAnimationFrame(() => { sheetRef.current?.show() })
      void hasUrlCache(musicInfo).then((hasCache) => {
        if (!hasCache) return
        setSheetState(state => ({
          ...state,
          actions: state.actions.map(item => item.action == 'removeCache' ? { ...item, disabled: false } : item),
        }))
      })
    },
  }))

  const handlePress = (action: string) => {
    const selectInfo = selectInfoRef.current
    switch (action) {
      case 'play':
        props.onPlay(selectInfo)
        break
      case 'playLater':
        props.onPlayLater(selectInfo)
        break
      case 'add':
        props.onAdd(selectInfo)
        break
      case 'copyName':
        props.onCopyName(selectInfo)
        break
      case 'musicSourceDetail':
        props.onMusicSourceDetail(selectInfo)
        break
      case 'removeCache':
        props.onRemoveCache(selectInfo)
        break
      case 'dislike':
        props.onDislikeMusic(selectInfo)
        break
      default:
        break
    }
  }

  return (
    <Sheet
      ref={sheetRef}
      header={sheetState.header}
      quick={sheetState.quick}
      actions={sheetState.actions}
      onPress={handlePress}
    />
  )
})
