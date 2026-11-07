"""从用户提供的原图生成 Android / iOS App 图标。

用法（任意目录）：python3 scripts/generate-app-icons.py
依赖：Pillow（python3 -m pip install Pillow）
原图：design/app-icon/source.png；保留原文件，仅在导出时裁掉外围黑色留白。
"""

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'design/app-icon/source.png'
ANDROID_RES = ROOT / 'android/app/src/main/res'
IOS_ICONS = ROOT / 'ios/LxMusicMobile/Images.xcassets/AppIcon.appiconset'
# 原图为 1254 × 1254；裁切框包住圆角方形图标，保留边缘高光。
ARTWORK_BOUNDS = (145, 137, 1109, 1101)
DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def load_artwork():
    with Image.open(SOURCE) as source:
        if source.size != (1254, 1254):
            raise ValueError('原图尺寸已改变，请同步调整 ARTWORK_BOUNDS。')
        square = source.convert('RGB').crop(ARTWORK_BOUNDS)

    # 只移除与四角连通的黑色外背景，不能按亮度直接抠除图标内部的黑色。
    red, green, blue = square.split()
    edge_mask = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    edge_mask = edge_mask.point(lambda value: 0 if value <= 8 else 255)
    last = square.width - 1
    for corner in ((0, 0), (last, 0), (0, last), (last, last)):
        if edge_mask.getpixel(corner) == 0:
            ImageDraw.floodfill(edge_mask, corner, 128)
    alpha = edge_mask.point(lambda value: 0 if value == 128 else 255)
    rounded = square.convert('RGBA')
    rounded.putalpha(alpha)
    return square, rounded


def save_resized(image, size, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.resize((size, size), Image.Resampling.LANCZOS).save(path, optimize=True)


def generate_android(square, rounded):
    circular = square.convert('RGBA')
    circle_mask = Image.new('L', square.size, 0)
    ImageDraw.Draw(circle_mask).ellipse((0, 0, square.width - 1, square.height - 1), fill=255)
    circular.putalpha(circle_mask)

    for density, scale in DENSITIES.items():
        folder = ANDROID_RES / f'mipmap-{density}'
        size = round(48 * scale)
        save_resized(rounded, size, folder / 'ic_launcher.png')
        save_resized(circular, size, folder / 'ic_launcher_round.png')

        # 自适应图标使用 108dp 图层；72dp 可视区域与普通图标保持相同构图。
        # 四周预留 18dp，避免系统裁切时放大、切掉音符。
        layer_size = round(108 * scale)
        artwork_size = round(72 * scale)
        inset = round(18 * scale)
        foreground = Image.new('RGBA', (layer_size, layer_size), (0, 0, 0, 0))
        artwork = rounded.resize((artwork_size, artwork_size), Image.Resampling.LANCZOS)
        foreground.alpha_composite(artwork, (inset, inset))
        foreground.save(folder / 'ic_launcher_foreground.png', optimize=True)


def generate_ios(square):
    contents_path = IOS_ICONS / 'Contents.json'
    contents = json.loads(contents_path.read_text(encoding='utf-8'))
    for entry in contents['images']:
        points = float(entry['size'].split('x')[0])
        scale = float(entry['scale'].removesuffix('x'))
        size = round(points * scale)
        filename = f'AppIcon-{size}.png'
        entry['filename'] = filename
        # 使用不含 alpha 通道的 RGB 图像，圆角由 iOS 处理。
        save_resized(square, size, IOS_ICONS / filename)
    contents_path.write_text(json.dumps(contents, indent=2) + '\n', encoding='utf-8')


def main():
    square, rounded = load_artwork()
    generate_android(square, rounded)
    generate_ios(square)
    print('Generated Android launcher/adaptive icons and iOS AppIcon assets.')


if __name__ == '__main__':
    main()
