# tamforever.cz

Web kapely **TAM forever** — hlasitá pop-rocková kapela z Prahy.
Postaveno podle design systému v3.1, varianta **A · „Letní noc"**.

Statický web — **žádný build, žádné závislosti.** Čisté HTML + CSS + trocha JavaScriptu.
Otevře se v jakémkoli prohlížeči, nasadí kamkoli.

---

## Struktura

```
tamforever-web/
├─ index.html          # Homepage
├─ pro-mesta.html      # Landing — města a slavnosti (Žaneta)
├─ pro-firmy.html      # Landing — firemní akce (Lukáš)
├─ pro-svatby.html     # Landing — svatby a výročí (Petr & Magda)
├─ dekujeme.html       # Poděkování po odeslání formuláře
├─ css/style.css       # Všechny styly + design tokeny (barvy, fonty)
├─ js/main.js          # Pódiová silueta, mobilní menu, marquee
├─ assets/             # Logo (logo-foil.png = měděná verze na tmavé pozadí)
├─ netlify.toml        # Hezké URL, cache, bezpečnostní hlavičky
├─ robots.txt, sitemap.xml
```

---

## Lokální náhled

Nejjednodušší: **dvakrát klikni na `index.html`** — otevře se v prohlížeči.
(Formulář a hezké URL `/pro-mesta` fungují až po nasazení na Netlify.)

---

## Nasazení na Netlify (doporučeno, zdarma)

### Varianta A — přetažením (nejrychlejší)
1. Jdi na [app.netlify.com/drop](https://app.netlify.com/drop)
2. Přetáhni do okna **celou složku `tamforever-web`**
3. Hotovo — web je online na náhodné adrese `*.netlify.app`

### Varianta B — přes GitHub (doporučeno pro průběžné úpravy)
1. Nahraj složku na GitHub (viz níže)
2. Na Netlify: **Add new site → Import from GitHub → vyber repozitář**
3. Build command nech **prázdný**, publish directory = `.`
4. Každý `git push` od teď web automaticky aktualizuje

---

## Vlastní doména tamforever.cz

Na Netlify: **Site settings → Domain management → Add custom domain** → `tamforever.cz`.
Pak u registrátora domény nastav DNS podle pokynů Netlify (buď Netlify DNS, nebo
A-záznam `75.2.60.5` + CNAME `www`). HTTPS certifikát Netlify vystaví automaticky.

---

## Poptávkový formulář

Formuláře používají **Netlify Forms** — fungují bez serveru, jakmile je web na Netlify.
Odeslané poptávky najdeš v **Netlify → Forms**. Pro e-mailové upozornění:
**Forms → Settings → Form notifications → Add notification → Email**.

Formuláře na stránkách: `poptavka` (homepage), `poptavka-mesta`, `poptavka-firmy`, `poptavka-svatby`.

---

## Časté úpravy obsahu

| Co | Kde |
|---|---|
| Telefon / e-mail | hledej `777 123 456` a `producent@tamforever.cz` ve všech `.html` |
| Písně v repertoáru | `index.html`, sekce `REPERTOÁR` |
| Volné termíny | spodek každé stránky, sekce `date-row` |
| Ceny | landing stránky, sekce `PRICING` |
| Barvy / fonty | `css/style.css` nahoře — blok `:root` (např. `--accent` = sunset amber) |

---

## TODO — doplnit reálný obsah

Web teď používá **placeholdery z design systému**. Před spuštěním doplň:

- [ ] **Reálné foto/video** místo kreslené pódiové siluety (hero + sekce „demo")
- [ ] **Odkaz na demo video** — v `index.html` najdi `TODO: nahraď href` (sekce demo)
- [ ] **PDF ke stažení** (nabídkový list, rider, smlouva, reference) — teď odkazují na formulář
- [ ] **Reálné reference a termíny** — ověřit města, citace a volné soboty
- [ ] Odkazy na **Spotify / YouTube / Instagram** do patičky
- [ ] Volitelně: ikona webu (favicon) z loga místo provizorního ∞

---

## Spuštění na ostrou doménu (tamforever.cz)

Web teď běží jako **skrytá staging verze** — neindexuje se Googlem. Při ostrém spuštění:

1. Ve `index.html`, `pro-mesta.html`, `pro-firmy.html`, `pro-svatby.html` **odstranit** řádek
   `<meta name="robots" content="noindex, nofollow" />` (označený komentářem `STAGING`).
2. V `robots.txt` vrátit `Disallow: /` zpět na `Allow: /`.
3. Na Netlify přidat doménu `tamforever.cz`; u Forpsi nastavit DNS (A záznam na IP Netlify + CNAME `www`).

Body 1–2 udělá Claude jedním commitem, až řekneš „spouštíme". Viz také [OBSAH.md](OBSAH.md).

---

## Co je hotové

Homepage + 3 landing stránky · plně responzivní (mobil/tablet/desktop) · funkční formulář ·
SEO (meta description, Open Graph, sitemap) · přístupnost (mobilní menu, focus stavy, alt texty).
