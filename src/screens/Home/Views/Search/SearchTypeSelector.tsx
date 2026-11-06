import { useEffect, useMemo, useState } from 'react'
import { type SearchType } from '@/store/search/state'
import { useI18n } from '@/lang'
import { getSearchSetting } from '@/utils/data'
import { SegmentTabs } from '@/components/car'

const SEARCH_TYPE_LIST = [
  'music',
  'songlist',
] as const

// 搜索类型分段切换，仍通过 searchTypeChanged 事件通知搜索页
export default () => {
  const t = useI18n()
  const [type, setType] = useState<SearchType>('music')

  useEffect(() => {
    void getSearchSetting().then(info => {
      setType(info.type)
    })
  }, [])

  const list = useMemo(() => {
    return SEARCH_TYPE_LIST.map(type => ({ label: t(`search_type_${type}`), id: type }))
  }, [t])

  const handleTypeChange = (type: SearchType) => {
    setType(type)
    global.app_event.searchTypeChanged(type)
  }

  return <SegmentTabs items={list} activeId={type} onChange={handleTypeChange} />
}
