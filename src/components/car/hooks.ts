import { useEffect, useState } from 'react'
import { LIST_IDS } from '@/config/constant'
import { getListMusics } from '@/utils/listManage'
import { usePlayerMusicInfo } from '@/store/player/hook'
import playerState from '@/store/player/state'

const getCurrentMusicId = () => {
  const musicInfo = playerState.playMusicInfo.musicInfo
  if (!musicInfo) return null
  return 'progress' in musicInfo ? musicInfo.metadata.musicInfo.id : musicInfo.id
}

/** 当前播放歌曲是否在「我的收藏」里，收藏列表变化时自动刷新 */
export const useCurrentMusicLoved = () => {
  const musicInfo = usePlayerMusicInfo()
  const [loved, setLoved] = useState(false)

  useEffect(() => {
    let active = true
    const check = () => {
      const id = getCurrentMusicId()
      if (!id) {
        setLoved(false)
        return
      }
      void getListMusics(LIST_IDS.LOVE).then((list) => {
        if (active) setLoved(list.some(m => m.id == id))
      })
    }
    const handleListUpdate = (ids: string[]) => {
      if (ids.includes(LIST_IDS.LOVE)) check()
    }
    check()
    global.app_event.on('myListMusicUpdate', handleListUpdate)
    return () => {
      active = false
      global.app_event.off('myListMusicUpdate', handleListUpdate)
    }
  }, [musicInfo.id])

  return loved
}

const formatClock = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

/** 分钟级时钟，用于 Nav Rail 顶部时间 */
export const useClock = () => {
  const [time, setTime] = useState(() => formatClock(new Date()))

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const now = new Date()
      setTime(formatClock(now))
      timer = setTimeout(tick, (60 - now.getSeconds()) * 1000)
    }
    tick()
    return () => {
      clearTimeout(timer)
    }
  }, [])

  return time
}
