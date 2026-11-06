// Be My Guest Lodge – prerender the core pages from the single-page source (source/index.html).
//
// Run this only when the core texts/layout in source/index.html change (not needed for blog posts or events):
//   npm install && npx playwright install chromium   (once)
//   npm run prerender
//
// Output (committed to the repo, used by build.mjs):
//   core/<lang>/index.html, core/<lang>/accommodation/…   30 static core pages (6 languages × 5 pages)
//   core/_shell/<lang>.html                               page frame for blog and "What's on" pages
//   core/_data.json                                       texts needed by build.mjs (titles, FAQ, UI strings)
//   public/css/site.css                                   fonts (source/fonts.css) + styles from source/index.html + source/extra.css
//
// Tokens left for build.mjs: __S__ (link suffix), and in the shell __P__ (path prefix), __TITLE__, __DESC__,
// <!--HEAD-->, <!--MAIN-->, __LANG_xx__ (language switch targets).
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "source");
const PUB = path.join(ROOT, "public");
const OUT = path.join(ROOT, "core");
const BASE = require(path.join(ROOT, "site.config.json")).base;
const LANGS = ["en", "de", "af", "fr", "es", "zh"];
const SHELL_LANGS = ["en", "de"];
const HREFLANG = { en: "en", de: "de", af: "af", fr: "fr", es: "es", zh: "zh-Hans" };
const OGLOCALE = { en: "en_ZA", de: "de_DE", af: "af_ZA", fr: "fr_FR", es: "es_ES", zh: "zh_CN" };
const CITY = { en: "Cape Town", de: "Kapstadt", af: "Kaapstad", fr: "Le Cap", es: "Ciudad del Cabo", zh: "开普敦" };
const TYPES = ["comfort-double", "comfort-twin", "family-cottage"];
const PAGES = [
  { kind: "home", path: "", hash: "home", depth: 1 },
  { kind: "acc", path: "accommodation/", hash: "accommodation", depth: 2 },
  ...TYPES.map((id) => ({ kind: "type", id, path: `accommodation/${id}/`, hash: id, depth: 3 })),
];

const strip = (h) => h.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const cut = (t, n = 158) => { t = strip(t); if (t.length <= n) return t; const c = t.slice(0, n); return c.slice(0, c.lastIndexOf(" ")).replace(/[,.;:–-]$/, "") + "…"; };
const abs = (lang, p) => `${BASE}/${lang}/${p}`;
const mkdirp = (p) => fs.mkdirSync(p, { recursive: true });

function meta(D, lang, pg) {
  const t = (k) => (D[lang][k] !== undefined ? D[lang][k] : D.en[k]);
  const brand = "Be My Guest Lodge";
  if (pg.kind === "home") return { title: D.HOME_TITLES[lang], desc: cut(t("intro1")), img: "img/og-image.jpg" };
  if (pg.kind === "acc") return { title: `${strip(t("navAcc"))}: ${strip(t("types")["comfort-double"].n)}, ${strip(t("types")["comfort-twin"].n)}, ${strip(t("types")["family-cottage"].n)} | ${brand}`, desc: cut(t("acc1")), img: "img/rooms/comfort-double-cover.jpg" };
  const L = t("types")[pg.id];
  return { title: `${strip(L.n)} – Bloubergstrand, ${CITY[lang]} | ${brand}`, desc: cut(L.short), img: `img/rooms/${pg.id}-cover.jpg` };
}

function lodging(D, lang) {
  const t = (k) => (D[lang][k] !== undefined ? D[lang][k] : D.en[k]);
  return {
    "@type": "BedAndBreakfast", "@id": `${BASE}/#lodge`, name: "Be My Guest Lodge",
    url: abs(lang, ""), logo: `${BASE}/img/logo.png`, image: [`${BASE}/img/og-image.jpg`, `${BASE}/img/rooms/family-cottage-cover.jpg`, `${BASE}/img/rooms/comfort-double-cover.jpg`],
    description: strip(t("intro1")), telephone: "+27728384490", email: "info@bemyguestlodge.co.za",
    address: { "@type": "PostalAddress", streetAddress: "51 Porterfield Rd", addressLocality: "Bloubergrant, Table View", addressRegion: "Western Cape", postalCode: "7441", addressCountry: "ZA" },
    hasMap: "https://www.google.com/maps/search/?api=1&query=51+Porterfield+Rd%2C+Bloubergrant%2C+Cape+Town%2C+7441",
    checkinTime: "14:00", checkoutTime: "10:00", numberOfRooms: 6, availableLanguage: ["English", "German", "Afrikaans"],
    amenityFeature: ["Free Wi-Fi", "Swimming pool", "Braai (barbecue) area", "Air conditioning", "Free on-site parking", "Laundry service", "Self-catering kitchen (Family Cottage)"].map((n) => ({ "@type": "LocationFeatureSpecification", name: n, value: true })),
    containsPlace: TYPES.map((id) => ({ "@type": "HotelRoom", name: strip(D.en.types[id].n), url: abs("en", `accommodation/${id}/`), occupancy: { "@type": "QuantitativeValue", maxValue: id === "family-cottage" ? 6 : 2 } })),
    potentialAction: { "@type": "ReserveAction", target: "https://book.nightsbridge.com/28083" },
  };
}

