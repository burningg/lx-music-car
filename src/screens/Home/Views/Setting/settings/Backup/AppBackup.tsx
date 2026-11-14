import { memo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import ChoosePath, { type ChoosePathType } from '@/components/common/ChoosePath'
import { CarText } from '@/components/car'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { useUnmounted } from '@/utils/hooks'
import { log } from '@/utils/log'
import { toast } from '@/utils/tools'
import { BackupFormatError } from '@/core/backup/format'
import SubTitle from '../../components/SubTitle'
import Button from '../../components/Button'
import { BackupLocationError, handleExportAppBackup, handleImportAppBackup } from './appActions'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const choosePathRef = useRef<ChoosePathType>(null)
  const actionRef = useRef<'import' | 'export'>('export')
  const inProgress = useRef(false)
  const [busy, setBusy] = useState(false)
  const unmounted = useUnmounted()

  const choosePath = (action: 'import' | 'export') => {
    if (inProgress.current) return
    actionRef.current = action
    choosePathRef.current?.show({
      title: t(action === 'export' ? 'setting_backup_app_export_desc' : 'setting_backup_app_import_desc'),
      dirOnly: action === 'export',
      filter: ['lxmc', 'json'],
    })
  }
  const onConfirmPath = async(path: string) => {
    if (inProgress.current) return
    inProgress.current = true
    setBusy(true)
    let exiting = false
    try {
      if (actionRef.current === 'export') await handleExportAppBackup(path)
      else exiting = await handleImportAppBackup(path)
    } catch (err) {
      log.error('Manual app backup failed', err)
      const message = err instanceof BackupFormatError
        ? t('setting_backup_app_invalid')
        : err instanceof BackupLocationError
          ? t('setting_backup_app_location_error')
          : t('setting_backup_app_failed', { message: err instanceof Error ? err.message : String(err) })
      toast(message, 'long')
    } finally {
      if (!exiting) {
        inProgress.current = false
        if (!unmounted.current) setBusy(false)
      }
    }
  }

  return (
    <>
      <SubTitle title={t('setting_backup_app')}>
        <CarText size={16} lineHeight={1.5} color={theme['text-2']}>{t('setting_backup_app_scope')}</CarText>
        <View style={styles.buttons}>
          <Button disabled={busy} onPress={() => { choosePath('export') }}>{t('setting_backup_app_export')}</Button>
          <Button disabled={busy} onPress={() => { choosePath('import') }}>{t('setting_backup_app_import')}</Button>
        </View>
        <CarText size={15} lineHeight={1.5} color={theme['text-2']}>{t('setting_backup_app_storage_tip')}</CarText>
        {busy ? <CarText size={16} color={theme['text-2']}>{t('setting_backup_app_busy')}</CarText> : null}
      </SubTitle>
      <ChoosePath ref={choosePathRef} onConfirm={onConfirmPath} />
    </>
  )
})

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', flexWrap: 'wrap' },
})
