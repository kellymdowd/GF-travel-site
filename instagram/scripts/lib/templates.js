// HTML builders for every carousel card type. Each takes a slide spec (from
// instagram/carousels/<slug>.json) and the render dims, and returns a full
// HTML document. Photo/map paths in specs are repo-relative; `abs()` turns
// them into file:// URLs.
//
// Card types: photo, text-restaurant, overview, map-end-card, explainer, packing

const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const abs = (p) => 'file://' + path.join(REPO_ROOT, p);

const FONTS = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">`;

const doc = (css, body) =>
  `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>${css}</style></head><body>${body}</body></html>`;

function dotsHtml(score, dotClass) {
  return Array.from({ length: score.max }, (_, i) =>
    `<span class="${dotClass}${i < score.score ? ' filled' : ''}"></span>`
  ).join('');
}

// ─── photo: full-bleed photo, bottom scrim, label/title/subtitle/score ───
function photo(s, dims, pinterest) {
  const css = `
    :root { --slate-light: #D9979E; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: ${dims.w}px; height: ${dims.h}px; overflow: hidden; }
    .card { width: ${dims.w}px; height: ${dims.h}px; position: relative; }
    .card-bg { position: absolute; inset: 0; background-size: cover; }
    .scrim {
      position: absolute; left: 0; right: 0; bottom: 0; height: 56%;
      background: linear-gradient(to top,
        rgba(42,32,24,0.92) 0%, rgba(42,32,24,0.78) 22%,
        rgba(42,32,24,0.38) 50%, rgba(42,32,24,0) 100%);
    }
    .content { position: absolute; left: 0; right: 0; bottom: 0; padding: 2.3rem 2.1rem 2.5rem; z-index: 2; }
    .label {
      font-family: 'Jost', sans-serif; font-size: 0.5rem; font-weight: 500;
      letter-spacing: 0.3em; text-transform: uppercase; color: var(--slate-light); margin-bottom: 0.5rem;
    }
    .title {
      font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 2rem;
      letter-spacing: 0.05em; text-transform: uppercase; color: #fff; line-height: 1.12;
    }
    .title.long { font-size: 1.5rem; text-transform: none; letter-spacing: 0.01em; line-height: 1.35; max-width: 430px; }
    .subtitle { font-family: 'Jost', sans-serif; font-weight: 300; font-size: 0.78rem; color: rgba(255,255,255,0.75); margin-top: 0.5rem; }
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
      letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.55);
      text-shadow: 0 1px 4px rgba(0,0,0,0.5);
    }`;
  const bgPos = (pinterest && s.pinBgPos) || s.bgPos || 'center';
  const bgSize = (pinterest && s.pinBgSize) || s.bgSize || 'cover';
  const score = s.score
    ? `<div class="score"><div class="dots">${dotsHtml(s.score, 'dot')}</div><span class="score-label">GF Score</span></div>`
    : '';
  return doc(css, `
    <div class="card">
      <div class="card-bg" style="background-image:url('${abs(s.photo)}'); background-position:${bgPos}; background-size:${bgSize};"></div>
      <div class="scrim"></div>
      <div class="watermark">GF Gone Global</div>
      <div class="content">
        ${s.label ? `<div class="label">${s.label}</div>` : ''}
        <div class="${s.longTitle ? 'title long' : 'title'}">${s.title}</div>
        ${s.subtitle ? `<div class="subtitle">${s.subtitle}</div>` : ''}
        ${score}
      </div>
    </div>`);
}

// ─── text-restaurant: dark no-photo restaurant card ───
// Optional: layout "centered" (vertically centers the content group instead of
// bottom-anchoring it), monogram (brand globe above the city label), quoteSize.
const GLOBE_SVG = (size, stroke) => `
  <svg class="monogram" width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" stroke="${stroke}" stroke-width="1.2">
    <circle cx="20" cy="20" r="17"/><ellipse cx="20" cy="20" rx="8" ry="17"/>
    <line x1="3" y1="20" x2="37" y2="20"/>
    <path d="M 5.6 12 Q 20 15.5 34.4 12"/><path d="M 5.6 28 Q 20 24.5 34.4 28"/>
  </svg>`;

