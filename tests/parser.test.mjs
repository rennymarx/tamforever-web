import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDescription, htmlToLines } from "../netlify/lib/parser.mjs";

const SEP = "\nINTERNÍ:\nPříjezd 16:00, CANARY_INTERNAL_m3k";

test("WEB: ANO před oddělovačem → publikovat", () => {
  const r = parseDescription("WEB: ANO\nVEŘEJNÝ TEXT: Vstup zdarma." + SEP);
  assert.deepEqual(r, { publish: true, reason: "ok", publicText: "Vstup zdarma." });
});

test("WEB: NE → nepublikovat", () => {
  assert.equal(parseDescription("WEB: NE\nVEŘEJNÝ TEXT: x" + SEP).publish, false);
  assert.equal(parseDescription("WEB: NE" + SEP).reason, "web_not_ano");
});

test("chybějící značka / překlep hodnoty / malá písmena → nepublikovat", () => {
  assert.equal(parseDescription("VEŘEJNÝ TEXT: x" + SEP).reason, "no_web_flag");
  assert.equal(parseDescription("WEB: ANO!" + SEP).reason, "web_not_ano");
  assert.equal(parseDescription("WEB: ano" + SEP).reason, "web_not_ano");
  assert.equal(parseDescription("web: ANO" + SEP).reason, "no_web_flag");
  assert.equal(parseDescription("WEB ANO" + SEP).reason, "no_web_flag");
});

test("chybějící oddělovač INTERNÍ: → nepublikovat", () => {
  assert.equal(parseDescription("WEB: ANO\nVEŘEJNÝ TEXT: x").reason, "no_separator");
  // oddělovač musí být samostatný řádek
  assert.equal(parseDescription("WEB: ANO\nINTERNÍ: poznámka na stejném řádku").reason, "no_separator");
});

test("značka jen v interní části → nepublikovat; nic za oddělovačem se nečte", () => {
  const r = parseDescription("Poznámka\nINTERNÍ:\nWEB: ANO\nVEŘEJNÝ TEXT: CANARY_INTERNAL_m3k");
  assert.equal(r.publish, false);
  assert.equal(r.reason, "no_web_flag");
  assert.equal(r.publicText, null);
});

test("duplicitní nebo protichůdná řídicí pole → nepublikovat", () => {
  assert.equal(parseDescription("WEB: ANO\nWEB: NE" + SEP).reason, "duplicate_web");
  assert.equal(parseDescription("WEB: ANO\nWEB: ANO" + SEP).reason, "duplicate_web");
  assert.equal(parseDescription("WEB: ANO\nVEŘEJNÝ TEXT: a\nVEŘEJNÝ TEXT: b" + SEP).reason, "duplicate_public_text");
});

test("VSTUPENKY: se ignoruje (i vícekrát), ostatní řádky se ignorují a netvoří veřejný text", () => {
  const r = parseDescription("WEB: ANO\nVSTUPENKY: https://goout.net/x\nVSTUPENKY:\nNáhodná poznámka CANARY_NOTE_k8\n" + "VEŘEJNÝ TEXT: Jen tohle." + SEP);
  assert.equal(r.publish, true);
  assert.equal(r.publicText, "Jen tohle.");
});

test("bez VEŘEJNÝ TEXT → publicText null, publikuje se", () => {
  const r = parseDescription("WEB: ANO" + SEP);
  assert.deepEqual(r, { publish: true, reason: "ok", publicText: null });
  assert.equal(parseDescription("WEB: ANO\nVEŘEJNÝ TEXT:" + SEP).publicText, null);
});

test("VEŘEJNÝ TEXT delší než 300 znaků → nepublikovat", () => {
  assert.equal(parseDescription("WEB: ANO\nVEŘEJNÝ TEXT: " + "x".repeat(301) + SEP).reason, "public_text_too_long");
  assert.equal(parseDescription("WEB: ANO\nVEŘEJNÝ TEXT: " + "x".repeat(300) + SEP).publish, true);
});

test("HTML z webového editoru Googlu (<p>, <br>, &nbsp;, <b>, entity)", () => {
  const html = "<p>WEB:&nbsp;ANO</p><p>VSTUPENKY: </p><p>VEŘEJNÝ TEXT: <b>Posvícení</b> &amp; pivní stan &#8211; vstup&nbsp;zdarma.</p><p>INTERNÍ:</p><p>CANARY_INTERNAL_m3k</p>";
  const r = parseDescription(html);
  assert.equal(r.publish, true);
  assert.equal(r.publicText, "Posvícení & pivní stan – vstup zdarma.");
  const br = "WEB: ANO<br>VEŘEJNÝ TEXT: Večer.<br/>INTERNÍ:<br>x";
  assert.equal(parseDescription(br).publicText, "Večer.");
});

test("škodlivé HTML se nespustí ani nepronikne do textu", () => {
  const r = parseDescription("WEB: ANO<script>alert('CANARY_SCRIPT_z1x')</script><br>VEŘEJNÝ TEXT: <img src=x onerror=alert(1)>Ahoj<br>INTERNÍ:");
  assert.equal(r.publish, true);
  assert.equal(r.publicText, "Ahoj");
  assert.doesNotMatch(JSON.stringify(r), /CANARY_SCRIPT|<|onerror/);
});

test("diakritika: NFD vstup a tolerance klíčů bez háčků (INTERNI:, VEREJNY TEXT:)", () => {
  const nfd = "WEB: ANO\nVEŘEJNÝ TEXT: Vstup zdarma.\nINTERNÍ:".normalize("NFD");
  assert.equal(parseDescription(nfd).publicText, "Vstup zdarma.");
  assert.equal(parseDescription("WEB: ANO\nVEREJNY TEXT: Bez háčků.\nINTERNI:").publicText, "Bez háčků.");
});

test("prázdný popis → nepublikovat", () => {
  assert.equal(parseDescription("").reason, "empty");
  assert.equal(parseDescription(null).reason, "empty");
  assert.equal(parseDescription("<p></p><br>").reason, "empty");
});

test("htmlToLines zachová hranice odstavců a ořízne mezery", () => {
  assert.deepEqual(htmlToLines("<p> a </p>\r\n<div>b</div><ul><li>c</li></ul>"), ["a", "b", "c"]);
  assert.deepEqual(htmlToLines("x\n\n\n y "), ["x", "y"]);
});
