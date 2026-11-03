# Instructions for marketing agents (blog posts & events)

This repository builds the website of **Be My Guest Lodge** (https://bemyguestlodge.co.za), a family-run guesthouse in
Bloubergrant, Table View (Bloubergstrand), Cape Town, hosted by Jan & Leona. You may add **blog posts** and **events**.
Everything else (core pages, layout, scripts) is off-limits unless Jan asks for it explicitly.

## Workflow – always via pull request

1. Create a new branch from `main`, e.g. `blog/2026-11-kite-season` or `events/2026-12`.
2. Add or change files **only** in `content/blog/` and `content/events/`.
3. Open a pull request using the template. Never push to `main` directly, never merge yourself.
4. The check "Build & check" must be green. If it is red, read the log: it names the file and the problem. Fix it in the same branch.
5. Jan reviews the preview and merges. Merged = published (on the next build, see "date").

## Blog posts

- English is the original: `content/blog/en/<slug>.md`. German: `content/blog/de/<slug>.md`.
- File name = slug: lowercase letters, digits and hyphens only (e.g. `kite-season-2027.md`). German slugs may be German.
- Images: `content/blog/images/<name>.jpg` (JPG or PNG, at least 1600 px wide, max. 5 MB). Only own photos from the lodge or licensed images.
- Text in Markdown. Sections with `##`, sub-sections with `###`. **No `#` heading** (the title is the H1). No raw HTML (it is removed).
- Inline images are allowed: `![Concrete description](images/name.jpg)`.

```markdown
---
title: "Kite season at the Cape: wind, spots and timing"
slug: "kitesurfing-cape-town"
lang: "en"                       # en | de – must match the folder
translation_of: ""               # EN original: empty. DE translation: the English slug
date: "2026-11-02"               # YYYY-MM-DD; posts dated in the future appear from that day on (next build)
description: "Max. 160 characters, used as meta description and in the RSS feed."
tags: ["kitesurfing", "beaches"] # only from the list below
hero_image: "images/kite-beach-sunset.jpg"   # relative to content/blog/
hero_alt: "Kitesurfer at sunset at Kite Beach, Bloubergstrand, with Table Mountain"
status: "approved"               # draft | approved – only approved posts are published
---
```

**Tags:** `kitesurfing`, `beaches`, `table-mountain`, `day-trips`, `west-coast`, `wine`, `family`, `food`, `events`, `seasons`, `nature`, `lodge-news`
(new tags only after agreement with Jan – they must be added to `scripts/build.mjs`).

**Facts that must be correct** (see also `llms.txt` on the website):
- Check-in 14:00–19:00, check-out until 10:00, late check-in on request
- **Taxi service** on request – there is **no airport shuttle**
- Secure parking on the property (there is **no gate** – do not mention one)
- Baby cot and high chair on request; pool, garden, two braais shared by all guests
- 5 comfort rooms + 1 two-storey Family Cottage (approx. 85 m², up to 6 guests), up to 16 guests in total
- Direct booking: https://book.nightsbridge.com/28083 · WhatsApp +27 72 838 4490 · info@bemyguestlodge.co.za
- German texts address readers informally ("ihr/euch").
- Do not invent prices, discounts, awards or guest quotes.

Every post automatically gets: booking and WhatsApp buttons, language switch and hreflang (via `translation_of`),
structured data, RSS (`/en/blog/feed.xml`, `/de/blog/feed.xml`), sitemap and a teaser on the home page (latest 3).

## Events – `content/events/events.json`

```json
[
  {
    "title_en": "Kite Beach sunset session",
    "title_de": "Sundowner-Session am Kite Beach",
    "date": "2026-12-14",
    "end_date": "",
    "location": "Kite Beach, Bloubergstrand",
    "description_en": "Max. 200 characters.",
    "description_de": "Max. 200 Zeichen.",
    "url": "https://…",
    "image": "images/kite-session.jpg"
  }
]
```
Required: `title_en`, `date`, `location`. Past events disappear automatically. Shown on `/en/whats-on/` and `/de/whats-on/`.

## Test locally (optional)

```bash
npm ci
npm run build:preview   # drafts visible
npm run check
npm run serve           # http://localhost:8080/en/blog/
```
