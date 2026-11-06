/* Lokální náhled webu včetně /api/concerts bez Netlify CLI.
   Spuštění z kořene repa:  node tools/dev-server.mjs   →  http://localhost:8080
   - statické soubory z kořene repa (hezké URL jako na Netlify: /pro-mesta → pro-mesta.html)
   - /api/concerts obsluhuje stejná funkce jako v produkci (netlify/functions/concerts.mjs)
   - env: načte se .env z kořene (gitignored); bez něj běží CONCERTS_SOURCE=fixtures + CONCERTS_ENABLED=true
     (fixtures = tests/fixtures/google-events.json; v produkci tento režim neexistuje)
   - servíruje se jen allowlist: *.html v kořeni, robots.txt, sitemap.xml a složky assets/, css/, js/ */
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHandler } from "../netlify/functions/concerts.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 8080);

async function loadDotEnv() {
  try {
    const txt = await readFile(path.join(ROOT, ".env"), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      if (!line.trim() || line.trim().startsWith("#")) continue;
      const m = /^\s*([A-Z0-9_]+)\s*=(.*)$/.exec(line);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"') && v.length >= 2) || (v.startsWith("'") && v.endsWith("'") && v.length >= 2)) v = v.slice(1, -1);
      else v = v.replace(/\s+#.*$/, "").trim(); // inline komentář jen u hodnot bez uvozovek
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
    console.log("[dev] .env načten (GOOGLE_PRIVATE_KEY musí být na jednom řádku, zalomení jako \\n)");
  } catch (_) {
    console.log("[dev] .env nenalezen → fixtures");
  }
  if (!process.env.CONCERTS_SOURCE && !process.env.GOOGLE_CALENDAR_ID) process.env.CONCERTS_SOURCE = "fixtures";
  if (!process.env.CONCERTS_ENABLED) process.env.CONCERTS_ENABLED = "true";
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".pdf": "application/pdf",
};
const ALLOWED_DIRS = new Set(["assets", "css", "js"]);

/** URL cesta → absolutní soubor v allowlistu, nebo null. */
function resolveStatic(urlPath) {
  if (/[\\\0:]/.test(urlPath)) return null;
  let p = urlPath;
  if (p.endsWith("/")) p += "index.html";
  const abs = path.resolve(ROOT, "." + p);
  const rel = path.relative(ROOT, abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  const parts = rel.split(path.sep);
  const ext = path.extname(abs).toLowerCase();
  if (parts.length === 1) {
    if (ext === ".html" || /^(robots\.txt|sitemap\.xml)$/i.test(parts[0])) return abs;
    if (!ext) return abs + ".html"; // hezké URL: /pro-mesta → pro-mesta.html
    return null;
  }
  if (ALLOWED_DIRS.has(parts[0].toLowerCase()) && MIME[ext]) return abs;
  return null;
}

async function send404(res) {
  try {
    const data = await readFile(path.join(ROOT, "404.html"));
    res.writeHead(404, { "Content-Type": MIME[".html"] });
    res.end(data);
  } catch (_) { res.writeHead(404); res.end("404"); }
}

await loadDotEnv();
const concerts = createHandler({
  env: process.env,
  fetch: globalThis.fetch,
  loadFixtures: async () => JSON.parse(await readFile(path.join(ROOT, "tests", "fixtures", "google-events.json"), "utf8")),
});

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost:" + PORT);
    if (url.pathname === "/api/concerts") {
      const r = await concerts(new Request(url, { method: req.method }));
      const headers = {};
      r.headers.forEach((v, k) => { headers[k] = v; });
      res.writeHead(r.status, headers);
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    let decoded;
    try { decoded = decodeURIComponent(url.pathname); } catch (_) { res.writeHead(400); res.end("400"); return; }
    const file = resolveStatic(decoded);
    if (!file) return send404(res);
    try {
      const st = await stat(file);
      if (st.isDirectory()) { res.writeHead(301, { Location: encodeURI(decoded) + "/" }); return res.end(); }
      const data = await readFile(file);
      res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(data);
    } catch (_) { send404(res); }
  } catch (_) {
    res.writeHead(500); res.end("500");
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log("[dev] http://localhost:" + PORT + "  (CONCERTS_SOURCE=" + (process.env.CONCERTS_SOURCE || "google") + ")");
});
