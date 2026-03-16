# Gluten-Free Travel Database — Session Context

Use this file to resume work in a new conversation. Paste it at the start and say: **"Please resume where we left off."**

---

## Project Overview

Building a gluten-free travel spreadsheet (`travel_master.xlsx`) with 806 rows across 11 trips. The main ongoing task is finding and writing **FindMeGlutenFree (FMGF) URLs** for restaurants in the spreadsheet.

---

## Key File Paths (in Claude's environment)

| Path | Purpose |
|------|---------|
| `/home/claude/travel_master.xlsx` | Working copy (persistent) |
| `/mnt/user-data/outputs/travel_master.xlsx` | Downloadable output |
| `/mnt/skills/user/kml-to-travel-db/SKILL.md` | Project skill file |

---

## Spreadsheet Schema (20 columns)

`country`, `region_state`, `city`, `place_name`, `place_type`, `icon`, `visit_month`, `visit_year`, `notes`, `gf_category`, `celiac_safety_score`, `latitude`, `longitude`, `google_maps_url`, `photo_url`, `source_map_name`, `source_folder_path`, `needs_review`, `hotel_gf_notes`, `fmgf_url`

- **Col 20** (`fmgf_url`): hyperlinked, width=55

### Formatting Rules
- Header: dark blue fill `2D5F8A`, white bold Arial 10pt, frozen row 1
- Even rows: light blue `EBF3FB`, odd rows: white `FFFFFF`
- `needs_review = yes` rows: yellow `FFF3CD`
- Auto-filter on header row

### Matching Logic
Match on `(place_name.lower().strip(), city.lower().strip())`. Use flexible matching (substring, word overlap) for ambiguous cases.

---

## FMGF URL Task Status

### ✅ Already Written (previous sessions)
- 87 auto-matched URLs + 1 manual fix (McBain's, row 753)
- 16 URLs from Bratislava, Doolin, Galway, Killarney batches

### ⏳ Found But NOT YET Written (write these first!)

```python
# Zermatt
("old zermatt", "zermatt"): "https://www.findmeglutenfree.com/biz/restaurant-old-zermatt/4517287342243840",
("du pont", "zermatt"): "https://www.findmeglutenfree.com/biz/du-pont/4538731073765376",
("grampi's", "zermatt"): "https://www.findmeglutenfree.com/biz/grampis/4990593961426944",
("elsie's wine and champagne bar", "zermatt"): "https://www.findmeglutenfree.com/biz/elsies/4633423854043136",
# Galway
("murphy's ice cream", "galway"): "https://www.findmeglutenfree.com/biz/murphys-ice-cream/6648708622581760",
```

---

## Cities Still Needing FMGF Lookups

Search FMGF for each place, then write URLs to the spreadsheet:

| City | Notes |
|------|-------|
| **Zermatt** | Still need: Ristorante Pizzeria CasaMia, Champagne Bar, Blue Lounge, Restaurant Myoko, Othmar's Skihütte, Pizzeria Ristorante Molino Zermatt |
| **Lucerne** | 11 places |
| **Salzburg** | 7 places |
| **Prague** | 4 places |
| **Florence** | 9 places |
| **Innsbruck** | 5 places |
| **Interlaken** | 4 places |
| **Geneva** | 5 places |
| **Wellington** | 8 places |
| **Osaka** | 7 places |
| **Kyoto** | 14 places |
| **Nara** | 3 places |
| **Hakone** | 5 places |
| **Hiroshima** | 1 place |
| **Fort William** | 5 places |
| **Blenheim** | 28 places |
| **Mt Cook** | 4 places |
| **Limerick** | 2 places |
| **Ocho Rios** | 1 place |
| **Bratislava** | 2 remaining: Funki Punki Pancakes, Veg Life Pribinova |

---

## Confirmed NOT on FMGF (skip these)

- Funki Punki Pancakes (Bratislava)
- Veg Life Pribinova (Bratislava)
- Puffins Nest Coffee Shop (Galway)
- O'Connell's Bar (Galway)
- Tig Coili (Galway)
- Pascal Coffee House (Galway)
- Casita Mexicana (Killarney)
- Allegro Hand Made Food Co (Killarney)
- The Brehon (Killarney)
- Scoozi (Killarney)
- Bricin Restaurant (Killarney)
- Kitty O'Se's (Killarney)
- Cafe Du Parc (Killarney)
- LUNA deli + wine (Killarney)
- Salvadors & Robertinos (Killarney)
- 9 White Deer Brewery (Killarney)
- Great Southern Killarney (Killarney)
- The Cellar - the Ross Killarney (Killarney)

---

## Manual Fixes Still Needed

| Place | City | Issue |
|-------|------|-------|
| VINTAGE QOO TOKYO SHINSAIBASHI | Osaka | It's a vintage clothing shop — clear all GF fields |
| Fishbone Bar & Grill | Queenstown | PERMANENTLY CLOSED |
| Eriks Fish and Chips | Wanaka | PERMANENTLY CLOSED |
| Švejk restaurant U Karla | Prague | Likely permanently closed |
| Patricia's Coffee Bar | Glasgow | PERMANENTLY CLOSED |
| Cup Merchant City | Glasgow | PERMANENTLY CLOSED |
| My Bánh Mì by Gluten Free TOKYO | Tokyo | Temporarily closed |
| Salt Café - Morningside | Edinburgh | PERMANENTLY CLOSED |
| 42 hotels flagged `needs_review = yes` | Various | `gf_category = unclear` — need manual research |

---

## How to Resume

1. Upload the latest `travel_master.xlsx` to the new chat
2. Paste this file's contents
3. Say: **"Please resume the FMGF URL task where we left off"**
4. Claude should: write the 5 pending URLs → search remaining Zermatt places → continue city by city through the table above → save final file to outputs
