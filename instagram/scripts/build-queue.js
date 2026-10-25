// Parses a batch HTML file (Content Studio) into per-post queue JSON files
// ready for an automated posting agent. Usage: node build-queue.js <country>
//
// Posts are skipped if their day is listed as already posted (see POSTED below).
// Each remaining post becomes one JSON file in instagram/queue/<country>/.
//
// Conventions for NEW batches (does not apply retroactively to Scotland/Japan
// batch 1, which stay as posted/exported):
// - Hashtags: cap at 5 per post in the batch HTML's .caption-hashtags div.
//   Instagram enforces this platform-side as of Dec 2025 (was 30 before).
// - Aspect ratio: target 1080x1350 (4:5) for new batches instead of square.
//   The current card CSS (.card-restaurant/.card-landscape/etc.) is laid out
//   for a 540x540 square, so this isn't just an export-script number change —
//   the card templates need a redesign for a taller canvas when the next
//   batch is actually built. Treat that as its own design pass, not a quick
//   tweak to export-pngs.js.
// - carousel_group/slide_order below are populated as metadata for every
//   batch, but nothing currently groups posts into carousels — still one
//   card = one post until that's decided.

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SITE_BASE = 'https://gfgoneglobal.com';

// Days already published to Instagram — excluded from the queue.
const POSTED = {
  scotland: [1, 2, 3, 4, 5],
  japan: [],
};

// Editorial mapping: which site page each day's "link in bio" should point to,
// plus hand-written alt text (auto-generated alt text tends to be generic).
const META = {
  scotland: {
    6:  { citySlug: 'scotland/portree',    alt: "Turquoise Fairy Pools waterfall cascading over rocks on the Isle of Skye, Scotland" },
    7:  { citySlug: 'scotland',            alt: "Graphic tip card explaining Coeliac UK gluten-free restaurant accreditation" },
    8:  { citySlug: 'scotland/glasgow',    alt: "Text card describing Red Onion restaurant in Glasgow's dedicated gluten-free menu and 5 out of 5 GF score" },
    9:  { citySlug: 'scotland/portree',    alt: "Overview graphic for Portree, Isle of Skye with gluten-free travel stats over a Highland landscape photo" },
    10: { citySlug: 'scotland/portree',    alt: "The Quiraing rock formations and rolling green landscape on the Isle of Skye's Trotternish Ridge" },
    11: { citySlug: 'scotland/portree',    alt: "Dining room at The View Restaurant, Cuillin Hills Hotel, overlooking the Cuillin mountains in Portree" },
    12: { citySlug: 'scotland/inverness',  alt: "Highland Games event at Bught Park in Inverness, Scotland" },
    13: { citySlug: 'scotland',            alt: "Graphic packing list card for gluten-free travel in Scotland" },
    14: { citySlug: 'scotland/glasgow',    alt: "Glasgow Cathedral's medieval stone exterior in Glasgow, Scotland" },
  },
  japan: {
    1:  { citySlug: 'japan/tokyo',  alt: "Overview graphic for Tokyo with gluten-free travel stats over a photo of Shibuya Scramble Crossing" },
    2:  { citySlug: 'japan/tokyo',  alt: "Sushi counter setting at SUSHI KORIN in Nishiazabu, Tokyo" },
    3:  { citySlug: 'japan/kyoto',  alt: "Rows of vermillion torii gates at Fushimi Inari Taisha in Kyoto" },
    4:  { citySlug: 'japan/tokyo',  alt: "Dedicated gluten-free kushiage dish at Gluten Free Kushiage Su in Tokyo" },
    5:  { citySlug: 'japan/kyoto',  alt: "Kinkaku-ji, the Golden Pavilion, reflected in its pond in Kyoto" },
    6:  { citySlug: 'japan',        alt: "Graphic tip card warning that standard Japanese soy sauce contains wheat" },
    7:  { citySlug: 'japan/kyoto',  alt: "A bowl of soy milk-based gluten-free ramen at Gion Soy Milk Ramen Uno Yokiko in Kyoto" },
    8:  { citySlug: 'japan/tokyo',  alt: "Rows of white maneki-neko beckoning cat statues at Gotokuji Temple in Tokyo" },
    9:  { citySlug: 'japan/hakone', alt: "Overview graphic for Hakone with travel stats over a photo of the Hakone Open-Air Museum" },
    10: { citySlug: 'japan/hakone', alt: "Traditional ryokan room setting at Hoshino Resorts KAI Sengokuhara in Hakone" },
    11: { citySlug: 'japan/kyoto',  alt: "Towering green stalks of the Arashiyama Bamboo Forest in Kyoto" },
    12: { citySlug: 'japan/osaka',  alt: "Gluten-free baked goods at Comeconoco bakery in Osaka" },
    13: { citySlug: 'japan',        alt: "Graphic packing list card for gluten-free travel in Japan" },
    14: { citySlug: 'japan/nara',   alt: "Deer in Nara Park with a temple in the background in Nara, Japan" },
    15: { citySlug: 'japan',        alt: "Graphic summary card recapping a gluten-free trip across five Japanese cities" },
  },
};

