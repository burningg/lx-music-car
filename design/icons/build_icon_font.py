"""把 design/icons/svg 里的图标合并进 icomoon 字体，并同步 selection.json。

用法（仓库根目录）：python3 design/icons/build_icon_font.py
依赖：fontTools（pip install fonttools）

- SVG 由设计稿 lx-music-car-claude.pen 导出，坐标是图标节点自身的方形坐标系，icons.json 记录节点边长
- 已存在同名图标时复用原编码，替换字形；新图标依次追加编码
- 同时写入 src/resources/fonts/icomoon.ttf 和 android/app/src/main/assets/fonts/icomoon.ttf
"""
import json
import os
import re

from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.svgLib.path import parse_path
from fontTools.ttLib import TTFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ICON_DIR = os.path.join(ROOT, 'design', 'icons')
FONT_PATHS = [
    os.path.join(ROOT, 'src', 'resources', 'fonts', 'icomoon.ttf'),
    os.path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'fonts', 'icomoon.ttf'),
]
SELECTION_PATH = os.path.join(ROOT, 'src', 'resources', 'fonts', 'selection.json')

EM = 1024
ASCENT = 960
PATH_RXP = re.compile(r'<path\b([^>]*)>')
ATTR_RXP = re.compile(r'(\w[\w-]*)="([^"]*)"')


def read_svg_path(file_path):
    """导出的 d 已经是节点坐标；path 上的 translate 只用于贴合紧凑 viewBox，这里忽略。"""
    with open(file_path, encoding='utf-8') as f:
        svg = f.read()
    paths = PATH_RXP.findall(svg)
    if len(paths) != 1:
        raise ValueError(f'{file_path}: expected 1 <path>, got {len(paths)}')
    return dict(ATTR_RXP.findall(paths[0]))['d']


def draw_icon(pen, d, size):
    """节点坐标（y 向下，边长 size）映射到字体坐标（y 向上，em 1024，基线下 64）。"""
    s = EM / size
    parse_path(d, TransformPen(pen, (s, 0, 0, -s, 0, ASCENT)))


def build():
    with open(os.path.join(ICON_DIR, 'icons.json'), encoding='utf-8') as f:
        manifest = json.load(f)
    with open(SELECTION_PATH, encoding='utf-8') as f:
        selection = json.load(f)

    font = TTFont(FONT_PATHS[0])
    glyf = font['glyf']
    hmtx = font['hmtx']
    order = font.getGlyphOrder()
    cmaps = [t for t in font['cmap'].tables if t.isUnicode()]

    entries = {i['properties']['name']: i for i in selection['icons']}
    next_code = max(i['properties']['code'] for i in selection['icons']) + 1
    next_order = max(i['properties']['order'] for i in selection['icons']) + 1
    next_id = max(i['properties']['id'] for i in selection['icons']) + 1
    next_idx = max(i.get('iconIdx', 0) for i in selection['icons']) + 1

    for item in manifest:
        name, size = item['name'], item['size']
        d = read_svg_path(os.path.join(ICON_DIR, 'svg', f'{name}.svg'))

        entry = entries.get(name)
        if entry is None:
            entry = {
                'icon': {
                    'paths': [], 'attrs': [{}], 'isMulticolor': False, 'isMulticolor2': False,
                    'grid': 0, 'tags': [name],
                },
                'attrs': [{}],
                'properties': {'order': next_order, 'id': next_id, 'name': name, 'prevSize': 32, 'code': next_code},
                'setIdx': 0, 'setId': 2, 'iconIdx': next_idx,
            }
            selection['icons'].append(entry)
            entries[name] = entry
            next_code += 1
            next_order += 1
            next_id += 1
            next_idx += 1
        code = entry['properties']['code']

        # selection.json 的 paths 使用 y 向下的 1024 网格
        svg_pen = SVGPathPen(None)
        s = EM / size
        parse_path(d, TransformPen(svg_pen, (s, 0, 0, s, 0, 0)))
        entry['icon']['paths'] = [svg_pen.getCommands()]

        glyph_name = f'uni{code:04X}'
        tt_pen = TTGlyphPen(None)
        draw_icon(Cu2QuPen(tt_pen, max_err=1, reverse_direction=True), d, size)
        glyph = tt_pen.glyph()
        glyph.recalcBounds(glyf)
        if glyph_name not in order:
            order.append(glyph_name)
        glyf[glyph_name] = glyph
        hmtx[glyph_name] = (EM, getattr(glyph, 'xMin', 0))
        for table in cmaps:
            table.cmap[code] = glyph_name

    font.setGlyphOrder(order)
    glyf.glyphOrder = order
    for path in FONT_PATHS:
        font.save(path)
    with open(SELECTION_PATH, 'w', encoding='utf-8') as f:
        json.dump(selection, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(manifest)} icons, {len(selection["icons"])} total')


if __name__ == '__main__':
    build()
