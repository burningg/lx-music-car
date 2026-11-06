/* Cover loading contract: node --test scripts/track-cover.test.cjs */
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')

const filename = path.resolve(__dirname, '../src/components/OnlineList/useTrackCover.ts')
const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: filename,
})
const track = (id, picUrl = null) => ({ id, source: 'kw', meta: { picUrl } })
const flush = async() => { for (let i = 0; i < 12; i++) await Promise.resolve() }

function setup() {
  const requests = []
  let current
  let now = 0
  const react = {
    useState(initial) {
      const row = current
      const i = row.cursor++
      if (!(i in row.states)) row.states[i] = initial
      return [row.states[i], value => {
        row.updates++
        row.states[i] = value
        row.render()
      }]
    },
    useEffect(create, deps) {
      const row = current
      const i = row.cursor++
      const effect = row.effects[i]
      if (effect && deps.every((dep, i) => Object.is(dep, effect.deps[i]))) return
      row.jobs.push(() => {
        effect?.cleanup?.()
        row.effects[i] = { deps, cleanup: create() }
      })
    },
  }
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    Date: { now: () => now },
    require(id) {
      if (id == 'react') return react
      if (id == '@/core/music/online') {
        return {
          getPicUrl: options => new Promise((resolve, reject) => requests.push({ ...options, resolve, reject })),
        }
      }
      throw new Error(`Unmocked dependency ${id}`)
    },
  }, { filename })
  return {
    requests,
    advance(ms) { now += ms },
    mount(item) {
      const row = {
        item,
        states: [],
        effects: [],
        jobs: [],
        cursor: 0,
        updates: 0,
        output: undefined,
        render(nextItem = this.item) {
          this.item = nextItem
          this.cursor = 0
          current = this
          this.output = module.exports.default(this.item)
          current = undefined
          for (const job of this.jobs.splice(0)) job()
        },
        unmount() { for (const effect of this.effects) effect?.cleanup?.() },
      }
      row.render()
      return row
    },
  }
}

test('existing artwork is used without an extra request', () => {
  const ctx = setup()
  const row = ctx.mount(track('a', 'https://example.com/a.jpg'))
  assert.equal(row.output, 'https://example.com/a.jpg')
  assert.equal(ctx.requests.length, 0)
})

test('missing artwork loads without cross-source search, deduplicates and caches', async() => {
  const ctx = setup()
  const a = ctx.mount(track('a'))
  const b = ctx.mount(track('a'))
  assert.equal(a.output, null)
  assert.equal(ctx.requests.length, 1)
  assert.equal(ctx.requests[0].allowToggleSource, false)
  assert.equal(ctx.requests[0].isRefresh, false)
  ctx.requests[0].resolve(' https://example.com/a.jpg ')
  await flush()
  assert.equal(a.output, 'https://example.com/a.jpg')
  assert.equal(b.output, a.output)
  const c = ctx.mount(track('a'))
  await flush()
  assert.equal(c.output, a.output)
  assert.equal(ctx.requests.length, 1)
})

test('only four requests run concurrently; failure and empty responses release the queue', async() => {
  const ctx = setup()
  const rows = Array.from({ length: 7 }, (_, i) => ctx.mount(track(String(i))))
  assert.equal(ctx.requests.length, 4)
  ctx.requests[0].reject(new Error('offline'))
  ctx.requests[1].resolve(null)
  ctx.requests[2].resolve('   ')
  await flush()
  assert.equal(ctx.requests.length, 7)
  assert.ok(rows.slice(0, 3).every(row => row.output === null))
  for (let i = 3; i < 7; i++) ctx.requests[i].resolve(`https://example.com/${i}.jpg`)
  await flush()
  assert.equal(rows[6].output, 'https://example.com/6.jpg')
})

test('recycled rows clear old artwork immediately and ignore stale completions', async() => {
  const ctx = setup()
  const row = ctx.mount(track('a'))
  row.render(track('b'))
  ctx.requests[0].resolve('https://example.com/a.jpg')
  await flush()
  assert.equal(row.output, null)
  ctx.requests[1].resolve('https://example.com/b.jpg')
  await flush()
  assert.equal(row.output, 'https://example.com/b.jpg')
  row.render(track('c'))
  assert.equal(row.output, null)
})

test('responses after unmount do not update the row', async() => {
  const ctx = setup()
  const row = ctx.mount(track('a'))
  row.unmount()
  ctx.requests[0].resolve('https://example.com/a.jpg')
  await flush()
  assert.equal(row.updates, 0)
})

test('negative caching prevents repeated failures but allows a later retry', async() => {
  const ctx = setup()
  ctx.mount(track('a'))
  ctx.requests[0].reject(new Error('offline'))
  await flush()
  ctx.mount(track('a'))
  await flush()
  assert.equal(ctx.requests.length, 1)
  ctx.advance(60_001)
  const row = ctx.mount(track('a'))
  assert.equal(ctx.requests.length, 2)
  ctx.requests[1].resolve('https://example.com/a.jpg')
  await flush()
  assert.equal(row.output, 'https://example.com/a.jpg')
})

test('artwork cache is bounded when browsing many tracks', async() => {
  const ctx = setup()
  for (let i = 0; i < 201; i++) {
    const row = ctx.mount(track(String(i)))
    ctx.requests[i].resolve(`https://example.com/${i}.jpg`)
    await flush()
    row.unmount()
  }
  ctx.mount(track('0'))
  assert.equal(ctx.requests.length, 202)
})
