// Use the checked-in wrapper from android/ on macOS, Linux and Windows.
const { spawnSync } = require('node:child_process')
const path = require('node:path')

const isWindows = process.platform === 'win32'
const result = spawnSync(isWindows ? 'gradlew.bat' : './gradlew', process.argv.slice(2), {
  cwd: path.resolve(__dirname, '../android'),
  stdio: 'inherit',
  shell: isWindows,
})

if (result.error) console.error(`Unable to start Gradle: ${result.error.message}`)
process.exit(result.status ?? 1)
