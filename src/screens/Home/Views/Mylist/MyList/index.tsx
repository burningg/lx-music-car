import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { View } from 'react-native'

import ListMenu, { type ListMenuType, type Position } from './ListMenu'
import ListNameEdit, { type ListNameEditType } from './ListNameEdit'
import List from './List'
import ListImportExport, { type ListImportExportType } from './ListImportExport'
import { handleRemove, handleSync } from './listAction'
import ListMusicSort, { type ListMusicSortType } from './ListMusicSort'
import DuplicateMusic, { type DuplicateMusicType } from './DuplicateMusic'
import { useActiveListId, useMyList } from '@/store/list/hook'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { CarText, IconButton } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { getListPrevSelectId } from '@/utils/data'
import { setActiveList } from '@/core/list'

export interface ListsPanelType {
  /** 打开当前歌单的「更多」菜单 */
  showActiveListMenu: () => void
  /** 打开当前歌单的排序弹层 */
  showSort: () => void
}

// 设计稿我的音乐左栏：宽 440，标题 36/700 + 新建，下方歌单列表
export default forwardRef<ListsPanelType, {}>((props, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const allList = useMyList()
  const activeListId = useActiveListId()
  const listMenuRef = useRef<ListMenuType>(null)
  const listNameEditRef = useRef<ListNameEditType>(null)
  const listMusicSortRef = useRef<ListMusicSortType>(null)
  const duplicateMusicRef = useRef<DuplicateMusicType>(null)
  const listImportExportRef = useRef<ListImportExportType>(null)

  useEffect(() => {
    void getListPrevSelectId().then((id) => {
      setActiveList(id)
    })
  }, [])

  useImperativeHandle(ref, () => ({
    showActiveListMenu() {
      const index = allList.findIndex(list => list.id == activeListId)
      if (index < 0) return
      listMenuRef.current?.show({ listInfo: allList[index], index })
    },
    showSort() {
      const listInfo = allList.find(list => list.id == activeListId)
      if (listInfo) listMusicSortRef.current?.show(listInfo)
    },
  }), [activeListId, allList])

  const showMenu = (info: { listInfo: LX.List.MyListInfo, index: number }, position?: Position) => {
    listMenuRef.current?.show(info, position)
  }

  const removeList = (info: LX.List.UserListInfo) => {
    handleRemove(info)
  }

  return (
    <View style={{
      width: px(440),
      height: '100%',
      backgroundColor: theme.surface,
      borderRightWidth: 1,
      borderRightColor: theme.hairline,
    }}>
      <View style={{ paddingTop: px(44), paddingLeft: px(40), paddingRight: px(24) }}>
        <View style={{ height: px(52), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <CarText size={36} weight="700">{t('nav_love')}</CarText>
          <IconButton
            icon="lucide-plus"
            iconSize={24}
            size={52}
            background={theme['glass-strong']}
            onPress={() => { listNameEditRef.current?.showCreate(0) }}
          />
        </View>
      </View>
      <View style={{ flex: 1, paddingTop: px(24), paddingLeft: px(40), paddingRight: px(24) }}>
        <List onShowMenu={showMenu} />
      </View>
      <ListNameEdit ref={listNameEditRef} />
      <ListMusicSort ref={listMusicSortRef} />
      <DuplicateMusic ref={duplicateMusicRef} />
      <ListImportExport ref={listImportExportRef} />
      <ListMenu
        ref={listMenuRef}
        onNew={index => { listNameEditRef.current?.showCreate(index) }}
        onRename={info => { listNameEditRef.current?.show(info) }}
        onSort={info => { listMusicSortRef.current?.show(info) }}
        onDuplicateMusic={info => { duplicateMusicRef.current?.show(info) }}
        onImport={(info, position) => { listImportExportRef.current?.import(info, position) }}
        onExport={(info, position) => { listImportExportRef.current?.export(info, position) }}
        onRemove={removeList}
        onSync={info => { handleSync(info) }}
        onSelectLocalFile={(info, position) => { listImportExportRef.current?.selectFile(info, position) }}
      />
    </View>
  )
})