async function main() {
  const country = process.argv[2];
  if (!country || !META[country]) {
    console.error('Usage: node build-queue.js <scotland|japan>');
    process.exit(1);
  }

  const outDir = path.join(__dirname, '..', 'queue', country);
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const htmlPath = path.join(__dirname, '..', `${country}-batch-1.html`);
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });

  const posts = await page.$$eval('.post-wrapper', (wrappers) =>
    wrappers.map((w) => {
      const day = parseInt(w.querySelector('.post-day').textContent.replace(/\D/g, ''), 10);
      const typeEl = w.querySelector('.post-type');
      const postType = typeEl.className.replace('post-type', '').trim();
      const typeLabel = typeEl.textContent.trim();

      const card = w.querySelector('[data-card]');
      const cardClass = [...card.classList].find((c) => c.startsWith('card-') && c !== 'card-content' && c !== 'card-bg');

      const nameEl = card.querySelector('.card-name') || card.querySelector('.card-tip-title');
      const subject = nameEl ? nameEl.textContent.trim() : null;

      const cityEl = card.querySelector('.card-city-label') || card.querySelector('.card-location');
      const overviewCity = card.querySelector('.card-city');
      const overviewCountry = card.querySelector('.card-country');
      const locationLabel = cityEl
        ? cityEl.textContent.trim()
        : overviewCity
        ? `${overviewCity.textContent.trim()}, ${overviewCountry.textContent.trim()}`
        : null;

      const cuisineEl = card.querySelector('.card-cuisine');
      const cuisine = cuisineEl ? cuisineEl.textContent.trim() : null;

      const badgeEl = card.querySelector('.card-badge');
      const badge = badgeEl ? badgeEl.textContent.trim() : null;

      const dots = [...card.querySelectorAll('.card-score-dot')];
      const gfScore = dots.length
        ? { score: dots.filter((d) => d.classList.contains('filled')).length, max: dots.length }
        : null;

      const bgEls = [...card.querySelectorAll('.card-bg')];
      const photoPaths = bgEls
        .map((el) => {
          const m = el.getAttribute('style').match(/url\('([^']+)'\)/);
          return m ? m[1] : null;
        })
        .filter(Boolean);

      const captionBody = w.querySelector('.caption-text').textContent.trim();
      const hashtagsRaw = w.querySelector('.caption-hashtags').textContent.trim();
      const hashtags = hashtagsRaw.split(/\s+/).filter(Boolean);

      return {
        day,
        postType,
        typeLabel,
        cardClass,
        subject,
        locationLabel,
        cuisine,
        badge,
        gfScore,
        photoPaths,
        captionBody,
        hashtags,
      };
    })
  );

  await browser.close();

  const posted = POSTED[country] || [];
  let written = 0;
  const slideOrderByCity = {};

  for (const post of posts) {
    if (posted.includes(post.day)) continue;

    const meta = META[country][post.day];
    if (!meta) {
      console.warn(`No META entry for ${country} day ${post.day} — skipping`);
      continue;
    }

    const dayStr = String(post.day).padStart(2, '0');
    const postId = `${country}-day-${dayStr}`;
    const imagePath = `instagram/exports/gfgoneglobal-${country}-day-${post.day}.png`;
    const fullImagePath = path.join(__dirname, '..', '..', imagePath);

    if (!fs.existsSync(fullImagePath)) {
      console.warn(`Missing rendered PNG for ${postId}: ${imagePath}`);
    }

    const captionFull = post.captionBody + '\n\n' + post.hashtags.join(' ');

    // carousel_group/slide_order are metadata only — not wired into any
    // carousel-posting behavior yet. Today's model is still one card = one
    // post. citySlug has no city segment for country-wide tips (e.g. a
    // packing-list or wrap-up post), so those get carousel_group: null.
    const citySlugParts = meta.citySlug.split('/');
    const carouselGroup = citySlugParts.length > 1 ? citySlugParts[1] : null;
    let slideOrder = null;
    if (carouselGroup) {
      slideOrderByCity[carouselGroup] = (slideOrderByCity[carouselGroup] || 0) + 1;
      slideOrder = slideOrderByCity[carouselGroup];
    }

    const record = {
      post_id: postId,
      status: 'ready_to_post',
      platforms: { instagram: true, pinterest: true },
      country: country.charAt(0).toUpperCase() + country.slice(1).replace(/-/g, ' '),
      city: post.locationLabel,
      day: post.day,
      post_type: post.postType,
      carousel_group: carouselGroup,
      slide_order: slideOrder,
      subject: post.subject,
      cuisine: post.cuisine,
      badge: post.badge,
      gf_score: post.gfScore,
      media: {
        image_path: imagePath,
        alt_text: meta.alt,
        source_photos: post.photoPaths,
      },
      caption: {
        body: post.captionBody,
        hashtags: post.hashtags,
        full_text: captionFull,
      },
      link_in_bio_target: `${SITE_BASE}/countries/${meta.citySlug}`,
      source_batch: `instagram/${country}-batch-1.html`,
      generated_at: new Date().toISOString().slice(0, 10),
    };

    const outPath = path.join(outDir, `day-${dayStr}.json`);
    fs.writeFileSync(outPath, JSON.stringify(record, null, 2) + '\n');
    written++;
    console.log(`  ✓ ${path.relative(path.join(__dirname, '..', '..'), outPath)}`);
  }

  console.log(`\nDone! ${written} queue files written to instagram/queue/${country}/`);
}

main();
