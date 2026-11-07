/* Run with node --test scripts/dropdown-menu.test.cjs. Native font/Yoga checks
 * complement these layout and interaction contracts on the Android emulator. */
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')
const React = require('react')
const ShallowRenderer = require('react-shallow-renderer')
const root = path.resolve(__dirname, '..')
const noop = () => {}
const theme = { elevated: '#fff', hairline: '#ddd', accent: '#e52', 'accent-soft': '#fee', 'text-1': '#111', 'glass-strong': '#eee' }
function load(file, mocks = {}) {
  const filename = path.join(root, file)
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 }, fileName: filename,
  })
  const module = { exports: {} }
  const dependencies = {
    'react-native': Object.fromEntries(['View', 'ScrollView', 'TouchableHighlight'].map(name => [name, name])),
    '@/utils/pixelRatio': { px: n => n, sp: n => n },
    '@/utils/hooks': { useWindowSize: () => ({ width: 1920, height: 1080 }) },
    '@/store/theme/hook': { useTheme: () => theme },
    '@/components/car/CarText': 'CarText', '@/components/car/CarIcon': 'CarIcon',
    './Modal': 'Modal', './Button': 'Button',
    ...mocks,
  }
  vm.runInNewContext(outputText, { module, exports: module.exports, require(id) {
    if (Object.hasOwn(dependencies, id)) return dependencies[id]
    if (id == 'react' || id == 'react/jsx-runtime') return require(id)
    throw new Error(`Unmocked dependency ${id}`)
  } }, { filename })
  return module.exports
}
const layoutModule = load('src/components/common/menuLayout.ts')
const layout = layoutModule.getMenuLayout
function mount(Component, props) {
  const renderer = new ShallowRenderer()
  renderer.render(React.createElement(Component, props))
  return { output: () => renderer.getRenderOutput(), render: props => renderer.render(React.createElement(Component, props)) }
}
function children(node) { return React.Children.toArray(node.props.children) }
const menus = [
  { action: 'kw', label: '小蜗音乐' },
  { action: 'kg', label: '小枸音乐' },
  { action: 'tx', label: '小秋音乐', disabled: true },
]
const props = { menus, onPress: noop, onHide: noop, buttonPosition: { x: 1720, y: 70, w: 140, h: 48 }, menuSize: {}, activeId: 'kw' }
function menu(overrides = {}, mocks = {}) {
  const Wrapper = load('src/components/common/Menu.tsx', { './menuLayout': layoutModule, ...mocks }).default
  const wrapped = mount(Wrapper, { menus, onPress: noop }).output()
  return mount(wrapped.props.children.type, { ...props, ...overrides })
}
function frame(instance) { return children(instance.output())[1] }
function rows(instance) { return children(children(frame(instance))[0]) }

test('right-edge menu aligns to the trigger right edge and keeps the opening gap', () => {
  const result = layout(props.buttonPosition, { width: 1920, height: 1080 }, { width: 240, height: 206 }, 16, 8)
  assert.equal(result.left, 1620)
  assert.equal(result.top, 126)
  assert.equal(result.width, 240)
  assert.equal(result.maxHeight, 938)
})

test('menu does not flip horizontally while there is room for one popup width', () => {
  const result = layout({ x: 600, y: 20, w: 60, h: 48 }, { width: 1000, height: 600 }, { width: 250, height: 300 }, 16, 8)
  assert.equal(result.left, 600)
})

test('near-bottom menus open upward; overlong menus scroll in the larger space', () => {
  const window = { width: 1000, height: 600 }
  const result = layout({ x: 900, y: 500, w: 80, h: 48 }, window, { width: 240, height: 400 }, 16, 8)
  assert.equal(result.bottom, 108)
  assert.equal(result.top, undefined)
  assert.equal(result.maxHeight, 476)
  const long = layout({ x: 400, y: 200, w: 80, h: 48 }, window, { width: 5000, height: 5000 }, 16, 8)
  assert.equal(long.left, 16)
  assert.equal(long.width, 968)
  assert.equal(long.top, 256)
  assert.equal(long.maxHeight, 328)
})