function jsonld(D, lang, pg) {
  const t = (k) => (D[lang][k] !== undefined ? D[lang][k] : D.en[k]);
  const url = abs(lang, pg.path);
  const graph = [lodging(D, lang)];
  const crumbs = [{ n: t("home"), u: abs(lang, "") }];
  if (pg.kind === "acc" || pg.kind === "type") crumbs.push({ n: strip(t("navAcc")), u: abs(lang, "accommodation/") });
  if (pg.kind === "type") crumbs.push({ n: strip(t("types")[pg.id].n), u: url });
  if (pg.kind === "home") {
    graph.push({ "@type": "WebSite", "@id": `${BASE}/#website`, url: abs(lang, ""), name: "Be My Guest Lodge", inLanguage: HREFLANG[lang] });
    const F = D[lang].faq;
    if (F) graph.push({ "@type": "FAQPage", mainEntity: F.items.map(([q, a]) => ({ "@type": "Question", name: strip(q), acceptedAnswer: { "@type": "Answer", text: strip(a) } })) });
  } else {
    graph.push({ "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.n, item: c.u })) });
  }
  if (pg.kind === "type") {
    const L = t("types")[pg.id];
    graph.push({ "@type": "HotelRoom", name: strip(L.n), description: strip(L.short), url, image: `${BASE}/img/rooms/${pg.id}-cover.jpg`, containedInPlace: { "@id": `${BASE}/#lodge` },
      occupancy: { "@type": "QuantitativeValue", maxValue: pg.id === "family-cottage" ? 6 : 2 },
      amenityFeature: L.f.map((n) => ({ "@type": "LocationFeatureSpecification", name: strip(n), value: true })) });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

// in-browser transformation shared by core pages and shells
function transform({ lang, pg, P, S, TYPES, m, ld, BASE, HREFLANG, OGLOCALE, LANGS, shell }) {
  const doc = document;
  const linkTo = (l, pth) => P + l + "/" + pth + S;
  if (pg.kind === "home") doc.getElementById("sub").remove(); else { doc.getElementById("top").remove(); doc.getElementById("sub").hidden = false; }
  doc.querySelectorAll("script").forEach((s) => s.remove());
  doc.querySelectorAll("style").forEach((s) => s.remove());
  doc.querySelectorAll('link[href="fonts.css"]').forEach((l) => l.remove()); // fonts are bundled into css/site.css
  doc.querySelectorAll("[data-i18n]").forEach((e) => e.removeAttribute("data-i18n"));
  const hero = doc.getElementById("hero");
  if (hero) {
    hero.className = "hero has-photo";
    const v = doc.getElementById("heroVid");
    v.removeAttribute("src"); v.removeAttribute("autoplay"); v.className = "";
    v.setAttribute("data-src", P + "video/hero.mp4"); v.setAttribute("data-src-mobile", P + "video/hero-mobile.mp4");
    v.setAttribute("poster", P + "video/poster.webp"); v.setAttribute("preload", "none"); v.setAttribute("aria-hidden", "true");
    const snd = doc.getElementById("vidSound"); if (snd) snd.remove();
    doc.getElementById("vidReplay").hidden = true;
    doc.getElementById("heroDots").innerHTML = "";
    doc.querySelectorAll("#heroSlides img").forEach((im, k) => { im.className = k === 0 ? "on" : ""; im.setAttribute("loading", k === 0 ? "eager" : "lazy"); im.setAttribute("width", "1600"); im.setAttribute("height", "1000"); });
  }
  const lb = doc.getElementById("lb"); if (lb) lb.hidden = true;
  // blog teaser cards are filled in by build.mjs from content/blog
  const posts = doc.getElementById("posts");
  if (posts) { posts.innerHTML = "<!--LATEST_POSTS-->"; posts.insertAdjacentHTML("afterend", "<!--BLOG_LINKS-->"); }
  const fix = (u) => u.replace(/^(?:\.\/)?(img|video)\//, P + "$1/").replace(/\.jpg$/, ".webp");
  doc.querySelectorAll("img[src]").forEach((im) => { const s = im.getAttribute("src"); if (/^(img|video)\//.test(s)) im.setAttribute("src", fix(s)); });
  doc.querySelectorAll("[style*='url(']").forEach((e) => e.setAttribute("style", e.getAttribute("style").replace(/url\((?:&quot;|")?(img\/[^)"&]+?)(?:&quot;|")?\)/g, (_, u) => `url(${fix(u)})`)));
  doc.querySelectorAll("link[rel*='icon']").forEach((l) => l.setAttribute("href", P + l.getAttribute("href")));
  const SECTIONS = ["umgebung", "lage", "familie", "erleben", "blog", "bewertungen", "kontakt", "faq", "services", "haus", "zimmer", "willkommen"];
  doc.querySelectorAll("a[href^='#']").forEach((a) => {
    const h = a.getAttribute("href").slice(1);
    let to = null;
    if (h === "") return;
    if (h === "blog" && a.closest("header")) to = linkTo(lang === "de" ? "de" : "en", "blog/"); // menu item "Blog" → blog overview (EN for AF/FR/ES/ZH)
    else if (h === "events") to = linkTo(lang === "de" ? "de" : "en", "events/"); // menu item + floating button "Events" → event calendar
    else if (h === "home" || h === "top") to = linkTo(lang, "");
    else if (h === "accommodation") to = linkTo(lang, "accommodation/");
    else if (TYPES.includes(h)) to = linkTo(lang, `accommodation/${h}/`);
    else if (SECTIONS.includes(h)) to = pg.kind === "home" ? "#" + h : linkTo(lang, "") + "#" + h;
    if (to) a.setAttribute("href", to);
  });
  const sel = doc.getElementById("lang");
  sel.querySelectorAll("option").forEach((o) => {
    o.setAttribute("data-href", shell ? `__LANG_${o.value}__` : linkTo(o.value, pg.path));
    if (o.value === lang) o.setAttribute("selected", ""); else o.removeAttribute("selected");
  });
  doc.documentElement.setAttribute("lang", HREFLANG[lang]);
  const head = doc.head;
  const add = (tag, attrs) => { const e = doc.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); head.appendChild(e); return e; };
  add("link", { rel: "stylesheet", href: P + "css/site.css" });
  if (shell) {
    doc.title = "__TITLE__";
    head.querySelector('meta[name="description"]').setAttribute("content", "__DESC__");
    head.appendChild(doc.createComment("HEAD"));
    doc.getElementById("sub").innerHTML = "<!--MAIN-->";
  } else {
    doc.title = m.title;
    head.querySelector('meta[name="description"]').setAttribute("content", m.desc);
    add("link", { rel: "canonical", href: `${BASE}/${lang}/${pg.path}` });
    LANGS.forEach((l) => add("link", { rel: "alternate", hreflang: HREFLANG[l], href: `${BASE}/${l}/${pg.path}` }));
    add("link", { rel: "alternate", hreflang: "x-default", href: pg.kind === "home" ? `${BASE}/` : `${BASE}/en/${pg.path}` });
    add("meta", { property: "og:type", content: "website" });
    add("meta", { property: "og:site_name", content: "Be My Guest Lodge" });
    add("meta", { property: "og:title", content: m.title });
    add("meta", { property: "og:description", content: m.desc });
    add("meta", { property: "og:url", content: `${BASE}/${lang}/${pg.path}` });
    add("meta", { property: "og:image", content: `${BASE}/${m.img}` });
    add("meta", { property: "og:locale", content: OGLOCALE[lang] });
    add("meta", { name: "twitter:card", content: "summary_large_image" });
    head.appendChild(doc.createComment("ROBOTS"));
    head.appendChild(doc.createComment("HEAD"));
    const j = doc.createElement("script"); j.type = "application/ld+json"; j.textContent = JSON.stringify(ld); head.appendChild(j);
  }
  const s = doc.createElement("script"); s.src = P + "js/site.js"; s.defer = true; head.appendChild(s);
  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}

(async () => {
  // local server: the source page plus images (served from the WebP files in public/)
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    let f = u === "/" || u === "/index.html" ? path.join(SRC, "index.html") : path.join(PUB, u);
    if (!fs.existsSync(f) && f.endsWith(".jpg")) f = f.replace(/\.jpg$/, ".webp");
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; }
      const ext = path.extname(f); r.writeHead(200, { "Content-Type": { ".html": "text/html; charset=utf-8", ".jpg": "image/jpeg", ".webp": "image/webp", ".png": "image/png", ".mp4": "video/mp4" }[ext] || "application/octet-stream" }); r.end(d); });
  }).listen(8833);

  fs.rmSync(OUT, { recursive: true, force: true }); mkdirp(path.join(OUT, "_shell"));
  const b = await chromium.launch();
  let D = null;
  const open = async (lang, hash) => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    await ctx.addInitScript((l) => { try { localStorage.setItem("bmg-lang", l); localStorage.removeItem("bmg-draft-hidden"); } catch (e) {} }, lang);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => console.error(lang, hash, e.message));
    await p.goto(`http://localhost:8833/index.html#${hash}`, { waitUntil: "load" });
    await p.waitForTimeout(1200);
    if (!D) {
      D = await p.evaluate(() => { const o = JSON.parse(JSON.stringify(DICT)); o.HOME_TITLES = HOME_TITLES; return o; });
      const css = await p.evaluate(() => Array.from(document.querySelectorAll("style")).map((s) => s.textContent).join("\n"));
      const extra = fs.readFileSync(path.join(SRC, "extra.css"), "utf8");
      mkdirp(path.join(PUB, "css"));
      const fonts = fs.readFileSync(path.join(SRC, "fonts.css"), "utf8");
      fs.writeFileSync(path.join(PUB, "css/site.css"), fonts + "\n" + css.trim() + "\n\n/* ---- blog, events (source/extra.css) ---- */\n" + extra);
    }
    return { ctx, p };
  };
  const common = { S: "__S__", TYPES, BASE, HREFLANG, OGLOCALE, LANGS };
  for (const lang of LANGS) {
    for (const pg of PAGES) {
      const { ctx, p } = await open(lang, pg.hash);
      const m = meta(D, lang, pg);
      const html = await p.evaluate(transform, { ...common, lang, pg, P: "../".repeat(pg.depth), m, ld: jsonld(D, lang, pg), shell: false });
      const dir = path.join(OUT, lang, pg.path); mkdirp(dir);
      fs.writeFileSync(path.join(dir, "index.html"), html);
      await ctx.close();
    }
  }
  // page frame for generated pages (blog, what's on): rendered from the accommodation page, content replaced
  for (const lang of SHELL_LANGS) {
    const { ctx, p } = await open(lang, "accommodation");
    const html = await p.evaluate(transform, { ...common, lang, pg: { kind: "shell", path: "" }, P: "__P__", m: null, ld: null, shell: true });
    fs.writeFileSync(path.join(OUT, "_shell", `${lang}.html`), html);
    await ctx.close();
  }
  await b.close(); srv.close();

  // texts used by build.mjs
  const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
  const UI = ["home", "readMore", "backBlog", "blogEyebrow", "blogH2", "blogLede", "heroCta1", "heroCta2", "waText", "navBook", "photo"];
  const data = {
    HOME_TITLES: D.HOME_TITLES,
    ui: Object.fromEntries(LANGS.map((l) => [l, { ...pick(D.en, UI), ...pick(D[l], UI) }])),
    en: { intro1: strip(D.en.intro1), types: Object.fromEntries(TYPES.map((id) => [id, { n: strip(D.en.types[id].n), short: strip(D.en.types[id].short) }])), faq: D.en.faq.items.map(([q, a]) => [strip(q), strip(a)]) },
    lodging: lodging(D, "en"),
  };
  fs.writeFileSync(path.join(OUT, "_data.json"), JSON.stringify(data, null, 1));
  console.log("core pages:", LANGS.length * PAGES.length, "+ shells:", SHELL_LANGS.join(", "));
})();
