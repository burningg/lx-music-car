// Reproducible build-time downloads only. The installed app never downloads STT files.
const { spawnSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { createReadStream, createWriteStream } = require('node:fs')
const { mkdir, mkdtemp, readdir, rename, rm, stat } = require('node:fs/promises')
const { Readable } = require('node:stream')
const { pipeline } = require('node:stream/promises')
const path = require('node:path')
const manifest = require('./offline-stt-assets.json')
const root = path.resolve(__dirname, '../android/.stt/wetype')

async function matches(file, artifact) {
  try {
    if ((await stat(file)).size !== artifact.size) return false
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(file)) hash.update(chunk)
    return hash.digest('hex') === artifact.sha256
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

async function prepare(artifact, verifyOnly) {
  const target = path.join(root, artifact.path)
  if (await matches(target, artifact)) return
  if (verifyOnly) throw new Error(`Missing or corrupt offline STT asset: ${target}. Run npm run prepare:stt.`)
  await mkdir(path.dirname(target), { recursive: true })
  // A killed download must not leave partial files inside the APK's assets source directory.
  const tempDir = path.join(root, 'downloads')
  await mkdir(tempDir, { recursive: true })
  const temp = path.join(tempDir, `${path.basename(target)}.${process.pid}.tmp`)
  for (let attempt = 1; attempt <= 3; ++attempt) {
    try {
      console.log(`Downloading ${artifact.path} (${(artifact.size / 1048576).toFixed(1)} MiB), attempt ${attempt}`)
      const response = await fetch(artifact.url, { signal: AbortSignal.timeout(180000) })
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}: ${artifact.url}`)
      await pipeline(Readable.fromWeb(response.body), createWriteStream(temp))
      if (!await matches(temp, artifact)) throw new Error(`SHA-256 mismatch: ${artifact.path}`)
      await rename(temp, target)
      return
    } catch (error) {
      await rm(temp, { force: true })
      if (attempt === 3) throw error
    }
  }
}

// Extract only explicitly pinned members with the JDK already required by Android builds.
// All intermediate files stay outside the APK assets source directory.
async function installModel(verifyOnly) {
  const valid = await Promise.all(manifest.files.map(file => matches(path.join(root, file.path), file)))
  if (!valid.every(Boolean)) {
    if (verifyOnly) throw new Error('Missing or corrupt WeType model. Run npm run prepare:stt.')
    await prepare(manifest.package, false)
    const directory = await mkdtemp(path.join(root, 'downloads/extract-'))
    const jar = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'jar.exe' : 'jar') : 'jar'
    const extract = (archive, members) => {
      const result = spawnSync(jar, ['xf', archive, ...members], { cwd: directory, stdio: 'inherit' })
      if (result.error || result.status !== 0) throw new Error(`Cannot extract ${archive}: ${result.error?.message ?? result.status}`)
    }
    try {
      extract(path.join(root, manifest.package.path), [manifest.package.inner])
      extract(path.join(directory, manifest.package.inner), manifest.files.map(file => file.member))
      for (const file of manifest.files) {
        const extracted = path.join(directory, file.member)
        if (!await matches(extracted, file)) throw new Error(`Extracted model SHA-256 mismatch: ${file.member}`)
      }
      for (const file of manifest.files) {
        const target = path.join(root, file.path)
        await mkdir(path.dirname(target), { recursive: true })
        await rename(path.join(directory, file.member), target)
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }
  const modelDirectory = path.dirname(path.join(root, manifest.files[0].path))
  const expected = new Set(manifest.files.map(file => path.basename(file.path)))
  for (const entry of await readdir(modelDirectory, { withFileTypes: true })) {
    if (!expected.has(entry.name)) {
      if (verifyOnly) throw new Error(`Unexpected model artifact: ${entry.name}`)
      await rm(path.join(modelDirectory, entry.name), { recursive: true, force: true })
    }
  }
}

async function main() {
  const verifyOnly = process.argv.includes('--verify')
  await installModel(verifyOnly)
  if (process.argv.includes('--tests')) {
    for (const artifact of manifest.testFiles) await prepare(artifact, verifyOnly)
  }
  console.log('WeType offline model verified (XNet + dictionary; no ONNX runtime or cloud engines).')
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1 })
module.exports = { matches, prepare, installModel }
