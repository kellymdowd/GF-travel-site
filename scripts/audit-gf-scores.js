#!/usr/bin/env node
// Audits GF scores across every city and country page for internal consistency.
//
//   node scripts/audit-gf-scores.js            human-readable report
//   node scripts/audit-gf-scores.js --json     machine-readable (for skills/validators)
//
// Checks (see gf-scoring.html for the three rubrics):
//   city-sum        city breakdown pips (5 categories x 0–2) add up to the headline total
//   city-verdict    city verdict label matches the Rubric 2 scale for that total
//   city-snapshot   City Snapshot "N/10" and its pips match the breakdown total
//   country-sum     country breakdown pips add up to the country total
//   country-verdict country verdict matches the Rubric 1 scale
//   country-city    each city bar on a country page matches that city page's total
//   rest-sheet      restaurant card pips match travel_master.xlsx celiac_safety_score
//   rest-dedicated  a 100%-GF / dedicated restaurant scores 5/5 (Rubric 3 rule)
//   rest-schema     the page's schema.org review ratingValue matches the card's pips
//   rest-uniform    every scored restaurant in a city has the same score: the
//                   signature of bucket-default scoring rather than a category count
//   copy-dedicated  copy claiming 5/5 is "reserved for" / "requires" dedicated kitchens
//
// Exit code 1 when any check fails, so this can gate a commit or a validator run.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const COUNTRIES = path.join(ROOT, 'countries');
const asJson = process.argv.includes('--json');

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, '’').replace(/<[^>]+>/g, '').trim();
const filled = (html) => (html.match(/is-filled/g) || []).length;

const CITY_VERDICT = (n) => (n >= 7 ? 'easy' : n >= 5 ? 'moderate' : n >= 3 ? 'difficult' : 'very difficult');
const COUNTRY_VERDICT = (n) => (n >= 7 ? 'gf friendly' : n >= 5 ? 'manageable' : n >= 3 ? 'challenging' : 'very challenging');

const findings = [];
const add = (check, page, msg) => findings.push({ check, page, msg });

// Spreadsheet scores, keyed by city + normalized place name.
const norm = (s) => String(s).toLowerCase().replace(/&amp;/g, '&').replace(/[^a-z0-9]+/g, ' ').trim();
const sheet = new Map();
try {
  const XLSX = require('xlsx');
  const rows = XLSX.utils.sheet_to_json(XLSX.readFile(path.join(ROOT, 'travel_master.xlsx')).Sheets.places, { defval: '' });
  for (const r of rows) sheet.set(`${norm(r.city)}|${norm(r.place_name)}`, r);
} catch (e) {
  // travel_master.xlsx is local-only; skip the sheet check when it's absent.
}

