#!/usr/bin/env node
/**
 * Generates a site-wide pipeline status dashboard: for every country/city the
 * site knows about (from travel_master.xlsx and/or an actual built page),
 * reports whether a page exists, whether it currently passes structural
 * validation, and whether a blog post / Instagram post has been generated.
 *
 * This is a PULL model, not a push model: "validated" is recomputed live by
 * actually running validate-city-page.js's fast structural checks against
 * the page on disk right now, rather than reading a stored historical flag
 * that could go stale if the page changed since some other skill last wrote
 * it. That means re-running this script always reflects current file state.
 *
 * Blog generation has no pipeline yet — always false. Instagram generation
 * is detected heuristically: does instagram/[country]-batch*.html exist and
 * mention this city's name.
 *
 * Usage:
 *   node scripts/generate-pipeline-status.js
 * Outputs:
 *   pipeline-status.json  — structured data, git-tracked
 *   pipeline-status.html  — rendered table, git-tracked
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const XLSX = require('xlsx');

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function titleCase(slug) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── Skip list (project_skip_cities.md) — cities in the spreadsheet that
//     were never actually visited and should never get a page. Shown as
//     "Skipped" rather than counted as a gap. ─────────────────────────────
const SKIP_CITIES = new Set(['hiroshima', 'doolin', 'cork', 'limerick']);

// ─── 1. Universe from the spreadsheet ──────────────────────────────────────
const wb = XLSX.readFile(path.join(repoRoot, 'travel_master.xlsx'));
const rows = XLSX.utils.sheet_to_json(wb.Sheets['places']);

const countries = {}; // slug -> { name, cities: { slug -> {name, inSpreadsheet, pageExists, pagePath} } }

function ensureCountry(name) {
  const slug = slugify(name);
  if (!countries[slug]) countries[slug] = { slug, name, cities: {} };
  return countries[slug];
}
function ensureCity(country, cityName) {
  const slug = slugify(cityName);
  if (!country.cities[slug]) {
    country.cities[slug] = { slug, name: cityName, inSpreadsheet: false, pageExists: false, pagePath: null };
  }
  return country.cities[slug];
}

for (const r of rows) {
  if (!r.country || !r.city) continue;
  const country = ensureCountry(r.country);
  const city = ensureCity(country, r.city);
  city.inSpreadsheet = true;
}

// ─── 2. Reconcile against actual built pages on disk — the spreadsheet is
//     occasionally incomplete/stale relative to what's actually been built
//     (confirmed: e.g. Germany has 7 built city pages but only 1 spreadsheet
//     row), so built pages are added even if missing from the spreadsheet. ─
const countriesDir = path.join(repoRoot, 'countries');
const countryPageExists = {}; // slug -> bool

for (const entry of fs.readdirSync(countriesDir, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.html')) {
    countryPageExists[path.basename(entry.name, '.html')] = true;
  }
}
for (const entry of fs.readdirSync(countriesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const countrySlug = entry.name;
  const country = countries[countrySlug] || (countries[countrySlug] = { slug: countrySlug, name: titleCase(countrySlug), cities: {} });
  const cityFiles = fs.readdirSync(path.join(countriesDir, entry.name)).filter((f) => f.endsWith('.html'));
  for (const f of cityFiles) {
    const citySlug = path.basename(f, '.html');
    const city = country.cities[citySlug] || (country.cities[citySlug] = { slug: citySlug, name: titleCase(citySlug), inSpreadsheet: false, pageExists: false, pagePath: null });
    city.pageExists = true;
    city.pagePath = path.join('countries', entry.name, f);
  }
}

// ─── 3. Instagram-generated detection (heuristic — no formal pipeline yet).
//     Batches are named instagram/[country]-batch*.html and are trip-level,
//     not strictly one-per-city, so presence of the city's name in that
//     file is treated as "covered." ─────────────────────────────────────
const instagramDir = path.join(repoRoot, 'instagram');
const instagramBatches = fs.existsSync(instagramDir)
  ? fs.readdirSync(instagramDir).filter((f) => f.endsWith('.html') && f.includes('batch'))
  : [];
const instagramBatchContent = {};
for (const f of instagramBatches) {
  instagramBatchContent[f] = fs.readFileSync(path.join(instagramDir, f), 'utf-8').toLowerCase();
}
function instagramGeneratedFor(countrySlug, cityName) {
  const needle = cityName.toLowerCase();
  return instagramBatches.some((f) => f.startsWith(countrySlug) && instagramBatchContent[f].includes(needle));
}

// ─── 3.5. Content safety audit status — read from the ledger, since the
//     city-content-auditor skill is on-demand (not part of the automated
//     build pipeline) and has no live-recomputable signal like validation
//     does. content-safety-audit-status.json is updated manually/by an
//     agent after each audit run. ─────────────────────────────────────────
const auditStatusPath = path.join(repoRoot, 'content-safety-audit-status.json');
const auditStatus = fs.existsSync(auditStatusPath)
  ? JSON.parse(fs.readFileSync(auditStatusPath, 'utf-8')).audits || {}
  : {};
function contentAuditFor(countrySlug, citySlug) {
  return auditStatus[`${countrySlug}/${citySlug}`] || null;
}

// ─── 3.55. Packing/FAQ template migration — kept separate from the content
//     safety audit on purpose. This is purely mechanical/structural (the
//     Scotland-template rollout: packing consolidated onto the country
//     page, visible FAQ accordion added) and is live-recomputable from the
//     page itself, same PULL model as validation — it doesn't need a
//     ledger. Conflating this with content-safety findings is what caused
//     Bengaluru/Goa to show as "issues pending" in that column when their
//     actual content was clean; the real gap was just template debt. ─────
function templateMigrationFor(pagePath) {
  const html = fs.readFileSync(path.join(repoRoot, pagePath), 'utf-8');
  const hasOldPackingSection = /id="what-to-pack"/.test(html);
  const hasVisibleFaq = /class="faq-item"/.test(html);
  const hasFaqCss = /\.faq-item\.is-open \.faq-a/.test(html);
  return !hasOldPackingSection && hasVisibleFaq && hasFaqCss;
}

// ─── 3.6. Itineraries — trips + per-city itinerary coverage. The master
//     trip inventory is about.html's own "Where I've Been" timeline, not
//     itineraries/index.html — the timeline lists every trip Kelly has
//     taken (including ones with no itinerary page yet), and a trip's
//     destination is wrapped in <a href="itineraries/[slug]"> once that
//     page exists. That gives both the full trip list AND the
//     itinerary-created signal in one pass, instead of only seeing the
//     trips someone already remembered to build. ───────────────────────────
const aboutHtml = fs.readFileSync(path.join(repoRoot, 'about.html'), 'utf-8');
const timelineSection = aboutHtml.match(/<div class="timeline">([\s\S]*?)<div class="bio-rule">/)[1];
const yearChunks = timelineSection.split('<div class="timeline-year">').slice(1);

const trips = []; // { year, month, destination, cities: [...], itinerarySlug }
for (const chunk of yearChunks) {
  const yearMatch = chunk.match(/<div class="timeline-year-label">(\d{4})<\/div>/);
  if (!yearMatch) continue;
  const year = yearMatch[1];
  const tripBlocks = [...chunk.matchAll(/<div class="timeline-trip">([\s\S]*?)<\/div>/g)];
  for (const [, tripHtml] of tripBlocks) {
    const monthMatch = tripHtml.match(/<span class="timeline-month">([^<]+)<\/span>/);
    const destOpenIdx = tripHtml.indexOf('<span class="timeline-dest">') + '<span class="timeline-dest">'.length;
    const citiesOpenIdx = tripHtml.indexOf('<span class="timeline-cities">');
    if (destOpenIdx < 0 || citiesOpenIdx < 0) continue;
    const destInner = tripHtml.slice(destOpenIdx, citiesOpenIdx);
    const linkMatch = destInner.match(/<a href="itineraries\/([^"]+)">([^<]+)<\/a>/);
    const destination = (linkMatch ? linkMatch[2] : destInner).trim();
    const itinerarySlug = linkMatch ? linkMatch[1] : null;
    const citiesRaw = tripHtml.slice(citiesOpenIdx);
    const citiesMatch = citiesRaw.match(/—\s*([^<]+)/);
    const cities = citiesMatch ? citiesMatch[1].split(',').map((c) => c.trim()) : [];
    trips.push({ year, month: monthMatch ? monthMatch[1] : '', destination, cities, itinerarySlug });
  }
}

// itineraries/index.html tags each built page as "Full Trip" or "City Stop"
// — reuse that human-curated tier rather than re-inferring it from page
// content (e.g. presence of a route-map script).
const itinerariesIndexPath = path.join(repoRoot, 'itineraries', 'index.html');
const itineraryTier = {}; // slug -> 'Full Trip' | 'City Stop'
if (fs.existsSync(itinerariesIndexPath)) {
  const idxHtml = fs.readFileSync(itinerariesIndexPath, 'utf-8');
  const cardMatches = [...idxHtml.matchAll(/<a href="([^"]+)" class="trip-card">\s*<span class="trip-card-tier">([^<]+)<\/span>/g)];
  for (const [, slug, tier] of cardMatches) itineraryTier[slug] = tier;
}

// Build citySlug -> countrySlug lookup from the already-scanned countries
// object (step 2), so a Full Trip's ROUTE array can be matched to a city
// purely by slug — several Full Trip pages (e.g. the single-country
// Scotland trip) don't bother setting a per-stop countrySlug at all.
const citySlugToCountrySlug = {};
for (const country of Object.values(countries)) {
  for (const citySlug of Object.keys(country.cities)) {
    citySlugToCountrySlug[citySlug] = country.slug;
  }
}

// cityItinerary: `${countrySlug}/${citySlug}` -> { type, tripSlug, tripLabel }
// type is 'city-stop' | 'stop' | 'day-trip'. City Stop pages win over a
// Full Trip "stop" entry for the same city (more specific coverage).
const cityItinerary = {};
function setCityItinerary(countrySlug, citySlug, entry) {
  const key = `${countrySlug}/${citySlug}`;
  const existing = cityItinerary[key];
  if (existing && existing.type === 'city-stop') return; // already the most specific
  cityItinerary[key] = entry;
}

const itinerariesDir = path.join(repoRoot, 'itineraries');
const itineraryFiles = fs.existsSync(itinerariesDir)
  ? fs.readdirSync(itinerariesDir).filter((f) => f.endsWith('.html') && f !== 'index.html')
  : [];

const tripCityStops = {}; // tripSlug -> [{ slug, cityStopSlug|null }]
for (const file of itineraryFiles) {
  const slug = path.basename(file, '.html');
  const tier = itineraryTier[slug];
  const html = fs.readFileSync(path.join(itinerariesDir, file), 'utf-8');

  if (tier === 'Full Trip') {
    const routeMatch = html.match(/const ROUTE\s*=\s*\[([\s\S]*?)\];/);
    const stops = [];
    if (routeMatch) {
      const entryMatches = [...routeMatch[1].matchAll(/slug:\s*'([^']+)'/g)];
      for (const [, citySlug] of entryMatches) {
        const countrySlug = citySlugToCountrySlug[citySlug];
        if (!countrySlug) continue; // no matching built city page — skip rather than guess
        setCityItinerary(countrySlug, citySlug, { type: 'stop', tripSlug: slug });
        stops.push(citySlug);
      }
    }
    tripCityStops[slug] = stops;
  } else if (tier === 'City Stop') {
    // Filename convention: {city-slug}-{N}-days.html
    const cityMatch = slug.match(/^(.+)-\d+-days$/);
    const citySlug = cityMatch ? cityMatch[1] : null;
    const countrySlug = citySlug ? citySlugToCountrySlug[citySlug] : null;
    if (countrySlug) setCityItinerary(countrySlug, citySlug, { type: 'city-stop', tripSlug: slug });
  }
}

// Day-trip-only stops: mentioned in a Full Trip's day-prose but with no
// route-map pin of their own (visited as a day trip from a nearby
// overnight stop). Small, stable list — update when a new day-trip
// itinerary pattern ships. Skipped if the parent Full Trip doesn't exist.
const ITINERARY_DAY_TRIPS = [
  { countrySlug: 'slovakia', citySlug: 'bratislava', tripSlug: 'austria-slovakia-hungary-liechtenstein-switzerland-2023' },
  { countrySlug: 'austria', citySlug: 'hallstatt', tripSlug: 'austria-slovakia-hungary-liechtenstein-switzerland-2023' },
  { countrySlug: 'sweden', citySlug: 'uppsala', tripSlug: 'norway-sweden-finland-2019' },
  { countrySlug: 'japan', citySlug: 'nara', tripSlug: 'japan-2025' },
];
for (const { countrySlug, citySlug, tripSlug } of ITINERARY_DAY_TRIPS) {
  if (itineraryTier[tripSlug]) setCityItinerary(countrySlug, citySlug, { type: 'day-trip', tripSlug });
}

function itineraryLabelFor(countrySlug, citySlug) {
  return cityItinerary[`${countrySlug}/${citySlug}`] || null;
}

// ─── 4. Validation — run the fast structural-only pass (no network, no
//     puppeteer) live against every existing page. ─────────────────────────
function validatePage(pagePath) {
  try {
    const out = execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'validate-city-page.js'), pagePath, '--no-links', '--no-screenshots'],
      { cwd: repoRoot, encoding: 'utf-8' }
    );
    const result = JSON.parse(out);
    return { errors: result.errors.length, warnings: result.warnings.length, info: result.info.length };
  } catch (e) {
    // Non-zero exit still prints JSON to stdout before exiting 1 — recover it.
    if (e.stdout) {
      try {
        const result = JSON.parse(e.stdout);
        return { errors: result.errors.length, warnings: result.warnings.length, info: result.info.length };
      } catch (_) { /* fall through */ }
    }
    return { errors: null, warnings: null, info: null, validationFailed: true };
  }
}

