#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const results = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const outPath = process.argv[3];

const sevColor = { Error: '#b4463c', Warning: '#b48c3c', Info: '#9a907a' };
const sevBg = { Error: 'rgba(180,70,60,0.08)', Warning: 'rgba(180,140,60,0.08)', Info: 'rgba(154,144,122,0.08)' };

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const totalE = results.reduce((n, c) => n + c.issues.filter(i => i.severity === 'Error').length, 0);
const totalW = results.reduce((n, c) => n + c.issues.filter(i => i.severity === 'Warning').length, 0);
const totalI = results.reduce((n, c) => n + c.issues.filter(i => i.severity === 'Info').length, 0);

const countryBlocks = results.map(c => {
  const e = c.issues.filter(i => i.severity === 'Error').length;
  const w = c.issues.filter(i => i.severity === 'Warning').length;
  const inf = c.issues.filter(i => i.severity === 'Info').length;
  if (c.issues.length === 0) {
    return `<div class="country-block clean"><h3>${esc(c.country)} <span class="clean-tag">clean — no issues</span></h3></div>`;
  }
  const byCategory = {};
  c.issues.forEach(i => {
    byCategory[i.category] = byCategory[i.category] || [];
    byCategory[i.category].push(i);
  });
  const categoryHtml = Object.entries(byCategory).map(([cat, items]) => `
    <details open>
      <summary>${esc(cat)} <span class="count">${items.length}</span></summary>
      <ul>
        ${items.map(i => `<li class="issue" style="border-left-color:${sevColor[i.severity]}; background:${sevBg[i.severity]}">
          <span class="sev" style="color:${sevColor[i.severity]}">${i.severity}</span> ${esc(i.text)}
        </li>`).join('')}
      </ul>
    </details>
  `).join('');
  return `
    <div class="country-block">
      <h3>${esc(c.country)} <span class="tally">${e} error${e!==1?'s':''}, ${w} warning${w!==1?'s':''}, ${inf} info</span></h3>
      ${categoryHtml}
    </div>
  `;
}).join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Country Page Validation Report</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root { --cream: #FFFFFF; --slate: #C8717A; --ink: #2A2018; --ink-mid: #5A5048; --ink-light: #9A907A; }
  * { box-sizing: border-box; }
  body { background: var(--cream); color: var(--ink); font-family: 'Jost', sans-serif; font-weight: 300; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 3rem 2rem 6rem; }
  h1 { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 2.2rem; letter-spacing: 0.02em; margin-bottom: 0.3rem; }
  .timestamp { color: var(--ink-light); font-size: 0.75rem; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 2rem; }
  .summary-cards { display: flex; gap: 1rem; margin-bottom: 3rem; }
  .card { flex: 1; padding: 1.2rem; border-radius: 6px; text-align: center; }
  .card .num { font-family: 'Cormorant Garamond', serif; font-size: 2.4rem; line-height: 1; }
  .card .label { font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-light); margin-top: 0.4rem; }
  .card.errors { background: rgba(180,70,60,0.08); } .card.errors .num { color: #b4463c; }
  .card.warnings { background: rgba(180,140,60,0.08); } .card.warnings .num { color: #b48c3c; }
  .card.info { background: rgba(154,144,122,0.08); } .card.info .num { color: #9a907a; }
  .country-block { margin-bottom: 2rem; border-top: 1px solid rgba(42,32,24,0.1); padding-top: 1.2rem; }
  .country-block h3 { font-family: 'Cormorant Garamond', serif; font-weight: 500; font-size: 1.4rem; text-transform: capitalize; margin-bottom: 0.8rem; }
  .country-block .tally { font-family: 'Jost', sans-serif; font-size: 0.68rem; font-weight: 400; color: var(--ink-light); text-transform: none; margin-left: 0.6rem; }
  .country-block.clean h3 { color: var(--ink-light); font-size: 1.1rem; }
  .clean-tag { font-family: 'Jost', sans-serif; font-size: 0.68rem; color: #4c8c50; }
  details { margin-bottom: 0.6rem; }
  summary { cursor: pointer; font-size: 0.8rem; font-weight: 400; letter-spacing: 0.03em; padding: 0.4rem 0; }
  summary .count { color: var(--ink-light); font-weight: 300; }
  ul { list-style: none; padding: 0; margin: 0.4rem 0; }
  .issue { padding: 0.6rem 0.8rem; margin-bottom: 0.4rem; border-left: 3px solid; border-radius: 0 4px 4px 0; font-size: 0.82rem; }
  .sev { font-weight: 500; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; margin-right: 0.5rem; }
</style>
</head>
<body>
  <h1>Country Page Validation Report</h1>
  <div class="timestamp">${new Date().toString()}</div>
  <div class="summary-cards">
    <div class="card errors"><div class="num">${totalE}</div><div class="label">Errors</div></div>
    <div class="card warnings"><div class="num">${totalW}</div><div class="label">Warnings</div></div>
    <div class="card info"><div class="num">${totalI}</div><div class="label">Info</div></div>
  </div>
  ${countryBlocks}
</body>
</html>`;

fs.writeFileSync(outPath, html);
console.log('Report written to', outPath);
