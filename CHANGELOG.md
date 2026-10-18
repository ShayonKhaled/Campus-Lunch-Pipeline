
# Change Log
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).
 
## [Unreleased]
### Fixed
- **Menu prices were never extracted.** The prompts told the model which fields to
  return and that list had no `price`, so every row landed with `price = NULL`.
  The Kameoka prompt asked for a price in its rules while omitting it from the
  schema it was told to follow. `price` is now in every schema with an explicit
  rule, and the Uzumasa output parser maps it (it did not before).
- **Rows could be stored under campus `Unknown`.** The Kameoka and Halal output
  parsers fell back to the literal `'Unknown'` when the campus reference was not
  available, which produces rows the bot cannot match to any subscriber. Each
  workflow now uses its own campus as a constant.

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

