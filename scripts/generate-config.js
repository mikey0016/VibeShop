/**
 * Netlify build: config.js + _redirects (API proxy)
 */
const fs = require('fs');
const path = require('path');

const apiUrl = (process.env.API_URL || 'https://metres-constitutes-antiques-breakdown.trycloudflare.com').replace(/\/$/, '');
const webappDir = path.join(__dirname, '..', 'webapp');

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
