#!/usr/bin/env python3
"""
Fix all UX issues across every page:
1. Standardise nav (same items, same order) on all pages
2. Fix blog.html og:image
3. Add aria-current="page" on blog.html nav Blog link
4. Add read time to all blog cards
5. Add nav-bar--solid to all blog post pages missing it
6. Add lazy loading to blog post hero images
7. Add standardised footer to all blog post pages
8. Add skip-to-content link on all pages
9. Add section separator between value-prop and case-studies on homepage
"""
import os, re, glob

ROOT = os.path.dirname(__file__)

# ── Canonical nav HTML (used on blog posts + blog.html + about + contact) ──
# For pages outside the homepage — solid nav, consistent order
CANONICAL_NAV_LINKS = '''\
    <div class="nav-links">
      <a href="/">Home</a>
      <a href="/#services">Capabilities</a>
      <a href="/blog">Blog</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </div>'''

# ── Standard footer HTML ──
STANDARD_FOOTER = '''\
  <footer class="site-footer">
    <div class="site-footer__inner">
      <a href="/" class="nav-logo"><img src="/logo.png" alt="Adelphos" class="nav-logo__img" width="131" height="52" /></a>
      <div class="site-footer__contact">
        <a href="mailto:info@adelphostech.com" class="site-footer__link">info@adelphostech.com</a>
        <span class="site-footer__dot">&middot;</span>
        <a href="tel:+918866999550" class="site-footer__link">+91 88669 99550</a>
        <span class="site-footer__dot">&middot;</span>
        <a href="https://www.linkedin.com/company/adelphos-technology/" target="_blank" rel="noopener" class="site-footer__link site-footer__link--icon" aria-label="LinkedIn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        </a>
      </div>
      <div class="site-footer__nav" style="display:flex;gap:1.25rem;flex-wrap:wrap;">
        <a href="/about" class="site-footer__link">About</a>
        <a href="/contact" class="site-footer__link">Contact</a>
        <a href="/blog" class="site-footer__link">Blog</a>
      </div>
      <p class="site-footer__copy">&copy; 2026 Adelphos. All rights reserved.</p>
    </div>
  </footer>'''

# ── Skip link HTML (inserted right after <body ...>) ──
SKIP_LINK = '  <a class="skip-link" href="#main-content">Skip to main content</a>\n'

# ── Read times per post ──
READ_TIMES = {
    'ai-cost-roi-crisis':              '9 min read',
    'small-language-models-enterprise':'7 min read',
    'prompt-injection-llm-security':   '8 min read',
    'ai-agents-demo-to-production':    '8 min read',
    'rag-that-actually-works':         '7 min read',
    'on-prem-llm-vs-openai-cost':      '10 min read',
    'sovereign-ai-vs-cloud':           '7 min read',
    'voice-agents-future':             '6 min read',
    'workflow-automation-roi':         '7 min read',
}

def fix_nav(html, current_page=None):
    """Replace nav-links div with canonical version."""
    # Match any existing nav-links block
    old = re.search(r'<div class="nav-links">.*?</div>', html, re.DOTALL)
    if not old:
        return html
    new_links = CANONICAL_NAV_LINKS
    # Mark current page
    if current_page:
        new_links = new_links.replace(
            f'href="{current_page}"',
            f'href="{current_page}" aria-current="page"'
        )
    html = html[:old.start()] + new_links + html[old.end():]
    return html

def ensure_solid_nav(html):
    """Make sure nav has nav-bar--solid class."""
    html = re.sub(
        r'<nav([^>]*?)class="nav-bar(?! nav-bar--solid)([^"]*?)"',
        lambda m: f'<nav{m.group(1)}class="nav-bar nav-bar--solid{m.group(2)}"',
        html
    )
    return html

def add_skip_link(html):
    """Add skip-to-content link right after opening <body> tag."""
    if 'skip-link' in html:
        return html
    html = re.sub(r'(<body[^>]*>)', r'\1\n' + SKIP_LINK, html)
    return html

def standardise_footer(html):
    """Replace or add standard footer on blog post pages."""
    # Replace existing footer if present
    existing = re.search(r'<footer class="site-footer"[^>]*>.*?</footer>', html, re.DOTALL)
    if existing:
        html = html[:existing.start()] + STANDARD_FOOTER + html[existing.end():]
    else:
        # Add before </body>
        html = html.replace('</body>', STANDARD_FOOTER + '\n</body>')
    return html

