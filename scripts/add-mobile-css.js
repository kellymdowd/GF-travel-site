#!/usr/bin/env node
/**
 * Adds mobile-responsive CSS to all HTML pages in the travel site.
 * Categorizes pages and injects appropriate media queries.
 *
 * Run: node scripts/add-mobile-css.js
 * Dry run: node scripts/add-mobile-css.js --dry-run
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = path.resolve(__dirname, '..');

// ─── Collect all HTML files ───────────────────────────────
function getAllHtmlFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip non-page directories
      if (['node_modules', '.venv', 'map downloads', 'photos', 'brand_assets', 'instagram', 'scripts'].includes(entry.name)) continue;
      getAllHtmlFiles(fullPath, files);
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

// ─── Categorize a page ────────────────────────────────────
function categorize(filePath, content) {
  const rel = path.relative(ROOT, filePath);

  if (rel === 'index.html') return 'index';
  if (rel === 'about.html') return 'about';
  if (rel === 'gf-scoring.html') return 'gf-scoring';
  if (rel === 'admin.html') return 'skip';

  // Country pages: countries/[country].html
  if (rel.match(/^countries\/[^/]+\.html$/)) return 'country';

  // City pages: countries/[country]/[city].html
  if (rel.match(/^countries\/[^/]+\/[^/]+\.html$/)) {
    return content.includes('coming-soon') ? 'city-coming-soon' : 'city-built';
  }

  return 'skip';
}

// ─── CSS blocks to inject ─────────────────────────────────

// Nav bar fix for pages with .site-nav (index, about, gf-scoring, country pages)
const NAV_MOBILE_CSS = `
    /* ─── Mobile: Nav bar ─────────────────────────────────── */
    @media (max-width: 480px) {
      .nav-links { gap: 0.8rem; }
      .nav-home { font-size: 0.72rem; letter-spacing: 0.1em; }
      .nav-link, .nav-btn { font-size: 0.56rem; letter-spacing: 0.1em; }
    }`;

// Header stacking for pages with flex header (country name + trip dates)
const HEADER_STACK_CSS = `
    /* ─── Mobile: Header stacking ─────────────────────────── */
    @media (max-width: 480px) {
      .header { flex-direction: column; align-items: flex-start; gap: 0.2rem; }
      .trip-dates, .trip-date { padding-bottom: 0; }
    }`;

// Breadcrumb nav wrapping for city pages
const BREADCRUMB_MOBILE_CSS = `
    /* ─── Mobile: Breadcrumb nav ──────────────────────────── */
    @media (max-width: 480px) {
      .nav { flex-wrap: wrap; gap: 0.4rem 0.6rem; }
      .header { flex-direction: column; align-items: flex-start; gap: 0.2rem; }
      .trip-date { padding-bottom: 0; }
    }`;

// GF Scoring verdict rows
const VERDICT_MOBILE_CSS = `
    /* ─── Mobile: Verdict rows ────────────────────────────── */
    @media (max-width: 480px) {
      .verdict-row { flex-direction: column; align-items: flex-start; gap: 0.3rem; }
    }`;

// Index page: places grid 1-col at narrow
const INDEX_MOBILE_CSS = `
    /* ─── Mobile: Index specifics ─────────────────────────── */
    @media (max-width: 380px) {
      .places-grid { grid-template-columns: 1fr; }
    }`;

// Country page: GF section responsive
const COUNTRY_GF_MOBILE_CSS = `
    /* ─── Mobile: GF section padding ──────────────────────── */
    @media (max-width: 480px) {
      .gf-section { padding-left: 1.2rem; padding-right: 1.2rem; }
    }`;

// ─── Determine which CSS to inject ────────────────────────
function getCssToInject(category, content) {
  const blocks = [];

  switch (category) {
    case 'index':
      blocks.push(NAV_MOBILE_CSS, HEADER_STACK_CSS, INDEX_MOBILE_CSS);
      break;
    case 'about':
      blocks.push(NAV_MOBILE_CSS);
      break;
    case 'gf-scoring':
      blocks.push(NAV_MOBILE_CSS, VERDICT_MOBILE_CSS);
      break;
    case 'country':
      blocks.push(NAV_MOBILE_CSS, HEADER_STACK_CSS);
      // Only add GF section fix if the page has a GF section
      if (content.includes('gf-section')) {
        blocks.push(COUNTRY_GF_MOBILE_CSS);
      }
      break;
    case 'city-coming-soon':
      blocks.push(BREADCRUMB_MOBILE_CSS);
      break;
    case 'city-built':
      blocks.push(BREADCRUMB_MOBILE_CSS);
      break;
  }

  return blocks;
}

// ─── Check if CSS already injected ────────────────────────
function alreadyPatched(content) {
  return content.includes('Mobile: Nav bar') ||
         content.includes('Mobile: Breadcrumb nav') ||
         content.includes('Mobile: Header stacking');
}

// ─── Inject CSS before </style> ───────────────────────────
function injectCss(content, cssBlocks) {
  if (cssBlocks.length === 0) return content;

  const injection = '\n' + cssBlocks.join('\n') + '\n';

  // Find the last </style> in the <head>
  const styleCloseIdx = content.indexOf('</style>');
  if (styleCloseIdx === -1) {
    console.warn('  ⚠ No </style> tag found, skipping');
    return content;
  }

  // Insert before </style>
  return content.slice(0, styleCloseIdx) + injection + '  ' + content.slice(styleCloseIdx);
}

// ─── Main ─────────────────────────────────────────────────
function main() {
  const files = getAllHtmlFiles(ROOT);
  const stats = { patched: 0, skipped: 0, alreadyDone: 0 };

  console.log(`Found ${files.length} HTML files`);
  if (DRY_RUN) console.log('DRY RUN — no files will be modified\n');

  for (const filePath of files) {
    const rel = path.relative(ROOT, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const category = categorize(filePath, content);

    if (category === 'skip') {
      console.log(`  SKIP  ${rel}`);
      stats.skipped++;
      continue;
    }

    if (alreadyPatched(content)) {
      console.log(`  DONE  ${rel} (already patched)`);
      stats.alreadyDone++;
      continue;
    }

    const cssBlocks = getCssToInject(category, content);
    if (cssBlocks.length === 0) {
      console.log(`  SKIP  ${rel} (no changes needed)`);
      stats.skipped++;
      continue;
    }

    const newContent = injectCss(content, cssBlocks);

    if (!DRY_RUN) {
      fs.writeFileSync(filePath, newContent, 'utf8');
    }

    console.log(`  ${DRY_RUN ? 'WOULD' : 'PATCH'} ${rel} [${category}] (+${cssBlocks.length} blocks)`);
    stats.patched++;
  }

  console.log(`\nDone: ${stats.patched} patched, ${stats.alreadyDone} already done, ${stats.skipped} skipped`);
}

main();
