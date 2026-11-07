import { useImperativeHandle, forwardRef, useRef, useState, type Ref } from 'react'
import { View, ScrollView, TouchableHighlight } from 'react-native'
import { useWindowSize } from '@/utils/hooks'
import { useTheme } from '@/store/theme/hook'
import CarText from '@/components/car/CarText'
import CarIcon from '@/components/car/CarIcon'
import { px, sp } from '@/utils/pixelRatio'
import Modal, { type ModalType } from './Modal'
import { getMenuLayout, type MenuAnchor } from './menuLayout'

export interface Position extends MenuAnchor { menuWidth?: number, menuHeight?: number }
export interface MenuSize { width?: number, height?: number }
export type Menus = Readonly<Array<{ action: string, label: string, disabled?: boolean }>>

interface Props<M extends Menus = Menus> {
  menus: Readonly<M>
  onPress?: (menu: M[number]) => void
  buttonPosition: Position
  menuSize: MenuSize
  onHide: () => void
  width?: number
  height?: number
  fontSize?: number
  center?: boolean
  activeId?: M[number]['action'] | null
}

const Menu = ({
  buttonPosition,
  menuSize,
  menus,
  width,
  height,
  onPress = () => {},
  onHide,
  activeId,
  fontSize = 20,
  center = false,
}: Props) => {
  const theme = useTheme()
  const windowSize = useWindowSize()
  const [labelWidths, setLabelWidths] = useState<Record<string, number>>({})
  const margin = px(16)
  const inset = px(6)
  const padding = px(18)
  const hasSelection = activeId != null
  const checkSpace = hasSelection ? px(38) : 0
  const textSize = sp(fontSize)
  const measurementKey = `${textSize}:${windowSize.width}:${windowSize.height}`
  const maxLabelWidth = Math.max(0, ...menus.map(menu => labelWidths[`${measurementKey}:${menu.label}`] ?? 0))
  const itemHeight = Math.max(height ?? menuSize.height ?? px(64), textSize * 1.4 + px(28))
  const layout = getMenuLayout(buttonPosition, windowSize, {
    width: Math.max(width ?? menuSize.width ?? 0, buttonPosition.w, px(240), maxLabelWidth + padding * 2 + checkSpace + inset * 2 + 2),
    height: menus.length * itemHeight + inset * 2 + 2,
  }, margin, px(8))

  const menuPress = (menu: Menus[number]) => {
    // Selecting the current value dismisses the menu without reloading the page.
    onHide()
    if (menu.action != activeId) onPress(menu)
  }

  return (
    <>
      {/* Measure with the actual native font, independently of the narrow trigger.
          Keep long translations wrappable when even the window is not wide enough. */}
      <View
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute', left: margin, right: margin, top: 0, alignItems: 'flex-start', opacity: 0 }}
      >
        {menus.map(menu => (
          <CarText
            key={`${measurementKey}:${menu.action}:${menu.label}`}
            size={fontSize}
            weight="500"
            lineHeight={1.4}
            onLayout={({ nativeEvent: { layout: { width } } }) => {
              const key = `${measurementKey}:${menu.label}`
              setLabelWidths(current => current[key] == width ? current : { ...current, [key]: width })
            }}
          >{menu.label}</CarText>
        ))}
      </View>
      <View
        style={{ position: 'absolute', ...layout, backgroundColor: theme.elevated, borderRadius: px(18), borderWidth: 1, borderColor: theme.hairline, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: px(6) }, shadowOpacity: 0.14, shadowRadius: px(18) }}
        onStartShouldSetResponder={() => true}
      >
        <ScrollView
          style={{ flexGrow: 0, borderRadius: px(18) - 1 }}
          contentContainerStyle={{ padding: inset }}
          keyboardShouldPersistTaps="always"
          bounces={false}
        >
          {menus.map(menu => {
            const selected = menu.action == activeId
            return (
              <TouchableHighlight
                key={menu.action}
                accessibilityRole="menuitem"
                accessibilityState={{ selected, disabled: !!menu.disabled }}
                disabled={menu.disabled}
                style={{ minHeight: itemHeight, paddingHorizontal: padding, paddingVertical: px(14), borderRadius: px(12), opacity: menu.disabled ? 0.4 : 1, backgroundColor: selected ? theme['accent-soft'] : 'transparent' }}
                underlayColor={theme['glass-strong']}
                onPress={() => { menuPress(menu) }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CarText size={fontSize} weight="500" lineHeight={1.4} color={selected ? theme.accent : theme['text-1']} style={{ flex: 1, textAlign: center ? 'center' : 'left' }}>{menu.label}</CarText>
                  {hasSelection && (
                    <View style={{ width: checkSpace, alignItems: 'flex-end' }}>
                      {selected && <CarIcon name="lucide-check" size={22} color={theme.accent} />}
                    </View>
                  )}
                </View>
              </TouchableHighlight>
            )
          })}
        </ScrollView>
      </View>
    </>
  )
}

export interface MenuProps<M extends Menus = Menus> {
  menus: M
  onPress: (menu: M[number]) => void
  onHide?: () => void
  /** Minimum popup width in dp; labels can expand it up to the window bounds. */
  width?: number
  /** Minimum row height in dp, independent of the trigger height. */
  height?: number
  /** Font size in car design units, using the same scale as CarText. */
  fontSize?: number
  center?: boolean
  activeId?: M[number]['action'] | null
}

export interface MenuType {
  show: (position: Position, menuSize?: MenuSize) => void
  hide: () => void
}

const Component = <M extends Menus>({ menus, width, height, activeId, onHide, onPress, fontSize, center }: MenuProps<M>, ref: Ref<MenuType>) => {
  const modalRef = useRef<ModalType>(null)
  const [position, setPosition] = useState<Position>({ w: 0, h: 0, x: 0, y: 0 })
  const [menuSize, setMenuSize] = useState<MenuSize>({})
  const hide = () => {
    modalRef.current?.setVisible(false)
  }
  useImperativeHandle(ref, () => ({
    show(newPosition, menuSize) {
      setPosition(newPosition)
      setMenuSize(menuSize ?? {})
      modalRef.current?.setVisible(true)
    },
    hide,
  }))

  return (
    <Modal onHide={onHide} ref={modalRef}>
      <Menu menus={menus} width={width} height={height} activeId={activeId} buttonPosition={position} menuSize={menuSize} onPress={onPress} onHide={hide} fontSize={fontSize} center={center} />
    </Modal>
  )
}

export default forwardRef(Component) as <M extends Menus>(p: MenuProps<M> & { ref?: Ref<MenuType> }) => JSX.Element | null
