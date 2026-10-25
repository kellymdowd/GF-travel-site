# Handoff: Fort William Carousel (Scotland relaunch post #3)

**Status: Caption NOT yet written. Not cleared to publish.** Moose writes the single carousel caption; Kelly approves before this goes out. Do not publish until a follow-up updates this status line.

Six slides. It leads with the Ben Nevis summit because that's why people come to Fort William, and the two food slides do the GF work. Two complete sets, same filenames in each folder:
- **Instagram (4:5, 1080×1350):** `instagram/exports/`
- **Pinterest (2:3, 1000×1500):** `instagram/exports/pinterest/`. True re-renders, not crops. All 6 checked at 2:3; no slide falls back to 4:5.

| # | Slide | Filename (same in both folders) | 4:5 Size | Pinterest Size | Notes |
|---|-------|----------|------|------|-------|
| 1 | Ben Nevis | `gfgoneglobal-scotland-fort-william-ben-nevis.png` | 1.2M | 1.2M | Summit cliff edge in fog (visited). Moody and grey, which is honest to the day. |
| 2 | Browns | `gfgoneglobal-scotland-fort-william-browns.png` | 1.6M | 1.6M | 3/5. Photo is the GF chocolate tart the guide calls "incredible." The on-site restaurant at Nevis Bank Inn (not the Glasgow Browns). |
| 3 | Nevis Bank Inn | `gfgoneglobal-scotland-fort-william-nevis-bank-inn.png` | 1.8M | 1.8M | "Where I Stayed" (the guide's own badge), so the label can say so. Exterior with the sign visible. |
| 4 | The Geographer | `gfgoneglobal-scotland-fort-william-the-geographer.png` | 1.5M | 1.6M | 3/5. Photo is the GF calamari the guide recommends. |
| 5 | Fort William Overview | `gfgoneglobal-scotland-fort-william-overview.png` | 760K | 796K | 5 restaurants, 5/10 GF score, top restaurant score 3/5, 3 landmarks, May–Sep, 1–2 days. See stat note below. |
| 6 | Scotland End Card | `gfgoneglobal-scotland-end-card.png` | 496K | 500K | Shared country end card, same file as Portree/Glasgow. |

**Overview stat note:** the standard "Scored 5/5 GF" slot would read **0**, since every Fort William restaurant scores 3/5. It's replaced with **"Top Restaurant Score: 3/5"**, which tells a celiac reader the same thing honestly without a zero on the card. "Ideal Stay" is in days because the guide says "1–2 days."

## Photo issues found

1. **Correction:** an earlier version of this manifest said The Old Deli's card showed a Ben Nevis photo. That was wrong. My extraction script read past the end of that card into the landmarks section. The Old Deli has no photo; Ben Nevis's photo is correctly on the Ben Nevis card. No site change was needed.
2. **Live-site data quirk:** the restaurants badge on the guide says "4 spots," but the page lists 5 restaurant cards. The overview uses 5, the actual count. The badge itself is unchanged, pending Kelly.
3. **Photos of Kelly** at the summit (`ben-nevis/IMG_9011.jpeg`, `IMG_9013.jpeg`): excluded.
4. **Stock photo excluded:** `glenfinnan-viaduct/glenfinnan-viaduct-unsplash.jpg`. Glenfinnan is researched-only anyway.
5. **Misfiled, unused:** `fort-william-scotrail-train-station/IMG_9033.jpeg` shows a park, not a station.

## Supporting data
- **Caption:** Not written yet. Moose to draft.
- **Hotel affiliate URL** (Hotels.com, from Kelly): `https://www.hotels.com/affiliate/QZ5S5rg`. It's now also live on the guide's Nevis Bank Inn "Book" button, replacing an app deep link that the site's analytics weren't tracking.
- **Source guide page:** `countries/scotland/fort-william.html`
- **Regenerate:** `node instagram/scripts/render.js fort-william`. Slide settings live in `instagram/carousels/fort-william.json`.

## Explicitly NOT part of this post
- **Ben Nevis Visitor Centre:** visited, but its photos are trail information boards. Its one scenic photo (green glen, `IMG_9030`) is used as the overview backdrop, labeled only "Fort William," since its exact location can't be confirmed.
- **Glenfinnan Viaduct:** researched only, and the only photo is stock.
- **Ben Nevis Bar, Crannog at Garrison West, The Old Deli:** researched only, no usable photos, and no safety notes to quote on a text card. (Kelly's hindsight note says she wanted to try Crannog. Worth a future carousel if she goes back.)
- **GF Gem / Experience / Key Phrases:** no 100%-dedicated venue, no Viator-linked tour, and Scotland is English-speaking.

## Also in this commit: Glasgow fix
Glasgow's overview card said "Ideal Stay (Nights)," but the Glasgow guide says "2–3 **days**." The label is corrected and the card re-rendered at both ratios. Glasgow's status is unchanged (still not cleared to publish).
