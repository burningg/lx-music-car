// 自绘 Toast / 确认框的全局状态：与 React 解耦，方便 utils/tools 直接调用
// 这里不引入任何其他模块，避免与 tools.ts 形成循环依赖

export type ToastDuration = 'short' | 'long'

export interface ToastItem {
  id: number
  message: string
  duration: ToastDuration
}

export interface ConfirmOptions {
  title?: string
  message: string
  cancelButtonText: string
  confirmButtonText: string
  /** 确认按钮使用危险色 */
  danger?: boolean
  /** 只有一个按钮 */
  single?: boolean
  bgClose?: boolean
}

interface ConfirmItem {
  id: number
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

type Listener = () => void

const listeners = new Set<Listener>()
let hostCount = 0

let toast: ToastItem | null = null
let confirm: ConfirmItem | null = null

const emit = () => {
  listeners.forEach(fn => { fn() })
}

/** 当前页面是否挂载了 OverlayHost（未挂载时回退到系统 Alert / ToastAndroid） */
export const hasOverlayHost = () => hostCount > 0

export const subscribeOverlay = (fn: Listener) => {
  listeners.add(fn)
  hostCount++
  return () => {
    listeners.delete(fn)
    hostCount--
  }
}

export const getOverlayState = () => ({ toast, confirm })

export const showToast = (message: string, duration: ToastDuration = 'short') => {
  toast = { id: Date.now(), message, duration }
  emit()
}

export const dismissToast = (id: number) => {
  if (toast?.id !== id) return
  toast = null
  emit()
}

export const showConfirm = async(options: ConfirmOptions) => new Promise<boolean>(resolve => {
  if (confirm) confirm.resolve(false)
  confirm = { id: Date.now(), options, resolve }
  emit()
})

export const resolveConfirm = (value: boolean) => {
  const current = confirm
  if (!current) return
  confirm = null
  emit()
  current.resolve(value)
}
