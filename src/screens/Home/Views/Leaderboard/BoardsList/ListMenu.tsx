import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useI18n } from '@/lang'
import { Sheet, type SheetType, type SheetHeader, type SheetQuickAction } from '@/components/car'
import { type Position } from '@/components/common/Menu'

export interface SelectInfo {
  listId: string
  name: string
  index: number
}
const initSelectInfo = {}

export interface ListMenuProps {
  onPlay: (selectInfo: SelectInfo) => void
  onCollect: (selectInfo: SelectInfo) => void
  onHideMenu: () => void
}
export interface ListMenuType {
  show: (selectInfo: SelectInfo, position?: Position) => void
}

export type {
  Position,
}

export default forwardRef<ListMenuType, ListMenuProps>((props, ref) => {
  const t = useI18n()
  const sheetRef = useRef<SheetType>(null)
  const selectInfoRef = useRef<SelectInfo>(initSelectInfo as SelectInfo)
  const [header, setHeader] = useState<SheetHeader>()

  useImperativeHandle(ref, () => ({
    show(selectInfo) {
      selectInfoRef.current = selectInfo
      setHeader({ title: selectInfo.name })
      requestAnimationFrame(() => { sheetRef.current?.show() })
    },
  }))

  const quick: SheetQuickAction[] = [
    { action: 'play', icon: 'lucide-play', label: t('play'), primary: true },
    { action: 'collect', icon: 'ph-heart', label: t('collect') },
  ]

  const handlePress = (action: string) => {
    const selectInfo = selectInfoRef.current
    switch (action) {
      case 'play':
        props.onPlay(selectInfo)
        break
      case 'collect':
        props.onCollect(selectInfo)
        break
      default:
        break
    }
  }

  return (
    <Sheet
      ref={sheetRef}
      header={header}
      quick={quick}
      onPress={handlePress}
      onHide={props.onHideMenu}
    />
  )
})
