#!/usr/bin/env node
// Writes research findings back to travel_master.xlsx after a city page build.
// Takes a JSON file of research results and updates matching spreadsheet rows.
//
// Usage:
//   node scripts/write-back-research.js research-output.json           # dry run
//   node scripts/write-back-research.js research-output.json --write   # apply
//
// The research JSON should have this structure:
// {
//   "city": "Tokyo",
//   "country": "Japan",
//   "date": "2026-03-29",
//   "restaurants": [
//     {
//       "name": "Gluten Free T's Kitchen",
//       "status": "open",
//       "fmgf_url": "https://...",       // verified URL, "stale", or null
//       "gf_score": 5,                    // celiac_safety_score (1-5)
//       "gf_category": "100% dedicated GF",
//       "gf_notes": "Fully dedicated GF kitchen, amazing ramen...",
//       "booking_url": null
//     }
//   ],
//   "hotels": [
//     {
//       "name": "The Okura Tokyo",
//       "booking_url": "https://hotels.com/...",
//       "gf_notes": "GF breakfast options available on request"
//     }
//   ],
//   "activities": [
//     {
//       "name": "teamLab Borderless",
//       "booking_url": "https://viator.com/..."
//     }
//   ]
// }

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..');
const XLSX_PATH = path.join(ROOT, 'travel_master.xlsx');

// Parse args
const args = process.argv.slice(2);
const jsonFile = args.find(a => !a.startsWith('--'));
const doWrite = args.includes('--write');

if (!jsonFile) {
  console.log('Usage: node scripts/write-back-research.js <research.json> [--write]');
  process.exit(1);
}

const research = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
console.log(`Research for: ${research.city}, ${research.country} (${research.date})\n`);

// Load spreadsheet
const wb = XLSX.readFile(XLSX_PATH);
const ws = wb.Sheets['places'];
const data = XLSX.utils.sheet_to_json(ws);

// Normalize for matching
function normalize(s) {
  return (s || '').toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[āáàâä]/g, 'a').replace(/[ēéèêë]/g, 'e')
    .replace(/[īíìîï]/g, 'i').replace(/[ōóòôöø]/g, 'o')
    .replace(/[ūúùûü]/g, 'u')
    .replace(/\s+/g, ' ').trim();
}

function findRow(name, city) {
  const target = normalize(name);
  return data.find(r =>
    normalize(r.city) === normalize(city) &&
    (normalize(r.place_name) === target ||
     normalize(r.place_name).includes(target) ||
     target.includes(normalize(r.place_name)))
  );
}

let updated = 0;
let notFound = 0;

// ─── Restaurant updates ──────────────────────────────────────────────────────

if (research.restaurants) {
  console.log('=== RESTAURANTS ===\n');
  for (const r of research.restaurants) {
    const row = findRow(r.name, research.city);
    if (!row) {
      console.log(`  NOT FOUND: ${r.name}`);
      notFound++;
      continue;
    }

    const changes = [];

    // Update status — if closed, add note
    if (r.status === 'closed') {
      const note = `[${research.date}] Verified CLOSED`;
      if (!row['post-visit-notes'] || !row['post-visit-notes'].includes('CLOSED')) {
        row['post-visit-notes'] = row['post-visit-notes']
          ? row['post-visit-notes'] + '; ' + note
          : note;
        changes.push('marked closed');
      }
    }

    // Update GF category
    if (r.gf_category && r.gf_category !== row.gf_category) {
      changes.push(`gf_category: "${row.gf_category || 'empty'}" → "${r.gf_category}"`);
      if (doWrite) row.gf_category = r.gf_category;
    }

    // Update celiac safety score
    if (r.gf_score != null && r.gf_score !== row.celiac_safety_score) {
      changes.push(`celiac_safety_score: ${row.celiac_safety_score || 'empty'} → ${r.gf_score}`);
      if (doWrite) row.celiac_safety_score = r.gf_score;
    }

    // Update FMGF URL
    if (r.fmgf_url && r.fmgf_url !== 'stale') {
      if (r.fmgf_url !== row.fmgf_url) {
        changes.push(`fmgf_url: updated`);
        if (doWrite) row.fmgf_url = r.fmgf_url;
      }
    } else if (r.fmgf_url === 'stale' && row.fmgf_url) {
      changes.push(`fmgf_url: STALE (cleared)`);
      if (doWrite) row.fmgf_url = '';
    }

    // Append GF notes to post-visit-notes
    if (r.gf_notes && r.status !== 'closed') {
      const existing = row['post-visit-notes'] || '';
      const tag = `[${research.date} research]`;
      if (!existing.includes(tag)) {
        const note = `${tag} ${r.gf_notes}`;
        if (doWrite) {
          row['post-visit-notes'] = existing ? existing + '; ' + note : note;
        }
        changes.push('added gf_notes');
      }
    }

    if (changes.length > 0) {
      console.log(`  UPDATE: ${r.name} — ${changes.join(', ')}`);
      updated++;
    } else {
      console.log(`  NO CHANGE: ${r.name}`);
    }
  }
}

// ─── Hotel updates ───────────────────────────────────────────────────────────

if (research.hotels) {
  console.log('\n=== HOTELS ===\n');
  for (const h of research.hotels) {
    const row = findRow(h.name, research.city);
    if (!row) {
      console.log(`  NOT FOUND: ${h.name}`);
      notFound++;
      continue;
    }

    const changes = [];

    if (h.booking_url && h.booking_url !== row.URL) {
      changes.push(`URL: ${row.URL ? 'updated' : 'added'}`);
      if (doWrite) row.URL = h.booking_url;
    }

    if (h.gf_notes && h.gf_notes !== row.hotel_gf_notes) {
      changes.push('hotel_gf_notes: updated');
      if (doWrite) row.hotel_gf_notes = h.gf_notes;
    }

    if (changes.length > 0) {
      console.log(`  UPDATE: ${h.name} — ${changes.join(', ')}`);
      updated++;
    } else {
      console.log(`  NO CHANGE: ${h.name}`);
    }
  }
}

// ─── Activity updates ────────────────────────────────────────────────────────

if (research.activities) {
  console.log('\n=== ACTIVITIES ===\n');
  for (const a of research.activities) {
    const row = findRow(a.name, research.city);
    if (!row) {
      console.log(`  NOT FOUND: ${a.name}`);
      notFound++;
      continue;
    }

    const changes = [];

    if (a.booking_url && a.booking_url !== row.URL) {
      changes.push(`URL: ${row.URL ? 'updated' : 'added'}`);
      if (doWrite) row.URL = a.booking_url;
    }

    if (changes.length > 0) {
      console.log(`  UPDATE: ${a.name} — ${changes.join(', ')}`);
      updated++;
    } else {
      console.log(`  NO CHANGE: ${a.name}`);
    }
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n=== SUMMARY ===`);
console.log(`Updated: ${updated} rows`);
console.log(`Not found: ${notFound} places`);

if (doWrite && updated > 0) {
  const newWs = XLSX.utils.json_to_sheet(data);
  wb.Sheets['places'] = newWs;
  XLSX.writeFile(wb, XLSX_PATH);
  console.log(`\n✓ Spreadsheet updated: ${XLSX_PATH}`);
} else if (!doWrite) {
  console.log('\nDRY RUN — use --write to apply changes.');
} else {
  console.log('\nNo changes to write.');
}
