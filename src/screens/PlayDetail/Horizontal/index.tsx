import { memo, useEffect } from 'react'
import { View, AppState } from 'react-native'
import { screenkeepAwake, screenUnkeepAwake } from '@/utils/nativeModules/utils'
import { AmbientBackground, CarShell } from '@/components/car'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import PageContent from '@/components/PageContent'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { pop } from '@/navigation'
import { px } from '@/utils/pixelRatio'

import TopBar from './TopBar'
import Cover from './Cover'
import Meta from './Meta'
import ProgressRow from './ProgressRow'
import Transport from './Transport'
import Secondary from './Secondary'
import Lyric from './Lyric'

// 设计稿正在播放：1920×1080，垂直居中的封面 512 + 信息 552 + 歌词 440
export default memo(({ componentId }: { componentId: string }) => {
  useEffect(() => {
    setComponentId(COMPONENT_IDS.playDetail, componentId)
    screenkeepAwake()
    const appstateListener = AppState.addEventListener('change', (state) => {
      switch (state) {
        case 'active':
          if (!commonState.componentIds.comment) screenkeepAwake()
          break
        case 'background':
          screenUnkeepAwake()
          break
      }
    })

    const handleComponentIdsChange = (ids: CommonState['componentIds']) => {
      if (ids.comment) screenUnkeepAwake()
      else if (AppState.currentState == 'active') screenkeepAwake()
    }

    global.state_event.on('componentIdsUpdated', handleComponentIdsChange)

    return () => {
      global.state_event.off('componentIdsUpdated', handleComponentIdsChange)
      appstateListener.remove()
      screenUnkeepAwake()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const back = () => {
    void pop(componentId)
  }

  return (
    <PageContent>
      <CarShell componentId={componentId} activeId="now" background={<AmbientBackground />}>
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, paddingHorizontal: px(80) }}>
            <View style={{ position: 'absolute', top: px(40), left: px(80), right: px(80), zIndex: 1 }}>
              <TopBar onBack={back} />
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: px(72) }}>
              <View>
                <Cover componentId={componentId} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: px(48) }}>
                <Meta />
                <ProgressRow />
                <Transport />
                <Secondary />
              </View>
              <View style={{ width: px(440), height: px(340) }}>
                <Lyric />
              </View>
            </View>
          </View>
        </View>
      </CarShell>
    </PageContent>
  )
})
