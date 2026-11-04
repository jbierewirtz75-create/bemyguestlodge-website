// Be My Guest Lodge – build the complete static website into dist/
//
//   npm run build            live build (only approved posts with a date up to today)
//   npm run build:preview    preview build (drafts and future posts visible, marked, noindex)
//
// Inputs:  core/ (prerendered core pages, see tools/prerender.cjs), public/ (images, video, css, js),
//          content/blog/{en,de}/*.md, content/blog/images/, content/events/events.json, site.config.json
// Environment: SHOW_DRAFTS=1 (preview), LINK_SUFFIX=index.html (for file-based previews), BUILD_DATE=YYYY-MM-DD
//   Netlify deploy previews (CONTEXT=deploy-preview) and Cloudflare Pages branch builds (CF_PAGES_BRANCH≠main)
//   are detected automatically as previews.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { Marked } from "marked";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "core/_data.json"), "utf8"));
const BASE = CFG.base.replace(/\/$/, "");
const OUT = path.join(ROOT, "dist");
const CONTENT = path.join(ROOT, "content");
const S = process.env.LINK_SUFFIX || "";
const env = process.env;
const PREVIEW = !!(env.SHOW_DRAFTS || env.CONTEXT === "deploy-preview" || env.CONTEXT === "branch-deploy" || (env.CF_PAGES_BRANCH && env.CF_PAGES_BRANCH !== "main"));
const TODAY = env.BUILD_DATE || new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());

const LANGS = ["en", "de", "af", "fr", "es", "zh"];
const BLOG_LANGS = ["en", "de"];
const HREFLANG = { en: "en", de: "de", af: "af", fr: "fr", es: "es", zh: "zh-Hans" };
const OGLOCALE = { en: "en_ZA", de: "de_DE" };
const CORE_PAGES = ["", "accommodation/", "accommodation/comfort-double/", "accommodation/comfort-twin/", "accommodation/family-cottage/"];
const TAGS = {
  kitesurfing: ["Kitesurfing", "Kitesurfen"], beaches: ["Beaches", "Strände"], "table-mountain": ["Table Mountain", "Tafelberg"],
  "day-trips": ["Day trips", "Ausflüge"], "west-coast": ["West Coast", "Westküste"], wine: ["Wine", "Wein"], family: ["Family", "Familie"],
  food: ["Food", "Essen & Trinken"], events: ["Events", "Veranstaltungen"], seasons: ["Seasons", "Jahreszeiten"], nature: ["Nature", "Natur"],
  "lodge-news": ["Lodge news", "Neues aus der Lodge"],
};
Object.assign(TAGS, { "cape-town": ["Cape Town", "Kapstadt"], bloubergstrand: ["Bloubergstrand", "Bloubergstrand"], "table-view": ["Table View", "Table View"], "king-of-the-air": ["King of the Air", "King of the Air"],
  business: ["Business", "Business"], pets: ["Pets", "Mit Haustier"], groups: ["Groups", "Gruppen"] });
// German or variant tag names are mapped to one language-independent tag, so EN and DE posts share the same filters
const TAG_ALIASES = { kitesurfen: "kitesurfing", kiten: "kitesurfing", strand: "beaches", straende: "beaches", strände: "beaches", beach: "beaches", tafelberg: "table-mountain",
  ausfluege: "day-trips", ausflüge: "day-trips", ausflug: "day-trips", westkueste: "west-coast", westküste: "west-coast", wein: "wine", familie: "family", essen: "food",
  veranstaltungen: "events", haustiere: "pets", "mit-haustier": "pets", gruppen: "groups", geschaeftsreise: "business", event: "events", jahreszeiten: "seasons", natur: "nature", kapstadt: "cape-town", "lodge-neuigkeiten": "lodge-news", blouberg: "bloubergstrand" };
const tagLabel = (t, lang) => (TAGS[t] ? TAGS[t][lang === "de" ? 1 : 0] : t.split("-").map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w)).join(" "));
const T = {
  en: { book: "Book direct", walk: (n) => `${n} min walk from the lodge`, all: "All", allPosts: "All articles →", whatsOn: "What's on in Cape Town →", whatsOnH1: "What's on in Cape Town & Blouberg", whatsOnTitle: "What's on: events in Cape Town & Bloubergstrand",
    whatsOnLede: "Events, festivals and sport near Be My Guest Lodge in Table View, Bloubergstrand. Planning a visit? Book your stay directly with us.", whatsOnDesc: "Upcoming events, festivals and sport in Cape Town, Table View and Bloubergstrand, close to Be My Guest Lodge.",
    noEvents: "No events listed right now. Ask us on WhatsApp what's on during your stay.", more: "More info", read: (n) => `${n} min read`, ctaH: "Stay with us in Bloubergstrand",
    ctaP: "Book directly with Jan & Leona, or ask us anything on WhatsApp.", blogTitle: "Blog: stories and tips from Cape Town & Bloubergstrand", draft: "Draft", future: "Scheduled",
    preview: "Preview – not live. Drafts and scheduled posts are visible here only.", rss: "RSS feed", locale: "en-GB" },
  de: { book: "Jetzt direkt buchen", walk: (n) => `${n} Min. zu Fuß von der Lodge`, all: "Alle", allPosts: "Alle Artikel →", whatsOn: "Veranstaltungen in Kapstadt →", whatsOnH1: "Veranstaltungen in Kapstadt & Blouberg", whatsOnTitle: "Veranstaltungen in Kapstadt & Bloubergstrand",
    whatsOnLede: "Events, Festivals und Sport rund um die Be My Guest Lodge in Table View, Bloubergstrand. Du planst einen Besuch? Buch deinen Aufenthalt direkt bei uns.", whatsOnDesc: "Aktuelle Veranstaltungen, Festivals und Sport in Kapstadt, Table View und Bloubergstrand, nahe der Be My Guest Lodge.",
    noEvents: "Gerade sind keine Termine eingetragen. Frag uns per WhatsApp, was während deines Aufenthalts los ist.", more: "Mehr Infos", read: (n) => `${n} Min. Lesezeit`, ctaH: "Übernachte bei uns in Bloubergstrand",
    ctaP: "Buch direkt bei Jan & Leona oder frag uns per WhatsApp.", blogTitle: "Blog: Geschichten und Tipps aus Kapstadt & Bloubergstrand", draft: "Entwurf", future: "Geplant",
    preview: "Vorschau – nicht live. Entwürfe und geplante Beiträge sind nur hier sichtbar.", rss: "RSS-Feed", locale: "de-DE" },
};
const HOME_LINKS = {
  en: ["All articles →", "What's on in Cape Town →"], de: ["Alle Artikel →", "Veranstaltungen in Kapstadt →"], af: ["Alle artikels (Engels) →", "Wat gebeur in Kaapstad (Engels) →"],
  fr: ["Tous les articles (en anglais) →", "Agenda au Cap (en anglais) →"], es: ["Todos los artículos (en inglés) →", "Agenda en Ciudad del Cabo (en inglés) →"], zh: ["全部文章（英文）→", "开普敦活动（英文）→"],
};

