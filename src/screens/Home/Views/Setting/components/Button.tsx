import { memo } from 'react'

import Button, { type BtnProps } from '@/components/common/Button'
import { useTheme } from '@/store/theme/hook'
import { CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'

type ButtonProps = BtnProps

export default memo(({ disabled, onPress, children }: ButtonProps) => {
  const theme = useTheme()

  return (
    <Button
      style={{
        minHeight: px(48),
        justifyContent: 'center',
        paddingHorizontal: px(22),
        marginRight: px(10),
        marginBottom: px(8),
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.hairline,
        backgroundColor: theme.glass,
        opacity: disabled ? 0.4 : 1,
      }}
      onPress={onPress}
      disabled={disabled}
    >
      <CarText size={17} weight="500">{children}</CarText>
    </Button>
  )
})
