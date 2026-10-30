"""Verify the actual archives users download for both installation routes."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent


class DownloadTests(unittest.TestCase):
    def test_browser_archives(self):
        for browser, prefix, guide in [
            ('chrome', 'Glimpse/extension/', 'Glimpse/START HERE.txt'),
            ('safari', '', 'START HERE.md'),
        ]:
            with self.subTest(browser=browser), tempfile.TemporaryDirectory() as folder:
                output = Path(folder) / 'download.zip'
                subprocess.run([sys.executable, str(ROOT / 'scripts/package.py'),
                                '--browser', browser, str(output)], check=True,
                               capture_output=True)
                with ZipFile(output) as archive:
                    names = set(archive.namelist())
                    manifest = json.loads(archive.read(prefix + 'manifest.json'))
                    self.assertIn(guide, names)
                    scripts = manifest['content_scripts'][0]['js']
                    scripts += [manifest['background']['service_worker'], 'widget.css']
                    scripts += list(manifest['icons'].values())
                    for name in scripts:
                        self.assertEqual(archive.read(prefix + name),
                                         (ROOT / 'extension' / name).read_bytes())
                    allowed = {prefix + str(p.relative_to(ROOT / 'extension'))
                               for p in (ROOT / 'extension').rglob('*') if p.is_file()}
                    doc_prefix = '' if browser == 'safari' else 'Glimpse/'
                    allowed |= {guide, doc_prefix + 'LICENSE', doc_prefix + 'PRIVACY.md'}
                    self.assertEqual(names, allowed)
                    self.assertEqual(manifest['content_scripts'][0]['matches'],
                                     ['https://milkenschool.myschoolapp.com/*'])


if __name__ == '__main__':
    unittest.main()
