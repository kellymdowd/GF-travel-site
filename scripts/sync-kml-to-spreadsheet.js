#!/usr/bin/env node
// Syncs KML map data back to travel_master.xlsx:
//   1. Backfills missing lat/lng coordinates from KML placemarks
//   2. Imports new cities/places from KML that aren't in the spreadsheet
//   3. Reports mismatches and gaps
//
// Usage:
//   node scripts/sync-kml-to-spreadsheet.js                  # dry run (report only)
//   node scripts/sync-kml-to-spreadsheet.js --write           # write changes to xlsx
//   node scripts/sync-kml-to-spreadsheet.js --import-city Helsinki --country Finland --map "Finland (September 2019).kml"
//   node scripts/sync-kml-to-spreadsheet.js --write --import-city Helsinki --country Finland --map "Finland (September 2019).kml"
//   node scripts/sync-kml-to-spreadsheet.js --write --import-all --country Germany --map "Germany (December 2022).kml"

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'travel_master.xlsx');
const KML_DIR = path.join(ROOT, 'map downloads');

// Parse args
const args = process.argv.slice(2);
const doWrite = args.includes('--write');
const importCity = args.includes('--import-city') ? args[args.indexOf('--import-city') + 1] : null;
const importAll = args.includes('--import-all');
const importCountry = args.includes('--country') ? args[args.indexOf('--country') + 1] : null;
const importMap = args.includes('--map') ? args[args.indexOf('--map') + 1] : null;

// ─── KML Parser ──────────────────────────────────────────────────────────────

function parseKml(content) {
  const placemarks = [];
  const pmRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g;
  let match;
  while ((match = pmRegex.exec(content)) !== null) {
    const pm = match[1];
    const rawName = (pm.match(/<name>(.*?)<\/name>/) || [])[1] || '';
    const name = rawName.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const coordMatch = pm.match(/<coordinates>\s*([\s\S]*?)\s*<\/coordinates>/);
    const coords = coordMatch ? coordMatch[1].trim() : '';
    const descMatch = pm.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    const desc = descMatch ? descMatch[1].trim() : '';
    // Extract style to guess place type
    const styleMatch = pm.match(/<styleUrl>#(.*?)<\/styleUrl>/);
    const style = styleMatch ? styleMatch[1] : '';
    if (coords) {
      const parts = coords.split(',');
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        placemarks.push({ name: name.trim(), lat, lng, desc, style });
      }
    }
  }
  return placemarks;
}

function parseFolders(content) {
  const folders = [];
  const folderRegex = /<Folder>([\s\S]*?)<\/Folder>/g;
  let m;
  while ((m = folderRegex.exec(content)) !== null) {
    const folderContent = m[1];
    const nameMatch = folderContent.match(/<name>(.*?)<\/name>/);
    let name = nameMatch ? nameMatch[1] : 'unnamed';
    // Clean CDATA from folder name
    name = name.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const pms = parseKml(folderContent);
    if (pms.length > 0) {
      folders.push({ name, count: pms.length, placemarks: pms });
    }
  }
  return folders;
}

// ─── Fuzzy name matching ─────────────────────────────────────────────────────

