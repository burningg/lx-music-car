import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'

import Basic from './settings/Basic'
import Player from './settings/Player'
import LyricDesktop from './settings/LyricDesktop'
import Search from './settings/Search'
import List from './settings/List'
import Sync from './settings/Sync'
import Backup from './settings/Backup'
import Other from './settings/Other'
import Version from './settings/Version'

export const SETTING_SCREENS = [
  'basic',
  'player',
  'lyric_desktop',
  'search',
  'list',
  'sync',
  'backup',
  'other',
  'version',
] as const

export type SettingScreenIds = typeof SETTING_SCREENS[number]

// Older sessions may still point at a section that is no longer exposed.
export const normalizeSettingScreenId = (id: string): SettingScreenIds => SETTING_SCREENS.find(screen => screen == id) ?? 'basic'

// interface MainProps {
//   onUpdateActiveId: (id: string) => void
// }
export interface MainType {
  setActiveId: (id: SettingScreenIds) => void
}

const Main = forwardRef<MainType, {}>((props, ref) => {
  const [id, setId] = useState(normalizeSettingScreenId(global.lx.settingActiveId))

  useImperativeHandle(ref, () => ({
    setActiveId(id) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setId(normalizeSettingScreenId(id))
        })
      })
    },
  }))

  const component = useMemo(() => {
    switch (normalizeSettingScreenId(id)) {
      case 'player': return <Player />
      case 'lyric_desktop': return <LyricDesktop />
      case 'search': return <Search />
      case 'list': return <List />
      case 'sync': return <Sync />
      case 'backup': return <Backup />
      case 'other': return <Other />
      case 'version': return <Version />
      case 'basic':
      default: return <Basic />
    }
  }, [id])

  return component
})


export default Main

