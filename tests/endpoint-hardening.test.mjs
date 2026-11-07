/* Odolnost endpointu: obcházení cache query stringem, neúplné stránkování, 401 → obnova tokenu,
   limit stránek, chybějící items, deadline, HEAD, osobní kalendář, produkční export bez fixtures. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { createHandler } from "../netlify/functions/concerts.mjs";
import { DTO_KEYS } from "../netlify/lib/project.mjs";

const CAL_ID = "canarycalendar_k3j9@group.calendar.google.com";
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const ENV = {
  CONCERTS_ENABLED: "true",
  GOOGLE_CALENDAR_ID: CAL_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: "reader@canary-project.iam.gserviceaccount.com",
  GOOGLE_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }),
};
const NL = String.fromCharCode(10);
const clock = Date.parse("2026-11-06T12:00:00Z");
const now = () => clock;

function ev(id, start) {
  return {
    id, status: "confirmed", summary: "Město – " + id, organizer: { self: true, email: "CANARY_ORGANIZER_q9z@example.com" },
    description: "Honorář" + NL + "CANARY_INTERNAL_m3k",
    start: { dateTime: start }, end: { dateTime: start.replace("T20", "T22") },
    attendees: [{ email: "CANARY_ATTENDEE_x7q@example.com" }], htmlLink: "https://calendar.google.com/CANARY_LINK_h4r",
  };
}
const A = ev("a", "2027-06-01T20:00:00+02:00"), B = ev("b", "2027-06-08T20:00:00+02:00");
const json = (status, body, headers) => new Response(JSON.stringify(body), { status, headers: Object.assign({ "Content-Type": "application/json" }, headers) });

/** Falešný Google řízený frontou odpovědí pro events.list; token endpoint vždy OK. */
function google(script) {
  const calls = [];
  let i = 0;
  const fetch = async (url, init) => {
    const u = String(url);
    calls.push({ url: u, auth: init && init.headers && init.headers.Authorization });
    if (u.startsWith("https://oauth2.googleapis.com/token")) return json(200, { access_token: "tok_" + calls.length, expires_in: 3600 });
    const step = script[Math.min(i++, script.length - 1)];
    if (typeof step === "function") return step(u, init);
    return json(step.status || 200, step.body === undefined ? {} : step.body);
  };
  return { fetch, calls, events: () => calls.filter((c) => c.url.includes("/calendar/v3/")), tokens: () => calls.filter((c) => c.url.includes("oauth2")) };
}
const capture = () => { const lines = []; return { lines, log: (m) => lines.push(String(m)), error: (m) => lines.push(String(m)) }; };
const GET = (q) => new Request("https://tamforever.cz/api/concerts" + (q || ""));

test("query string nerozbije cache: každá varianta ?… dostane Netlify-Vary query=__none a stejné tělo", async () => {
  const g = google([{ body: { items: [A] } }]);
  const h = createHandler({ env: ENV, fetch: g.fetch, now });
  for (const q of ["", "?v=1", "?v=2&x=CANARY_QUERY", "?__none=1"]) {
    const res = await h(GET(q));
    assert.equal(res.status, 200, q);
    assert.equal(res.headers.get("Netlify-Vary"), "query=__none", q);
    assert.doesNotMatch(await res.text(), /CANARY/);
  }
});

test("tělo odpovědi z cesty přes Google: žádné kanárky, jen klíče DTO", async () => {
  const g = google([{ body: { items: [A, B] } }]);
  const h = createHandler({ env: ENV, fetch: g.fetch, now });
  const text = await (await h(GET())).text();
  assert.doesNotMatch(text, /CANARY|@example\.com|canarycalendar|attendees|organizer|htmlLink|description/);
  const body = JSON.parse(text);
  assert.equal(body.concerts.length, 2);
  for (const c of body.concerts) assert.deepEqual(Object.keys(c), DTO_KEYS);
});

test("HEAD se obslouží jako GET (200 + hlavičky)", async () => {
  const g = google([{ body: { items: [A] } }]);
  const h = createHandler({ env: ENV, fetch: g.fetch, now });
  const res = await h(new Request("https://tamforever.cz/api/concerts", { method: "HEAD" }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("X-Robots-Tag"), "noindex");
});

test("selhání 2. stránky → 503, nikdy neúplný seznam", async () => {
  const g = google([{ body: { nextPageToken: "p2", items: [A] } }, { status: 500 }]);
  const logs = capture();
  const h = createHandler({ env: ENV, fetch: g.fetch, now, log: logs, limits: { retries: 0 } });
  const res = await h(GET());
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { status: "unavailable" });
  assert.match(logs.lines.join(NL), /code=http_500/);
});

