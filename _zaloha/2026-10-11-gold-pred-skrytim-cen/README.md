# Záloha verze Gold před skrytím cen (11. 10. 2026)

Kompletní kopie `gold/` + `assets/` ze stavu, kdy web ještě zobrazoval:

- **ceny** — u tří formátů na podstránkách (`.fcell__price`) a celé sekce „04 · Cena“ s ceníkem (`.hgrid--4` / `.pcell`),
- **volné termíny** na titulní stránce (panel `.dates__head` + `.date-row` vpravo od formuláře),
- box **„Stáhněte“** s odkazy na PDF v úvodu podstránek (`.infobox` + `.dl-list`).

Na ostrém webu je tato složka blokovaná (netlify.toml → 404), v Gitu zůstává.

## Jak si zálohu prohlédnout
Lokální náhled: `http://localhost:8080/_zaloha/2026-10-11-gold-pred-skrytim-cen/gold/`

## Jak ceny vrátit
CSS pro všechny skryté prvky je v `gold/css/style.css` dál (nic se nemazalo), stačí vrátit HTML:
1. ceny u formátů: `<div class="fcell__price">…</div>` za `.fcell__size` (soubory pro-mesta/firmy/svatby.html),
2. ceník: celou `<section …>` s „04 · Cena“ vložit před sekci poptávky a eyebrow poptávky přečíslovat zpět na „05 · Poptávka“,
3. box „Stáhněte“: `<div class="infobox">…</div>` do `<aside class="lhero__aside">` za box Persona (až budou PDF),
4. volné termíny na titulce: `<div>` s `.dates__head` do `.contact__grid` za formulář.
Předlohy jsou 1:1 v této složce.

## Změny textů dodané po záloze (zapracovat při obnově)
- pro-svatby, ceník, buňka „Jen párty (od 19:00)“: popisek „3 sety · 4 hod“ → **„4 sety · 4 hod“** (zadání z 11. 10. 2026).
