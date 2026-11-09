import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, BackHandler, PermissionsAndroid } from 'react-native'
import { useI18n, type Message } from '@/lang'
import { toast } from '@/utils/tools'
import { cancelSpeechRecognition, isSpeechRecognitionAvailable, onSpeechRecognitionState, startSpeechRecognition } from '@/utils/nativeModules/speechRecognition'

const errorMessages: Record<string, keyof Message> = {
  E_UNAVAILABLE: 'search_voice_unavailable',
  E_PERMISSION: 'search_voice_permission',
  E_NO_MATCH: 'search_voice_no_match',
  E_TIMEOUT: 'search_voice_no_match',
  E_NETWORK: 'search_voice_network',
  E_BUSY: 'search_voice_busy',
  E_AUDIO: 'search_voice_audio',
  E_LANGUAGE: 'search_voice_language',
  E_MODEL: 'search_voice_model_error',
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

export default (onResult: (text: string) => void) => {
  const t = useI18n()
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
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
  }, [cancelSession])

  useEffect(() => {
    const removeSpeechState = onSpeechRecognitionState(state => {
      if (active.current) setIsPreparing(state == 'loading')
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

  const start = async() => {
    if (active.current) return
    const id = ++session.current
    active.current = true
    setIsPreparing(true)
    setIsRecognizing(true)
    try {
      if (!await isSpeechRecognitionAvailable()) {
        throw Object.assign(new Error('Bundled offline speech recognition is unavailable'), { code: 'E_UNAVAILABLE' })
      }
      if (id != session.current) return
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)
      if (id != session.current) return
      if (permission != PermissionsAndroid.RESULTS.GRANTED) {
        toast(t(permission == PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'search_voice_permission_settings' : 'search_voice_permission'), 'long')
        return
      }
      if (!await waitForForeground() || id != session.current) return
      nativeStarted.current = true
      const language = global.i18n?.locale == 'en_us' ? 'en-US' : global.i18n?.locale == 'zh_tw' ? 'zh-TW' : 'zh-CN'
      const text = (await startSpeechRecognition(language)).trim()
      if (id != session.current) return
      if (text) onResult(text)
      else toast(t('search_voice_no_match'), 'long')
    } catch (error) {
      if (id != session.current) return
      const code = (error as { code?: string } | null)?.code
      if (code != 'E_CANCELLED') toast(t(errorMessages[code ?? ''] ?? 'search_voice_failed'), 'long')
    } finally {
      if (id == session.current) {
        active.current = false
        nativeStarted.current = false
        setIsRecognizing(false)
      }
    }
  }

  return { isRecognizing, isPreparing, start, cancel }
}
