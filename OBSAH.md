# Podklady k doplnění — tamforever.cz (stav po implementaci FINAL_SPEC)

Finalizovaná verze dle `FINAL_SPEC_tamforever_GOLD.md` je v draftu **`/final/`** (root zůstává „Coming soon").
Podklady P1–P8 zatím nedorazily — web používá **čisté fallbacky dle spec** (prvky bez dat
se vůbec nezobrazují; žádná výplňová data, žádné mrtvé odkazy).

## Jak podklady doplnit (2 minuty na položku)

Všechna data se doplňují na **JEDNOM místě**: konfigurační blok `window.TAM`
na začátku [final/index.html](final/index.html) (řádky ~40–65, komentované). Po doplnění
hodnoty se příslušný prvek na webu sám objeví.

| # | Podklad | Kam | Co se pak stane |
|---|---------|-----|-----------------|
| P1 | Volné soboty 2027 (z kalendáře!) | `TAM.dates` | zobrazí se panel „Volné termíny" u formuláře |
| P2 | YouTube ID demo videa | `TAM.videoId` | objeví se play tlačítka (hero + demo), klik = nocookie přehrávač |
| P3 | Fotky (hero 1600px+, persony, reference) | `assets/` + `final/index.html` hero (komentář P3) | nahradí ilustraci pódia |
| P4 | Telefon producenta | `TAM.phone` | klikací tel: odkazy (formulář, PIŠTE, patička, /dekujeme) |
| P5 | IČO + fakturační identita | `TAM.billing` + doplnit správce v [final/ochrana-osobnich-udaju.html](final/ochrana-osobnich-udaju.html) | objeví se v patičce |
| P6 | Streaming/soc. odkazy | `TAM.socials` | odkazy v repertoáru, sekci „Kde hrajeme letos" a patičce |
| P7 | Veřejné koncerty | `TAM.concerts` | zobrazí se sekce „Kde hrajeme letos" |
| P8 | Potvrzení setlistu („Voda živá" 2×?) | `final/index.html` repertoár (komentář P8) | oprava duplikátu |
| P9 | Technický rider PDF | nahrát `assets/tam-forever-rider.pdf` + odstranit `hidden` u `.rider-btn` v final/index.html | tlačítko ke stažení |
| P10 | GDPR text | [final/ochrana-osobnich-udaju.html](final/ochrana-osobnich-udaju.html) — NÁVRH hotový, ke schválení | — |
| P12 | Make → HubSpot napojení | Netlify UI: Forms → notifikace na Make webhook (mimo kód webu) | poptávky do CRM |

## Struktura webu
```
/                     Coming soon (veřejná)
/final/               finalizovaná GOLD (draft, noindex) - kandidát na ostrou verzi
/final/pro-mesta|firmy|svatby   landing pages person
/final/dekujeme       po odeslání formuláře
/final/ochrana-osobnich-udaju   GDPR (návrh k odsouhlasení)
/final/404.html       „Tady se nehraje."
gold/, green/         starší drafty (noindex)
```
