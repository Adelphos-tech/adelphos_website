'use strict';

require('dotenv').config();

const express    = require('express');
const session    = require('express-session');
const nodemailer = require('nodemailer');
const path       = require('path');
const fs         = require('fs');
const { google } = require('googleapis');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Session middleware ───────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  },
}));

// Redirect index.html to / for clean URLs
app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});

// ── SMTP Transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Lead persistence ────────────────────────────────────────────────────────
const LEADS_FILE = path.join(__dirname, 'data', 'leads.json');
const MAX_LEADS  = 500;

function ensureDataDir() {
  const dir = path.dirname(LEADS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadLeads() {
  ensureDataDir();
  if (!fs.existsSync(LEADS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  } catch { return []; }
}

function saveLead(lead) {
  ensureDataDir();
  const leads = loadLeads();
  leads.unshift({ ...lead, receivedAt: new Date().toISOString() });
  if (leads.length > MAX_LEADS) leads.length = MAX_LEADS;
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
}

// ── Auth helpers ────────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  if (req.path.startsWith('/admin/api')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/admin/login');
}

// ── Admin auth routes ─────────────────────────────────────────────────────────
app.get('/admin/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, error: 'Invalid password.' });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ── Admin dashboard ───────────────────────────────────────────────────────────
app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// ── Admin API: leads ──────────────────────────────────────────────────────────
app.get('/admin/api/leads', requireAdmin, (req, res) => {
  res.json(loadLeads());
});

// ── Google API helpers ──────────────────────────────────────────────────────
let googleAuth = null;
function getGoogleAuth() {
  if (googleAuth) return googleAuth;
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyPath || !fs.existsSync(keyPath)) return null;
  googleAuth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/analytics.readonly',
    ],
  });
  return googleAuth;
}

// ── Search Console OAuth helpers ────────────────────────────────────────────
const CLIENT_SECRET_PATH = path.join(__dirname, 'client_secret_939403255437-hm657psouddtdripir3f6lt8l51s0aqh.apps.googleusercontent.com.json');
const SC_TOKEN_FILE      = path.join(__dirname, 'data', 'search-console-token.json');

function getScOAuthClient() {
  const raw = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf8'));
  const secrets = raw.installed || raw.web;
  return new google.auth.OAuth2(
    secrets.client_id,
    secrets.client_secret,
    'https://adelphostech.com/admin/api/search-console/callback'
  );
}

function loadScTokens() {
  if (!fs.existsSync(SC_TOKEN_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(SC_TOKEN_FILE, 'utf8')); } catch { return null; }
}

function saveScTokens(tokens) {
  ensureDataDir();
  fs.writeFileSync(SC_TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

// ── Search Console OAuth: initiate ──────────────────────────────────────────
app.get('/admin/api/search-console/auth', requireAdmin, (req, res) => {
  const client = getScOAuthClient();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
    prompt: 'consent',
  });
  res.redirect(url);
});

// ── Search Console OAuth: callback ──────────────────────────────────────────
app.get('/admin/api/search-console/callback', requireAdmin, async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing authorization code.');
  try {
    const client = getScOAuthClient();
    const { tokens } = await client.getToken(code);
    saveScTokens(tokens);
    res.send('Search Console connected successfully! You can close this tab and refresh the admin dashboard.');
  } catch (err) {
    console.error('[ERROR] Search Console OAuth callback:', err.message);
    res.status(500).send('Failed to connect Search Console: ' + err.message);
  }
});

