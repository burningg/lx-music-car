// Run with: node --test scripts/search-tip-list.test.cjs
// Shallow-render contracts; Android rendering is checked separately in the emulator.
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')
const React = require('react')
const ShallowRenderer = require('react-shallow-renderer')

const filename = path.resolve(__dirname, '../src/screens/Home/Views/Search/TipList.tsx')
const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
  fileName: filename,
})
const theme = { elevated: '#fff', hairline: '#ddd', 'glass-strong': '#eee', 'text-3': '#888' }
const suggestions = Array.from({ length: 10 }, (_, i) => `Suggestion ${i}`)
const anchor = { x: 180, y: 3, width: 900, height: 64 }
const children = node => React.Children.toArray(node.props.children)
const find = (node, type) => {
  if (!React.isValidElement(node)) return undefined
  if (node.type == type) return node
  return children(node).map(child => find(child, type)).find(Boolean)
}

function setup(props = {}, scale = 1) {
  const requests = []
  const selected = []
  const state = { temp_source: 'kw', searchText: '', tipListInfo: { text: '', list: [] } }
  let api
  let cleanup
  const dependencies = {
    react: { ...React, useImperativeHandle: (_, create) => { api = create() }, useEffect: create => { cleanup = create() } },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { View: 'View', FlatList: 'FlatList', Pressable: 'Pressable', StyleSheet: { absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } } },
    '@/components/car': { CarIcon: 'CarIcon', CarText: 'CarText' },
    '@/store/theme/hook': { useTheme: () => theme },
    '@/utils/pixelRatio': { px: value => value * scale },
    '@/utils/musicSdk': { kw: { tipSearch: { search: keyword => new Promise((resolve, reject) => { requests.push({ keyword, resolve, reject }) }) } } },
    '@/store/search/state': state,
    '@/core/search/search': {
      setSearchText: text => { state.searchText = text },
      setTipListInfo: (text, source) => { state.tipListInfo = { ...state.tipListInfo, text, source } },
      setTipList: list => { state.tipListInfo.list = list },
    },
    '@/utils': { debounce: fn => fn },
  }
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require: id => {
      assert.ok(Object.hasOwn(dependencies, id), `Unmocked dependency ${id}`)
      return dependencies[id]
    },
  }, { filename })
  const renderer = new ShallowRenderer()
  renderer.render(React.createElement(module.exports.default, { anchor, availableHeight: 700, onSearch: keyword => selected.push(keyword), ...props }))
  return {
    state,
    requests,
    selected,
    get api() { return api },
    output: () => renderer.getRenderOutput(),
    unmount: () => { cleanup(); renderer.unmount() },
    async complete(index = 0, items = suggestions) { requests[index].resolve(items); await Promise.resolve(); await Promise.resolve() },
  }
}

async function open(ctx, text = 'test') {
  ctx.api.show()
  ctx.api.search(text)
  await ctx.complete()
}

test('suggestions anchor to the input and cap the themed panel at six car-scaled rows', async() => {
  const ctx = setup()
  await open(ctx)
  const output = ctx.output()
  const panel = children(output)[1]
  const list = find(output, 'FlatList')
  assert.equal(output.props.style[1].top, 79)
  assert.equal(panel.props.style.marginLeft, anchor.x)
  assert.equal(panel.props.style.width, anchor.width)
  assert.equal(panel.props.style.maxHeight, 400)
  assert.equal(panel.props.style.borderRadius, 24)
  assert.equal(panel.props.style.backgroundColor, theme.elevated)
  assert.equal(panel.props.style.borderColor, theme.hairline)
  assert.equal(list.props.data.length, 10, 'extra suggestions must remain scrollable')
  assert.equal(list.props.showsVerticalScrollIndicator, false)
  assert.equal(list.props.keyboardShouldPersistTaps, 'always')
  assert.equal(list.props.getItemLayout(null, 3).offset, 192)
  const row = list.props.renderItem({ item: suggestions[0] })
  assert.equal(row.props.style({ pressed: false }).height, 64)
  assert.equal(row.props.style({ pressed: true }).backgroundColor, theme['glass-strong'])
  assert.equal(find(row, 'CarText').props.size, 22)
  assert.equal(row.props.accessibilityRole, 'button')
  row.props.onPress()
  assert.deepEqual(ctx.selected, [suggestions[0]])
  assert.equal(ctx.output(), null)
})

test('density and short viewports constrain layout without mobile scaling', async() => {
  const ctx = setup({ availableHeight: 180 }, 0.5)
  await open(ctx)
  const panel = children(ctx.output())[1]
  assert.equal(panel.props.style.maxHeight, 107)
  assert.equal(panel.props.style.borderRadius, 12)
  assert.equal(find(ctx.output(), 'FlatList').props.getItemLayout(null, 2).offset, 64)
  for (const props of [{ anchor: null }, { availableHeight: 60 }]) {
    const hidden = setup(props)
    await open(hidden)
    assert.equal(hidden.output(), null)
  }
})

test('outside press and blur hide immediately; late responses cannot reopen the panel', async() => {
  const ctx = setup()
  await open(ctx)
  children(ctx.output())[0].props.onPress()
  assert.equal(ctx.output(), null)
  ctx.api.show()
  assert.notEqual(ctx.output(), null, 'cached suggestions can be reopened')
  ctx.api.search('next')
  ctx.api.hide()
  await ctx.complete(1)
  assert.equal(ctx.output(), null)
  assert.equal(ctx.state.tipListInfo.list.length, 10)
})

test('older requests cannot replace the latest query, even when the keyword repeats', async() => {
  const ctx = setup()
  ctx.api.show()
  ctx.api.search('a')
  ctx.api.search('ab')
  ctx.api.search('a')
  await ctx.complete(2, ['Latest a'])
  await ctx.complete(0, ['Stale a'])
  await ctx.complete(1, ['Stale ab'])
  assert.deepEqual(ctx.state.tipListInfo.list, ['Latest a'])
  assert.deepEqual(find(ctx.output(), 'FlatList').props.data, ['Latest a'])
})

test('clearing input clears suggestions and invalidates a pending response', async() => {
  const ctx = setup()
  ctx.api.show()
  ctx.api.search('a')
  ctx.api.search('')
  await ctx.complete()
  assert.equal(ctx.output(), null)
  assert.equal(ctx.state.searchText, '')
  assert.equal(ctx.state.tipListInfo.list.length, 0)
})

test('failed requests and responses after unmount do not leave stale suggestions', async() => {
  const ctx = setup()
  ctx.api.show()
  ctx.api.search('a')
  ctx.requests[0].reject(new Error('offline'))
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(ctx.output(), null)
  ctx.api.search('b')
  ctx.unmount()
  await ctx.complete(1)
  assert.equal(ctx.state.tipListInfo.list.length, 0)
})
