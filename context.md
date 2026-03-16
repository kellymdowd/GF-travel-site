# Travel Database — Session Context

## What This Is
A gluten-free travel spreadsheet built from 10 KML exports from Google My Maps. The master spreadsheet has **806 rows** across 11 trips. An ongoing task is adding FMGF (FindMeGlutenFree) URLs to each food place that has a GF score.

---

## Key File Paths
| File | Path |
|------|------|
| **Master spreadsheet (persistent)** | `/home/claude/travel_master.xlsx` |
| **Master spreadsheet (downloadable)** | `/mnt/user-data/outputs/travel_master.xlsx` |
| **Skill file** | `/mnt/skills/user/kml-to-travel-db/SKILL.md` |
| **Transcript (full history)** | `/mnt/transcripts/2026-03-07-21-45-05-kml-travel-db-fmgf-urls.txt` |

---

## Spreadsheet Schema (20 columns)
`country`, `region_state`, `city`, `place_name`, `place_type`, `icon`, `visit_month`, `visit_year`, `notes`, `gf_category`, `celiac_safety_score`, `latitude`, `longitude`, `google_maps_url`, `photo_url`, `source_map_name`, `source_folder_path`, `needs_review`, `hotel_gf_notes`, `fmgf_url`

Column 20 (`fmgf_url`) is a hyperlinked FMGF listing URL, width=55.

---

## FMGF URL Task — Status

### What's Been Done
- `fmgf_url` column (col 20) added to master spreadsheet
- Edinburgh: 10/12 places found and written
- The following **88 URLs were found in the last session but NOT YET WRITTEN to the spreadsheet**

### URLs to Write (Found But Not Yet Saved)

