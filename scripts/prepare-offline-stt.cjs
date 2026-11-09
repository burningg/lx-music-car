// Reproducible build-time downloads only. The installed app never downloads STT files.
const { spawnSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { createReadStream, createWriteStream } = require('node:fs')
const { mkdir, readdir, readFile, writeFile, rename, rm, stat } = require('node:fs/promises')
const { Readable } = require('node:stream')
const { pipeline } = require('node:stream/promises')
const path = require('node:path')
const manifest = require('./offline-stt-assets.json')
const root = path.resolve(__dirname, '../android/.stt')

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

async function extract(artifact) {
  if (!artifact.extract) return
  const directory = path.join(root, artifact.extract.directory)
  const marker = path.join(directory, '.archive-sha256')
  try { if ((await readFile(marker, 'utf8')) === artifact.sha256) return } catch (error) { if (error.code !== 'ENOENT') throw error }
  await mkdir(directory, { recursive: true })
  const archive = path.join(root, artifact.path)
  const jar = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'jar.exe' : 'jar') : 'jar'
  const result = artifact.extract.format === 'zip'
    ? spawnSync(jar, ['xf', archive], { cwd: directory, stdio: 'inherit' })
    : spawnSync('tar', ['-xzf', archive, '--strip-components=1', '-C', directory], { stdio: 'inherit' })
  if (result.error || result.status !== 0) throw new Error(`Cannot extract ${archive}: ${result.error?.message ?? result.status}`)
  await writeFile(marker, artifact.sha256)
}

async function main() {
  const files = process.argv.includes('--tests') ? [...manifest.files, ...manifest.testFiles] : manifest.files
  // Sequential downloads keep memory and network use bounded on CI and low-memory build hosts.
  for (const artifact of files) {
    await prepare(artifact, process.argv.includes('--verify'))
    if (!process.argv.includes('--verify')) await extract(artifact)
  }
  const modelFiles = manifest.files.filter(file => file.path.startsWith('assets/stt/'))
  const modelDirectory = path.dirname(path.join(root, modelFiles[0].path))
  const expected = new Set(modelFiles.map(file => path.basename(file.path)))
  for (const entry of await readdir(modelDirectory, { withFileTypes: true })) {
    if (entry.isFile() && !expected.has(entry.name)) {
      if (process.argv.includes('--verify')) throw new Error(`Obsolete model artifact: ${entry.name}. Run npm run prepare:stt.`)
      await rm(path.join(modelDirectory, entry.name))
    }
  }
  console.log(`Offline STT assets verified (${files.length} files).`)
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1 })
module.exports = { matches, prepare }
