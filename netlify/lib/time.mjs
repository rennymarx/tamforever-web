/* Časové okno pro načítání událostí: −12 / +24 měsíců od dnešního dne v Europe/Prague.
   Offset se nefixuje natvrdo – pražský kalendářní den čteme přes Intl. */

export const TIME_ZONE = "Europe/Prague";
const MONTHS_BACK = 12;
const MONTHS_AHEAD = 24;

/** Rok/měsíc/den daného okamžiku v Europe/Prague. */
export function pragueDate(now) {
  var parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  var get = function (type) { return Number(parts.find(function (p) { return p.type === type; }).value); };
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** @returns {{from: string, to: string}} RFC3339 (UTC) hranice okna pro events.list */
export function window(now) {
  var d = pragueDate(now);
  // půlnoc UTC daného dne stačí – okno je v měsících, hodinový posun nehraje roli
  var from = new Date(Date.UTC(d.year, d.month - 1 - MONTHS_BACK, d.day));
  var to = new Date(Date.UTC(d.year, d.month - 1 + MONTHS_AHEAD, d.day));
  return { from: from.toISOString(), to: to.toISOString() };
}
