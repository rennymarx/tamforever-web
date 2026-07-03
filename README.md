# tamforever.cz

Web kapely **TAM forever** — hlasitá pop-rocková kapela z Prahy.
Statický web — **žádný build, žádné závislosti.** Čisté HTML + CSS + vanilla JS.

## Stav

- **Root `/` = „Coming soon"** (veřejná titulka s kotlíkem) — jediná indexovaná stránka.
- **Drafty k ladění** (noindex + robots Disallow):
  - **`/final/`** — finalizovaná verze dle `FINAL_SPEC_tamforever_GOLD.md` (Box: `COWORK_Box/TAM forever/`). Kandidát na ostré spuštění.
  - `/gold/` — původní směr A · Letní noc (před finalizací)
  - `/green/` — směr C · Vlnoplocha (zdroj identity pro výlep/merch)

## Struktura /final (kandidát na ostrou verzi)

```
final/
├─ index.html            # homepage — nahoře konfigurační blok window.TAM (podklady P1–P7)
├─ pro-mesta|firmy|svatby.html   # landing pages person
├─ dekujeme.html         # po odeslání formuláře (noindex)
├─ ochrana-osobnich-udaju.html   # GDPR zásady (návrh k odsouhlasení — P10)
├─ 404.html              # „Tady se nehraje."
├─ css/style.css, js/main.js
```
Sdílené assety v `/assets` (logo WebP 27 KB, og-image, favicony).

## Aktualizace obsahu (termíny, koncerty, video, telefon…)

**Jediné místo:** blok `window.TAM` na začátku `final/index.html`. Prázdná hodnota = prvek
se nezobrazí (žádná výplňová data). Detailní tabulka: [OBSAH.md](OBSAH.md).

## Ostré spuštění /final (až budou podklady a schválení)

1. Přesunout obsah `final/` na root (nahradí Coming soon).
2. Odstranit `noindex` meta (označeno komentářem DRAFT) a vrátit absolutní cesty (`../assets` → `assets`, relativní odkazy → hezké URL).
3. robots.txt: povolit vše; sitemap: home + 3 persony + GDPR; 301 pro `/gold` a `/green`.
   (Celý postup umí Claude Code jedním commitem — stačí říct „spouštíme final".)

## Deploy

GitHub `rennymarx/tamforever-web` (main) → Netlify auto-deploy → **https://tamforever.cz**
(HTTPS Let's Encrypt, DNS na Forpsi). Formuláře: Netlify Forms → notifikace → Make → HubSpot (P12).

## Lokální náhled

Dev server `C:\COWORK_Vivo\tools\dev-server.ps1` (port 8085, spouští Claude Code přes preview).
