import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useI18n } from '@/lang'
import { Sheet, type SheetType, type SheetAction, type SheetHeader, type SheetQuickAction } from '@/components/car'
import { type Position } from '@/components/common/Menu'
import { hasDislike } from '@/core/dislikeList'
import { existsFile } from '@/utils/fs'
import { hasMusicUrlByMusic } from '@/utils/data'

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfo
  selectedList: LX.Music.MusicInfo[]
  index: number
  listId: string
  single: boolean
}
const initSelectInfo = {}

export interface ListMenuProps {
  onPlay: (selectInfo: SelectInfo) => void
  onPlayLater: (selectInfo: SelectInfo) => void
  onAdd: (selectInfo: SelectInfo) => void
  onMove: (selectInfo: SelectInfo) => void
  onEditMetadata: (selectInfo: SelectInfo) => void
  onCopyName: (selectInfo: SelectInfo) => void
  onChangePosition: (selectInfo: SelectInfo) => void
  onToggleSource: (selectInfo: SelectInfo) => void
  onMusicSourceDetail: (selectInfo: SelectInfo) => void
  onRemoveCache: (selectInfo: SelectInfo) => void
  onDislikeMusic: (selectInfo: SelectInfo) => void
  onRemove: (selectInfo: SelectInfo) => void
}
export interface ListMenuType {
  show: (selectInfo: SelectInfo, position?: Position) => void
}

export type {
  Position,
}

const hasEditMetadata = async(musicInfo: LX.Music.MusicInfo) => {
  if (musicInfo.source != 'local') return false
  return existsFile(musicInfo.meta.filePath)
}
const hasUrlCache = async(musicInfo: LX.Music.MusicInfo) => {
  return hasMusicUrlByMusic(musicInfo)
}

interface SheetState {
  header?: SheetHeader
  quick: SheetQuickAction[]
  actions: SheetAction[]
}

export default forwardRef<ListMenuType, ListMenuProps>((props, ref) => {
  const t = useI18n()
  const sheetRef = useRef<SheetType>(null)
  const selectInfoRef = useRef<SelectInfo>(initSelectInfo as SelectInfo)
  const [sheetState, setSheetState] = useState<SheetState>({ quick: [], actions: [] })

  const buildActions = (musicInfo: LX.Music.MusicInfo): SheetAction[] => {
    const isLocal = musicInfo.source == 'local'
    const actions: SheetAction[] = []
    if (isLocal) actions.push({ action: 'editMetadata', icon: 'lucide-copy', disabled: true, label: t('edit_metadata') })
    actions.push(
      { action: 'move', icon: 'lucide-folder-input', label: t('move_to') },
      { action: 'changePosition', icon: 'lucide-arrow-down-up', label: t('change_position') },
      { action: 'toggleSource', icon: 'lucide-replace', label: t('toggle_source') },
      { action: 'copyName', icon: 'lucide-copy', label: t('copy_name') },
      { action: 'musicSourceDetail', icon: 'lucide-info', disabled: isLocal, label: t('music_source_detail') },
      { action: 'removeCache', icon: 'lucide-refresh-cw', disabled: true, label: t('list_remove_cache') },
      { action: 'dislike', icon: 'lucide-x', disabled: hasDislike(musicInfo), label: t('dislike') },
      { action: 'remove', icon: 'lucide-trash-2', danger: true, label: t('delete') },
    )
    return actions
  }

  const updateAction = (action: string, disabled: boolean) => {
    setSheetState(state => ({
      ...state,
      actions: state.actions.map(item => item.action == action ? { ...item, disabled } : item),
    }))
  }

  useImperativeHandle(ref, () => ({
    show(selectInfo) {
      selectInfoRef.current = selectInfo
      const musicInfo = selectInfo.musicInfo
      setSheetState({
        header: {
          title: musicInfo.name,
          subtitle: [musicInfo.singer, musicInfo.interval, musicInfo.source == 'local' ? t('car_local_source') : t(`source_alias_${musicInfo.source}`)].filter(Boolean).join(' · '),
          pic: musicInfo.meta.picUrl,
        },
        quick: [
          { action: 'play', icon: 'lucide-play', label: t('play'), primary: true },
          { action: 'playLater', icon: 'lucide-list-start', label: t('play_later') },
          { action: 'add', icon: 'lucide-folder-plus', label: t('add_to') },
        ],
        actions: buildActions(musicInfo),
      })
      requestAnimationFrame(() => { sheetRef.current?.show() })
      void Promise.all([
        musicInfo.source == 'local' ? hasEditMetadata(musicInfo) : Promise.resolve(false),
        hasUrlCache(musicInfo),
      ]).then(([editMetadata, hasCache]) => {
        if (musicInfo.source == 'local') updateAction('editMetadata', editMetadata)
        updateAction('removeCache', hasCache)
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
      case 'move':
        props.onMove(selectInfo)
        break
      case 'editMetadata':
        props.onEditMetadata(selectInfo)
        break
      case 'copyName':
        props.onCopyName(selectInfo)
        break
      case 'changePosition':
        props.onChangePosition(selectInfo)
        break
      case 'toggleSource':
        props.onToggleSource(selectInfo)
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
      case 'remove':
        props.onRemove(selectInfo)
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
