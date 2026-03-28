#!/usr/bin/env node
/**
 * Adds the fixed site-nav bar to all city pages that are missing it.
 * This matches the nav bar on country pages (GF Gone Global + Places, GF Scoring, About Me).
 *
 * Run: node scripts/add-site-nav.js
 * Dry run: node scripts/add-site-nav.js --dry-run
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = path.resolve(__dirname, '..');

// CSS to inject (site-nav styles)
const SITE_NAV_CSS = `
    /* ─── Site Nav Bar ────────────────────────────────────── */
    .site-nav { position: fixed; top: 0; left: 0; right: 0; height: 52px; background: var(--cream); border-bottom: 1px solid rgba(42, 32, 24, 0.08); display: flex; align-items: center; justify-content: space-between; padding: 0 2.5rem; z-index: 300; }
    .nav-home { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 0.85rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink); text-decoration: none; transition: color 0.2s ease; }
    .nav-home:hover { color: var(--slate); }
    .nav-links { display: flex; align-items: center; gap: 2rem; }`;

// Mobile CSS for site-nav (at 480px)
const SITE_NAV_MOBILE_CSS = `
    /* ─── Mobile: Site nav bar ────────────────────────────── */
    @media (max-width: 480px) {
      .site-nav { padding: 0 1.2rem; }
      .nav-links { gap: 0.8rem; }
      .nav-home { font-size: 0.72rem; letter-spacing: 0.1em; }
    }`;

// HTML to inject (before the breadcrumb nav)
const SITE_NAV_HTML = `  <nav class="site-nav">
    <a href="../../index.html" class="nav-home">GF Gone Global</a>
    <div class="nav-links">
      <a href="../../index.html" class="nav-link">Places</a>
      <a href="../../gf-scoring.html" class="nav-link">GF Scoring</a>
      <a href="../../about.html" class="nav-link">About Me</a>
    </div>
  </nav>

`;

function findCityPages() {
  const pages = [];
  const countriesDir = path.join(ROOT, 'countries');
  for (const country of fs.readdirSync(countriesDir)) {
    const countryDir = path.join(countriesDir, country);
    if (!fs.statSync(countryDir).isDirectory()) continue;
    for (const file of fs.readdirSync(countryDir)) {
      if (file.endsWith('.html')) {
        pages.push(path.join(countryDir, file));
      }
    }
  }
  return pages;
}

function patchPage(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(ROOT, filePath);

  // Skip if already has site-nav
  if (content.includes('class="site-nav"')) {
    return { status: 'skip', reason: 'already has site-nav' };
  }

  // Skip if no breadcrumb nav
  if (!content.includes('class="nav"')) {
    return { status: 'skip', reason: 'no breadcrumb nav found' };
  }

  let changes = 0;

  // 1. Add padding-top: 52px to body (for the fixed nav)
  // Match various body styles
  if (content.includes('body {') && !content.includes('padding-top: 52px')) {
    // Find the body CSS rule and add padding-top
    content = content.replace(
      /(body\s*\{[^}]*)(display:\s*flex|min-height:\s*100vh)/,
      '$1padding-top: 52px; $2'
    );
    changes++;
  } else if (content.includes('padding-top: 52px')) {
    // Already has it
  }

  // 2. Add site-nav CSS before the .nav CSS rule
  if (!content.includes('.site-nav')) {
    // Insert before the .nav { rule
    const navCssMatch = content.indexOf('.nav {');
    if (navCssMatch > 0) {
      content = content.slice(0, navCssMatch) + SITE_NAV_CSS.trim() + '\n    ' + content.slice(navCssMatch);
      changes++;
    }
  }

  // 3. Add mobile CSS for site-nav (before closing </style>)
  if (!content.includes('Mobile: Site nav bar')) {
    const styleClose = content.indexOf('</style>');
    if (styleClose > 0) {
      content = content.slice(0, styleClose) + SITE_NAV_MOBILE_CSS + '\n  ' + content.slice(styleClose);
      changes++;
    }
  }

  // 4. Add site-nav HTML before the breadcrumb nav
  const bodyNavMatch = content.indexOf('<nav class="nav">');
  if (bodyNavMatch > 0) {
    // Check there's no site-nav already before it
    const before = content.slice(Math.max(0, bodyNavMatch - 200), bodyNavMatch);
    if (!before.includes('site-nav')) {
      content = content.slice(0, bodyNavMatch) + SITE_NAV_HTML + content.slice(bodyNavMatch);
      changes++;
    }
  }

  // 5. Add site-nav to the 600px media query padding list (if it has one)
  if (content.includes('@media (max-width: 600px)') && !content.includes('.site-nav,')) {
    // Add .site-nav to the padding reduction rule
    content = content.replace(
      /@media \(max-width: 600px\)\s*\{\s*\.nav,/g,
      '@media (max-width: 600px) { .site-nav, .nav,'
    );
    // Also handle the pattern without .nav first
    content = content.replace(
      /@media \(max-width: 600px\)\s*\{\s*\.site-nav,\s*\.site-nav,/g,
      '@media (max-width: 600px) { .site-nav,'
    );
    changes++;
  }

  if (changes === 0) {
    return { status: 'skip', reason: 'no changes needed' };
  }

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, content, 'utf8');
  }

  return { status: 'patched', changes };
}

// ─── Main ─────────────────────────────────────────────────
function main() {
  const pages = findCityPages();
  const stats = { patched: 0, skipped: 0 };

  console.log(`Found ${pages.length} city pages`);
  if (DRY_RUN) console.log('DRY RUN — no files will be modified\n');

  for (const page of pages) {
    const rel = path.relative(ROOT, page);
    const result = patchPage(page);

    if (result.status === 'patched') {
      console.log(`  ${DRY_RUN ? 'WOULD' : 'PATCH'} ${rel} (+${result.changes} changes)`);
      stats.patched++;
    } else {
      console.log(`  SKIP  ${rel} (${result.reason})`);
      stats.skipped++;
    }
  }

  console.log(`\nDone: ${stats.patched} patched, ${stats.skipped} skipped`);
}

main();
