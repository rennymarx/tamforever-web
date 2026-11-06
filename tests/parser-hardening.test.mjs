/* Odolnost parseru: prostý text s "<", HTML komentáře/CDATA/script, exotická zalomení, délka vstupu.
   Zásada: nic z toho nesmí buď spolknout oddělovač INTERNÍ:, nebo pustit ven text zpoza něj. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDescription, htmlToLines } from "../netlify/lib/parser.mjs";

const NL = String.fromCharCode(10);
const LS = String.fromCharCode(0x2028); // LINE SEPARATOR
const PS = String.fromCharCode(0x2029); // PARAGRAPH SEPARATOR
const NEL = String.fromCharCode(0x85);
const CANARY = "CANARY_INTERNAL_m3k";

test("prostý text z mobilu: '<3', '->' a 'a < b' nejsou značky a nespolknou oddělovač", () => {
  const r = parseDescription(["WEB: ANO", "VEŘEJNÝ TEXT: Těšíme se <3 -> přijďte", "INTERNÍ:", CANARY].join(NL));
  assert.equal(r.publish, true);
  assert.equal(r.publicText, "Těšíme se <3 -> přijďte");
  const r2 = parseDescription(["WEB: ANO", "VEŘEJNÝ TEXT: a < b", "INTERNÍ:", CANARY].join(NL));
  assert.equal(r2.publicText, "a < b");
  // nepárový "<" v HTML verzi: značka nikdy nepřechází přes konec řádku/odstavce
  const html = "<p>WEB: ANO</p><p>VEŘEJNÝ TEXT: a < b</p><p>INTERNÍ:</p><p>" + CANARY + "</p>";
  const r3 = parseDescription(html);
  assert.equal(r3.publish, true);
  assert.equal(r3.publicText, "a < b");
});

test("HTML komentář ani CDATA nemohou schovat nebo podstrčit oddělovač", () => {
  // oddělovač jen v komentáři → pro parser neexistuje → nepublikovat
  const hidden = "<p>WEB: ANO</p><!-- INTERNÍ: --><p>VEŘEJNÝ TEXT: x</p><p>" + CANARY + "</p>";
  assert.equal(parseDescription(hidden).reason, "no_separator");
  // komentář kolem interní části se odstraní, oddělovač zůstane samostatný řádek → publikuje se jen x
  const ok = "<p>WEB: ANO</p><p>VEŘEJNÝ TEXT: x</p><!-- pozn. --><p>INTERNÍ:</p><p>" + CANARY + "</p>";
  assert.deepEqual(parseDescription(ok), { publish: true, reason: "ok", publicText: "x" });
  // neuzavřený komentář = poškozené HTML → nepublikovat
  assert.equal(parseDescription("<p>WEB: ANO</p><!-- <p>INTERNÍ:</p>").reason, "malformed");
  assert.equal(parseDescription("<p>WEB: ANO</p><![CDATA[ INTERNÍ: ]]><p>VEŘEJNÝ TEXT: y</p>").reason, "no_separator");
  assert.equal(parseDescription("<p>WEB: ANO</p><![CDATA[ INTERNÍ:").reason, "malformed");
});

test("obsah <script>/<style> se zahodí celý a nepůsobí jako oddělovač", () => {
  const r = parseDescription("<p>WEB: ANO</p><script>INTERNÍ:</script><p>VEŘEJNÝ TEXT: " + CANARY + "</p>");
  assert.equal(r.publish, false);
  assert.equal(r.reason, "no_separator");
  assert.equal(parseDescription("<p>WEB: ANO</p><style>x</style><p>INTERNÍ:</p>").publish, true);
  assert.equal(parseDescription("<p>WEB: ANO</p><script>neuzavřeno <p>INTERNÍ:</p>").reason, "malformed");
  assert.equal(parseDescription("<P>WEB: ANO</P><BR>INTERNÍ:<BR>" + CANARY).publish, true); // velká písmena značek
});

test("exotická zalomení (U+2028, U+2029, NEL, CR) fungují jako konec řádku", () => {
  for (const sep of [LS, PS, NEL, "\r", "\r\n"]) {
    const r = parseDescription("WEB: ANO" + sep + "VEŘEJNÝ TEXT: ok" + sep + "INTERNÍ:" + sep + CANARY);
    assert.equal(r.publish, true, JSON.stringify(sep));
    assert.equal(r.publicText, "ok");
  }
  // entita nesmí vyrobit nový řádek (jinak by šlo oddělovač „nalepit“ do hodnoty)
  const r = parseDescription("<p>WEB: ANO&#10;INTERNÍ:</p><p>VEŘEJNÝ TEXT: " + CANARY + "</p>");
  assert.equal(r.publish, false);
  assert.equal(r.publicText, null);
});

test("příliš dlouhý popis → nepublikovat (ne spadnout)", () => {
  const long = "WEB: ANO" + NL + "x".repeat(20000) + NL + "INTERNÍ:";
  assert.equal(parseDescription(long).reason, "malformed");
  assert.equal(htmlToLines(long), null);
  // těsně pod limitem se zpracuje normálně
  const okLen = "WEB: ANO" + NL + "y".repeat(15000) + NL + "INTERNÍ:";
  assert.equal(parseDescription(okLen).publish, true);
});

test("hodnota VEŘEJNÝ TEXT nikdy neobsahuje značky ani text zpoza oddělovače", () => {
  const r = parseDescription("<div>WEB: ANO</div><div>VEŘEJNÝ TEXT: <a href='https://evil.example/" + CANARY + "'>klik</a></div><div>INTERNÍ:</div><div>" + CANARY + "</div>");
  assert.equal(r.publicText, "klik");
  assert.doesNotMatch(JSON.stringify(r), /CANARY|href|</);
});
