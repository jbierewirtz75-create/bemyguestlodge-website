# Instructions for marketing agents (blog posts & events)

This repository builds the website of **Be My Guest Lodge** (https://bemyguestlodge.co.za), a family-run guesthouse in
Bloubergrant, Table View (Bloubergstrand), Cape Town, hosted by Jan & Leona. Agents may add **blog posts**, **blog images**
and **events**. Everything else (core pages, layout, scripts) is off-limits unless Jan asks for it explicitly.
Agreed interface: `docs/marketing-schnittstelle.md` (from the marketing project) – this file describes how it is implemented.

## Workflow – always via pull request

1. Create a branch from `main`, e.g. `blog/2026-11-king-of-the-air` or `events/2026-12`.
2. Change files **only** in `content/blog/`, `content/events/` and `public/images/blog/`.
3. Open a pull request (template is filled in automatically). `main` is protected: direct pushes are rejected.
4. The check **"build"** must be green. If it is red, open the log: it names the file and the problem. Fix it in the same branch.
5. Jan reviews the preview and merges. Merged = published with the next build. Posts dated in the future appear on that day (daily scheduled build at 04:15 UTC = 06:15 SAST, active once hosting/deploy is connected).

## Blog posts

```
content/blog/en/<slug>.md  or  content/blog/en/YYYY-MM-DD-<slug>.md
content/blog/de/<slug>.md  or  content/blog/de/YYYY-MM-DD-<slug>.md
public/images/blog/<name>.jpg      (or content/blog/images/<name>.jpg)
```

```markdown
---
title: "Red Bull King of the Air 2026: Spectator guide for Bloubergstrand"
slug: king-of-the-air-2026-guide       # lowercase, digits, hyphens; becomes the URL /en/blog/<slug>/
lang: en                               # en | de – must match the folder
translation_of: king-of-the-air-2026   # slug of the post in the other language (may be set on one or both sides; empty if none)
date: 2026-11-09                       # YYYY-MM-DD; if the file name starts with a date, it must be the same
description: "Max. 160 characters – meta description, social preview and RSS."
tags: [kitesurfing, events, bloubergstrand]
hero_image: /images/blog/kite-sunset-silhouette.jpg   # /images/blog/… = public/images/blog/…;  images/… = content/blog/images/…
hero_alt: "Kites at sunset over the sea at Bloubergstrand"
status: approved                       # draft | approved – only approved posts are published
---
```

- Text in Markdown: sections `##`, sub-sections `###`, **no `#` heading** (the title is the H1), no raw HTML (removed).
- Inline images: `![Concrete description](/images/blog/name.jpg)`.
- Booking button anywhere in the text: a line `**[Book direct →]**` (EN) or `**[Jetzt direkt buchen →]**` (DE).
  Every post also gets booking and WhatsApp buttons at the end automatically.
- Images: JPG or PNG, at least 1600 px wide, max. 5 MB, own photos of the lodge or licensed images. They are resized to WebP automatically; social preview = hero_image (1200 × 630).
- **Tags:** lowercase with hyphens. Use the shared English tags so EN and DE posts share the same filters:
  `kitesurfing`, `beaches`, `table-mountain`, `day-trips`, `west-coast`, `wine`, `family`, `food`, `events`, `seasons`, `nature`, `lodge-news`, `cape-town`, `bloubergstrand`, `table-view`, `business`, `pets`, `groups`.
  Other tags are allowed (e.g. `king-of-the-air`); common German tags (`kitesurfen`, `kapstadt`, `strand` …) are mapped automatically.

## Events – `content/events/events.json` → `/en/events/`, `/de/events/`

```json
[
  {
    "title_en": "Red Bull King of the Air",
    "title_de": "Red Bull King of the Air",
    "start": "2026-11-21",
    "end": "2026-12-06",
    "location": "Kite Beach, Bloubergstrand",
    "url": "https://www.redbull.com/…",
    "walk_min": 10,
    "description_en": "Optional, max. 200 characters.",
    "description_de": "Optional, max. 200 Zeichen.",
    "image": "/images/blog/king-of-the-air.jpg"
  }
]
```
Required: a title, `start`, `location`. `end`, `url`, `walk_min`, descriptions and `image` are optional.
(`date`/`end_date` are accepted as older names for `start`/`end`.) Past events disappear automatically.

## Facts that must be correct

- Check-in 14:00–19:00, check-out until 10:00, late check-in on request
- Beach approx. 5 min walk · Kite Beach a good 10 min walk (3–4 min by car or Uber) · city/CTICC/V&A Waterfront approx. 25 min · airport approx. 20 min by car
- 5 comfort rooms = 3 doubles (Comfort Double) + 2 twins (Comfort Twin, two single beds) – never "5 double rooms" – plus the Family Cottage (approx. 85 m², up to 6 guests); whole lodge up to 16 guests, bookable exclusively for groups
- Breakfast (B&B) or self-catering · garden with palm tree · pool · two braais · very good Wi-Fi · secure parking on the property (**no gate** – do not mention one)
- Pets welcome in the Family Cottage (more than one pet on request)
- Longer stays: "Ask us for a tailored rate" – never state a percentage
- **Taxi service** on request – there is **no airport shuttle** · baby cot and high chair on request
- **Do not mention backup power or solar** (not installed yet)
- Direct booking: use the booking button/placeholder (the link is maintained centrally in `site.config.json`; currently https://book.nightsbridge.com/28083 – the `?nbid=` variant does not work) · WhatsApp +27 72 838 4490 · info@bemyguestlodge.co.za
- Slogan: "Home away from home"
- German address form: informal singular **"du/dich/dein"** (website and blog)
- Do not invent prices, discounts, awards or guest quotes.

## Test locally (optional)

```bash
npm ci
npm run build:preview   # drafts visible
npm run check
npm run serve           # http://localhost:8080/en/blog/
```
