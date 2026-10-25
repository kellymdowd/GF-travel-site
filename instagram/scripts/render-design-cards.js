// Redesigned "explainer" card (visual split-stat layout instead of a wall of
// text) and the new "packing" card type (icon grid), both at 1080x1350.
// Usage: node render-design-cards.js

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'exports');
const MAP_PATH = 'file://' + path.join(__dirname, '..', 'map-assets', 'scotland-map.png');

const SHARED_CSS = `
  :root {
    --cream: #FFFCF9; --slate: #C8717A; --slate-light: #D9979E;
    --rose: #B8907A; --ink: #2A2018; --ink-mid: #5A5048; --ink-light: #9A907A;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 540px; height: 675px; overflow: hidden; font-family: 'Jost', sans-serif; }
  .card {
    width: 540px; height: 675px; position: relative; background: var(--cream);
    padding: 3.4rem 2.3rem 3rem; display: flex; flex-direction: column;
    justify-content: space-between;
  }
  .header { position: relative; }
  .card::before {
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 15% 85%, rgba(200,113,122,0.07) 0%, transparent 55%),
      radial-gradient(ellipse at 85% 15%, rgba(184,144,122,0.07) 0%, transparent 55%);
  }
  .label {
    font-size: 0.5rem; font-weight: 500; letter-spacing: 0.3em; text-transform: uppercase;
    color: var(--slate); margin-bottom: 0.5rem; position: relative; text-align: center;
  }
  .title {
    font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 1.75rem;
    letter-spacing: 0.02em; color: var(--ink); line-height: 1.25; text-align: center;
    position: relative; margin-top: 0.6rem;
  }
  .watermark {
    position: absolute; bottom: 1.8rem; right: 2.2rem;
    font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 0.55rem;
    letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-light); opacity: 0.5;
  }
  .footer-note {
    position: relative; text-align: center; font-size: 0.68rem; color: var(--ink-light);
    letter-spacing: 0.04em; margin-top: 1.4rem;
  }

  /* explainer-specific */
  .split { position: relative; display: flex; align-items: center; justify-content: center; gap: 1.6rem; }
  .stat-block { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.5rem; }
  .stat-block .big-num { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 3.2rem; color: var(--slate); line-height: 1; }
  .stat-block .dots { display: flex; gap: 0.4rem; }
  .stat-block .dot { width: 14px; height: 14px; border-radius: 50%; background: var(--slate-light); }
  .stat-block .stat-name { font-size: 0.6rem; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink); }
  .stat-block .stat-desc { font-size: 0.72rem; color: var(--ink-mid); line-height: 1.6; max-width: 180px; }
  .divider { width: 1px; align-self: stretch; background: rgba(42,32,24,0.1); }

  /* packing-specific */
  .icon-grid { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 1.8rem 1.2rem; }
  .icon-item { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.6rem; }
  .icon-circle {
    width: 56px; height: 56px; border-radius: 50%; background: var(--slate-light);
    display: flex; align-items: center; justify-content: center;
  }
  .icon-circle svg { width: 26px; height: 26px; stroke: #fff; }
  .icon-name { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 1.05rem; color: var(--ink); }
  .icon-why { font-size: 0.66rem; color: var(--ink-mid); line-height: 1.5; max-width: 190px; }

  /* map end-card specific */
  .card.end-card-map { justify-content: flex-start; gap: 1.5rem; }
  .map-frame {
    position: relative; width: 100%; aspect-ratio: 1 / 1; border-radius: 6px;
    overflow: hidden; background: #F0ECE6;
  }
  .map-frame img { position: absolute; width: 180%; max-width: none; left: -48%; top: -32%; }
  .end-title {
    font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 1.5rem;
    letter-spacing: 0.01em; color: var(--ink); line-height: 1.3; text-align: center;
    position: relative; max-width: 420px; align-self: center;
  }
  .end-subtitle { font-size: 0.7rem; color: var(--ink-light); text-align: center; position: relative; align-self: center; }
`;

