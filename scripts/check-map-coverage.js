#!/usr/bin/env node
/**
 * Reports Google My Maps coverage by cross-referencing map downloads/maps_registry.json
 * against what's actually live on each country page's "Open Google Map" button, and
 * against which city pages exist under countries/.
 *
 * Replaces a hand-maintained coverage list in the maps-reader skill, which drifted from
 * reality (claimed 13 local KMLs when the registry actually had 23). This computes the
 * real numbers from the registry + live pages every time it's run, so it can't go stale.
 *
 * Usage: node scripts/check-map-coverage.js
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const registryPath = path.join(repoRoot, 'map downloads', 'maps_registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const maps = registry.maps;

const countriesDir = path.join(repoRoot, 'countries');
const countrySlugs = fs.readdirSync(countriesDir)
  .filter((f) => fs.statSync(path.join(countriesDir, f)).isDirectory());

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// city slug -> country slug, from the actual site structure (ground truth)
const citySlugToCountry = {};
for (const country of countrySlugs) {
  const dir = path.join(countriesDir, country);
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.html')) citySlugToCountry[f.replace(/\.html$/, '')] = country;
  }
}

// For each registry map, figure out which built country/countries its cities belong to
const mapsByCountry = {};
const unmatchedMaps = [];

for (const m of maps) {
  const matchedCountries = new Set();
  for (const city of m.cities || []) {
    const slug = citySlugToCountry[slugify(city)];
    if (slug) matchedCountries.add(slug);
  }
  if (matchedCountries.size === 0) {
    unmatchedMaps.push(m.name);
    continue;
  }
  for (const c of matchedCountries) {
    mapsByCountry[c] = mapsByCountry[c] || [];
    mapsByCountry[c].push(m);
  }
}

// Read each country page's actual "Open Google Map" mid, if any
const pageMid = {};
for (const country of countrySlugs) {
  const pagePath = path.join(countriesDir, `${country}.html`);
  if (!fs.existsSync(pagePath)) continue;
  const html = fs.readFileSync(pagePath, 'utf8');
  const m = html.match(/mid=([A-Za-z0-9_-]+)/);
  pageMid[country] = m ? m[1] : null;
}

console.log('=== Map Coverage Report ===\n');
const withKml = maps.filter((m) => m.local_kml).length;
console.log(`Registry: ${maps.length} map entries — ${withKml} with local KML, ${maps.length - withKml} need google_maps_id download`);
const allCities = new Set();
maps.forEach((m) => (m.cities || []).forEach((c) => allCities.add(c)));
console.log(`Unique cities in registry: ${allCities.size}\n`);

console.log('--- Per built country page ---');
for (const country of countrySlugs.sort()) {
  const pagePath = path.join(countriesDir, `${country}.html`);
  const pageExists = fs.existsSync(pagePath);
  const mid = pageMid[country];
  const candidateMaps = mapsByCountry[country] || [];
  const candidateIds = candidateMaps.map((m) => m.google_maps_id).filter(Boolean);

  let status;
  if (!pageExists) {
    status = 'no country page yet';
  } else if (mid && candidateIds.includes(mid)) {
    status = 'OK — button ID matches registry';
  } else if (mid && candidateIds.length && !candidateIds.includes(mid)) {
    status = `MISMATCH — page uses mid=${mid}, registry has ${candidateIds.join(', ')}`;
  } else if (mid && !candidateIds.length) {
    status = `page has a button (mid=${mid}) but no registry map matched to this country`;
  } else if (!mid && candidateIds.length) {
    status = `MISSING BUTTON — registry has ${candidateMaps.map((m) => m.name).join(', ')} but page has no Open Google Map button`;
  } else {
    status = 'no map data on either side';
  }
  console.log(`${country.padEnd(16)} ${status}`);
}

if (unmatchedMaps.length) {
  console.log('\n--- Registry maps not matched to any built city page (research / not yet built) ---');
  unmatchedMaps.forEach((n) => console.log(`  - ${n}`));
}
