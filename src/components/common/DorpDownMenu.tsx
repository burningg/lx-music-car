import { useRef, useState } from 'react'
import Menu, { type MenuType, type MenuProps, type Menus } from './Menu'
import Button, { type BtnType, type BtnProps } from './Button'

export interface DorpDownMenuProps<T extends Menus> extends MenuProps<T> {
  children: React.ReactNode
  btnStyle?: BtnProps['style']
}

export default <T extends Menus>({
  menus,
  onPress,
  onHide,
  width,
  height,
  fontSize,
  center,
  children,
  activeId,
  btnStyle,
}: DorpDownMenuProps<T>) => {
  const buttonRef = useRef<BtnType>(null)
  const menuRef = useRef<MenuType>(null)
  const [expanded, setExpanded] = useState(false)

  const showMenu = () => {
    if (!menus.length) return
    buttonRef.current?.measure((fx, fy, width, height, px, py) => {
      // The trigger is only an anchor, never the menu's width or row height.
      menuRef.current?.show({ x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
      setExpanded(true)
    })
  }

  return (
    <>
      <Button style={btnStyle} ref={buttonRef} onPress={showMenu} accessibilityRole="button" accessibilityState={{ expanded }}>
        {children}
      </Button>
      <Menu
        ref={menuRef}
        menus={menus}
        center={center}
        onPress={onPress}
        onHide={() => {
          setExpanded(false)
          onHide?.()
        }}
        width={width}
        fontSize={fontSize}
        height={height}
        activeId={activeId}
      />
    </>
  )
}
