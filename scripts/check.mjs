// Checks the built site in dist/: internal links and images exist, JSON-LD is valid JSON,
// every page has a title, description and canonical, feeds and sitemap are well-formed.
//   npm run check        (after npm run build)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "dist");
const problems = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(OUT);
const exists = (p) => fs.existsSync(p) && (fs.statSync(p).isFile() || fs.existsSync(path.join(p, "index.html")));
let links = 0;
for (const f of files.filter((f) => f.endsWith(".html"))) {
  const rel = path.relative(OUT, f), html = fs.readFileSync(f, "utf8");
  const refs = [...html.matchAll(/\s(?:href|src|data-href|data-src|data-src-mobile|poster)="([^"]+)"/g)].map((m) => m[1])
    .concat([...html.matchAll(/\ssrcset="([^"]+)"/g)].flatMap((m) => m[1].split(",").map((s) => s.trim().split(/\s+/)[0])))
    .concat([...html.matchAll(/url\(([^)"']+)\)/g)].map((m) => m[1]));
  for (const r of refs) {
    if (/^(https?:|mailto:|tel:|#|data:|javascript:)/.test(r)) continue;
    links++;
    const target = r.startsWith("/") ? path.join(OUT, r.split(/[?#]/)[0]) : path.resolve(path.dirname(f), r.split(/[?#]/)[0]);
    if (!exists(target)) problems.push(`${rel}: broken link/asset "${r}"`);
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch (e) { problems.push(`${rel}: invalid JSON-LD (${e.message})`); } }
  if (/__[A-Z]+(_[a-z]+)?__|<!--(MAIN|HEAD|ROBOTS|LATEST_POSTS|BLOG_LINKS)-->/.test(html)) problems.push(`${rel}: unreplaced template token`);
  if (rel !== "404.html") {
    if (!/<title>[^<]{5,}<\/title>/.test(html)) problems.push(`${rel}: missing <title>`);
    if (!/<meta name="description" content="[^"]{20,}"/.test(html)) problems.push(`${rel}: missing meta description`);
    if (!/<link rel="canonical"/.test(html)) problems.push(`${rel}: missing canonical`);
    if ((html.match(/<h1[\s>]/g) || []).length > 1) problems.push(`${rel}: more than one <h1>`);
  }
}
for (const f of files.filter((f) => f.endsWith(".xml"))) {
  const x = fs.readFileSync(f, "utf8");
  const open = (x.match(/<(item|url)>/g) || []).length, close = (x.match(/<\/(item|url)>/g) || []).length;
  if (open !== close || !/^<\?xml/.test(x)) problems.push(`${path.relative(OUT, f)}: XML looks malformed`);
}
if (problems.length) { console.error(`✗ ${problems.length} problem(s):\n` + problems.map((p) => "  " + p).join("\n")); process.exit(1); }
console.log(`✓ Check passed: ${files.filter((f) => f.endsWith(".html")).length} pages, ${links} internal links/assets, all present`);