// ── Admin API: Search Console ───────────────────────────────────────────────
app.get('/admin/api/search-console', requireAdmin, async (req, res) => {
  // Use OAuth tokens if available
  const tokens = loadScTokens();
  let auth = null;
  if (tokens) {
    const client = getScOAuthClient();
    client.setCredentials(tokens);
    auth = client;
  }
  if (!auth) {
    const client = getScOAuthClient();
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
      prompt: 'consent',
    });
    return res.status(503).json({ error: 'Search Console not connected. Click the button below to connect.', authUrl });
  }

  const days = Math.min(parseInt(req.query.days || '28', 10), 90);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate   = new Date().toISOString().split('T')[0];

  try {
    const webmasters = google.webmasters({ version: 'v3', auth });
    const siteUrl = process.env.SEARCH_CONSOLE_SITE || 'https://adelphostech.com/';

    const [queriesData, pagesData] = await Promise.all([
      webmasters.searchanalytics.query({
        siteUrl,
        requestBody: { startDate, endDate, dimensions: ['query'], rowLimit: 100 },
      }),
      webmasters.searchanalytics.query({
        siteUrl,
        requestBody: { startDate, endDate, dimensions: ['page'], rowLimit: 100 },
      }),
    ]);

    const summary = {
      clicks:      (queriesData.data.rows || []).reduce((s, r) => s + (r.clicks || 0), 0),
      impressions: (queriesData.data.rows || []).reduce((s, r) => s + (r.impressions || 0), 0),
      ctr:         queriesData.data.rows?.length
        ? (queriesData.data.rows.reduce((s, r) => s + (r.ctr || 0), 0) / queriesData.data.rows.length * 100).toFixed(2)
        : '0.00',
      position:    queriesData.data.rows?.length
        ? (queriesData.data.rows.reduce((s, r) => s + (r.position || 0), 0) / queriesData.data.rows.length).toFixed(1)
        : '0.0',
    };

    res.json({
      summary,
      queries: (queriesData.data.rows || []).map(r => ({
        query:      r.keys[0],
        clicks:     r.clicks || 0,
        impressions: r.impressions || 0,
        ctr:        ((r.ctr || 0) * 100).toFixed(2),
        position:   (r.position || 0).toFixed(1),
      })),
      pages: (pagesData.data.rows || []).map(r => ({
        page:       r.keys[0],
        clicks:     r.clicks || 0,
        impressions: r.impressions || 0,
        ctr:        ((r.ctr || 0) * 100).toFixed(2),
        position:   (r.position || 0).toFixed(1),
      })),
    });
  } catch (err) {
    console.error('[ERROR] Search Console API:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Admin API: GA4 ────────────────────────────────────────────────────────────
app.get('/admin/api/analytics', requireAdmin, async (req, res) => {
  const auth = getGoogleAuth();
  if (!auth) return res.status(503).json({ error: 'Google credentials not configured. See GOOGLE_API_SETUP.md' });

  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) return res.status(503).json({ error: 'GA4_PROPERTY_ID not set in .env' });

  const days = Math.min(parseInt(req.query.days || '28', 10), 90);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate   = new Date().toISOString().split('T')[0];

  try {
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });

    const [overview, topPages, events, daily, trafficSources, devices, countries, userTypes] = await Promise.all([
      analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
            { name: 'screenPageViews' },
            { name: 'averageSessionDuration' },
            { name: 'bounceRate' },
          ],
        },
      }),
      analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 20,
        },
      }),
      analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
          orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
          limit: 20,
        },
      }),
      analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
          limit: 90,
        },
      }),
      analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 10,
        },
      }),
      analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 10,
        },
      }),
      analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 10,
        },
      }),
      analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'newVsReturning' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 10,
        },
      }),
    ]);

    const overviewRow = overview.data.rows?.[0];
    const overviewMetrics = {};
    if (overviewRow) {
      overview.data.metricHeaders.forEach((h, i) => {
        overviewMetrics[h.name] = overviewRow.metricValues[i].value;
      });
    }

    res.json({
      overview: overviewMetrics,
      topPages: (topPages.data.rows || []).map(r => ({
        title: r.dimensionValues[0].value,
        path:  r.dimensionValues[1].value,
        views: parseInt(r.metricValues[0].value, 10),
      })),
      events: (events.data.rows || []).map(r => ({
        name:  r.dimensionValues[0].value,
        count: parseInt(r.metricValues[0].value, 10),
      })),
      daily: (daily.data.rows || []).map(r => ({
        date:  r.dimensionValues[0].value,
        sessions:     parseInt(r.metricValues[0].value, 10),
        activeUsers:  parseInt(r.metricValues[1].value, 10),
      })),
      trafficSources: (trafficSources.data.rows || []).map(r => ({
        source:   r.dimensionValues[0].value,
        sessions: parseInt(r.metricValues[0].value, 10),
      })),
      devices: (devices.data.rows || []).map(r => ({
        device:   r.dimensionValues[0].value,
        sessions: parseInt(r.metricValues[0].value, 10),
      })),
      countries: (countries.data.rows || []).map(r => ({
        country:  r.dimensionValues[0].value,
        sessions: parseInt(r.metricValues[0].value, 10),
      })),
      userTypes: (userTypes.data.rows || []).map(r => ({
        type:     r.dimensionValues[0].value,
        sessions: parseInt(r.metricValues[0].value, 10),
      })),
    });
  } catch (err) {
    console.error('[ERROR] GA4 API:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Clean URL routes ────────────────────────────────────────────────────────
app.get('/simulator', (req, res) => {
  res.sendFile(path.join(__dirname, 'simulator.html'));
});

app.get('/blog', (req, res) => {
  res.sendFile(path.join(__dirname, 'blog.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

// ── Lead submission endpoint ─────────────────────────────────────────────────
app.post('/submit-lead', async (req, res) => {
  const {
    name, title, email, phone,
    company, website, size, industry,
    aiUse, challenge, goal
  } = req.body;

  // Basic validation
  if (!name || !email || !company) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  // Persist lead
  saveLead({ name, title, email, phone, company, website, size, industry, aiUse, challenge, goal, source: 'website' });

  // ── Beautiful HTML email ──────────────────────────────────────────────────
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .wrap { max-width: 620px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #0d1117 0%, #1a2332 100%); padding: 32px 36px; }
    .header h1 { color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 6px; }
    .header p { color: rgba(255,255,255,.55); font-size: 13px; margin: 0; }
    .badge { display: inline-block; background: #2e7d32; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; margin-bottom: 14px; }
    .body { padding: 32px 36px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #2e7d32; margin: 0 0 14px; padding-bottom: 8px; border-bottom: 2px solid #e8f5e9; }
    .row { display: flex; margin-bottom: 10px; }
    .label { width: 160px; flex-shrink: 0; font-size: 13px; font-weight: 600; color: #555; padding-top: 2px; }
    .value { font-size: 13px; color: #111; flex: 1; }
    .value a { color: #2e7d32; text-decoration: none; }
    .block-label { font-size: 13px; font-weight: 600; color: #555; margin-bottom: 6px; }
    .block-value { font-size: 13px; color: #111; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; line-height: 1.6; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 18px 36px; }
    .footer p { font-size: 12px; color: #999; margin: 0; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="badge">🔔 New Lead</div>
    <h1>AI Maturity Assessment Submission</h1>
    <p>Received via adelphostech.com • ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
  </div>

  <div class="body">

    <div class="section">
      <div class="section-title">Contact Information</div>
      <div class="row"><div class="label">Full Name</div><div class="value"><strong>${name}</strong></div></div>
      <div class="row"><div class="label">Job Title</div><div class="value">${title || '<em style="color:#aaa">Not provided</em>'}</div></div>
      <div class="row"><div class="label">Work Email</div><div class="value"><a href="mailto:${email}">${email}</a></div></div>
      <div class="row"><div class="label">Phone</div><div class="value">${phone ? `<a href="tel:${phone}">${phone}</a>` : '<em style="color:#aaa">Not provided</em>'}</div></div>
    </div>

    <div class="section">
      <div class="section-title">Organisation Details</div>
      <div class="row"><div class="label">Company</div><div class="value"><strong>${company}</strong></div></div>
      <div class="row"><div class="label">Website</div><div class="value">${website ? `<a href="${website}" target="_blank">${website}</a>` : '<em style="color:#aaa">Not provided</em>'}</div></div>
      <div class="row"><div class="label">Company Size</div><div class="value">${size || '<em style="color:#aaa">Not provided</em>'}</div></div>
      <div class="row"><div class="label">Industry</div><div class="value">${industry || '<em style="color:#aaa">Not provided</em>'}</div></div>
    </div>

    <div class="section">
      <div class="section-title">AI Readiness</div>
      <div class="block-label">Current AI Usage</div>
      <div class="block-value" style="margin-bottom:14px">${aiUse || '<em style="color:#aaa">Not provided</em>'}</div>
      <div class="block-label">Biggest Operational Challenge</div>
      <div class="block-value" style="margin-bottom:14px">${challenge || '<em style="color:#aaa">Not provided</em>'}</div>
      <div class="block-label">What They Want to Achieve with AI</div>
      <div class="block-value">${goal || '<em style="color:#aaa">Not provided</em>'}</div>
    </div>

  </div>

  <div class="footer">
    <p>Reply directly to this email to contact <strong>${name}</strong> at ${email}.</p>
  </div>
</div>
</body>
</html>`;

  // ── Plain text fallback ───────────────────────────────────────────────────
  const text = [
    '=== NEW AI MATURITY ASSESSMENT LEAD ===',
    '',
    `Full Name:    ${name}`,
    `Job Title:    ${title || 'Not provided'}`,
    `Email:        ${email}`,
    `Phone:        ${phone || 'Not provided'}`,
    '',
    `Company:      ${company}`,
    `Website:      ${website || 'Not provided'}`,
    `Size:         ${size || 'Not provided'}`,
    `Industry:     ${industry || 'Not provided'}`,
    '',
    `AI Usage:     ${aiUse || 'Not provided'}`,
    `Challenge:    ${challenge || 'Not provided'}`,
    `Goal:         ${goal || 'Not provided'}`,
  ].join('\n');

  try {
    await transporter.sendMail({
      from:    `"Adelphos Website" <${process.env.SMTP_USER}>`,
      to:      'info@adelphostech.com',
      replyTo: email,
      subject: `🔔 New Lead — ${company} (${name})`,
      text,
      html,
    });

    console.log(`[LEAD] ${new Date().toISOString()} — ${name} from ${company} (${email})`);
    res.json({ success: true });

  } catch (err) {
    console.error('[ERROR] Failed to send email:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send email. Check SMTP config.' });
  }
});

// ── Block direct access to admin HTML files ─────────────────────────────────
app.get('/admin.html', (req, res) => res.redirect('/admin'));
app.get('/admin-login.html', (req, res) => res.redirect('/admin/login'));

// ── Serve the static website from this same folder ─────────────────────────
// Placed AFTER all custom routes so auth routes take priority
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// ── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ✦ Adelphos server running');
  console.log(`  ✦ Website:  http://localhost:${PORT}`);
  console.log(`  ✦ Admin:    http://localhost:${PORT}/admin`);
  console.log(`  ✦ Local IP: http://0.0.0.0:${PORT}`);
  console.log('');
});
