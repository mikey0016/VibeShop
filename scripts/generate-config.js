/**
 * Production: same-origin via Netlify proxy
 * Local dev: python main.py with SERVE_WEBAPP=true uses localhost
 */
const fs = require('fs');
const path = require('path');

const apiUrl = (process.env.API_URL || 'https://vibeshop-api.onrender.com').replace(/\/$/, '');
const webappDir = path.join(__dirname, '..', 'webapp');

// Same-origin — Netlify _redirects POST ni ham proxy qiladi
const configJs = [
  '// Auto-generated at build time',
  'window.API_BASE = window.location.origin;',
  ''
].join('\n');

const redirects = [
  '/api/*  ' + apiUrl + '/api/:splat  200!',
  '/uploads/*  ' + apiUrl + '/uploads/:splat  200!',
  ''
].join('\n');

fs.writeFileSync(path.join(webappDir, 'config.js'), configJs);
fs.writeFileSync(path.join(webappDir, '_redirects'), redirects);
console.log('Build OK — API proxy ->', apiUrl);
