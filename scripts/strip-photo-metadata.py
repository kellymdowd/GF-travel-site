#!/usr/bin/env python3
"""Strip EXIF/GPS/timestamps from site photos (privacy: no location or capture time in published files).

Usage:
  python3 scripts/strip-photo-metadata.py              # every tracked + staged photo under photos/
  python3 scripts/strip-photo-metadata.py FILE [FILE]  # specific files
  add --dry-run to only report

Lossless (jpegtran -copy none) unless a photo depends on an EXIF Orientation flag;
those are rotated upright first (Pillow, quality 90) so they don't display sideways.
Requires jpegtran (brew install jpeg-turbo) and Pillow (.venv).
"""
import os, subprocess, sys
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
DRY = '--dry-run' in sys.argv
args = [a for a in sys.argv[1:] if a != '--dry-run']
JPEGTRAN = '/opt/homebrew/bin/jpegtran'

def git_paths(*cmd):
    out = subprocess.run(['git', *cmd, '-z'], capture_output=True).stdout.decode('utf-8')
    return [p for p in out.split('\0') if p]

files = args or sorted(set(git_paths('ls-files', 'photos') + git_paths('diff', '--cached', '--name-only', '--diff-filter=A', '--', 'photos')))
files = [f for f in files if f.lower().endswith(('.jpg', '.jpeg')) and os.path.exists(f)]

stats = {'had_meta': 0, 'lossless': 0, 'rotated': 0, 'clean': 0}
for f in files:
    im = Image.open(f)
    exif = im.getexif()
    has = len(exif) > 0 or 'exif' in im.info
    if not has:
        stats['clean'] += 1; continue
    stats['had_meta'] += 1
    orient = exif.get(0x0112, 1)
    if DRY: continue
    tmp = f + '.tmp'
    if orient not in (1, None):
        up = ImageOps.exif_transpose(im)
        up.save(tmp, 'JPEG', quality=90, optimize=True)  # Pillow writes no EXIF unless passed
        stats['rotated'] += 1
    else:
        r = subprocess.run([JPEGTRAN, '-copy', 'none', '-optimize', '-outfile', tmp, f], capture_output=True)
        if r.returncode: print('jpegtran failed:', f, r.stderr.decode()); continue
        stats['lossless'] += 1
    os.replace(tmp, f)

print(f"{len(files)} photos checked: {stats['had_meta']} had metadata "
      f"({stats['lossless']} stripped losslessly, {stats['rotated']} rotated upright + stripped), {stats['clean']} already clean"
      + (' [dry run]' if DRY else ''))
