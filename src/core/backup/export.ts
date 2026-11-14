import { version } from '../../../package.json'
import { getListMusics } from '@/core/list'
import settingState from '@/store/setting/state'
import listState from '@/store/list/state'
import commonState from '@/store/common/state'
import { state as userApiState } from '@/store/userApi'
import { getDislikeListRules, getUserApiScript, getUserTheme } from '@/utils/data'
import { APP_BACKUP_TYPE, APP_BACKUP_VERSION, parseAppBackup } from './format'

export const createAppBackup = async() => {
  // Settings may still be waiting for a throttled disk write. Snapshot live values.
  const setting = { ...settingState.setting }
  const fontSize = commonState.fontSize
  const userList = listState.userList.map(info => ({ ...info }))
  const apis = userApiState.list.map(info => ({ ...info }))
  const [defaultList, loveList, userLists, userApis, themes, dislikeRules] = await Promise.all([
    getListMusics(listState.defaultList.id),
    getListMusics(listState.loveList.id),
    Promise.all(userList.map(async(info) => ({ ...info, list: await getListMusics(info.id) }))),
    Promise.all(apis.map(async(info) => ({ info, script: await getUserApiScript(info.id) }))),
    getUserTheme(),
    getDislikeListRules(),
  ])
  return parseAppBackup(JSON.parse(JSON.stringify({
    type: APP_BACKUP_TYPE,
    version: APP_BACKUP_VERSION,
    appVersion: version,
    createdAt: new Date().toISOString(),
    data: { setting, fontSize, themes, userApis, lists: { defaultList, loveList, userList: userLists }, dislikeRules },
  })))
}
