import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'

import MusicList, { type MusicListType } from './MusicList'
import Overview, { type OverviewInfo } from './Overview'
import PageContent from '@/components/PageContent'
import { AmbientBackground, CarShell } from '@/components/car'
import { setComponentId, updateSetting } from '@/core/common'
import { COMPONENT_IDS, MUSIC_TOGGLE_MODE } from '@/config/constant'
import { type ListInfoItem } from '@/store/songlist/state'
import songlistState from '@/store/songlist/state'
import { ListInfoContext } from './state'
import { pop } from '@/navigation'
import { useI18n } from '@/lang'
import { toast } from '@/utils/tools'
import { px } from '@/utils/pixelRatio'
import { handleCollect, handlePlay } from './listAction'


export default ({ componentId, info }: { componentId: string, info: ListInfoItem }) => {
  const t = useI18n()
  const musicListRef = useRef<MusicListType>(null)
  const isUnmountedRef = useRef(false)
  const [overview, setOverview] = useState<OverviewInfo>({
    name: info.name,
    desc: info.desc ?? '',
    playCount: info.play_count ?? '',
    total: 0,
    img: info.img,
  })

  useEffect(() => {
    setComponentId(COMPONENT_IDS.songlistDetail, componentId)

    isUnmountedRef.current = false

    musicListRef.current?.loadList(info.source, info.id)


    return () => {
      isUnmountedRef.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const back = () => {
    void pop(componentId)
  }
  const handlePlayAll = () => {
    if (!songlistState.listDetailInfo.info.name) return
    void handlePlay(info.id, info.source, songlistState.listDetailInfo.list)
  }
  const handleShuffle = () => {
    updateSetting({ 'player.togglePlayMethod': MUSIC_TOGGLE_MODE.random })
    toast(t('play_list_random'))
    handlePlayAll()
  }
  const handleCollectList = () => {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    void handleCollect(info.id, info.source, songlistState.listDetailInfo.info.name || info.name)
  }

  return (
    <PageContent>
      <CarShell componentId={componentId}>
        <ListInfoContext.Provider value={info}>
          <View style={{ flex: 1 }}>
            <AmbientBackground />
            <View style={{ flex: 1, flexDirection: 'row', gap: px(80), paddingTop: px(48), paddingHorizontal: px(72) }}>
              <Overview
                componentId={componentId}
                info={overview}
                onBack={back}
                onPlay={handlePlayAll}
                onShuffle={handleShuffle}
                onCollect={handleCollectList}
              />
              <View style={{ flex: 1 }}>
                <MusicList ref={musicListRef} onInfo={setOverview} />
              </View>
            </View>
          </View>
        </ListInfoContext.Provider>
      </CarShell>
    </PageContent>
  )
}