test("401 od events.list → token se zahodí, jednou obnoví a stránka zopakuje; druhé 401 → 503", async () => {
  const g = google([{ status: 401 }, { body: { items: [A] } }]);
  const h = createHandler({ env: ENV, fetch: g.fetch, now });
  const res = await h(GET());
  assert.equal(res.status, 200);
  assert.equal(g.tokens().length, 2);
  assert.equal(g.events().length, 2);
  assert.notEqual(g.events()[0].auth, g.events()[1].auth); // druhý pokus už s novým tokenem

  const g2 = google([{ status: 401 }]);
  const logs = capture();
  const h2 = createHandler({ env: ENV, fetch: g2.fetch, now, log: logs });
  assert.equal((await h2(GET())).status, 503);
  assert.equal(g2.events().length, 2);
  assert.match(logs.lines.join(NL), /code=http_401/);
});

test("nekonečné stránkování → too_many_pages, max 4 požadavky na stránky", async () => {
  const g = google([{ body: { nextPageToken: "again", items: [A] } }]);
  const logs = capture();
  const h = createHandler({ env: ENV, fetch: g.fetch, now, log: logs });
  assert.equal((await h(GET())).status, 503);
  assert.equal(g.events().length, 4);
  assert.match(logs.lines.join(NL), /code=too_many_pages/);
});

test("200 bez pole items (prázdný kalendář v partial response) → prázdný program, ne chyba", async () => {
  const g = google([{ body: {} }]);
  const h = createHandler({ env: ENV, fetch: g.fetch, now });
  const res = await h(GET());
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).concerts, []);
  // ale nesmyslné tělo (pole místo objektu, items není pole) → parse → 503
  const bad = google([{ body: [] }]);
  assert.equal((await createHandler({ env: ENV, fetch: bad.fetch, now })(GET())).status, 503);
  const bad2 = google([{ body: { items: "x" } }]);
  assert.equal((await createHandler({ env: ENV, fetch: bad2.fetch, now })(GET())).status, 503);
});

test("stránkování: maxResults 2500 a pageToken se předává", async () => {
  const g = google([{ body: { nextPageToken: "p2", items: [A] } }, { body: { items: [B] } }]);
  const h = createHandler({ env: ENV, fetch: g.fetch, now });
  assert.equal((await h(GET())).status, 200);
  const urls = g.events().map((c) => new URL(c.url));
  assert.equal(urls[0].searchParams.get("maxResults"), "2500");
  assert.equal(urls[1].searchParams.get("pageToken"), "p2");
});

test("celkový deadline: visící odpověď skončí jako timeout i při velkém timeoutMs", async () => {
  const hang = (u, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
  const g = google([hang]);
  const logs = capture();
  const h = createHandler({ env: ENV, fetch: g.fetch, now, log: logs, limits: { timeoutMs: 60000, deadlineMs: 30, retries: 1 } });
  const t0 = Date.now();
  assert.equal((await h(GET())).status, 503);
  assert.ok(Date.now() - t0 < 5000);
  assert.match(logs.lines.join(NL), /code=timeout/);
});

test("osobní kalendář (e-mail) nebo 'primary' jako GOOGLE_CALENDAR_ID → config, Google se nevolá", async () => {
  for (const id of ["radek@example.com", "primary", "", "x@group.calendar.google.com/../y"]) {
    const g = google([{ body: { items: [A] } }]);
    const logs = capture();
    const h = createHandler({ env: { ...ENV, GOOGLE_CALENDAR_ID: id }, fetch: g.fetch, now, log: logs });
    assert.equal((await h(GET())).status, 503, id);
    assert.equal(g.calls.length, 0, id);
    assert.match(logs.lines.join(NL), /code=config/);
  }
});

test("CONCERTS_SOURCE=fixtures bez injektovaného zdroje (produkce) → 503 config, žádné fixtures", async () => {
  const g = google([{ body: { items: [A] } }]);
  const logs = capture();
  const h = createHandler({ env: { ...ENV, CONCERTS_SOURCE: "fixtures" }, fetch: g.fetch, now, log: logs });
  assert.equal((await h(GET())).status, 503);
  assert.equal(g.calls.length, 0);
  assert.match(logs.lines.join(NL), /code=config/);
});

test("stale okno se krátí: s-maxage = zbývající čas, max 30", async () => {
  let fail = false;
  let t = clock;
  const g = google([() => (fail ? json(500, {}) : json(200, { items: [A] }))]);
  const h = createHandler({ env: ENV, fetch: g.fetch, now: () => t, limits: { retries: 0 } });
  assert.equal((await h(GET())).status, 200);
  fail = true;
  t += 29 * 60 * 1000 + 50 * 1000; // zbývá 10 s
  const res = await h(GET());
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Netlify-CDN-Cache-Control"), "public, s-maxage=10");
  t += 11 * 1000;
  assert.equal((await h(GET())).status, 503);
});
