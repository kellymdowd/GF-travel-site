#!/usr/bin/env node
/**
 * Guaranteed post-build validation for a city page. Extracted from what used
 * to be ad-hoc inline JS re-typed in city-page-builder/SKILL.md's Step 8 —
 * now a single reusable, versioned script.
 *
 * Runs three kinds of checks:
 *   1. Structural (regex/string matching against the HTML) — fast, free.
 *   2. External link liveness (HTTP HEAD/GET with a short timeout) — catches
 *      real 404s/timeouts. Note: this can't tell a *wrong* FMGF link from a
 *      *right* one (findmeglutenfree.com 403s bot traffic uniformly,
 *      confirmed even for known-good live URLs) — that judgment call still
 *      needs the WebSearch-based cross-check described in city-page-builder.
 *   3. Visual (puppeteer screenshot at desktop + mobile widths) — so an
 *      agent can actually look at the rendered page, not just its markup.
 *
 * Usage:
 *   node scripts/validate-city-page.js countries/spain/madrid.html
 *   node scripts/validate-city-page.js countries/spain/madrid.html --no-links   # skip HTTP checks (faster)
 *   node scripts/validate-city-page.js countries/spain/madrid.html --no-screenshots
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const repoRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const pageArg = args.find((a) => !a.startsWith('--'));
const skipLinks = args.includes('--no-links');
const skipScreenshots = args.includes('--no-screenshots');

if (!pageArg) {
  console.error('Usage: node scripts/validate-city-page.js <city-page.html> [--no-links] [--no-screenshots]');
  process.exit(1);
}

const pagePath = path.resolve(repoRoot, pageArg);
const pageDir = path.dirname(pagePath);
const html = fs.readFileSync(pagePath, 'utf-8');
// CSS selectors for state classes (e.g. `.restaurant-source-researched { ... }`,
// `.thing-photo-placeholder { ... }`) get defined in <style> as reusable
// template rules even on a page where every instance happens to be "visited"
// or every photo happens to be filled in. Checks that care about actual
// rendered usage (not just "is this class defined somewhere") must run
// against body-only content, or they'll false-positive on the CSS itself.
const bodyOnly = html.replace(/<style[\s\S]*?<\/style>/, '');

const errors = [];
const warnings = [];
const info = [];

// 1. Snapshot: exactly 8 fields in correct order
const snapshotFields = ['Best Months', 'Ideal Stay', 'Best For', 'GF Friendliness', 'Language', 'English', 'City Size', 'Currency'];
snapshotFields.forEach((f) => {
  if (!html.includes(f)) errors.push(`Snapshot missing: ${f}`);
});

// 2. GF Friendliness uses pip bar, not plain text
if (html.includes('GF Friendliness') && !html.includes('snapshot-score-bar')) {
  errors.push('GF Friendliness should use pip bar, not plain text');
}

// 3. Restaurant card order: visited before recommended before closed.
//    Scoped to the <section class="restaurants"> block only — landmark
//    cards on some pages (e.g. Frankfurt) reuse the same `restaurant-source`
//    class name for their own "Went here" badge (a real, CSS-supported
//    pattern there, just an inconsistent name vs. newer pages' dedicated
//    `landmark-source` class), which a body-wide regex misreads as
//    out-of-order restaurant cards. Also tiers by closed-status per card
//    (visited=0, researched=1, closed=2, closed overrides source) rather
//    than a flat visited/researched sequence — a closed restaurant that
//    Kelly actually visited legitimately carries "Went here" but must still
//    sort after open "Traveler recommended" cards, which a 2-state check
//    can't represent (confirmed false-positive on Vaduz's correctly-ordered
//    visited→researched→researched→closed sequence).
const restaurantsSectionMatch = html.match(/<section class="restaurants"[\s\S]*?<\/section>/);
if (restaurantsSectionMatch) {
  const restaurantsBodyOnly = restaurantsSectionMatch[0].replace(/<style[\s\S]*?<\/style>/, '');
  const cardBlocks = restaurantsBodyOnly.split(/(?=<div class="restaurant-card")/).filter((b) => /restaurant-source-(visited|researched)/.test(b));
  let lastTier = -1;
  cardBlocks.forEach((block) => {
    const sourceMatch = block.match(/restaurant-source-(visited|researched)/);
    const isClosed = /restaurant-tag-closed/.test(block);
    const nameMatch = block.match(/class="restaurant-name">([^<]+)/);
    const name = nameMatch ? nameMatch[1].trim() : '(unnamed card)';
    const tier = isClosed ? 2 : (sourceMatch[1] === 'visited' ? 0 : 1);
    if (tier < lastTier) errors.push(`Restaurant card order: "${name}" (tier ${tier === 0 ? 'visited' : tier === 1 ? 'researched' : 'closed'}) appears after a later-tier card`);
    lastTier = Math.max(lastTier, tier);
  });
}

// 4. Map completeness — handles both literal bindPopup strings and data-array
//    marker patterns (e.g. `var restaurants = [{name:'X', ...}]`), since the
//    Madrid build used a data-driven pattern that a literal-string regex
//    falsely flagged as "missing from map."
const cardNames = [...bodyOnly.matchAll(/class="restaurant-name"[^>]*>([^<]+)/g)].map((m) => m[1].trim());
const literalMarkerNames = [...bodyOnly.matchAll(/\.bindPopup\(['"]<[^>]*>?<strong[^>]*>([^<]+)/g)].map((m) => m[1].trim());
const dataArrayNames = [...bodyOnly.matchAll(/name\s*:\s*['"]([^'"]+)['"]/g)].map((m) => m[1].trim());
const markerNames = [...literalMarkerNames, ...dataArrayNames];
cardNames.forEach((name) => {
  if (!markerNames.some((m) => m.includes(name) || name.includes(m))) {
    warnings.push(`Restaurant "${name}" may be missing from map`);
  }
});

// 5. No placeholder # links (excluding TOC anchors)
const realHashLinks = [...bodyOnly.matchAll(/href="#"(?!\s*class="toc)/g)];
if (realHashLinks.length > 0) warnings.push(`Found ${realHashLinks.length} placeholder # link(s)`);

// 6. No transition-all
if (html.includes('transition-all')) warnings.push('Found transition-all — use specific properties');

// 7. All local image references resolve to existing files
const imgPaths = [...html.matchAll(/src="(\.\.\/\.\.\/photos\/[^"]+)"/g)].map((m) => m[1]);
imgPaths.forEach((p) => {
  const resolved = path.resolve(pageDir, p);
  if (!fs.existsSync(resolved)) errors.push(`Image not found: ${p}`);
});

// 8. Photo placeholders left on non-hotel cards — per policy, these should
//    be removed entirely (no empty placeholder), not shipped.
const nonHotelPlaceholders = (bodyOnly.match(/<div class="(?:restaurant|landmark|thing)-photo-placeholder/g) || []).length;
if (nonHotelPlaceholders > 0) {
  warnings.push(`Found ${nonHotelPlaceholders} restaurant/landmark/activity photo placeholder(s) — these should be removed, not shipped (hotel-only fallback is generic cityscape, not a placeholder box)`);
}

// 9. Lightbox selector completeness
['.restaurant-photo', '.landmark-photo', '.hotel-image', '.thing-photo'].forEach((sel) => {
  if (!html.includes(sel)) warnings.push(`Lightbox selector missing ${sel}`);
});

// 10. FMGF link completeness — flag if zero FMGF links on a page with restaurants.
//     Warning, not Error: a structural check can't tell "fmgf_url values were
//     dropped during generation" apart from "none of these restaurants are
//     actually indexed on FMGF" (confirmed real for Tampere, Finland — a
//     WebSearch-based research pass found zero FMGF listings for any of its
//     3 restaurants, not a generation bug). city-page-validator's own deeper,
//     WebSearch-capable audit already treats this as Info-level for exactly
//     this reason — match that here rather than hard-failing pages in
//     genuinely FMGF-sparse markets.
const fmgfOnPage = (html.match(/findmeglutenfree\.com\/biz\//g) || []).length;
if (fmgfOnPage === 0 && cardNames.length > 0) {
  warnings.push('No FMGF restaurant links on page — check if spreadsheet fmgf_url values were dropped during generation, or confirm (via WebSearch) that none of these restaurants are actually listed on FMGF');
}

// 11. Packing order: Essential before country-tagged before city-tagged
const packingSection = html.match(/id="what-to-pack"[\s\S]*?(?=<section|<footer)/);
if (packingSection) {
  const tags = [...packingSection[0].matchAll(/packing-tag(?:-\w+)?">([^<]+)</g)].map((m) => m[1]);
  let sawNonEssential = false;
  tags.forEach((tag) => {
    if (tag !== 'Essential') sawNonEssential = true;
    if (tag === 'Essential' && sawNonEssential) warnings.push('Packing order: an Essential item appears after a country/city-tagged item');
  });
}

function extractExternalLinks() {
  const hrefs = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  return [...new Set(hrefs)];
}

function checkLink(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, { method: 'HEAD', timeout: 8000 }, (res) => {
      resolve({ url, status: res.statusCode });
      req.destroy();
    });
    req.on('error', () => resolve({ url, status: 'error' }));
    req.on('timeout', () => { req.destroy(); resolve({ url, status: 'timeout' }); });
    req.end();
  });
}

async function checkAllLinks() {
  const links = extractExternalLinks().filter((u) => !u.includes('fonts.googleapis.com') && !u.includes('fonts.gstatic.com') && !u.includes('googletagmanager.com') && !u.includes('unpkg.com'));
  const results = await Promise.all(links.map(checkLink));
  results.forEach((r) => {
    if (r.status === 'timeout') info.push(`Link timed out (may be fine, or bot-blocked): ${r.url}`);
    else if (r.status === 403) info.push(`Link returned 403 (likely bot-blocked, not necessarily broken — verify via WebSearch if it's an FMGF link): ${r.url}`);
    else if (typeof r.status === 'number' && r.status >= 400) errors.push(`Link returned ${r.status}: ${r.url}`);
    else if (r.status === 'error') warnings.push(`Link could not be reached: ${r.url}`);
  });
}

async function takeScreenshots() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    warnings.push('puppeteer not installed — skipping visual validation');
    return {};
  }
  const outDir = path.join(repoRoot, '.validation-screenshots');
  fs.mkdirSync(outDir, { recursive: true });
  const slug = path.basename(pagePath, '.html');
  const desktopPath = path.join(outDir, `${slug}-desktop.png`);
  const mobilePath = path.join(outDir, `${slug}-mobile.png`);

  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('file://' + pagePath, { waitUntil: 'networkidle0', timeout: 20000 });
    await page.screenshot({ path: desktopPath });
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: mobilePath });
  } finally {
    await browser.close();
  }
  return { desktop: desktopPath, mobile: mobilePath };
}

(async () => {
  let screenshots = {};
  if (!skipLinks) await checkAllLinks();
  if (!skipScreenshots) screenshots = await takeScreenshots();

  const result = { errors, warnings, info, screenshots };
  console.log(JSON.stringify(result, null, 2));
  process.exit(errors.length > 0 ? 1 : 0);
})();