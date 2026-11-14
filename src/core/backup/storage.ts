import { LIST_IDS, storageDataPrefix as keys } from '@/config/constant'
import { getAllKeys, getDataMultiple, removeDataMultiple, saveDataMultiple } from '@/plugins/storage'
import { existsFile, moveFile, privateStorageDirectoryPath, readFile, unlink, writeFile } from '@/utils/fs'
import { log } from '@/utils/log'
import { BackupFormatError, parseAppBackup, type AppBackup } from './format'

const pendingPath = `${privateStorageDirectoryPath}/app-restore.pending.json`
const rollbackPath = `${privateStorageDirectoryPath}/app-restore.rollback.json`
type Records = Array<[string, unknown]>
type RestoreResult = 'restored' | 'rolledBack' | null
let restoreResult: RestoreResult = null

const fixedKeys: string[] = [keys.setting, keys.fontSize, keys.theme, keys.userList, keys.dislikeList,
  keys.playInfo, keys.listScrollPosition, keys.listPrevSelectId, keys.listUpdateInfo]
const isRestoreKey = (key: string) => fixedKeys.includes(key) || key.startsWith(keys.list) || key.startsWith(keys.userApi)
const getRestoreKeys = async() => (await getAllKeys()).filter(isRestoreKey)
const removeFileIfPresent = async(path: string) => {
  if (!await existsFile(path)) return
  await unlink(path)
  if (await existsFile(path)) throw new Error('Could not remove a restore transaction file')
}

const writeAtomic = async(path: string, data: unknown) => {
  const tempPath = path + '.tmp'
  try {
    await writeFile(tempPath, JSON.stringify(data))
    await moveFile(tempPath, path)
    // The native library does not reject every failed rename. Verify its result.
    if (!await existsFile(path)) throw new Error('Could not commit the restore file')
  } finally {
    await removeFileIfPresent(tempPath).catch(err => { log.warn('Backup temporary file cleanup failed', err) })
  }
}

export const stageAppRestore = async(value: unknown) => {
  const backup = parseAppBackup(value)
  if (await existsFile(pendingPath) || await existsFile(rollbackPath)) throw new Error('A restore is already pending. Please restart the app.')
  // Only stage here. Applying while the player/sync/settings writers are running
  // would allow old in-memory data to overwrite the restored configuration.
  await writeAtomic(pendingPath, backup)
}

const buildRestoreRecords = (backup: AppBackup, previous: Records): Records => {
  const data = backup.data
  const oldSetting = previous.find(([key]) => key === keys.setting)?.[1] as Partial<LX.AppSetting> | undefined
  const records: Records = [
    [keys.setting, { ...data.setting, 'sync.enable': false, 'common.isAgreePact': oldSetting?.['common.isAgreePact'] === true }],
    [keys.fontSize, data.fontSize],
    [keys.theme, data.themes],
    [keys.dislikeList, data.dislikeRules],
    [keys.userList, data.lists.userList.map(({ list, ...info }) => info)],
    [keys.list + LIST_IDS.DEFAULT, data.lists.defaultList],
    [keys.list + LIST_IDS.LOVE, data.lists.loveList],
    [keys.userApi, data.userApis.map(({ info }) => info)],
  ]
  for (const list of data.lists.userList) records.push([keys.list + list.id, list.list])
  for (const api of data.userApis) records.push([keys.userApi + api.info.id, api.script])
  return records
}

const replaceRecords = async(records: Records) => {
  await removeDataMultiple(await getRestoreKeys())
  if (records.length) await saveDataMultiple(records)
}

const readRollback = async(): Promise<Records> => {
  const value: unknown = JSON.parse(await readFile(rollbackPath))
  if (!Array.isArray(value) || !value.every((entry: unknown) => Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && isRestoreKey(entry[0]))) {
    throw new Error('Invalid restore recovery journal. Initialization was stopped to protect your data.')
  }
  return value as Records
}

const finishRestore = async() => {
  // The journal remains available until both the data and pending marker commit.
  await removeFileIfPresent(pendingPath)
  await removeFileIfPresent(rollbackPath)
}

// Must run before font/settings/list/theme initialization or any background writer.
export const applyPendingAppRestore = async() => {
  if (await existsFile(rollbackPath)) {
    // A previous launch was interrupted or could not roll back. Never bootstrap
    // partial data: recover the original snapshot before allowing initialization.
    await replaceRecords(await readRollback())
    await finishRestore()
    restoreResult = 'rolledBack'
    return
  }
  if (!await existsFile(pendingPath)) return
  let backup: AppBackup
  try {
    backup = parseAppBackup(JSON.parse(await readFile(pendingPath)))
  } catch (err) {
    if (!(err instanceof BackupFormatError) && !(err instanceof SyntaxError)) throw err
    // No journal means no data has been changed yet. A damaged staged file must
    // not prevent the user from opening the app and choosing their backup again.
    log.error('Discarding a damaged pending restore', err)
    await removeFileIfPresent(pendingPath)
    restoreResult = 'rolledBack'
    return
  }
  const previous: Records = (await getDataMultiple(await getRestoreKeys())).filter(([, value]) => value != null)
  const records = buildRestoreRecords(backup, previous)
  await writeAtomic(rollbackPath, previous)
  try {
    await replaceRecords(records)
    await finishRestore()
    restoreResult = 'restored'
  } catch (err) {
    log.error('App backup restore failed; recovering previous data', err)
    await replaceRecords(previous)
    await finishRestore()
    restoreResult = 'rolledBack'
  }
}

export const takeAppRestoreResult = (): RestoreResult => {
  const result = restoreResult
  restoreResult = null
  return result
}
