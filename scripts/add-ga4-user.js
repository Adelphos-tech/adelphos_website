#!/usr/bin/env node
'use strict';

/**
 * One-time helper script:
 *   Adds the service account to a GA4 property via OAuth2.
 *
 * Usage:
 *   node scripts/add-ga4-user.js
 */

const fs = require('fs');
const http = require('http');
const { google } = require('googleapis');

// ── Config ─────────────────────────────────────────────────────────────────
const CLIENT_SECRET_PATH = process.env.CLIENT_SECRET ||
  '/Users/shivang/Downloads/client_secret_939403255437-sqr1j7eqimu2j71d0gk7rh8psngbqd3e.apps.googleusercontent.com.json';

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || '540114718';
const SERVICE_ACCOUNT_EMAIL = process.env.SERVICE_ACCOUNT ||
  'adelphos-admin@adelphos-admin.iam.gserviceaccount.com';

// ── Read client secrets ───────────────────────────────────────────────────
const raw = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf8'));
const secrets = raw.installed || raw.web;

const oauth2Client = new google.auth.OAuth2(
  secrets.client_id,
  secrets.client_secret,
  'http://localhost:3005/oauth2callback'
);

// ── Scopes needed ─────────────────────────────────────────────────────────
const SCOPES = ['https://www.googleapis.com/auth/analytics.manage.users'];

// ── Generate auth URL ─────────────────────────────────────────────────────
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n  Open this URL in your browser and sign in:\n');
console.log('  ' + authUrl + '\n');
console.log('  Waiting for callback on http://localhost:3005...\n');

// ── Start temporary HTTP server ───────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3005');

  if (url.pathname !== '/oauth2callback') {
    res.writeHead(404); res.end(); return;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400); res.end('Missing code'); return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Authorization received. You can close this tab.');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const analyticsAdmin = google.analyticsadmin({ version: 'v1alpha', auth: oauth2Client });

    await analyticsAdmin.properties.accessBindings.create({
      parent: `properties/${PROPERTY_ID}`,
      requestBody: {
        user: SERVICE_ACCOUNT_EMAIL,
        roles: ['predefinedRoles/viewer'],
      },
    });

    console.log('  ✅ Service account added successfully!');
    console.log(`     Email: ${SERVICE_ACCOUNT_EMAIL}`);
    console.log(`     Property: ${PROPERTY_ID}`);
    console.log(`     Role: Viewer\n`);

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('  ❌ Error:', err.message);
    if (err.response?.data) console.error('  Details:', JSON.stringify(err.response.data));
    server.close();
    process.exit(1);
  }
});

server.listen(3005, () => {
  console.log('  Server listening on port 3005...');
});
