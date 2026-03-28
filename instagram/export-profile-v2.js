const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}body{margin:0;padding:0}

.card{
  width:540px;height:540px;
  background:#FFFCF9;
  position:relative;
  display:flex;flex-direction:column;
  justify-content:center;align-items:center;text-align:center;
  overflow:hidden;
}

/* Subtle radial glow */
.card::before{
  content:'';position:absolute;inset:0;
  background:
    radial-gradient(ellipse at 25% 75%, rgba(200,113,122,0.06) 0%, transparent 55%),
    radial-gradient(ellipse at 75% 25%, rgba(184,144,122,0.06) 0%, transparent 55%);
}

/* Grain texture */
.card::after{
  content:'';position:absolute;inset:0;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  opacity:0.6;pointer-events:none;
}

/* Decorative background globes */
.bg-globe{
  position:absolute;
  z-index:1;
  opacity:0.04;
}

.bg-globe.top-right{
  top:-30px;right:-40px;
  transform:rotate(15deg);
}

.bg-globe.bottom-left{
  bottom:-50px;left:-60px;
  transform:rotate(-20deg);
}

.bg-globe.mid-left{
  top:60px;left:-20px;
  transform:rotate(8deg);
}

.bg-globe.mid-right{
  bottom:80px;right:-30px;
  transform:rotate(-12deg);
}

/* Passport stamp rectangle — double border with perforated edge */
.stamp-border{
  position:absolute;
  z-index:1;
  width:400px;height:320px;
  top:50%;left:50%;
  transform:translate(-50%,-50%) translateY(-6px);
  border:3px solid rgba(200,113,122,0.2);
  border-radius:2px;
}
.stamp-border::before{
  content:'';
  position:absolute;
  inset:5px;
  border:1.5px solid rgba(200,113,122,0.13);
  border-radius:1px;
}

/* Small decorative elements */
.deco-dot{
  position:absolute;
  width:4px;height:4px;
  border-radius:50%;
  background:rgba(200,113,122,0.15);
  z-index:1;
}

.deco-cross{
  position:absolute;
  z-index:1;
  opacity:0.08;
}

/* Content */
.inner{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center}

.main-globe{margin-bottom:14px}

.label{
  font-family:'Jost',sans-serif;font-size:10px;font-weight:500;
  letter-spacing:0.35em;text-transform:uppercase;color:#C8717A;
  margin-bottom:16px;
}

.l1{
  font-family:'Cormorant Garamond',serif;font-weight:300;
  font-size:64px;letter-spacing:0.06em;text-transform:uppercase;
  line-height:0.9;color:#2A2018;
}

.l2{
  font-family:'Cormorant Garamond',serif;font-weight:300;
  font-size:78px;letter-spacing:0.04em;text-transform:uppercase;
  line-height:0.85;color:#2A2018;
}

