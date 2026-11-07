/* Veřejný text = jen název události. Oddělovač je první dvojtečka mimo čas. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitTitle, normalize, TITLE_MAX, PUBLIC_TEXT_MAX } from "../netlify/lib/title.mjs";

const ch = (n) => String.fromCharCode(n);

test("vzorová syntaxe: Město - Klub: doplněk", () => {
  assert.deepEqual(splitTitle("Praha - Klub Rock ballad: Předkapela Strom, naši dlouholetí kamarádi, vstupné 100 Kč"), {
    title: "Praha – Klub Rock ballad",
    publicText: "Předkapela Strom, naši dlouholetí kamarádi, vstupné 100 Kč",
  });
});

test("bez dvojtečky: celý název, žádný doplněk", () => {
  assert.deepEqual(splitTitle("Přelouč – Letní noc"), { title: "Přelouč – Letní noc", publicText: null });
  assert.deepEqual(splitTitle("Soukromá akce"), { title: "Soukromá akce", publicText: null });
});

test("dvojtečka v čase se nedělí, dělí se až další", () => {
  assert.deepEqual(splitTitle("Valtice - Vinobraní, začátek 20:00: Sobotní večer"), { title: "Valtice – Vinobraní, začátek 20:00", publicText: "Sobotní večer" });
  assert.deepEqual(splitTitle("Koncert 20:00 Praha"), { title: "Koncert 20:00 Praha", publicText: null });
});

test("dělí se jen na první dvojtečce; další zůstávají v doplňku", () => {
  assert.deepEqual(splitTitle("Brno: Host: kapela X"), { title: "Brno", publicText: "Host: kapela X" });
  assert.deepEqual(splitTitle("Brno:bez mezery"), { title: "Brno", publicText: "bez mezery" });
});

test("prázdný doplněk → null; prázdná hlava → prázdný title (nepublikuje se)", () => {
  assert.deepEqual(splitTitle("Brno – Klub:   "), { title: "Brno – Klub", publicText: null });
  assert.equal(splitTitle(": jen text").title, "");
  assert.equal(splitTitle("   ").title, "");
  assert.equal(splitTitle(undefined).title, "");
});

test("pomlčka mezi slovy → typografická; spojovník ve slově zůstává", () => {
  assert.equal(splitTitle("Frýdek-Místek - Sokolovna").title, "Frýdek-Místek – Sokolovna");
});

test("řídicí a neviditelné znaky pryč, NFC, jedna mezera", () => {
  const s = "Praha" + ch(0x200b) + " " + ch(0x2028) + " - Klub" + ch(9) + ch(10) + "X:" + ch(0xad) + " text";
  assert.deepEqual(splitTitle(s), { title: "Praha – Klub X", publicText: "text" });
  assert.equal(normalize("Plzen" + ch(0x30c)), "Plzeň"); // n + kombinovaný háček → ň
});

test("délkové limity", () => {
  const r = splitTitle("A".repeat(500) + ": " + "b".repeat(500));
  assert.equal(r.title.length, TITLE_MAX);
  assert.equal(r.publicText.length, PUBLIC_TEXT_MAX);
  assert.ok(r.title.endsWith("…") && r.publicText.endsWith("…"));
});

test("HTML v názvu je jen text (vykresluje se přes textContent)", () => {
  assert.deepEqual(splitTitle("Kolín <3: <b>večer</b>"), { title: "Kolín <3", publicText: "<b>večer</b>" });
});

test("složená emoji zůstanou celá (zero-width joiner se nemaže)", () => {
  const singer = String.fromCodePoint(0x1f468, 0x200d, 0x1f3a4); // 👨‍🎤
  const england = String.fromCodePoint(0x1f3f4, 0xe0067, 0xe0062, 0xe0065, 0xe006e, 0xe0067, 0xe007f);
  const r = splitTitle("Praha - Klub: " + singer + " zpěvák " + england);
  assert.equal(r.publicText, singer + " zpěvák " + england);
});

test("zkrácení nikdy nerozpůlí emoji", () => {
  const guitar = String.fromCodePoint(0x1f3b8);
  const flag = String.fromCodePoint(0x1f1e8, 0x1f1ff); // 🇨🇿
  const t = splitTitle("Praha – Klub " + "x".repeat(105) + guitar.repeat(4)).title;
  assert.ok(t.isWellFormed() && t.endsWith("…"));
  const p = splitTitle("Praha - Klub: " + "a".repeat(297) + " " + flag + " " + flag).publicText;
  assert.ok(p.isWellFormed() && p.endsWith("…"));
  assert.ok(!p.includes(String.fromCodePoint(0x1f1e8) + "…"), "vlajka se nesmí rozpůlit na regionální písmena");
});
