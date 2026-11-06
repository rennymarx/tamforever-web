/* GET /api/concerts — veřejný program koncertů z Google Kalendáře „TAM koncerty“.
   Netlify Function bez závislostí. Google se volá až při cache miss; snapshot = CDN cache Netlify
   (5 min čerstvé + 2 min stale-while-revalidate → změna v kalendáři je na webu do ~7 min).
   Při výpadku Googlu instance drží poslední dobrá data max 30 min, pak 503 → sekce se skryje.
   Prohlížeč nikdy nevolá Google. Ven jde jen DTO z netlify/lib/project.mjs. */
import { createGoogleClient } from "../lib/google.mjs";
import { projectEvents } from "../lib/project.mjs";
import { window as timeWindow, TIME_ZONE } from "../lib/time.mjs";

export const config = { path: "/api/concerts" };

const STALE_MAX_MS = 30 * 60 * 1000; // 30 min „poslední dobrá data“ při výpadku zdroje

// Jediný zdroj těchto hlaviček – netlify.toml [[headers]] se na odpovědi funkcí NEaplikuje.
const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Robots-Tag": "noindex",
  "X-Content-Type-Options": "nosniff",
  // Klíč CDN cache závisí jen na parametru "__none" (nikdo ho nepoužívá) → každý query string
  // (?v=1, ?x=…) sdílí JEDNU cache položku. Bez toho by šel endpoint obcházet a volat Google donekonečna.
  "Netlify-Vary": "query=__none",
};
const CACHE_OK = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Netlify-CDN-Cache-Control": "public, durable, s-maxage=300, stale-while-revalidate=120",
};
const CACHE_NONE = { "Cache-Control": "no-store", "Netlify-CDN-Cache-Control": "no-store" };
// 503 krátce cachovat, ať při výpadku každý návštěvník nespouští funkci (frontend sekci skryje tak jako tak)
const CACHE_ERROR = { "Cache-Control": "no-store", "Netlify-CDN-Cache-Control": "public, s-maxage=60" };

function json(status, body, extra) {
  return new Response(JSON.stringify(body), { status: status, headers: Object.assign({}, BASE_HEADERS, extra) });
}

/** Testovatelná továrna: vše (env, fetch, čas, log, zdroj fixtures) se injektuje. */
export function createHandler(deps) {
  var env = deps.env;
  var now = deps.now || Date.now;
  var log = deps.log || console;
  var loadFixtures = deps.loadFixtures || null; // jen tools/dev-server.mjs; produkční export ho nepředává
  var client = null;
  var lastGood = null; // { body, at } – poslední úspěšná odpověď v této instanci

  async function loadItems() {
    if (env.CONCERTS_SOURCE === "fixtures") {
      if (!loadFixtures) throw Object.assign(new Error("config"), { code: "config" });
      var fx = await loadFixtures();
      return { items: Array.isArray(fx) ? fx : fx.items, pages: 1 };
    }
    if (!client) client = createGoogleClient({ env: env, fetch: deps.fetch, now: now, limits: deps.limits });
    var w = timeWindow(new Date(now()));
    return client.listEvents({ timeMin: w.from, timeMax: w.to });
  }

  return async function handler(req) {
    if (env.CONCERTS_ENABLED !== "true") return json(404, { status: "disabled" }, CACHE_NONE);
    if (req.method !== "GET" && req.method !== "HEAD") {
      return json(405, { status: "method_not_allowed" }, Object.assign({ Allow: "GET, HEAD" }, CACHE_NONE));
    }
    var t0 = now();
    try {
      var loaded = await loadItems();
      var projected = projectEvents(loaded.items);
      var w = timeWindow(new Date(now()));
      var body = {
        version: 1,
        status: "ok",
        generatedAt: new Date(now()).toISOString(),
        timeZone: TIME_ZONE,
        window: w,
        concerts: projected.concerts,
      };
      lastGood = { body: body, at: now() };
      log.log("concerts ok pages=" + loaded.pages + " fetched=" + loaded.items.length +
        " published=" + projected.concerts.length + " ms=" + (now() - t0));
      return json(200, body, CACHE_OK);
    } catch (e) {
      var code = e && typeof e.code === "string" ? e.code.replace(/[^a-z0-9_]/gi, "").slice(0, 40) : "unknown";
      log.error("concerts error code=" + code + " ms=" + (now() - t0)); // nikdy e.message / stack / calendarId
      if (lastGood) {
        var remainS = Math.floor((STALE_MAX_MS - (now() - lastGood.at)) / 1000);
        if (remainS > 0) {
          return json(200, lastGood.body, {
            "X-Concerts-Stale": "1",
            "Cache-Control": "no-store",
            "Netlify-CDN-Cache-Control": "public, s-maxage=" + Math.min(30, remainS),
          });
        }
      }
      return json(503, { status: "unavailable" }, CACHE_ERROR);
    }
  };
}

export default createHandler({ env: process.env, fetch: globalThis.fetch });
