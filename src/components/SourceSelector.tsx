import { forwardRef, type Ref, useImperativeHandle, useMemo, useState } from 'react'
import { View } from 'react-native'

import DorpDownMenu, { type DorpDownMenuProps as _DorpDownMenuProps } from '@/components/common/DorpDownMenu'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'

import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { CarText, CarIcon } from '@/components/car'
import { createStyle } from '@/utils/tools'
import { px } from '@/utils/pixelRatio'

type Sources = Readonly<Array<LX.OnlineSource | 'all'>>

export interface SourceSelectorProps<S extends Sources> {
  fontSize?: number
  center?: _DorpDownMenuProps<any>['center']
  /** text：原样式；pill：车机设计稿胶囊按钮 */
  variant?: 'text' | 'pill'
  onSourceChange: (source: S[number]) => void
}

export interface SourceSelectorType<S extends Sources> {
  setSourceList: (list: S, activeSource: S[number]) => void
}

export const useSourceListI18n = (list: Sources) => {
  const sourceNameType = useSettingValue('common.sourceNameType')
  const t = useI18n()
  return useMemo(() => {
    return list.map(s => ({ label: t(`source_${sourceNameType}_${s}`), action: s }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, sourceNameType, t])
}

const Component = <S extends Sources>({ fontSize = 15, center, variant = 'text', onSourceChange }: SourceSelectorProps<S>, ref: Ref<SourceSelectorType<S>>) => {
  const sourceNameType = useSettingValue('common.sourceNameType')
  const [list, setList] = useState([] as unknown as S)
  const [source, setSource] = useState<S[number]>('kw')
  const t = useI18n()
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    setSourceList(list, activeSource) {
      setList(list)
      setSource(activeSource)
    },
  }), [])

  const sourceList_t = useSourceListI18n(list)

  type DorpDownMenuProps = _DorpDownMenuProps<typeof sourceList_t>

  const handleChangeSource: DorpDownMenuProps['onPress'] = ({ action }) => {
    onSourceChange(action)
    setSource(action)
  }

  return (
    <DorpDownMenu
      menus={sourceList_t}
      center={center}
      onPress={handleChangeSource}
      fontSize={fontSize}
      activeId={source}
    >
      {
        variant == 'pill'
          ? (
              // 设计稿来源胶囊：高 64，强调色圆点 + 名称 + 下拉箭头
              <View style={{ height: px(64), flexDirection: 'row', alignItems: 'center', gap: px(10), paddingLeft: px(24), paddingRight: px(22), borderRadius: 999, borderWidth: 1, borderColor: theme.hairline, backgroundColor: theme.glass }}>
                <View style={{ width: px(8), height: px(8), borderRadius: px(4), backgroundColor: theme.accent }} />
                <CarText size={18} weight="600" numberOfLines={1}>{t(`source_${sourceNameType}_${source}`)}</CarText>
                <CarIcon name="lucide-chevron-down" size={20} color={theme['text-2']} />
              </View>
            )
          : (
              <View style={styles.sourceMenu}>
                <Text style={{ textAlign: center ? 'center' : 'left' }} numberOfLines={1} size={fontSize}>{t(`source_${sourceNameType}_${source}`)}</Text>
              </View>
            )
      }
    </DorpDownMenu>
  )
}

export default forwardRef(Component) as <S extends Sources>(p: SourceSelectorProps<S> & { ref?: Ref<SourceSelectorType<S>> }) => JSX.Element | null


const styles = createStyle({
  sourceMenu: {
    height: '100%',
    justifyContent: 'center',
    // paddingTop: 12,
    // paddingBottom: 12,
    paddingLeft: 15,
    paddingRight: 15,
    // backgroundColor: '#ccc',

  },
})