// ─── 5. Assemble rows ──────────────────────────────────────────────────────
const countryRows = [];
const cityRows = [];

for (const country of Object.values(countries).sort((a, b) => a.name.localeCompare(b.name))) {
  const pageExists = !!countryPageExists[country.slug];
  countryRows.push({
    type: 'country',
    country: country.name,
    countrySlug: country.slug,
    pageCreated: pageExists,
    pagePath: pageExists ? `countries/${country.slug}.html` : null,
    validated: null, // no country-page validator exists yet — tracked as a known follow-up
    blogGenerated: false,
    instagramGenerated: false,
  });

  for (const city of Object.values(country.cities).sort((a, b) => a.name.localeCompare(b.name))) {
    const skipped = SKIP_CITIES.has(city.slug);
    let validated = null;
    let validationCounts = null;
    if (city.pageExists && !skipped) {
      validationCounts = validatePage(city.pagePath);
      validated = validationCounts.errors === 0;
    }
    const contentAudit = city.pageExists && !skipped ? contentAuditFor(country.slug, city.slug) : null;
    const itinerary = skipped ? null : itineraryLabelFor(country.slug, city.slug);
    const templateMigrated = city.pageExists && !skipped ? templateMigrationFor(city.pagePath) : null;
    cityRows.push({
      type: 'city',
      country: country.name,
      countrySlug: country.slug,
      city: city.name,
      citySlug: city.slug,
      skipped,
      pageCreated: city.pageExists,
      pagePath: city.pagePath,
      validated,
      validationCounts,
      blogGenerated: false,
      instagramGenerated: city.pageExists && !skipped ? instagramGeneratedFor(country.slug, city.name) : false,
      contentAudit,
      itinerary,
      templateMigrated,
    });
  }
}

