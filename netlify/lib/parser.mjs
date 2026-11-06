/* Parser popisu události z Google Kalendáře → veřejná část.
   Čistá funkce bez závislostí. Pravidla (fail-closed = při pochybnosti NEpublikovat):
   - popis může přijít jako HTML (web editor) nebo prostý text (mobil) → převod na řádky
   - veřejná část je jen PŘED prvním samostatným řádkem "INTERNÍ:"; chybí-li, nepublikovat
   - před oddělovačem musí být právě jeden řádek "WEB: ANO" a nejvýše jeden "VEŘEJNÝ TEXT:"
   - "VSTUPENKY:" se zatím ignoruje (web tlačítko nemá), ostatní řádky se ignorují
   - nikdy se nepublikuje "zbytek popisu" — jen hodnota VEŘEJNÝ TEXT
   Všechny regexy jsou lineární a žádný nepřechází přes konec řádku (prostý text z mobilu
   může obsahovat "<3" nebo "->" a nesmí tím "sežrat" oddělovač). */

const PUBLIC_TEXT_MAX = 300;
const DESCRIPTION_MAX = 16000; // delší popis = chyba editora nebo útok → nepublikovat

const NAMED_ENTITIES = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  hellip: "…", ndash: "–", mdash: "—", laquo: "«", raquo: "»",
};

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (m, e) {
    if (e[0] === "#") {
      var code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (!Number.isFinite(code) || code < 1 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return "";
      if (code === 10 || code === 13 || code === 0x2028 || code === 0x2029) return " "; // entita nesmí vyrobit nový řádek
      return String.fromCodePoint(code);
    }
    var v = NAMED_ENTITIES[e.toLowerCase()];
    return v === undefined ? m : v;
  });
}

/** Popis obsahuje HTML? (Google web editor posílá HTML, mobil prostý text.) */
function looksLikeHtml(s) {
  return /<(br|p|div|span|b|i|u|a|ul|ol|li|html-blob|strong|em|h[1-6])\b[^<>\n]*\/?>|<\/(p|div|span|b|i|u|a|ul|ol|li|html-blob|strong|em)>/i.test(s);
}

/**
 * HTML/text popisu → pole neprázdných, oříznutých řádků (NFC). Nic se nerenderuje ani nespouští.
 * @returns {string[]|null} null = vstup je poškozené HTML (neuzavřený komentář/CDATA/script) → nepublikovat
 */
export function htmlToLines(input) {
  var s = input == null ? "" : String(input);
  if (s.length > DESCRIPTION_MAX) return null;
  // všechny varianty zalomení sjednotit na \n (včetně U+2028/2029, \v, \f, NEL)
  s = s.replace(/\r\n?|[\v\f\u0085\u2028\u2029]/g, "\n");
  if (looksLikeHtml(s) || /<!--|<!\[CDATA\[|<script|<style/i.test(s)) {
    // komentáře, CDATA a obsah <script>/<style> pryč celé; pokud zůstanou neuzavřené → poškozené
    s = s.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
    s = s.replace(/<(script|style)\b[^<>\n]*>[\s\S]*?<\/\1\s*>/gi, "");
    if (/<!--|<!\[CDATA\[|<(script|style)\b/i.test(s)) return null;
    // blokové značky a <br> = hranice řádku; značka nikdy nepřechází přes konec řádku
    s = s.replace(/<br\s*\/?>/gi, "\n");
    s = s.replace(/<\/?(p|div|li|ul|ol|h[1-6]|tr|td|th|blockquote|pre|html-blob)\b[^<>\n]*>/gi, "\n");
    // zbytek značek (jen tvar <x…> nebo </x…> v jednom řádku) odstranit
    s = s.replace(/<\/?[a-zA-Z][^<>\n]*>/g, "");
    s = decodeEntities(s);
  }
  s = s.normalize("NFC");
  return s
    .split("\n")
    .map(function (l) { return l.replace(/[\u00a0\t\u2000-\u200b\ufeff]+/g, " ").replace(/\s+/g, " ").trim(); })
    .filter(function (l) { return l.length > 0; });
}

// Klíče: diakritiku tolerujeme (ŘÍ i RI), velikost písmen ne — klíč musí být velkými písmeny.
var RE_SEPARATOR = /^INTERN[ÍI]\s*:\s*$/;
var RE_WEB = /^WEB\s*:\s*(.*)$/;
var RE_PUBLIC_TEXT = /^VE[ŘR]EJN[ÝY] TEXT\s*:\s*(.*)$/;
var RE_TICKETS = /^VSTUPENKY\s*:\s*(.*)$/;

/**
 * @param {string} description surový popis události (HTML nebo text)
 * @returns {{publish: boolean, reason: string, publicText: string|null}}
 *   reason: "ok" | "empty" | "malformed" | "no_separator" | "no_web_flag" | "web_not_ano"
 *           | "duplicate_web" | "duplicate_public_text" | "public_text_too_long"
 */
export function parseDescription(description) {
  var lines = htmlToLines(description);
  if (lines === null) return { publish: false, reason: "malformed", publicText: null };
  if (!lines.length) return { publish: false, reason: "empty", publicText: null };

  var sepIndex = -1;
  for (var i = 0; i < lines.length; i++) {
    if (RE_SEPARATOR.test(lines[i])) { sepIndex = i; break; }
  }
  if (sepIndex < 0) return { publish: false, reason: "no_separator", publicText: null };

  var webValues = [];
  var publicTexts = [];
  for (var j = 0; j < sepIndex; j++) {
    var line = lines[j];
    var m;
    if ((m = RE_WEB.exec(line))) { webValues.push(m[1].trim()); continue; }
    if ((m = RE_PUBLIC_TEXT.exec(line))) { publicTexts.push(m[1].trim()); continue; }
    if (RE_TICKETS.test(line)) continue; // zatím bez tlačítka Vstupenky
    // ostatní řádky před oddělovačem ignorujeme – nikdy z nich nevzniká veřejný text
  }

  if (webValues.length === 0) return { publish: false, reason: "no_web_flag", publicText: null };
  if (webValues.length > 1) return { publish: false, reason: "duplicate_web", publicText: null };
  if (webValues[0] !== "ANO") return { publish: false, reason: "web_not_ano", publicText: null };
  if (publicTexts.length > 1) return { publish: false, reason: "duplicate_public_text", publicText: null };

  var publicText = publicTexts.length ? publicTexts[0] : "";
  if (publicText.length > PUBLIC_TEXT_MAX) return { publish: false, reason: "public_text_too_long", publicText: null };

  return { publish: true, reason: "ok", publicText: publicText || null };
}
