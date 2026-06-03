#!/usr/bin/env python3
"""Update nav on all blog posts and blog.html to include About/Contact links and bump CSS to v=19."""
import os, re, glob

ROOT = os.path.dirname(__file__)

FILES = glob.glob(os.path.join(ROOT, 'blog', '*.html')) + [
    os.path.join(ROOT, 'blog.html'),
    os.path.join(ROOT, 'simulator.html') if os.path.exists(os.path.join(ROOT, 'simulator.html')) else None,
]
FILES = [f for f in FILES if f]

OLD_NAV = '<a href="/blog">Blog</a>'
NEW_NAV = '<a href="/blog">Blog</a>\n      <a href="/about">About</a>\n      <a href="/contact">Contact</a>'

for path in FILES:
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()
    changed = False

    # Add About/Contact links after Blog link in nav if not already present
    if '/about' not in html and OLD_NAV in html:
        html = html.replace(OLD_NAV, NEW_NAV, 1)
        changed = True

    # Bump CSS v=18 to v=19
    if 'style.css?v=18' in html:
        html = html.replace('style.css?v=18', 'style.css?v=19')
        changed = True

    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f'[updated] {os.path.basename(path)}')
    else:
        print(f'[skip]    {os.path.basename(path)}')

print('Done.')
