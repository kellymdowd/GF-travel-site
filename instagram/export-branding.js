const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const outputDir = path.join(__dirname, 'exports', 'branding');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 3000, deviceScaleFactor: 2 });

  const htmlPath = path.join(__dirname, 'branding-kit.html');
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });

  // Export profile photos
  const profilePhotos = await page.$$('[data-export-target]');
  const names = ['gfgg-profile-light', 'gfgg-profile-dark', 'gfgg-profile-rose'];

  for (let i = 0; i < profilePhotos.length; i++) {
    const box = await profilePhotos[i].boundingBox();
    const size = Math.min(box.width, box.height);
    await page.screenshot({
      path: path.join(outputDir, names[i] + '.png'),
      clip: { x: box.x, y: box.y, width: size, height: size },
      captureBeyondViewport: true
    });
    console.log(`  ✓ ${names[i]}.png (${Math.round(size * 2)}x${Math.round(size * 2)})`);
  }

  // Export highlight covers
  const highlights = await page.$$('[data-highlight]');
  const highlightNames = ['restaurants', 'cities', 'gf-tips', 'hotels', 'packing', '100-gf', 'explore'];

  for (let i = 0; i < highlights.length; i++) {
    const box = await highlights[i].boundingBox();
    const size = Math.min(box.width, box.height);
    await page.screenshot({
      path: path.join(outputDir, 'highlight-' + highlightNames[i] + '.png'),
      clip: { x: box.x, y: box.y, width: size, height: size },
      captureBeyondViewport: true
    });
    console.log(`  ✓ highlight-${highlightNames[i]}.png`);
  }

  await browser.close();
  console.log(`\nDone! Assets saved to: ${outputDir}`);
})();