.div{width:50px;height:1px;background:#B8907A;margin:16px 0 14px}

.tag{
  font-family:'Jost',sans-serif;font-size:9px;font-weight:400;
  letter-spacing:0.3em;text-transform:uppercase;color:#9A907A;
}

/* Small location pins scattered decoratively */
.deco-pin{
  position:absolute;z-index:1;opacity:0.07;
}
</style>
</head><body>

<div class="card">

  <!-- Passport stamp rectangle -->
  <div class="stamp-border"></div>

  <!-- Background globes at different sizes -->
  <div class="bg-globe top-right">
    <svg width="220" height="220" viewBox="0 0 40 40" fill="none" stroke="#C8717A" stroke-width="0.8">
      <circle cx="20" cy="20" r="17"/><ellipse cx="20" cy="20" rx="8" ry="17"/>
      <line x1="3" y1="20" x2="37" y2="20"/>
      <path d="M 5.6 12 Q 20 15.5 34.4 12"/><path d="M 5.6 28 Q 20 24.5 34.4 28"/>
    </svg>
  </div>
  <div class="bg-globe bottom-left">
    <svg width="280" height="280" viewBox="0 0 40 40" fill="none" stroke="#B8907A" stroke-width="0.6">
      <circle cx="20" cy="20" r="17"/><ellipse cx="20" cy="20" rx="8" ry="17"/>
      <line x1="3" y1="20" x2="37" y2="20"/>
      <path d="M 5.6 12 Q 20 15.5 34.4 12"/><path d="M 5.6 28 Q 20 24.5 34.4 28"/>
    </svg>
  </div>
  <div class="bg-globe mid-right">
    <svg width="140" height="140" viewBox="0 0 40 40" fill="none" stroke="#C8717A" stroke-width="0.9">
      <circle cx="20" cy="20" r="17"/><ellipse cx="20" cy="20" rx="8" ry="17"/>
      <line x1="3" y1="20" x2="37" y2="20"/>
      <path d="M 5.6 12 Q 20 15.5 34.4 12"/><path d="M 5.6 28 Q 20 24.5 34.4 28"/>
    </svg>
  </div>

  <!-- Small decorative pins -->
  <div class="deco-pin" style="top:72px;right:88px;transform:rotate(10deg)">
    <svg width="18" height="24" viewBox="0 0 10 14" fill="none" stroke="#C8717A" stroke-width="1.2">
      <path d="M5 1C3 1 1.5 2.5 1.5 4.5c0 3 3.5 7.5 3.5 7.5s3.5-4.5 3.5-7.5C8.5 2.5 7 1 5 1z"/>
      <circle cx="5" cy="4.5" r="1.3"/>
    </svg>
  </div>
  <div class="deco-pin" style="bottom:90px;left:80px;transform:rotate(-8deg)">
    <svg width="16" height="22" viewBox="0 0 10 14" fill="none" stroke="#B8907A" stroke-width="1.2">
      <path d="M5 1C3 1 1.5 2.5 1.5 4.5c0 3 3.5 7.5 3.5 7.5s3.5-4.5 3.5-7.5C8.5 2.5 7 1 5 1z"/>
      <circle cx="5" cy="4.5" r="1.3"/>
    </svg>
  </div>
  <div class="deco-pin" style="top:180px;left:56px;transform:rotate(15deg)">
    <svg width="14" height="18" viewBox="0 0 10 14" fill="none" stroke="#C8717A" stroke-width="1.3">
      <path d="M5 1C3 1 1.5 2.5 1.5 4.5c0 3 3.5 7.5 3.5 7.5s3.5-4.5 3.5-7.5C8.5 2.5 7 1 5 1z"/>
      <circle cx="5" cy="4.5" r="1.3"/>
    </svg>
  </div>
  <div class="deco-pin" style="bottom:160px;right:60px;transform:rotate(-5deg)">
    <svg width="12" height="16" viewBox="0 0 10 14" fill="none" stroke="#B8907A" stroke-width="1.4">
      <path d="M5 1C3 1 1.5 2.5 1.5 4.5c0 3 3.5 7.5 3.5 7.5s3.5-4.5 3.5-7.5C8.5 2.5 7 1 5 1z"/>
      <circle cx="5" cy="4.5" r="1.3"/>
    </svg>
  </div>

  <!-- Small decorative dots -->
  <div class="deco-dot" style="top:110px;right:130px"></div>
  <div class="deco-dot" style="bottom:120px;left:140px"></div>
  <div class="deco-dot" style="top:200px;right:70px;width:3px;height:3px"></div>
  <div class="deco-dot" style="bottom:190px;left:65px;width:3px;height:3px"></div>

  <!-- Decorative crosses -->
  <div class="deco-cross" style="top:55px;left:100px">
    <svg width="12" height="12" viewBox="0 0 12 12" stroke="#C8717A" stroke-width="1">
      <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
    </svg>
  </div>
  <div class="deco-cross" style="bottom:65px;right:110px">
    <svg width="10" height="10" viewBox="0 0 12 12" stroke="#B8907A" stroke-width="1">
      <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
    </svg>
  </div>

  <!-- Main content -->
  <div class="inner">
    <svg class="main-globe" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#C8717A" stroke-width="1.2" style="margin-bottom:14px">
      <circle cx="20" cy="20" r="17"/><ellipse cx="20" cy="20" rx="8" ry="17"/>
      <line x1="3" y1="20" x2="37" y2="20"/>
      <path d="M 5.6 12 Q 20 15.5 34.4 12"/><path d="M 5.6 28 Q 20 24.5 34.4 28"/>
    </svg>
    <div class="label">Gluten-Free Travel</div>
    <div class="l1">GF Gone</div>
    <div class="l2">Global</div>
    <div class="div"></div>
    <div class="tag">Celiac-Safe Worldwide</div>
  </div>
</div>

</body></html>`;

(async () => {
  const outputDir = path.join(__dirname, 'exports', 'branding');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const tmpHtml = path.join(__dirname, '_tmp_cream_v2.html');
  fs.writeFileSync(tmpHtml, html);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 540, height: 540, deviceScaleFactor: 2 });
  await page.goto('file://' + tmpHtml, { waitUntil: 'networkidle0' });

  await page.screenshot({
    path: path.join(outputDir, 'gfgg-profile-cream.png'),
    clip: { x: 0, y: 0, width: 540, height: 540 }
  });

  console.log('  ✓ gfgg-profile-cream.png (1080x1080)');

  await browser.close();
  fs.unlinkSync(tmpHtml);
})();