function breakdown(html, start) {
  const i = html.indexOf(start);
  if (i < 0) return null;
  const seg = html.slice(i, html.indexOf('</section>', i));
  const rows = [...seg.matchAll(/gf-score-category">([\s\S]*?)<\/span>\s*<div class="gf-score-pips">([\s\S]*?)<\/div>/g)]
    .map(([, name, pips]) => ({ name: decode(name), n: filled(pips) }));
  const tot = seg.match(/gf-score-total-num">\s*(\d+)/);
  const verdict = seg.match(/(?:gf-guide-difficulty|gf-verdict-tag)[^>]*>[\s\S]*?<\/span>\s*([^<]+)</);
  // Verdicts sometimes carry extras ("Difficult (4/10)", "Moderate — doable with planning").
  const v = verdict ? decode(verdict[1]).toLowerCase().replace(/\(.*?\)|\d+\s*\/\s*10|(&mdash;|—).*$/g, '').replace(/^[\s—-]+|[\s—-]+$/g, '').trim() : null;
  return { rows, sum: rows.reduce((a, r) => a + r.n, 0), total: tot ? +tot[1] : null, verdict: v };
}

const cityTotals = new Map(); // "country/city" -> total

for (const country of fs.readdirSync(COUNTRIES)) {
  const dir = path.join(COUNTRIES, country);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.html'))) {
    const rel = `countries/${country}/${f}`;
    const html = fs.readFileSync(path.join(dir, f), 'utf8');
    const city = f.replace(/\.html$/, '');

    const b = breakdown(html, '<section class="gf-guide');
    if (b && b.rows.length) {
      if (b.total !== null && b.sum !== b.total) add('city-sum', rel, `breakdown adds to ${b.sum}, headline says ${b.total}`);
      const total = b.total ?? b.sum;
      cityTotals.set(`${country}/${city}`, total);
      if (b.verdict && b.verdict !== CITY_VERDICT(total)) add('city-verdict', rel, `verdict "${b.verdict}" but ${total}/10 is "${CITY_VERDICT(total)}"`);
      const snap = html.match(/snapshot-score-num">\s*(\d+)\s*\/\s*10[\s\S]*?snapshot-score-bar">([\s\S]*?)<\/div>/);
      if (snap && (+snap[1] !== total || filled(snap[2]) !== +snap[1])) add('city-snapshot', rel, `snapshot says ${snap[1]}/10 with ${filled(snap[2])} pips; breakdown total ${total}`);
    }

    // Restaurant cards: each card's own pips (the first pip block after its name).
    const cityName = (html.match(/<title>(?:Gluten-Free\s+)?([^:|<,]+)/) || [])[1];
    const scores = [];
    const chunks = html.split('class="restaurant-card"').slice(1);
    for (const c of chunks) {
      const name = c.match(/restaurant-name">([\s\S]*?)<\/h3>/);
      const pips = c.match(/restaurant-gf-pips">([\s\S]*?)<\/div>/);
      if (!name || !pips) continue;
      const nm = decode(name[1]);
      const n = filled(pips[1]);
      if (/restaurant-tag-closed/.test(c.slice(0, c.indexOf('restaurant-gf-pips')))) continue;
      scores.push(n);
      const head = c.slice(0, c.indexOf('restaurant-details') > 0 ? c.indexOf('restaurant-details') : 800);
      // Dedicated = the card's structured tag, not prose ("dedicated GF fryer" isn't a dedicated kitchen).
      const tags = [...c.slice(0, c.indexOf('restaurant-gf-pips')).matchAll(/restaurant-tag[^"]*">([^<]*)</g)].map((m) => decode(m[1])).filter(Boolean);
      if (tags.some((t) => /^(100% GF( Kitchen)?|Dedicated GF|Dedicated Facility)$/i.test(t)) && n !== 5) add('rest-dedicated', rel, `${nm}: tagged ${tags.join(', ')} but scored ${n}/5`);
      if (sheet.size) {
        const keyCity = norm(cityName || city.replace(/-/g, ' '));
        const r = sheet.get(`${keyCity}|${norm(nm)}`) || [...sheet.entries()].find(([k]) => k.startsWith(keyCity + '|') && (k.includes(norm(nm)) || norm(nm).includes(k.split('|')[1])))?.[1];
        if (r && r.celiac_safety_score !== '' && +r.celiac_safety_score !== n) add('rest-sheet', rel, `${nm}: page ${n}/5, spreadsheet ${r.celiac_safety_score}/5`);
      }
    }
    // schema.org copies of each rating (rich results) must match the cards.
    const cardScore = new Map();
    for (const c of chunks) {
      const name = c.match(/restaurant-name">([\s\S]*?)<\/h3>/);
      const pips = c.match(/restaurant-gf-pips">([\s\S]*?)<\/div>/);
      if (name && pips) cardScore.set(norm(decode(name[1])), filled(pips[1]));
    }
    for (const [, nm, val] of html.matchAll(/"@type":\s*"Restaurant",\s*"name":\s*"([^"]+)"[\s\S]{0,900}?"ratingValue":\s*"?(\d)/g)) {
      const n = cardScore.get(norm(nm));
      if (n !== undefined && n !== +val) add('rest-schema', rel, `${decode(nm)}: schema rating ${val}/5, card shows ${n}/5`);
    }
    if (scores.length >= 3 && new Set(scores).size === 1) add('rest-uniform', rel, `all ${scores.length} restaurants scored ${scores[0]}/5 (bucket default? recount against Rubric 3)`);

    if (/5\/5[^.<]{0,60}(reserved for|require[sd]?|only for)[^.<]{0,30}dedicated/i.test(html)) add('copy-dedicated', rel, '5/5 described as reserved for/requiring dedicated kitchens');
  }
}

let countriesScored = 0;
for (const f of fs.readdirSync(COUNTRIES).filter((f) => f.endsWith('.html'))) {
  const rel = `countries/${f}`;
  const country = f.replace(/\.html$/, '');
  const html = fs.readFileSync(path.join(COUNTRIES, f), 'utf8');
  const b = breakdown(html, '<section class="gf-section');
  if (b && b.rows.length) {
    countriesScored++;
    if (b.total !== null && b.sum !== b.total) add('country-sum', rel, `breakdown adds to ${b.sum}, headline says ${b.total}`);
    const total = b.total ?? b.sum;
    if (b.verdict && b.verdict !== COUNTRY_VERDICT(total)) add('country-verdict', rel, `verdict "${b.verdict}" but ${total}/10 is "${COUNTRY_VERDICT(total)}"`);
  }
  for (const [, slug, pips] of html.matchAll(/gf-city-name"><a href="[^"]*?\/([^"/]+)">[\s\S]*?gf-city-score-bar">([\s\S]*?)<\/div>/g)) {
    const t = cityTotals.get(`${country}/${slug}`);
    if (t !== undefined && filled(pips) !== t) add('country-city', rel, `${slug}: country page shows ${filled(pips)}/10, city page says ${t}/10`);
  }
  if (/5\/5[^.<]{0,60}(reserved for|require[sd]?|only for)[^.<]{0,30}dedicated/i.test(html)) add('copy-dedicated', rel, '5/5 described as reserved for/requiring dedicated kitchens');
}

for (const f of ['gf-scoring.html', 'index.html', 'about.html']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p) && /5\/5[^.<]{0,60}(reserved for|require[sd]?|only for)[^.<]{0,30}dedicated/i.test(fs.readFileSync(p, 'utf8'))) add('copy-dedicated', f, '5/5 described as reserved for/requiring dedicated kitchens');
}

if (asJson) {
  console.log(JSON.stringify(findings, null, 2));
} else {
  const byCheck = {};
  for (const x of findings) (byCheck[x.check] ||= []).push(x);
  console.log(`GF score audit: ${findings.length} finding(s) across ${cityTotals.size} scored city pages and ${countriesScored} scored country pages\n`);
  for (const [check, xs] of Object.entries(byCheck)) {
    console.log(`${check} (${xs.length})`);
    for (const x of xs) console.log(`  ${x.page}: ${x.msg}`);
    console.log('');
  }
}
process.exit(findings.length ? 1 : 0);
