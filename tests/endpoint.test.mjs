import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createHandler } from "../netlify/functions/concerts.mjs";
import { buildJwt } from "../netlify/lib/google.mjs";

const CAL_ID = "canarycalendar_k3j9@group.calendar.google.com";
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PEM = privateKey.export({ type: "pkcs8", format: "pem" });
const ENV = {
  CONCERTS_ENABLED: "true",
  GOOGLE_CALENDAR_ID: CAL_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: "reader@canary-project.iam.gserviceaccount.com",
  GOOGLE_PRIVATE_KEY: PEM.replace(/\n/g, "\\n"), // jako v Netlify env – "\n" jako dva znaky
};
const fixtures = JSON.parse(await readFile(new URL("./fixtures/google-events.json", import.meta.url), "utf8"));

function ev(id, start) {
  return { id, status: "confirmed", summary: "Město – " + id, description: "Honorář CANARY_INTERNAL_m3k",
    organizer: { self: true }, start: { dateTime: start }, end: { dateTime: start.replace("T20", "T22") }, attendees: [{ email: "CANARY_ATTENDEE_x7q@example.com" }] };
}
const PAGE1 = { nextPageToken: "p2", items: [ev("a", "2027-06-01T20:00:00+02:00"), ev("b", "2027-06-08T20:00:00+02:00")] };
const PAGE2 = { items: [ev("b", "2027-06-08T20:00:00+02:00"), ev("c", "2027-06-15T20:00:00+02:00")] };

function jsonRes(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Falešný Google: token endpoint + stránkovaný events.list. Zaznamenává volání. */
function fakeGoogle(opts = {}) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: String(url), method: (init && init.method) || "GET" });
    if (String(url).startsWith("https://oauth2.googleapis.com/token")) {
      if (opts.tokenStatus) return jsonRes(opts.tokenStatus, { error: "invalid_grant" });
      return jsonRes(200, { access_token: "tok_" + calls.length, expires_in: 3600 });
    }
    if (opts.eventsStatus) return jsonRes(opts.eventsStatus, { error: { message: "boom " + CAL_ID } });
    if (opts.hang) return new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
    const u = new URL(String(url));
    return jsonRes(200, u.searchParams.get("pageToken") === "p2" ? PAGE2 : PAGE1);
  };
  return { fetch, calls };
}

function capture() {
  const lines = [];
  return { lines, log: (m) => lines.push(String(m)), error: (m) => lines.push(String(m)) };
}

const GET = () => new Request("https://tamforever.cz/api/concerts");
let clock = Date.parse("2026-11-06T12:00:00Z");
const now = () => clock;

test("vypínač CONCERTS_ENABLED → 404 bez volání Googlu", async () => {
  const g = fakeGoogle();
  const h = createHandler({ env: { ...ENV, CONCERTS_ENABLED: "false" }, fetch: g.fetch, now });
  const res = await h(GET());
  assert.equal(res.status, 404);
  assert.equal(g.calls.length, 0);
});

test("POST → 405 s Allow", async () => {
  const h = createHandler({ env: ENV, fetch: fakeGoogle().fetch, now });
  const res = await h(new Request("https://tamforever.cz/api/concerts", { method: "POST" }));
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("Allow"), "GET, HEAD");
});

test("stránky se slepí, duplicitní id nezdvojí, hlavičky cache a tvar odpovědi", async () => {
  const g = fakeGoogle();
  const logs = capture();
  const h = createHandler({ env: ENV, fetch: g.fetch, now, log: logs });
  const res = await h(GET());
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.version, 1);
  assert.equal(body.status, "ok");
  assert.equal(body.timeZone, "Europe/Prague");
  assert.equal(body.generatedAt, new Date(clock).toISOString());
  assert.deepEqual(body.concerts.map((c) => c.title), ["Město – a", "Město – b", "Město – c"]);
  assert.equal(res.headers.get("Netlify-CDN-Cache-Control"), "public, durable, s-maxage=300, stale-while-revalidate=120");
  assert.equal(res.headers.get("Netlify-Vary"), "query=__none"); // každý ?query sdílí jednu cache položku
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=0, must-revalidate");
  assert.equal(res.headers.get("X-Robots-Tag"), "noindex");
  // request na Google: partial response bez attendees, správné parametry
  const eventCalls = g.calls.filter((c) => c.url.includes("/calendar/v3/"));
  assert.equal(eventCalls.length, 2);
  const u = new URL(eventCalls[0].url);
  assert.equal(u.pathname, "/calendar/v3/calendars/" + encodeURIComponent(CAL_ID) + "/events");
  assert.equal(u.searchParams.get("singleEvents"), "true");
  assert.equal(u.searchParams.get("orderBy"), "startTime");
  assert.equal(u.searchParams.get("showDeleted"), "false");
  assert.match(u.searchParams.get("fields"), /items\(id,status,summary,location,start,end,organizer\(self\)\)/);
  assert.doesNotMatch(u.searchParams.get("fields"), /description/); // popis je interní – od Googlu se ani nežádá
  assert.match(u.searchParams.get("timeMin"), /^2025-11-06T/);
  assert.match(u.searchParams.get("timeMax"), /^2028-11-06T/);
  // log jen agregát
  assert.match(logs.lines.join("\n"), /^concerts ok pages=2 fetched=4 published=3 ms=\d+$/m);
  assert.doesNotMatch(logs.lines.join("\n"), /canarycalendar|CANARY/);
});

