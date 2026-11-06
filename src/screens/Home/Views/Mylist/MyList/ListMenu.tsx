import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useI18n } from '@/lang'
import { Sheet, type SheetType, type SheetAction, type SheetHeader } from '@/components/car'
import { type Position } from '@/components/common/Menu'
import { LIST_IDS } from '@/config/constant'
import musicSdk from '@/utils/musicSdk'
import listState from '@/store/list/state'

export interface SelectInfo {
  listInfo: LX.List.MyListInfo
  index: number
}
const initSelectInfo = {}

export interface ListMenuProps {
  onNew: (position: number) => void
  onRename: (listInfo: LX.List.UserListInfo) => void
  onSort: (listInfo: LX.List.MyListInfo) => void
  onDuplicateMusic: (listInfo: LX.List.MyListInfo) => void
  onImport: (listInfo: LX.List.MyListInfo, index: number) => void
  onExport: (listInfo: LX.List.MyListInfo, index: number) => void
  onSync: (listInfo: LX.List.UserListInfo) => void
  onSelectLocalFile: (listInfo: LX.List.MyListInfo, index: number) => void
  onRemove: (listInfo: LX.List.UserListInfo) => void
}
export interface ListMenuType {
  show: (selectInfo: SelectInfo, position?: Position) => void
}

export type {
  Position,
}

export default forwardRef<ListMenuType, ListMenuProps>(({
  onNew,
  onRename,
  onSort,
  onDuplicateMusic,
  onImport,
  onExport,
  onSync,
  onSelectLocalFile,
  onRemove,
}, ref) => {
  const t = useI18n()
  const sheetRef = useRef<SheetType>(null)
  const selectInfoRef = useRef<SelectInfo>(initSelectInfo as SelectInfo)
  const [sheetState, setSheetState] = useState<{ header?: SheetHeader, actions: SheetAction[] }>({ actions: [] })

  const buildActions = (listInfo: LX.List.MyListInfo): SheetAction[] => {
    let rename = false
    let sync = false
    let remove = false
    const localFile = !listState.fetchingListStatus[listInfo.id]
    switch (listInfo.id) {
      case LIST_IDS.DEFAULT:
      case LIST_IDS.LOVE:
        break
      default: {
        const userList = listInfo as LX.List.UserListInfo
        rename = true
        remove = true
        sync = !!(userList.source && musicSdk[userList.source]?.songList)
        break
      }
    }

    return [
      { action: 'new', icon: 'lucide-plus', label: t('list_create') },
      { action: 'rename', icon: 'lucide-copy', disabled: !rename, label: t('list_rename') },
      { action: 'sort', icon: 'lucide-arrow-down-up', label: t('list_sort') },
      { action: 'duplicateMusic', icon: 'lucide-copy', label: t('lists__duplicate') },
      { action: 'local_file', icon: 'lucide-folder-plus', disabled: !localFile, label: t('list_select_local_file') },
      { action: 'sync', icon: 'lucide-refresh-cw', disabled: !sync || !localFile, label: t('list_sync') },
      { action: 'import', icon: 'lucide-download', label: t('list_import') },
      { action: 'export', icon: 'lucide-archive', label: t('list_export') },
      { action: 'remove', icon: 'lucide-trash-2', danger: true, disabled: !remove, label: t('list_remove') },
    ]
  }

  useImperativeHandle(ref, () => ({
    show(selectInfo) {
      selectInfoRef.current = selectInfo
      setSheetState({
        header: { title: selectInfo.listInfo.name },
        actions: buildActions(selectInfo.listInfo),
      })
      requestAnimationFrame(() => { sheetRef.current?.show() })
    },
  }))

  const handlePress = (action: string) => {
    const selectInfo = selectInfoRef.current
    switch (action) {
      case 'new':
        onNew(Math.max(selectInfo.index - 1, 0))
        break
      case 'rename':
        onRename(selectInfo.listInfo as LX.List.UserListInfo)
        break
      case 'sort':
        onSort(selectInfo.listInfo)
        break
      case 'duplicateMusic':
        onDuplicateMusic(selectInfo.listInfo)
        break
      case 'import':
        onImport(selectInfo.listInfo, selectInfo.index)
        break
      case 'export':
        onExport(selectInfo.listInfo, selectInfo.index)
        break
      case 'sync':
        onSync(selectInfo.listInfo as LX.List.UserListInfo)
        break
      case 'local_file':
        onSelectLocalFile(selectInfo.listInfo, selectInfo.index)
        break
      case 'remove':
        onRemove(selectInfo.listInfo as LX.List.UserListInfo)
        break
      default:
        break
    }
  }

  return (
    <Sheet
      ref={sheetRef}
      header={sheetState.header}
      actions={sheetState.actions}
      onPress={handlePress}
    />
  )
})
