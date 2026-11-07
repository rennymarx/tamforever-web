/* Čtení Google Kalendáře přes service account – bez knihoven.
   JWT RS256 přes node:crypto → access token (scope jen calendar.events.readonly) → events.list.
   Chyby se hlásí jen kódem (err.code), nikdy textem Googlu ani calendarId.
   Celé listEvents (token + všechny stránky + čtení těl) běží pod jedním deadlinem,
   aby funkce nikdy nenarazila na 60s limit Netlify a vždy stihla vrátit 503/stale. */
import { createSign } from "node:crypto";

export const SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/";
// partial response: popis (interní), attendees, organizer e-mail, creator, htmlLink, conferenceData… nikdy neopustí Google;
// organizer(self) je jen boolean „událost patří tomuto kalendáři“ (filtr proti cizím pozvánkám)
const FIELDS = "nextPageToken,items(id,status,summary,location,start,end,organizer(self))";
// ID sdíleného (sekundárního) kalendáře; osobní kalendář (e-mail) ani "primary" nepovolujeme —
// do osobního kalendáře chodí pozvánky od kohokoli
const RE_CALENDAR_ID = /^[a-z0-9._%+-]+@group\.calendar\.google\.com$/i;

export const LIMITS = { maxPages: 4, pageSize: 2500, timeoutMs: 8000, deadlineMs: 20000, retries: 1 };

export function codedError(code, cause) {
  var e = new Error(code);
  e.code = code;
  if (cause !== undefined) e.cause = cause;
  return e;
}

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

/** Podepsaný JWT pro OAuth2 "jwt-bearer" tok. Klíč v env má "\n" jako dva znaky → převést. */
export function buildJwt(env, nowSeconds) {
  var email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  var pem = env.GOOGLE_PRIVATE_KEY;
  if (!email || !pem) throw codedError("config");
  pem = pem.replace(/\\n/g, "\n");
  var header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  var claims = b64url(JSON.stringify({
    iss: email, scope: SCOPE, aud: TOKEN_URL, iat: nowSeconds, exp: nowSeconds + 3600,
  }));
  var signer = createSign("RSA-SHA256");
  signer.update(header + "." + claims);
  var signature;
  try { signature = signer.sign(pem).toString("base64url"); }
  catch (_) { throw codedError("bad_key"); }
  return header + "." + claims + "." + signature;
}

/**
 * Klient s cache tokenu v paměti instance (token platí 1 h, obnovuje se 60 s předem).
 * @param {{env: object, fetch: Function, now?: () => number, limits?: object}} opts
 */
export function createGoogleClient(opts) {
  var env = opts.env;
  var fetchImpl = opts.fetch;
  var now = opts.now || Date.now;
  var limits = Object.assign({}, LIMITS, opts.limits || {});
  var cached = { token: null, expiresAt: 0 };

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /** fetch + čtení JSON těla pod jedním timeoutem = min(timeoutMs, čas do deadline). */
  async function fetchJson(url, init, deadline) {
    var budget = Math.min(limits.timeoutMs, deadline - now());
    if (budget <= 0) throw codedError("timeout");
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, budget);
    try {
      var res = await fetchImpl(url, Object.assign({}, init, { signal: ctrl.signal }));
      var data = null;
      if (res.status !== 204) {
        try { data = await res.json(); } catch (e) { if (e && e.name === "AbortError") throw e; data = undefined; }
      }
      return { status: res.status, ok: res.ok, data: data };
    } catch (e) {
      throw codedError(e && e.name === "AbortError" ? "timeout" : "network");
    } finally {
      clearTimeout(t);
    }
  }

  async function getAccessToken(deadline) {
    if (cached.token && cached.expiresAt - 60000 > now()) return cached.token;
    var jwt = buildJwt(env, Math.floor(now() / 1000));
    var body = "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") +
      "&assertion=" + encodeURIComponent(jwt);
    var res = await fetchJson(TOKEN_URL, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body,
    }, deadline);
    if (!res.ok) throw codedError("auth_http_" + res.status);
    if (!res.data || typeof res.data.access_token !== "string") throw codedError("auth_parse");
    cached.token = res.data.access_token;
    cached.expiresAt = now() + (Number(res.data.expires_in) > 0 ? Number(res.data.expires_in) * 1000 : 3600000);
    return cached.token;
  }

  async function fetchPage(token, calendarId, timeMin, timeMax, pageToken, deadline) {
    var qs = new URLSearchParams({
      singleEvents: "true", orderBy: "startTime", showDeleted: "false",
      timeMin: timeMin, timeMax: timeMax, maxResults: String(limits.pageSize), fields: FIELDS,
    });
    if (pageToken) qs.set("pageToken", pageToken);
    var url = EVENTS_URL + encodeURIComponent(calendarId) + "/events?" + qs.toString();
    var attempt = 0;
    for (;;) {
      var res;
      try {
        res = await fetchJson(url, { headers: { Authorization: "Bearer " + token } }, deadline);
      } catch (e) {
        // opakovat jen síťovou chybu/timeout, a jen když do deadline zbývá rozumný čas
        if (attempt < limits.retries && deadline - now() > 1500) { attempt++; await sleep(500); continue; }
        throw e;
      }
      if (res.status >= 500 && attempt < limits.retries && deadline - now() > 1500) { attempt++; await sleep(500); continue; }
      if (res.status === 401) { cached.token = null; throw codedError("http_401"); }
      if (!res.ok) throw codedError("http_" + res.status);
      var data = res.data;
      if (!data || typeof data !== "object" || Array.isArray(data)) throw codedError("parse");
      if (data.items === undefined) data.items = []; // Google prázdné pole u partial response vynechává
      if (!Array.isArray(data.items)) throw codedError("parse");
      return data;
    }
  }

  /**
   * Všechny stránky events.list v okně. Vrátí jen po úspěšném načtení všech stránek,
   * jinak vyhodí chybu (nikdy neúplný seznam). Při 401 jednou obnoví token a stránku zopakuje.
   * @returns {Promise<{items: object[], pages: number}>}
   */
  async function listEvents(params) {
    var calendarId = env.GOOGLE_CALENDAR_ID;
    if (!calendarId || !RE_CALENDAR_ID.test(calendarId)) throw codedError("config");
    var deadline = now() + limits.deadlineMs;
    var token = await getAccessToken(deadline);
    var items = [];
    var pageToken = null;
    var pages = 0;
    var refreshed = false;
    do {
      if (pages >= limits.maxPages) throw codedError("too_many_pages");
      var data;
      try {
        data = await fetchPage(token, calendarId, params.timeMin, params.timeMax, pageToken, deadline);
      } catch (e) {
        if (e && e.code === "http_401" && !refreshed) {
          refreshed = true;
          token = await getAccessToken(deadline);
          data = await fetchPage(token, calendarId, params.timeMin, params.timeMax, pageToken, deadline);
        } else {
          throw e;
        }
      }
      pages++;
      items = items.concat(data.items);
      pageToken = typeof data.nextPageToken === "string" && data.nextPageToken ? data.nextPageToken : null;
    } while (pageToken);
    return { items: items, pages: pages };
  }

  return { getAccessToken: function () { return getAccessToken(now() + limits.deadlineMs); }, listEvents: listEvents };
}
