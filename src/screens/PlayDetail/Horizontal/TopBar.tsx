import { memo, useRef } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { IconButton } from '@/components/car'
import { px } from '@/utils/pixelRatio'
import { updateSetting } from '@/core/common'
import { toggleDesktopLyricLock } from '@/core/desktopLyric'
import settingState from '@/store/setting/state'
import DesktopLyricEnable, { type DesktopLyricEnableType } from '@/components/DesktopLyricEnable'
import TimeoutExitEditModal, { type TimeoutExitEditModalType, useTimeInfo } from '@/components/TimeoutExitEditModal'
import SettingPopup, { type SettingPopupType } from '../components/SettingPopup'

// 设计稿顶部留白处放返回与工具：桌面歌词 / 定时退出 / 播放器设置
export default memo(({ onBack }: { onBack: () => void }) => {
  const theme = useTheme()
  const enabledLyric = useSettingValue('desktopLyric.enable')
  const desktopLyricEnableRef = useRef<DesktopLyricEnableType>(null)
  const timeoutModalRef = useRef<TimeoutExitEditModalType>(null)
  const settingPopupRef = useRef<SettingPopupType>(null)
  const timeInfo = useTimeInfo()

  const toggleLyric = () => {
    desktopLyricEnableRef.current?.setEnabled(!enabledLyric)
  }
  const toggleLyricLock = () => {
    const isLock = !settingState.setting['desktopLyric.isLock']
    void toggleDesktopLyricLock(isLock).then(() => {
      updateSetting({ 'desktopLyric.isLock': isLock })
    })
  }

  return (
    <View style={{ height: px(56), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <IconButton icon="lucide-chevron-left" iconSize={26} size={56} background={theme.glass} color={theme['text-1']} onPress={onBack} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
        <IconButton
          icon="lucide-captions"
          iconSize={24}
          size={52}
          color={enabledLyric ? theme.accent : theme['text-2']}
          onPress={toggleLyric}
          onLongPress={toggleLyricLock}
        />
        <IconButton
          icon="music_time"
          iconSize={24}
          size={52}
          color={timeInfo.active ? theme.accent : theme['text-2']}
          onPress={() => { timeoutModalRef.current?.show() }}
        />
        <IconButton
          icon="lucide-sliders-horizontal"
          iconSize={24}
          size={52}
          color={theme['text-2']}
          onPress={() => { settingPopupRef.current?.show() }}
        />
      </View>
      <DesktopLyricEnable ref={desktopLyricEnableRef} />
      <TimeoutExitEditModal ref={timeoutModalRef} timeInfo={timeInfo} />
      <SettingPopup ref={settingPopupRef} position="right" direction="horizontal" />
    </View>
  )
})