const SRCQ = {
  q: { en: "How did you hear about us?", de: "Wie hast du von uns erfahren?", af: "Hoe het julle van ons gehoor?", fr: "Comment nous avez-vous connus ?", es: "¿Cómo nos conociste?", zh: "您是如何了解到我们的？" },
  opt: { en: "optional", de: "optional", af: "opsioneel", fr: "facultatif", es: "opcional", zh: "可选" },
  thanks: { en: "Thank you!", de: "Danke!", af: "Dankie!", fr: "Merci !", es: "¡Gracias!", zh: "谢谢！" },
  answers: [
    ["google", { en: "Google" }], ["instagram", { en: "Instagram" }], ["facebook", { en: "Facebook" }], ["tiktok", { en: "TikTok" }],
    ["portal", { en: "Booking.com, Airbnb or another portal", de: "Booking.com, Airbnb oder anderes Portal", af: "Booking.com, Airbnb of 'n ander portaal", fr: "Booking.com, Airbnb ou autre plateforme", es: "Booking.com, Airbnb u otro portal", zh: "Booking.com、Airbnb 或其他平台" }],
    ["friends", { en: "Recommendation from friends", de: "Empfehlung von Freunden", af: "Aanbeveling van vriende", fr: "Recommandation d'amis", es: "Recomendación de amigos", zh: "朋友推荐" }],
    ["partner", { en: "Partner (kite school, agent …)", de: "Partner (Kite-Schule, Makler …)", af: "Vennoot (kiteskool, agent …)", fr: "Partenaire (école de kite, agence …)", es: "Socio (escuela de kite, agencia …)", zh: "合作伙伴（风筝冲浪学校、中介等）" }],
    ["returning", { en: "We've stayed here before", de: "Ich war schon mal hier", af: "Ons was al voorheen hier", fr: "Nous sommes déjà venus", es: "Ya hemos estado aquí", zh: "以前入住过" }],
    ["other", { en: "Other", de: "Sonstiges", af: "Ander", fr: "Autre", es: "Otro", zh: "其他" }],
  ],
};
const sourceQuestion = (lang) => `<label class="srcq"><span>${esc(SRCQ.q[lang])} <small>(${SRCQ.opt[lang]})</small></span><select data-srcq><option value="">–</option>${SRCQ.answers.map(([k, L]) => `<option value="${k}">${esc(L[lang] || L.en)}</option>`).join("")}</select><span class="srcq-thanks" hidden>✓ ${SRCQ.thanks[lang]}</span></label>`;

