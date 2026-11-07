import { useEffect, useState } from 'react'
import { type SizeHandler, windowSizeTools } from '@/utils/windowSizeTools'

export default () => {
  const [size, setSize] = useState(windowSizeTools.getSize())

  useEffect(() => {
    const onChange: SizeHandler = (size) => {
      setSize(size)
    }

    const remove = windowSizeTools.onSizeChanged(onChange)
    // 首次布局可能在 render 与 effect 之间修正窗口尺寸，订阅后补读避免错过。
    onChange(windowSizeTools.getSize())
    return () => {
      remove()
    }
  }, [])

  return size
}
