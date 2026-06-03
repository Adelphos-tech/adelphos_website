#!/usr/bin/env python3
"""Truncate style.css back to original minified line and re-append all new CSS correctly."""
import os

ROOT = os.path.dirname(__file__)
CSS_PATH = os.path.join(ROOT, 'style.css')

with open(CSS_PATH, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep only the first line (the original minified CSS)
original = lines[0]

NEW_CSS = """
/* Case Studies */
.cs-section{padding:8rem 2rem;background:var(--dark)}
.cs-inner{max-width:1100px;margin:0 auto}
.cs-headline{font-size:clamp(1.75rem,4vw,2.75rem);font-weight:700;letter-spacing:-.025em;color:var(--white);margin-bottom:.75rem}
.cs-sub{font-size:1rem;color:var(--w50);margin-bottom:3rem}
.cs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;margin-bottom:3rem}
.cs-card{background:var(--card-bg,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:16px;padding:2rem;display:flex;flex-direction:column;gap:.75rem;transition:border-color .2s,transform .2s}
.cs-card:hover{border-color:var(--accent-l,#4ade80);transform:translateY(-3px)}
.cs-card__tag{font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent-l,#4ade80)}
.cs-card__stat{font-size:3rem;font-weight:800;background:linear-gradient(135deg,var(--accent-d,#16a34a),var(--accent-l,#4ade80));-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1}
.cs-card__stat-label{font-size:.82rem;color:var(--w50,rgba(255,255,255,.5));margin-top:-.25rem}
.cs-card__body{font-size:.9rem;line-height:1.7;color:var(--w70,rgba(255,255,255,.7));flex:1}
.cs-card__result{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem}
.cs-result-pill{font-size:.75rem;font-weight:600;padding:.3rem .75rem;border-radius:50px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.25);color:var(--accent-l,#4ade80)}
.cs-bottom{display:flex;flex-direction:column;align-items:center;gap:1.25rem;text-align:center;padding-top:1rem}
.cs-disclaimer{font-size:.8rem;color:var(--w30,rgba(255,255,255,.3));max-width:560px}

/* Blog Teaser */
.blog-teaser-section{padding:6rem 2rem;background:var(--dark)}
.blog-teaser-inner{max-width:1100px;margin:0 auto}
.blog-teaser-headline{font-size:clamp(1.75rem,4vw,2.5rem);font-weight:700;letter-spacing:-.025em;color:var(--white);margin-bottom:.75rem}
.blog-teaser-sub{font-size:1rem;color:var(--w50);margin-bottom:3rem;max-width:600px}
.blog-teaser-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.blog-teaser-card{display:flex;flex-direction:column;background:var(--card-bg,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:16px;overflow:hidden;text-decoration:none;color:inherit;transition:border-color .2s,transform .2s}
.blog-teaser-card:hover{border-color:var(--accent-l,#4ade80);transform:translateY(-3px)}
.blog-teaser-card__img-wrap{aspect-ratio:16/9;overflow:hidden}
.blog-teaser-card__img-wrap img{width:100%;height:100%;object-fit:cover;transition:transform .4s}
.blog-teaser-card:hover .blog-teaser-card__img-wrap img{transform:scale(1.04)}
.blog-teaser-card__body{padding:1.5rem;display:flex;flex-direction:column;gap:.6rem;flex:1}
.blog-teaser-card__tag{font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent-l,#4ade80)}
.blog-teaser-card__title{font-size:1rem;font-weight:700;line-height:1.45;color:var(--white)}
.blog-teaser-card__excerpt{font-size:.875rem;color:var(--w50);line-height:1.6}

/* Nav active */
.nav-links a[aria-current=page]{color:var(--accent-l,#4ade80)}

/* Responsive */
@media(max-width:1024px){
  .blog-teaser-grid{grid-template-columns:repeat(3,1fr)}
  .cs-grid{grid-template-columns:1fr 1fr}
}
@media(max-width:860px){
  .cs-section{padding:5rem 1.5rem}
  .cs-grid{grid-template-columns:1fr 1fr}
  .blog-teaser-section{padding:4rem 1.5rem}
  .blog-teaser-grid{grid-template-columns:1fr 1fr}
}
@media(max-width:560px){
  .cs-section{padding:4rem 1rem}
  .cs-grid{grid-template-columns:1fr}
  .blog-teaser-section{padding:3.5rem 1rem}
  .blog-teaser-grid{grid-template-columns:1fr}
}
"""

with open(CSS_PATH, 'w', encoding='utf-8') as f:
    f.write(original.rstrip('\n'))
    f.write(NEW_CSS)

print(f'Done. New file has {os.path.getsize(CSS_PATH)} bytes.')
