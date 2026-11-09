"""Bake the design's sunset ambient layer, including transparent blur bleed.

Run: python3 scripts/generate-night-ambient.py (requires Pillow).
The app uses this local layer instead of the current song's cover. Keep the
geometry in AmbientBackground.tsx in sync if the design's Ambient Art changes.
"""

import json
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DESIGN = ROOT / 'design/lx-music-car-claude.pen'
OUTPUT = ROOT / 'src/resources/images/ambient/nocturne-art.png'
SCALE = 0.25  # A blurred backdrop needs no full-resolution texture.


def main():
    design = json.loads(DESIGN.read_text())
    player = next(node for node in design['children'] if node['id'] == 'SEv9u')
    art = next(node for node in player['children'] if node.get('name') == 'Ambient Art')
    radius = art['effect']['radius']
    padding = radius * 3  # Fade out naturally instead of clipping at the art bounds.
    size = (round(art['width'] * SCALE), round(art['height'] * SCALE))
    bleed = round(padding * SCALE)
    source = Image.open(DESIGN.parent / art['fill']['url']).convert('RGBA')
    source = ImageOps.fit(source, size, method=Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (size[0] + 2 * bleed, size[1] + 2 * bleed))
    canvas.paste(source, (bleed, bleed))
    # Blur premultiplied color and alpha together to avoid a black fringe.
    blurred = canvas.convert('RGBa').filter(ImageFilter.GaussianBlur(radius * SCALE)).convert('RGBA')
    blurred.save(OUTPUT, optimize=True)
    print(f'{OUTPUT.relative_to(ROOT)}: {blurred.size}, '
          f'design bounds ({art["x"] - padding}, {art["y"] - padding}, '
          f'{art["width"] + 2 * padding}, {art["height"] + 2 * padding})')


if __name__ == '__main__':
    main()
