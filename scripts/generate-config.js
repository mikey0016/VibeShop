/**
 * Netlify build: API URL ni environment dan config.js ga yozadi
 */
const fs = require('fs');
const path = require('path');

const apiUrl = process.env.API_URL || 'https://vibeshop-api.onrender.com';
const content = `// Auto-generated at build time\nwindow.API_BASE = '${apiUrl}';\n`;

fs.writeFileSync(path.join(__dirname, '..', 'webapp', 'config.js'), content);
console.log('config.js generated with API_BASE =', apiUrl);
