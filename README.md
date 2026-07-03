# tamforever.cz

Web kapely **TAM forever** — hlasitá pop-rocková kapela z Prahy.
Design systém v3.1, směr **A · „Letní noc" (GOLD)** — finalizováno dle `FINAL_SPEC_tamforever_GOLD.md`
(Box: `COWORK_Box/TAM forever/`).

Statický web — **žádný build, žádné závislosti.** Čisté HTML + CSS + vanilla JS.

---

## Struktura

```
tamforever-web/
├─ index.html            # Homepage (ostrá) — nahoře konfigurační blok window.TAM (podklady P1–P7)
├─ pro-mesta.html        # Landing — města a slavnosti (Žaneta)
├─ pro-firmy.html        # Landing — firemní akce (Lukáš)
├─ pro-svatby.html       # Landing — svatby a výročí (Petr & Magda)
├─ dekujeme.html         # Po odeslání formuláře (noindex, měření konverzí)
├─ ochrana-osobnich-udaju.html  # GDPR zásady (návrh k odsouhlasení — P10)
├─ 404.html              # „Tady se nehraje."
├─ css/style.css         # Styly + design tokeny (paleta GOLD, fonty)
├─ js/main.js            # Render podkladů z window.TAM, video facade, sticky CTA, menu
├─ assets/               # logo-foil.webp (27 KB), og-image.jpg, favicony, zdrojová PNG loga
├─ green/                # Vizuální identita „Vlnoplocha" (výlep/merch) — na webu 301 → /
├─ netlify.toml          # 301 /gold+/green → /, hezké URL, cache, security hlavičky
├─ robots.txt            # Indexace povolena (Disallow jen /dekujeme)
├─ sitemap.xml           # home + 3 persony + GDPR
└─ OBSAH.md              # Jak doplnit podklady P1–P12 (tabulka s přesnými místy)
```

## Aktualizace obsahu (termíny, koncerty, video, telefon…)

**Jediné místo:** blok `window.TAM` na začátku `index.html`. Prázdná hodnota = prvek
se nezobrazí (žádná výplňová data). Detailní tabulka: [OBSAH.md](OBSAH.md).

## Deploy

GitHub `rennymarx/tamforever-web` (main) → Netlify auto-deploy → **https://tamforever.cz**
(HTTPS Let's Encrypt, DNS na Forpsi). Formuláře: Netlify Forms (`poptavka`,
`poptavka-mesta/-firmy/-svatby`) → notifikace → Make → HubSpot (P12).

## Lokální náhled

Bez buildu — `index.html` jde otevřít přímo. Pro hezké URL a formulářové chování
slouží dev server `C:\COWORK_Vivo\tools\dev-server.ps1` (port 8085, spouští Claude Code
přes preview).
