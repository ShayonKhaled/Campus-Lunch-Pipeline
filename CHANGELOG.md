
# Change Log
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).
 
## [Unreleased]
### Fixed
- **Kameoka prices were never extracted.** The prompt listed the fields the model
  must return and `price` was not among them, even though a rule further down
  asked for one. The schema is what the model follows, so `dish.price` was always
  undefined and every Kameoka row was stored with `price = NULL` — and Kameoka has
  no fallback price table, so its menus posted without any figures. `price` is now
  in the schema. Uzumasa is left alone: it has no scraped price by design and the
  bot derives its prices from the campaign tiers.
- **Rows could be stored under campus `Unknown`.** The Kameoka and Halal output
  parsers fell back to the literal `'Unknown'` when the campus reference was not
  available, which produces rows the bot cannot match to any subscriber. Each
  workflow now uses its own campus as a constant.
- **A subject-line change made the scrapers re-scrape the previous week.** On
  2026-10-30 the weekly email's subject became "レストランのランチメニュー &
  「さらに70円引き」キャンペーンの実施について", so the searches' exact phrase
  `レストランのランチメニューについて` stopped matching it. The search fell back to
  the previous week's email — still inside `newer_than:14d` — and the 10-31 runs
  re-wrote 2026-10-26..30 instead of the coming week: Kameoka inserted the same
  menu again under campus `'Unknown'` (the unique key includes campus, so nothing
  collided) and Uzumasa wrote nothing at all, while the week of 2026-11-02 was
  never stored and the bot had no menu to post on Monday. All three scrapers now
  search `subject:ランチメニュー`, which both subject lines share, and the word is
  short enough to survive the campaign clause changing again.
- **A stale scrape now fails loudly instead of writing.** The Uzumasa and Kameoka
  parsers throw when the newest extracted `menu_date` is outside
  `today-1 .. today+14`, which is what a wrong-email match looks like. The Halal
  workflow is exempt: it deliberately scrapes weeks ahead.
- **The fetcher saved the OneDrive page and called it a PDF.** The 2026-11-02 email
  switched from guest links (`:b:/g/personal/…?e=…`, where `?download=1` works
  anonymously) to viewer links (`:b:/r/personal/…/onedrive.aspx?id=…`), which serve
  the OneDrive viewer page for `?download=1`. The fetcher returned that HTML as
  `success: true, base64Pdf`, Gemini rejected it with a bare 400 "invalid
  argument", and nothing was stored. It now converts a viewer link to
  `download.aspx?SourceUrl=<server-relative path>`, verifies the payload really
  starts with `%PDF`, and answers 502 with a plain explanation otherwise. The
  same deploy also needs an interactive `save-session.js` on the fetcher VM: the
  saved Microsoft session was expired, which is why only guest links still
  worked.

## [1.1.0] - 2026-06-14
### Added
- Halal menu scraper workflow (`workflow-1-menu-scraper-halal`) for Uzumasa campus
  - Extracts the Halal-friendly PDF link from the weekly email using two-pass English-preferred keyword search (`"Halal"` → `"ハラル"`)
  - Claude-powered extraction: Tuesday and Thursday only, one dish per day
  - Hardcoded values: `category: "Halal"`, `subcategory: "Halal"`, `price: 400`
  - Inserts into existing `menu_items` table with unique constraint dedup

## [1.0.0] - 2026-05-15
- Initial release — project created.
- Included:
  - n8n workflows for scraping and Discord posting
  - Playwright API (Express) to fetch SharePoint PDFs
  - Claude extraction + PostgreSQL storage
  - Docs: SETUP.md, ARCHITECTURE.md, sharepoint-session-renewal.md
  - Systemd service and helper scripts for session management
- Notes: No functional changes since initial commit.

