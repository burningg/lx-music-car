import { TouchableOpacity } from 'react-native'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { forwardRef, useImperativeHandle, useState } from 'react'


export interface CurrentTagBtnProps {
  onShowList: () => void
}

export interface CurrentTagBtnType {
  setCurrentTagInfo: (name: string) => void
}

export default forwardRef<CurrentTagBtnType, CurrentTagBtnProps>(({ onShowList }, ref) => {
  const t = useI18n()
  const [name, setName] = useState('')
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    setCurrentTagInfo(name) {
      if (!name) name = t('songlist_tag_default')
      setName(name)
    },
  }))

  return (
    // 当前标签是分段组里的选中段
    <TouchableOpacity activeOpacity={0.7} onPress={onShowList} style={{ minHeight: px(48), justifyContent: 'center', paddingHorizontal: px(26), borderRadius: 999, backgroundColor: theme.elevated }}>
      <CarText size={18} weight="600" numberOfLines={1}>{name}</CarText>
    </TouchableOpacity>
  )
})
