const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const outputDir = path.join(__dirname, 'exports');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const CARD_CSS_SIZE = 540; // matches --card-size in the HTML

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });

  const htmlPath = path.join(__dirname, 'scotland-batch-1.html');
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });

  // Get the [data-card] elements (the actual styled cards inside the containers)
  const cards = await page.$$('[data-card]');
  const days = await page.$$eval('.post-day', els => els.map(e => e.textContent.trim()));

  console.log(`Exporting ${cards.length} cards at 1080x1080...\n`);

  for (let i = 0; i < cards.length; i++) {
    const label = days[i].toLowerCase().replace(/\s+/g, '-');
    const filename = `gfgoneglobal-scotland-${label}.png`;
    const box = await cards[i].boundingBox();

    // Clip to exact card size, ignoring any overflow
    await page.screenshot({
      path: path.join(outputDir, filename),
      clip: {
        x: box.x,
        y: box.y,
        width: CARD_CSS_SIZE,
        height: CARD_CSS_SIZE
      },
      captureBeyondViewport: true
    });

    console.log(`  ✓ ${filename}`);
  }

  await browser.close();
  console.log(`\nDone! ${cards.length} PNGs saved to: ${outputDir}`);
})();
