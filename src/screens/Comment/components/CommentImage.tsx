import { useEffect, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import Image, { getSize } from '@/components/common/Image'
import { useTheme } from '@/store/theme/hook'
import { CarText } from '@/components/car'
import { px } from '@/utils/pixelRatio'

const MAX_IMAGE_HEIGHT = px(260)

export default ({ url }: { url: string }) => {
  const [show, setShow] = useState(false)
  const [wh, setWH] = useState({ width: 0, height: 0 })
  const theme = useTheme()

  useEffect(() => {
    getSize(url, (realWidth, realHeight) => {
      let w = 0
      let h = 0
      if (realHeight > MAX_IMAGE_HEIGHT) {
        h = MAX_IMAGE_HEIGHT
        w = realWidth * (h / realHeight)
      }
      setWH({ width: w || realWidth, height: h || realHeight })
    })
  }, [url])

  return (
    wh.width
      ? (
        <View style={{ height: wh.height, width: wh.width, borderRadius: px(12), overflow: 'hidden' }}>
          {
            show
              ? <Image url={url} style={{ height: wh.height, width: wh.width }} />
              : (
                <TouchableOpacity
                  style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.hairline, borderRadius: px(12), backgroundColor: theme.glass }}
                  onPress={() => { setShow(true) }}
                >
                  <CarText size={15} color={theme['text-2']}>{global.i18n.t('comment_show_image')}</CarText>
                </TouchableOpacity>
                )
          }
        </View>
        )
      : null
  )
}
