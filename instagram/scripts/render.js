// Renders one carousel from its spec file at both ratios.
//
//   node instagram/scripts/render.js <slug>              both ratios
//   node instagram/scripts/render.js <slug> --only 4x5   or --only pinterest
//   node instagram/scripts/render.js --all               every spec
//   --out <dir>   write to <dir>/ and <dir>/pinterest/ instead of exports/
//
// Spec: instagram/carousels/<slug>.json — `slides` (the post, in order) and
// optional `extras` (rendered, not part of the post). Card types live in
// lib/templates.js.

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { BUILDERS } = require('./lib/templates');

const CAROUSELS_DIR = path.join(__dirname, '..', 'carousels');
const RATIOS = {
  '4x5': { w: 540, h: 675, sub: '' },
  pinterest: { w: 500, h: 750, sub: 'pinterest' },
};

function parseArgs(argv) {
  const args = { slugs: [], only: null, out: path.join(__dirname, '..', 'exports') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--all') args.all = true;
    else if (argv[i] === '--only') args.only = argv[++i];
    else if (argv[i] === '--out') args.out = path.resolve(argv[++i]);
    else args.slugs.push(argv[i]);
  }
  if (args.all) {
    args.slugs = fs.readdirSync(CAROUSELS_DIR).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));
  }
  if (!args.slugs.length) {
    console.error('Usage: node render.js <slug> [--only 4x5|pinterest] [--out dir] | --all');
    process.exit(1);
  }
  if (args.only && !RATIOS[args.only]) {
    console.error(`--only must be one of: ${Object.keys(RATIOS).join(', ')}`);
    process.exit(1);
  }
  return args;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const ratios = args.only ? [args.only] : Object.keys(RATIOS);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const tmpPath = path.join(__dirname, '_tmp-render.html');

  for (const slug of args.slugs) {
    const spec = JSON.parse(fs.readFileSync(path.join(CAROUSELS_DIR, `${slug}.json`), 'utf8'));
    const cards = [...spec.slides, ...(spec.extras || [])];
    console.log(`\n${slug}: ${spec.slides.length} slides${spec.extras ? ` + ${spec.extras.length} extras` : ''}`);

    for (const ratio of ratios) {
      const dims = RATIOS[ratio];
      const outDir = path.join(args.out, dims.sub);
      fs.mkdirSync(outDir, { recursive: true });
      await page.setViewport({ width: dims.w, height: dims.h, deviceScaleFactor: 2 });

      for (const card of cards) {
        const build = BUILDERS[card.type];
        if (!build) throw new Error(`${slug}: unknown card type "${card.type}"`);
        fs.writeFileSync(tmpPath, build(card, dims, ratio === 'pinterest'));
        await page.goto('file://' + tmpPath, { waitUntil: 'networkidle0' });
        await page.screenshot({ path: path.join(outDir, card.out) });
        console.log(`  ✓ ${ratio.padEnd(9)} ${card.out}`);
      }
    }
  }

  await browser.close();
  fs.unlinkSync(tmpPath);
})();
