#!/usr/bin/env node
// Generates sitemap.xml by scanning all HTML files in the project.
// Priority: root pages = 1.0, country pages = 0.8, itinerary pages = 0.7, city pages = 0.6
// URLs are emitted in clean form (no .html extension); index.html files collapse to
// their directory path with a trailing slash. See scripts/clean-url-transform.js.
// Usage: node scripts/generate-sitemap.js

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'https://gfgoneglobal.com';
const today = new Date().toISOString().slice(0, 10);

// Internal-only pages that should never be publicly indexed.
const EXCLUDED_ROOT_PAGES = new Set(['admin.html', 'pipeline-status.html']);

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
const itineraryPages = [];

for (const f of allFiles) {
  const parts = f.split(path.sep);
  if (parts.length === 1) {
    if (!EXCLUDED_ROOT_PAGES.has(f)) rootPages.push(f);
  } else if (parts[0] === 'countries' && parts.length === 2) {
    countryPages.push(f);
  } else if (parts[0] === 'countries' && parts.length === 3) {
    cityPages.push(f);
  } else if (parts[0] === 'itineraries') {
    itineraryPages.push(f);
  }
  // Anything else (instagram/*, etc.) is intentionally left out of the public sitemap.
}

rootPages.sort();
countryPages.sort();
cityPages.sort();
itineraryPages.sort();

// Clean-URL form: strip .html; a bare "index.html" (or a path ending in "/index.html")
// collapses to its directory path with a trailing slash instead.
function toCleanPath(filePath) {
  const p = filePath.split(path.sep).join('/').replace(/\.html$/, '');
  if (p === 'index') return '';
  if (p.endsWith('/index')) return p.slice(0, -'index'.length);
  return p;
}

function urlEntry(filePath, priority, changefreq) {
  return `  <url>
    <loc>${BASE_URL}/${toCleanPath(filePath)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

const entries = [
  ...rootPages.map(f => urlEntry(f, '1.0', 'weekly')),
  ...countryPages.map(f => urlEntry(f, '0.8', 'monthly')),
  ...itineraryPages.map(f => urlEntry(f, '0.7', 'monthly')),
  ...cityPages.map(f => urlEntry(f, '0.6', 'monthly')),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

const outPath = path.join(ROOT, 'sitemap.xml');
fs.writeFileSync(outPath, sitemap);
const totalIncluded = rootPages.length + countryPages.length + itineraryPages.length + cityPages.length;
console.log(`Sitemap written: ${totalIncluded} pages included (${rootPages.length} root, ${countryPages.length} country, ${itineraryPages.length} itinerary, ${cityPages.length} city)`);
