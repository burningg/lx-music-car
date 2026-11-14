import { useEffect, useRef } from 'react'
import { AppState, Platform } from 'react-native'
import { COMPONENT_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import { onVoiceKey } from '@/utils/nativeModules/voiceKey'

// Page policy stays outside the reusable speech recognizer.
export default (onPress: () => void) => {
  const onPressRef = useRef(onPress)
  onPressRef.current = onPress

  useEffect(() => {
    if (Platform.OS != 'android') return
    let disposed = false
    let removeVoiceKey: (() => void) | undefined
    const isSearchVisible = () => !disposed && AppState.currentState == 'active' &&
      commonState.navActiveId == 'nav_search' && !!commonState.componentIds[COMPONENT_IDS.home] &&
      Object.keys(commonState.componentIds).length == 1
    const update = () => {
      if (isSearchVisible()) {
        removeVoiceKey ??= onVoiceKey(() => {
          // Recheck at delivery time: an event may be queued while another screen is opening.
          if (isSearchVisible()) onPressRef.current()
        })
      } else {
        removeVoiceKey?.()
        removeVoiceKey = undefined
      }
    }
    global.state_event.on('navActiveIdUpdated', update)
    global.state_event.on('componentIdsUpdated', update)
    const appState = AppState.addEventListener('change', update)
    update()
    return () => {
      disposed = true
      removeVoiceKey?.()
      appState.remove()
      global.state_event.off('navActiveIdUpdated', update)
      global.state_event.off('componentIdsUpdated', update)
    }
  }, [])
}
