#!/usr/bin/env python3
"""Append final UX fix CSS rules to style.css safely via Python."""
import os

ROOT = os.path.dirname(__file__)
CSS_PATH = os.path.join(ROOT, 'style.css')

EXTRA = """
/* UX fixes v19.1 */
:root{--muted:rgba(255,255,255,.55);--card-bg:rgba(255,255,255,.04);--border:rgba(255,255,255,.1);--fg:#ffffff;--accent-l:#4ade80;--accent-d:#16a34a}
.skip-link{position:absolute;top:-100px;left:1rem;z-index:99999;padding:.6rem 1.2rem;background:#4ade80;color:#000;font-weight:700;font-size:.85rem;border-radius:6px;text-decoration:none;transition:top .2s}
.skip-link:focus{top:1rem}
.section-sep{width:100%;max-width:1100px;margin:0 auto;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08) 30%,rgba(255,255,255,.08) 70%,transparent)}
.blog-card__readtime{font-size:.7rem;color:rgba(255,255,255,.3);font-style:italic}
.blog-card:hover .blog-card__title{color:#4ade80;transition:color .2s}
.blog-teaser-card:hover .blog-teaser-card__title{color:#4ade80;transition:color .2s}
"""

with open(CSS_PATH, 'a', encoding='utf-8') as f:
    f.write(EXTRA)

print(f'Done. CSS is now {os.path.getsize(CSS_PATH)} bytes.')