const errors = [], warnings = [];
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const strip = (h) => String(h).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const mkdirp = (p) => fs.mkdirSync(p, { recursive: true });
const write = (rel, s) => { const f = path.join(OUT, rel); mkdirp(path.dirname(f)); fs.writeFileSync(f, s); };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const copyDir = (a, b) => { mkdirp(b); for (const f of fs.readdirSync(a)) { const s = path.join(a, f), d = path.join(b, f); fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d); } };
const abs = (lang, p) => `${BASE}/${lang}/${p}`;
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + "T00:00:00Z"));
const dstr = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? "" : String(v).trim());
const fmtDate = (d, lang) => new Date(d + "T12:00:00Z").toLocaleDateString(T[lang].locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const wa = (lang) => `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(strip(DATA.ui[lang].waText))}`;

/* image references: "images/x.jpg" → content/blog/images/x.jpg, "/images/blog/x.jpg" → public/images/blog/x.jpg */
const imgPath = (ref) => (ref.startsWith("/") ? path.join(ROOT, "public", ref) : path.join(CONTENT, "blog", ref));
const imgShow = (ref) => (ref.startsWith("/") ? `public${ref}` : `content/blog/${ref}`);

/* ---------------- posts: read and validate ---------------- */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const posts = [];
for (const lang of BLOG_LANGS) {
  const dir = path.join(CONTENT, "blog", lang);
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const rel = `content/blog/${lang}/${file}`;
    const err = (m) => errors.push(`${rel}: ${m}`);
    let fm, body;
    try { ({ data: fm, content: body } = matter(fs.readFileSync(path.join(dir, file), "utf8"))); } catch (e) { err(`frontmatter cannot be read (${e.message.split("\n")[0]})`); continue; }
    const p = {
      file: rel, title: String(fm.title || "").trim(), slug: String(fm.slug || "").trim(), lang: String(fm.lang || "").trim(),
      translation_of: String(fm.translation_of || "").trim(), date: dstr(fm.date), description: String(fm.description || "").trim(),
      tags: Array.isArray(fm.tags) ? [...new Set(fm.tags.map((t) => { t = String(t).trim().toLowerCase(); return TAG_ALIASES[t] || t; }))] : [], hero_image: String(fm.hero_image || "").trim(), hero_alt: String(fm.hero_alt || "").trim(),
      status: String(fm.status || "").trim(), body,
    };
    for (const k of ["title", "slug", "lang", "date", "description", "hero_image", "hero_alt", "status"]) if (!p[k]) err(`required field "${k}" is missing or empty`);
    if (p.slug && !SLUG.test(p.slug)) err(`slug "${p.slug}" may only contain lowercase letters, digits and single hyphens`);
    const base = file.replace(/\.md$/, "");
    if (p.slug && base !== p.slug && base !== `${p.date}-${p.slug}`) err(`file name must be "${p.slug}.md" or "${p.date}-${p.slug}.md"`);
    if (p.lang && p.lang !== lang) err(`lang "${p.lang}" does not match the folder "${lang}"`);
    if (p.date && !isDate(p.date)) err(`date "${p.date}" must be YYYY-MM-DD`);
    if (p.status && !["draft", "approved"].includes(p.status)) err(`status must be "draft" or "approved"`);
    if (p.description.length > 160) err(`description has ${p.description.length} characters (max. 160)`);
    if (!p.tags.length) err(`at least one tag is required`);
    for (const t of p.tags) if (!SLUG.test(t)) err(`tag "${t}" may only contain lowercase letters, digits and hyphens`);
    if (p.hero_image && !fs.existsSync(imgPath(p.hero_image))) err(`hero_image "${p.hero_image}" not found (${imgShow(p.hero_image)})`);
    if (/^#\s/m.test(body)) err(`no level-1 headings (# …) in the text – the title is the H1; use ## for sections`);
    if (p.title.length > 90) warnings.push(`${rel}: title is long (${p.title.length} characters)`);
    posts.push(p);
  }
}
for (const lang of BLOG_LANGS) {
  const seen = new Set();
  for (const p of posts.filter((x) => x.lang === lang)) { if (seen.has(p.slug)) errors.push(`${p.file}: slug "${p.slug}" is used twice`); seen.add(p.slug); }
}
for (const p of posts.filter((x) => x.translation_of)) {
  const other = p.lang === "en" ? "de" : "en";
  if (!posts.some((x) => x.lang === other && x.slug === p.translation_of)) warnings.push(`${p.file}: translation_of "${p.translation_of}" – no ${other.toUpperCase()} post with this slug yet (language switch links to the blog overview until it exists)`);
}

/* ---------------- events: read and validate ---------------- */
let events = [];
const evFile = path.join(CONTENT, "events/events.json");
if (fs.existsSync(evFile)) {
  try { events = JSON.parse(fs.readFileSync(evFile, "utf8")); if (!Array.isArray(events)) throw new Error("must be a list [ … ]"); }
  catch (e) { errors.push(`content/events/events.json: ${e.message}`); events = []; }
  events.forEach((e, i) => {
    const err = (m) => errors.push(`content/events/events.json, entry ${i + 1}: ${m}`);
    e.date = dstr(e.start || e.date); e.end_date = dstr(e.end || e.end_date); e.title_en = e.title_en || e.title_de;
    if (!e.title_en) err(`required field "title_en" (or "title_de") is missing`);
    if (!e.date) err(`required field "start" is missing`);
    if (!e.location) err(`required field "location" is missing`);
    if (e.date && !isDate(e.date)) err(`start "${e.date}" must be YYYY-MM-DD`);
    if (e.end_date && !isDate(e.end_date)) err(`end "${e.end_date}" must be YYYY-MM-DD`);
    if (e.walk_min != null && e.walk_min !== "" && !(Number(e.walk_min) > 0)) err(`walk_min must be a number of minutes`);
    if (e.url && !/^https?:\/\//.test(e.url)) err(`url must start with https://`);
    if (e.image && !fs.existsSync(imgPath(e.image))) err(`image "${e.image}" not found (${imgShow(e.image)})`);
  });
}

if (errors.length) {
  console.error(`\nBUILD STOPPED – please fix ${errors.length} problem(s):\n` + errors.map((e) => "  ✗ " + e).join("\n") + "\n");
  process.exit(1);
}
warnings.forEach((w) => console.warn("  ! " + w));

/* ---------------- which posts are published ---------------- */
const live = (p) => p.status === "approved" && p.date <= TODAY;
const published = posts.filter((p) => PREVIEW || live(p)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
const byLang = (lang) => published.filter((p) => p.lang === lang);
const counterpart = (p) => published.find((x) => x.lang !== p.lang && ((p.translation_of && x.slug === p.translation_of) || x.translation_of === p.slug)) || null;
const upcoming = events.filter((e) => (e.end_date || e.date) >= TODAY).sort((a, b) => a.date.localeCompare(b.date));

/* ---------------- output: static files ---------------- */
fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(ROOT, "public"), OUT);

/* ---------------- images (resized WebP + JPG for social previews) ---------------- */
const imgCache = new Map();
async function image(rel) {
  if (imgCache.has(rel)) return imgCache.get(rel);
  const src = imgPath(rel);
  const name = path.basename(rel).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  if (fs.statSync(src).size > 5 * 1024 * 1024) warnings.push(`${imgShow(rel)}: larger than 5 MB`);
  mkdirp(path.join(OUT, "img/blog"));
  const meta = await sharp(src).rotate().metadata();
  const w0 = meta.autoOrient ? meta.autoOrient.width : meta.width, h0 = meta.autoOrient ? meta.autoOrient.height : meta.height;
  if (w0 < 1200) warnings.push(`${imgShow(rel)}: only ${w0}px wide (recommended: at least 1600px)`);
  const out = { w: {}, ratio: h0 / w0 };
  for (const w of [800, 1600]) {
    const ww = Math.min(w, w0);
    await sharp(src).rotate().resize({ width: ww }).webp({ quality: 78 }).toFile(path.join(OUT, `img/blog/${name}-${w}.webp`));
    out.w[w] = { src: `img/blog/${name}-${w}.webp`, width: ww, height: Math.round(ww * out.ratio) };
  }
  await sharp(src).rotate().resize({ width: 1200, height: 630, fit: "cover" }).jpeg({ quality: 82 }).toFile(path.join(OUT, `img/blog/${name}-og.jpg`));
  out.og = `img/blog/${name}-og.jpg`;
  imgCache.set(rel, out);
  return out;
}
const imgTag = (im, P, alt, cls, sizes, eager) =>
  `<img class="${cls}" src="${P}${im.w[1600].src}" srcset="${P}${im.w[800].src} ${im.w[800].width}w, ${P}${im.w[1600].src} ${im.w[1600].width}w" sizes="${sizes}" width="${im.w[1600].width}" height="${im.w[1600].height}" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;

/* ---------------- markdown ---------------- */
async function renderBody(p, P) {
  const refs = [...p.body.matchAll(/!\[[^\]]*\]\(((?:\/images\/|images\/)[^)\s]+)/g)].map((m) => m[1]);
  for (const r of refs) { if (!fs.existsSync(imgPath(r))) { errors.push(`${p.file}: image "${r}" not found`); continue; } await image(r); }
  const md = new Marked({ gfm: true });
  md.use({ renderer: {
    image({ href, title, text }) {
      const im = imgCache.get(href);
      if (!im) return `<img src="${esc(href)}" alt="${esc(text)}" loading="lazy">`;
      return imgTag(im, P, text, "", "(max-width: 800px) 100vw, 760px", false);
    },
    link({ href, title, tokens }) {
      const txt = this.parser.parseInline(tokens);
      const ext = /^https?:\/\//.test(href) && !href.startsWith(BASE);
      return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ""}${ext ? ' target="_blank" rel="noopener"' : ""}>${txt}</a>`;
    },
    html({ text }) { return ""; }, // raw HTML from content files is not allowed
  } });
  // placeholder **[Jetzt direkt buchen →]** / **[Book direct →]** → booking button
  const body = p.body.replace(/\*\*\[\s*(Jetzt direkt buchen|Direkt buchen|Book direct)\s*→?\s*\]\*\*/g, "@@BOOK@@");
  return md.parse(body)
    .replace(/<p>@@BOOK@@<\/p>/g, `<p class="art-book">${bookBtn(p.lang, "blog-inline")}</p>`)
    .replace(/@@BOOK@@/g, bookBtn(p.lang, "blog-inline"));
}
const readMin = (p) => Math.max(1, Math.ceil(p.body.split(/\s+/).filter(Boolean).length / 200));

/* ---------------- page frame ---------------- */
const SHELL = Object.fromEntries(BLOG_LANGS.map((l) => [l, read(`core/_shell/${l}.html`)]));
const robots = (noindex) => `<meta name="robots" content="${PREVIEW || noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large"}">`;
const previewBar = (lang) => (PREVIEW ? `<div class="preview-bar">${esc(T[lang].preview)}</div>` : "");
function page({ lang, depth, title, desc, head, main, langTargets }) {
  const P = "../".repeat(depth);
  const rep = (h, a, b) => h.split(a).join(b); // no special "$" handling, unlike String.replace
  let h = SHELL[lang];
  h = rep(h, "__TITLE__", esc(title)); h = rep(h, "__DESC__", esc(desc));
  h = rep(h, "<!--HEAD-->", robots(false) + "\n" + head); h = rep(h, "<!--MAIN-->", previewBar(lang) + main);
  for (const l of LANGS) h = rep(h, `__LANG_${l}__`, langTargets[l]);
  return rep(rep(h, "__P__", P), "__S__", S);
}
const langTargetsFor = (P, enPath, dePath) => Object.fromEntries(LANGS.map((l) => [l, l === "en" ? P + "en/" + enPath + S : l === "de" ? P + "de/" + dePath + S : P + l + "/" + S]));
const alternates = (pairs, xdef) => pairs.map(([l, u]) => `<link rel="alternate" hreflang="${HREFLANG[l]}" href="${u}">`).join("\n") + (xdef ? `\n<link rel="alternate" hreflang="x-default" href="${xdef}">` : "");
const og = ({ type, title, desc, url, img, lang }) => [
  ["og:type", type], ["og:site_name", "Be My Guest Lodge"], ["og:title", title], ["og:description", desc], ["og:url", url], ["og:image", img], ["og:locale", OGLOCALE[lang]],
].map(([k, v]) => `<meta property="${k}" content="${esc(v)}">`).join("\n") + `\n<meta name="twitter:card" content="summary_large_image">`;
const ld = (graph) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>`;
const crumbsHtml = (items) => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([n, u], i) => (i < items.length - 1 ? `<a href="${u}">${esc(n)}</a><span aria-hidden="true">/</span>` : `<span aria-current="page">${esc(n)}</span>`)).join("")}</nav>`;
const crumbsLd = (items) => ({ "@type": "BreadcrumbList", itemListElement: items.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: u })) });
const rssLinks = (P) => BLOG_LANGS.map((l) => `<link rel="alternate" type="application/rss+xml" hreflang="${l}" title="Be My Guest Lodge Blog (${l.toUpperCase()})" href="${BASE}/${l}/blog/rss.xml">`).join("\n");
const bookBtn = (lang, pos) => `<a class="btn btn-book" href="${esc(CFG.book)}" data-umami-event="book_click" data-umami-event-position="${pos}">${T[lang].book}</a>`;
const bookBar = (lang, pos) => `<div style="display:flex;gap:12px;flex-wrap:wrap">${bookBtn(lang, pos)}<a class="btn btn-ghost" href="${wa(lang)}" target="_blank" rel="noopener">${DATA.ui[lang].heroCta2}</a></div>`;
const badge = (p, lang) => (p.status !== "approved" ? `<span class="badge-draft">${T[lang].draft}</span>` : p.date > TODAY ? `<span class="badge-draft">${T[lang].future} ${p.date}</span>` : "");