```python
fmgf_urls = {
    # Auckland
    ("giapo", "auckland"): "https://www.findmeglutenfree.com/biz/giapo/5142611781730304",
    ("hnt kitchen", "auckland"): "https://www.findmeglutenfree.com/biz/hnt-kitchen/5903362633629696",
    ("tony's original steak & seafood restaurant", "auckland"): "https://www.findmeglutenfree.com/biz/tonys-original-steak-and-seafood-restaurant/5473940862140416",
    ("nahm | auckland", "auckland"): "https://www.findmeglutenfree.com/biz/nahm/6748741973442560",
    ("hello beasty", "auckland"): "https://www.findmeglutenfree.com/biz/hello-beasty/4658048917438464",
    ("the chip shop", "auckland"): "https://www.findmeglutenfree.com/biz/the-chip-shop/6388076454608896",
    ("botswana butchery", "auckland"): "https://www.findmeglutenfree.com/biz/botswana-butchery/5271241584934912",
    ("the shelf", "auckland"): "https://www.findmeglutenfree.com/biz/the-shelf/6264125321248768",
    ("ebisu", "auckland"): "https://www.findmeglutenfree.com/biz/ebisu/5632128536936448",
    ("mexican cafe", "auckland"): "https://www.findmeglutenfree.com/biz/mexican-cafe/5791574018490368",
    ("baduzzi", "auckland"): "https://www.findmeglutenfree.com/biz/baduzzi/4773974533865472",
    ("the gf depot", "auckland"): "https://www.findmeglutenfree.com/biz/the-gf-depot/5226234568122368",
    ("little bird kitchen", "auckland"): "https://www.findmeglutenfree.com/biz/little-bird-kitchen/5855646424104960",
    ("the attic bar & restaurant", "auckland"): "https://www.findmeglutenfree.com/biz/the-attic-bar-and-restaurant/5162469747851264",
    ("orewa beach fish & chips", "auckland"): "https://www.findmeglutenfree.com/biz/orewa-beach-fish-and-chips/4521322979393536",
    ("mudbrick vineyard and restaurant", "auckland"): "https://www.findmeglutenfree.com/biz/mudbrick/6687576704024576",
    ("mekong baby", "auckland"): "https://www.findmeglutenfree.com/biz/mekong-baby/4696116376109056",
    # Queenstown
    ("rata", "queenstown"): "https://www.findmeglutenfree.com/biz/rata/6602171554594816",
    ("madam woo queenstown", "queenstown"): "https://www.findmeglutenfree.com/biz/madam-woo/6739809980776448",
    ("fergburger", "queenstown"): "https://www.findmeglutenfree.com/biz/fergburger/6179275032231936",
    ("margo's queenstown", "queenstown"): "https://www.findmeglutenfree.com/biz/margos/6028443094482944",
    ("odd saint", "queenstown"): "https://www.findmeglutenfree.com/biz/odd-saint/6524737079083008",
    ("white & wong's queenstown", "queenstown"): "https://www.findmeglutenfree.com/biz/white-and-wongs/5430728437923840",
    ("saigon kingdom vietnamese restaurant steamer wharf", "queenstown"): "https://www.findmeglutenfree.com/biz/saigon-kingdom/6158840239882240",
    ("tanoshi cow lane", "queenstown"): "https://www.findmeglutenfree.com/biz/tanoshi-cow-lane/4576062218043392",
    ("balls and bangles", "queenstown"): "https://www.findmeglutenfree.com/biz/balls-and-bangles/5349645751025664",
    # Wanaka
    ("relishes cafe", "wanaka"): "https://www.findmeglutenfree.com/biz/relishes-cafe/5618292725776384",
    ("scroggin coffee and eatery", "wanaka"): "https://www.findmeglutenfree.com/biz/scroggin-coffee-and-eatery/4963453027090432",
    ("big fig wanaka", "wanaka"): "https://www.findmeglutenfree.com/biz/big-fig/5634182386286592",
    ("tititea steak house", "wanaka"): "https://www.findmeglutenfree.com/biz/tititea-steak-house/4894627331702784",
    # Budapest
    ("cöli bisztró", "budapest"): "https://www.findmeglutenfree.com/biz/coli-bisztro/4827078706069504",
    ("tibidabo gluténmentes pékség", "budapest"): "https://www.findmeglutenfree.com/biz/tibidabo/6741963602788352",
    ("monkey's", "budapest"): "https://www.findmeglutenfree.com/biz/monkeys/6698311605813248",
    ("herbar", "budapest"): "https://www.findmeglutenfree.com/biz/herbar/4522961485299712",
    # Basel
    ("glutenfreie köstlichkeiten", "basel"): "https://www.findmeglutenfree.com/biz/glutenfreie-kostlichkeiten/4943649772797952",
    ("gifthüttli", "basel"): "https://www.findmeglutenfree.com/biz/gifthuttli/5028603223998464",
    ("nón lá vietnamese kitchen spalenbrunnen", "basel"): "https://www.findmeglutenfree.com/biz/non-la-restaurant/4915442561974272",
    ("glutenfreie welt husic", "basel"): "https://www.findmeglutenfree.com/biz/glutenfreie-welt-husic/5954283342266368",
    # Dublin
    ("saba", "dublin"): "https://www.findmeglutenfree.com/biz/saba/5422069185511424",
    ("beanhive coffee", "dublin"): "https://www.findmeglutenfree.com/biz/beanhive-coffee/5478765849346048",
    ("beshoff's o'connell street", "dublin"): "https://www.findmeglutenfree.com/biz/beshoffs/4558856416395264",
    ("gallaghers boxty house", "dublin"): "https://www.findmeglutenfree.com/biz/gallaghers-boxty-house/6084138121560064",
    ("opium", "dublin"): "https://www.findmeglutenfree.com/biz/opium-dublin/5569260130664448",
    ("the hairy lemon", "dublin"): "https://www.findmeglutenfree.com/biz/the-hairy-lemon/5551057858068480",
    ("the millstone restaurant", "dublin"): "https://www.findmeglutenfree.com/biz/millstone-restaurant/4715243498373120",
    ("beshoff bros", "dublin"): "https://www.findmeglutenfree.com/biz/beshoff-bros/6114274626764800",
    ("the brazen head", "dublin"): "https://www.findmeglutenfree.com/biz/the-brazen-head/6527902187388928",
    ("rustic stone", "dublin"): "https://www.findmeglutenfree.com/biz/rustic-stone/6094914425716736",
    ("cornucopia wholefoods restaurant", "dublin"): "https://www.findmeglutenfree.com/biz/cornucopia/5260521406201856",
    ("firehouse pizza ballymun", "dublin"): "https://www.findmeglutenfree.com/biz/firehouse-pizza-booterstown/6039447798415360",
    # Glasgow
    ("red onion", "glasgow"): "https://www.findmeglutenfree.com/biz/the-red-onion/6619058902532096",
    ("panang", "glasgow"): "https://www.findmeglutenfree.com/biz/panang/4959675959869440",
    ("the butterfly and the pig", "glasgow"): "https://www.findmeglutenfree.com/biz/the-tea-rooms-at-the-butterfly-and-the-pig/4861075476054016",
    ("bella italia - glasgow sauchiehall street", "glasgow"): "https://www.findmeglutenfree.com/biz/bella-italia/6623276478627840",
    # Inverness
    ("the white house", "inverness"): "https://www.findmeglutenfree.com/biz/the-white-house/4788360015642624",
    ("the rendezvous cafe inverness", "inverness"): "https://www.findmeglutenfree.com/biz/the-rendezvous-cafe/6126967239868416",
    ("hou hou mei", "inverness"): "https://www.findmeglutenfree.com/biz/hou-hou-mei/5553055594053632",
    ("pizza express", "inverness"): "https://www.findmeglutenfree.com/biz/pizza-express/5611586365161472",
    ("black isle bar & rooms", "inverness"): "https://www.findmeglutenfree.com/biz/black-isle-bar-and-rooms/6534762525229056",
    ("the kitchen restaurant", "inverness"): "https://www.findmeglutenfree.com/biz/the-kitchen-restaurant/5715307652055040",
    ("mcbain's by the river", "inverness"): "https://www.findmeglutenfree.com/biz/mcbains/4837063507181568",
    ("prime | steak & seafood", "inverness"): "https://www.findmeglutenfree.com/biz/prime--steak-and-seafood/5691689733849088",
    ("the castle tavern", "inverness"): "https://www.findmeglutenfree.com/biz/the-castle-tavern/6062097765105664",
    ("blend", "inverness"): "https://www.findmeglutenfree.com/biz/blend/5497659595030528",
    ("number 27 bar and kitchen", "inverness"): "https://www.findmeglutenfree.com/biz/number-27-bar-and-kitchen/6322826942480384",
    # Portree
    ("the view restaurant at cuillins hills", "portree"): "https://www.findmeglutenfree.com/biz/the-view-restaurant/6037461003796480",
    ("dulse and brose", "portree"): "https://www.findmeglutenfree.com/biz/dulse-and-brose/4723675233910784",
    ("antlers bar and grill", "portree"): "https://www.findmeglutenfree.com/biz/antlers-bar-and-grill/4590319026962432",
    ("an talla mòr eighteen twenty", "portree"): "https://www.findmeglutenfree.com/biz/an-talla-mor-eighteen-twenty/6630589008052224",
    ("cafe arriba", "portree"): "https://www.findmeglutenfree.com/biz/cafe-arriba/4851807811272704",
    ("siaway fish & chips", "portree"): "https://www.findmeglutenfree.com/biz/siaway-fish-and-chips/5862614094708736",
    ("the hungry gull", "portree"): "https://www.findmeglutenfree.com/biz/the-hungry-gull/6411287796514816",
    # Vienna
    ("blueorange - coffee & bagel", "vienna"): "https://www.findmeglutenfree.com/biz/blueorange/5141490989793280",
    ("café schopenhauer", "vienna"): "https://www.findmeglutenfree.com/biz/cafe-schopenhauer/6117738810048512",
    ("pizzeria scarabocchio", "vienna"): "https://www.findmeglutenfree.com/biz/pizzeria-scarabocchio/5274653701439488",
    ("gasthaus am predigtstuhl", "vienna"): "https://www.findmeglutenfree.com/biz/gasthaus-am-predigtstuhl/6462631235551232",
    ("gasthaus zum wohl", "vienna"): "https://www.findmeglutenfree.com/biz/gasthaus-zum-wohl/4583962772242432",
    ("allergiker café", "vienna"): "https://www.findmeglutenfree.com/biz/allergiker-cafe/6132547131801600",
    ("restaurant führich", "vienna"): "https://www.findmeglutenfree.com/biz/restaurant-fuhrich/5832353936834560",
    ("nestroy gasthaus & biergarten", "vienna"): "https://www.findmeglutenfree.com/biz/gasthaus-nestroy/5596020377518080",
    # Tokyo
    ("sushi korin nishiazabu", "tokyo"): "https://www.findmeglutenfree.com/biz/sushi-korin/5692087038771200",
    ("kuroboshi sweets asakusa", "tokyo"): "https://www.findmeglutenfree.com/biz/kuroboshi-sweets/4714867201802240",
    ("esoragoto udon", "tokyo"): "https://www.findmeglutenfree.com/biz/esoragoto/6097653970108416",
    ("hokkaido sapporo ramen", "tokyo"): "https://www.findmeglutenfree.com/biz/hokkaido-sapporo-ramen/5139584023658496",
    ("rizriant", "tokyo"): "https://www.findmeglutenfree.com/biz/rizriant/5037758509350912",
    ("nachura gluten free cafe", "tokyo"): "https://www.findmeglutenfree.com/biz/nachura/5747696344891392",
    ("shochikuen cafe", "tokyo"): "https://www.findmeglutenfree.com/biz/shochikuen-cafe/5339289087508480",
    ("casa de sarasa", "tokyo"): "https://www.findmeglutenfree.com/biz/casa-de-sarasa/6175739135787008",
}
```

