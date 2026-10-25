# Handoff: Portree Carousel (Scotland relaunch post #1)

**Status: Caption approved by Kelly. Cleared to publish.**

Final 8-slide order. Two complete sets, same filenames in each folder:
- **Instagram (4:5, 1080×1350):** `instagram/exports/`
- **Pinterest (2:3, 1000×1500):** `instagram/exports/pinterest/` — true re-renders from the templates at the taller ratio, not crops of the 4:5 PNGs. All 8 slides got a working 2:3 render; none needed to fall back to the 4:5 (every photo slide's crop was checked and, where needed, re-tuned specifically for 2:3 — see Chargrill below).

| # | Slide | Filename (same in both folders) | 4:5 Size | Pinterest Size | Notes |
|---|-------|----------|------|------|-------|
| 1 | The View Restaurant | `gfgoneglobal-scotland-skye-the-view-restaurant.png` | 1.8M | 2.5M | 5/5 GF score. Moved to 1st per Kelly. |
| 2 | Quiraing | `gfgoneglobal-scotland-skye-quiraing.png` | 1.4M | 1.4M | Re-exported at 4:5; was square (1080×1080) as Day 10 in scotland-batch-1.html. |
| 3 | Portree Harbour | `gfgoneglobal-scotland-skye-portree-harbour.png` | 1.7M | 2.5M | New slide. |
| 4 | Fairy Pools | `gfgoneglobal-scotland-skye-fairy-pools.png` | 1.8M | 2.5M | Re-exported at 4:5; was square as Day 6. |
| 5 | Chargrill | `gfgoneglobal-scotland-skye-chargrill.png` | 1.6M | 1.4M | 4/5 GF score. Recropped — diners removed from frame. **Pinterest uses its own crop values** (`pinBgPos`/`pinBgSize` in render-photo-overlay.js) — the 4:5 crop put the diners back in frame at 2:3, so this one isn't a shared crop between the two sets. |
| 6 | Cuillin Hills Hotel | `gfgoneglobal-scotland-skye-cuillin-hills-hotel.png` | 1.3M | 1.3M | New slide — "Where to Stay" treatment. Hotels.com affiliate URL on file (see below), not yet placed anywhere. |
| 7 | Portree Overview | `gfgoneglobal-scotland-skye-portree-overview.png` | 480K | 512K | Re-exported at 4:5; was square as Day 9. Added Best Months (May–Sep) and Ideal Stay (3–4 nights) to the stat grid. |
| 8 | Scotland End Card | `gfgoneglobal-scotland-end-card.png` | 496K | 500K | Reusable across **every** Scotland carousel, not Portree-specific — uses a real screenshot of the site's own Scotland map (`instagram/map-assets/scotland-map.png`), not a photo. Do not swap for a city-specific image. Fixed a bug in this pass: the map image wasn't fully covering its frame at either ratio (visible gap at the bottom) — now uses `background-size: cover` like every other photo element instead of a fixed-percentage `<img>`. |

## Supporting data

- **Caption:** Written by Moose, approved by Kelly on 2026-10-25. Not duplicated here — pull from wherever Moose's own copy lives.
- **Cuillin Hills Hotel affiliate URL** (Hotels.com, for the Hotel card type / future reference): `https://www.hotels.com/affiliate?landingPage=https%3A%2F%2Fwww.hotels.com%2Fho74376032%2Fcuillin-hills-hotel-portree-united-kingdom%2F&camref=1100l5QxCT&creativeref=1011l66481`
- **Source batch file:** `instagram/scotland-batch-1.html` (post-wrapper markup, captions, hashtags for the underlying daily posts these slides were drawn from).
- **Card templates / regeneration scripts:** `instagram/scripts/render-photo-overlay.js` (photo-overlay slides), `instagram/scripts/render-overview-card.js` (Portree Overview stats card), `instagram/scripts/render-design-cards.js` (Explainer, What to Pack, Scotland end card). Each now takes a `--pinterest` flag to render the 2:3 set instead of the default 4:5 — e.g. `node render-photo-overlay.js --pinterest`.

## Explicitly NOT part of this post

- **An Corran Beach** — real Portree landmark, Kelly has a usable photo, considered and declined: carousel is already food-light (2 restaurant slides vs. 3 scenic) relative to a food-travel account; a 4th scenic slide would tip it further. Flagged for a possible second Portree carousel later, not this one.
- **GF Gem card** — no restaurant in Portree qualifies (no 100%-dedicated venue; highest scores are 5/5 safety, not dedicated kitchens).
- **Bookable Experience card** — no Viator-linked tour in the Portree guide.
- **Key Phrases card** — Scotland is English-speaking; this card type is non-English countries only.
- **Explainer card** and **What to Pack card** — both built and working (`gfgoneglobal-explainer-gf-scores.png`, `gfgoneglobal-scotland-skye-what-to-pack.png` in exports/), but not part of this 8-slide post. Kelly's call whether a future version of this carousel runs as 10 slides instead.
- **Lyla and Arthur's Seat** — these belong to the Edinburgh carousel group, not Portree. Do not pull them into this or any Portree post.

## Known open item

What to Pack card (built, not in this post) uses icons, not real product photos — no Amazon storefront exists yet to source photos/links from. Kelly is building one; a reminder is scheduled for her.
