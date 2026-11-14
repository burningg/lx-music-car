import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, BackHandler, PermissionsAndroid } from 'react-native'
import { useI18n, type Message } from '@/lang'
import { toast } from '@/utils/tools'
import { cancelSpeechRecognition, isSpeechRecognitionAvailable, onSpeechRecognitionState, startSpeechRecognition } from '@/utils/nativeModules/speechRecognition'

const errorMessages: Record<string, keyof Message> = {
  E_UNAVAILABLE: 'speech_recognition_unavailable',
  E_PERMISSION: 'speech_recognition_permission',
  E_NO_MATCH: 'speech_recognition_no_match',
  E_TIMEOUT: 'speech_recognition_no_match',
  E_NETWORK: 'speech_recognition_network',
  E_BUSY: 'speech_recognition_busy',
  E_AUDIO: 'speech_recognition_audio',
  E_LANGUAGE: 'speech_recognition_language',
  E_MODEL: 'speech_recognition_model_error',
}

// Android can resolve the permission request before the activity's resume event reaches JS.
const waitForForeground = async(): Promise<boolean> => {
  if (AppState.currentState == 'active') return true
  return new Promise(resolve => {
    const finish = () => {
      clearTimeout(timer)
      subscription.remove()
      resolve(AppState.currentState == 'active')
    }
    const subscription = AppState.addEventListener('change', state => {
      if (state == 'active') finish()
    })
    const timer = setTimeout(finish, 1500)
  })
}

type SessionCleanup = () => void | Promise<void>

// A caller may acquire resources after permission is granted and release them once recording stops.
export type PrepareSpeechRecognition = (isCurrent: () => boolean) => Promise<SessionCleanup | undefined>

// Shared across mounts so microphone cleanup finishes before another session starts.
let pendingSession = Promise.resolve()

export default (onResult: (text: string) => void) => {
  const t = useI18n()
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const session = useRef(0)
  const active = useRef(false)
  const nativeStarted = useRef(false)

  const cancelSession = useCallback(() => {
    ++session.current
    active.current = false
    if (nativeStarted.current) cancelSpeechRecognition()
    nativeStarted.current = false
  }, [])

  const cancel = useCallback(() => {
    cancelSession()
    setIsRecognizing(false)
    setIsPreparing(false)
    setIsProcessing(false)
  }, [cancelSession])

  useEffect(() => {
    const removeSpeechState = onSpeechRecognitionState(state => {
      if (active.current && nativeStarted.current) {
        setIsPreparing(state == 'loading')
        setIsProcessing(state == 'processing')
      }
    })
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!active.current) return false
      cancel()
      return true
    })
    const appState = AppState.addEventListener('change', state => {
      // Permission prompts can temporarily deactivate the activity. Only cancel a started recorder.
      if (state != 'active' && nativeStarted.current) cancel()
    })
    return () => {
      removeSpeechState()
      back.remove()
      appState.remove()
      cancelSession()
    }
  }, [cancel, cancelSession])

  const start = async(prepare?: PrepareSpeechRecognition) => {
    if (active.current) return
    const id = ++session.current
    const previousSession = pendingSession
    let finishSession = () => {}
    pendingSession = new Promise<void>(resolve => { finishSession = resolve })
    let cleanup: SessionCleanup | undefined
    active.current = true
    setIsProcessing(false)
    setIsPreparing(true)
    setIsRecognizing(true)
    try {
      await previousSession
      if (id != session.current) return
      if (!await isSpeechRecognitionAvailable()) {
        throw Object.assign(new Error('Bundled offline speech recognition is unavailable'), { code: 'E_UNAVAILABLE' })
      }
      if (id != session.current) return
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)
      if (id != session.current) return
      if (permission != PermissionsAndroid.RESULTS.GRANTED) {
        toast(t(permission == PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'speech_recognition_permission_settings' : 'speech_recognition_permission'), 'long')
        return
      }
      if (!await waitForForeground() || id != session.current) return
      cleanup = await prepare?.(() => id == session.current)
      if (id != session.current || AppState.currentState != 'active') return
      nativeStarted.current = true
      const language = global.i18n?.locale == 'en_us' ? 'en-US' : global.i18n?.locale == 'zh_tw' ? 'zh-TW' : 'zh-CN'
      const text = (await startSpeechRecognition(language)).trim()
      if (id != session.current) return
      if (text) onResult(text)
      else toast(t('speech_recognition_no_match'), 'long')
    } catch (error) {
      if (id != session.current) return
      const code = (error as { code?: string } | null)?.code
      if (code != 'E_CANCELLED') toast(t(errorMessages[code ?? ''] ?? 'speech_recognition_failed'), 'long')
    } finally {
      // The native promise settles only after recording stops, including cancellation.
      try {
        await cleanup?.()
      } catch (error) {
        console.warn('Failed to clean up speech recognition session', error)
      }
      if (id == session.current) {
        active.current = false
        nativeStarted.current = false
        setIsPreparing(false)
        setIsProcessing(false)
        setIsRecognizing(false)
      }
      finishSession()
    }
  }

  return { isRecognizing, isPreparing, isProcessing, start, cancel }
}