test('anchors at every edge and stale offscreen anchors remain inside the window', () => {
  for (const window of [{ width: 1920, height: 1080 }, { width: 1080, height: 1920 }, { width: 640, height: 360 }]) {
    for (const x of [-100, 0, window.width / 2, window.width, window.width + 100]) {
      for (const y of [-100, 0, window.height / 2, window.height, window.height + 100]) {
        const result = layout({ x, y, w: 80, h: 48 }, window, { width: 900, height: 600 }, 16, 8)
        assert.ok(result.left >= 16)
        assert.ok(result.left + result.width <= window.width - 16)
        assert.ok(result.maxHeight >= 0)
        if (result.top != null) assert.ok(result.top + result.maxHeight <= window.height - 16)
        else assert.ok(result.bottom + result.maxHeight <= window.height - 16)
      }
    }
  }
})

test('source menus use car typography, independent row sizes and no text ellipsis', () => {
  const instance = menu()
  assert.equal(frame(instance).props.style.width, 240)
  for (const row of rows(instance)) {
    assert.equal(row.props.style.minHeight, 64)
    assert.equal(row.props.style.height, undefined)
    const text = children(row.props.children)[0]
    assert.equal(text.type, 'CarText')
    assert.equal(text.props.size, 20)
    assert.equal(text.props.numberOfLines, undefined)
  }
})

test('native label measurement expands narrow triggers and caps very long translations', () => {
  const instance = menu()
  const measure = children(children(instance.output())[0])[0]
  measure.props.onLayout({ nativeEvent: { layout: { width: 330 } } })
  assert.equal(frame(instance).props.style.width, 330 + 36 + 38 + 12 + 2)
  measure.props.onLayout({ nativeEvent: { layout: { width: 4000 } } })
  assert.equal(frame(instance).props.style.width, 1888)
  assert.equal(frame(instance).props.style.left, 16)
})

test('selected rows are highlighted and dismiss without duplicate source callbacks', () => {
  const calls = []
  const instance = menu({ onPress: item => calls.push(item.action), onHide: () => calls.push('hide') })
  const [selected, other, disabled] = rows(instance)
  assert.equal(selected.props.style.backgroundColor, theme['accent-soft'])
  assert.equal(selected.props.accessibilityState.selected, true)
  assert.equal(children(children(selected.props.children)[1])[0].props.name, 'lucide-check')
  selected.props.onPress()
  assert.deepEqual(calls, ['hide'])
  other.props.onPress()
  assert.deepEqual(calls, ['hide', 'hide', 'kg'])
  assert.equal(disabled.props.disabled, true)
  assert.equal(disabled.props.accessibilityState.disabled, true)
})

test('large fonts grow rows rather than clipping fixed heights', () => {
  const instance = menu({}, { '@/utils/pixelRatio': { px: n => n, sp: n => n * 3 } })
  assert.equal(rows(instance)[0].props.style.minHeight, 112)
})

test('dropdown passes only anchor geometry, keeps popup outside button and forwards dismissal', () => {
  const calls = []; let hidden = 0
  const Component = load('src/components/common/DorpDownMenu.tsx', { './Menu': 'Menu' }).default
  const instance = mount(Component, { menus, onPress: noop, onHide: () => hidden++, children: 'Trigger', width: 300, height: 70 })
  let [button, popup] = children(instance.output())
  button.ref.current = { measure: callback => callback(0, 0, 65.1, 31.2, 1700.1, 80.5) }
  popup.ref.current = { show: (...args) => calls.push(args) }
  button.props.onPress()
  assert.equal(calls[0].length, 1)
  assert.equal(calls[0][0].w, 66)
  assert.equal(calls[0][0].h, 32)
  ;[button, popup] = children(instance.output())
  assert.equal(button.props.children, 'Trigger')
  assert.equal(button.props.accessibilityState.expanded, true)
  assert.equal(popup.props.width, 300)
  assert.equal(popup.props.height, 70)
  popup.props.onHide()
  assert.equal(hidden, 1)
  assert.equal(children(instance.output())[0].props.accessibilityState.expanded, false)
})

test('empty dropdowns do not open or become expanded', () => {
  const Component = load('src/components/common/DorpDownMenu.tsx', { './Menu': 'Menu' }).default
  const instance = mount(Component, { menus: [], onPress: noop, children: 'Trigger' })
  const [button] = children(instance.output())
  button.ref.current = { measure: () => assert.fail('empty menu should not measure or open') }
  button.props.onPress()
  assert.equal(children(instance.output())[0].props.accessibilityState.expanded, false)
})
