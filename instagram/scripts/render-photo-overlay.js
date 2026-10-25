// Renders the photo-overlay card treatment (full-bleed photo, bottom scrim,
// serif title, optional subtitle + GF score dots, GF GONE GLOBAL watermark)
// at 1080x1350 (4:5). Used for the Skye carousel-slide retrofit and the
// redesigned end cards. Extends the existing card-landscape pattern from
// scotland-batch-1.html / japan-batch-1.html to the taller ratio — same
// type system and palette, not a new visual identity.
//
// Usage: node render-photo-overlay.js

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(__dirname, '..', 'exports');

const CSS = `
  :root {
    --cream: #FFFCF9; --slate: #C8717A; --slate-light: #D9979E;
    --rose: #B8907A; --rose-light: #D4B5A0; --ink: #2A2018;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 540px; height: 675px; overflow: hidden; }
  .card { width: 540px; height: 675px; position: relative; }
  .card-bg {
    position: absolute; inset: 0; background-size: cover;
  }
  .scrim {
    position: absolute; left: 0; right: 0; bottom: 0; height: 56%;
    background: linear-gradient(to top,
      rgba(42,32,24,0.92) 0%, rgba(42,32,24,0.78) 22%,
      rgba(42,32,24,0.38) 50%, rgba(42,32,24,0) 100%);
  }
  .content { position: absolute; left: 0; right: 0; bottom: 0; padding: 2.3rem 2.1rem 2.5rem; z-index: 2; }
  .label {
    font-family: 'Jost', sans-serif; font-size: 0.5rem; font-weight: 500;
    letter-spacing: 0.3em; text-transform: uppercase; color: var(--slate-light);
    margin-bottom: 0.5rem;
  }
  .title {
    font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 2rem;
    letter-spacing: 0.05em; text-transform: uppercase; color: #fff; line-height: 1.12;
  }
  .title.long { font-size: 1.5rem; text-transform: none; letter-spacing: 0.01em; line-height: 1.35; max-width: 430px; }
  .subtitle {
    font-family: 'Jost', sans-serif; font-weight: 300; font-size: 0.78rem;
    color: rgba(255,255,255,0.75); margin-top: 0.5rem;
  }
  .score { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.9rem; }
  .dots { display: flex; gap: 0.3rem; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.22); }
  .dot.filled { background: var(--slate-light); }
  .score-label {
    font-family: 'Jost', sans-serif; font-size: 0.52rem; font-weight: 400;
    letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.5);
  }
  .watermark {
    position: absolute; top: 1.6rem; right: 1.8rem; z-index: 2;
    font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 0.55rem;
    letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.45);
  }
`;

function buildHtml(slide) {
  const scoreHtml = slide.score
    ? `<div class="score">
        <div class="dots">${Array.from({ length: slide.score.max }, (_, i) =>
          `<span class="dot${i < slide.score.score ? ' filled' : ''}"></span>`
        ).join('')}</div>
        <span class="score-label">GF Score</span>
      </div>`
    : '';
  const titleClass = slide.longTitle ? 'title long' : 'title';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
    <style>${CSS}</style></head><body>
    <div class="card" data-card>
      <div class="card-bg" style="background-image:url('${slide.photo}'); background-position:${slide.bgPos || 'center'}; background-size:${slide.bgSize || 'cover'};"></div>
      <div class="scrim"></div>
      <div class="watermark">GF Gone Global</div>
      <div class="content">
        ${slide.label ? `<div class="label">${slide.label}</div>` : ''}
        <div class="${titleClass}">${slide.title}</div>
        ${slide.subtitle ? `<div class="subtitle">${slide.subtitle}</div>` : ''}
        ${scoreHtml}
      </div>
    </div>
  </body></html>`;
}

const slides = [
  {
    out: 'gfgoneglobal-scotland-skye-portree-harbour.png',
    photo: 'file://' + path.join(REPO_ROOT, 'photos/scotland/portree/colour-house-viewpoint/IMG_9155.jpeg'),
    label: 'Portree, Isle of Skye',
    title: 'Portree Harbour',
    bgPos: 'center 40%',
  },
  {
    out: 'gfgoneglobal-scotland-skye-the-view-restaurant.png',
    photo: 'file://' + path.join(REPO_ROOT, 'photos/scotland/portree/the-view-restaurant-at-cuillins-hills/IMG_9152.jpeg'),
    label: 'Portree, Isle of Skye',
    title: 'The View Restaurant',
    subtitle: 'Scottish & Seafood Fine Dining · Cuillin Hills Hotel',
    score: { score: 5, max: 5 },
    bgPos: 'center 55%',
  },
  {
    out: 'gfgoneglobal-scotland-skye-chargrill.png',
    photo: 'file://' + path.join(REPO_ROOT, 'photos/scotland/portree/chargrill-restaurant-portree-at-marmalade-hotel/IMG_9117.jpeg'),
    label: 'Portree, Isle of Skye',
    title: 'Chargrill',
    subtitle: 'Scottish · Steak & Seafood — Marmalade Hotel',
    score: { score: 4, max: 5 },
    bgPos: '68% 88%',
    bgSize: '148%',
  },
  {
    out: 'gfgoneglobal-scotland-skye-cuillin-hills-hotel.png',
    photo: 'file://' + path.join(REPO_ROOT, 'photos/scotland/portree/the-view-restaurant-at-cuillins-hills/IMG_9124.jpeg'),
    label: 'Where to Stay · Portree',
    title: 'Cuillin Hills Hotel',
    subtitle: 'Home of The View Restaurant · Overlooking Portree Bay',
    bgPos: '40% 55%',
  },
  {
    out: 'gfgoneglobal-scotland-skye-quiraing.png',
    photo: 'file://' + path.join(REPO_ROOT, 'photos/scotland/portree/quiraing-walk/IMG_9273.jpeg'),
    label: 'Isle of Skye, Scotland',
    title: 'The Quiraing',
    bgPos: 'center 55%',
  },
  {
    out: 'gfgoneglobal-scotland-skye-fairy-pools.png',
    photo: 'file://' + path.join(REPO_ROOT, 'photos/scotland/portree/fairy-pools/IMG_9163.jpeg'),
    label: 'Isle of Skye, Scotland',
    title: 'Fairy Pools',
    bgPos: 'center 50%',
  },
  {
    out: 'gfgoneglobal-japan-end-card.png',
    photo: 'file://' + path.join(REPO_ROOT, 'photos/japan/kyoto/kinkaku-ji/IMG_0977.jpeg'),
    label: 'Thanks for Following Along',
    title: 'The full guide — every restaurant, GF score, and map — is on the site.',
    subtitle: 'Link in bio',
    longTitle: true,
    bgPos: 'center 50%',
  },
];

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpPath = path.join(__dirname, '_tmp-slide.html');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 540, height: 675, deviceScaleFactor: 2 });

  for (const slide of slides) {
    fs.writeFileSync(tmpPath, buildHtml(slide));
    await page.goto('file://' + tmpPath, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(OUT_DIR, slide.out) });
    console.log(`  ✓ ${slide.out}`);
  }

  await browser.close();
  fs.unlinkSync(tmpPath);
  console.log(`\nDone! ${slides.length} slides saved to: ${OUT_DIR}`);
})();
