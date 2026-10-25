// Renders the "overview" stats card type (photo strip + stat grid on cream),
// extending the existing .card-overview pattern from scotland-batch-1.html /
// japan-batch-1.html. Holds 6 stats (3x2) to fit Best Months + Ideal Stay
// alongside the original 4.
//
// Usage:
//   node render-overview-card.js              -> 4:5 (1080x1350), exports/
//   node render-overview-card.js --pinterest   -> 2:3 (1000x1500), exports/pinterest/

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.join(__dirname, '..', '..');
const PINTEREST = process.argv.includes('--pinterest');
const DIMS = PINTEREST ? { w: 500, h: 750 } : { w: 540, h: 675 };
const OUT_DIR = path.join(__dirname, '..', 'exports', ...(PINTEREST ? ['pinterest'] : []));

const CSS = `
  :root {
    --cream: #FFFCF9; --slate: #C8717A; --slate-light: #D9979E;
    --rose: #B8907A; --ink: #2A2018; --ink-light: #9A907A;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${DIMS.w}px; height: ${DIMS.h}px; overflow: hidden; font-family: 'Jost', sans-serif; }
  .card { width: ${DIMS.w}px; height: ${DIMS.h}px; position: relative; background: var(--cream); display: flex; flex-direction: column; }
  .photo-strip { height: 42%; position: relative; overflow: hidden; }
  .photo-strip .bg { position: absolute; inset: 0; background-size: cover; }
  .photo-strip::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 55%;
    background: linear-gradient(to top, var(--cream) 0%, transparent 100%);
  }
  .body { flex: 1; padding: 0 2.3rem 2.3rem; display: flex; flex-direction: column; justify-content: center; position: relative; }
  .country { font-size: 0.55rem; font-weight: 500; letter-spacing: 0.3em; text-transform: uppercase; color: var(--slate); margin-bottom: 0.3rem; }
  .city { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 2.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink); line-height: 1; margin-bottom: 1.1rem; }
  .rule { width: 2.5rem; height: 1px; background: var(--rose); margin-bottom: 1.3rem; }
  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem 1rem; }
  .stat-num { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 1.7rem; color: var(--slate); line-height: 1; display: block; }
  .stat-label { font-size: 0.52rem; font-weight: 400; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-light); display: block; margin-top: 0.15rem; }
  .watermark { position: absolute; bottom: 1.6rem; right: 2.2rem; font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 0.55rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-light); opacity: 0.5; }
`;

function buildHtml(card) {
  const statsHtml = card.stats.map(s => `
    <div><span class="stat-num">${s.num}</span><span class="stat-label">${s.label}</span></div>
  `).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
    <style>${CSS}</style></head><body>
    <div class="card" data-card>
      <div class="photo-strip"><div class="bg" style="background-image:url('${card.photo}'); background-position:${card.bgPos || 'center'};"></div></div>
      <div class="body">
        <div class="country">${card.country}</div>
        <div class="city">${card.city}</div>
        <div class="rule"></div>
        <div class="stats">${statsHtml}</div>
      </div>
      <div class="watermark">GF Gone Global</div>
    </div>
  </body></html>`;
}

const cards = [
  {
    out: 'gfgoneglobal-scotland-skye-portree-overview.png',
    photo: 'file://' + path.join(REPO_ROOT, 'photos/scotland/portree/quiraing-walk/IMG_9112.jpeg'),
    bgPos: 'center 55%',
    country: 'Isle of Skye',
    city: 'Portree',
    stats: [
      { num: '11', label: 'GF Restaurants' },
      { num: '6/10', label: 'GF Safety Score' },
      { num: '3', label: 'Scored 5/5 GF' },
      { num: '10', label: 'Landmarks' },
      { num: 'May–Sep', label: 'Best Months' },
      { num: '3–4', label: 'Ideal Stay (Nights)' },
    ],
  },
];

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpPath = path.join(__dirname, '_tmp-overview-card.html');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: DIMS.w, height: DIMS.h, deviceScaleFactor: 2 });

  for (const card of cards) {
    fs.writeFileSync(tmpPath, buildHtml(card));
    await page.goto('file://' + tmpPath, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(OUT_DIR, card.out) });
    console.log(`  ✓ ${card.out}`);
  }

  await browser.close();
  fs.unlinkSync(tmpPath);
  console.log(`\nDone! ${cards.length} overview cards saved to: ${OUT_DIR}`);
})();
