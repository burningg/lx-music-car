import { createI18n } from '@/lang/i18n'
import { setLanguage, updateSetting } from '@/core/common'


export default async(setting: LX.AppSetting) => {
  let lang = setting['common.langId']

  global.i18n = createI18n()

  if (!lang || !global.i18n.availableLocales.includes(lang)) {
    lang = global.i18n.fallbackLocale
    updateSetting({ 'common.langId': lang })
  }
  setLanguage(lang)
}
