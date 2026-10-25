// Renders the "practical" and "explainer" text-card types at 1080x1350.
// Extends the existing .card-tip pattern (cream bg, radial texture, centered
// content) from scotland-batch-1.html / japan-batch-1.html to the taller
// 4:5 ratio and a two-line title+body convention.
//
// Usage: node render-text-card.js

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'exports');

const CSS = `
  :root {
    --cream: #FFFCF9; --slate: #C8717A; --rose: #B8907A; --ink: #2A2018; --ink-mid: #5A5048; --ink-light: #9A907A;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 540px; height: 675px; overflow: hidden; font-family: 'Jost', sans-serif; }
  .card {
    width: 540px; height: 675px; position: relative; background: var(--cream);
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 3.2rem; text-align: center;
  }
  .card::before {
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 20% 80%, rgba(200,113,122,0.08) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 20%, rgba(184,144,122,0.08) 0%, transparent 60%);
  }
  .label {
    font-size: 0.5rem; font-weight: 500; letter-spacing: 0.3em; text-transform: uppercase;
    color: var(--slate); margin-bottom: 1.6rem; position: relative;
  }
  .title {
    font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 1.9rem;
    letter-spacing: 0.03em; color: var(--ink); line-height: 1.3; max-width: 420px; position: relative;
  }
  .body {
    font-size: 0.8rem; font-weight: 300; line-height: 1.75; color: var(--ink-mid);
    margin-top: 1.3rem; max-width: 400px; position: relative;
  }
  .rule { width: 2rem; height: 1px; background: var(--rose); margin: 1.5rem auto 0; position: relative; }
  .watermark {
    position: absolute; bottom: 1.8rem; right: 2.2rem;
    font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 0.55rem;
    letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-light); opacity: 0.5;
  }
`;

function buildHtml(card) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
    <style>${CSS}</style></head><body>
    <div class="card" data-card>
      <div class="label">${card.label}</div>
      <div class="title">${card.title}</div>
      <div class="rule"></div>
      <div class="body">${card.body}</div>
      <div class="watermark">GF Gone Global</div>
    </div>
  </body></html>`;
}

const cards = [
  {
    out: 'gfgoneglobal-scotland-portree-practical-grocery.png',
    label: 'Portree · Grocery Guide',
    title: 'Where to Stock Up on GF in Portree',
    body: "Jackson's Wholefoods on Bank Street has a wide GF, dairy-free, and organic selection, and can special-order items. The Co-op has a standard free-from aisle too.",
  },
  {
    out: 'gfgoneglobal-explainer-gf-scores.png',
    label: 'How to Read My GF Scores',
    title: 'Two scores, two different jobs',
    body: 'The city score out of 10 is how GF-friendly the whole destination is — density of options, staff awareness, how many dedicated kitchens. The dot score is just for one restaurant — how safely I’d eat there as a celiac.',
  },
];

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpPath = path.join(__dirname, '_tmp-text-card.html');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 540, height: 675, deviceScaleFactor: 2 });

  for (const card of cards) {
    fs.writeFileSync(tmpPath, buildHtml(card));
    await page.goto('file://' + tmpPath, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(OUT_DIR, card.out) });
    console.log(`  ✓ ${card.out}`);
  }

  await browser.close();
  fs.unlinkSync(tmpPath);
  console.log(`\nDone! ${cards.length} text cards saved to: ${OUT_DIR}`);
})();