function textRestaurant(s, dims) {
  const centered = s.layout === 'centered';
  const css = `
    :root { --ink: #2A2018; --slate: #C8717A; --slate-light: #D9979E; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: ${dims.w}px; height: ${dims.h}px; overflow: hidden; font-family: 'Jost', sans-serif; }
    .card {
      width: ${dims.w}px; height: ${dims.h}px; position: relative; background: var(--ink);
      padding: 2.4rem 2.3rem 2.6rem; display: flex; flex-direction: column; justify-content: ${centered ? 'center' : 'flex-end'};
    }
    .monogram { position: relative; display: block; margin-bottom: 1.1rem; }
    .card::before {
      content: ''; position: absolute; inset: 0;
      background:
        radial-gradient(ellipse at 30% 25%, rgba(200,113,122,0.16) 0%, transparent 55%),
        radial-gradient(ellipse at 75% 75%, rgba(184,144,122,0.12) 0%, transparent 55%);
    }
    .badge {
      position: absolute; top: 1.6rem; left: 1.8rem; z-index: 2;
      font-size: 0.48rem; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase;
      padding: 0.3rem 0.7rem; background: var(--slate); color: #fff;
    }
    .watermark {
      position: absolute; top: 1.6rem; right: 1.8rem; z-index: 2;
      font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 0.55rem;
      letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.3);
    }
    .city-label { position: relative; font-size: 0.5rem; font-weight: 500; letter-spacing: 0.3em; text-transform: uppercase; color: var(--slate-light); margin-bottom: 0.5rem; }
    .r-name { position: relative; font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 2.3rem; letter-spacing: 0.06em; text-transform: uppercase; color: #fff; line-height: 1.1; }
    .r-cuisine { position: relative; font-size: 0.72rem; font-weight: 300; color: rgba(255,255,255,0.55); margin-top: 0.4rem; }
    .r-quote { position: relative; font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: ${s.quoteSize || '1rem'}; line-height: 1.65; color: rgba(255,255,255,0.65); margin-top: 1.4rem; max-width: 400px; }
    .r-score { position: relative; display: flex; align-items: center; gap: 0.6rem; margin-top: 1.3rem; }
    .r-dots { display: flex; gap: 0.3rem; }
    .r-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.15); }
    .r-dot.filled { background: var(--slate-light); }
    .r-score-label { font-size: 0.52rem; font-weight: 400; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.4); }`;
  return doc(css, `
    <div class="card">
      ${s.badge ? `<div class="badge">${s.badge}</div>` : ''}
      <div class="watermark">GF Gone Global</div>
      ${s.monogram ? GLOBE_SVG(32, '#C8717A') : ''}
      <div class="city-label">${s.city}</div>
      <div class="r-name">${s.name}</div>
      <div class="r-cuisine">${s.cuisine}</div>
      <div class="r-quote">${s.quote}</div>
      <div class="r-score"><div class="r-dots">${dotsHtml(s.score, 'r-dot')}</div><span class="r-score-label">GF Score</span></div>
    </div>`);
}

