# Obsah webu — co ještě chybí / je skryté

Stav k 11. 10. 2026 (spuštění verze Gold).

| Co | Stav | Kde |
|----|------|-----|
| Ceny (formáty + ceník na podstránkách) | **skryto** do ověření trhu | záloha `_zaloha/2026-10-11-gold-pred-skrytim-cen/` |
| Volné termíny | **skryto** (titulka i podstránky) | tamtéž |
| Box „Stáhněte“ (nabídkový list, rider, smlouva, reference — PDF) | **skryto**, PDF zatím nejsou | tamtéž |
| GDPR — správce údajů (název, IČO, sídlo) | **chybí**, text je návrh | `ochrana-osobnich-udaju.html` |
| Fakturační identita v patičce | chybí | patičky všech stránek |
| Odkazy na Spotify / YouTube / sociální sítě | chybí (v repertoáru je jen text) | `index.html`, sekce Repertoár |
| Reference — jména a čísla | ověřit (citace Žanety, Lukáše, Pepy, Magdy) | titulka + podstránky |
| Koncerty z Google Kalendáře | **v provozu od 7. 11. 2026** (`CONCERTS_ENABLED=true`, akceptace proběhla 7. 11.); zbývá ověření z mobilů před rozesláním návodů | README → „Koncerty z Google Kalendáře“ |
| Zveřejnění koncertu = přesun z „TAM rezervace“ do „TAM koncerty“ | rozhodnuto 6. 11. 2026; od 7. 11. bez šablony: veřejný je jen název (`Město - Klub: doplněk`), místo a čas; popis je interní a nestahuje se; soukromé akce = název „Soukromá akce“ bez místa | README → „Co je na webu“; návody v `podklady/` |
| Tlačítko Vstupenky u koncertů | záměrně nenasazeno (prodej řeší pořadatel); vstupné lze napsat do doplňku za dvojtečkou v názvu | `netlify/lib/title.mjs`, `js/main.js` |

Hotovo: fotky v úvodu a referencích všech stránek, demo video (YouTube), telefon +420 722 929 158, texty dle Word podkladů, tajný setlist v repertoáru, SMS o poptávkách přes Make.