// Trip rows — one per about.html timeline entry, newest first (timeline is
// already in that order). "City Stops" lists any dedicated City Stop pages
// nested under this trip: a city that's a ROUTE stop in this Full Trip
// AND separately has its own city-stop.html itinerary page.
const tripRows = trips.map((t) => {
  const stopCitySlugs = t.itinerarySlug ? (tripCityStops[t.itinerarySlug] || []) : [];
  const cityStopSlugs = [...new Set(
    stopCitySlugs
      .map((citySlug) => {
        const countrySlug = citySlugToCountrySlug[citySlug];
        const entry = countrySlug ? cityItinerary[`${countrySlug}/${citySlug}`] : null;
        return entry && entry.type === 'city-stop' ? entry.tripSlug : null;
      })
      .filter(Boolean)
  )];
  return {
    year: t.year,
    month: t.month,
    destination: t.destination,
    cities: t.cities,
    itinerarySlug: t.itinerarySlug,
    itineraryCreated: !!t.itinerarySlug,
    cityStopSlugs,
  };
});

const generatedAt = new Date().toISOString();
const summary = {
  countries: countryRows.length,
  countryPagesCreated: countryRows.filter((r) => r.pageCreated).length,
  cities: cityRows.length,
  citiesSkipped: cityRows.filter((r) => r.skipped).length,
  cityPagesCreated: cityRows.filter((r) => r.pageCreated).length,
  cityPagesValidated: cityRows.filter((r) => r.validated === true).length,
  cityPagesFailingValidation: cityRows.filter((r) => r.validated === false).length,
  blogsGenerated: cityRows.filter((r) => r.blogGenerated).length,
  instagramGenerated: cityRows.filter((r) => r.instagramGenerated).length,
  contentAuditRun: cityRows.filter((r) => r.contentAudit && r.contentAudit.audited).length,
  contentAuditNotRun: cityRows.filter((r) => r.pageCreated && !r.skipped && !(r.contentAudit && r.contentAudit.audited)).length,
  templateMigrated: cityRows.filter((r) => r.templateMigrated === true).length,
  templateNotMigrated: cityRows.filter((r) => r.templateMigrated === false).length,
  trips: tripRows.length,
  tripsWithItinerary: tripRows.filter((r) => r.itineraryCreated).length,
  citiesWithItineraryCoverage: cityRows.filter((r) => r.pageCreated && !r.skipped && r.itinerary).length,
};