test("token se cachuje mezi požadavky a obnoví po expiraci", async () => {
  const g = fakeGoogle();
  const h = createHandler({ env: ENV, fetch: g.fetch, now });
  await h(GET()); await h(GET());
  assert.equal(g.calls.filter((c) => c.url.includes("oauth2")).length, 1);
  clock += 3600 * 1000;
  await h(GET());
  assert.equal(g.calls.filter((c) => c.url.includes("oauth2")).length, 2);
  clock -= 3600 * 1000;
});

test("chyba Googlu (5xx i po retry) → 503 bez obsahu a bez calendarId v odpovědi/logu", async () => {
  const g = fakeGoogle({ eventsStatus: 500 });
  const logs = capture();
  const h = createHandler({ env: ENV, fetch: g.fetch, now, log: logs });
  const res = await h(GET());
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { status: "unavailable" });
  assert.equal(res.headers.get("Netlify-CDN-Cache-Control"), "public, s-maxage=60"); // krátká negativní cache
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.equal(g.calls.filter((c) => c.url.includes("/calendar/")).length, 2); // 1 retry
  assert.match(logs.lines.join("\n"), /concerts error code=http_500 ms=\d+/);
  assert.doesNotMatch(logs.lines.join("\n"), /canarycalendar|boom/);
});

test("neplatný klíč / odmítnutý token → 503, kód auth", async () => {
  const g = fakeGoogle({ tokenStatus: 400 });
  const logs = capture();
  const h = createHandler({ env: ENV, fetch: g.fetch, now, log: logs });
  assert.equal((await h(GET())).status, 503);
  assert.match(logs.lines.join("\n"), /code=auth_http_400/);
  const bad = createHandler({ env: { ...ENV, GOOGLE_PRIVATE_KEY: "not a key" }, fetch: g.fetch, now, log: logs });
  assert.equal((await bad(GET())).status, 503);
  assert.match(logs.lines.join("\n"), /code=bad_key/);
});

test("timeout Googlu → 503 s kódem timeout", async () => {
  const g = fakeGoogle({ hang: true });
  const logs = capture();
  const h = createHandler({ env: ENV, fetch: g.fetch, now, log: logs, limits: { timeoutMs: 20, retries: 0 } });
  const res = await h(GET());
  assert.equal(res.status, 503);
  assert.match(logs.lines.join("\n"), /code=timeout/);
});

test("po výpadku se do 30 min servíruje poslední dobrá odpověď (stale), pak 503", async () => {
  let failing = false;
  const good = fakeGoogle();
  const fetch = (url, init) => (failing && String(url).includes("/calendar/") ? jsonRes(500, {}) : good.fetch(url, init));
  const h = createHandler({ env: ENV, fetch, now, limits: { retries: 0 } });
  assert.equal((await h(GET())).status, 200);
  failing = true;
  clock += 10 * 60 * 1000;
  const stale = await h(GET());
  assert.equal(stale.status, 200);
  assert.equal(stale.headers.get("X-Concerts-Stale"), "1");
  assert.equal(stale.headers.get("Netlify-CDN-Cache-Control"), "public, s-maxage=30");
  assert.equal((await stale.json()).concerts.length, 3);
  clock += 25 * 60 * 1000; // celkem 35 min od posledního úspěchu
  assert.equal((await h(GET())).status, 503);
  clock -= 35 * 60 * 1000;
});

test("režim fixtures neběží bez výslovného zdroje a nevolá Google", async () => {
  const g = fakeGoogle();
  const h = createHandler({ env: { ...ENV, CONCERTS_SOURCE: "fixtures" }, fetch: g.fetch, now, loadFixtures: async () => fixtures });
  const res = await h(GET());
  assert.equal(res.status, 200);
  assert.equal((await res.json()).concerts.length, 6);
  assert.equal(g.calls.length, 0);
});

test("JWT: hlavička RS256, scope jen readonly, exp = iat + 3600", () => {
  const jwt = buildJwt(ENV, 1700000000);
  const [h, c] = jwt.split(".").slice(0, 2).map((p) => JSON.parse(Buffer.from(p, "base64url").toString("utf8")));
  assert.deepEqual(h, { alg: "RS256", typ: "JWT" });
  assert.equal(c.scope, "https://www.googleapis.com/auth/calendar.events.readonly");
  assert.equal(c.exp - c.iat, 3600);
  assert.equal(c.aud, "https://oauth2.googleapis.com/token");
});
