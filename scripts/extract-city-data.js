#!/usr/bin/env node
// Pre-extracts all city data from travel_master.xlsx into per-city JSON files.
// This eliminates the need for subagents to parse the full spreadsheet.
//
// Output: data/[country]/[city].json for each city
//         data/index.json — summary of all cities
//
// Usage: node scripts/extract-city-data.js
//        node scripts/extract-city-data.js --city tokyo
//        node scripts/extract-city-data.js --country japan

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'travel_master.xlsx');
const DATA_DIR = path.join(ROOT, 'data');

// Parse args
const args = process.argv.slice(2);
let filterCity = null, filterCountry = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--city' && args[i + 1]) filterCity = args[++i].toLowerCase();
  if (args[i] === '--country' && args[i + 1]) filterCountry = args[++i].toLowerCase();
}

// Read spreadsheet
const wb = XLSX.readFile(XLSX_PATH);
const places = XLSX.utils.sheet_to_json(wb.Sheets['places']);
const quickNotes = wb.SheetNames.includes('quick notes')
  ? XLSX.utils.sheet_to_json(wb.Sheets['quick notes'])
  : [];

// Relevant columns for city pages
const PLACE_FIELDS = [
  'country', 'city', 'place_name', 'place_type', 'actually_visited',
  'visit_month', 'visit_year', 'gf_category', 'celiac_safety_score',
  'latitude', 'longitude', 'fmgf_url', 'notes', 'post-visit-notes',
  'hotel_gf_notes', 'URL', 'region_state'
];

function slugify(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function cleanRow(row) {
  const clean = {};
  for (const field of PLACE_FIELDS) {
    if (row[field] !== undefined && row[field] !== '') {
      clean[field] = row[field];
    }
  }
  return clean;
}

// Group by city
const cityMap = {};
for (const row of places) {
  if (!row.city || !row.country) continue;
  const key = `${row.country}|${row.city}`;
  if (!cityMap[key]) cityMap[key] = { country: row.country, city: row.city, places: [] };
  cityMap[key].places.push(cleanRow(row));
}

// Check photo manifests
function getPhotoManifest(country, city) {
  const slug = slugify(city);
  const countrySlug = slugify(country);
  const manifestPath = path.join(ROOT, 'photos', countrySlug, slug, 'photo_manifest.json');
  if (fs.existsSync(manifestPath)) {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  }
  return null;
}

// Check if city page already exists
function pageExists(country, city) {
  const countrySlug = slugify(country);
  const citySlug = slugify(city);
  return fs.existsSync(path.join(ROOT, 'countries', countrySlug, `${citySlug}.html`));
}

const index = [];
let written = 0;

for (const [key, data] of Object.entries(cityMap)) {
  const countrySlug = slugify(data.country);
  const citySlug = slugify(data.city);

  // Apply filters
  if (filterCity && citySlug !== filterCity) continue;
  if (filterCountry && countrySlug !== filterCountry) continue;

  // Group places by type
  const byType = {};
  for (const p of data.places) {
    const t = p.place_type || 'other';
    if (!byType[t]) byType[t] = [];
    byType[t].push(p);
  }

  // Find quick notes
  const cityNotes = quickNotes.filter(
    n => n.City && n.City.toLowerCase() === data.city.toLowerCase()
  );

  // Photo manifest
  const photoManifest = getPhotoManifest(data.country, data.city);

  // Visit date from first place with visit_month
  const visited = data.places.find(p => p.visit_month && p.visit_year);

  const output = {
    country: data.country,
    city: data.city,
    countrySlug,
    citySlug,
    visitMonth: visited ? visited.visit_month : null,
    visitYear: visited ? visited.visit_year : null,
    pageExists: pageExists(data.country, data.city),
    hasPhotoManifest: !!photoManifest,
    photoManifestPath: photoManifest
      ? `photos/${countrySlug}/${citySlug}/photo_manifest.json`
      : null,
    summary: {
      total: data.places.length,
      byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
      withGfCategory: data.places.filter(p => p.gf_category).length,
      withFmgfUrl: data.places.filter(p => p.fmgf_url).length,
      withCoords: data.places.filter(p => p.latitude && p.longitude).length,
      visited: data.places.filter(p => p.actually_visited === 1).length,
    },
    quickNotes: cityNotes.map(n => n.Notes).filter(Boolean),
    places: data.places,
  };

  // Write per-city file
  const outDir = path.join(DATA_DIR, countrySlug);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${citySlug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  written++;

  index.push({
    country: data.country,
    city: data.city,
    countrySlug,
    citySlug,
    total: data.places.length,
    restaurants: (byType.restaurant || []).length + (byType.cafe || []).length + (byType.bar || []).length + (byType.bakery || []).length,
    hotels: (byType.hotel || []).length,
    landmarks: (byType.landmark || []).length + (byType.viewpoint || []).length,
    activities: (byType.activity || []).length + (byType.museum || []).length,
    pageExists: output.pageExists,
    hasPhotos: output.hasPhotoManifest,
    visitDate: visited ? `${visited.visit_month} ${visited.visit_year}` : null,
  });
}

// Write index
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.writeFileSync(path.join(DATA_DIR, 'index.json'), JSON.stringify(index, null, 2));

console.log(`Extracted ${written} city data files to data/`);
console.log(`Index: ${index.length} cities`);
if (filterCity || filterCountry) {
  console.log(`Filter applied: ${filterCity ? '--city ' + filterCity : ''} ${filterCountry ? '--country ' + filterCountry : ''}`);
}