const output = { generatedAt, summary, countries: countryRows, cities: cityRows, trips: tripRows };
fs.writeFileSync(path.join(repoRoot, 'pipeline-status.json'), JSON.stringify(output, null, 2));

// ─── 6. Render HTML table ───────────────────────────────────────────────
function statusCell(value, { skipped } = {}) {
  if (skipped) return '<span class="dot dot-skip"></span>Skipped';
  if (value === true) return '<span class="dot dot-yes"></span>Yes';
  if (value === false) return '<span class="dot dot-no"></span>No';
  return '<span class="dot dot-na"></span>—';
}

function contentAuditCell(contentAudit, { skipped } = {}) {
  if (skipped) return '<span class="dot dot-skip"></span>Skipped';
  if (!contentAudit || !contentAudit.audited) return '<span class="dot dot-na"></span>Not run';
  const dateStr = contentAudit.lastAuditDate ? ` <span class="counts">(${contentAudit.lastAuditDate})</span>` : '';
  if (contentAudit.status === 'issues-found-pending') {
    return `<span class="dot dot-no"></span>Issues pending${dateStr}`;
  }
  if (contentAudit.status === 'issues-found-and-fixed') {
    return `<span class="dot dot-yes"></span>Fixed${dateStr}`;
  }
  if (contentAudit.status === 'reviewed-kept-as-is') {
    return `<span class="dot dot-yes"></span>Reviewed, kept${dateStr}`;
  }
  return `<span class="dot dot-yes"></span>Clean${dateStr}`;
}

