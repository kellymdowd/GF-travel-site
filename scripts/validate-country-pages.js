#!/usr/bin/env node
// One-off runner for the country-page-validator skill's checks.
// Outputs JSON issues per country to stdout.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COUNTRIES_DIR = path.join(ROOT, 'countries');

const VERDICT_TIERS = [
  { min: 9, max: 10, label: 'GF Friendly' },
  { min: 7, max: 8, label: 'GF Friendly' },
  { min: 5, max: 6, label: 'Manageable' },
  { min: 3, max: 4, label: 'Challenging' },
  { min: 0, max: 2, label: 'Very Challenging' },
];

function tierFor(score) {
  return VERDICT_TIERS.find(t => score >= t.min && score <= t.max)?.label || 'Unknown';
}

function countryFiles() {
  return fs.readdirSync(COUNTRIES_DIR)
    .filter(f => f.endsWith('.html'))
    .map(f => path.join(COUNTRIES_DIR, f));
}

function readFile(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

function extractCityScoreFromCityPage(html) {
  // City page's own GF Friendliness total — look for snapshot-score-bar pips or gf total
  // Pattern used on city pages: a filled pip count out of 10 in the snapshot / GF section.
  const totalMatch = html.match(/gf-score-total-num">(\d+)</) || html.match(/snapshot-score-num">(\d+)</);
  if (totalMatch) return parseInt(totalMatch[1], 10);
  // Fallback: count filled pips in a snapshot-score-bar
  const barMatch = html.match(/snapshot-score-bar">([\s\S]*?)<\/div>/);
  if (barMatch) {
    const filled = (barMatch[1].match(/is-filled/g) || []).length;
    return filled;
  }
  return null;
}

function validateCountry(filePath) {
  const country = path.basename(filePath, '.html');
  const html = readFile(filePath);
  const issues = [];
  if (!html) {
    return { country, issues: [{ severity: 'Error', category: 'File', text: 'Country page file not found' }] };
  }

  // 2a. SEO Meta
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : '';
  if (!/gluten-free|gf/i.test(title)) {
    issues.push({ severity: 'Warning', category: 'SEO Meta', text: `Title "${title}" doesn't mention Gluten-Free/GF` });
  }
  const descMatch = html.match(/<meta name="description" content="([^"]*)"/i);
  if (!descMatch) {
    issues.push({ severity: 'Warning', category: 'SEO Meta', text: 'No meta description tag found' });
  } else if (!/gluten-free|gf/i.test(descMatch[1])) {
    issues.push({ severity: 'Info', category: 'SEO Meta', text: 'Meta description does not mention gluten-free' });
  }

  // 2b. Google My Maps
  // Two legitimate markup patterns exist site-wide: Austria-style `overview-btn` (href before class)
  // and Hungary-style `overview-link` (class before href, positioned after map/cities sections) — both valid.
  const mapBtnMatch = html.match(/overview-btn" href="([^"]*)"/)
    || html.match(/href="([^"]*)"[^>]*class="overview-(?:btn|link)"/);
  if (!mapBtnMatch || mapBtnMatch[1] === '#' || !mapBtnMatch[1]) {
    issues.push({ severity: 'Error', category: 'Google Map', text: 'Open Google Map button missing or placeholder href' });
  } else if (!mapBtnMatch[1].includes('google.com/maps/d/')) {
    issues.push({ severity: 'Warning', category: 'Google Map', text: `Google Map link doesn't look like a My Maps URL: ${mapBtnMatch[1]}` });
  }

  // 2c. Country map container
  if (!html.includes('id="country-map"')) {
    issues.push({ severity: 'Error', category: 'Country Map', text: 'Missing <div id="country-map"> container' });
  }

  // 2d. City grid links — find countries/[country]/*.html that exist on disk
  const cityDir = path.join(COUNTRIES_DIR, country);
  let builtCities = [];
  if (fs.existsSync(cityDir)) {
    builtCities = fs.readdirSync(cityDir)
      .filter(f => f.endsWith('.html'))
      .map(f => f.replace(/\.html$/, ''));
  }

  // City chips are rendered from a JS data array in two observed styles: a literal `country/slug` string
  // (older pages), or a template literal like `${country}/${d.slug}` combined with a `slug: 'name'` field
  // in the data array (D3-rendered maps) — check both, since matching only the literal-string style
  // produces false "not referenced" warnings for the template-literal pages.
  const referencedSlugs = new Set();
  const hrefSlugMatches = [...html.matchAll(new RegExp(`${country}/([a-z0-9-]+)`, 'g'))];
  hrefSlugMatches.forEach(m => referencedSlugs.add(m[1]));
  const dataSlugMatches = [...html.matchAll(/slug:\s*'([a-z0-9-]+)'/g)];
  dataSlugMatches.forEach(m => referencedSlugs.add(m[1]));

  if (builtCities.length === 0) {
    issues.push({ severity: 'Info', category: 'City Grid Links', text: `No countries/${country}/ directory found — city grid/score-consistency checks skipped` });
  } else {
    // Cities referenced on the page but missing on disk
    referencedSlugs.forEach(slug => {
      const cityFile = path.join(cityDir, `${slug}.html`);
      if (!fs.existsSync(cityFile)) {
        issues.push({ severity: 'Error', category: 'City Grid Links', text: `Country page references "${slug}" but countries/${country}/${slug}.html doesn't exist` });
      }
    });
    // Cities built but not referenced anywhere on the country page
    builtCities.forEach(slug => {
      if (!referencedSlugs.has(slug)) {
        issues.push({ severity: 'Warning', category: 'City Grid Links', text: `countries/${country}/${slug}.html exists but isn't referenced on the country page` });
      }
    });
  }

  // 2e. GF Friendliness section
  const gfSectionMatch = html.match(/<section class="gf-section">([\s\S]*?)<\/section>/);
  if (!gfSectionMatch) {
    issues.push({ severity: 'Error', category: 'GF Score Consistency', text: 'No GF Friendliness section found (see also: known Netherlands stub issue)' });
  } else {
    const gfHtml = gfSectionMatch[1];

    // City score rows
    const cityRowRe = /<span class="gf-city-name"><a href="[^"]*\/([a-z0-9-]+)">([^<]+)<\/a><\/span>\s*<div class="gf-city-score-bar">([\s\S]*?)<\/div>/g;
    let rowMatch;
    while ((rowMatch = cityRowRe.exec(gfHtml)) !== null) {
      const [, slug, name, barHtml] = rowMatch;
      const filled = (barHtml.match(/is-filled/g) || []).length;
      const cityFile = path.join(cityDir, `${slug}.html`);
      const cityHtml = readFile(cityFile);
      if (cityHtml) {
        const cityScore = extractCityScoreFromCityPage(cityHtml);
        if (cityScore !== null && cityScore !== filled) {
          issues.push({ severity: 'Error', category: 'GF Score Consistency', text: `${name} shows ${filled}/10 on the country page but ${cityScore}/10 on its own page` });
        }
      }
    }

    // Category pips
    const categoryRe = /<span class="gf-score-category">([^<]+)<\/span>\s*<div class="gf-score-pips">([\s\S]*?)<\/div>/g;
    let catMatch;
    let categorySum = 0;
    while ((catMatch = categoryRe.exec(gfHtml)) !== null) {
      const [, catName, pipsHtml] = catMatch;
      const filled = (pipsHtml.match(/is-filled/g) || []).length;
      const total = (pipsHtml.match(/gf-score-pip/g) || []).length;
      if (filled > 2) {
        issues.push({ severity: 'Error', category: 'GF Score Consistency', text: `"${catName}" has ${filled} filled pips (max should be 2)` });
      }
      categorySum += filled;
    }

    const totalMatch = gfHtml.match(/gf-score-total-num">(\d+)</);
    const displayedTotal = totalMatch ? parseInt(totalMatch[1], 10) : null;
    if (displayedTotal !== null && displayedTotal !== categorySum) {
      issues.push({ severity: 'Error', category: 'GF Score Consistency', text: `Categories sum to ${categorySum} but displayed total is ${displayedTotal}` });
    }

    const verdictMatch = gfHtml.match(/gf-verdict-tag gf-verdict-[a-z-]+"[^>]*>[\s\S]*?<\/span>([^<]+)</);
    if (verdictMatch && displayedTotal !== null) {
      const verdictText = verdictMatch[1].trim();
      const expectedTier = tierFor(displayedTotal);
      if (!verdictText.includes(expectedTier) && expectedTier !== 'Unknown') {
        issues.push({ severity: 'Error', category: 'GF Score Consistency', text: `Score is ${displayedTotal}/10 (should read as "${expectedTier}") but verdict tag shows "${verdictText}"` });
      }
    }
  }

  // 2f. Packing section order: Essential -> [Country]-Wide -> per-city/region groups
  const packingMatch = html.match(/<section class="packing"[\s\S]*?<\/section>/);
  if (packingMatch) {
    const packingHtml = packingMatch[0];
    const groupRe = /<div class="packing-group-label">([^<]+)<\/div>/g;
    const groups = [];
    let gMatch;
    while ((gMatch = groupRe.exec(packingHtml)) !== null) groups.push(gMatch[1].trim());

    if (groups[0] !== 'Essential') {
      issues.push({ severity: 'Error', category: 'Packing Order', text: `First packing group is "${groups[0] || '(none)'}", expected "Essential"` });
    }
    const countryWideLabel = groups.find(g => /-wide$/i.test(g));
    if (!countryWideLabel) {
      issues.push({ severity: 'Warning', category: 'Packing Order', text: 'No "[Country]-Wide" packing group found' });
    } else if (groups[1] !== countryWideLabel) {
      issues.push({ severity: 'Warning', category: 'Packing Order', text: `"${countryWideLabel}" should be the second group (right after Essential), found at position ${groups.indexOf(countryWideLabel) + 1}` });
    }

    const nonSpecialGroups = groups.filter(g => g !== 'Essential' && g !== countryWideLabel);
    const decodeEntities = s => s
      .replace(/&uuml;/g, 'u').replace(/&auml;/g, 'a').replace(/&ouml;/g, 'o')
      .replace(/&eacute;/g, 'e').replace(/&egrave;/g, 'e').replace(/&aacute;/g, 'a')
      .replace(/&iacute;/g, 'i').replace(/&oacute;/g, 'o').replace(/&uacute;/g, 'u')
      .replace(/&ntilde;/g, 'n').replace(/&ccedil;/g, 'c')
      .replace(/&amp;/g, 'and').replace(/&rsquo;/g, "'")
      // Raw (non-entity) accented Unicode also appears directly in these UTF-8 HTML files (e.g. "Flåm",
      // "Malé") — normalize by stripping diacritics rather than deleting the base letter entirely.
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    const groupSlug = g => decodeEntities(g).toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
    // A group covering multiple cities (contains "and"/"&", or matches 2+ built cities at once) is a
    // deliberate regional label (e.g. Scotland's "For the Highlands & Islands") — valid per the skill's
    // own notes, not a naming mismatch to flag.
    nonSpecialGroups.forEach(g => {
      const slug = groupSlug(g);
      const matchCount = builtCities.filter(city => slug.includes(city) || city.includes(slug)).length;
      const looksRegional = /\band\b|&/.test(g) || matchCount >= 2;
      if (matchCount === 0 && !looksRegional && builtCities.length > 0) {
        issues.push({ severity: 'Warning', category: 'Packing Order', text: `Packing group "${g}" doesn't match any built city page — check the name/slug` });
      }
    });
    const regionalGroups = nonSpecialGroups.filter(g => /\band\b|&/.test(g));
    builtCities.forEach(slug => {
      const cityLabel = slug.replace(/-/g, ' ');
      const represented = nonSpecialGroups.some(g => groupSlug(g).includes(slug) || g.toLowerCase().includes(cityLabel))
        || regionalGroups.length > 0; // assume a regional label covers remaining cities rather than false-flagging each one
      if (!represented) {
        issues.push({ severity: 'Info', category: 'Packing Order', text: `${cityLabel} has a built page but no dedicated packing group` });
      }
    });
  }

  // 2g. FAQ schema
  const faqItemCount = (html.match(/class="faq-item"/g) || []).length;
  const faqSchemaMatch = html.match(/"@type":\s*"FAQPage"[\s\S]*?"mainEntity":\s*\[([\s\S]*?)\]\s*\}/);
  if (!faqSchemaMatch) {
    issues.push({ severity: 'Error', category: 'FAQ Schema', text: 'No FAQPage JSON-LD schema found' });
  } else {
    const schemaQCount = (faqSchemaMatch[1].match(/"@type":\s*"Question"/g) || []).length;
    if (faqItemCount > 0 && schemaQCount !== faqItemCount) {
      issues.push({ severity: 'Warning', category: 'FAQ Schema', text: `Page has ${faqItemCount} visible FAQ items but schema has ${schemaQCount} questions` });
    }
  }

  // 2h. Nav links
  ['../gf-scoring', '../about', '../itineraries/'].forEach(href => {
    if (!html.includes(`href="${href}"`)) {
      issues.push({ severity: 'Error', category: 'Nav Links', text: `Nav is missing expected link: ${href}` });
    }
  });

  return { country, issues };
}

const results = countryFiles().map(validateCountry);
console.log(JSON.stringify(results, null, 2));
