import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, TouchableOpacity, View } from 'react-native'
import Image from '@/components/common/Image'
import { useTheme } from '@/store/theme/hook'
import { px } from '@/utils/pixelRatio'
import CarIcon from './CarIcon'
import CarText from './CarText'
import IconButton from './IconButton'

export interface SheetHeader {
  title: string
  subtitle?: string
  pic?: string | null
}

export interface SheetQuickAction {
  action: string
  label: string
  icon: string
  /** 强调色按钮（设计稿第一个） */
  primary?: boolean
}

export interface SheetAction {
  action: string
  label: string
  icon?: string
  danger?: boolean
  disabled?: boolean
}

export interface SheetProps {
  header?: SheetHeader
  quick?: SheetQuickAction[]
  actions?: SheetAction[]
  onPress: (action: string) => void
  onHide?: () => void
}

export interface SheetType {
  show: () => void
  hide: () => void
}

// 设计稿歌曲菜单：右侧 596 宽浮层，圆角 28，内边距 12
export default forwardRef<SheetType, SheetProps>(({ header, quick, actions, onPress, onHide }, ref) => {
  const theme = useTheme()
  const [visible, setVisible] = useState(false)
  const closingRef = useRef(false)

  const hide = () => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    onHide?.()
    requestAnimationFrame(() => { closingRef.current = false })
  }

  useImperativeHandle(ref, () => ({
    show() {
      setVisible(true)
    },
    hide,
  }))

  const handlePress = (action: string, disabled?: boolean) => {
    if (disabled) return
    hide()
    onPress(action)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={hide}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end', padding: px(24) }}>
        <Pressable style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)' }} onPress={hide} />
        <View style={{
          width: px(596),
          maxHeight: '100%',
          borderRadius: px(28),
          padding: px(12),
          gap: px(4),
          backgroundColor: theme.elevated,
          elevation: 24,
        }}>
          {header
            ? (
              <View style={{ height: px(108), flexDirection: 'row', alignItems: 'center', gap: px(18), paddingTop: px(16), paddingBottom: px(20), paddingHorizontal: px(16) }}>
                {header.pic
                  ? <Image url={header.pic} style={{ width: px(72), height: px(72), borderRadius: px(14) }} />
                  : null}
                <View style={{ flex: 1, gap: px(6) }}>
                  <CarText size={24} weight="700" numberOfLines={1}>{header.title}</CarText>
                  {header.subtitle ? <CarText size={16} color={theme['text-2']} numberOfLines={1}>{header.subtitle}</CarText> : null}
                </View>
                <IconButton icon="lucide-x" iconSize={22} size={52} background={theme['glass-strong']} onPress={hide} />
              </View>
              )
            : null}
          <View style={{ height: px(1), backgroundColor: theme.hairline }} />
          {quick?.length
            ? (
              <View style={{ flexDirection: 'row', gap: px(10), paddingVertical: px(12), paddingHorizontal: px(4) }}>
                {quick.map(item => (
                  <TouchableOpacity
                    key={item.action}
                    activeOpacity={0.7}
                    onPress={() => { handlePress(item.action) }}
                    style={{
                      flex: 1,
                      height: px(96),
                      borderRadius: px(20),
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: px(10),
                      backgroundColor: item.primary ? theme['accent-soft'] : theme.glass,
                    }}
                  >
                    <CarIcon name={item.icon} size={28} color={item.primary ? theme.accent : theme['text-1']} />
                    <CarText size={17} weight="600" color={item.primary ? theme.accent : theme['text-1']} numberOfLines={1}>{item.label}</CarText>
                  </TouchableOpacity>
                ))}
              </View>
              )
            : null}
          {actions?.length
            ? (
              <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ gap: px(4) }} showsVerticalScrollIndicator={false}>
                {actions.map(item => (
                  <TouchableOpacity
                    key={item.action}
                    activeOpacity={0.7}
                    disabled={item.disabled}
                    onPress={() => { handlePress(item.action, item.disabled) }}
                    style={{
                      height: px(64),
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: px(18),
                      paddingHorizontal: px(20),
                      borderRadius: px(16),
                      opacity: item.disabled ? 0.4 : 1,
                    }}
                  >
                    {item.icon ? <CarIcon name={item.icon} size={24} color={item.danger ? '#FF6B6B' : theme['text-2']} /> : null}
                    <CarText size={19} weight="500" color={item.danger ? '#FF6B6B' : theme['text-1']} numberOfLines={1} style={{ flex: 1 }}>{item.label}</CarText>
                    <CarIcon name="lucide-chevron-right" size={20} color={theme['text-3']} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              )
            : null}
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: px(28), borderWidth: px(1), borderColor: theme['art-stroke'] }} />
        </View>
      </View>
    </Modal>
  )
})
