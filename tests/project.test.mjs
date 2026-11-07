import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { projectEvent, projectEvents, publicIdFor, DTO_KEYS } from "../netlify/lib/project.mjs";
import { window as timeWindow, pragueDate } from "../netlify/lib/time.mjs";

const fixtures = JSON.parse(await readFile(new URL("./fixtures/google-events.json", import.meta.url), "utf8"));

function base(over) {
  return Object.assign({
    id: "evt_1", status: "confirmed", summary: "Město - Akce: Text.",
    description: "Honorář CANARY_INTERNAL_m3k",
    location: "Náměstí 1, Město",
    start: { dateTime: "2027-06-19T19:00:00+02:00" }, end: { dateTime: "2027-06-19T22:00:00+02:00" },
    attendees: [{ email: "CANARY_ATTENDEE_x7q@example.com" }], organizer: { email: "CANARY_ORGANIZER_q9z@example.com", self: true },
  }, over);
}

test("DTO má přesně povolené klíče a nic jiného", () => {
  const { dto } = projectEvent(base());
  assert.deepEqual(Object.keys(dto), DTO_KEYS);
  assert.doesNotMatch(JSON.stringify(dto), /CANARY|@example\.com|attendees|organizer/);
});

test("publicId je stabilní hash, ne Google id", () => {
  const { dto } = projectEvent(base());
  assert.equal(dto.publicId, publicIdFor("evt_1"));
  assert.match(dto.publicId, /^[0-9a-f]{16}$/);
  assert.notEqual(dto.publicId, "evt_1");
});

test("vyřazení: cancelled, celodenní, chybějící čas, prázdný název", () => {
  assert.equal(projectEvent(base({ status: "cancelled" })).reason, "cancelled");
  assert.equal(projectEvent(base({ start: { date: "2027-06-19" }, end: { date: "2027-06-20" } })).reason, "all_day_or_incomplete");
  assert.equal(projectEvent(base({ end: {} })).reason, "all_day_or_incomplete");
  assert.equal(projectEvent(base({ summary: "   " })).reason, "no_title");
  assert.equal(projectEvent(base({ summary: ": jen doplněk" })).reason, "no_title");
  assert.equal(projectEvent(base({ summary: undefined })).reason, "no_title"); // soukromá viditelnost: Google název nepošle
  assert.equal(projectEvent(base({ end: { dateTime: "2027-06-19T18:00:00+02:00" } })).reason, "bad_time");
  // bez offsetu (lokální čas bez pásma) by si prohlížeč čas vyložil podle sebe → nepublikovat
  assert.equal(projectEvent(base({ start: { dateTime: "2027-06-19T19:00:00" } })).reason, "bad_time");
  // pozvánka z cizího kalendáře (organizer.self !== true) nebo chybějící organizer → nepublikovat
  assert.equal(projectEvent(base({ organizer: { email: "x@example.com", self: false } })).reason, "foreign_organizer");
  assert.equal(projectEvent(base({ organizer: undefined })).reason, "foreign_organizer");
});

test("oříznutí délek a chybějící místo", () => {
  const { dto } = projectEvent(base({ summary: "A".repeat(200), location: "" }));
  assert.equal(dto.title.length, 120);
  assert.equal(dto.location, null);
  assert.equal(projectEvent(base({ location: undefined })).dto.location, null);
});

test("časy se předávají s původním offsetem (zimní +01:00 i letní +02:00)", () => {
  const w = projectEvent(base({ start: { dateTime: "2027-01-16T20:00:00+01:00" }, end: { dateTime: "2027-01-16T23:00:00+01:00" } })).dto;
  assert.equal(w.start, "2027-01-16T20:00:00+01:00");
  const s = projectEvent(base()).dto;
  assert.equal(s.end, "2027-06-19T22:00:00+02:00");
});

test("opakovaná řada: každý výskyt má vlastní id → vlastní publicId; stejné id ze dvou stránek se nezdvojí", () => {
  const a = base({ id: "rec_20270710T180000Z", recurringEventId: "rec" });
  const b = base({ id: "rec_20270717T180000Z", recurringEventId: "rec", start: { dateTime: "2027-07-17T20:00:00+02:00" }, end: { dateTime: "2027-07-17T22:00:00+02:00" } });
  const r = projectEvents([a, b, a]);
  assert.equal(r.concerts.length, 2);
  assert.notEqual(r.concerts[0].publicId, r.concerts[1].publicId);
});

test("řazení podle začátku", () => {
  const late = base({ id: "l", start: { dateTime: "2027-09-01T20:00:00+02:00" }, end: { dateTime: "2027-09-01T22:00:00+02:00" } });
  const early = base({ id: "e", start: { dateTime: "2027-03-01T20:00:00+01:00" }, end: { dateTime: "2027-03-01T22:00:00+01:00" } });
  const r = projectEvents([late, early]);
  assert.deepEqual(r.concerts.map((c) => c.start), ["2027-03-01T20:00:00+01:00", "2027-09-01T20:00:00+02:00"]);
});

test("název → title + publicText, popis se ignoruje; soukromá akce je běžná událost", () => {
  const { dto } = projectEvent(base());
  assert.equal(dto.title, "Město – Akce");
  assert.equal(dto.publicText, "Text.");
  assert.doesNotMatch(JSON.stringify(dto), /Honorář|CANARY/);
  const priv = projectEvent(base({ summary: "Soukromá akce", location: undefined })).dto;
  assert.equal(priv.title, "Soukromá akce");
  assert.equal(priv.location, null);
});

test("fixtures: publikují se události s názvem z tohoto kalendáře, kanárky nikde", () => {
  const r = projectEvents(fixtures.items);
  assert.deepEqual(r.concerts.map((c) => [c.title, c.publicText]), [
    ["Soukromá akce", null],
    ["Praha – Klub Rock ballad", "Předkapela Strom, naši dlouholetí kamarádi, vstupné 100 Kč"],
    ["Praha – Letní scéna", "Pravidelná letní scéna."],
    ["Přelouč – Letní noc", null],
    ["Valtice – Vinobraní, začátek 20:00", "Sobotní večer na zámeckém nádvoří."],
    ["Nymburk – Posvícení", "Pouťový večer"],
  ]);
  assert.doesNotMatch(JSON.stringify(r.concerts), /CANARY|@example\.com|<|script|Honorář|Pořadatel/);
  assert.equal(r.counts.cancelled, 1);
  assert.equal(r.counts.all_day_or_incomplete, 1);
  assert.equal(r.counts.no_title, 2);
  assert.equal(r.counts.foreign_organizer, 1);
});

test("okno −12/+24 měsíců podle pražského dne (včetně přechodu přes půlnoc UTC)", () => {
  // 31. 12. 2026 23:30 UTC = 1. 1. 2027 00:30 v Praze
  const now = new Date("2026-12-31T23:30:00Z");
  assert.deepEqual(pragueDate(now), { year: 2027, month: 1, day: 1 });
  const w = timeWindow(now);
  assert.equal(w.from, "2026-01-01T00:00:00.000Z");
  assert.equal(w.to, "2029-01-01T00:00:00.000Z");
  // letní čas: 30. 6. 2027 22:30 UTC = 1. 7. 00:30 v Praze
  assert.deepEqual(pragueDate(new Date("2027-06-30T22:30:00Z")), { year: 2027, month: 7, day: 1 });
});