function templateCell(templateMigrated, { skipped } = {}) {
  if (skipped) return '<span class="dot dot-skip"></span>Skipped';
  if (templateMigrated === null) return '<span class="dot dot-na"></span>—';
  return templateMigrated
    ? '<span class="dot dot-yes"></span>Yes'
    : '<span class="dot dot-no"></span>No';
}

function itineraryCell(itinerary, { skipped } = {}) {
  if (skipped) return '<span class="dot dot-skip"></span>Skipped';
  if (!itinerary) return '<span class="dot dot-na"></span>No';
  const href = `itineraries/${itinerary.tripSlug}`;
  if (itinerary.type === 'city-stop') return `<span class="dot dot-yes"></span><a href="${href}">City Stop</a>`;
  if (itinerary.type === 'day-trip') return `<span class="dot dot-yes"></span><a href="${href}">Day trip in Full Trip</a>`;
  return `<span class="dot dot-yes"></span><a href="${href}">Full Trip stop</a>`;
}

const cityTableRows = cityRows.map((r) => {
  const nameCell = r.pagePath
    ? `<a href="${r.pagePath}">${r.city}</a>`
    : r.city;
  const validatedCell = r.skipped
    ? statusCell(null, { skipped: true })
    : r.validated === null
    ? statusCell(null)
    : r.validated
    ? statusCell(true)
    : `<span class="dot dot-no"></span>No <span class="counts">(${r.validationCounts.errors} err${r.validationCounts.errors === 1 ? '' : 's'})</span>`;
  return `<tr class="${r.skipped ? 'row-skipped' : ''}">
    <td>${r.country}</td>
    <td>${nameCell}</td>
    <td>${statusCell(r.skipped ? null : r.pageCreated, { skipped: r.skipped })}</td>
    <td>${validatedCell}</td>
    <td>${contentAuditCell(r.contentAudit, { skipped: r.skipped })}</td>
    <td>${templateCell(r.templateMigrated, { skipped: r.skipped })}</td>
    <td>${itineraryCell(r.itinerary, { skipped: r.skipped })}</td>
    <td>${statusCell(r.skipped ? null : r.blogGenerated, { skipped: r.skipped })}</td>
    <td>${statusCell(r.skipped ? null : r.instagramGenerated, { skipped: r.skipped })}</td>
  </tr>`;
}).join('\n');

