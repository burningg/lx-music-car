import { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { navigations, popToRoot } from '@/navigation'
import { useNavActiveId } from '@/store/common/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import { exitApp, setNavActiveId } from '@/core/common'
import { confirmDialog, exitApp as backHome } from '@/utils/tools'
import { type NAV_ID_Type } from '@/config/constant'
import { px } from '@/utils/pixelRatio'
import useWindowSize from '@/utils/hooks/useWindowSize'
import CarText from './CarText'
import CarIcon from './CarIcon'
import { useClock } from './hooks'

export const NAV_RAIL_WIDTH = 160

// Pen 公共组件 sOwkY：所有页面使用同一套尺寸，避免切页时导航栏跳变。
const RAIL_LAYOUT = {
  width: NAV_RAIL_WIDTH, buttonSize: 112, radius: 24, iconSize: 44, gap: 24, padding: 24, settingsSize: 96, settingsRadius: 32, settingsIconSize: 40,
} as const

/** now：正在播放；其余对应主页 tab */
export type RailId = 'now' | NAV_ID_Type

const RAIL_ITEMS: Array<{ id: Exclude<RailId, 'nav_setting'>, icon: string }> = [
  { id: 'now', icon: 'lucide-audio-lines' },
  { id: 'nav_songlist', icon: 'lucide-library-big' },
  { id: 'nav_search', icon: 'lucide-search' },
  { id: 'nav_top', icon: 'lucide-trophy' },
  { id: 'nav_love', icon: 'lucide-heart' },
]

export interface NavRailProps {
  /** 当前页面不是主页时传入，点 tab 先回到主页再切换 */
  componentId?: string
  /** 覆盖高亮项，正在播放页传 now */
  activeId?: RailId
}

const handleExit = () => {
  void confirmDialog({
    message: global.i18n.t('exit_app_tip'),
    confirmButtonText: global.i18n.t('list_remove_tip_button'),
  }).then(isExit => {
    if (isExit) exitApp('Exit Btn')
  })
}

const RailButton = ({ icon, active, size, radius, iconSize, idleBackground, idleColor, onPress }: {
  icon: string
  active: boolean
  size: number
  radius: number
  iconSize: number
  idleBackground?: string
  idleColor?: string
  onPress: () => void
}) => {
  const theme = useTheme()
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      disabled={active}
      onPress={onPress}
      style={{
        width: px(size),
        height: px(size),
        borderRadius: px(radius),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? theme['glass-strong'] : idleBackground,
      }}
    >
      <CarIcon name={icon} size={iconSize} color={active ? theme['text-1'] : idleColor ?? (idleBackground ? theme['text-2'] : theme['text-3'])} />
    </TouchableOpacity>
  )
}

export default memo(({ componentId, activeId }: NavRailProps) => {
  useWindowSize()
  const theme = useTheme()
  const time = useClock()
  const navActiveId = useNavActiveId()
  const showBackBtn = useSettingValue('common.showBackBtn')
  const showExitBtn = useSettingValue('common.showExitBtn')
  const currentId: RailId = activeId ?? navActiveId
  const layout = RAIL_LAYOUT

  const handlePress = (id: RailId) => {
    if (id == 'now') {
      if (!playerState.musicInfo.id) return
      navigations.pushPlayDetailScreen(componentId ?? commonState.componentIds.home!)
      return
    }
    if (componentId) void popToRoot(componentId)
    setNavActiveId(id)
  }

  return (
    <View style={{
      width: px(layout.width),
      height: '100%',
      paddingVertical: px(40),
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme['rail-bg'],
      borderRightWidth: 1,
      borderRightColor: theme.hairline,
    }}>
      <CarText size={22} weight="600" num style={{ letterSpacing: -0.4 }}>{time}</CarText>
      <View style={{ gap: px(layout.gap), alignItems: 'center', alignSelf: 'stretch', paddingHorizontal: px(layout.padding) }}>
        {RAIL_ITEMS.map(item => (
          <RailButton key={item.id} icon={item.icon} active={currentId == item.id} size={layout.buttonSize} radius={layout.radius} iconSize={layout.iconSize} idleColor={theme['text-2']} onPress={() => { handlePress(item.id) }} />
        ))}
      </View>
      <View style={{ gap: px(18), alignItems: 'center' }}>
        {showBackBtn ? <RailButton icon="home" active={false} size={56} radius={28} iconSize={22} onPress={backHome} /> : null}
        {showExitBtn ? <RailButton icon="exit2" active={false} size={56} radius={28} iconSize={22} onPress={handleExit} /> : null}
        <RailButton icon="lucide-layout-grid" active={currentId == 'nav_setting'} size={layout.settingsSize} radius={layout.settingsRadius} iconSize={layout.settingsIconSize} idleBackground={theme.glass} onPress={() => { handlePress('nav_setting') }} />
      </View>
    </View>
  )
})
