import { memo, type ReactNode } from 'react'
import { View } from 'react-native'
import StatusBar from '@/components/common/StatusBar'
import NavRail, { type RailId } from './NavRail'
import OverlayHost from './OverlayHost'

export interface CarShellProps {
  /** 非主页（push 进来的页面）传入，Nav Rail 点 tab 时先回到主页 */
  componentId?: string
  activeId?: RailId
  /** 页面级氛围背景，位于导航栏和内容区下方。 */
  background?: ReactNode
  children: ReactNode
}

/** 车机页面外壳：左侧 Nav Rail + 右侧内容区，所有页面共用 */
export default memo(({ componentId, activeId, background, children }: CarShellProps) => {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {background}
        <NavRail componentId={componentId} activeId={activeId} />
        <View style={{ flex: 1, overflow: 'hidden' }}>
          {children}
        </View>
      </View>
      <OverlayHost />
    </View>
  )
})