const tripTableRows = tripRows.map((t) => {
  const destCell = t.itineraryCreated
    ? `<a href="itineraries/${t.itinerarySlug}">${t.destination}</a>`
    : t.destination;
  const itineraryCell = t.itineraryCreated
    ? '<span class="dot dot-yes"></span>Yes'
    : '<span class="dot dot-no"></span>No';
  const cityStopsCell = t.cityStopSlugs.length
    ? t.cityStopSlugs.map((s) => `<a href="itineraries/${s}">${titleCase(s.replace(/-\d+-days$/, ''))}</a>`).join(', ')
    : '<span class="dot dot-na"></span>—';
  return `<tr>
    <td>${t.year}</td>
    <td>${t.month}</td>
    <td>${destCell}</td>
    <td>${t.cities.join(', ')}</td>
    <td>${itineraryCell}</td>
    <td>${cityStopsCell}</td>
  </tr>`;
}).join('\n');

const countryTableRows = countryRows.map((r) => {
  const nameCell = r.pagePath ? `<a href="${r.pagePath}">${r.country}</a>` : r.country;
  return `<tr>
    <td>${nameCell}</td>
    <td>${statusCell(r.pageCreated)}</td>
    <td>${statusCell(null)}</td>
    <td>${statusCell(r.blogGenerated)}</td>
    <td>${statusCell(r.instagramGenerated)}</td>
  </tr>`;
}).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pipeline Status — GF Gone Global</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root { --cream:#FFFFFF; --slate:#C8717A; --rose:#B8907A; --ink:#2A2018; --ink-mid:#5A5048; --ink-light:#9A907A;
    --yes:#4c8c50; --yes-bg:#eef6ee; --no:#b4463c; --no-bg:#fbecea; --na:#9A907A; --na-bg:#f7f5f1; --skip:#b48c3c; --skip-bg:#fbf5ea; }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Jost',sans-serif;color:var(--ink);background:var(--cream);line-height:1.6;padding:40px 24px 80px;}
  .wrap{max-width:1080px;margin:0 auto;}
  h1{font-family:'Cormorant Garamond',serif;font-weight:400;font-size:32px;letter-spacing:-0.01em;margin-bottom:4px;}
  .timestamp{font-size:12px;color:var(--ink-light);margin-bottom:28px;}
  .summary-strip{display:flex;flex-wrap:wrap;gap:10px 24px;padding:16px 20px;border:1px solid rgba(42,32,24,0.08);border-radius:10px;margin-bottom:32px;font-size:13px;color:var(--ink-mid);}
  .summary-strip strong{color:var(--ink);}
  h2{font-family:'Cormorant Garamond',serif;font-weight:400;font-size:22px;margin:36px 0 14px;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th{text-align:left;font-family:'Jost',sans-serif;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-light);font-weight:500;padding:8px 10px;border-bottom:1px solid rgba(42,32,24,0.12);}
  td{padding:8px 10px;border-bottom:1px solid rgba(42,32,24,0.05);}
  tr.row-skipped td{color:var(--ink-light);}
  a{color:var(--ink);text-decoration:none;border-bottom:1px solid rgba(42,32,24,0.15);}
  a:hover{color:var(--slate);border-color:var(--slate);}
  .dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;position:relative;top:-1px;}
  .dot-yes{background:var(--yes);}
  .dot-no{background:var(--no);}
  .dot-na{background:var(--na);}
  .dot-skip{background:var(--skip);}
  .counts{color:var(--ink-light);font-size:11px;}
