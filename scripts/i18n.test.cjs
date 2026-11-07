/* Default language contract: node --test scripts/i18n.test.cjs */
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')

function load(file, dependencies = {}, globals = {}) {
  const filename = path.resolve(__dirname, '..', file)
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: filename,
  })
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    global: globals,
    require(id) {
      if (Object.hasOwn(dependencies, id)) return dependencies[id]
      throw new Error(`Unexpected dependency: ${id}`)
    },
  }, { filename })
  return module.exports
}

function setup() {
  const messages = Object.fromEntries(['zh_cn', 'zh_tw', 'en_us'].map(locale => [locale, { greeting: locale }]))
  const initialHookLocales = []
  const language = load('src/lang/i18n.ts', {
    './index': { messages },
    react: {
      useState(value) { initialHookLocales.push(value); return [value, () => {}] },
      useEffect() {},
      useCallback(callback) { return callback },
    },
  })
  const globals = {}
  const saved = {}
  const init = load('src/core/init/i18n.ts', {
    '@/lang/i18n': language,
    '@/core/common': {
      updateSetting(value) { Object.assign(saved, value) },
      setLanguage(locale) { saved['common.langId'] = locale; language.setLanguage(locale) },
    },
  }, globals).default
  return { init, globals, saved, language, initialHookLocales }
}

const defaults = load('src/config/defaultSetting.ts').default

test('fresh settings start in Simplified Chinese', async() => {
  assert.equal(defaults['common.langId'], 'zh_cn')
  const { init, globals, saved } = setup()
  await init(defaults)
  assert.equal(globals.i18n.locale, 'zh_cn')
  assert.equal(saved['common.langId'], 'zh_cn')
})

for (const locale of [null, undefined, '', 'fr_fr']) {
  test(`missing or unsupported locale ${JSON.stringify(locale)} falls back to Simplified Chinese`, async() => {
    const { init, globals, saved } = setup()
    await init({ 'common.langId': locale })
    assert.equal(globals.i18n.locale, 'zh_cn')
    assert.equal(saved['common.langId'], 'zh_cn')
  })
}

for (const locale of ['zh_cn', 'zh_tw', 'en_us']) {
  test(`saved language ${locale} is preserved and can still be changed`, async() => {
    const { init, globals, saved, language } = setup()
    await init({ 'common.langId': locale })
    assert.equal(globals.i18n.locale, locale)
    assert.equal(saved['common.langId'], locale)
    assert.equal(globals.i18n.t('greeting'), locale)
    language.setLanguage('en_us')
    assert.equal(globals.i18n.t('greeting'), 'en_us')
    language.setLanguage('zh_cn')
    assert.equal(globals.i18n.t('greeting'), 'zh_cn')
  })
}

test('language hooks use Simplified Chinese before initialization', () => {
  const { language, initialHookLocales } = setup()
  language.useI18n()
  assert.deepEqual(initialHookLocales, ['zh_cn'])
})