function normalize(name) {
  return name.toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[āáàâä]/g, 'a')
    .replace(/[ēéèêë]/g, 'e')
    .replace(/[īíìîï]/g, 'i')
    .replace(/[ōóòôöø]/g, 'o')
    .replace(/[ūúùûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatch(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  // Reject if either normalized name is too short (avoids Japanese-char-stripped false positives)
  if (na.length < 3 || nb.length < 3) return 0;
  if (na === nb) return 1.0;
  // Substring match only if the shorter string is substantial (>=4 chars)
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  if (shorter.length >= 4 && longer.includes(shorter)) return 0.8;
  // Check after removing common suffixes
  const stripped = (s) => s.replace(/(restaurant|cafe|hotel|hostel|bar|bakery|temple|shrine|museum|park)\s*/gi, '').trim();
  const sa = stripped(na), sb = stripped(nb);
  if (sa.length >= 3 && sb.length >= 3 && sa === sb) return 0.7;
  return 0;
}

// ─── Guess place_type from KML style/description ─────────────────────────────

function guessPlaceType(placemark) {
  const desc = (placemark.desc || '').toLowerCase();
  const name = placemark.name.toLowerCase();
  const style = (placemark.style || '').toLowerCase();

  // Activities (check before hotels to catch parks/tours that use hotel-style icons)
  if (name.includes('reindeer') || name.includes('zoo') || name.includes('aquarium') ||
      name.includes('theme park') || name.includes('amusement')) {
    return 'activity';
  }
  // Hotels
  if (style.includes('1602') || desc.includes('amenities') || desc.includes('hotel') ||
      name.includes('hotel') || name.includes('hostel') || name.includes('airbnb') ||
      name.includes('mercure') || name.includes('scandic') || name.includes('radisson') ||
      name.includes('marriott') || name.includes('hilton') || name.includes('hyatt')) {
    return 'hotel';
  }
  // Restaurants/food
  if (style.includes('1577') || desc.includes('gf') || desc.includes('gluten') ||
      desc.includes('menu') || desc.includes('food') || desc.includes('restaurant') ||
      name.includes('restaurant') || name.includes('café') || name.includes('cafe') ||
      name.includes('pizza') || name.includes('sushi') || name.includes('brgr') ||
      name.includes('bakery') || name.includes('grill')) {
    return 'restaurant';
  }
  // Transit
  if (name.includes('airport') || name.includes('station') || name.includes('bus') ||
      name.includes('ferry') || name.includes('terminal')) {
    return 'transit';
  }
  // Activities
  if (desc.includes('tour') || desc.includes('ticket') || desc.includes('book') ||
      name.includes('museum') || name.includes('tour') || name.includes('class')) {
    return 'activity';
  }
  // Markets/shops
  if (name.includes('market') || name.includes('shop') || name.includes('store') ||
      name.includes('mall') || name.includes('supermarket')) {
    return 'market';
  }
  // Default to landmark
  return 'landmark';
}

// ─── Main ────────────────────────────────────────────────────────────────────

const wb = XLSX.readFile(XLSX_PATH);
const ws = wb.Sheets['places'];
const data = XLSX.utils.sheet_to_json(ws);

// Load all KML files into a lookup: { cityName: [placemarks] }
const kmlByCity = {};
const kmlFiles = fs.readdirSync(KML_DIR).filter(f => f.endsWith('.kml'));

for (const f of kmlFiles) {
  const content = fs.readFileSync(path.join(KML_DIR, f), 'utf8');
  const folders = parseFolders(content);
  for (const folder of folders) {
    // Normalize folder city name
    let cityName = folder.name
      .replace(/, (Finland|Norway|Czech Republic|Spain|Sweden|England|Ireland)$/i, '')
      .replace(/^Isle of Skye - /, '')
      .replace(/ & Uppsala/, '')
      .replace(/ \/ Mt Fuji/, '')
      .trim();
    if (!kmlByCity[cityName]) kmlByCity[cityName] = [];
    kmlByCity[cityName].push(...folder.placemarks.map(p => ({ ...p, sourceFile: f, folderName: folder.name })));
  }
}

console.log('KML cities loaded:', Object.keys(kmlByCity).sort().join(', '));
console.log('');

// ─── 1. Backfill missing coordinates ─────────────────────────────────────────

console.log('=== COORDINATE BACKFILL ===\n');
const missingCoords = data.filter(r => r.place_name && (!r.latitude || !r.longitude));
let backfilled = 0;

for (const row of missingCoords) {
  const cityPlaces = kmlByCity[row.city] || [];
  let bestMatch = null;
  let bestScore = 0;

  for (const kp of cityPlaces) {
    const score = fuzzyMatch(row.place_name, kp.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = kp;
    }
  }

  if (bestMatch && bestScore >= 0.7) {
    console.log(`  MATCH: "${row.place_name}" (${row.city}) → "${bestMatch.name}" [${bestMatch.lat.toFixed(6)}, ${bestMatch.lng.toFixed(6)}] (score: ${bestScore})`);
    if (doWrite) {
      row.latitude = bestMatch.lat;
      row.longitude = bestMatch.lng;
    }
    backfilled++;
  } else if (bestMatch && bestScore > 0) {
    console.log(`  WEAK:  "${row.place_name}" (${row.city}) ~ "${bestMatch.name}" (score: ${bestScore}) — skipped`);
  } else {
    console.log(`  MISS:  "${row.place_name}" (${row.city}) — no KML match found`);
  }
}

console.log(`\nBackfill: ${backfilled} of ${missingCoords.length} rows matched\n`);

// ─── 2. Import new cities from KML ──────────────────────────────────────────

if (importCity && importCountry && importMap) {
  console.log(`=== IMPORTING: ${importCity}, ${importCountry} from ${importMap} ===\n`);

  const kmlPath = path.join(KML_DIR, importMap);
  if (!fs.existsSync(kmlPath)) {
    console.error(`ERROR: KML file not found: ${importMap}`);
    process.exit(1);
  }

  const content = fs.readFileSync(kmlPath, 'utf8');
  const folders = parseFolders(content);

  // Find matching folder
  const matchingFolder = folders.find(f => {
    const folderCity = f.name
      .replace(/, (Finland|Norway|Czech Republic|Spain|Sweden|England|Ireland)$/i, '')
      .trim();
    return normalize(folderCity) === normalize(importCity);
  });

  if (!matchingFolder) {
    console.error(`ERROR: No folder matching "${importCity}" in ${importMap}`);
    console.log('Available folders:', folders.map(f => f.name).join(', '));
    process.exit(1);
  }

  // Check for existing rows
  const existingNames = data
    .filter(r => normalize(r.city || '') === normalize(importCity))
    .map(r => normalize(r.place_name));

  let imported = 0;
  let skipped = 0;

  for (const pm of matchingFolder.placemarks) {
    if (existingNames.some(n => fuzzyMatch(n, normalize(pm.name)) >= 0.7)) {
      console.log(`  SKIP (exists): ${pm.name}`);
      skipped++;
      continue;
    }

    const placeType = guessPlaceType(pm);
    const newRow = {
      country: importCountry,
      city: importCity,
      place_name: pm.name,
      place_type: placeType,
      latitude: pm.lat,
      longitude: pm.lng,
      source_map_name: importMap.replace('.kml', ''),
      notes: pm.desc || '',
    };

    console.log(`  ADD: ${pm.name} (${placeType}) [${pm.lat.toFixed(4)}, ${pm.lng.toFixed(4)}]${pm.desc ? ' — ' + pm.desc.substring(0, 60) : ''}`);

    if (doWrite) {
      data.push(newRow);
    }
    imported++;
  }

  console.log(`\nImported: ${imported} new, ${skipped} already existed\n`);
}

// ─── 2b. Import ALL cities from a KML file ────────────────────────────────

if (importAll && importCountry && importMap) {
  console.log(`=== IMPORTING ALL CITIES from ${importMap} (country: ${importCountry}) ===\n`);

  const kmlPath = path.join(KML_DIR, importMap);
  if (!fs.existsSync(kmlPath)) {
    console.error(`ERROR: KML file not found: ${importMap}`);
    process.exit(1);
  }

  const content = fs.readFileSync(kmlPath, 'utf8');
  const folders = parseFolders(content);

  let totalImported = 0;
  let totalSkipped = 0;

  for (const folder of folders) {
    // Extract city name from folder name (strip country suffix, date suffix)
    let cityName = folder.name
      .replace(/, (Germany|Finland|Norway|Czech Republic|Spain|Sweden|England|Ireland)$/i, '')
      .replace(/ \((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}\)/i, '')
      .trim();

    console.log(`--- ${cityName} (${folder.count} placemarks) ---`);

    // Check for existing rows in this city
    const existingNames = data
      .filter(r => normalize(r.city || '') === normalize(cityName))
      .map(r => normalize(r.place_name));

    let imported = 0;
    let skipped = 0;

    for (const pm of folder.placemarks) {
      if (existingNames.some(n => fuzzyMatch(n, normalize(pm.name)) >= 0.7)) {
        console.log(`  SKIP (exists): ${pm.name}`);
        skipped++;
        continue;
      }

      const placeType = guessPlaceType(pm);
      const newRow = {
        country: importCountry,
        city: cityName,
        place_name: pm.name,
        place_type: placeType,
        latitude: pm.lat,
        longitude: pm.lng,
        source_map_name: importMap.replace('.kml', ''),
        notes: pm.desc || '',
      };

      console.log(`  ADD: ${pm.name} (${placeType}) [${pm.lat.toFixed(4)}, ${pm.lng.toFixed(4)}]${pm.desc ? ' — ' + pm.desc.substring(0, 60) : ''}`);

      if (doWrite) {
        data.push(newRow);
      }
      imported++;
    }

    console.log(`  → ${imported} new, ${skipped} already existed\n`);
    totalImported += imported;
    totalSkipped += skipped;
  }

  console.log(`Total: ${totalImported} imported, ${totalSkipped} skipped\n`);
}

// ─── 3. Write back ──────────────────────────────────────────────────────────

if (doWrite) {
  const newWs = XLSX.utils.json_to_sheet(data);
  wb.Sheets['places'] = newWs;
  XLSX.writeFile(wb, XLSX_PATH);
  console.log('✓ Spreadsheet updated: ' + XLSX_PATH);
} else {
  console.log('DRY RUN — no changes written. Use --write to apply changes.');
}
