from pathlib import Path
import re
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[1]
class AssetParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.refs=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag in ("script","img") and a.get("src"):
            self.refs.append(a["src"])
        if tag=="link" and a.get("href"):
            self.refs.append(a["href"])
for html in (ROOT/'index.html',ROOT/'clean-plan/index.html'):
    parser=AssetParser();parser.feed(html.read_text(encoding='utf-8'))
    for ref in parser.refs:
        if ref.startswith(('http:','https:','#','data:')): continue
        target=(html.parent/ref).resolve()
        assert target.is_relative_to(ROOT.resolve()) and target.exists(), (html,ref)
for item in ['assets/willow-hero.webp','assets/willow-custom-clean.webp','clean-plan/core.mjs','_headers','robots.txt']:
    assert (ROOT/item).is_file(), item
assert 'noindex' in (ROOT/'_headers').read_text()
assert 'Disallow: /' in (ROOT/'robots.txt').read_text()
print('Willowlab static references and preview guards OK')
