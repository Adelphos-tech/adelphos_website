'use strict';

require('dotenv').config();

const express    = require('express');
const nodemailer = require('nodemailer');
const path       = require('path');

const app = express();
app.use(express.json());

// Redirect index.html to / for clean URLs
app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});

// ── Serve the static website from this same folder ─────────────────────────
// `extensions: ['html']` lets clean URLs like /blog/<slug> resolve to <slug>.html
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));

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

// ── Clean URL routes ────────────────────────────────────────────────────────
app.get('/simulator', (req, res) => {
  res.sendFile(path.join(__dirname, 'simulator.html'));
});

app.get('/blog', (req, res) => {
  res.sendFile(path.join(__dirname, 'blog.html'));
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

// ── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ✦ Adelphos server running');
  console.log(`  ✦ Website:  http://localhost:${PORT}`);
  console.log(`  ✦ Local IP: http://0.0.0.0:${PORT}`);
  console.log('');
});
