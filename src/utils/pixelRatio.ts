/**
 * Created by qianxin on 17/6/1.
 * 屏幕工具类
 * ui设计基准,iphone 6
 * width:375
 * height:667
 */
import { PixelRatio } from 'react-native'
import { windowSizeTools } from './windowSizeTools'

// 高保真的宽度和高度
const designWidth = 375.0
const designHeight = 667.0

// 获取屏幕的dp
const size = windowSizeTools.getSize()
// console.log('size', size)
let screenW = size.width
let screenH = size.height
if (screenW > screenH) {
  const temp = screenW
  screenW = screenH
  screenH = temp
}
let fontScale = PixelRatio.getFontScale()
let pixelRatio = PixelRatio.get()
// 根据dp获取屏幕的px
let screenPxW = PixelRatio.getPixelSizeForLayoutSize(screenW)
let screenPxH = PixelRatio.getPixelSizeForLayoutSize(screenH)
// console.log(screenPxW, screenPxH)

const scaleW = screenPxW / designWidth
const scaleH = screenPxH / designHeight
const scale = Math.min(scaleW, scaleH, 3.1)
// console.log(scale)

/**
 * 设置text
 * @param size  px
 * @returns dp
 */
export function getTextSize(size: number) {
  // console.log('screenW======' + screenW)
  // console.log('screenPxW======' + screenPxW)
  let scaleWidth = screenW / designWidth
  let scaleHeight = screenH / designHeight
  // console.log(scaleWidth, scaleHeight)
  let scale = Math.min(scaleWidth, scaleHeight, 1.3)
  size = Math.floor(size * scale / fontScale)
  // console.log(size)
  return size
}
export function setSpText(size: number) {
  return getTextSize(size) * global.lx.fontSize
}

/**
 * 设置高度
 * @param size  px
 * @returns dp
 */
export function scaleSizeH(size: number) {
  // console.log(screenPxH / designHeight)
  // let scaleHeight = size * Math.min(screenPxH / designHeight, 3.1)
  let scaleHeight = size * scale
  size = Math.floor(scaleHeight / pixelRatio)
  return size * global.lx.fontSize
}

/**
 * 设置宽度
 * @param size  px
 * @returns dp
 */
export function scaleSizeW(size: number) {
  // console.log(screenPxW / designWidth)
  // let scaleWidth = size * Math.min(screenPxW / designWidth, 3.1)
  let scaleWidth = size * scale
  size = Math.floor(scaleWidth / pixelRatio)
  return size * global.lx.fontSize
}


export const scaleSizeWR = (size: number) => {
  return size * 2 - scaleSizeW(size)
}

export const scaleSizeHR = (size: number) => {
  return size * 2 - scaleSizeH(size)
}

export const scaleSizeAbsHR = (size: number) => {
  let scaleHeight = size * scale
  return size * 2 - Math.floor(scaleHeight / pixelRatio)
}


// 车机设计稿基准：1920×720
const CAR_DESIGN_WIDTH = 1920
const CAR_DESIGN_HEIGHT = 720
let carScale = 0
windowSizeTools.onSizeChanged(() => {
  carScale = 0
})
const getCarScale = () => {
  if (carScale) return carScale
  const { width, height } = windowSizeTools.getSize()
  if (!width || !height) return 1
  carScale = Math.min(Math.max(width, height) / CAR_DESIGN_WIDTH, Math.min(width, height) / CAR_DESIGN_HEIGHT)
  return carScale
}

/**
 * 设计稿尺寸转 dp，用于间距、圆角、图片等布局尺寸，不随界面字号设置变化
 * @param size 设计稿 px
 */
export const px = (size: number) => {
  return Math.round(size * getCarScale())
}

/**
 * 设计稿字号转 dp，随界面字号设置（global.lx.fontSize）缩放
 * @param size 设计稿 px
 */
export const sp = (size: number) => {
  return Math.round(size * getCarScale() * global.lx.fontSize / fontScale)
}
