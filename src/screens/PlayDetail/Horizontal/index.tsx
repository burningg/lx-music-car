import { memo, useEffect, useState } from 'react'
import { View, AppState } from 'react-native'
import { screenkeepAwake, screenUnkeepAwake } from '@/utils/nativeModules/utils'
import { AmbientBackground, CarShell } from '@/components/car'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import PageContent from '@/components/PageContent'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { px } from '@/utils/pixelRatio'
import useWindowSize from '@/utils/hooks/useWindowSize'

import TopBar from './TopBar'
import Cover from './Cover'
import Meta from './Meta'
import ProgressRow from './ProgressRow'
import Transport from './Transport'
import Secondary from './Secondary'
import Lyric from './Lyric'
import LyricHeader from './LyricHeader'
import Queue from './Queue'

// SPRSH / SEv9u、AHpf9：1920×1080，464px 封面，104px 栏距，底部独立操作区。
export default memo(({ componentId }: { componentId: string }) => {
  useWindowSize()
  const [lyricsVisible, setLyricsVisible] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [queueVisible, setQueueVisible] = useState(false)
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

  const toggleLyrics = () => {
    setLyricsVisible(!lyricsVisible)
    setFullscreen(false)
  }

  return (
    <PageContent>
      <CarShell componentId={componentId} activeId="now" background={<AmbientBackground />}>
        <View style={{ flex: 1, paddingTop: px(48), paddingHorizontal: px(72), paddingBottom: px(44), gap: px(32) }}>
          <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', alignItems: 'center', justifyContent: lyricsVisible ? 'flex-start' : 'center', gap: px(104) }}>
            {!fullscreen ? (
              <View style={{ width: px(464), flexShrink: 0, gap: px(28) }}>
                <Cover componentId={componentId} />
                <Meta />
              </View>
            ) : null}
            {lyricsVisible ? (
              <View style={{ flex: 1, minWidth: 0, height: fullscreen ? '100%' : px(646.4), maxHeight: '100%', gap: px(32) }}>
                {fullscreen
                  ? <TopBar onBack={() => { setFullscreen(false) }} />
                  : <LyricHeader onFullscreen={() => { setFullscreen(true) }} />}
                <View style={{ flex: 1, minHeight: 0 }}>
                  <Lyric />
                </View>
              </View>
            ) : null}
          </View>
          <View style={{ gap: px(20) }}>
            <ProgressRow />
            <View style={{ height: px(112), flexDirection: 'row', alignItems: 'center', gap: px(16) }}>
              {/* a8QV2：设计稿的音频输出区域为空，与右侧等分宽度，使播放组严格居中。 */}
              <View style={{ flex: 1, minWidth: 0, height: px(88) }} />
              <Transport />
              <Secondary lyricsVisible={lyricsVisible} onToggleLyrics={toggleLyrics} onQueue={() => { setQueueVisible(true) }} />
            </View>
          </View>
        </View>
        {queueVisible ? <Queue onClose={() => { setQueueVisible(false) }} /> : null}
      </CarShell>
    </PageContent>
  )
})
