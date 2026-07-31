#!/usr/bin/env node
/**
 * Pre-extraction for city-content-auditor: pulls just the auditable surface
 * out of a city page — RESEARCHED-marked prose, other freeform prose, links,
 * images (with resolved disk paths), and informal provenance comments —
 * instead of handing an LLM judge the whole raw HTML file. Pages range from
 * ~1,500 to 4,500+ lines, almost entirely repeated CSS/card markup rather
 * than content, so this keeps judge-subagent payloads proportional to actual
 * prose+image count.
 *
 * Pure regex/string parsing, matching this repo's existing style
 * (validate-city-page.js) — no DOM library dependency.
 *
 * Usage:
 *   node scripts/extract-audit-content.js countries/india/bengaluru.html
 *   node scripts/extract-audit-content.js countries/india/bengaluru.html --out /tmp/foo.json
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const pageArg = args.find((a) => !a.startsWith('--'));
const outIdx = args.indexOf('--out');
const outPath = outIdx !== -1 ? args[outIdx + 1] : null;

if (!pageArg) {
  console.error('Usage: node scripts/extract-audit-content.js <city-page.html> [--out <path>]');
  process.exit(1);
}

const pagePath = path.resolve(repoRoot, pageArg);
const pageDir = path.dirname(pagePath);
const html = fs.readFileSync(pagePath, 'utf-8');

// Strip <style> and <script> blocks before any content extraction — CSS
// selector text (e.g. `.thing-photo-placeholder { }`) and inline map/GA JS
// (e.g. `name: 'X'`) both look like real content to naive regexes otherwise.
const bodyOnly = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');

// Country/city name from the file path: countries/[country]/[city].html
const relPage = path.relative(repoRoot, pagePath).split(path.sep).join('/');
const pathParts = relPage.split('/');
const country = pathParts[1] ? pathParts[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null;
const city = pathParts[2] ? path.basename(pathParts[2], '.html').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null;

// ─── Section boundaries — so every extracted item can be tagged with the
//     enclosing <section id="..."> it lives in ────────────────────────────
const sectionRegex = /<section\s+class="([\w-]+)"(?:\s+id="([\w-]+)")?/g;
const sections = [...bodyOnly.matchAll(sectionRegex)].map((m) => ({
  index: m.index,
  className: m[1],
  id: m[2] || m[1],
}));
function sectionAt(idx) {
  let current = null;
  for (const s of sections) {
    if (s.index <= idx) current = s;
    else break;
  }
  return current ? current.id : null;
}
const allSectionIds = [...new Set(sections.map((s) => s.id))];

// ─── Card context lookup, scoped by card boundary rather than plain nearest-
//     heading distance. Content isn't always *after* its h3 name in the
//     markup — e.g. a hotel's <img> sits in .hotel-image-side, which comes
//     BEFORE .hotel-info-side's <h3 class="hotel-name">. A naive "nearest
//     preceding heading" lookup mis-attributes every hotel image to the
//     PREVIOUS hotel. Instead: find which card <div class="*-card"> span a
//     position falls inside, then look for the one h3 name inside that span,
//     regardless of whether it comes before or after the position within it.
const cardBoundaryRegex = /<div\s+class="(?:hotel|restaurant|thing|landmark)-card"/g;
const cardBoundaries = [...bodyOnly.matchAll(cardBoundaryRegex)].map((m) => m.index);
const nameHeadingRegex = /<h3\s+class="[\w-]*-name"[^>]*>([\s\S]*?)<\/h3>/g;
const nameHeadings = [...bodyOnly.matchAll(nameHeadingRegex)].map((m) => ({
  index: m.index,
  text: m[1].replace(/<[^>]+>/g, '').trim(),
}));
function cardSpanFor(idx) {
  let start = null;
  for (const b of cardBoundaries) {
    if (b <= idx) start = b; else break;
  }
  if (start === null) return null;
  const end = cardBoundaries.find((b) => b > start) || Infinity;
  if (idx >= end) return null; // idx is between cards, not inside one
  return [start, end];
}
function cardContextAt(idx) {
  const span = cardSpanFor(idx);
  if (span) {
    const [start, end] = span;
    const heading = nameHeadings.find((h) => h.index >= start && h.index < end);
    if (heading) return heading.text;
  }
  // Fallback for content with no enclosing *-card div (e.g. gf-guide,
  // getting-around, travel-tips prose) — no card-level name applies.
  return null;
}

// ─── Comments: classify as RESEARCHED marker, structural divider (banner
//     comments made of ═ characters or ALL-CAPS section labels), or an
//     informal provenance note (e.g. "BLR Brewing Co: visited, no photo") ──
const commentRegex = /<!--\s*([\s\S]*?)\s*-->/g;
const rawComments = [...bodyOnly.matchAll(commentRegex)].map((m) => ({ index: m.index, text: m[1].trim() }));
const isDivider = (t) => /═/.test(t) || /^[A-Z0-9\s&/-]+$/.test(t) && t.length < 60 && t === t.toUpperCase();
const researchedMarkers = rawComments.filter((c) => c.text === 'RESEARCHED');
const provenanceComments = rawComments
  .filter((c) => c.text !== 'RESEARCHED' && !isDivider(c.text) && !c.text.startsWith('STOREFRONT'))
  .map((c) => ({ raw: c.text, nearestCardContext: cardContextAt(c.index) }));

// ─── Content-bearing leaf classes. A single RESEARCHED marker or comment
//     can precede a *cluster* of these (e.g. one marker before a whole
//     .restaurant-details block with Safety Notes / What to Order / Location,
//     or before a <ul> of several .tip-item/.tip-text entries) — so blocks
//     are captured by scope (from one comment to the next), then all leaf
//     text within that scope is pulled out, not just the first element. ───
const CONTENT_CLASS_RE = /class="([\w-]*(?:-text|-value|-desc|-why-text)[\w-]*)"[^>]*>([^<]{8,})</g;
const LABEL_SUFFIX_RE = /-label$/;

function extractLeafText(scopeHtml) {
  const texts = [];
  for (const m of scopeHtml.matchAll(CONTENT_CLASS_RE)) {
    const className = m[1];
    if (LABEL_SUFFIX_RE.test(className)) continue; // "Safety Notes" etc — headers, not prose
    const text = m[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
    if (text) texts.push({ className, text });
  }
  return texts;
}

// Next comment (of any kind) after a given index — the scope boundary.
const allCommentIdx = rawComments.map((c) => c.index).sort((a, b) => a - b);
function scopeEnd(startIdx) {
  const next = allCommentIdx.find((i) => i > startIdx);
  return next !== undefined ? next : Math.min(startIdx + 4000, bodyOnly.length);
}

const researchedBlocks = [];
researchedMarkers.forEach((marker, i) => {
  const end = scopeEnd(marker.index);
  const scope = bodyOnly.slice(marker.index, end);
  const leafTexts = extractLeafText(scope);
  leafTexts.forEach((lt, j) => {
    researchedBlocks.push({
      id: `researched-${i + 1}-${j + 1}`,
      sectionId: sectionAt(marker.index),
      className: lt.className,
      cardContext: cardContextAt(marker.index),
      text: lt.text,
    });
  });
});

// otherProseBlocks: same content-bearing classes, but scanned globally and
// then filtered to exclude anything already captured as a RESEARCHED block
// (by exact text match — good enough given block texts are full sentences).
const researchedTexts = new Set(researchedBlocks.map((b) => b.text));
const allLeaf = extractLeafText(bodyOnly);
const seen = new Set();
const otherProseBlocks = [];
allLeaf.forEach((lt, i) => {
  if (researchedTexts.has(lt.text)) return;
  if (seen.has(lt.text)) return; // de-dupe repeated location strings etc.
  seen.add(lt.text);
  // Recompute index for sectioning/context — matchAll on bodyOnly again per-item
  // would be slow for large pages; approximate via indexOf from last position.
  const idx = bodyOnly.indexOf(lt.text);
  otherProseBlocks.push({
    id: `prose-${i + 1}`,
    sectionId: sectionAt(idx),
    className: lt.className,
    cardContext: cardContextAt(idx),
    text: lt.text,
  });
});

// ─── Links ──────────────────────────────────────────────────────────────
const linkRegex = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
const links = [...bodyOnly.matchAll(linkRegex)]
  .filter((m) => m[1].startsWith('http'))
  .map((m) => ({
    href: m[1],
    anchorText: m[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' '),
    cardContext: cardContextAt(m.index),
  }));

// ─── Images ─────────────────────────────────────────────────────────────
// Attribute order is consistently src, alt, class in this site's templates,
// but match order-independently to be safe against drift.
const imgTagRegex = /<img\s+([^>]+)>/g;
const images = [];
let imgCounter = 0;
for (const m of bodyOnly.matchAll(imgTagRegex)) {
  const attrs = m[1];
  const src = (attrs.match(/src="([^"]*)"/) || [])[1];
  if (!src || src === '') continue; // skip the empty lightbox <img id="lightbox-img" src="">
  const alt = (attrs.match(/alt="([^"]*)"/) || [])[1] || '';
  const className = (attrs.match(/class="([^"]*)"/) || [])[1] || '';
  imgCounter += 1;
  const resolvedPath = path.resolve(pageDir, src);
  images.push({
    id: `img-${imgCounter}`,
    src,
    resolvedPath,
    exists: fs.existsSync(resolvedPath),
    alt,
    className,
    sectionId: sectionAt(m.index),
    cardContext: cardContextAt(m.index),
  });
}

// ─── Restaurant cards (visited/researched status + photo presence) — feeds
//     the "wishes respected" memory check (feedback_photo_means_visited) ──
const restaurantCardRegex = /<h3\s+class="restaurant-name">([\s\S]*?)<\/h3>[\s\S]*?class="restaurant-source restaurant-source-(visited|researched)"/g;
const restaurantCards = [...bodyOnly.matchAll(restaurantCardRegex)].map((m) => {
  const name = m[1].replace(/<[^>]+>/g, '').trim();
  const hasPhoto = images.some((img) => img.className.includes('restaurant-photo') && img.cardContext === name);
  return { name, sourceStatus: m[2], hasPhoto };
});

// ─── Nav pattern — feeds the design-compliance check without a second pass
const navPattern = html.includes('nav-home') && html.includes('nav-links')
  ? 'nav-home/nav-links'
  : (html.includes('site-nav-link') ? 'site-nav-link (deprecated)' : 'unknown');

const result = {
  page: relPage,
  country,
  city,
  extractedAt: new Date().toISOString(),
  counts: {
    researchedBlocks: researchedBlocks.length,
    otherProseBlocks: otherProseBlocks.length,
    links: links.length,
    images: images.length,
    provenanceComments: provenanceComments.length,
  },
  researchedBlocks,
  otherProseBlocks,
  links,
  images,
  provenanceComments,
  restaurantCards,
  sections: allSectionIds,
  navPattern,
};

const json = JSON.stringify(result, null, 2);
if (outPath) {
  fs.writeFileSync(path.resolve(repoRoot, outPath), json);
  console.log(`Wrote ${outPath} (${json.length} bytes)`);
} else {
  console.log(json);
}