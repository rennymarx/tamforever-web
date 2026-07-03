# Podklady k doplnění — tamforever.cz (stav po implementaci FINAL_SPEC)

Web je finalizovaný dle `FINAL_SPEC_tamforever_GOLD.md` a nasazený jako ostrá homepage.
Podklady P1–P8 zatím nedorazily — web používá **čisté fallbacky dle spec** (prvky bez dat
se vůbec nezobrazují; žádná výplňová data, žádné mrtvé odkazy).

## Jak podklady doplnit (2 minuty na položku)

Všechna data se doplňují na **JEDNOM místě**: konfigurační blok `window.TAM`
na začátku [index.html](index.html) (řádky ~40–65, komentované). Po doplnění
hodnoty se příslušný prvek na webu sám objeví.

| # | Podklad | Kam | Co se pak stane |
|---|---------|-----|-----------------|
| P1 | Volné soboty 2027 (z kalendáře!) | `TAM.dates` | zobrazí se panel „Volné termíny" u formuláře |
| P2 | YouTube ID demo videa | `TAM.videoId` | objeví se play tlačítka (hero + demo), klik = nocookie přehrávač |
| P3 | Fotky (hero 1600px+, persony, reference) | `assets/` + `index.html` hero (komentář P3) | nahradí ilustraci pódia |
| P4 | Telefon producenta | `TAM.phone` | klikací tel: odkazy (formulář, PIŠTE, patička, /dekujeme) |
| P5 | IČO + fakturační identita | `TAM.billing` + doplnit správce v [ochrana-osobnich-udaju.html](ochrana-osobnich-udaju.html) | objeví se v patičce |
| P6 | Streaming/soc. odkazy | `TAM.socials` | odkazy v repertoáru, sekci „Kde hrajeme letos" a patičce |
| P7 | Veřejné koncerty | `TAM.concerts` | zobrazí se sekce „Kde hrajeme letos" |
| P8 | Potvrzení setlistu („Voda živá" 2×?) | `index.html` repertoár (komentář P8) | oprava duplikátu |
| P9 | Technický rider PDF | nahrát `assets/tam-forever-rider.pdf` + odstranit `hidden` u `.rider-btn` v index.html | tlačítko ke stažení |
| P10 | GDPR text | [ochrana-osobnich-udaju.html](ochrana-osobnich-udaju.html) — NÁVRH hotový, ke schválení | — |
| P12 | Make → HubSpot napojení | Netlify UI: Forms → notifikace na Make webhook (mimo kód webu) | poptávky do CRM |

## Struktura webu
```
/                     homepage (finalizovaná GOLD)
/pro-mesta|firmy|svatby   landing pages person
/dekujeme             po odeslání formuláře (noindex)
/ochrana-osobnich-udaju   GDPR (návrh k odsouhlasení)
/404.html             „Tady se nehraje."
green/                zdroj vizuální identity Vlnoplocha (výlep/merch) — na webu 301 → /
```
