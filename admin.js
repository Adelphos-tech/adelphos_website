(function () {
  'use strict';

  let currentDays = 7;
  let allLeads = [];
  let leadsSort = { col: 'receivedAt', asc: false };

  // Data caches for dashboard quick views
  let scDataCache = null;
  let ga4DataCache = null;

  // ── DOM refs ─────────────────────────────────────────────────────────────
  const dateTabs = document.querySelectorAll('.date-btn');
  const btnRefresh = document.getElementById('btn-refresh');
  const leadsSearch = document.getElementById('leads-search');
  const pageTitle = document.getElementById('page-title');
  const sidebarLinks = document.querySelectorAll('.sidebar__link');
  const sections = document.querySelectorAll('.section-panel');

  // ── Navigation ───────────────────────────────────────────────────────────
  const sectionTitles = {
    dashboard: 'Dashboard Overview',
    leads: 'Leads',
    'search-console': 'Search Console',
    analytics: 'Google Analytics',
    funnel: 'Conversion Funnel',
    'ai-analyst': 'AI Business Analyst',
  };

  sidebarLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const section = link.dataset.section;
      if (!section) return;

      sidebarLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      sections.forEach(s => s.classList.remove('active'));
      document.getElementById(section).classList.add('active');

      pageTitle.textContent = sectionTitles[section] || 'Dashboard';
    });
  });

  // ── Date tabs ────────────────────────────────────────────────────────────
  dateTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      dateTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentDays = parseInt(tab.dataset.days, 10);
      loadAll();
    });
  });

  // ── Refresh ──────────────────────────────────────────────────────────────
  btnRefresh.addEventListener('click', loadAll);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  }
  function fmtNum(n) {
    if (n == null || n === '') return '—';
    const num = parseInt(n, 10);
    if (isNaN(num)) return n;
    return num.toLocaleString('en-IN');
  }
  function fmtDuration(sec) {
    if (sec == null || sec === '') return '—';
    const s = parseFloat(sec);
    if (isNaN(s)) return sec;
    const m = Math.floor(s / 60);
    const r = Math.round(s % 60);
    return m > 0 ? `${m}m ${r}s` : `${r}s`;
  }
  function fmtPercent(val) {
    if (val == null || val === '') return '—';
    const v = parseFloat(val);
    if (isNaN(v)) return val;
    return (v * 100).toFixed(1) + '%';
  }
  function fmtShortDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  // ── Load everything ──────────────────────────────────────────────────────
  async function loadAll() {
    btnRefresh.disabled = true;
    btnRefresh.textContent = '...';
    await Promise.all([loadLeads(), loadSearchConsole(), loadAnalytics(), loadFunnel()]);
    btnRefresh.disabled = false;
    btnRefresh.textContent = '↻';
  }

  // ── Leads ────────────────────────────────────────────────────────────────
  async function loadLeads() {
    try {
      const res = await fetch('/admin/api/leads');
      if (!res.ok) throw new Error('Unauthorized');
      allLeads = await res.json();
      filterAndRenderLeads();
      updateLeadCount();
      renderDashboardLeads();
    } catch (err) {
      document.getElementById('leads-body').innerHTML = `<tr><td colspan="6" class="loading-cell">${err.message}</td></tr>`;
      document.getElementById('dashboard-leads-body').innerHTML = `<tr><td colspan="5" class="loading-cell">${err.message}</td></tr>`;
    }
  }

  function updateLeadCount() {
    const cutoff = Date.now() - currentDays * 24 * 60 * 60 * 1000;
    const count = allLeads.filter(l => new Date(l.receivedAt).getTime() > cutoff).length;
    document.getElementById('card-leads').textContent = fmtNum(count);
  }

  function renderDashboardLeads() {
    const tbody = document.getElementById('dashboard-leads-body');
    const recent = allLeads.slice(0, 5);
    if (!recent.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No leads yet.</td></tr>';
      return;
    }
    tbody.innerHTML = recent.map(l => `
      <tr>
        <td>${fmtDate(l.receivedAt)}</td>
        <td><strong>${escapeHtml(l.name || '—')}</strong></td>
        <td>${escapeHtml(l.company || '—')}</td>
        <td><a href="mailto:${escapeHtml(l.email || '')}">${escapeHtml(l.email || '—')}</a></td>
        <td>${escapeHtml(l.aiUse || l.challenge || '—')}</td>
      </tr>
    `).join('');
  }

  function filterAndRenderLeads() {
    const q = (leadsSearch.value || '').toLowerCase();
    let rows = allLeads.filter(l => {
      if (!q) return true;
      const hay = [l.name, l.company, l.email, l.aiUse, l.phone].join(' ').toLowerCase();
      return hay.includes(q);
    });

    rows.sort((a, b) => {
      let av = a[leadsSort.col] || '';
      let bv = b[leadsSort.col] || '';
      if (leadsSort.col === 'receivedAt') {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      if (av < bv) return leadsSort.asc ? -1 : 1;
      if (av > bv) return leadsSort.asc ? 1 : -1;
      return 0;
    });

    const tbody = document.getElementById('leads-body');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No leads found.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(l => `
      <tr>
        <td>${fmtDate(l.receivedAt)}</td>
        <td><strong>${escapeHtml(l.name || '—')}</strong></td>
        <td>${escapeHtml(l.company || '—')}</td>
        <td><a href="mailto:${escapeHtml(l.email || '')}">${escapeHtml(l.email || '—')}</a></td>
        <td>${escapeHtml(l.aiUse || l.challenge || '—')}</td>
        <td>${escapeHtml(l.phone || '—')}</td>
      </tr>
    `).join('');
  }

  // Sorting
  document.querySelectorAll('#leads-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (leadsSort.col === col) leadsSort.asc = !leadsSort.asc;
      else { leadsSort.col = col; leadsSort.asc = true; }
      filterAndRenderLeads();
    });
  });

  // Search
  leadsSearch.addEventListener('input', filterAndRenderLeads);

  // ── Search Console ───────────────────────────────────────────────────────
  async function loadSearchConsole() {
    const notice = document.getElementById('sc-notice');
    const qBody = document.getElementById('sc-queries-body');
    const pBody = document.getElementById('sc-pages-body');
    qBody.innerHTML = '<tr><td colspan="5" class="loading-cell">Loading Search Console data...</td></tr>';
    pBody.innerHTML = '<tr><td colspan="5" class="loading-cell">Loading...</td></tr>';

    try {
      const res = await fetch(`/admin/api/search-console?days=${currentDays}`);
      if (res.status === 503) {
        const j = await res.json();
        if (j.authUrl) {
          notice.innerHTML = escapeHtml(j.error) + '<br><a href="' + escapeHtml(j.authUrl) + '" target="_blank" style="display:inline-block;margin-top:.75rem;padding:.5rem 1rem;background:var(--accent);color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:.85rem;">Connect Google Search Console</a>';
        } else {
          notice.textContent = j.error || 'Google credentials not configured.';
        }
        notice.classList.remove('hidden');
        qBody.innerHTML = '<tr><td colspan="5" class="loading-cell">Not configured.</td></tr>';
        pBody.innerHTML = '<tr><td colspan="5" class="loading-cell">Not configured.</td></tr>';
        clearScCards();
        scDataCache = null;
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      scDataCache = data;
      notice.classList.add('hidden');

      // Update cards
      document.getElementById('card-impressions').textContent = fmtNum(data.summary?.impressions);
      document.getElementById('card-clicks').textContent = fmtNum(data.summary?.clicks);
      document.getElementById('card-position').textContent = data.summary?.position ? parseFloat(data.summary.position).toFixed(1) : '—';

      // Dashboard queries (top 5)
      renderDashboardSc(data.queries || []);

      // SC section — Queries table
      if (!data.queries?.length) {
        qBody.innerHTML = '<tr><td colspan="5" class="loading-cell">No data for this period.</td></tr>';
      } else {
        qBody.innerHTML = data.queries.map(q => `
          <tr>
            <td>${escapeHtml(q.query)}</td>
            <td>${fmtNum(q.clicks)}</td>
            <td>${fmtNum(q.impressions)}</td>
            <td>${q.ctr}%</td>
            <td>${q.position}</td>
          </tr>
        `).join('');
      }

      // SC section — Pages table
      if (!data.pages?.length) {
        pBody.innerHTML = '<tr><td colspan="5" class="loading-cell">No data for this period.</td></tr>';
      } else {
        pBody.innerHTML = data.pages.map(p => `
          <tr>
            <td><a href="${escapeHtml(p.page)}" target="_blank">${escapeHtml(p.page)}</a></td>
            <td>${fmtNum(p.clicks)}</td>
            <td>${fmtNum(p.impressions)}</td>
            <td>${p.ctr}%</td>
            <td>${p.position}</td>
          </tr>
        `).join('');
      }

      // Charts
      renderScChart('sc-chart', data.queries || [], 5);
      renderScChart('sc-chart-detail', data.queries || [], 10);
    } catch (err) {
      notice.textContent = 'Error loading Search Console: ' + err.message;
      notice.classList.remove('hidden');
      qBody.innerHTML = '<tr><td colspan="5" class="loading-cell">Failed to load.</td></tr>';
      pBody.innerHTML = '<tr><td colspan="5" class="loading-cell">Failed to load.</td></tr>';
      clearScCards();
      scDataCache = null;
    }
  }

  function renderDashboardSc(queries) {
    // Nothing special needed — summary cards already show the totals
  }

  function clearScCards() {
    document.getElementById('card-impressions').textContent = '—';
    document.getElementById('card-clicks').textContent = '—';
    document.getElementById('card-position').textContent = '—';
  }

  const scChartInstances = {};
  function renderScChart(canvasId, queries, limit) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    if (scChartInstances[canvasId]) scChartInstances[canvasId].destroy();

    const top = queries.slice(0, limit);
    if (!top.length) return;

    scChartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map(q => q.query.length > 20 ? q.query.slice(0, 20) + '…' : q.query),
        datasets: [
          { label: 'Impressions', data: top.map(q => q.impressions), backgroundColor: 'rgba(37,99,235,.15)', borderColor: 'rgba(37,99,235,.5)', borderWidth: 1, borderRadius: 4 },
          { label: 'Clicks', data: top.map(q => q.clicks), backgroundColor: 'rgba(37,99,235,.5)', borderColor: 'rgba(37,99,235,1)', borderWidth: 1, borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#64748b' } } },
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(0,0,0,.05)' } },
          y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(0,0,0,.05)' }, beginAtZero: true },
        },
      },
    });
  }

  // ── GA4 ──────────────────────────────────────────────────────────────────
  async function loadAnalytics() {
    const notice = document.getElementById('ga4-notice');
    const pBody   = document.getElementById('ga4-pages-body');
    const eBody   = document.getElementById('ga4-events-body');
    const sBody   = document.getElementById('ga4-sources-body');
    const dBody   = document.getElementById('ga4-devices-body');
    const cBody   = document.getElementById('ga4-countries-body');
    const uBody   = document.getElementById('ga4-usertypes-body');
    const dashPagesBody = document.getElementById('dashboard-pages-body');

    const loading = '<tr><td colspan="2" class="loading-cell">Loading...</td></tr>';
    const loading3 = '<tr><td colspan="3" class="loading-cell">Loading GA4 data...</td></tr>';
    const loading2 = '<tr><td colspan="2" class="loading-cell">Loading GA4 data...</td></tr>';

    pBody.innerHTML = loading3;
    eBody.innerHTML = loading2;
    sBody.innerHTML = loading;
    dBody.innerHTML = loading;
    cBody.innerHTML = loading;
    uBody.innerHTML = loading;
    dashPagesBody.innerHTML = '<tr><td colspan="3" class="loading-cell">Loading...</td></tr>';

    try {
      const res = await fetch(`/admin/api/analytics?days=${currentDays}`);
      if (res.status === 503) {
        const j = await res.json();
        notice.textContent = j.error || 'Google credentials not configured.';
        notice.classList.remove('hidden');
        const nc = '<tr><td colspan="2" class="loading-cell">Not configured.</td></tr>';
        pBody.innerHTML = '<tr><td colspan="3" class="loading-cell">Not configured.</td></tr>';
        eBody.innerHTML = nc; sBody.innerHTML = nc; dBody.innerHTML = nc;
        cBody.innerHTML = nc; uBody.innerHTML = nc;
        dashPagesBody.innerHTML = '<tr><td colspan="3" class="loading-cell">Not configured.</td></tr>';
        clearGa4Cards();
        ga4DataCache = null;
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      ga4DataCache = data;
      notice.classList.add('hidden');

      // ── Cards ──
      document.getElementById('card-sessions').textContent   = fmtNum(data.overview?.sessions);
      document.getElementById('card-users').textContent      = fmtNum(data.overview?.activeUsers);
      document.getElementById('card-views').textContent      = fmtNum(data.overview?.screenPageViews);
      document.getElementById('card-duration').textContent     = fmtDuration(data.overview?.averageSessionDuration);
      document.getElementById('card-bounce').textContent     = fmtPercent(data.overview?.bounceRate);

      // ── Dashboard pages (top 5) ──
      if (!data.topPages?.length) {
        dashPagesBody.innerHTML = '<tr><td colspan="3" class="loading-cell">No data.</td></tr>';
      } else {
        dashPagesBody.innerHTML = data.topPages.slice(0, 5).map(p => `
          <tr>
            <td><a href="${escapeHtml(p.path)}" target="_blank">${escapeHtml(p.path)}</a></td>
            <td>${escapeHtml(p.title)}</td>
            <td>${fmtNum(p.views)}</td>
          </tr>
        `).join('');
      }

      // ── Analytics section — Pages table ──
      if (!data.topPages?.length) {
        pBody.innerHTML = '<tr><td colspan="3" class="loading-cell">No data for this period.</td></tr>';
      } else {
        pBody.innerHTML = data.topPages.map(p => `
          <tr>
            <td><a href="${escapeHtml(p.path)}" target="_blank">${escapeHtml(p.path)}</a></td>
            <td>${escapeHtml(p.title)}</td>
            <td>${fmtNum(p.views)}</td>
          </tr>
        `).join('');
      }

      // ── Events table ──
      if (!data.events?.length) {
        eBody.innerHTML = '<tr><td colspan="2" class="loading-cell">No events for this period.</td></tr>';
      } else {
        eBody.innerHTML = data.events.map(e => `
          <tr><td>${escapeHtml(e.name)}</td><td>${fmtNum(e.count)}</td></tr>
        `).join('');
      }

      // ── Traffic Sources table ──
      if (!data.trafficSources?.length) {
        sBody.innerHTML = '<tr><td colspan="2" class="loading-cell">No data.</td></tr>';
      } else {
        sBody.innerHTML = data.trafficSources.map(s => `
          <tr><td>${escapeHtml(s.source)}</td><td>${fmtNum(s.sessions)}</td></tr>
        `).join('');
      }

      // ── Devices table ──
      if (!data.devices?.length) {
        dBody.innerHTML = '<tr><td colspan="2" class="loading-cell">No data.</td></tr>';
      } else {
        dBody.innerHTML = data.devices.map(d => `
          <tr><td>${escapeHtml(d.device)}</td><td>${fmtNum(d.sessions)}</td></tr>
        `).join('');
      }

      // ── Countries table ──
      if (!data.countries?.length) {
        cBody.innerHTML = '<tr><td colspan="2" class="loading-cell">No data.</td></tr>';
      } else {
        cBody.innerHTML = data.countries.map(c => `
          <tr><td>${escapeHtml(c.country)}</td><td>${fmtNum(c.sessions)}</td></tr>
        `).join('');
      }

      // ── User Types table ──
      if (!data.userTypes?.length) {
        uBody.innerHTML = '<tr><td colspan="2" class="loading-cell">No data.</td></tr>';
      } else {
        uBody.innerHTML = data.userTypes.map(u => `
          <tr><td>${escapeHtml(u.type)}</td><td>${fmtNum(u.sessions)}</td></tr>
        `).join('');
      }

      // ── Charts ──
      renderGa4EventsChart('ga4-events-chart', data.events || [], 5);
      renderGa4EventsChart('ga4-events-chart-detail', data.events || [], 8);
      renderGa4DailyChart(data.daily || []);
    } catch (err) {
      notice.textContent = 'Error loading GA4: ' + err.message;
      notice.classList.remove('hidden');
      const fail = '<tr><td colspan="2" class="loading-cell">Failed to load.</td></tr>';
      pBody.innerHTML = '<tr><td colspan="3" class="loading-cell">Failed to load.</td></tr>';
      eBody.innerHTML = fail; sBody.innerHTML = fail; dBody.innerHTML = fail;
      cBody.innerHTML = fail; uBody.innerHTML = fail;
      dashPagesBody.innerHTML = '<tr><td colspan="3" class="loading-cell">Failed to load.</td></tr>';
      clearGa4Cards();
      ga4DataCache = null;
    }
  }

  function clearGa4Cards() {
    document.getElementById('card-sessions').textContent = '—';
    document.getElementById('card-users').textContent = '—';
    document.getElementById('card-views').textContent = '—';
    document.getElementById('card-duration').textContent = '—';
    document.getElementById('card-bounce').textContent = '—';
  }

  const ga4ChartInstances = {};
  function renderGa4EventsChart(canvasId, events, limit) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    if (ga4ChartInstances[canvasId]) ga4ChartInstances[canvasId].destroy();

    const top = events.slice(0, limit);
    if (!top.length) return;

    ga4ChartInstances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: top.map(e => e.name),
        datasets: [{
          data: top.map(e => e.count),
          backgroundColor: [
            '#0f766e', '#14b8a6', '#2dd4bf', '#5eead4',
            '#99f6e4', '#ccfbf1', '#0d9488', '#115e59',
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#64748b', boxWidth: 12 } },
        },
      },
    });
  }

  function renderGa4DailyChart(daily) {
    const ctx = document.getElementById('ga4-daily-chart')?.getContext('2d');
    if (!ctx) return;
    if (ga4ChartInstances['ga4-daily-chart']) ga4ChartInstances['ga4-daily-chart'].destroy();
    if (!daily.length) return;

    ga4ChartInstances['ga4-daily-chart'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: daily.map(d => fmtShortDate(d.date)),
        datasets: [
          {
            label: 'Sessions',
            data: daily.map(d => d.sessions),
            borderColor: '#0f766e',
            backgroundColor: 'rgba(15,118,110,0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: '#0f766e',
            borderWidth: 2,
          },
          {
            label: 'Active Users',
            data: daily.map(d => d.activeUsers),
            borderColor: '#ea580c',
            backgroundColor: 'rgba(234,88,12,0.06)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: '#ea580c',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#64748b', boxWidth: 12 } },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#f8fafc',
            padding: 10,
            cornerRadius: 6,
          },
        },
        scales: {
          x: { ticks: { color: '#64748b', maxTicksLimit: 8 }, grid: { color: 'rgba(0,0,0,.05)' } },
          y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(0,0,0,.05)' }, beginAtZero: true },
        },
        interaction: { mode: 'index', intersect: false },
      },
    });
  }

  // ── Funnel ───────────────────────────────────────────────────────────────
  let funnelDataCache = null;

  async function loadFunnel() {
    const notice = document.getElementById('funnel-notice');
    const fBody = document.getElementById('funnel-body');
    const eBody = document.getElementById('engaged-pages-body');
    const bBody = document.getElementById('bounce-pages-body');

    fBody.innerHTML = '<tr><td colspan="4" class="loading-cell">Loading funnel data...</td></tr>';
    eBody.innerHTML = '<tr><td colspan="2" class="loading-cell">Loading...</td></tr>';
    bBody.innerHTML = '<tr><td colspan="2" class="loading-cell">Loading...</td></tr>';

    try {
      const res = await fetch(`/admin/api/funnel?days=${currentDays}`);
      if (res.status === 503) {
        const j = await res.json();
        notice.textContent = j.error || 'Google credentials not configured.';
        notice.classList.remove('hidden');
        fBody.innerHTML = '<tr><td colspan="4" class="loading-cell">Not configured.</td></tr>';
        eBody.innerHTML = '<tr><td colspan="2" class="loading-cell">Not configured.</td></tr>';
        bBody.innerHTML = '<tr><td colspan="2" class="loading-cell">Not configured.</td></tr>';
        funnelDataCache = null;
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      funnelDataCache = data;
      notice.classList.add('hidden');

      // Funnel table
      if (!data.funnel?.length) {
        fBody.innerHTML = '<tr><td colspan="4" class="loading-cell">No funnel data.</td></tr>';
      } else {
        fBody.innerHTML = data.funnel.map((s, i) => `
          <tr>
            <td><strong>${escapeHtml(s.stage)}</strong></td>
            <td>${escapeHtml(s.description)}</td>
            <td>${fmtNum(s.views)}</td>
            <td>${i === 0 ? '—' : escapeHtml(s.conversionRate || '—')}</td>
          </tr>
        `).join('');
      }

      // Engaged pages
      if (!data.topEngagedPages?.length) {
        eBody.innerHTML = '<tr><td colspan="2" class="loading-cell">No data.</td></tr>';
      } else {
        eBody.innerHTML = data.topEngagedPages.map(p => `
          <tr>
            <td>${escapeHtml(p.path)}</td>
            <td>${parseFloat(p.avgDuration).toFixed(1)}s</td>
          </tr>
        `).join('');
      }

      // Bounce pages
      if (!data.topBouncePages?.length) {
        bBody.innerHTML = '<tr><td colspan="2" class="loading-cell">No data.</td></tr>';
      } else {
        bBody.innerHTML = data.topBouncePages.map(p => `
          <tr>
            <td>${escapeHtml(p.path)}</td>
            <td>${escapeHtml(p.bounceRate)}%</td>
          </tr>
        `).join('');
      }

      renderFunnelChart(data.funnel || []);
    } catch (err) {
      notice.textContent = 'Error loading funnel: ' + err.message;
      notice.classList.remove('hidden');
      fBody.innerHTML = '<tr><td colspan="4" class="loading-cell">Failed to load.</td></tr>';
      eBody.innerHTML = '<tr><td colspan="2" class="loading-cell">Failed.</td></tr>';
      bBody.innerHTML = '<tr><td colspan="2" class="loading-cell">Failed.</td></tr>';
      funnelDataCache = null;
    }
  }

  const funnelChartInstances = {};
  function renderFunnelChart(funnel) {
    const ctx = document.getElementById('funnel-chart')?.getContext('2d');
    if (!ctx) return;
    if (funnelChartInstances['funnel-chart']) funnelChartInstances['funnel-chart'].destroy();
    if (!funnel.length) return;

    funnelChartInstances['funnel-chart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: funnel.map(s => s.stage),
        datasets: [{
          label: 'Visitors / Events',
          data: funnel.map(s => s.views),
          backgroundColor: ['#0f766e', '#14b8a6', '#2dd4bf', '#5eead4'],
          borderColor: ['#0f766e', '#14b8a6', '#2dd4bf', '#5eead4'],
          borderWidth: 1,
          borderRadius: 6,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#f8fafc',
            padding: 10,
            cornerRadius: 6,
            callbacks: {
              afterLabel: (ctx) => {
                const stage = funnel[ctx.dataIndex];
                return stage.conversionRate ? `Conversion: ${stage.conversionRate}` : '';
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(0,0,0,.05)' }, beginAtZero: true },
          y: { ticks: { color: '#64748b', font: { weight: '600' } }, grid: { display: false } },
        },
      },
    });
  }

  // ── AI Analyst ─────────────────────────────────────────────────────────────
  const aiMessages = document.getElementById('ai-messages');
  const aiInput = document.getElementById('ai-input');
  const aiSend = document.getElementById('ai-send');
  const aiInsightsBtn = document.getElementById('ai-insights-btn');
  const aiInsightsBody = document.getElementById('ai-insights-body');

  function appendAiMessage(role, html) {
    const div = document.createElement('div');
    div.className = `ai-message ai-message--${role}`;
    div.innerHTML = `
      <div class="ai-message__avatar">${role === 'user' ? 'You' : 'AI'}</div>
      <div class="ai-message__content">${html}</div>
    `;
    aiMessages.appendChild(div);
    aiMessages.scrollTop = aiMessages.scrollHeight;
  }

  async function askAi(question, context) {
    try {
      const res = await fetch('/admin/api/ai-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || res.statusText);
      }
      const data = await res.json();
      return data.answer;
    } catch (err) {
      return '**Error:** ' + err.message;
    }
  }

  async function sendAiMessage() {
    const q = aiInput.value.trim();
    if (!q) return;
    aiInput.value = '';
    appendAiMessage('user', escapeHtml(q));
    appendAiMessage('system', '<em>Thinking...</em>');
    const thinking = aiMessages.lastElementChild;

    const context = {
      dateRangeDays: currentDays,
      ga4: ga4DataCache,
      searchConsole: scDataCache,
      funnel: funnelDataCache,
    };

    const answer = await askAi(q, context);
    thinking.querySelector('.ai-message__content').innerHTML = answer;
  }

  aiSend.addEventListener('click', sendAiMessage);
  aiInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendAiMessage(); });

  aiInsightsBtn.addEventListener('click', async () => {
    aiInsightsBody.innerHTML = '<p class="loading-cell">Analyzing data...</p>';
    aiInsightsBtn.disabled = true;

    const context = {
      dateRangeDays: currentDays,
      ga4: ga4DataCache,
      searchConsole: scDataCache,
      funnel: funnelDataCache,
    };

    const answer = await askAi('Give me a top-level SEO and business analysis of this period. Highlight 3 wins, 3 risks, and 3 actionable next steps. Include content and keyword recommendations.', context);
    aiInsightsBody.innerHTML = `<div class="ai-insights__content">${answer}</div>`;
    aiInsightsBtn.disabled = false;
  });

  // ── Utils ──────────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  loadAll();
})();
