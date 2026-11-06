/* Projekce událostí z Google Calendar API na veřejné DTO.
   Z každé události jde ven JEN pevný výčet polí – nikdy celý objekt, nikdy spread. */
import { createHash } from "node:crypto";
import { parseDescription } from "./parser.mjs";

export const DTO_KEYS = ["publicId", "title", "start", "end", "location", "publicText"];
const TITLE_MAX = 120;
const LOCATION_MAX = 200;
// RFC3339 s povinným offsetem (Google ho u dateTime vždy posílá); bez offsetu by si prohlížeč čas vyložil jinak
const RE_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function clip(s, max) {
  var t = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

/** Nevratný stabilní identifikátor výskytu (Google id → sha256, 16 hex znaků). */
export function publicIdFor(id) {
  return createHash("sha256").update(String(id)).digest("hex").slice(0, 16);
}

/**
 * Jedna událost → DTO nebo null (+ důvod vyřazení).
 * @returns {{dto: object|null, reason: string}}
 */
export function projectEvent(item) {
  if (!item || typeof item !== "object") return { dto: null, reason: "invalid" };
  if (item.status === "cancelled") return { dto: null, reason: "cancelled" };
  if (typeof item.id !== "string" || !item.id) return { dto: null, reason: "no_id" };
  // jen události, které patří tomuto kalendáři (ne pozvánky od cizích organizátorů) – fail-closed
  if (!item.organizer || item.organizer.self !== true) return { dto: null, reason: "foreign_organizer" };
  var start = item.start && typeof item.start.dateTime === "string" ? item.start.dateTime : null;
  var end = item.end && typeof item.end.dateTime === "string" ? item.end.dateTime : null;
  if (!start || !end) return { dto: null, reason: "all_day_or_incomplete" };
  if (!RE_DATETIME.test(start) || !RE_DATETIME.test(end)) return { dto: null, reason: "bad_time" };
  if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end))) return { dto: null, reason: "bad_time" };
  if (Date.parse(end) < Date.parse(start)) return { dto: null, reason: "bad_time" };
  var title = clip(item.summary, TITLE_MAX);
  if (!title) return { dto: null, reason: "no_title" };
  var parsed = parseDescription(item.description);
  if (!parsed.publish) return { dto: null, reason: parsed.reason };
  var location = clip(item.location, LOCATION_MAX);

  // explicitní sestavení – přidání nového pole vyžaduje vědomou změnu DTO_KEYS i testů
  var dto = {
    publicId: publicIdFor(item.id),
    title: title,
    start: start,
    end: end,
    location: location || null,
    publicText: parsed.publicText,
  };
  return { dto: dto, reason: "ok" };
}

/**
 * Pole událostí (už rozbalených singleEvents) → seřazené veřejné DTO.
 * Dedup podle Google id (stejný výskyt ze dvou stránek se nezdvojí).
 * @returns {{concerts: object[], counts: Record<string, number>}}
 */
export function projectEvents(items) {
  var byId = new Map();
  var counts = {};
  (Array.isArray(items) ? items : []).forEach(function (item) {
    var r = projectEvent(item);
    counts[r.reason] = (counts[r.reason] || 0) + 1;
    if (r.dto) byId.set(item.id, r.dto);
  });
  var concerts = Array.from(byId.values()).sort(function (a, b) {
    return Date.parse(a.start) - Date.parse(b.start) || a.publicId.localeCompare(b.publicId);
  });
  return { concerts: concerts, counts: counts };
}