### Not Found on FMGF (confirmed)
- Valhalla Bar Basel (Basel)
- Sweet Spot NZ (Wanaka)
- Kimchi Hophouse (Dublin)
- Firehouse Pizza Ballymun (Dublin) — mapped to Booterstown listing, check if correct
- Botswana Butchery Auckland — only Queenstown listing found on FMGF, used that

### Cities Still Needing FMGF Lookups (no URLs found yet)
Blenheim (4), Bratislava (1), Doolin (2), Florence (6), Fort William (4), Galway (6), Geneva (2), Hakone (2), Hiroshima (1), Innsbruck (4), Interlaken (7), Killarney (11), Kyoto (11), Limerick (1), Lucerne (7), Mt Cook (2), Nara (2), Ocho Rios (1), Osaka (4), Prague (2), Salzburg (5), Wellington (1), Zermatt (6)

---

## First Thing To Do In New Chat

1. **Load the master spreadsheet** from `/home/claude/travel_master.xlsx`
2. **Write the 88 found URLs** to the spreadsheet using fuzzy place name matching (lowercase strip)
3. **Continue FMGF lookups** for the remaining cities listed above
4. **Save** to both `/home/claude/travel_master.xlsx` and `/mnt/user-data/outputs/travel_master.xlsx`

### Matching Logic
Match on `(place_name.lower().strip(), city.lower().strip())`. Place names in the spreadsheet may differ slightly — use flexible matching (substring, word overlap) for ambiguous cases. Log any that don't match so they can be reviewed.

