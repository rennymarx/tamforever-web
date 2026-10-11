# tamforever.cz

Web kapely **TAM forever** — pražská pop-rocková legenda.
Statický web — **žádný build, žádné závislosti.** Čisté HTML + CSS + vanilla JS.

## Stav

**Ostrý web od 11. 10. 2026 = verze Gold** (dříve draft `/gold`), nahradila stránku „Coming soon“.

```
/                            titulní stránka (index.html)
/pro-mesta | pro-firmy | pro-svatby   landing pages pro tři typy pořadatelů
/ochrana-osobnich-udaju      zásady GDPR (NÁVRH — doplnit správce: název, IČO, sídlo)
/dekujeme                    po odeslání formuláře (noindex)
404.html                     „Tady se nehraje.“
css/style.css, js/main.js    styly a skripty pro všechny stránky
assets/                      fotky (.webp + menší varianty pro mobil), loga, og-image, favicony
green/                       druhý design „Vlnoplocha“ se STEJNÝM obsahem jako ostrý web (noindex, robots Disallow)
_zaloha/                     zálohy pro pozdější návrat (na webu blokované → 404)
```

## Zálohy (`_zaloha/`)

- `2026-10-11-gold-pred-skrytim-cen/` — Gold i s **ceníkem, cenami u formátů, volnými termíny a boxem „Stáhněte“** (skryto do ověření trhu). Návod k obnově je v jejím README.
- `coming-soon/` — původní titulní stránka „Coming soon“ s animovaným kotlíkem.
- `2026-10-11-green-original/` — Green v původní podobě návrhu (před přenesením obsahu z ostrého webu).

## Úpravy

> **Green drží stejný obsah jako ostrý web.** Při změně textů/fotek na webu je potřeba promítnout je i do `green/` (jiné HTML, stejné texty).


- **Texty:** přímo v HTML. Hromadné úpravy přes Word podklady (`podklady/`, není v Gitu).
- **Fotky:** při výměně obrázku použít **nový název souboru** — `/assets/*` má na Netlify roční cache.
- **Video:** YouTube ID v `index.html` (`data-youtube-id`), přehrávač `youtube-nocookie` se načte až po kliknutí.
- **Lokální náhled:** `python -m http.server 8080` v kořeni repa (v Claude Code přes `.claude/launch.json`) → http://localhost:8080

## Deploy

GitHub `rennymarx/tamforever-web` (main) → Netlify auto-deploy → **https://tamforever.cz**
(HTTPS Let's Encrypt, DNS na Forpsi). Formuláře: Netlify Forms (`poptavka`, `poptavka-mesta`, `poptavka-firmy`, `poptavka-svatby`) → notifikace → Make → HubSpot.
Staré adresy `/gold/*` a `/final/*` přesměrovává `netlify.toml` (301) na ostrý web.
