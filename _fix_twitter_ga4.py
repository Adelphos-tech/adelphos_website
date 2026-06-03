#!/usr/bin/env python3
"""Add twitter:card meta tags and GA4 to all blog posts that are missing them."""
import os, re

BLOG_DIR = os.path.join(os.path.dirname(__file__), 'blog')
GA4_SNIPPET = ('  <!-- Google Analytics 4 -->\n'
               '  <script async src="https://www.googletagmanager.com/gtag/js?id=G-KSMQ94C57F"></script>\n'
               '  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag(\'js\',new Date());gtag(\'config\',\'G-KSMQ94C57F\');</script>\n')

POSTS = [
    'on-prem-llm-vs-openai-cost.html',
    'rag-that-actually-works.html',
    'ai-agents-demo-to-production.html',
    'prompt-injection-llm-security.html',
    'small-language-models-enterprise.html',
    'sovereign-ai-vs-cloud.html',
    'voice-agents-future.html',
    'workflow-automation-roi.html',
    'ai-cost-roi-crisis.html',
]

def build_twitter_block(html):
    og_url   = re.search(r'<meta property="og:url"\s+content="([^"]+)"', html)
    og_title = re.search(r'<meta property="og:title"\s+content="([^"]+)"', html)
    og_desc  = re.search(r'<meta property="og:description"\s+content="([^"]+)"', html)
    og_image = re.search(r'<meta property="og:image"\s+content="([^"]+)"', html)
    if not all([og_url, og_title, og_desc, og_image]):
        return None
    return (
        f'  <meta name="twitter:card" content="summary_large_image" />\n'
        f'  <meta name="twitter:url" content="{og_url.group(1)}" />\n'
        f'  <meta name="twitter:title" content="{og_title.group(1)}" />\n'
        f'  <meta name="twitter:description" content="{og_desc.group(1)}" />\n'
        f'  <meta name="twitter:image" content="{og_image.group(1)}" />\n'
    )

for fname in POSTS:
    path = os.path.join(BLOG_DIR, fname)
    if not os.path.exists(path):
        print(f'SKIP (not found): {fname}')
        continue

    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    changed = False

    # 1. Add twitter:card block after the last og: meta tag if missing
    if 'twitter:card' not in html:
        twitter_block = build_twitter_block(html)
        if twitter_block:
            # insert after last og:image line
            og_image_line = re.search(r'  <meta property="og:image"[^\n]+\n', html)
            if og_image_line:
                insert_at = og_image_line.end()
                html = html[:insert_at] + '\n' + twitter_block + html[insert_at:]
                changed = True
                print(f'[twitter:card] added to {fname}')

    # 2. Add GA4 before </head> if missing
    if 'G-KSMQ94C57F' not in html:
        html = html.replace('</head>', GA4_SNIPPET + '</head>', 1)
        changed = True
        print(f'[GA4] added to {fname}')

    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
    else:
        print(f'[OK] {fname} — already complete')

print('Done.')
