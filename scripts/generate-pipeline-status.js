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
    });
  }
}

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
};

const output = { generatedAt, summary, countries: countryRows, cities: cityRows };
fs.writeFileSync(path.join(repoRoot, 'pipeline-status.json'), JSON.stringify(output, null, 2));

// ─── 6. Render HTML table ───────────────────────────────────────────────
function statusCell(value, { skipped } = {}) {
  if (skipped) return '<span class="dot dot-skip"></span>Skipped';
  if (value === true) return '<span class="dot dot-yes"></span>Yes';
  if (value === false) return '<span class="dot dot-no"></span>No';
  return '<span class="dot dot-na"></span>—';
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
    <td>${statusCell(r.skipped ? null : r.blogGenerated, { skipped: r.skipped })}</td>
    <td>${statusCell(r.skipped ? null : r.instagramGenerated, { skipped: r.skipped })}</td>
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
    <tr><th>Country</th><th>City</th><th>Page Created</th><th>Validated</th><th>Blog Generated</th><th>Instagram Generated</th></tr>
    ${cityTableRows}
  </table>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(repoRoot, 'pipeline-status.html'), html);

console.log(`Wrote pipeline-status.json and pipeline-status.html`);
console.log(JSON.stringify(summary, null, 2));