/* ---------------- post cards ---------------- */
async function card(p, P, feature, uiLang) {
  const im = await image(p.hero_image);
  const lang = p.lang;
  const attr = uiLang !== lang ? ` lang="${HREFLANG[lang]}"` : "";
  return `<a class="post${feature ? " feature" : ""}" href="${P}${lang}/blog/${p.slug}/${S}" data-tags="${p.tags.join(" ")}"${attr}>${imgTag(im, P, p.hero_alt, "art", feature ? "(max-width: 900px) 100vw, 640px" : "(max-width: 900px) 100vw, 420px", false)}<div class="txt"><span class="kicker">${esc(tagLabel(p.tags[0], lang))}</span>${badge(p, lang)}<h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><span class="read">${T[lang].read(readMin(p))} · ${DATA.ui[lang].readMore}</span></div></a>`;
}

const sitemap = [];
const lodgeRef = { "@id": `${BASE}/#lodge` };

/* ---------------- blog posts ---------------- */
for (const p of published) {
  const lang = p.lang, P = "../../../", other = counterpart(p);
  const url = abs(lang, `blog/${p.slug}/`);
  const im = await image(p.hero_image);
  const html = await renderBody(p, P);
  const items = [[DATA.ui[lang].home, `${P}${lang}/${S}`], ["Blog", `${P}${lang}/blog/${S}`], [p.title, url]];
  const enUrl = lang === "en" ? url : other ? other && abs("en", `blog/${other.slug}/`) : null;
  const pairs = [[lang, url]]; if (other) pairs.push([other.lang, abs(other.lang, `blog/${other.slug}/`)]);
  const main = `<div class="wrap">${crumbsHtml(items)}
<article class="article">
<p class="eyebrow">${esc(p.tags.map((t) => tagLabel(t, lang)).slice(0, 2).join(" · "))} · ${T[lang].read(readMin(p))}</p>${badge(p, lang)}
<h1>${esc(p.title)}</h1>
<p class="lede">${esc(p.description)}</p>
<p class="art-meta"><time datetime="${p.date}">${fmtDate(p.date, lang)}</time> · Jan &amp; Leona, Be My Guest Lodge</p>
${imgTag(im, P, p.hero_alt, "art-hero", "(max-width: 800px) 100vw, 760px", true)}
<div class="art-body">${html}</div>
<ul class="tags">${p.tags.map((t) => `<li><a href="${P}${lang}/blog/${S}#${t}">${esc(tagLabel(t, lang))}</a></li>`).join("")}</ul>
<aside class="art-cta"><h2>${T[lang].ctaH}</h2><p>${T[lang].ctaP}</p>${bookBar(lang, "blog-footer")}</aside>
<div class="art-foot"><a href="${P}${lang}/blog/${S}" style="font-weight:700">${DATA.ui[lang].backBlog}</a><a href="${P}${lang}/events/${S}" style="font-weight:700">${T[lang].whatsOn}</a></div>
</article></div>`;
  const head = [`<link rel="canonical" href="${url}">`, alternates(pairs, enUrl), og({ type: "article", title: p.title, desc: p.description, url, img: `${BASE}/${im.og}`, lang }),
    `<meta property="article:published_time" content="${p.date}">`, rssLinks(P),
    ld([crumbsLd(items.map(([n, u], i) => [n, i === 0 ? abs(lang, "") : i === 1 ? abs(lang, "blog/") : url])),
      { "@type": "BlogPosting", headline: p.title, description: p.description, inLanguage: HREFLANG[lang], url, mainEntityOfPage: url, image: [`${BASE}/${im.og}`, `${BASE}/${im.w[1600].src}`],
        datePublished: p.date, dateModified: p.date, keywords: p.tags.map((t) => tagLabel(t, "en")).join(", "),
        author: { "@type": "Person", name: "Jan & Leona", worksFor: lodgeRef }, publisher: { "@type": "Organization", name: "Be My Guest Lodge", url: BASE, logo: `${BASE}/img/logo.png` },
        about: lodgeRef }])].join("\n");
  const targets = langTargetsFor(P, lang === "en" ? `blog/${p.slug}/` : other ? `blog/${other.slug}/` : "blog/", lang === "de" ? `blog/${p.slug}/` : other ? `blog/${other.slug}/` : "blog/");
  write(`${lang}/blog/${p.slug}/index.html`, page({ lang, depth: 3, title: `${p.title} | Be My Guest Lodge`, desc: p.description, head, main, langTargets: targets }));
  if (live(p)) sitemap.push({ loc: url, lastmod: p.date, alts: pairs, xdef: enUrl });
}

