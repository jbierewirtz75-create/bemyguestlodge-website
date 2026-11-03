# Be My Guest Lodge – Website

Statische, mehrsprachige Website (EN, DE, AF, FR, ES, ZH) mit Markdown-Blog und Veranstaltungsseite.
Live-Adresse: https://bemyguestlodge.co.za

## Kurz erklärt

| Was | Wo |
|---|---|
| Blogbeiträge (EN/DE) | `content/blog/en/`, `content/blog/de/` (Markdown) |
| Bilder zu Beiträgen/Events | `public/images/blog/` oder `content/blog/images/` (werden beim Bauen automatisch verkleinert, WebP) |
| Veranstaltungen („What's on“, `/en/events/`, `/de/events/`) | `content/events/events.json` |
| Link-in-Bio-Seite für Social Media | `/hello/` (wird automatisch erzeugt, DE/EN nach Browsersprache) |
| Vereinbarung mit dem Marketing-Projekt | `docs/marketing-schnittstelle.md` |
| Impressum / Datenschutz (EN, DE) | `content/legal/en/`, `content/legal/de/` (Markdown; offene Angaben sind als `{{TODO: …}}` markiert und erscheinen gelb) |
| Schriften | selbst gehostet in `public/fonts/` (keine Verbindung zu Google Fonts) |
| Regeln für die Marketing-Agenten | `AGENTS.md` |
| Kernseiten (Startseite, Zimmer) | `core/` – erzeugt aus `source/index.html` |
| Bilder, Video, CSS, JS der Kernseiten | `public/` |
| Domain, **Buchungslink** (`book`), WhatsApp, **Umami-Website-ID** (`umamiWebsiteId`) | `site.config.json` – einzige Stelle; alle Buchen-Buttons der Website werden beim Bauen darauf gesetzt |
| Alte Adressen → neue Adressen (301) | `redirects.txt` (anlegen, sobald die alte URL-Liste vorliegt) |

## So kommt ein Blogbeitrag online

1. Der Marketing-Agent legt den Beitrag in einem eigenen Branch an und öffnet einen **Pull Request**.
2. GitHub prüft automatisch („Build & check“). Grün ✓ = technisch in Ordnung.
3. Der Hoster erzeugt eine **Vorschau** (mit Entwürfen, für Suchmaschinen gesperrt).
4. Jan liest die Vorschau und klickt **„Merge pull request“** → der Beitrag ist nach dem automatischen Neubau online.

Veröffentlicht wird nur, was `status: "approved"` hat und dessen Datum erreicht ist.
Beiträge mit Datum in der Zukunft erscheinen beim ersten Neubau ab diesem Tag (deshalb empfohlen: täglicher automatischer Neubau).

## Für den IT-Dienstleister: Hosting

Die Website ist reines HTML/CSS/JS – keine Datenbank, kein PHP.

| Einstellung | Wert |
|---|---|
| Node.js | 20 oder neuer |
| Build-Befehl | `npm ci && npm run build` |
| Ausgabeordner | `dist/` |
| Vorschau-Builds (Pull Requests) | `npm ci && npm run build:preview` – wird bei Netlify (Deploy Previews) und Cloudflare Pages (Branch-Builds) automatisch erkannt |
| Datei-basierte Vorschau ohne Webserver | `LINK_SUFFIX=index.html npm run build` |

**Varianten**
- **Cloudflare Pages oder Netlify** (empfohlen): Repository verbinden, Werte oben eintragen. Header kommen aus `dist/_headers`, Weiterleitungen aus `redirects.txt` → `dist/_redirects`.
- **Eigener Webserver (Apache/Nginx):** GitHub Action ergänzen, die nach jedem Merge auf `main` baut und `dist/` per SFTP/rsync hochlädt. Für Apache liegt eine `.htaccess` bei (404-Seite, Caching).
- **Täglicher Neubau** (für geplante Beiträge und abgelaufene Events): Deploy-Hook des Hosters einmal täglich aufrufen (z. B. per geplanter GitHub Action).

**Domain/DNS:** Die Domain liegt derzeit bei xneelo. Beim Umzug müssen die E-Mail-Einträge (MX, SPF, DKIM, DMARC) unverändert bleiben.
Die Hauptadresse ist in `site.config.json` festgelegt (`https://bemyguestlodge.co.za`, ohne www). Die jeweils andere Variante (www / ohne www) per 301 auf die Hauptadresse weiterleiten.

## Statistik (Umami, ohne Cookies)

Sobald in `site.config.json` eine `umamiWebsiteId` eingetragen ist, bindet der Build das Umami-Script auf allen Seiten ein
(nur aktiv auf der Live-Domain, nicht in Vorschauen). Klicks werden automatisch markiert:
`book_click` (mit Position `header`, `home`, `room-page`, `blog-footer`, `blog-inline`, `blog-index`, `events-page`, `hello-top`),
`whatsapp_click`, `email_click`, `phone_click`, sowie `source_answer` (Feld „Wie habt ihr von uns erfahren?“ im Kontaktbereich und auf `/hello/`).
Buchen-Buttons öffnen im selben Tab.

## Befehle

```bash
npm ci                  # einmalig: Abhängigkeiten installieren
npm run build           # Live-Version nach dist/
npm run build:preview   # Vorschau mit Entwürfen
npm run check           # Links, Metadaten, Feeds prüfen
npm run serve           # lokale Vorschau: http://localhost:8080/en/
npm run prerender       # nur nach Änderungen an source/index.html (benötigt Playwright + Chromium)
```

## Was beim Bauen entsteht

30 Kernseiten (6 Sprachen), Blog-Übersicht und Beiträge (EN/DE) mit Tag-Filter, Veranstaltungsseiten (`/en/events/`, `/de/events/`),
Link-in-Bio-Seite `/hello/`, RSS-Feeds (`/en/blog/rss.xml`, `/de/blog/rss.xml`; gleicher Inhalt auch unter `feed.xml`), `sitemap.xml` mit hreflang, `robots.txt` (KI-Crawler erlaubt), `llms.txt`,
strukturierte Daten (BedAndBreakfast, FAQ, BlogPosting, Event, Breadcrumbs), Sprachweiche auf `/`, `404.html`.
Fehlerhafte Beiträge (fehlende Felder, unbekannte Tags, fehlende Bilder …) stoppen den Build mit klarer Meldung.
