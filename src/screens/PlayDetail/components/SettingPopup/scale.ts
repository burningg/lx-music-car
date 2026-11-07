import { px as carPx } from '@/utils/pixelRatio'

// 密集抽屉保留小数布局尺寸，让 Yoga 在最终边界取整，避免低分辨率下
// 每个 64px 控件/间距独立取整后累积溢出、裁掉歌词预览。
export const px = (size: number) => size * carPx(1080) / 1080