/* ---------------- blog index ---------------- */
for (const lang of BLOG_LANGS) {
  const P = "../../", list = byLang(lang), url = abs(lang, "blog/");
  const freq = {}; list.forEach((p) => p.tags.forEach((t) => (freq[t] = (freq[t] || 0) + 1)));
  let used = Object.keys(freq).sort((a, b) => freq[b] - freq[a] || a.localeCompare(b));
  used = used.slice(0, 10); // the 10 most used tags
  const cards = (await Promise.all(list.map((p) => card(p, P, false, lang)))).join("");
  const items = [[DATA.ui[lang].home, `${P}${lang}/${S}`], ["Blog", url]];
  const main = `<div class="wrap">${crumbsHtml(items)}
<div class="sub-head"><p class="eyebrow">${DATA.ui[lang].blogEyebrow}</p><h1>${DATA.ui[lang].blogH2}</h1><p class="lede">${DATA.ui[lang].blogLede}</p></div>
${used.length > 1 ? `<div class="filters" id="tagFilters" role="group"><button type="button" aria-pressed="true" data-tag="all">${T[lang].all}</button>${used.map((t) => `<button type="button" aria-pressed="false" data-tag="${t}">${esc(tagLabel(t, lang))}</button>`).join("")}</div>` : ""}
<div class="blog-list">${cards}</div>
<p class="blog-links"><a href="${P}${lang}/events/${S}">${T[lang].whatsOn}</a><a href="${BASE}/${lang}/blog/rss.xml">${T[lang].rss}</a></p>
<div style="margin-top:40px">${bookBar(lang, "blog-index")}</div></div>`;
  const pairs = BLOG_LANGS.map((l) => [l, abs(l, "blog/")]);
  const head = [`<link rel="canonical" href="${url}">`, alternates(pairs, abs("en", "blog/")), og({ type: "website", title: T[lang].blogTitle, desc: strip(DATA.ui[lang].blogLede), url, img: `${BASE}/img/og-image.jpg`, lang }), rssLinks(P),
    ld([crumbsLd([[DATA.ui[lang].home, abs(lang, "")], ["Blog", url]]),
      { "@type": "Blog", name: T[lang].blogTitle, url, inLanguage: HREFLANG[lang], publisher: lodgeRef,
        blogPost: list.filter(live).map((p) => ({ "@type": "BlogPosting", headline: p.title, url: abs(lang, `blog/${p.slug}/`), datePublished: p.date })) }])].join("\n");
  write(`${lang}/blog/index.html`, page({ lang, depth: 2, title: `${T[lang].blogTitle} | Be My Guest Lodge`, desc: strip(DATA.ui[lang].blogLede).slice(0, 160), head, main, langTargets: langTargetsFor(P, "blog/", "blog/") }));
  sitemap.push({ loc: url, lastmod: list.filter(live)[0]?.date, alts: pairs, xdef: abs("en", "blog/") });
}

/* ---------------- what's on ---------------- */
for (const lang of BLOG_LANGS) {
  const P = "../../", url = abs(lang, "events/");
  const evs = await Promise.all(upcoming.map(async (e) => {
    const d = new Date(e.date + "T12:00:00Z");
    const day = d.toLocaleDateString(T[lang].locale, { day: "numeric", timeZone: "UTC" });
    const mon = d.toLocaleDateString(T[lang].locale, { month: "short", timeZone: "UTC" });
    const range = e.end_date && e.end_date !== e.date ? `${fmtDate(e.date, lang)} – ${fmtDate(e.end_date, lang)}` : fmtDate(e.date, lang);
    const title = (lang === "de" && e.title_de) || e.title_en, desc = (lang === "de" && e.description_de) || e.description_en || "";
    const im = e.image ? await image(e.image) : null;
    return `<li class="event"><time class="when" datetime="${e.date}"><b>${day}</b><span>${esc(mon)}</span></time><div><h2>${esc(title)}</h2><p class="where">${esc(range)} · ${esc(e.location)}${Number(e.walk_min) > 0 ? ` · ${T[lang].walk(Number(e.walk_min))}` : ""}</p>${desc ? `<p>${esc(desc)}</p>` : ""}${e.url ? `<p><a href="${esc(e.url)}" target="_blank" rel="noopener">${T[lang].more} →</a></p>` : ""}${im ? imgTag(im, P, title, "", "420px", false) : ""}</div></li>`;
  }));
  const items = [[DATA.ui[lang].home, `${P}${lang}/${S}`], [strip(T[lang].whatsOnH1), url]];
  const main = `<div class="wrap">${crumbsHtml(items)}
<div class="sub-head"><p class="eyebrow">What's on</p><h1>${esc(T[lang].whatsOnH1)}</h1><p class="lede">${esc(T[lang].whatsOnLede)}</p></div>
${evs.length ? `<ol class="events">${evs.join("")}</ol>` : `<p class="empty">${esc(T[lang].noEvents)}</p>`}
<p class="blog-links"><a href="${P}${lang}/blog/${S}">${T[lang].allPosts}</a></p>
<div style="margin-top:40px">${bookBar(lang, "events-page")}</div></div>`;
  const pairs = BLOG_LANGS.map((l) => [l, abs(l, "events/")]);
  const evLd = upcoming.map((e) => ({ "@type": "Event", name: (lang === "de" && e.title_de) || e.title_en, startDate: e.date, ...(e.end_date ? { endDate: e.end_date } : {}),
    eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: e.location, address: e.location }, ...(e.url ? { url: e.url } : {}),
    ...(((lang === "de" && e.description_de) || e.description_en) ? { description: (lang === "de" && e.description_de) || e.description_en } : {}) }));
  const head = [`<link rel="canonical" href="${url}">`, alternates(pairs, abs("en", "events/")), og({ type: "website", title: T[lang].whatsOnTitle, desc: T[lang].whatsOnDesc, url, img: `${BASE}/img/og-image.jpg`, lang }),
    ld([crumbsLd([[DATA.ui[lang].home, abs(lang, "")], [T[lang].whatsOnH1, url]]), ...evLd])].join("\n");
  write(`${lang}/events/index.html`, page({ lang, depth: 2, title: `${T[lang].whatsOnTitle} | Be My Guest Lodge`, desc: T[lang].whatsOnDesc, head, main, langTargets: langTargetsFor(P, "events/", "events/") }));
  sitemap.push({ loc: url, alts: pairs, xdef: abs("en", "events/") });
}

/* ---------------- legal pages (content/legal/{en,de}/*.md) ---------------- */
const LEGAL_LABELS = { en: ["Legal notice", "Privacy policy"], de: ["Impressum", "Datenschutz"], af: ["Wetlike kennisgewing", "Privaatheidsbeleid"],
  fr: ["Mentions légales", "Confidentialité"], es: ["Aviso legal", "Privacidad"], zh: ["法律声明", "隐私政策"] };
const legalPages = [];
for (const lang of BLOG_LANGS) {
  const dir = path.join(CONTENT, "legal", lang);
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const { data, content } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
    legalPages.push({ lang, slug: String(data.slug), pair: String(data.pair), title: String(data.title), description: String(data.description || ""), body: content, file: `content/legal/${lang}/${file}` });
  }
}
const legalPath = (lang, pair) => { const p = legalPages.find((x) => x.lang === lang && x.pair === pair) || legalPages.find((x) => x.lang === "en" && x.pair === pair); return p ? `${p.lang}/${p.slug}/` : null; };
for (const lp of legalPages) {
  const lang = lp.lang, P = "../../", url = abs(lang, `${lp.slug}/`);
  const todos = [...lp.body.matchAll(/\{\{TODO:([^}]*)\}\}/g)].map((m) => m[1].trim());
  if (todos.length) warnings.push(`${lp.file}: ${todos.length} open item(s) – ${todos.join("; ")}`);
  const body = new Marked({ gfm: true, breaks: true }).parse(lp.body.replace(/\{\{TODO:([^}]*)\}\}/g, (m, t) => `<mark>[${t.trim()}]</mark>`));
  const other = legalPages.find((x) => x.pair === lp.pair && x.lang !== lang);
  const pairs = [[lang, url]]; if (other) pairs.push([other.lang, abs(other.lang, `${other.slug}/`)]);
  const items = [[DATA.ui[lang].home, `${P}${lang}/${S}`], [lp.title, url]];
  const bodyS = body.replace(/href="(\.\.\/[^"#]*\/)"/g, (m, u) => `href="${u}${S}"`);
  const main = `<div class="wrap">${crumbsHtml(items)}<article class="article legal"><h1>${esc(lp.title)}</h1><div class="art-body">${bodyS}</div></article></div>`;
  const head = [`<link rel="canonical" href="${url}">`, alternates(pairs, other ? abs("en", `${(lang === "en" ? lp : other).slug}/`) : null), ld([crumbsLd([[DATA.ui[lang].home, abs(lang, "")], [lp.title, url]])])].join("\n");
  const enPath = lang === "en" ? `${lp.slug}/` : other ? `${other.slug}/` : "", dePath = lang === "de" ? `${lp.slug}/` : other ? `${other.slug}/` : "";
  write(`${lang}/${lp.slug}/index.html`, page({ lang, depth: 2, title: `${lp.title} | Be My Guest Lodge (Pty) Ltd`, desc: lp.description, head, main, langTargets: langTargetsFor(P, enPath, dePath) }));
  sitemap.push({ loc: url, alts: pairs, xdef: other ? abs("en", `${(lang === "en" ? lp : other).slug}/`) : null });
}