// ─── overview: photo strip + 6-stat grid on cream ───
function overview(s, dims) {
  const css = `
    :root { --cream: #FFFCF9; --slate: #C8717A; --rose: #B8907A; --ink: #2A2018; --ink-light: #9A907A; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: ${dims.w}px; height: ${dims.h}px; overflow: hidden; font-family: 'Jost', sans-serif; }
    .card { width: ${dims.w}px; height: ${dims.h}px; position: relative; background: var(--cream); display: flex; flex-direction: column; }
    .photo-strip { height: 42%; position: relative; overflow: hidden; }
    .photo-strip .bg { position: absolute; inset: 0; background-size: cover; }
    .photo-strip::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 55%; background: linear-gradient(to top, var(--cream) 0%, transparent 100%); }
    .body { flex: 1; padding: 0 2.3rem 2.3rem; display: flex; flex-direction: column; justify-content: center; position: relative; }
    .country { font-size: 0.55rem; font-weight: 500; letter-spacing: 0.3em; text-transform: uppercase; color: var(--slate); margin-bottom: 0.3rem; }
    .city { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 2.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink); line-height: 1; margin-bottom: 1.1rem; }
    .rule { width: 2.5rem; height: 1px; background: var(--rose); margin-bottom: 1.3rem; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem 1rem; }
    .stat-num { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 1.7rem; color: var(--slate); line-height: 1; display: block; }
    .stat-label { font-size: 0.52rem; font-weight: 400; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-light); display: block; margin-top: 0.15rem; }
    .watermark { position: absolute; bottom: 1.6rem; right: 2.2rem; font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 0.55rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-light); opacity: 0.5; }`;
  const stats = s.stats.map(st =>
    `<div><span class="stat-num">${st.num}</span><span class="stat-label">${st.label}</span></div>`
  ).join('');
  return doc(css, `
    <div class="card">
      <div class="photo-strip"><div class="bg" style="background-image:url('${abs(s.photo)}'); background-position:${s.bgPos || 'center'};"></div></div>
      <div class="body">
        <div class="country">${s.country}</div>
        <div class="city">${s.city}</div>
        <div class="rule"></div>
        <div class="stats">${stats}</div>
      </div>
      <div class="watermark">GF Gone Global</div>
    </div>`);
}

// ─── cream text cards: map-end-card, explainer, packing ───
function creamCss(dims) {
  return `
    :root { --cream: #FFFCF9; --slate: #C8717A; --slate-light: #D9979E; --rose: #B8907A; --ink: #2A2018; --ink-mid: #5A5048; --ink-light: #9A907A; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: ${dims.w}px; height: ${dims.h}px; overflow: hidden; font-family: 'Jost', sans-serif; }
    .card {
      width: ${dims.w}px; height: ${dims.h}px; position: relative; background: var(--cream);
      padding: 3.4rem 2.3rem 3rem; display: flex; flex-direction: column; justify-content: space-between;
    }
    .header { position: relative; }
    .card::before {
      content: ''; position: absolute; inset: 0;
      background:
        radial-gradient(ellipse at 15% 85%, rgba(200,113,122,0.07) 0%, transparent 55%),
        radial-gradient(ellipse at 85% 15%, rgba(184,144,122,0.07) 0%, transparent 55%);
    }
    .label { font-size: 0.5rem; font-weight: 500; letter-spacing: 0.3em; text-transform: uppercase; color: var(--slate); margin-bottom: 0.5rem; position: relative; text-align: center; }
    .title { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 1.75rem; letter-spacing: 0.02em; color: var(--ink); line-height: 1.25; text-align: center; position: relative; margin-top: 0.6rem; }
    .watermark { position: absolute; bottom: 1.8rem; right: 2.2rem; font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 0.55rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-light); opacity: 0.5; }
    .footer-note { position: relative; text-align: center; font-size: 0.68rem; color: var(--ink-light); letter-spacing: 0.04em; margin-top: 1.4rem; }

    .split { position: relative; display: flex; align-items: center; justify-content: center; gap: 1.6rem; }
    .stat-block { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.5rem; }
    .stat-block .big-num { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 3.2rem; color: var(--slate); line-height: 1; }
    .stat-block .dots { display: flex; gap: 0.4rem; }
    .stat-block .dot { width: 14px; height: 14px; border-radius: 50%; background: var(--slate-light); }
    .stat-block .stat-name { font-size: 0.6rem; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink); }
    .stat-block .stat-desc { font-size: 0.72rem; color: var(--ink-mid); line-height: 1.6; max-width: 180px; }
    .divider { width: 1px; align-self: stretch; background: rgba(42,32,24,0.1); }

    .icon-grid { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 1.8rem 1.2rem; }
    .icon-item { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.6rem; }
    .icon-circle { width: 56px; height: 56px; border-radius: 50%; background: var(--slate-light); display: flex; align-items: center; justify-content: center; }
    .icon-circle svg { width: 26px; height: 26px; stroke: #fff; }
    .icon-name { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 1.05rem; color: var(--ink); }
    .icon-why { font-size: 0.66rem; color: var(--ink-mid); line-height: 1.5; max-width: 190px; }

    .card.end-card-map { justify-content: flex-start; gap: 1.5rem; }
    .map-frame { position: relative; width: 100%; aspect-ratio: 1 / 1; border-radius: 6px; overflow: hidden; background: #F0ECE6; }
    .map-frame .map-bg { position: absolute; inset: 0; background-size: cover; }
    .end-title { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 1.5rem; letter-spacing: 0.01em; color: var(--ink); line-height: 1.3; text-align: center; position: relative; max-width: 420px; align-self: center; }
    .end-subtitle { font-size: 0.7rem; color: var(--ink-light); text-align: center; position: relative; align-self: center; }`;
}

