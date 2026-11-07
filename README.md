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
/api/concerts                JEDINÁ serverová část: Netlify Function (program koncertů z Google Kalendáře)
netlify/functions, netlify/lib   zdroják funkce (bez závislostí, bez package.json)
tests/                       testy funkce (`node --test tests/`) + fixtures s kanárky
tools/dev-server.mjs         lokální náhled včetně /api/concerts
_zaloha/                     zálohy pro pozdější návrat (na webu blokované → 404)
```

## Zálohy (`_zaloha/`)

- `2026-10-11-gold-pred-skrytim-cen/` — Gold i s **ceníkem, cenami u formátů, volnými termíny a boxem „Stáhněte“** (skryto do ověření trhu). Návod k obnově je v jejím README.
- `coming-soon/` — původní titulní stránka „Coming soon“ s animovaným kotlíkem.
- `green/` — design Green (Vlnoplocha) se stavem obsahu k 11. 10. 2026; od 28. 10. 2026 mimo produkci, dál se nerozvíjí. Adresa /green/ přesměrovává na web.
- `2026-10-11-green-original/` — Green v původní podobě návrhu.

## Úpravy


- **Texty:** přímo v HTML. Hromadné úpravy přes Word podklady (`podklady/`, není v Gitu).
- **Fotky:** při výměně obrázku použít **nový název souboru** — `/assets/*` má na Netlify roční cache.
- **Video:** YouTube ID v `index.html` (`data-youtube-id`), přehrávač `youtube-nocookie` se načte až po kliknutí.
- **Lokální náhled:** `node tools/dev-server.mjs` v kořeni repa (v Claude Code přes `.claude/launch.json`) → http://localhost:8080. Bez `.env` servíruje `/api/concerts` z `tests/fixtures/google-events.json`; s `.env` (viz `.env.example`) čte skutečný kalendář.

## Deploy

GitHub `rennymarx/tamforever-web` (main) → Netlify auto-deploy → **https://tamforever.cz**
(HTTPS Let's Encrypt, DNS na Forpsi). Netlify tarif: **Personal (kreditový)** — produkční deploy stojí kredity, proto web nic nedeployuje automaticky (koncerty se čtou za běhu, viz níže).
Formuláře: Netlify Forms (`poptavka`, `poptavka-mesta`, `poptavka-firmy`, `poptavka-svatby`) → e-mail (poptavky@ → producent@, Patrik) + HTTP POST do Make → SMS přes BulkGate na 722 929 158.
Staré adresy `/gold/*`, `/final/*` a `/green/*` přesměrovává `netlify.toml` (301) na ostrý web.

**Kdo má write do `main`, může změnit funkci `/api/concerts` a tím číst celý kalendář (i interní poznámky) nebo vypsat klíč.** Proto: branch protection na `main` + 2FA na GitHubu, žádné cizí push práva.

## Koncerty z Google Kalendáře (`/api/concerts`)

**Dva kalendáře (mechanismus zveřejnění, rozhodnuto 6. 11. 2026):**

| kalendář | kdo píše | kdo čte | web |
|---|---|---|---|
| **TAM rezervace** | kapela + obchodníci (právo úprav) — zapisují rezervace a jednání | všichni sdílení | **nečte** — service account sem není nasdílen |
| **TAM koncerty** | **jen schvalovatelé** (komu Radek dá právo úprav; mění se v čase) | všichni jen „Zobrazit podrobnosti“; service account jen pro čtení | čte jen tento (`GOOGLE_CALENDAR_ID`) |

Potvrzení a zveřejnění koncertu = schvalovatel **přesune událost** z „TAM rezervace“ do „TAM koncerty“ (Upravit → kalendář → Uložit). **Všechno v „TAM koncerty“ jde na web** (časovaná, nezrušená událost s názvem); žádná značka v popisu (rozhodnuto 7. 11. 2026). Obchodník do „TAM koncerty“ zapsat nemůže (aplikace mu ten kalendář v přepínači nenabídne), takže nepotvrzená rezervace se na web nedostane ani omylem. Zelená barva události v rezervacích = „pořadatel potvrdil, ke zveřejnění“ — jen signál pro lidi, kód barvu nečte.
Funkce ACL kalendáře nečte — pojistka drží jen dokud má právo úprav v „TAM koncerty“ jen schvalovatel. **Po každé změně sdílení zkontrolovat:** „TAM koncerty“ → Nastavení → Sdílet s konkrétními lidmi → právo „Provádět změny“ jen schvalovatelé, „spravovat sdílení“ jen marketing@.

**Tok:** Google Kalendář „TAM koncerty“ (soukromý, účet marketing@rennymarx.com, nasdílen service accountu jen pro čtení)
→ Netlify Function `netlify/functions/concerts.mjs` (volá se až při cache miss) → CDN cache Netlify (5 min čerstvé + 2 min stale-while-revalidate) → `js/main.js` `initConcerts()` vykreslí sekci `#koncerty` na titulce.
Prohlížeč nikdy nevolá Google. Ven jde jen DTO: `publicId, title, start, end, location, publicText` — nikdy popis, hosté, organizátor, odkazy. **Popis události funkce od Googlu vůbec nežádá** (`fields=` ho nevyjmenovává), je čistě interní pro kapelu.
Změna v kalendáři **nespouští deploy**; na webu je běžně do 5 minut, nejpozději do ~7 minut (u málo navštěvované stránky obnoví cache až další návštěvník).
Cache klíč nezávisí na query stringu (`Netlify-Vary: query=__none`) — `?v=…` tedy neobchází cache a nevolá Google navíc.
Publikují se jen události **založené přímo v kalendáři „TAM koncerty“** (`organizer.self`); pozvánky přeposlané z cizích kalendářů se nepublikují. `GOOGLE_CALENDAR_ID` musí být ID sekundárního kalendáře (`…@group.calendar.google.com`) — osobní kalendář (e-mail) ani `primary` funkce odmítne (`config`).

**Co je na webu** (žádná šablona; návody: `podklady/kalendar-navod-kapela.md`, `podklady/kalendar-navod-obchodnici.md`):
```
Název:  Praha - Klub Rock ballad: Předkapela Strom, naši dlouholetí kamarádi, vstupné 100 Kč
        └─ název akce na webu ─┘ └─ veřejný doplněk (nepovinný, max 300 znaků) ───────────┘
Místo:  veřejné (odkaz na mapu)          Čas: veřejný (skutečný začátek a konec vystoupení)
Popis:  INTERNÍ pro kapelu — na web nikdy nejde, funkce ho ani nestahuje
```
Pravidla (`netlify/lib/title.mjs`): název se dělí na **první dvojtečce, která není uvnitř času** (`20:00` se nedělí); bez dvojtečky je celý název titulek a doplněk chybí; ` - ` se zobrazí jako `–`; název max 120 znaků. Celodenní, zrušené a bezejmenné události (i ty se soukromou viditelností — Google název čtenáři nepošle) se nezveřejňují.
**Soukromé akce** řeší schvalovatel názvem („Soukromá akce“) — software je nerozlišuje. Na web jde datum, čas a **Místo** → u soukromé akce Místo nevyplňovat (nebo jen město). Název, místo a čas jsou veřejné — editoři „TAM koncerty“ jsou autory veřejného obsahu.

**Nastavení (Netlify → Project configuration → Environment variables, kontext Production; „Contains secret values“ jen u `GOOGLE_PRIVATE_KEY` — u ostatních ne, secret scanning by jinak mohl zablokovat deploy):**
`GOOGLE_CALENDAR_ID` (ID z Nastavení kalendáře → Integrace, ne `primary`), `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (jen PEM blok z JSON klíče, `\n` jako dva znaky je v pořádku), `CONCERTS_ENABLED` (`true`/`false`). Změna env vyžaduje **Trigger deploy**.
Service account `tamforever-calendar-reader@tamforever-web-514014.iam.gserviceaccount.com` v Google Cloud projektu `tamforever-web-514014` (organizace rennymarx.com, účet marketing@; v projektu přepsána org policy `iam.managed.disableServiceAccountKeyCreation` na Off, zbytek organizace beze změny), bez rolí; Netlify projekt `aesthetic-toffee-d9dfe5`; kalendář mu nasdílen „Zobrazení podrobností o události“ (See event details). Podrobný postup: `podklady/google-cloud-navod.md` (lokálně, gitignored). Projekt pod organizací (Workspace, založená po 5/2024) blokuje vytváření klíčů → výjimka v Organization policies jen pro projekt. Scope jen `calendar.events.readonly`.
Kdo může zapisovat do `main`, může změnit funkci a klíč vypsat → na GitHubu zapnout **branch protection** pro `main` a 2FA; klíč nikdy do repa, chatu ani na Drive (jen Netlify env + lokální gitignored `.env`).

**Provoz:**
- *Vypnout sekci (kill switch):* `CONCERTS_ENABLED=false` → Trigger deploy. Funkce vrací 404, sekce i odkaz v menu zmizí.
- *Stažení koncertu:* přesun zpět do „TAM rezervace“ nebo smazat → zmizí běžně do 5 min, nejpozději ~7 min. (Přesun mění Google id → jiný `publicId`; frontend ho nikde neukládá, nevadí.)
- *Akceptace 7. 11. 2026 (zapnuto, `CONCERTS_ENABLED=true`):* `/api/concerts` → 200 `"status":"ok"`, sekce i odkaz v menu se ukázaly. Testovací událost `Test - web: Testovací koncert, za chvíli zmizí` v „TAM koncerty“ → na webu za 124 s jako „Test – web“ + doplněk, popis nikde (API ani stránka); rezervace v „TAM rezervace“ se neobjevila; po smazání zmizela za 246 s (obojí v rámci 5min cache). Zbývá (b)–(d) níže z mobilů.
- *Před rozesláním návodů ověřit na Androidu i iPhonu:* (a) rezervace v „TAM rezervace“ se v `/api/concerts` neobjeví; (b) z účtu obchodníka přepínač kalendáře „TAM koncerty“ nenabídne; (c) schvalovatel přesune událost založenou někým jiným → do 7 min na webu; (d) přesun zpět → zmizí. Výsledky + datum zapsat sem. Nouzově Netlify → Deploys → **Trigger deploy** (nový deploy vyčistí CDN cache i „poslední dobrá data“ v instancích funkce; samotné Purge cache instance nevyčistí).
- *Výpadek Googlu / neplatný klíč:* instance funkce drží poslední dobrá data max 30 min (odpověď má `X-Concerts-Stale: 1`), pak 503 a sekce i odkaz v menu zmizí (žádný chybový banner). Už stažený koncert tak může být vidět nejdéle ~30 min. 503 se na CDN drží 60 s, aby výpadek nespouštěl funkci každým návštěvníkem.
- *Rotace klíče:* nový JSON klíč v Cloud Console → `GOOGLE_PRIVATE_KEY` → Trigger deploy → smazat starý klíč.
- *Diagnostika:* `curl -i https://tamforever.cz/api/concerts` → 200 `"status":"ok"`; v Netlify → Logs → Functions jen agregáty (`concerts ok pages=… published=…`) nebo `concerts error code=…`:

  | kód | význam | co udělat |
  |---|---|---|
  | `config` | chybí env proměnná, nebo `GOOGLE_CALENDAR_ID` není `…@group.calendar.google.com` | zkontrolovat env (Production), Trigger deploy |
  | `bad_key` | `GOOGLE_PRIVATE_KEY` není platný PEM (ořezaný, bez `\n`) | vložit znovu celý blok z JSON klíče |
  | `auth_http_400/401` | Google token odmítl (klíč smazán/rotován, špatný e-mail SA) | nový klíč, ověřit `GOOGLE_SERVICE_ACCOUNT_EMAIL` |
  | `auth_parse` | odpověď tokenu nebyla JSON s `access_token` | přechodné; opakuje se → zkontrolovat klíč |
  | `http_401` | token platný, ale Calendar API ho odmítlo (i po jedné obnově) | zkontrolovat sdílení kalendáře na e-mail SA |
  | `http_403` | Calendar API není v projektu zapnuté, nebo kvóta | Cloud Console → Enable API |
  | `http_404` | špatné ID kalendáře nebo kalendář SA nenasdílen | zkopírovat ID z Nastavení → Integrace |
  | `http_429` / `http_5xx` | Google přetížen (jeden retry už proběhl) | nic; CDN drží stale |
  | `timeout` / `network` | Google neodpověděl do 8 s / celkem 20 s | přechodné |
  | `parse` | odpověď events.list nebyla očekávaný JSON | ověřit, že ID je kalendář (ne e-mail) |
  | `too_many_pages` | víc než 4 × 2500 událostí v okně −12/+24 měsíců | promazat kalendář (web neukáže nic, dokud se nevejde) |
  | `unknown` | neočekávaná výjimka | podívat se do kódu funkce |
- *Testy:* `node --test tests/` (bez sítě; kanárky v `tests/fixtures/` ověřují, že interní data nikam neprosáknou; `tests/endpoint-hardening.test.mjs` pokrývá obcházení cache, neúplné stránkování, 401; `tests/title.test.mjs` dělení názvu, neviditelné znaky, emoji a délkové limity).
- *Okno dat:* −12 / +24 měsíců; archiv „Odehrané koncerty“ tedy ukazuje nejvýš rok zpět.
