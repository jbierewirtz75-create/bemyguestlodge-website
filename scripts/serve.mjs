// Local preview of dist/ at http://localhost:8080  (npm run serve)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const OUT = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "dist");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".mp4": "video/mp4", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8" };
const port = Number(process.env.PORT) || 8080;
http.createServer((q, r) => {
  let f = path.join(OUT, decodeURIComponent(q.url.split("?")[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  const ok = f.startsWith(OUT) && fs.existsSync(f);
  r.writeHead(ok ? 200 : 404, { "Content-Type": TYPES[path.extname(ok ? f : ".html")] || "application/octet-stream" });
  fs.createReadStream(ok ? f : path.join(OUT, "404.html")).pipe(r);
}).listen(port, () => console.log(`Preview: http://localhost:${port}/en/`));
