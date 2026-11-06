import { useEffect, useState } from 'react'
import { getPicUrl } from '@/core/music/online'

const MAX_REQUESTS = 4
const MAX_CACHE_SIZE = 200
const RETRY_DELAY = 60_000
const cache = new Map<string, { url: string | null, time: number }>()
const pending = new Map<string, Promise<string | null>>()
const queue: Array<() => void> = []
let activeRequests = 0

const runNext = () => {
  while (activeRequests < MAX_REQUESTS && queue.length) {
    activeRequests++
    queue.shift()!()
  }
}

// Only mounted rows ask for covers. Share requests across lists and avoid a burst
// of per-track requests when a virtualized list mounts its initial window.
const loadCover = async(musicInfo: LX.Music.MusicInfoOnline): Promise<string | null> => {
  const key = `${musicInfo.source}:${musicInfo.id}`
  const cached = cache.get(key)
  if (cached && (cached.url != null || Date.now() - cached.time < RETRY_DELAY)) return cached.url
  const existing = pending.get(key)
  if (existing) return existing

  const request = new Promise<string | null>(resolve => {
    queue.push(() => {
      // Do not search other providers for every missing thumbnail.
      void getPicUrl({ musicInfo, isRefresh: false, allowToggleSource: false })
        .catch(() => null)
        .then(url => {
          const cover = typeof url == 'string' && url.trim() ? url.trim() : null
          cache.delete(key)
          cache.set(key, { url: cover, time: Date.now() })
          if (cache.size > MAX_CACHE_SIZE) cache.delete(cache.keys().next().value!)
          pending.delete(key)
          activeRequests--
          resolve(cover)
          runNext()
        })
    })
  })
  pending.set(key, request)
  runNext()
  return request
}

export default (musicInfo: LX.Music.MusicInfoOnline): string | null => {
  const picUrl = musicInfo.meta.picUrl
  const [resolved, setResolved] = useState<{ item: LX.Music.MusicInfoOnline, url: string | null } | null>(null)

  useEffect(() => {
    if (picUrl) return
    let cancelled = false
    void loadCover(musicInfo).then(url => {
      if (!cancelled) setResolved({ item: musicInfo, url })
    })
    return () => { cancelled = true }
  }, [musicInfo, picUrl])

  // A recycled row must never briefly display the previous song's artwork.
  if (picUrl) return picUrl
  return resolved?.item === musicInfo ? resolved.url : null
}
