#!/usr/bin/env node
// Generates sitemap.xml by scanning all HTML files in the project.
// Priority: root pages = 1.0, country pages = 0.8, city pages = 0.6
// Usage: node scripts/generate-sitemap.js

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'https://gfgoneglobal.com';
const today = new Date().toISOString().slice(0, 10);

function collectHtmlFiles(dir, relativeTo) {
  const entries = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === '.venv') continue;
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      entries.push(...collectHtmlFiles(fullPath, relativeTo));
    } else if (item.name.endsWith('.html')) {
      entries.push(path.relative(relativeTo, fullPath));
    }
  }
  return entries;
}

const allFiles = collectHtmlFiles(ROOT, ROOT)
  .filter(f => !f.startsWith('brand_assets') && !f.startsWith('photos') && !f.startsWith('map '));

// Classify and sort
const rootPages = [];
const countryPages = [];
const cityPages = [];

for (const f of allFiles) {
  const parts = f.split(path.sep);
  if (parts.length === 1) {
    rootPages.push(f);
  } else if (parts[0] === 'countries' && parts.length === 2) {
    countryPages.push(f);
  } else if (parts[0] === 'countries' && parts.length === 3) {
    cityPages.push(f);
  }
}

rootPages.sort();
countryPages.sort();
cityPages.sort();

function urlEntry(filePath, priority, changefreq) {
  return `  <url>
    <loc>${BASE_URL}/${filePath}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

const entries = [
  ...rootPages.map(f => urlEntry(f, '1.0', 'weekly')),
  ...countryPages.map(f => urlEntry(f, '0.8', 'monthly')),
  ...cityPages.map(f => urlEntry(f, '0.6', 'monthly')),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

const outPath = path.join(ROOT, 'sitemap.xml');
fs.writeFileSync(outPath, sitemap);
console.log(`Sitemap written: ${allFiles.length} pages total (${rootPages.length} root, ${countryPages.length} country, ${cityPages.length} city)`);
