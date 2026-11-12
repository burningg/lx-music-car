import { httpGet } from '@/utils/request'
import { name } from '../../package.json'
import { PROJECT_URL, PROJECT_REPOSITORY } from '@/config/project'
import { downloadFile, stopDownload, temporaryDirectoryPath } from '@/utils/fs'
import { getSupportedAbis, installApk } from '@/utils/nativeModules/utils'
import { APP_PROVIDER_NAME } from '@/config/constant'

const abis = [
  'arm64-v8a',
  'armeabi-v7a',
  'x86_64',
  'x86',
  'universal',
]

// Only use this fork's release metadata; never fall back to upstream channels.
const address = [
  `https://raw.githubusercontent.com/${PROJECT_REPOSITORY}/master/publish/version.json`,
  `https://cdn.jsdelivr.net/gh/${PROJECT_REPOSITORY}@master/publish/version.json`,
  `https://fastly.jsdelivr.net/gh/${PROJECT_REPOSITORY}@master/publish/version.json`,
  `https://gcore.jsdelivr.net/gh/${PROJECT_REPOSITORY}@master/publish/version.json`,
]


const request = async(url, retryNum = 0) => {
  return new Promise((resolve, reject) => {
    httpGet(url, {
      timeout: 10000,
    }, (err, resp, body) => {
      if (err || resp.statusCode != 200) {
        ++retryNum >= 3
          ? reject(err || new Error(resp.statusMessage || resp.statusCode))
          : request(url, retryNum).then(resolve).catch(reject)
      } else resolve(body)
    })
  })
}

export const getVersionInfo = async(index = 0) => {
  try {
    const info = await request(address[index])
    // Old fork snapshots can still contain the upstream version.json.
    if (info?.name != name || typeof info.version != 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(info.version)) {
      throw new Error('Invalid release metadata for ' + name)
    }
    return info
  } catch (err) {
    if (index + 1 >= address.length) throw err
    return getVersionInfo(index + 1)
  }
}

const getTargetAbi = async() => {
  const supportedAbis = await getSupportedAbis()
  for (const abi of abis) {
    if (supportedAbis.includes(abi)) return abi
  }
  return abis[abis.length - 1]
}
let downloadJobId = null
const noop = (total, download) => {}
let apkSavePath

export const downloadNewVersion = async(version, onDownload = noop) => {
  const abi = await getTargetAbi()
  const url = `${PROJECT_URL}/releases/download/v${version}/${name}-v${version}-${abi}.apk`
  let savePath = `${temporaryDirectoryPath}/${name}.apk`

  if (downloadJobId) stopDownload(downloadJobId)

  const { jobId, promise } = downloadFile(url, savePath, {
    progressInterval: 500,
    connectionTimeout: 20000,
    readTimeout: 30000,
    begin({ statusCode, contentLength }) {
      onDownload(contentLength, 0)
      // switch (statusCode) {
      //   case 200:
      //   case 206:
      //     break
      //   default:
      //     onDownload(null, contentLength, 0)
      //     break
      // }
    },
    progress({ contentLength, bytesWritten }) {
      onDownload(contentLength, bytesWritten)
    },
  })
  downloadJobId = jobId
  return promise.then(() => {
    apkSavePath = savePath
    return updateApp()
  })
}

export const updateApp = async() => {
  if (!apkSavePath) throw new Error('apk Save Path is null')
  await installApk(apkSavePath, APP_PROVIDER_NAME)
}
