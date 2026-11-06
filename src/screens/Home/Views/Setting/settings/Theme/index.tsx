import { memo } from 'react'

import IsAutoTheme from './IsAutoTheme'
import IsHideBgDark from './IsHideBgDark'
import IsDynamicBg from './IsDynamicBg'
import IsFontShadow from './IsFontShadow'

export { default as ThemeSwatches } from './Theme'

// 主题色板放在卡片上方（Section header），这里只保留卡片内的开关项
export default memo(() => {
  return (
    <>
      <IsAutoTheme />
      <IsHideBgDark />
      <IsDynamicBg />
      <IsFontShadow />
    </>
  )
})