/* ---------------- core pages (with latest posts on the home page) ---------------- */
for (const lang of LANGS) {
  for (const pth of CORE_PAGES) {
    let h = read(`core/${lang}/${pth}index.html`);
    const depth = 1 + pth.split("/").filter(Boolean).length, P = "../".repeat(depth);
    if (pth === "") {
      const bl = BLOG_LANGS.includes(lang) && byLang(lang).length ? lang : "en";
      const latest = byLang(bl).slice(0, 3);
      const cards = (await Promise.all(latest.map((p, i) => card(p, P, i === 0, lang)))).join("");
      h = h.replace("<!--LATEST_POSTS-->", () => cards)
        .replace("<!--BLOG_LINKS-->", () => `<p class="blog-links"><a href="${P}${bl}/blog/${S}"${bl !== lang ? ' hreflang="en"' : ""}>${HOME_LINKS[lang][0]}</a><a href="${P}${bl}/events/${S}"${bl !== lang ? ' hreflang="en"' : ""}>${HOME_LINKS[lang][1]}</a></p>`);
    }
    h = h.replace("<!--SOURCE_QUESTION-->", () => sourceQuestion(lang));
    h = h.replace("<!--ROBOTS-->", robots(false)).replace("<!--HEAD-->", BLOG_LANGS.includes(lang) && pth === "" ? rssLinks(P) : "").replace(/__S__/g, S);
    if (PREVIEW) h = h.replace(/(<body[^>]*>)/, `$1<div class="preview-bar">${esc((T[lang] || T.en).preview)}</div>`);
    write(`${lang}/${pth}index.html`, h);
    sitemap.push({ loc: abs(lang, pth), alts: LANGS.map((l) => [l, abs(l, pth)]), xdef: pth === "" ? `${BASE}/` : abs("en", pth) });
  }
}

