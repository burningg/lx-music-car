import { NativeEventEmitter, NativeModules, Platform } from 'react-native'

interface SpeechRecognitionModule {
  isAvailable: () => Promise<boolean>
  start: (language: string) => Promise<string>
  cancel: () => void
  addListener: (eventName: string) => void
  removeListeners: (count: number) => void
}

// Optional so older installed APKs and non-Android builds fail gracefully.
const speechRecognition = NativeModules.SpeechRecognitionModule as SpeechRecognitionModule | undefined

export const isSpeechRecognitionAvailable = async(): Promise<boolean> => {
  return Platform.OS == 'android' && !!speechRecognition && await speechRecognition.isAvailable()
}

export const startSpeechRecognition = async(language: string): Promise<string> => {
  if (Platform.OS != 'android' || !speechRecognition) {
    throw Object.assign(new Error('Speech recognition is unavailable'), { code: 'E_UNAVAILABLE' })
  }
  return speechRecognition.start(language)
}

export const cancelSpeechRecognition = () => {
  if (Platform.OS == 'android') speechRecognition?.cancel()
}

export type SpeechRecognitionState = 'loading' | 'listening' | 'processing'

export const onSpeechRecognitionState = (handler: (state: SpeechRecognitionState) => void): (() => void) => {
  if (Platform.OS != 'android' || !speechRecognition) return () => {}
  const emitter = new NativeEventEmitter(speechRecognition)
  const subscription = emitter.addListener('speech-recognition-state', (event: { state?: string }) => {
    if (event.state == 'loading' || event.state == 'listening' || event.state == 'processing') handler(event.state)
  })
  return () => { subscription.remove() }
}
