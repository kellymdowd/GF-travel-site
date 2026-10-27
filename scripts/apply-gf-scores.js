#!/usr/bin/env node
// Applies approved restaurant GF score changes to city pages, everywhere a
// score appears: card pips, schema.org ratingValue, map pins (data-array and
// per-marker styles), the map legend, and "Name (N/5 GF score" FAQ text.
//
//   node scripts/apply-gf-scores.js changes.json [--dry-run]
//
// changes.json: [{ "page": "countries/scotland/fort-william.html",
//                  "name": "Browns Restaurant", "cats": "11111" }, ...]
// cats = Rubric 3 marks in order Options, Labeling, Range, Safety, Recommend.
// The score is computed from them (100% GF places: "11111"), never typed.
// Names match the card's <h3 class="restaurant-name"> text (case/punctuation-insensitive).
// Each change must hit the card; other locations are updated when present.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const [file, ...flags] = process.argv.slice(2);
const dry = flags.includes('--dry-run');
if (!file) { console.error('Usage: node scripts/apply-gf-scores.js changes.json [--dry-run]'); process.exit(1); }

const ACCENT = /&([a-zA-Z])(uml|acute|grave|circ|tilde|cedil|ring);/g;
const norm = (s) => String(s)
  .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\'/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(d))
  .replace(ACCENT, '$1').replace(/&oslash;|ø/gi, 'o').replace(/&aelig;|æ/gi, 'ae').replace(/&amp;/g, '&')
  .replace(/&(rsquo|lsquo);/g, "'").replace(/&[a-z]+;/gi, '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const pipsHtml = (n, cls) => Array.from({ length: 5 }, (_, i) => `<span class="${cls}${i < n ? ' is-filled' : ''}"></span>`).join('');
const COLORS = { 5: '#3d6e40', 4: '#6a9a40', 3: '#b48c3c', 2: '#c87a50', 1: '#b4463c' };

const byPage = {};
for (const c of JSON.parse(fs.readFileSync(file, 'utf8'))) (byPage[c.page] ||= []).push(c);

let failed = 0;
for (const [page, changes] of Object.entries(byPage)) {
  let html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  for (const { name, cats } of changes) {
    if (!/^[01]{5}$/.test(cats || '')) { console.error(`✗ ${page}: ${name} needs cats like "11101"`); failed++; continue; }
    const score = Math.max(1, [...cats].reduce((t, b) => t + +b, 0));
    const hits = [];

    // Card pips: the first pip block after this card's name.
    const nameRe = /restaurant-name">([\s\S]*?)<\/h3>/g;
    let m, card = false;
    while ((m = nameRe.exec(html))) {
      if (norm(m[1]) !== norm(name)) continue;
      const p = html.indexOf('restaurant-gf-pips">', m.index);
      const end = html.indexOf('</div>', p);
      const cls = (html.slice(p, end).match(/class="(restaurant-gf-pip)/) || [, 'restaurant-gf-pip'])[1];
      const open = html.lastIndexOf('<div', p);
      html = html.slice(0, open) + `<div data-gf="${cats}" class="restaurant-gf-pips">` + pipsHtml(score, cls) + html.slice(end);
      card = true;
      break;
    }
    if (!card) { console.error(`✗ ${page}: no card named "${name}"`); failed++; continue; }
    hits.push('card');

    // schema.org Restaurant ratingValue.
    html = html.replace(/("@type":\s*"Restaurant",\s*"name":\s*"([^"]+)"(?:(?!"@type":\s*"Restaurant")[\s\S]){0,900}?"ratingValue":\s*)"?(\d)"?/g, (all, pre, nm) => {
      if (norm(nm) !== norm(name)) return all;
      hits.push('schema');
      return `${pre}${score}`;
    });

    // Map data array: { name:'X', score:N, ... }
    html = html.replace(/(\{\s*name:\s*'((?:[^'\\]|\\.)*)',\s*score:\s*)(\d)/g, (all, pre, nm) => {
      if (norm(nm) !== norm(name)) return all;
      hits.push('map');
      return `${pre}${score}`;
    });

    // Per-marker style: makeIcon(scoreColor(N)) ... bindPopup(mp('X')
    html = html.replace(/(scoreColor\()(\d)(\)\)?\s*\}\)\.addTo\(\w+\)\.bindPopup\(mp\('((?:[^'\\]|\\.)*)'\))/g, (all, a, n, b, nm) => {
      if (norm(nm) !== norm(name)) return all;
      hits.push('marker');
      return `${a}${score}${b}`;
    });

    // FAQ / summary text: "Name (N/5 GF score"
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/&/g, '(?:&|&amp;)');
    html = html.replace(new RegExp(`(${esc} \\()(\\d)(/5 GF score)`, 'g'), (all, a, n, b) => { hits.push('faq'); return `${a}${score}${b}`; });

    console.log(`${dry ? '·' : '✓'} ${page}: ${name} → ${score}/5 (${[...new Set(hits)].join(', ')})`);
  }

  // Per-marker pages carry a static legend; rebuild it from the scores now on the map.
  const legend = html.match(/(<div class="map-legend">)([\s\S]*?)(<\/div>\s*\n\s*<div class="restaurants-grid">)/);
  if (legend && /scoreColor\(/.test(html)) {
    const scores = [...new Set([...html.matchAll(/scoreColor\((\d)\)\)?\s*\}\)\.addTo/g)].map((x) => +x[1]))].sort((a, b) => b - a);
    const hotel = legend[2].match(/\s*<div class="map-legend-item">[^\n]*Hotel<\/div>/);
    const items = scores.map((s) => `\n      <div class="map-legend-item"><span class="map-legend-dot" style="background:${COLORS[s]};"></span> Score ${s}</div>`).join('');
    html = html.replace(legend[0], legend[1] + items + (hotel ? hotel[0] : '') + '\n    ' + legend[3]);
  }

  if (!dry) fs.writeFileSync(path.join(ROOT, page), html);
}
process.exit(failed ? 1 : 0);
