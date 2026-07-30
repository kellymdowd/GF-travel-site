#!/usr/bin/env node
/**
 * Scans city page(s) for photos/... references, adds the nested .gitignore
 * "unignore" rules needed to track exactly those files (matching the existing
 * photos/<country>/<city>/<place>/<file> allowlist pattern), and `git add`s
 * the .gitignore update plus the referenced photo files.
 *
 * Only photos actually used on the page get committed — unused shots left in
 * a place's photo folder stay ignored, same as the existing convention.
 *
 * Before staging, any oversized JPEG or PNG gets downsized in place (JPEGs
 * also get re-encoded at quality 80 via sips) per CLAUDE.md — source exports
 * from Photos can run 10-20MB+, and Wikimedia-sourced PNGs can be similarly
 * huge, so neither should be committed at full resolution.
 *
 * The resize target is placement-aware, not a single universal cap: a photo
 * only ever displayed as a 72-80px thumbnail (restaurant/landmark/activity
 * cards) gets capped much smaller than one used as a full-width hero image
 * (hotel cards). A 1600px image behind a 72px circle is pure wasted
 * bandwidth. Placement is read from the `class` on the actual `<img>` tag
 * referencing the photo; if a photo's usage can't be determined (e.g. no
 * `<img>` tag found, just a bare `url(...)` reference), it defaults to the
 * hero cap to be safe.
 *
 * Usage:
 *   node scripts/sync-photo-gitignore.js countries/new-zealand/auckland.html
 *   node scripts/sync-photo-gitignore.js countries/spain/valencia.html countries/spain/barcelona.html
 *   node scripts/sync-photo-gitignore.js --all      # every city page under countries/
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

function allCityPages() {
  const countriesDir = path.join(repoRoot, 'countries');
  return fs.readdirSync(countriesDir)
    .filter((entry) => fs.statSync(path.join(countriesDir, entry)).isDirectory())
    .flatMap((country) =>
      fs.readdirSync(path.join(countriesDir, country))
        .filter((f) => f.endsWith('.html'))
        .map((f) => path.join('countries', country, f))
    );
}

const pageFiles = args.includes('--all')
  ? allCityPages()
  : args.filter((a) => !a.startsWith('--'));

if (pageFiles.length === 0) {
  console.error('Usage: node scripts/sync-photo-gitignore.js <city-page.html> [...] | --all');
  process.exit(1);
}

// Matches src="../../photos/spain/valencia/..." or url('photos/...') etc.
// Captures everything inside the quotes/parens, then we trim to the photos/ part.
const REF_RE = /(?:src|href)\s*=\s*"([^"]*photos\/[^"]+\.(?:jpe?g|png|gif|webp))"|url\(\s*['"]?([^'")]*photos\/[^'")]+\.(?:jpe?g|png|gif|webp))['"]?\s*\)/gi;

// Matches a whole <img ...> tag so we can inspect its class alongside its src.
const IMG_TAG_RE = /<img\b[^>]*>/gi;

const THUMB_MAX_EDGE = 400; // restaurant/landmark/activity cards — displayed at 72-80px
const HERO_MAX_EDGE = 1600; // hotel cards — displayed full-width

const THUMB_CLASSES = ['restaurant-photo', 'landmark-photo', 'thing-photo'];
const HERO_CLASSES = ['hotel-image'];

function sizeForClass(classAttr) {
  if (!classAttr) return HERO_MAX_EDGE;
  if (THUMB_CLASSES.some((c) => classAttr.includes(c))) return THUMB_MAX_EDGE;
  if (HERO_CLASSES.some((c) => classAttr.includes(c))) return HERO_MAX_EDGE;
  return HERO_MAX_EDGE; // unknown placement — default to the safer (larger) cap
}

function extractPhotoRefs(html) {
  // rel path -> max edge required by the largest usage found for that photo
  const found = new Map();

  const setSize = (rel, maxEdge) => {
    const current = found.get(rel);
    found.set(rel, current ? Math.max(current, maxEdge) : maxEdge);
  };

  // Pass 1: <img> tags — determine size from class.
  const imgTagsSeen = new Set();
  let tagMatch;
  while ((tagMatch = IMG_TAG_RE.exec(html))) {
    const tag = tagMatch[0];
    const srcMatch = tag.match(/\bsrc\s*=\s*"([^"]*photos\/[^"]+\.(?:jpe?g|png|gif|webp))"/i);
    if (!srcMatch) continue;
    const rel = srcMatch[1].replace(/^.*?photos\//, '');
    const classMatch = tag.match(/\bclass\s*=\s*"([^"]*)"/i);
    setSize(rel, sizeForClass(classMatch ? classMatch[1] : ''));
    imgTagsSeen.add(rel);
  }

  // Pass 2: any other photos/ reference (href=, url(...)) not already sized
  // via an <img> tag above — default to the hero cap since placement is
  // unknown (e.g. a CSS background-image).
  let m;
  while ((m = REF_RE.exec(html))) {
    const raw = m[1] || m[2];
    const rel = raw.replace(/^.*?photos\//, '');
    if (!imgTagsSeen.has(rel)) setSize(rel, HERO_MAX_EDGE);
  }

  return found;
}

const gitignorePath = path.join(repoRoot, '.gitignore');
const gitignoreLines = fs.readFileSync(gitignorePath, 'utf8').split('\n');
const existingRules = new Set(gitignoreLines.map((l) => l.trim()).filter(Boolean));
const newRules = [];

function addRule(rule) {
  if (!existingRules.has(rule)) {
    existingRules.add(rule);
    newRules.push(rule);
  }
}

const resized = [];

function resizeIfNeeded(absPath, maxEdge) {
  const isJpeg = /\.jpe?g$/i.test(absPath);
  const isPng = /\.png$/i.test(absPath);
  if (!isJpeg && !isPng) return; // leave gif/webp untouched

  let width;
  let height;
  try {
    const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', absPath]).toString();
    width = Number((out.match(/pixelWidth:\s*(\d+)/) || [])[1]);
    height = Number((out.match(/pixelHeight:\s*(\d+)/) || [])[1]);
  } catch (e) {
    console.warn(`  sips read failed for ${absPath}: ${e.message}`);
    return;
  }
  if (!width || !height || Math.max(width, height) <= maxEdge) return;

  // JPEGs get format+quality re-encoded (lossy compression). PNGs are only
  // downsized in place, keeping their format/transparency intact — sips'
  // formatOptions quality flag is JPEG-only and forcing a format conversion
  // could break alpha channels on downloaded logos/graphics.
  const args = isJpeg
    ? ['-Z', String(maxEdge), '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', absPath, '--out', absPath]
    : ['-Z', String(maxEdge), absPath, '--out', absPath];

  try {
    execFileSync('sips', args);
    resized.push({ file: path.relative(repoRoot, absPath), maxEdge });
  } catch (e) {
    console.warn(`  sips resize failed for ${absPath}: ${e.message}`);
  }
}

const allPhotoRefs = new Map(); // rel path -> max edge required
const missingOnDisk = [];
const skippedShape = [];

for (const pageFile of pageFiles) {
  const abs = path.join(repoRoot, pageFile);
  if (!fs.existsSync(abs)) {
    console.warn(`Skip (page not found): ${pageFile}`);
    continue;
  }
  const html = fs.readFileSync(abs, 'utf8');
  for (const [rel, maxEdge] of extractPhotoRefs(html)) {
    const current = allPhotoRefs.get(rel);
    allPhotoRefs.set(rel, current ? Math.max(current, maxEdge) : maxEdge);
  }
}

const toStage = [];

for (const [rel, maxEdge] of allPhotoRefs) {
  const parts = rel.split('/');
  if (parts.length < 3) {
    skippedShape.push(rel);
    continue;
  }

  const diskPath = path.join(repoRoot, 'photos', rel);
  if (!fs.existsSync(diskPath)) {
    missingOnDisk.push(rel);
    continue;
  }

  resizeIfNeeded(diskPath, maxEdge);

  const [country, city, maybePlace] = parts;
  addRule(`!photos/${country}/`);
  addRule(`photos/${country}/*`);
  addRule(`!photos/${country}/${city}/`);
  addRule(`photos/${country}/${city}/*`);

  if (parts.length === 3) {
    // photos/<country>/<city>/<file> — no place subfolder
    addRule(`!photos/${rel}`);
  } else {
    const place = maybePlace;
    addRule(`!photos/${country}/${city}/${place}/`);
    addRule(`photos/${country}/${city}/${place}/*`);
    addRule(`!photos/${rel}`);
  }

  toStage.push(`photos/${rel}`);
}

if (newRules.length > 0) {
  const updated = gitignoreLines.concat(newRules).join('\n');
  fs.writeFileSync(gitignorePath, updated);
}

if (toStage.length > 0 || newRules.length > 0) {
  try {
    execFileSync('git', ['add', '.gitignore', ...toStage], { cwd: repoRoot });
  } catch (e) {
    console.error('git add failed:', e.message);
    process.exit(1);
  }
}

const thumbResizes = resized.filter((r) => r.maxEdge === THUMB_MAX_EDGE).length;
const heroResizes = resized.filter((r) => r.maxEdge === HERO_MAX_EDGE).length;

console.log(`Pages scanned: ${pageFiles.length}`);
console.log(`Photo references found: ${allPhotoRefs.size}`);
console.log(`Resized: ${resized.length} (${thumbResizes} thumbnail@${THUMB_MAX_EDGE}px, ${heroResizes} hero@${HERO_MAX_EDGE}px)`);
console.log(`New .gitignore rules added: ${newRules.length}`);
console.log(`Staged for commit: ${toStage.length} photo(s) + .gitignore`);
if (missingOnDisk.length > 0) {
  console.log(`\nReferenced on page but missing on disk (not staged):`);
  missingOnDisk.forEach((f) => console.log(`  - ${f}`));
}
if (skippedShape.length > 0) {
  console.log(`\nUnexpected path shape (skipped):`);
  skippedShape.forEach((f) => console.log(`  - ${f}`));
}
