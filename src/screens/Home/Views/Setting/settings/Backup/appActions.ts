import { exitApp } from '@/core/common'
import { createAppBackup } from '@/core/backup/export'
import { getBackupFileName, isAppPrivateBackupPath, parseAppBackup } from '@/core/backup/format'
import { stageAppRestore } from '@/core/backup/storage'
import { confirmDialog, handleReadFile, handleSaveFile, tipDialog, toast } from '@/utils/tools'

export class BackupLocationError extends Error {}

export const handleExportAppBackup = async(path: string) => {
  if (isAppPrivateBackupPath(path)) throw new BackupLocationError('Choose a public Documents or Download folder')
  toast(global.i18n.t('setting_backup_app_exporting'))
  const backup = await createAppBackup()
  const filePath = `${path.replace(/\/$/, '')}/${getBackupFileName()}`
  await handleSaveFile(filePath, backup)
  await tipDialog({ message: global.i18n.t('setting_backup_app_exported', { path: filePath }) })
}

export const handleImportAppBackup = async(path: string) => {
  toast(global.i18n.t('setting_backup_app_reading'))
  const backup = parseAppBackup(await handleReadFile(path))
  const { lists, userApis } = backup.data
  if (!await confirmDialog({
    title: global.i18n.t('setting_backup_app_import'),
    message: global.i18n.t('setting_backup_app_confirm', {
      date: new Date(backup.createdAt).toLocaleString(),
      lists: lists.userList.length + 2,
      sources: userApis.length,
    }),
    confirmButtonText: global.i18n.t('setting_backup_app_confirm_button'),
    danger: true,
    bgClose: false,
  })) return false
  await stageAppRestore(backup)
  exitApp('Manual app backup restore')
  return true
}