</style>
</head>
<body>
<div class="wrap">
  <h1>Pipeline Status</h1>
  <div class="timestamp">Generated ${generatedAt} · regenerate anytime with <code>node scripts/generate-pipeline-status.js</code></div>

  <div class="summary-strip">
    <span><strong>${summary.countries}</strong> countries tracked, <strong>${summary.countryPagesCreated}</strong> with a page</span>
    <span><strong>${summary.cities}</strong> cities tracked (<strong>${summary.citiesSkipped}</strong> skipped — not visited)</span>
    <span><strong>${summary.cityPagesCreated}</strong> city pages built</span>
    <span><strong>${summary.cityPagesValidated}</strong> passing validation, <strong>${summary.cityPagesFailingValidation}</strong> failing</span>
    <span><strong>${summary.contentAuditRun}</strong> content-safety audited, <strong>${summary.contentAuditNotRun}</strong> not yet run</span>
    <span><strong>${summary.templateMigrated}</strong> on the packing/FAQ template, <strong>${summary.templateNotMigrated}</strong> not yet migrated</span>
    <span><strong>${summary.tripsWithItinerary}</strong> of <strong>${summary.trips}</strong> trips have an itinerary, <strong>${summary.citiesWithItineraryCoverage}</strong> cities covered</span>
    <span><strong>${summary.blogsGenerated}</strong> blog posts generated</span>
    <span><strong>${summary.instagramGenerated}</strong> cities with Instagram content</span>
  </div>

  <h2>Countries</h2>
  <table>
    <tr><th>Country</th><th>Page Created</th><th>Validated</th><th>Blog Generated</th><th>Instagram Generated</th></tr>
    ${countryTableRows}
  </table>

  <h2>Cities</h2>
  <table>
    <tr><th>Country</th><th>City</th><th>Page Created</th><th>Validated</th><th>Content Safety Audit</th><th>Packing/FAQ Template</th><th>Itinerary</th><th>Blog Generated</th><th>Instagram Generated</th></tr>
    ${cityTableRows}
  </table>

  <h2>Trips</h2>
  <table>
    <tr><th>Year</th><th>Month</th><th>Destination</th><th>Cities</th><th>Itinerary Created</th><th>City Stops</th></tr>
    ${tripTableRows}
  </table>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(repoRoot, 'pipeline-status.html'), html);

console.log(`Wrote pipeline-status.json and pipeline-status.html`);
console.log(JSON.stringify(summary, null, 2));