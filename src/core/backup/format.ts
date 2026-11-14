import defaultSetting from '@/config/defaultSetting'
import { LIST_IDS } from '@/config/constant'

export const APP_BACKUP_TYPE = 'lx-music-car-backup'
export const APP_BACKUP_VERSION = 1

export interface AppBackup {
  type: typeof APP_BACKUP_TYPE
  version: typeof APP_BACKUP_VERSION
  appVersion: string
  createdAt: string
  data: {
    setting: LX.AppSetting
    fontSize: number
    themes: LX.Theme[]
    userApis: Array<{ info: LX.UserApi.UserApiInfo, script: string }>
    lists: {
      defaultList: LX.Music.MusicInfo[]
      loveList: LX.Music.MusicInfo[]
      userList: LX.List.UserListInfoFull[]
    }
    dislikeRules: string
  }
}

export class BackupFormatError extends Error {}

const invalid = (): never => { throw new BackupFormatError('Invalid or unsupported LX Music Car backup') }
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const isString = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const onlineSources = ['kw', 'kg', 'tx', 'wy', 'mg']
const reservedListIds: string[] = [LIST_IDS.DEFAULT, LIST_IDS.LOVE, LIST_IDS.TEMP, LIST_IDS.DOWNLOAD]
const settingOptions: Partial<Record<keyof LX.AppSetting, string[]>> = {
  'common.langId': ['zh_cn', 'zh_tw', 'en_us'],
  'common.sourceNameType': ['alias', 'real'],
  'common.shareType': ['system', 'clipboard'],
  'common.drawerLayoutPosition': ['left', 'right'],
  'player.togglePlayMethod': ['listLoop', 'random', 'list', 'singleLoop', 'none'],
  'player.playQuality': ['128k', '320k', 'flac', 'flac24bit', '192k', 'ape', 'wav'],
  'playDetail.style.align': ['left', 'center', 'right'],
  'desktopLyric.textPosition.x': ['left', 'center', 'right'],
  'desktopLyric.textPosition.y': ['top', 'center', 'bottom'],
  'list.addMusicLocationType': ['top', 'bottom'],
}

const checkMusicList = (value: unknown): value is LX.Music.MusicInfo[] => Array.isArray(value) && value.every((music: unknown) => {
  if (!isObject(music) || !isString(music.id) || !music.id || !isString(music.name) || !isString(music.singer)) return false
  if (music.interval !== null && !isString(music.interval)) return false
  const meta = music.meta
  if (!isObject(meta) || (!isString(meta.songId) && !isNumber(meta.songId)) || !isString(meta.albumName)) return false
  if (music.source === 'local') return isString(meta.filePath) && isString(meta.ext)
  if (!onlineSources.includes(music.source as string) || !Array.isArray(meta.qualitys) || !isObject(meta._qualitys)) return false
  if (!meta.qualitys.every((quality: unknown) => isObject(quality) && isString(quality.type) && (quality.size === null || isString(quality.size)))) return false
  if (!Object.values(meta._qualitys).every(quality => isObject(quality))) return false
  if (music.source === 'kg' && !isString(meta.hash)) return false
  if (music.source === 'tx' && !isString(meta.strMediaMid)) return false
  if (music.source === 'mg' && !isString(meta.copyrightId)) return false
  return true
})

const checkThemes = (value: unknown): value is LX.Theme[] => {
  if (!Array.isArray(value)) return false
  const ids = new Set<string>()
  return value.every((theme: unknown) => {
    if (!isObject(theme) || !isString(theme.id) || !theme.id || ids.has(theme.id) || !isString(theme.name)) return false
    if (typeof theme.isDark !== 'boolean' || typeof theme.isCustom !== 'boolean' || !isObject(theme.config)) return false
    const { themeColors, extInfo } = theme.config
    if (!isObject(themeColors) || !Object.values(themeColors).every(isString) || !isObject(extInfo) || !Object.values(extInfo).every(isString)) return false
    if (!['c-primary', 'c-850', 'c-450'].every(key => isString(themeColors[key]))) return false
    if (!['c-app-background', 'c-main-background', 'bg-image', 'bg-image-position', 'bg-image-size', 'c-badge-primary', 'c-badge-secondary', 'c-badge-tertiary'].every(key => isString(extInfo[key]))) return false
    ids.add(theme.id)
    return true
  })
}

