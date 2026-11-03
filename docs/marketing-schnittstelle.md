# Übergabe: Marketing-Projekt → Website-Projekt (Be My Guest Lodge)

Version 1.0 · 3. November 2026
Absender: Claude-Projekt "Marketing guesthouse Aufbauen Und Automatisieren"
Empfänger: Claude-Projekt "Neue Website" (Be My Guest Lodge)

> **Anleitung für Jan:** Diesen kompletten Text im Website-Projekt in den Chat einfügen (oder als Datei hochladen). Am Ende liefert das Website-Projekt einen Block **"Rückmeldung an Marketing-Projekt"** – diesen Block bitte zurück ins Marketing-Projekt kopieren. Dann sind beide Projekte synchron.

---

## Auftrag an Claude im Website-Projekt

Bitte setze die folgenden Anforderungen auf der neuen Website der Be My Guest Lodge um (oder plane sie ein, falls etwas noch nicht möglich ist). Das Marketing-Projekt betreibt ein KI-Agententeam (Scout, Editor, Writer, Hunter, Publisher, Manager), das wöchentlich Blogbeiträge in Deutsch und Englisch erstellt und den Erfolg aller Marketingaktivitäten misst. Die Website muss diese Inhalte aufnehmen und messbar machen.

Speichere dieses Dokument bitte in deinem Projekt als Referenz (z. B. `docs/marketing-schnittstelle.md`). Bei späteren Versionen ersetzt eine neue Version dieses Dokuments die alte.

---

## 1. Blog: Inhalte aus dem Marketing-Projekt aufnehmen

### 1.1 Ablage
```
content/blog/de/YYYY-MM-DD-slug.md
content/blog/en/YYYY-MM-DD-slug.md
content/events/events.json            (optional: Event-Kalender)
public/images/blog/<dateiname>.jpg
```

### 1.2 Dateiformat (Frontmatter + Markdown)
```markdown
---
title: "Red Bull King of the Air 2026: Dein Zuschauer-Guide für Bloubergstrand"
slug: king-of-the-air-2026
lang: de
translation_of: king-of-the-air-2026-guide
date: 2026-11-09
description: "Meta-Description, max. ca. 155 Zeichen"
tags: [kitesurfen, king-of-the-air, bloubergstrand, events, kapstadt]
hero_image: /images/blog/kite-sunset-silhouette.jpg
hero_alt: "Kite-Schirme vor der untergehenden Sonne über dem Meer bei Bloubergstrand"
status: approved
---

Text in Markdown …
```

### 1.3 Anforderungen Blog
- Übersichtsseite und Detailseite je Sprache: `/de/blog/<slug>` und `/en/blog/<slug>`
- **Nur Dateien mit `status: approved` anzeigen**
- Sprachumschalter verknüpft DE ↔ EN über `translation_of`
- `<title>` und Meta-Description aus Frontmatter; Open-Graph-Bild = `hero_image`
- `hreflang`-Tags DE/EN, Einträge in `sitemap.xml`, RSS-Feed je Sprache (`/de/blog/rss.xml`, `/en/blog/rss.xml`)
- Unter jedem Beitrag ein Button **"Jetzt direkt buchen" / "Book direct"** (siehe 3.)
- Platzhalter `**[Jetzt direkt buchen →]**` bzw. `**[Book direct →]**` im Markdown als Buchungs-Button rendern

### 1.4 Optional: Seite "What's on"
`/de/events` und `/en/events` aus `content/events/events.json`:
```json
[
  {
    "title_de": "Red Bull King of the Air",
    "title_en": "Red Bull King of the Air",
    "start": "2026-11-21",
    "end": "2026-12-06",
    "location": "Kite Beach, Bloubergstrand",
    "url": "https://www.redbull.com/…",
    "walk_min": 10
  }
]
```
Vergangene Events automatisch ausblenden.

### 1.5 Update-Weg (bitte festlegen und zurückmelden)
Bevorzugt: **Website-Code auf GitHub + Hoster baut bei jedem Commit automatisch neu** (z. B. Netlify, Vercel, Cloudflare Pages). Dann kann der Publisher-Agent neue Beiträge einfach als Dateien committen. Falls der aktuelle Hoster das nicht kann: einfachsten Alternativweg vorschlagen.

---

## 2. Link-in-Bio-Seite `/hello`

Schlanke, mobile Startseite für Social-Media-Profile (Instagram, TikTok, Facebook):
1. Logo/Name "Be My Guest Lodge" + Slogan "Home away from home"
2. **Großer Button "Direkt buchen / Book direct"** ganz oben (→ Buchungslink, siehe 3.)
3. Button "WhatsApp" (Nummer: wird von Jan ergänzt)
4. Kacheln: Zimmer · Cottage (bis 6 Personen) · Ganze Lodge für Gruppen (bis 16)
5. Die 3 neuesten Blogbeiträge (automatisch, in Sprache des Browsers, Umschalter DE/EN)
6. Link "What's on in Blouberg" (falls 1.4 umgesetzt)
- Ladezeit minimal, keine Ablenkung, nicht in der Hauptnavigation nötig, aber indexierbar (`noindex` nicht nötig)
- Muss Query-Parameter (UTM) unverändert akzeptieren

