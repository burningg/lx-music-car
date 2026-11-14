import { NativeEventEmitter, NativeModules, Platform } from 'react-native'

interface VoiceKeyModule {
  setEnabled: (enabled: boolean) => void
  addListener: (eventName: string) => void
  removeListeners: (count: number) => void
}

// Older APKs and non-Android platforms simply do not support hardware voice keys.
const voiceKey = NativeModules.VoiceKeyModule as VoiceKeyModule | undefined
let listenerCount = 0

export const onVoiceKey = (handler: () => void): (() => void) => {
  if (Platform.OS != 'android' || !voiceKey?.setEnabled) return () => {}
  const subscription = new NativeEventEmitter(voiceKey).addListener('voice-key', handler)
  if (++listenerCount == 1) voiceKey.setEnabled(true)
  let removed = false
  return () => {
    if (removed) return
    removed = true
    subscription.remove()
    if (--listenerCount == 0) voiceKey.setEnabled(false)
  }
}
