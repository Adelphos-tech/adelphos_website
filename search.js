/* Site Search — auto-injected on any page that includes this script */
(function () {
  'use strict';

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    .site-search__toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
      margin-left: 0.5rem;
    }
    .site-search__toggle:hover { opacity: 1; }

    .site-search__overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(10, 10, 10, 0.6);
      backdrop-filter: blur(8px);
      z-index: 9999;
      align-items: flex-start;
      justify-content: center;
      padding: 8vh 1rem 2rem;
    }
    .site-search__overlay.active { display: flex; }

    .site-search__modal {
      width: 100%;
      max-width: 640px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
      animation: ssIn 0.2s ease;
    }
    @keyframes ssIn {
      from { opacity: 0; transform: translateY(-10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .site-search__input-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .site-search__input-wrap svg {
      flex-shrink: 0;
      color: #94a3b8;
    }
    .site-search__input {
      flex: 1;
      border: none;
      outline: none;
      font-family: inherit;
      font-size: 1rem;
      color: #1e293b;
      background: transparent;
    }
    .site-search__input::placeholder { color: #94a3b8; }
    .site-search__close {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.25rem;
      line-height: 1;
    }
    .site-search__close:hover { color: #1e293b; }

    .site-search__results {
      max-height: 60vh;
      overflow-y: auto;
      padding: 0.5rem;
    }
    .site-search__result {
      display: block;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      text-decoration: none;
      color: inherit;
      transition: background 0.15s;
    }
    .site-search__result:hover {
      background: #f1f5f9;
    }
    .site-search__result-title {
      font-weight: 600;
      font-size: 0.92rem;
      color: #0f766e;
      margin-bottom: 0.25rem;
    }
    .site-search__result-desc {
      font-size: 0.82rem;
      color: #64748b;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .site-search__result-meta {
      font-size: 0.72rem;
      color: #94a3b8;
      margin-top: 0.35rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .site-search__empty,
    .site-search__loading {
      padding: 2rem;
      text-align: center;
      color: #94a3b8;
      font-size: 0.9rem;
    }

    /* Dark nav adaptation */
    .nav-bar .site-search__toggle { color: #fff; }
    .nav-bar--solid .site-search__toggle { color: #1e293b; }
  `;
  document.head.appendChild(style);

  // Build overlay HTML
  const overlay = document.createElement('div');
  overlay.className = 'site-search__overlay';
  overlay.id = 'site-search-overlay';
  overlay.innerHTML = `
    <div class="site-search__modal">
      <div class="site-search__input-wrap">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" class="site-search__input" id="site-search-input" placeholder="Search articles, pages, topics..." autocomplete="off" />
        <button class="site-search__close" id="site-search-close" aria-label="Close search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="site-search__results" id="site-search-results"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Inject toggle button into nav
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    const toggle = document.createElement('button');
    toggle.className = 'site-search__toggle';
    toggle.setAttribute('aria-label', 'Open search');
    toggle.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
    navLinks.appendChild(toggle);
    toggle.addEventListener('click', openSearch);
  }

  const input = document.getElementById('site-search-input');
  const results = document.getElementById('site-search-results');
  const closeBtn = document.getElementById('site-search-close');

  function openSearch() {
    overlay.classList.add('active');
    input.value = '';
    results.innerHTML = '';
    input.focus();
  }
  function closeSearch() {
    overlay.classList.remove('active');
  }

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeSearch();
  });
  closeBtn.addEventListener('click', closeSearch);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (!q) {
      results.innerHTML = '';
      return;
    }
    results.innerHTML = '<div class="site-search__loading">Searching...</div>';
    debounceTimer = setTimeout(() => runSearch(q), 200);
  });

  async function runSearch(q) {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      renderResults(data.results || []);
    } catch {
      results.innerHTML = '<div class="site-search__empty">Search unavailable.</div>';
    }
  }

  function renderResults(items) {
    if (!items.length) {
      results.innerHTML = '<div class="site-search__empty">No results found.</div>';
      return;
    }
    results.innerHTML = items.map(item => {
      const typeLabel = item.type === 'blog' ? 'Blog' : 'Page';
      return `
        <a href="${escapeHtml(item.url)}" class="site-search__result">
          <div class="site-search__result-title">${escapeHtml(item.title)}</div>
          <div class="site-search__result-desc">${escapeHtml(item.description || item.bodyText || '')}</div>
          <div class="site-search__result-meta">${typeLabel} — ${escapeHtml(item.url)}</div>
        </a>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
