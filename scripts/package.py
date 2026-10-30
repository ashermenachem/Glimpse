#!/usr/bin/env python3
"""Build the public download without development files or student data."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import argparse

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("output", nargs="?", type=Path)
parser.add_argument("--browser", choices=["chrome", "safari"], default="chrome")
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
output = args.output or root.parent / ('Glimpse-Safari.zip' if args.browser == 'safari' else 'Glimpse.zip')
safari = args.browser == 'safari'
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in sorted((root / 'extension').rglob('*')):
        if path.is_file() and not path.name.startswith('.'):
            archive.write(path, path.relative_to(root / 'extension') if safari else Path('Glimpse') / path.relative_to(root))
    for name in ['LICENSE', 'PRIVACY.md']:
        archive.write(root / name, name if safari else 'Glimpse/' + name)
    if safari:
        archive.write(root / 'docs/SAFARI.md', 'START HERE.md')
    else:
        archive.writestr('Glimpse/START HERE.txt', '''GLIMPSE — Created by Asher Menachem

1. Keep this Glimpse folder in Downloads.
2. Open Google Chrome and type chrome://extensions in the address bar.
3. Turn on Developer mode (top right).
4. Click Load unpacked. Choose the extension folder inside this Glimpse folder.
5. Open MyMilken. Choose your grade in Glimpse. Visit Progress once to load grades.

Already installed? Replace the old extension files, then click Reload on the
Glimpse card at chrome://extensions and refresh MyMilken.

Drag the header to move. Open Customize for Light, Dark, System or Glass.
About the creator contains all of Asher's socials.
Reference comparisons are historical, not a Milken rank. Tap for sources.

Free and open source: https://github.com/ashermenachem/Glimpse
''')
print(output)