const ICONS = {
  boots: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20l1-13 5 1 2 4h9c1.5 2 1.5 4.5 0 8H3z"/><path d="M4 7l5 1"/></svg>',
  rain: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 12a5 5 0 00-9.8-1.5A4 4 0 006 18h11a4 4 0 000-8h-.2"/><path d="M9 20l-1 2M13 20l-1 2M17 20l-1 2"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 18l9 5 9-5"/></svg>',
  bug: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="13" rx="4.5" ry="6"/><path d="M12 7V4M9 6l-2-2M15 6l2-2M7 11l-3-1M7 15l-3 1M17 11l3-1M17 15l3 1M9.5 19l-1.5 2M14.5 19l1.5 2"/></svg>',
};

function explainerHtml() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
    <style>${SHARED_CSS}</style></head><body>
    <div class="card" data-card>
      <div class="header">
        <div class="label">How to Read My GF Scores</div>
        <div class="title">Two scores, two different jobs</div>
      </div>
      <div class="split">
        <div class="stat-block">
          <div class="big-num">7/10</div>
          <div class="stat-name">City Score</div>
          <div class="stat-desc">How GF-friendly the whole destination is — density, staff awareness, dedicated kitchens.</div>
        </div>
        <div class="divider"></div>
        <div class="stat-block">
          <div class="dots">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span>
            <span class="dot" style="background:rgba(0,0,0,0.12)"></span>
          </div>
          <div class="stat-name">Restaurant Score</div>
          <div class="stat-desc">Just for that one place — how safely I’d eat there as a celiac.</div>
        </div>
      </div>
      <div class="footer-note">Both scores, every city — on the site</div>
      <div class="watermark">GF Gone Global</div>
    </div>
  </body></html>`;
}

function packingHtml() {
  const items = [
    { icon: ICONS.boots, name: 'Waterproof Boots', why: 'Non-negotiable for the Quiraing and Fairy Pools.' },
    { icon: ICONS.rain, name: 'Packable Rain Jacket', why: 'It will rain, even in July.' },
    { icon: ICONS.layers, name: 'Layers', why: 'Sunshine to wind to drizzle, same afternoon.' },
    { icon: ICONS.bug, name: 'Midge Repellent', why: 'Brutal May–September near water.' },
  ];
  const itemsHtml = items.map(i => `
    <div class="icon-item">
      <div class="icon-circle">${i.icon}</div>
      <div class="icon-name">${i.name}</div>
      <div class="icon-why">${i.why}</div>
    </div>
  `).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
    <style>${SHARED_CSS}</style></head><body>
    <div class="card" data-card>
      <div class="header">
        <div class="label">Portree · Packing Essentials</div>
        <div class="title">What to Pack for Skye</div>
      </div>
      <div class="icon-grid">${itemsHtml}</div>
      <div class="footer-note">Full Scotland packing list — link in bio</div>
      <div class="watermark">GF Gone Global</div>
    </div>
  </body></html>`;
}

function scotlandEndCardHtml() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
    <style>${SHARED_CSS}</style></head><body>
    <div class="card end-card-map" data-card>
      <div class="label" style="margin-bottom:0;">Thanks for Following Along</div>
      <div class="map-frame"><img src="${MAP_PATH}"></div>
      <div class="end-title">The full guide — every restaurant, GF score, and map — is on the site.</div>
      <div class="end-subtitle">Link in bio</div>
      <div class="watermark">GF Gone Global</div>
    </div>
  </body></html>`;
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpPath = path.join(__dirname, '_tmp-design-card.html');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 540, height: 675, deviceScaleFactor: 2 });

  const cards = [
    { out: 'gfgoneglobal-explainer-gf-scores.png', html: explainerHtml() },
    { out: 'gfgoneglobal-scotland-skye-what-to-pack.png', html: packingHtml() },
    { out: 'gfgoneglobal-scotland-end-card.png', html: scotlandEndCardHtml() },
  ];

  for (const card of cards) {
    fs.writeFileSync(tmpPath, card.html);
    await page.goto('file://' + tmpPath, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(OUT_DIR, card.out) });
    console.log(`  ✓ ${card.out}`);
  }

  await browser.close();
  fs.unlinkSync(tmpPath);
  console.log(`\nDone! ${cards.length} cards saved to: ${OUT_DIR}`);
})();
