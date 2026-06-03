(function () {
  'use strict';

  let currentDays = 7;
  let allLeads = [];
  let leadsSort = { col: 'receivedAt', asc: false };

  // ── DOM refs ─────────────────────────────────────────────────────────────
  const dateTabs = document.querySelectorAll('.admin-tab');
  const btnRefresh = document.getElementById('btn-refresh');
  const leadsSearch = document.getElementById('leads-search');

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

  // ── Load everything ──────────────────────────────────────────────────────
  async function loadAll() {
    btnRefresh.disabled = true;
    btnRefresh.textContent = 'Loading...';
    await Promise.all([loadLeads(), loadSearchConsole(), loadAnalytics()]);
    btnRefresh.disabled = false;
    btnRefresh.textContent = '↻ Refresh';
  }

  // ── Leads ────────────────────────────────────────────────────────────────
  async function loadLeads() {
    try {
      const res = await fetch('/admin/api/leads');
      if (!res.ok) throw new Error('Unauthorized');
      allLeads = await res.json();
      filterAndRenderLeads();
      updateLeadCount();
    } catch (err) {
      document.getElementById('leads-body').innerHTML = `<tr><td colspan="6" class="admin-loading">${err.message}</td></tr>`;
    }
  }

  function updateLeadCount() {
    const cutoff = Date.now() - currentDays * 24 * 60 * 60 * 1000;
    const count = allLeads.filter(l => new Date(l.receivedAt).getTime() > cutoff).length;
    document.getElementById('card-leads').textContent = fmtNum(count);
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
      tbody.innerHTML = '<tr><td colspan="6" class="admin-loading">No leads found.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(l => `
      <tr>
        <td>${fmtDate(l.receivedAt)}</td>
        <td><strong>${escapeHtml(l.name || '—')}</strong></td>
        <td>${escapeHtml(l.company || '—')}</td>
        <td><a href="mailto:${escapeHtml(l.email || '')}" style="color:var(--accent);text-decoration:none;">${escapeHtml(l.email || '—')}</a></td>
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
    qBody.innerHTML = '<tr><td colspan="5" class="admin-loading">Loading Search Console data...</td></tr>';

    try {
      const res = await fetch(`/admin/api/search-console?days=${currentDays}`);
      if (res.status === 503) {
        const j = await res.json();
        if (j.authUrl) {
          notice.innerHTML = escapeHtml(j.error) + '<br><a href="' + escapeHtml(j.authUrl) + '" target="_blank" class="admin-connect-btn" style="display:inline-block;margin-top:.75rem;padding:.5rem 1rem;background:linear-gradient(135deg,#16a34a,#4ade80);color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:.85rem;">Connect Google Search Console</a>';
        } else {
          notice.textContent = j.error || 'Google credentials not configured.';
        }
        notice.classList.remove('hidden');
        qBody.innerHTML = '<tr><td colspan="5" class="admin-loading">Not configured.</td></tr>';
        clearScCards();
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      notice.classList.add('hidden');

      // Update cards
      document.getElementById('card-impressions').textContent = fmtNum(data.summary?.impressions);
      document.getElementById('card-clicks').textContent = fmtNum(data.summary?.clicks);
      document.getElementById('card-position').textContent = data.summary?.position ? parseFloat(data.summary.position).toFixed(1) : '—';

      // Queries table
      if (!data.queries?.length) {
        qBody.innerHTML = '<tr><td colspan="5" class="admin-loading">No data for this period.</td></tr>';
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

      // Chart
      renderScChart(data.queries || []);
    } catch (err) {
      notice.textContent = 'Error loading Search Console: ' + err.message;
      notice.classList.remove('hidden');
      qBody.innerHTML = '<tr><td colspan="5" class="admin-loading">Failed to load.</td></tr>';
      clearScCards();
    }
  }

  function clearScCards() {
    document.getElementById('card-impressions').textContent = '—';
    document.getElementById('card-clicks').textContent = '—';
    document.getElementById('card-position').textContent = '—';
  }

  let scChartInstance = null;
  function renderScChart(queries) {
    const ctx = document.getElementById('sc-chart').getContext('2d');
    if (scChartInstance) scChartInstance.destroy();

    const top = queries.slice(0, 10);
    if (!top.length) return;

    scChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map(q => q.query.length > 20 ? q.query.slice(0, 20) + '…' : q.query),
        datasets: [
          { label: 'Impressions', data: top.map(q => q.impressions), backgroundColor: 'rgba(74,222,128,.35)', borderColor: 'rgba(74,222,128,.6)', borderWidth: 1, borderRadius: 4 },
          { label: 'Clicks', data: top.map(q => q.clicks), backgroundColor: 'rgba(74,222,128,.7)', borderColor: 'rgba(74,222,128,1)', borderWidth: 1, borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#9ca3af' } } },
        scales: {
          x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,.05)' } },
          y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,.05)' }, beginAtZero: true },
        },
      },
    });
  }

  // ── GA4 ──────────────────────────────────────────────────────────────────
  async function loadAnalytics() {
    const notice = document.getElementById('ga4-notice');
    const pBody = document.getElementById('ga4-pages-body');
    const eBody = document.getElementById('ga4-events-body');
    pBody.innerHTML = '<tr><td colspan="3" class="admin-loading">Loading GA4 data...</td></tr>';
    eBody.innerHTML = '<tr><td colspan="2" class="admin-loading">Loading GA4 data...</td></tr>';

    try {
      const res = await fetch(`/admin/api/analytics?days=${currentDays}`);
      if (res.status === 503) {
        const j = await res.json();
        notice.textContent = j.error || 'Google credentials not configured.';
        notice.classList.remove('hidden');
        pBody.innerHTML = '<tr><td colspan="3" class="admin-loading">Not configured.</td></tr>';
        eBody.innerHTML = '<tr><td colspan="2" class="admin-loading">Not configured.</td></tr>';
        clearGa4Cards();
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      notice.classList.add('hidden');

      // Cards
      document.getElementById('card-sessions').textContent = fmtNum(data.overview?.sessions);
      document.getElementById('card-users').textContent = fmtNum(data.overview?.activeUsers);

      // Pages table
      if (!data.topPages?.length) {
        pBody.innerHTML = '<tr><td colspan="3" class="admin-loading">No data for this period.</td></tr>';
      } else {
        pBody.innerHTML = data.topPages.map(p => `
          <tr>
            <td><a href="${escapeHtml(p.path)}" target="_blank" style="color:var(--accent);text-decoration:none;">${escapeHtml(p.path)}</a></td>
            <td>${escapeHtml(p.title)}</td>
            <td>${fmtNum(p.views)}</td>
          </tr>
        `).join('');
      }

      // Events table
      if (!data.events?.length) {
        eBody.innerHTML = '<tr><td colspan="2" class="admin-loading">No events for this period.</td></tr>';
      } else {
        eBody.innerHTML = data.events.map(e => `
          <tr>
            <td>${escapeHtml(e.name)}</td>
            <td>${fmtNum(e.count)}</td>
          </tr>
        `).join('');
      }

      // Events chart
      renderGa4EventsChart(data.events || []);
    } catch (err) {
      notice.textContent = 'Error loading GA4: ' + err.message;
      notice.classList.remove('hidden');
      pBody.innerHTML = '<tr><td colspan="3" class="admin-loading">Failed to load.</td></tr>';
      eBody.innerHTML = '<tr><td colspan="2" class="admin-loading">Failed to load.</td></tr>';
      clearGa4Cards();
    }
  }

  function clearGa4Cards() {
    document.getElementById('card-sessions').textContent = '—';
    document.getElementById('card-users').textContent = '—';
  }

  let ga4ChartInstance = null;
  function renderGa4EventsChart(events) {
    const ctx = document.getElementById('ga4-events-chart').getContext('2d');
    if (ga4ChartInstance) ga4ChartInstance.destroy();

    const top = events.slice(0, 8);
    if (!top.length) return;

    ga4ChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: top.map(e => e.name),
        datasets: [{
          data: top.map(e => e.count),
          backgroundColor: [
            '#4ade80', '#22c55e', '#16a34a', '#15803d',
            '#86efac', '#bbf7d0', '#dcfce7', '#f0fdf4',
          ],
          borderColor: '#111827',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#9ca3af', boxWidth: 12 } },
        },
      },
    });
  }

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
