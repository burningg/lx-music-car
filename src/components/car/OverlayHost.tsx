import { memo, useEffect, useReducer } from 'react'
import { View } from 'react-native'
import Toast from './Toast'
import ConfirmDialog from './ConfirmDialog'
import { dismissToast, getOverlayState, resolveConfirm, subscribeOverlay } from './overlay'

/** 车机页面的全局浮层：Toast 与确认框，挂在 CarShell 里 */
export default memo(() => {
  const [, force] = useReducer((count: number) => count + 1, 0)

  useEffect(() => subscribeOverlay(force), [])

  const { toast, confirm } = getOverlayState()

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      {
        confirm
          ? (
            <ConfirmDialog
              options={confirm.options}
              onCancel={() => { resolveConfirm(false) }}
              onConfirm={() => { resolveConfirm(true) }}
            />
            )
          : null
      }
      {
        toast
          ? <Toast key={toast.id} message={toast.message} duration={toast.duration} onHide={() => { dismissToast(toast.id) }} />
          : null
      }
    </View>
  )
})
