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
 * Before staging, any oversized JPEG or PNG gets downsized in place (max
 * 1600px on the long edge; JPEGs also get re-encoded at quality 80 via
 * sips) per CLAUDE.md — source exports from Photos can run 10-20MB+, and
 * Wikimedia-sourced PNGs can be similarly huge, so neither should be
 * committed at full resolution.
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

function extractPhotoRefs(html) {
  const found = new Set();
  let m;
  while ((m = REF_RE.exec(html))) {
    const raw = m[1] || m[2];
    const rel = raw.replace(/^.*?photos\//, ''); // e.g. "spain/valencia/la-lonja/IMG_1.jpeg"
    found.add(rel);
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

const MAX_EDGE = 1600;
const resized = [];

function resizeIfNeeded(absPath) {
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
  if (!width || !height || Math.max(width, height) <= MAX_EDGE) return;

  // JPEGs get format+quality re-encoded (lossy compression). PNGs are only
  // downsized in place, keeping their format/transparency intact — sips'
  // formatOptions quality flag is JPEG-only and forcing a format conversion
  // could break alpha channels on downloaded logos/graphics.
  const args = isJpeg
    ? ['-Z', String(MAX_EDGE), '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', absPath, '--out', absPath]
    : ['-Z', String(MAX_EDGE), absPath, '--out', absPath];

  try {
    execFileSync('sips', args);
    resized.push(path.relative(repoRoot, absPath));
  } catch (e) {
    console.warn(`  sips resize failed for ${absPath}: ${e.message}`);
  }
}

const allPhotoRefs = new Set();
const missingOnDisk = [];
const skippedShape = [];

for (const pageFile of pageFiles) {
  const abs = path.join(repoRoot, pageFile);
  if (!fs.existsSync(abs)) {
    console.warn(`Skip (page not found): ${pageFile}`);
    continue;
  }
  const html = fs.readFileSync(abs, 'utf8');
  for (const rel of extractPhotoRefs(html)) allPhotoRefs.add(rel);
}

const toStage = [];

for (const rel of allPhotoRefs) {
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

  resizeIfNeeded(diskPath);

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

console.log(`Pages scanned: ${pageFiles.length}`);
console.log(`Photo references found: ${allPhotoRefs.size}`);
console.log(`Resized (was over ${MAX_EDGE}px): ${resized.length}`);
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
