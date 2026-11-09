// Cross-compile the offline-only Rust JNI for the same ABI/API coverage as the app.
const { spawnSync } = require('node:child_process')
const { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const targets = {
  'arm64-v8a': ['aarch64-linux-android', 'aarch64-linux-android'],
  'armeabi-v7a': ['armv7-linux-androideabi', 'armv7a-linux-androideabi'],
  x86: ['i686-linux-android', 'i686-linux-android'],
  x86_64: ['x86_64-linux-android', 'x86_64-linux-android'],
}
function main() {
  const option = name => process.argv[process.argv.indexOf(name) + 1]
  if (!process.argv.includes('--ndk') || !process.argv.includes('--abis')) throw new Error('Usage: node scripts/build-offline-stt.cjs --ndk <NDK directory> --abis <comma-separated ABIs>')
  const ndk = path.resolve(option('--ndk'))
  const abis = option('--abis').split(',')
  if (!abis.length || abis.some(abi => !targets[abi])) throw new Error('Unsupported Android ABI')
  const host = { darwin: 'darwin-x86_64', linux: 'linux-x86_64', win32: 'windows-x86_64' }[process.platform]
  if (!host) throw new Error(`Unsupported build host: ${process.platform}`)
  const bin = path.join(ndk, 'toolchains/llvm/prebuilt', host, 'bin')
  const cache = path.join(root, 'android/.stt/offline-stt')
  const libs = path.join(cache, 'jniLibs')
  const targetDir = path.join(cache, 'target')
  mkdirSync(libs, { recursive: true })
  // An ABI excluded from this build must not leak in from a previous build's output.
  for (const abi of readdirSync(libs)) if (!abis.includes(abi)) rmSync(path.join(libs, abi), { recursive: true, force: true })
  for (const abi of abis) {
    const [target, clangTarget] = targets[abi]
    const linker = path.join(bin, `${clangTarget}21-clang${process.platform === 'win32' ? '.cmd' : ''}`)
    if (!existsSync(linker)) throw new Error(`Android NDK compiler missing: ${linker}`)
    const key = target.toUpperCase().replaceAll('-', '_')
    const result = spawnSync('cargo', ['build', '--locked', '--release', '--manifest-path', 'android/offline-stt/Cargo.toml', '--target', target, '--target-dir', targetDir], {
      cwd: root, stdio: 'inherit',
      env: { ...process.env, [`CARGO_TARGET_${key}_LINKER`]: linker,
        // NDK 26 otherwise defaults to 4K ELF pages; support devices with 16K pages too.
        [`CARGO_TARGET_${key}_RUSTFLAGS`]: '-C link-arg=-Wl,-z,max-page-size=16384' },
    })
    if (result.error || result.status !== 0) throw new Error(`Rust build failed for ${abi}. Install Rust and run: rustup target add ${target}. ${result.error?.message ?? ''}`)
    mkdirSync(path.join(libs, abi), { recursive: true })
    copyFileSync(path.join(targetDir, target, 'release/liblx_offline_stt.so'), path.join(libs, abi, 'liblx_offline_stt.so'))
  }
}
if (require.main === module) {
  try { main() } catch (error) { console.error(error.message); process.exitCode = 1 }
}
module.exports = { targets }