# ════════════════════════════════
# 1. FIX BLOG POST FILES
# ════════════════════════════════
blog_posts = glob.glob(os.path.join(ROOT, 'blog', '*.html'))
for path in blog_posts:
    slug = os.path.basename(path).replace('.html', '')
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()
    original = html

    # Fix nav links to canonical order
    html = fix_nav(html, current_page='/blog')  # blog posts: Blog is "parent"
    # Remove aria-current from /blog on post pages (it's the parent, not current)
    html = html.replace('<a href="/blog" aria-current="page">Blog</a>', '<a href="/blog">Blog</a>')

    # Ensure solid nav
    html = ensure_solid_nav(html)

    # Add skip link
    html = add_skip_link(html)

    # Add id="main-content" to <main> if missing
    html = re.sub(r'<main(?! [^>]*id="main-content")([^>]*)>', r'<main id="main-content"\1>', html, count=1)

    # Add lazy loading to hero img (first img after <header)
    html = re.sub(
        r'(<header[^>]*>.*?<img)(?![^>]*loading=)',
        lambda m: m.group(0) + ' loading="lazy"',
        html, count=1, flags=re.DOTALL
    )

    # Standardise footer
    html = standardise_footer(html)

    if html != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f'[blog post] fixed: {slug}')
    else:
        print(f'[blog post] no change: {slug}')

# ════════════════════════════════
# 2. FIX blog.html
# ════════════════════════════════
blog_index = os.path.join(ROOT, 'blog.html')
with open(blog_index, 'r', encoding='utf-8') as f:
    html = f.read()
original = html

# Fix og:image
html = html.replace(
    '<meta property="og:image" content="https://adelphostech.com/favicon-512x512.png" />',
    '<meta property="og:image" content="https://adelphostech.com/logo.png" />'
)
html = html.replace(
    '<meta property="twitter:image" content="https://adelphostech.com/favicon-512x512.png" />',
    '<meta property="twitter:image" content="https://adelphostech.com/logo.png" />'
)

# Fix nav — canonical, mark Blog as current
html = fix_nav(html, current_page='/blog')

# Add skip link
html = add_skip_link(html)

# Add id="main-content" to <main>
html = re.sub(r'<main(?! [^>]*id=)([^>]*)>', r'<main id="main-content"\1>', html, count=1)

# Add read times to blog cards
for slug, rt in READ_TIMES.items():
    # Find the card link for this slug and add read time next to date if not present
    pattern = rf'(href="/blog/{slug}"[^>]*>Read article[^<]*</a>\s*</div>)'
    if rt not in html:
        html = re.sub(
            rf'(<span>(?:January|February|March|April|May|June|July|August|September|October|November|December)[^<]+</span>)(\s*<a href="/blog/{slug}")',
            rf'\1\n            <span class="blog-card__readtime">{rt}</span>\2',
            html
        )

# Standardise footer
html = standardise_footer(html)

if html != original:
    with open(blog_index, 'w', encoding='utf-8') as f:
        f.write(html)
    print('[blog.html] fixed')

# ════════════════════════════════
# 3. FIX about.html
# ════════════════════════════════
about_path = os.path.join(ROOT, 'about.html')
with open(about_path, 'r', encoding='utf-8') as f:
    html = f.read()
original = html

html = fix_nav(html, current_page='/about')
html = add_skip_link(html)
html = re.sub(r'<main(?! [^>]*id=)([^>]*)>', r'<main id="main-content"\1>', html, count=1)
html = standardise_footer(html)

# Fix --muted, --card-bg, --border vars — add them to the inline style block
if '--muted:' not in html:
    html = html.replace(
        '<style>',
        '<style>\n    :root { --muted: rgba(255,255,255,.55); --card-bg: rgba(255,255,255,.04); --border: rgba(255,255,255,.1); --fg: #ffffff; --accent-l: #4ade80; --accent-d: #16a34a; }'
    )

if html != original:
    with open(about_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print('[about.html] fixed')

# ════════════════════════════════
# 4. FIX contact.html
# ════════════════════════════════
contact_path = os.path.join(ROOT, 'contact.html')
with open(contact_path, 'r', encoding='utf-8') as f:
    html = f.read()
original = html

html = fix_nav(html, current_page='/contact')
html = add_skip_link(html)
html = re.sub(r'<main(?! [^>]*id=)([^>]*)>', r'<main id="main-content"\1>', html, count=1)
html = standardise_footer(html)

# Fix --muted etc in inline style
if '--muted:' not in html:
    html = html.replace(
        '<style>',
        '<style>\n    :root { --muted: rgba(255,255,255,.55); --card-bg: rgba(255,255,255,.04); --border: rgba(255,255,255,.1); --fg: #ffffff; --accent-l: #4ade80; --accent-d: #16a34a; }'
    )

if html != original:
    with open(contact_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print('[contact.html] fixed')

print('\nAll done.')