---

## 3. Buchung: NightsBridge-Link

- Alle "Direkt buchen"-Buttons der Website verlinken auf den **NightsBridge-Buchungslink mit "Alternative Source"** (Marketing-Link):
  `https://book.nightsbridge.com/<BBID>?nbid=563`
  → `<BBID>` = NightsBridge-Nummer der Lodge (von Jan). Bis zur Einrichtung den bisherigen Buchungslink verwenden und als Konstante an **einer** Stelle im Code pflegen (z. B. `BOOKING_URL`), damit er leicht austauschbar ist.
- Button öffnet im selben Tab (bessere Conversion auf dem Handy).

---

## 4. Website-Statistik: Umami Cloud (kostenlos, ohne Cookies)

1. Konto: umami.is → Cloud → **Hobby-Plan (kostenlos)** → Website `bemyguestlodge.co.za` anlegen (Jan oder du mit Jans Zugang)
2. Tracking-Script im `<head>` **aller** Seiten:
   ```html
   <script defer src="https://cloud.umami.is/script.js" data-website-id="UMAMI-WEBSITE-ID"></script>
   ```
3. **Klick-Tracking** auf allen Buchungs-Buttons, mit Position als Eigenschaft:
   ```html
   <a href="BOOKING_URL" data-umami-event="book_click" data-umami-event-position="blog-footer">Jetzt direkt buchen</a>
   ```
   Positionen: `header`, `hello-top`, `blog-footer`, `room-page`, `events-page`
4. Weitere Events: `whatsapp_click`, `email_click`, `phone_click`
5. UTM-Parameter werden von Umami automatisch ausgewertet – nichts weiter nötig.
6. **Kein Cookie-Banner** für Umami nötig (cookielos). Datenschutzerklärung um einen Satz zu Umami ergänzen.

---

## 5. Google Search Console (kostenlos)
- Domain-Property `bemyguestlodge.co.za` anlegen, Verifizierung per **DNS-TXT-Eintrag** beim Hoster
- `sitemap.xml` einreichen (inkl. Blog DE/EN)
- Jan als Inhaber eintragen

---

## 6. Feld "Wie hast du von uns erfahren?"
In Kontakt-/Anfrageformular (und falls möglich vor der Weiterleitung zur Buchung als optionales Auswahlfeld):
- DE: Google · Instagram · Facebook · TikTok · Booking.com/Airbnb/anderes Portal · Empfehlung von Freunden · Partner (Kite-Schule, Makler …) · Schon mal hier gewesen · Sonstiges
- EN: entsprechend
- Auswahl zusätzlich als Umami-Event senden: `data-umami-event="source_answer"` mit Eigenschaft `answer`

---

## 7. Fakten, die auf der Website konsistent sein müssen
(Quelle: Marketing-Projekt, `config/lodge-fakten.md`)
- Strand: 5 Min zu Fuß · Kite Beach: gut 10 Min zu Fuß / 3–4 Min mit Auto/Uber · CTICC/City: ca. 25 Min · Flughafen: ca. 20 Min
- 5 Doppelzimmer + 1 Cottage bis 6 Personen · ganze Lodge bis 16 Personen exklusiv buchbar
- Frühstück · Garten mit Palme · Pool · sehr gutes WLAN · Haustiere im Cottage willkommen (mehr als 1 Tier auf Anfrage) · Langzeit-Rabatt auf Anfrage
- **Backup-Strom nicht bewerben** (noch nicht installiert)
- Slogan: "Home away from home" · Ansprache DE: "du"
- Optional Seite für Klinik-Angehörige ("Staying near Netcare Blaauwberg Hospital"): ruhig, sachlich, keine Krankheiten nennen

---

## 8. Rückmeldung an Marketing-Projekt (bitte ausfüllen und Jan geben)

Bitte gib am Ende diesen Block ausgefüllt aus, damit Jan ihn ins Marketing-Projekt kopieren kann:

```
RÜCKMELDUNG AN MARKETING-PROJEKT (Website)
Stand: <Datum>
Domain: <z. B. https://bemyguestlodge.co.za>
Technik/Framework: <z. B. Astro / Next.js / WordPress / statisches HTML>
Hosting: <Anbieter>
Code-Repository: <GitHub-URL oder "keins">
Update-Weg für Blogbeiträge: <z. B. Commit in content/blog/... → Auto-Deploy | manuell | CMS-API>
Blog-URLs: DE <…/de/blog/> · EN <…/en/blog/>
RSS-Feeds: <…>
Link-in-Bio-Seite: <URL von /hello oder "geplant">
Events-Seite: <URL oder "nicht umgesetzt">
Buchungslink (BOOKING_URL): <aktueller Link>
Umami: <eingerichtet ja/nein, Website-ID>
Search Console: <verifiziert ja/nein>
Feld "Wie hast du von uns erfahren?": <umgesetzt ja/nein, wo>
Bildordner auf der Website: <z. B. public/images/blog/>
Offene Punkte / Abweichungen: <…>
Geplanter Go-live: <Datum>
```
