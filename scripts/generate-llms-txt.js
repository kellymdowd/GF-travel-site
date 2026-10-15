#!/usr/bin/env node
// Generates llms.txt at the site root: a plain-text guide to the site for AI tools
// (ChatGPT, Claude, Perplexity, etc.), following the llms.txt convention (llmstxt.org).
// Re-run after adding or renaming pages, alongside generate-sitemap.js:
//   node scripts/generate-llms-txt.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://gfgoneglobal.com';
// Unlinked or private pages stay out, same as the sitemap.
const EXCLUDED = new Set(['admin.html', 'pipeline-status.html', 'stadiums.html', 'index.html']);

function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function pageInfo(file) {
  const html = fs.readFileSync(file, 'utf8');
  if (/<meta name="robots" content="[^"]*noindex/.test(html)) return null;
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '')
    .replace(/\s*[|—–-]\s*GF Gone Global\s*$/, '').trim();
  const desc = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const url = canonical || `${SITE}/${rel.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')}`;
  return { title, desc, url, rel };
}

function countryName(rel) {
  const slug = path.basename(rel, '.html');
  const special = { usa: 'United States' };
  return special[slug] || slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function line(p) {
  return `- [${p.title}](${p.url})${p.desc ? `: ${p.desc}` : ''}`;
}

function htmlFiles(dir) {
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => path.join(dir, f));
}

const countriesDir = path.join(ROOT, 'countries');
const countryFiles = htmlFiles(countriesDir).sort();
const countries = countryFiles.map((f) => {
  const info = pageInfo(f);
  const slug = path.basename(f, '.html');
  const cityDir = path.join(countriesDir, slug);
  const cities = fs.existsSync(cityDir) ? htmlFiles(cityDir).sort().map(pageInfo).filter(Boolean) : [];
  return { info, cities };
}).filter((c) => c.info);

const itineraries = htmlFiles(path.join(ROOT, 'itineraries')).sort().map(pageInfo).filter(Boolean);
const rootPages = htmlFiles(ROOT).filter((f) => !EXCLUDED.has(path.basename(f))).sort().map(pageInfo).filter(Boolean);

const cityCount = countries.reduce((n, c) => n + c.cities.length, 0);

const out = [];
out.push('# GF Gone Global');
out.push('');
out.push(`> First-hand gluten-free and celiac travel guides from one celiac traveler (diagnosed 2009): ${cityCount} city guides across ${countries.length} countries, with restaurants rated for celiac safety, hotels, things to do, maps, and day-by-day trip itineraries.`);
out.push('');
out.push('How to read the site:');
out.push('');
out.push('- Each city guide lists restaurants with a GF score out of 5 (5 = eat with confidence, 1 = caution; 100% gluten-free restaurants automatically score 5), plus a city-level GF score out of 10.');
out.push('- Each country page has a country-level GF score out of 10, judged on its own merits rather than averaged from city scores.');
out.push('- "Went here" marks places the author personally visited. "Traveler recommended" marks places included from research and reviews, not a personal visit.');
out.push('- Scores and details reflect the visit date shown on each page. Restaurant hours, menus, and gluten-free procedures change, so confirm current details with the venue.');
out.push('- Full scoring method: ' + SITE + '/gf-scoring');
out.push('');
out.push('## About');
out.push('');
rootPages.forEach((p) => out.push(line(p)));
out.push('');
out.push('## Itineraries');
out.push('');
itineraries.forEach((p) => out.push(line(p)));
out.push('');
out.push('## Country and city guides');
countries.forEach(({ info, cities }) => {
  out.push('');
  out.push(`### ${countryName(info.rel)}`);
  out.push('');
  out.push(line(info));
  cities.forEach((c) => out.push(line(c)));
});
out.push('');

fs.writeFileSync(path.join(ROOT, 'llms.txt'), out.join('\n'));
console.log(`llms.txt written: ${countries.length} countries, ${cityCount} cities, ${itineraries.length} itineraries, ${rootPages.length} other pages`);