/* ---------------- link-in-bio page /hello/ ---------------- */
{
  const P = "../";
  const H = {
    en: { book: "Book direct", wa: "WhatsApp us", latest: "Latest from our blog", events: "What's on in Blouberg →", site: "Visit our website →",
      tiles: [["Rooms", "5 comfort rooms, each with private entrance", `${P}en/accommodation/${S}`], ["Family Cottage", "Up to 6 guests · own kitchen", `${P}en/accommodation/family-cottage/${S}`],
        ["Whole lodge", "Exclusive for groups of up to 16", `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent("Hello Be My Guest Lodge, we would like to book the whole lodge for a group.")}`]] },
    de: { book: "Direkt buchen", wa: "WhatsApp schreiben", latest: "Neu im Blog", events: "Was ist los in Blouberg →", site: "Zur Website →",
      tiles: [["Zimmer", "5 Comfort-Zimmer mit eigenem Eingang", `${P}de/accommodation/${S}`], ["Family Cottage", "Bis 6 Personen · eigene Küche", `${P}de/accommodation/family-cottage/${S}`],
        ["Ganze Lodge", "Exklusiv für Gruppen bis 16 Personen", `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent("Hallo Be My Guest Lodge, wir möchten die ganze Lodge für eine Gruppe buchen.")}`]] },
  };
  const IMG = ["img/rooms/comfort-double-cover.webp", "img/rooms/family-cottage-cover.webp", "img/house/1.webp"];
  const block = async (lang) => {
    const L = H[lang];
    const posts = await Promise.all(byLang(lang).slice(0, 3).map(async (p) => { const im = await image(p.hero_image);
      return `<a class="hp" href="${P}${lang}/blog/${p.slug}/${S}"><img src="${P}${im.w[800].src}" width="${im.w[800].width}" height="${im.w[800].height}" alt="${esc(p.hero_alt)}" loading="lazy"><span><b>${esc(p.title)}</b><small>${T[lang].read(readMin(p))}</small></span></a>`; }));
    return `<section data-l="${lang}" lang="${lang}"${lang === "de" ? " hidden" : ""}>
<a class="b book" href="${esc(CFG.book)}" data-umami-event="book_click" data-umami-event-position="hello-top">${L.book}</a>
<a class="b wa" href="${wa(lang)}" target="_blank" rel="noopener">${L.wa}</a>
<div class="tiles">${L.tiles.map(([t, d, u], i) => `<a class="tile" href="${u}"${u.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}><img src="${P}${IMG[i]}" alt="" loading="lazy"><span><b>${t}</b><small>${d}</small></span></a>`).join("")}</div>
${posts.length ? `<h2>${L.latest}</h2><div class="posts">${posts.join("")}</div>` : ""}
<a class="b ghost" href="${P}${lang}/events/${S}">${L.events}</a>
<a class="b ghost" href="${P}${lang}/${S}">${L.site}</a>
${sourceQuestion(lang)}
</section>`;
  };
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Be My Guest Lodge – Home away from home | Bloubergstrand, Cape Town</title>
<meta name="description" content="Book direct, chat on WhatsApp and discover our rooms, the Family Cottage and tips from Bloubergstrand – Be My Guest Lodge, Table View, Cape Town.">
${robots(false)}
<link rel="canonical" href="${BASE}/hello/">
<link rel="icon" type="image/png" href="${P}img/favicon.png">
<meta property="og:title" content="Be My Guest Lodge – Home away from home"><meta property="og:image" content="${BASE}/img/og-image.jpg"><meta property="og:url" content="${BASE}/hello/">
<style>
*{box-sizing:border-box;margin:0}body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#F3F5F2;color:#15303C;line-height:1.4}
main{max-width:480px;margin:0 auto;padding:22px 18px 40px;display:grid;gap:14px}
.top{display:flex;align-items:center;gap:12px}.top img{border-radius:50%}.top h1{font:600 1.35rem Georgia,serif}.top p{color:#5b6b72;font-size:.95rem}
.sw{margin-left:auto;display:flex;border:1px solid #cfd8d6;border-radius:999px;overflow:hidden}.sw button{border:0;background:none;padding:6px 11px;font:600 .8rem system-ui;color:#15303C;cursor:pointer}.sw button[aria-pressed=true]{background:#15303C;color:#fff}
section{display:grid;gap:12px}section[hidden]{display:none}
.b{display:block;text-align:center;padding:15px;border-radius:14px;font-weight:700;text-decoration:none;font-size:1.05rem}
.book{background:#C23F64;color:#fff;font-size:1.2rem;padding:18px}.wa{background:#1F8F55;color:#fff}.ghost{border:1.5px solid #15303C;color:#15303C}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.tile{position:relative;border-radius:12px;overflow:hidden;aspect-ratio:3/4;color:#fff;text-decoration:none;background:#3D6A80}
.tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.tile span{position:absolute;inset:auto 0 0;padding:8px;background:linear-gradient(transparent,rgba(0,0,0,.75));display:grid}
.tile b{font-size:.9rem}.tile small{font-size:.7rem;opacity:.9}
h2{font:600 1.05rem Georgia,serif;margin-top:6px}.posts{display:grid;gap:8px}
.hp{display:flex;gap:10px;align-items:center;background:#fff;border:1px solid #dde4e2;border-radius:12px;overflow:hidden;color:inherit;text-decoration:none}
.hp img{width:88px;height:66px;object-fit:cover;flex:none}.hp span{display:grid;padding:6px 8px 6px 0}.hp b{font-size:.92rem}.hp small{color:#5b6b72}
.srcq{display:grid;gap:6px;font-size:.85rem;color:#5b6b72;margin-top:6px}.srcq select{font:inherit;padding:9px;border-radius:10px;border:1px solid #cfd8d6;background:#fff;color:#15303C}
footer{text-align:center;color:#5b6b72;font-size:.8rem;margin-top:10px}footer a{color:inherit}
</style>
<script defer src="${P}js/site.js"></script>
</head><body><main>
<div class="top"><img src="${P}img/logo-180.png" width="56" height="56" alt="Be My Guest Lodge Logo"><div><h1>Be My Guest Lodge</h1><p>Home away from home</p></div>
<div class="sw" role="group" aria-label="Language"><button type="button" data-sw="en" aria-pressed="true">EN</button><button type="button" data-sw="de" aria-pressed="false">DE</button></div></div>
${await block("en")}
${await block("de")}
<footer>Be My Guest Lodge (Pty) Ltd · 51 Porterfield Rd, Bloubergrant, Table View, Cape Town · <a href="mailto:${CFG.email}">${CFG.email}</a><br><!--LEGAL_LINKS--></footer>
</main>
<script>(function(){var q=new URLSearchParams(location.search).get("lang"),l=q||((navigator.language||"").slice(0,2)==="de"?"de":"en");
function set(x){document.querySelectorAll("section[data-l]").forEach(function(s){s.hidden=s.getAttribute("data-l")!==x});document.documentElement.lang=x;
document.querySelectorAll("[data-sw]").forEach(function(b){b.setAttribute("aria-pressed",b.getAttribute("data-sw")===x)})}
document.querySelectorAll("[data-sw]").forEach(function(b){b.addEventListener("click",function(){set(b.getAttribute("data-sw"))})});set(l==="de"?"de":"en");})();</script>
</body></html>
`;
  write("hello/index.html", PREVIEW ? html.replace("<main>", `<main><div style="background:#C23F64;color:#fff;padding:6px;border-radius:8px;text-align:center;font-size:.8rem">${T.en.preview}</div>`) : html);
  sitemap.push({ loc: `${BASE}/hello/`, alts: [] });
}

/* ---------------- RSS feeds ---------------- */
const cdata = (s) => `<![CDATA[${String(s).replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
for (const lang of BLOG_LANGS) {
  const list = byLang(lang).filter((p) => PREVIEW || live(p)).slice(0, 20);
  let items = "";
  for (const p of list) {
    const url = abs(lang, `blog/${p.slug}/`), im = await image(p.hero_image);
    const body = (await renderBody(p, `${BASE}/`)).replace(/(href|src)="(?!https?:|mailto:|#)([^"]+)"/g, (m, a, u) => `${a}="${new URL(u, url).href}"`);
    items += `<item>
<title>${esc(p.title)}</title>
<link>${url}</link>
<guid isPermaLink="true">${url}</guid>
<pubDate>${new Date(p.date + "T08:00:00+02:00").toUTCString()}</pubDate>
<description>${esc(p.description)}</description>
${p.tags.map((t) => `<category>${esc(tagLabel(t, lang))}</category>`).join("")}
<media:content url="${BASE}/${im.og}" medium="image" type="image/jpeg" width="1200" height="630"><media:description>${esc(p.hero_alt)}</media:description></media:content>
<content:encoded>${cdata(`<p><img src="${BASE}/${im.w[1600].src}" alt="${esc(p.hero_alt)}"></p>` + body)}</content:encoded>
</item>
`;
  }
  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>${esc(T[lang].blogTitle)} – Be My Guest Lodge</title>
<link>${abs(lang, "blog/")}</link>
<atom:link href="${abs(lang, "blog/rss.xml")}" rel="self" type="application/rss+xml"/>
<description>${esc(strip(DATA.ui[lang].blogLede))}</description>
<language>${lang === "de" ? "de-DE" : "en-ZA"}</language>
<image><url>${BASE}/img/logo-180.png</url><title>Be My Guest Lodge</title><link>${abs(lang, "")}</link></image>
${list[0] ? `<lastBuildDate>${new Date(list[0].date + "T08:00:00+02:00").toUTCString()}</lastBuildDate>` : ""}
${items}</channel>
</rss>
`;
  write(`${lang}/blog/rss.xml`, feed); write(`${lang}/blog/feed.xml`, feed);
}

/* ---------------- sitemap ---------------- */
let sm = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
for (const u of sitemap) {
  sm += `  <url>\n    <loc>${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ""}`;
  if (u.alts.length > 1) { for (const [l, h] of u.alts) sm += `    <xhtml:link rel="alternate" hreflang="${HREFLANG[l]}" href="${h}"/>\n`; if (u.xdef) sm += `    <xhtml:link rel="alternate" hreflang="x-default" href="${u.xdef}"/>\n`; }
  sm += `  </url>\n`;
}
write("sitemap.xml", sm + `</urlset>\n`);

/* ---------------- robots.txt ---------------- */
write("robots.txt", PREVIEW ? `# Preview build – not for search engines\nUser-agent: *\nDisallow: /\n` : `# Be My Guest Lodge – all search engines and AI assistants are welcome
User-agent: *
Allow: /

# AI crawlers (explicitly allowed so assistants like ChatGPT, Claude, Gemini and Perplexity can read the site)
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: PerplexityBot
User-agent: Google-Extended
User-agent: Applebot-Extended
Allow: /

Sitemap: ${BASE}/sitemap.xml
`);

/* ---------------- llms.txt ---------------- */
const NAMES = { en: "English", de: "Deutsch", af: "Afrikaans", fr: "Français", es: "Español", zh: "中文" };
const E = DATA.en;
write("llms.txt", `# Be My Guest Lodge

> Family-run guesthouse (B&B and self-catering) in Bloubergrant, Table View, part of Bloubergstrand on Cape Town's Atlantic coast, South Africa. Hosted on site by Jan & Leona. Up to 16 guests in five comfort rooms and a two-storey Family Cottage, with pool, garden and two braais. Minutes from the beach, Kite Beach and Big Bay, with classic views of Table Mountain across Table Bay.

## Key facts
- Address: 51 Porterfield Rd, Bloubergrant, Table View, Cape Town, 7441, South Africa
- Booking (direct): ${CFG.book}
- WhatsApp: +27 72 838 4490 · Email: ${CFG.email}
- Check-in 14:00–19:00, check-out until 10:00; late check-in on request
- Distances: beach approx. 5 min walk; Kite Beach a good 10 min walk (3–4 min by car); by car: V&A Waterfront and CTICC approx. 25 min, Durbanville wine estates approx. 25 min, Cape Town International Airport approx. 20 min
- Whole lodge (up to 16 guests) can be booked exclusively for groups; tailored rates for longer stays on request
- Pets welcome in the Family Cottage (more than one pet on request)
- B&B (with breakfast) or self-catering
- In every room: private bathroom, private entrance and patio, air conditioning (cooling and heating), ceiling fan, free Wi-Fi, flat-screen TV with DStv, mini fridge, microwave, tea and coffee
- Shared: swimming pool, garden, two braais (barbecues), secure off-street parking
- Services: taxi service, laundry, baby cot and high chair on request, day-trip planning, whale watching and shark cage diving bookings
- Languages spoken: English, German, Afrikaans
- Ideal for: families, kitesurfers, couples, business travellers

## Accommodation
${Object.entries(E.types).map(([id, x]) => `- [${x.n}](${BASE}/en/accommodation/${id}/): ${x.short}`).join("\n")}

## Guides (blog)
${byLang("en").filter(live).map((p) => `- [${p.title}](${abs("en", `blog/${p.slug}/`)}): ${p.description}`).join("\n")}
- All articles: ${BASE}/en/blog/ · RSS: ${BASE}/en/blog/rss.xml
- Events near the lodge: ${BASE}/en/events/
- Quick links (book, WhatsApp, rooms, latest posts): ${BASE}/hello/

## FAQ
${E.faq.map(([q, a]) => `- **${q}** ${a}`).join("\n")}

## Other languages
${LANGS.filter((l) => l !== "en").map((l) => `- ${NAMES[l]}: ${BASE}/${l}/`).join("\n")}
`);

/* ---------------- root (language redirect), 404, hosting files ---------------- */
const H = DATA.HOME_TITLES;
write("index.html", `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(H.en)}</title>
<meta name="description" content="${esc(E.intro1.slice(0, E.intro1.lastIndexOf(" ", 157)) + "…")}">
${robots(false)}
<link rel="canonical" href="${BASE}/">
${LANGS.map((l) => `<link rel="alternate" hreflang="${HREFLANG[l]}" href="${BASE}/${l}/">`).join("\n")}
<link rel="alternate" hreflang="x-default" href="${BASE}/">
<link rel="icon" type="image/png" href="img/favicon.png">
<script>(function(){var L=${JSON.stringify(LANGS)},l="en";try{var s=localStorage.getItem("bmg-lang");if(L.indexOf(s)>-1)l=s;else{var n=(navigator.language||"").slice(0,2);if(L.indexOf(n)>-1)l=n;}}catch(e){}location.replace(l+"/${S}");})();</script>
<style>body{font-family:system-ui,sans-serif;background:#F3F5F2;color:#15303C;display:grid;place-items:center;min-height:100vh;margin:0}a{color:#3D6A80;margin:0 8px}</style>
</head><body><main><p><img src="img/logo-180.png" width="90" height="90" alt="Be My Guest Lodge Logo"></p><h1>Be My Guest Lodge</h1><p>${LANGS.map((l) => `<a href="${l}/${S}" hreflang="${HREFLANG[l]}">${NAMES[l]}</a>`).join(" ")}</p></main></body></html>
`);
write("404.html", `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found | Be My Guest Lodge</title><meta name="robots" content="noindex"><style>body{font-family:system-ui,sans-serif;background:#F3F5F2;color:#15303C;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center}a{color:#C23F64;font-weight:700}</style></head><body><main><h1>Page not found</h1><p>Sorry, this page does not exist (anymore).</p><p><a href="/">Back to Be My Guest Lodge</a></p></main></body></html>\n`);
// Netlify / Cloudflare Pages: headers and redirects (Apache: see .htaccess in public/)
write("_headers", `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
/img/*
  Cache-Control: public, max-age=604800
/video/*
  Cache-Control: public, max-age=604800
/css/*
  Cache-Control: public, max-age=86400
/js/*
  Cache-Control: public, max-age=86400
`);
if (fs.existsSync(path.join(ROOT, "redirects.txt"))) fs.copyFileSync(path.join(ROOT, "redirects.txt"), path.join(OUT, "_redirects"));

/* ---------------- final pass: booking link, click tracking, Umami ---------------- */
{
  const BOOK = esc(CFG.book);
  const walkHtml = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkHtml(path.join(d, e.name)) : e.name.endsWith(".html") ? [path.join(d, e.name)] : []));
  for (const f of walkHtml(OUT)) {
    const rel = path.relative(OUT, f).split(path.sep).join("/");
    const pos = rel.startsWith("hello/") ? "hello-top" : /\/blog\/[^/]+\/index\.html$/.test(rel) ? "blog-footer" : /\/blog\/index\.html$/.test(rel) ? "blog-index"
      : /\/events\//.test(rel) ? "events-page" : /\/accommodation\//.test(rel) ? "room-page" : "home";
    let html = fs.readFileSync(f, "utf8").replace(/https:\/\/book\.nightsbridge\.com\/28083(?:\?[^"\s<]*)?/g, BOOK);
    const seg = rel.split("/")[0], lang = LANGS.includes(seg) ? seg : "en", P = "../".repeat(rel.split("/").length - 1);
    html = html.replace("<!--LEGAL_LINKS-->", () => ["legal", "privacy"].map((pair, i) => { const lp = legalPath(lang, pair); return lp ? `<a href="${P}${lp}${S}"${lp.startsWith(lang + "/") ? "" : ' hreflang="en"'}>${LEGAL_LABELS[lang][i]}</a>` : ""; }).filter(Boolean).join(" · "));
    const headerEnd = html.indexOf("</header>");
    html = html.replace(/<a\b[^>]*>/g, (tag, offset) => {
      const href = (tag.match(/\shref="([^"]*)"/) || [])[1] || "";
      let t = tag;
      const add = (ev, extra = "") => { if (!/data-umami-event=/.test(t)) t = t.replace(/^<a\b/, `<a data-umami-event="${ev}"${extra}`); };
      if (href === BOOK) { t = t.replace(/\s(?:target="_blank"|rel="noopener")/g, ""); add("book_click", ` data-umami-event-position="${headerEnd > -1 && offset < headerEnd ? "header" : pos}"`); }
      else if (href.startsWith("https://wa.me/")) add("whatsapp_click");
      else if (href.startsWith("mailto:")) add("email_click");
      else if (href.startsWith("tel:")) add("phone_click");
      return t;
    });
    if (CFG.umamiWebsiteId) html = html.replace("</head>", `<script defer src="https://cloud.umami.is/script.js" data-website-id="${esc(CFG.umamiWebsiteId)}" data-domains="${new URL(BASE).hostname},www.${new URL(BASE).hostname}"></script>\n</head>`);
    fs.writeFileSync(f, html);
  }
}

if (errors.length) { console.error(`\nBUILD STOPPED:\n` + errors.map((e) => "  ✗ " + e).join("\n")); process.exit(1); }
warnings.forEach((w) => console.warn("  ! " + w));
const count = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : e.name.endsWith(".html") ? 1 : 0), 0);
console.log(`✓ Build ${PREVIEW ? "(PREVIEW: drafts visible, noindex)" : "(live)"} ${TODAY}: ${count(OUT)} HTML pages, ${published.length} posts (${byLang("en").length} EN / ${byLang("de").length} DE), ${upcoming.length} upcoming events → dist/`);
