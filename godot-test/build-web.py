#!/usr/bin/env python3
"""Build a smaller Web release without modifying the original Godot project."""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import fontTools
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent
WASM_FLAGS = [
    '-Oz', '--enable-simd', '--enable-bulk-memory',
    '--enable-nontrapping-float-to-int', '--enable-sign-ext',
    '--enable-exception-handling', '--enable-reference-types',
    '--enable-multivalue', '--strip-debug', '--strip-producers',
]


def run(*command):
    result = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if result.returncode or re.search(r'^(?:SCRIPT ERROR|ERROR):', result.stdout, re.MULTILINE):
        raise RuntimeError(result.stdout[-6000:])
    return result.stdout.strip()


def hashes(folder):
    return {str(file.relative_to(folder)): hashlib.sha256(file.read_bytes()).hexdigest()
            for file in sorted(folder.rglob('*')) if file.is_file()}


def subset_font(project):
    path = project / 'assets/fonts/NotoSansCJKsc-Regular.otf'
    text = (project / 'project.godot').read_text()
    for directory, suffix in [('scripts', '*.gd'), ('scenes', '*.tscn')]:
        text += ''.join(file.read_text() for file in sorted((project / directory).glob(suffix)))
    text += ''.join(map(chr, range(32, 127)))
    font = TTFont(path, recalcTimestamp=False)
    original_size = path.stat().st_size
    required = set(map(ord, text)) & set(font.getBestCmap())
    options = subset.Options()
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.name_legacy = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    # A distinct family name identifies the modified OFL font.
    names = {1: 'Suiyue Web UI', 3: 'SuiyueWebUI-Regular-WebSubset',
             4: 'Suiyue Web UI Regular', 6: 'SuiyueWebUI-Regular',
             16: 'Suiyue Web UI', 17: 'Regular'}
    for record in font['name'].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    font['CFF '].cff.fontNames = ['SuiyueWebUI-Regular']
    font['CFF '].cff.topDictIndex[0].FamilyName = 'Suiyue Web UI'
    font['CFF '].cff.topDictIndex[0].FullName = 'Suiyue Web UI Regular'
    font.save(path)
    with TTFont(path) as saved:
        assert required <= set(saved.getBestCmap()), '字体子集缺少源工程已有的字形'
    return {'tool': f'FontTools {fontTools.version}', 'original_bytes': original_size,
            'subset_bytes': path.stat().st_size, 'unicode_characters': len(required),
            'family': 'Suiyue Web UI'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT.parent.parent / 'godot-test')
    parser.add_argument('--godot', default=shutil.which('godot') or '/Applications/Godot.app/Contents/MacOS/Godot')
    parser.add_argument('--wasm-opt', default=shutil.which('wasm-opt') or 'wasm-opt')
    args = parser.parse_args()
    source = args.source.resolve()
    if not (source / 'project.godot').is_file():
        parser.error(f'找不到 Godot 源工程：{source}')
    engine_version = run(args.godot, '--version')
    if not engine_version.startswith('4.7.2.'):
        parser.error(f'本发布流程需要 Godot 4.7.2，实际为 {engine_version}')
    optimizer_version = run(args.wasm_opt, '--version')
    with tempfile.TemporaryDirectory(prefix='suiyue-web-') as temporary:
        project = Path(temporary) / 'project'
        output = Path(temporary) / 'web'
        project.mkdir()
        output.mkdir()
        shutil.copy2(source / 'project.godot', project)
        for directory in ['assets', 'scripts', 'scenes']:
            shutil.copytree(source / directory, project / directory,
                            ignore=shutil.ignore_patterns('.DS_Store', '*.import'))
        original_hashes = hashes(project)
        for name in ['assets/art/swordsman-walk-v7.png', 'assets/art/companion-walk-v7.png',
                     'scripts/explorer_sprite.gd', 'scripts/explorer_sprite.gd.uid']:
            (project / name).unlink(missing_ok=True)
        font_info = subset_font(project)
        shutil.copy2(ROOT / 'export_presets.cfg', project)
        prepared_hashes = hashes(project)
        run(args.godot, '--headless', '--editor', '--path', str(project), '--import', '--quit')
        run(args.godot, '--headless', '--editor', '--path', str(project),
            '--export-release', 'Web', str(output / 'index.html'))
        wasm = output / 'index.wasm'
        original_wasm_size = wasm.stat().st_size
        optimized = output / 'optimized.wasm'
        run(args.wasm_opt, str(wasm), *WASM_FLAGS, '-o', str(optimized))
        if optimized.stat().st_size >= original_wasm_size:
            raise RuntimeError('WASM 优化结果未缩小；未替换当前 release')
        optimized.replace(wasm)
        page = output / 'index.html'
        html = page.read_text()
        match = re.search(r'const GODOT_CONFIG = (.*);', html)
        config = json.loads(match[1])
        config['fileSizes']['index.wasm'] = wasm.stat().st_size
        page.write_text((html[:match.start(1)] + json.dumps(config, ensure_ascii=False, separators=(',', ':')) + html[match.end(1):]).rstrip() + '\n')
        if (output / 'index.pck').stat().st_size > 25 * 1024 * 1024:
            raise RuntimeError('资源包超过 25 MiB；未替换当前 release')
        if wasm.stat().st_size >= 50 * 1024 * 1024:
            raise RuntimeError('引擎超过 50 MiB；未替换当前 release')
        shutil.copy2(source / 'assets/fonts/OFL.txt', output)
        for name in ['GODOT-LICENSE.txt', 'GODOT-COPYRIGHT.txt']:
            shutil.copy2(ROOT / 'web' / name, output)
        manifest = {
            'title': '碎岳 · 同行',
            'built_on': datetime.now(ZoneInfo('Asia/Shanghai')).date().isoformat(),
            'engine': engine_version, 'source_project': source.name,
            'preset': 'Web', 'build': 'release',
            'optimizations': {'font': font_info,
                              'excluded': ['v7 walking atlases and unused explorer script', 'resource metadata'],
                              'wasm': {'tool': optimizer_version, 'flags': WASM_FLAGS,
                                       'original_bytes': original_wasm_size, 'optimized_bytes': wasm.stat().st_size}},
            'source_files_sha256': original_hashes,
            'files_sha256': prepared_hashes,
            'artifacts_sha256': {f'web/{name}': digest for name, digest in hashes(output).items()},
        }
        for file in output.iterdir():
            shutil.copy2(file, ROOT / 'web' / file.name)
        for file in (source / 'assets/art').glob('generation*.json'):
            shutil.copy2(file, ROOT / 'provenance' / file.name)
        (ROOT / 'release.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        print(f'PCK: {(output / "index.pck").stat().st_size:,} bytes; WASM: {wasm.stat().st_size:,} bytes')
        print(f'Font: {font_info["original_bytes"]:,} → {font_info["subset_bytes"]:,} bytes; glyph coverage verified')


if __name__ == '__main__':
    main()