function mapEndCard(s, dims) {
  return doc(creamCss(dims), `
    <div class="card end-card-map">
      <div class="label" style="margin-bottom:0;">Thanks for Following Along</div>
      <div class="map-frame"><div class="map-bg" style="background-image:url('${abs(s.map)}'); background-position:${s.mapPos || '38% 55%'};"></div></div>
      <div class="end-title">The full guide — every restaurant, GF score, and map — is on the site.</div>
      <div class="end-subtitle">Link in bio</div>
      <div class="watermark">GF Gone Global</div>
    </div>`);
}

function explainer(s, dims) {
  return doc(creamCss(dims), `
    <div class="card">
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
          <div class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot" style="background:rgba(0,0,0,0.12)"></span></div>
          <div class="stat-name">Restaurant Score</div>
          <div class="stat-desc">Just for that one place — how safely I’d eat there as a celiac.</div>
        </div>
      </div>
      <div class="footer-note">Both scores, every city — on the site</div>
      <div class="watermark">GF Gone Global</div>
    </div>`);
}

const ICONS = {
  boots: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20l1-13 5 1 2 4h9c1.5 2 1.5 4.5 0 8H3z"/><path d="M4 7l5 1"/></svg>',
  rain: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 12a5 5 0 00-9.8-1.5A4 4 0 006 18h11a4 4 0 000-8h-.2"/><path d="M9 20l-1 2M13 20l-1 2M17 20l-1 2"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 18l9 5 9-5"/></svg>',
  bug: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="13" rx="4.5" ry="6"/><path d="M12 7V4M9 6l-2-2M15 6l2-2M7 11l-3-1M7 15l-3 1M17 11l3-1M17 15l3 1M9.5 19l-1.5 2M14.5 19l1.5 2"/></svg>',
};

function packing(s, dims) {
  const items = s.items.map(i => {
    if (!ICONS[i.icon]) throw new Error(`Unknown packing icon "${i.icon}" — add it to ICONS in templates.js`);
    return `<div class="icon-item"><div class="icon-circle">${ICONS[i.icon]}</div><div class="icon-name">${i.name}</div><div class="icon-why">${i.why}</div></div>`;
  }).join('');
  return doc(creamCss(dims), `
    <div class="card">
      <div class="header">
        <div class="label">${s.label}</div>
        <div class="title">${s.title}</div>
      </div>
      <div class="icon-grid">${items}</div>
      <div class="footer-note">${s.footer}</div>
      <div class="watermark">GF Gone Global</div>
    </div>`);
}

const BUILDERS = {
  photo,
  'text-restaurant': textRestaurant,
  overview,
  'map-end-card': mapEndCard,
  explainer,
  packing,
};

module.exports = { BUILDERS, REPO_ROOT };
