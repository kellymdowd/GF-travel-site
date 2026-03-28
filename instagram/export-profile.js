const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const makeCard = (variant) => {
  const colors = {
    dark: { bg: '#2A2018', grad1: 'rgba(200,113,122,0.12)', grad2: 'rgba(184,144,122,0.1)', label: '#D9979E', text: '#FFFCF9', div: '#B8907A', tag: '#9A907A', globe: '#D9979E' },
    cream: { bg: '#FFFCF9', grad1: 'rgba(200,113,122,0.06)', grad2: 'rgba(184,144,122,0.06)', label: '#C8717A', text: '#2A2018', div: '#B8907A', tag: '#9A907A', globe: '#C8717A' },
    rose: { bg: '#C8717A', grad1: 'rgba(255,255,255,0.1)', grad2: 'rgba(42,32,24,0.15)', label: 'rgba(255,255,255,0.65)', text: '#fff', div: 'rgba(255,255,255,0.35)', tag: 'rgba(255,255,255,0.55)', globe: 'rgba(255,255,255,0.65)' }
  };
  const c = colors[variant];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{margin:0;padding:0}
.card{width:540px;height:540px;background:${c.bg};position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
.card::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 30% 70%,${c.grad1} 0%,transparent 60%),radial-gradient(ellipse at 70% 30%,${c.grad2} 0%,transparent 60%)}
.card::after{content:'';position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");opacity:0.5;pointer-events:none}
.inner{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center}
.label{font-family:'Jost',sans-serif;font-size:10px;font-weight:500;letter-spacing:0.35em;text-transform:uppercase;color:${c.label};margin-bottom:16px}
.l1{font-family:'Cormorant Garamond',serif;font-weight:300;font-size:64px;letter-spacing:0.06em;text-transform:uppercase;line-height:0.9;color:${c.text}}
.l2{font-family:'Cormorant Garamond',serif;font-weight:300;font-size:78px;letter-spacing:0.04em;text-transform:uppercase;line-height:0.85;color:${c.text}}
.div{width:50px;height:1px;background:${c.div};margin:16px 0 14px}
.tag{font-family:'Jost',sans-serif;font-size:9px;font-weight:400;letter-spacing:0.3em;text-transform:uppercase;color:${c.tag}}
</style></head><body>
<div class="card"><div class="inner">
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="${c.globe}" stroke-width="1.2" style="margin-bottom:14px">
<circle cx="20" cy="20" r="17"/><ellipse cx="20" cy="20" rx="8" ry="17"/>
<line x1="3" y1="20" x2="37" y2="20"/>
<path d="M 5.6 12 Q 20 15.5 34.4 12"/><path d="M 5.6 28 Q 20 24.5 34.4 28"/>
</svg>
<div class="label">Gluten-Free Travel</div>
<div class="l1">GF Gone</div><div class="l2">Global</div>
<div class="div"></div>
<div class="tag">Celiac-Safe Worldwide</div>
</div></div></body></html>`;
};

(async () => {
  const outputDir = path.join(__dirname, 'exports', 'branding');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });

  for (const v of ['dark', 'cream', 'rose']) {
    const tmpHtml = path.join(__dirname, `_tmp_${v}.html`);
    fs.writeFileSync(tmpHtml, makeCard(v));

    const page = await browser.newPage();
    await page.setViewport({ width: 540, height: 540, deviceScaleFactor: 2 });
    await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle0' });

    await page.screenshot({
      path: path.join(outputDir, `gfgg-profile-${v}.png`),
      clip: { x: 0, y: 0, width: 540, height: 540 }
    });

    console.log(`  ✓ gfgg-profile-${v}.png (1080x1080)`);
    await page.close();
    fs.unlinkSync(tmpHtml);
  }

  await browser.close();
  console.log('\nDone!');
})();
