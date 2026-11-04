#!/usr/bin/env python3
"""Validate local links, structured data, and SEO metadata using only stdlib."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
import sys

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.counts = {'h1': 0, 'title': 0}
        self.descriptions = []
        self.canonicals = []
        self.links = []
        self.ids = set()
        self.blocks = []
        self.block = None
        self.in_title = False
        self.title = ''

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title':
            self.in_title = True
        if tag in self.counts:
            self.counts[tag] += 1
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        for attr in ('href', 'src'):
            if attr in attrs:
                self.links.append(attrs[attr])
        if tag == 'meta' and attrs.get('name') == 'description':
            self.descriptions.append(attrs.get('content', ''))
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs.get('href', ''))
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.block = ''

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.block is not None:
            self.block += data

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag == 'script' and self.block is not None:
            self.blocks.append(self.block)
            self.block = None


def main():
    errors = []
    pages = {}
    for path in sorted(ROOT.rglob('*.html')):
        if '.git' in path.parts:
            continue
        page = Page()
        page.feed(path.read_text())
        pages[path] = page
    for path, page in pages.items():
        label = path.relative_to(ROOT)
        for tag, count in page.counts.items():
            if count != 1:
                errors.append(f'{label}: expected one {tag}, found {count}')
        if len(page.title) > 60:
            errors.append(f'{label}: title exceeds 60 characters ({len(page.title)})')
        for description in page.descriptions:
            if len(description) > 155:
                errors.append(f'{label}: description exceeds 155 characters ({len(description)})')
        # The existing noindex 404 is deliberately excluded from SEO metadata rules.
        if path != ROOT / '404.html':
            if len(page.descriptions) != 1 or not page.descriptions[0].strip():
                errors.append(f'{label}: expected one nonempty description')
            expected = 'https://appelhaken.com/' + str(label.parent).strip('.')
            if label.parent != Path('.'):
                expected += '/'
            if page.canonicals != [expected]:
                errors.append(f'{label}: canonical must be {expected}')
            if not page.blocks:
                errors.append(f'{label}: missing JSON-LD')
        for block in page.blocks:
            try:
                data = json.loads(block)
                def check_keys(value):
                    if isinstance(value, dict):
                        for key, child in value.items():
                            if key.lower() in {'address', 'telephone'}:
                                errors.append(f'{label}: forbidden JSON-LD key {key}')
                            check_keys(child)
                    elif isinstance(value, list):
                        for child in value:
                            check_keys(child)
                check_keys(data)
            except ValueError as exc:
                errors.append(f'{label}: invalid JSON-LD: {exc}')
        for value in page.links:
            url = urlsplit(value)
            if url.scheme or url.netloc:
                if url.netloc != 'appelhaken.com':
                    continue
            target = (ROOT / unquote(url.path).lstrip('/')) if url.path.startswith('/') else (path.parent / unquote(url.path)) if url.path else path
            if target.is_dir():
                target /= 'index.html'
            target = target.resolve()
            if not target.is_relative_to(ROOT) or not target.is_file():
                errors.append(f'{label}: unresolved link {value}')
            elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                errors.append(f'{label}: unresolved fragment {value}')
    if errors:
        print('\n'.join(errors))
        return 1
    print(f'Validated {len(pages)} HTML files: internal links and fragments resolve, JSON-LD parses without address/telephone keys, titles are ≤60 characters, descriptions are ≤155 characters, and all content pages have one h1/title, a description, and canonical. Existing noindex 404 preserved.')
    return 0

if __name__ == '__main__':
    sys.exit(main())
