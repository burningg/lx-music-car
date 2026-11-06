import { memo, type ReactNode } from 'react'
import { View } from 'react-native'
import StatusBar from '@/components/common/StatusBar'
import NavRail, { type RailId } from './NavRail'

export interface CarShellProps {
  /** 非主页（push 进来的页面）传入，Nav Rail 点 tab 时先回到主页 */
  componentId?: string
  activeId?: RailId
  children: ReactNode
}

/** 车机页面外壳：左侧 Nav Rail + 右侧内容区，所有页面共用 */
export default memo(({ componentId, activeId, children }: CarShellProps) => {
  return (
    <>
      <StatusBar />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <NavRail componentId={componentId} activeId={activeId} />
        <View style={{ flex: 1, overflow: 'hidden' }}>
          {children}
        </View>
      </View>
    </>
  )
})
