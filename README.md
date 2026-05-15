# Campus Lunch Pipeline

![Status](https://img.shields.io/badge/status-stable-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![n8n](https://img.shields.io/badge/built%20with-n8n-orange)

A self-hosted automation pipeline that scrapes a university's weekly lunch menu from email, extracts structured data using Claude, stores it in PostgreSQL, and posts daily menu updates to a Discord channel.

Built for my university's specific email and SharePoint setup. If you want to adapt it for another institution, the architecture is reusable but the credentials, email parsing logic, and PDF structure will likely need changes. Please treat this as a reference implementation rather than a drop-in solution.
---

## How It Works

The cafeteria sends a weekly email every Friday containing a link to a PDF menu hosted on Microsoft SharePoint. This pipeline picks that up and handles the rest automatically.


```
[University Email]
      |
      v
[n8n: Gmail Search] --> [Playwright API: Fetch SharePoint PDF]
      |
      v
[Claude API: Extract menu as JSON]
      |
      v
[PostgreSQL: Store menu items]
      |
      v
[n8n: Daily Discord Poster @ 11am JST]
```

Two n8n workflows handle the work. The first runs on Saturdays to scrape and store the week's menu. The second runs Monday through Friday at 9 AM JST to query that day's menu and post it to Discord.

---

## Tech Stack

| Component | Technology |
|---|---|
| Workflow automation | n8n (self-hosted) |
| PDF fetching | Playwright + Express (Node.js) |
| AI extraction | Claude (Anthropic API) |
| Database | PostgreSQL |
| Notifications | Discord webhook |
| Infrastructure | Proxmox, self-hosted |

---

## Project Structure

```
campus-lunch-pipeline/
├── playwright-api/
│   ├── server.js               # Express + Playwright PDF fetcher
│   ├── save-session.js         # Microsoft session saver (run manually)
│   ├── test-session.js         # Verify session is working
│   ├── package.json
│   ├── menu-fetcher.service    # systemd unit file
│   └── README.md
├── n8n-workflows/
│   ├── workflow-1-menu-scraper.json
│   ├── workflow-2-discord-poster.json
│   └── README.md
├── database/
│   ├── schema.sql              # Table definition and indexes
│   └── README.md
├── docs/
│   └── sharepoint-session-renewal.md
├── SETUP.md
├── ARCHITECTURE.md
├── CHANGELOG.md
└── LICENSE
```

---

## Prerequisites

Before setting up, you will need:

- An n8n instance (v2.8 or later)
- PostgreSQL (any recent version)
- Node.js 18+ on a machine that can run Playwright
- An Anthropic API key
- A Discord webhook URL
- A Gmail account that receives the weekly menu email
- A Microsoft 365 account with access to the SharePoint PDF links

---

## Setup

Full setup instructions are in [SETUP.md](./SETUP.md). At a high level:

1. **Database** -- run `database/schema.sql` against a PostgreSQL instance to create the `menu_items` table.
2. **Playwright API** -- install dependencies, configure the systemd service, and run `save-session.js` once to authenticate with Microsoft SharePoint. See `playwright-api/README.md` for details.
3. **n8n workflows** -- import both JSON files into n8n and configure the required credentials (Gmail OAuth2, Anthropic API, PostgreSQL, Discord webhook).

> Note: The Microsoft SharePoint session requires a one-time manual login via a desktop GUI. This is the most hands-on part of the setup and is documented separately in `docs/sharepoint-session-renewal.md`.

---

## Known Limitations

- **Kameoka campus not implemented.** The second campus PDF uses a different layout and has been deferred. Currently, the Uzumasa campus is processed. 
- **Microsoft session expires periodically.** Every few weeks the SharePoint session needs to be manually renewed. When it expires, the pipeline sends a Discord alert automatically.
- **Curry Set is stored once per weekday** even though it is the same item all week.

---

## Roadmap
- [ ] Add halal menu items
- [ ] Add support for Kameoka campus
- [ ] Automate Microsoft session renewal
- [ ] Deduplicate recurring weekly items like the Curry Set


---

## Contributing

This is a personal project built for a specific university setup, but adaptations for other institutions are welcome. If you run into a bug or want to suggest an improvement, open an issue and it will be reviewed within a few days.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for basic guidelines.

---

## License

MIT. See [LICENSE](./LICENSE) for details.