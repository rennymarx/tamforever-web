/* Veřejný obsah koncertu = jen NÁZEV události (summary). Popis se z Googlu vůbec nestahuje.
   „Praha - Klub Rock ballad: Předkapela Strom, vstupné 100 Kč“
     → title „Praha – Klub Rock ballad“, publicText „Předkapela Strom, vstupné 100 Kč“.
   Oddělovač = první dvojtečka, která není uvnitř času („20:00“ se nedělí). Bez dvojtečky publicText = null.
   Soukromé akce řeší člověk názvem („Soukromá akce“), software je nerozlišuje. */
export const TITLE_MAX = 120;
export const PUBLIC_TEXT_MAX = 300;

// Neviditelné znaky, které se mažou: soft hyphen, zero-width space, LRM/RLM, word joiner, BOM, bidi embedding/isolate.
// Záměrně NE celé \p{Cf}: zero-width joiner (U+200D) a tag znaky drží pohromadě složená emoji (👨‍🎤, vlajky).
const INVISIBLE = [0xad, 0x200b, 0x200e, 0x200f, 0x2060, 0xfeff, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069];
const RE_INVISIBLE = new RegExp("[" + String.fromCharCode.apply(null, INVISIBLE) + "]+", "g");
const RE_BREAKS = /[\p{Cc}\p{Zl}\p{Zp}]+/gu;   // řídicí znaky a zalomení → mezera
const RE_SEPARATOR = /(?<!\d):|:(?!\d)/;      // dvojtečka, která nemá číslici z obou stran
const GRAPHEMES = new Intl.Segmenter("cs", { granularity: "grapheme" });

/** NFC, bez řídicích/neviditelných znaků, jedna mezera, oříznuté okraje. */
export function normalize(s) {
  return String(s == null ? "" : s).normalize("NFC").replace(RE_INVISIBLE, "").replace(RE_BREAKS, " ").replace(/\s+/g, " ").trim();
}

/** Zkrácení na max viditelných znaků (grafémů) – nikdy nerozpůlí emoji ani písmeno s diakritikou. */
export function clip(s, max) {
  var t = normalize(s);
  if (t.length <= max) return t;
  var g = Array.from(GRAPHEMES.segment(t), (x) => x.segment);
  return g.length > max ? g.slice(0, max - 1).join("").trimEnd() + "…" : t;
}

/** Název události → { title, publicText|null }. title může vyjít prázdný (pak se nepublikuje). */
export function splitTitle(summary) {
  var s = normalize(summary);
  var m = RE_SEPARATOR.exec(s);
  var head = m ? s.slice(0, m.index) : s;
  var tail = m ? s.slice(m.index + 1) : "";
  head = head.trim().replace(/\s+-\s+/g, " – "); // „Praha - Klub“ → „Praha – Klub“ (typografická pomlčka)
  tail = tail.trim();
  return { title: clip(head, TITLE_MAX), publicText: tail ? clip(tail, PUBLIC_TEXT_MAX) : null };
}
