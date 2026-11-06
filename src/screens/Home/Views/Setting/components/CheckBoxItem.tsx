import { memo } from 'react'
import { View } from 'react-native'
import { type CheckBoxProps } from '@/components/common/CheckBox'
import { useTheme } from '@/store/theme/hook'
import { SettingRow, IconButton } from '@/components/car'
import { tipDialog } from '@/utils/tools'

// 设置里的开关项统一渲染为 Setting Row + Toggle，接口保持 CheckBox 的写法
export default memo(({ check, label, children, onChange, disabled, helpTitle, helpDesc }: CheckBoxProps) => {
  const theme = useTheme()
  const handleShowHelp = () => {
    void tipDialog({ title: helpTitle ?? '', message: helpDesc, btnText: global.i18n.t('understand') })
  }
  const help = (helpTitle ?? helpDesc)
    ? <IconButton icon="lucide-info" iconSize={22} size={52} color={theme['text-3']} onPress={handleShowHelp} />
    : null

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: theme.hairline, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <SettingRow
          title={label ?? ''}
          right={label ? undefined : children}
          disabled={disabled}
          toggle={{ value: check, onChange }}
        />
      </View>
      {help}
    </View>
  )
})
