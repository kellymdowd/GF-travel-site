#!/usr/bin/env node
// Recomputes the Continents / Countries Visited / Cities Explored stats on about.html
// by parsing the "Where I've Been" timeline itself — NOT by counting built country/city
// pages. The timeline is the authoritative "have I actually been there" ledger and
// routinely runs ahead of the site's page-building (e.g. Mexico and the USA have
// timeline entries with real trip dates but no dedicated pages yet). Counting built
// pages instead would just recreate the staleness this script exists to fix.
//
//
// Timeline convention: separate multiple cities with commas, e.g.
// "— Edinburgh, Glasgow, Portree". For a US-style "City, ST" qualifier, use
// parentheses instead — "Santa Barbara (CA)" — since a bare comma there gets
// misparsed as two separate cities ("Santa Barbara" and "CA").
//
// Usage: node scripts/update-about-stats.js [--dry-run]

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ABOUT_PATH = path.join(ROOT, 'about.html');
const DRY_RUN = process.argv.includes('--dry-run');

// Country -> continent. Extend this as new countries are logged in the timeline.
const CONTINENT_MAP = {
  'Austria': 'Europe', 'Slovakia': 'Europe', 'Hungary': 'Europe', 'Liechtenstein': 'Europe',
  'Switzerland': 'Europe', 'Ireland': 'Europe', 'Netherlands': 'Europe', 'Germany': 'Europe',
  'Norway': 'Europe', 'Sweden': 'Europe', 'Finland': 'Europe', 'Italy': 'Europe',
  'Czech Republic': 'Europe', 'Spain': 'Europe', 'England': 'Europe', 'France': 'Europe',
  'Scotland': 'Europe',
  'Sri Lanka': 'Asia', 'India': 'Asia', 'Maldives': 'Asia', 'Japan': 'Asia',
  'Mexico': 'North America', 'Canada': 'North America', 'USA': 'North America',
  'Costa Rica': 'North America', 'Jamaica': 'North America',
  'New Zealand': 'Oceania',
};

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code));
}

function main() {
  const html = fs.readFileSync(ABOUT_PATH, 'utf8');

  const timelineMatch = html.match(/<div class="timeline">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="bio-rule">/);
  if (!timelineMatch) {
    console.error('Could not find the timeline block in about.html — aborting without changes.');
    process.exit(1);
  }
  const timelineHtml = timelineMatch[1];

  const destRe = /<span class="timeline-dest">([\s\S]*?)<span class="timeline-cities">([\s\S]*?)<\/span><\/span>/g;
  const countries = new Set();
  const cities = new Set();
  const unmappedCountries = new Set();
  let match;

  while ((match = destRe.exec(timelineHtml))) {
    const countryPart = decodeEntities(match[1]).replace(/<[^>]+>/g, '').trim();
    const citiesPart = decodeEntities(match[2]).replace(/<[^>]+>/g, '').replace(/^—\s*/, '').trim();

    countryPart.split(/,|&/).map(s => s.trim()).filter(Boolean).forEach(c => {
      countries.add(c);
      if (!CONTINENT_MAP[c]) unmappedCountries.add(c);
    });

    citiesPart.split(',').map(s => s.trim()).filter(Boolean).forEach(c => cities.add(c));
  }

  if (unmappedCountries.size) {
    console.error('Unrecognized countries — add them to CONTINENT_MAP before this can run cleanly:');
    unmappedCountries.forEach(c => console.error('  ' + c));
    process.exit(1);
  }

  const continents = new Set([...countries].map(c => CONTINENT_MAP[c]));

  console.log(`Continents: ${continents.size} (${[...continents].sort().join(', ')})`);
  console.log(`Countries Visited: ${countries.size}`);
  console.log(`Cities Explored: ${cities.size}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Not writing changes.');
    return;
  }

  let updated = html;
  updated = updated.replace(
    /<span class="stat-number">[^<]*<\/span>(\s*<span class="stat-label">Continents<\/span>)/,
    `<span class="stat-number">${continents.size}</span>$1`
  );
  updated = updated.replace(
    /<span class="stat-number">[^<]*<\/span>(\s*<span class="stat-label">Countries Visited<\/span>)/,
    `<span class="stat-number">${countries.size}</span>$1`
  );
  updated = updated.replace(
    /<span class="stat-number">[^<]*<\/span>(\s*<span class="stat-label">Cities Explored<\/span>)/,
    `<span class="stat-number">${cities.size}</span>$1`
  );

  if (updated === html) {
    console.log('\nNo changes needed — stats already match the timeline.');
    return;
  }

  fs.writeFileSync(ABOUT_PATH, updated);
  console.log('\nabout.html stats updated.');
}

main();
