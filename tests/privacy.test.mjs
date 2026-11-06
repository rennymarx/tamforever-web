/* Test soukromí: kanárky z interních polí, hostů, organizátora ani calendarId se nesmí objevit
   v odpovědi endpointu, v logu ani ve veřejných souborech webu. Kontroluje se OBSAH, ne viditelnost. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHandler } from "../netlify/functions/concerts.mjs";
import { DTO_KEYS } from "../netlify/lib/project.mjs";

const root = new URL("../", import.meta.url);
const fixtures = JSON.parse(await readFile(new URL("./fixtures/google-events.json", import.meta.url), "utf8"));
const CANARIES = /CANARY_[A-Z]+_[a-z0-9]+|@example\.com|canarycalendar/;

test("fixtures opravdu obsahují kanárky (jinak by test nic nedokazoval)", () => {
  const raw = JSON.stringify(fixtures);
  for (const c of ["CANARY_INTERNAL_m3k", "CANARY_ATTENDEE_x7q", "CANARY_ORGANIZER_q9z", "CANARY_TITLE_NE", "CANARY_SCRIPT_z1x"]) {
    assert.match(raw, new RegExp(c));
  }
});

test("odpověď endpointu: žádné kanárky, jen povolené klíče DTO", async () => {
  const lines = [];
  const h = createHandler({
    env: { CONCERTS_ENABLED: "true", CONCERTS_SOURCE: "fixtures", GOOGLE_CALENDAR_ID: "canarycalendar_k3j9@group.calendar.google.com" },
    fetch: async () => { throw new Error("Google se nesmí volat"); },
    log: { log: (m) => lines.push(m), error: (m) => lines.push(m) },
    loadFixtures: async () => fixtures,
  });
  const res = await h(new Request("https://tamforever.cz/api/concerts"));
  const text = await res.text();
  assert.equal(res.status, 200);
  assert.doesNotMatch(text, CANARIES);
  assert.doesNotMatch(text, /attendees|organizer|creator|htmlLink|description|recurringEventId/);
  const body = JSON.parse(text);
  assert.deepEqual(Object.keys(body).sort(), ["concerts", "generatedAt", "status", "timeZone", "version", "window"]);
  for (const c of body.concerts) assert.deepEqual(Object.keys(c), DTO_KEYS);
  assert.doesNotMatch(lines.join("\n"), CANARIES);
});

test("veřejné soubory webu neobsahují nic z Google strany", async () => {
  for (const f of ["index.html", "js/main.js", "css/style.css", "netlify.toml", "robots.txt"]) {
    const s = await readFile(new URL(f, root), "utf8");
    // fonts.googleapis.com (písma) je v pořádku; API Googlu ani kalendář se ve veřejných souborech objevit nesmí
    assert.doesNotMatch(s, /www\.googleapis\.com|oauth2\.googleapis\.com|calendar\/v3|group\.calendar\.google\.com|gserviceaccount|BEGIN PRIVATE KEY/, f);
  }
});

test("zdrojové soubory funkce neobsahují tajemství ani konkrétní ID kalendáře", async () => {
  for (const f of ["netlify/functions/concerts.mjs", "netlify/lib/google.mjs", "netlify/lib/parser.mjs", "netlify/lib/project.mjs"]) {
    const s = await readFile(new URL(f, root), "utf8");
    assert.doesNotMatch(s, /BEGIN PRIVATE KEY|@group\.calendar\.google\.com|\.iam\.gserviceaccount\.com/, f);
  }
});