---

## Spreadsheet Formatting Rules (for reference)
- Header: dark blue fill `2D5F8A`, white bold Arial 10pt, frozen row 1
- Even rows: light blue `EBF3FB`, odd rows: white `FFFFFF`
- `needs_review = yes` rows: yellow `FFF3CD`
- Col 20 (`fmgf_url`): hyperlinked, width=55
- Auto-filter on header row

---

## Known Manual Fixes Still Needed
- `VINTAGE QOO TOKYO SHINSAIBASHI` (Osaka) — incorrectly scored GF; it's a vintage clothing shop; clear GF fields
- `Fishbone Bar & Grill` (Queenstown) — PERMANENTLY CLOSED in notes
- `Eriks Fish and Chips` (Wanaka) — PERMANENTLY CLOSED
- `Švejk restaurant U Karla` (Prague) — likely permanently closed
- `Patricia's Coffee Bar` (Glasgow) — PERMANENTLY CLOSED
- `Cup Merchant City` (Glasgow) — PERMANENTLY CLOSED
- `My Bánh Mì by Gluten Free TOKYO` (Tokyo) — temporarily closed
- `Salt Café - Morningside` (Edinburgh) — PERMANENTLY CLOSED
- 42 hotels flagged `needs_review = yes` with `gf_category = unclear` — need manual research

---

## Full Session Transcripts
All prior session transcripts are available at:
- `/mnt/transcripts/2026-03-07-21-45-05-kml-travel-db-fmgf-urls.txt` (most recent, current session)
- `/mnt/transcripts/2026-03-07-17-28-41-kml-travel-db-fmgf-urls.txt`
- `/mnt/transcripts/2026-03-07-17-26-11-kml-travel-db-skill-creation.txt`
- `/mnt/transcripts/2026-03-07-17-14-40-kml-travel-db-skill-creation.txt`