// Read only known settings; never treat an imported object as arbitrary storage keys.
// Missing settings get current defaults so backups remain usable after an upgrade.
const parseSetting = (value: unknown): LX.AppSetting => {
  if (!isObject(value) || !isString(value.version) || !isString(value['common.apiSource'])) return invalid()
  const setting = { ...defaultSetting }
  for (const key of Object.keys(defaultSetting) as Array<keyof LX.AppSetting>) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue
    const target = value[key]
    if (typeof target !== typeof defaultSetting[key] || (typeof target === 'number' && !Number.isFinite(target))) return invalid()
    Object.assign(setting, { [key]: target })
  }
  for (const [key, options] of Object.entries(settingOptions)) {
    if (!options.includes(setting[key as keyof LX.AppSetting] as string)) return invalid()
  }
  if (setting['player.volume'] < 0 || setting['player.volume'] > 1 || setting['player.playbackRate'] <= 0 || setting['player.playbackRate'] > 10) return invalid()
  if (setting['desktopLyric.width'] <= 0 || setting['desktopLyric.width'] > 100 || setting['desktopLyric.maxLineNum'] < 1) return invalid()
  if (setting['desktopLyric.style.opacity'] < 0 || setting['desktopLyric.style.opacity'] > 100) return invalid()
  if (setting['desktopLyric.style.fontSize'] <= 0 || setting['playDetail.vertical.style.lrcFontSize'] <= 0 || setting['playDetail.horizontal.style.lrcFontSize'] <= 0) return invalid()
  const cacheSize = setting['player.cacheSize']
  if (cacheSize && (!/^\d+$/.test(cacheSize) || Number(cacheSize) > 1024 * 1024 * 1024)) return invalid()
  setting.version = defaultSetting.version
  return setting
}

export const parseAppBackup = (value: unknown): AppBackup => {
  if (!isObject(value) || value.type !== APP_BACKUP_TYPE || value.version !== APP_BACKUP_VERSION) return invalid()
  if (!isString(value.appVersion) || !isString(value.createdAt) || !Number.isFinite(Date.parse(value.createdAt))) return invalid()
  const data = value.data
  if (!isObject(data) || !isNumber(data.fontSize) || data.fontSize <= 0 || data.fontSize > 5 || !isString(data.dislikeRules)) return invalid()
  const setting = parseSetting(data.setting)
  if (!checkThemes(data.themes) || !Array.isArray(data.userApis) || !isObject(data.lists)) return invalid()
  const lists = data.lists
  if (!checkMusicList(lists.defaultList) || !checkMusicList(lists.loveList) || !Array.isArray(lists.userList)) return invalid()

  const apiIds = new Set<string>()
  const userApis = data.userApis.map((entry: unknown) => {
    if (!isObject(entry) || !isObject(entry.info) || !isString(entry.script) || !entry.script.trim()) return invalid()
    const info = entry.info
    if (!isString(info.id) || !info.id.startsWith('user_api') || apiIds.has(info.id)) return invalid()
    if (!isString(info.name) || !isString(info.description) || !isString(info.author) || !isString(info.homepage) || !isString(info.version) || typeof info.allowShowUpdateAlert !== 'boolean') return invalid()
    apiIds.add(info.id)
    return {
      info: { id: info.id, name: info.name, description: info.description, author: info.author, homepage: info.homepage, version: info.version, allowShowUpdateAlert: info.allowShowUpdateAlert },
      script: entry.script,
    }
  })
  if (setting['common.apiSource'].startsWith('user_api') && !apiIds.has(setting['common.apiSource'])) return invalid()

  const listIds = new Set(reservedListIds)
  const userList = lists.userList.map((list: unknown) => {
    if (!isObject(list) || !isString(list.id) || !list.id || listIds.has(list.id) || !isString(list.name) || !checkMusicList(list.list)) return invalid()
    if (list.source != null && !onlineSources.includes(list.source as string)) return invalid()
    if (list.sourceListId != null && !isString(list.sourceListId)) return invalid()
    if (list.locationUpdateTime != null && !isNumber(list.locationUpdateTime)) return invalid()
    listIds.add(list.id)
    return {
      id: list.id,
      name: list.name,
      source: list.source == null ? undefined : list.source as LX.OnlineSource,
      sourceListId: list.sourceListId ?? undefined,
      locationUpdateTime: list.locationUpdateTime as number | null ?? null,
      list: list.list,
    }
  })

  return {
    type: APP_BACKUP_TYPE,
    version: APP_BACKUP_VERSION,
    appVersion: value.appVersion,
    createdAt: value.createdAt,
    data: {
      setting,
      fontSize: data.fontSize,
      themes: data.themes,
      userApis,
      lists: { defaultList: lists.defaultList, loveList: lists.loveList, userList },
      dislikeRules: data.dislikeRules,
    },
  }
}

export const getBackupFileName = (date = new Date()) => `lx-music-car-backup-${date.toISOString().replace(/[:.]/g, '-')}.lxmc`

export const isAppPrivateBackupPath = (path: string) => {
  let decoded = path
  try { decoded = decodeURIComponent(path) } catch {}
  return /(?:^|[/:])Android\/(?:data|obb)(?:\/|$)/i.test(decoded) || /(?:^|\/)data\/(?:user(?:_de)?\/\d+|data)\//i.test(decoded)
}
