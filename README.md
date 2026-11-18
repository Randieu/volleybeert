# VolleyBeert

Offline webapp voor volleybaltrainers: **Team**, **Opstelling**, **Tactiekbord** en **Trainingen**.
Werkt op iPhone, iPad en Android (en op de computer). Alles wordt alleen op het eigen apparaat bewaard; delen gaat via bestanden (`.volleybeert.json`).

## Online zetten met GitHub Pages (eenmalig, ± 10 minuten)

1. Maak op github.com een nieuwe repository, bijvoorbeeld `volleybeert` (Public).
2. Zet de inhoud van deze map in die repository, bijvoorbeeld met GitHub Desktop of vanuit deze map:
   ```
   git init
   git add .
   git commit -m "VolleyBeert 1.0"
   git branch -M main
   git remote add origin https://github.com/<jouw-gebruikersnaam>/volleybeert.git
   git push -u origin main
   ```
3. Op GitHub: **Settings › Pages › Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, map `/ (root)`. Opslaan.
4. Na een minuut staat de app op `https://<jouw-gebruikersnaam>.github.io/volleybeert/`.

De code is openbaar, je gegevens niet: trainingen, teams en borden staan alleen op de telefoon of tablet van de gebruiker.

## Installeren op telefoon of tablet

- **iPhone/iPad:** open de link in Safari › deelknop › *Zet op beginscherm*.
- **Android:** open de link in Chrome › menu ⋮ › *App installeren*.

Daarna werkt de app ook zonder internet (bijvoorbeeld in de sporthal).

## Nieuwe versie uitbrengen

Pas bestanden aan, verhoog `CACHE` in `sw.js` (bijv. `volleybeert-v1.0.1`) en push. Gebruikers krijgen de nieuwe versie de volgende keer dat ze de app openen met internet; na sluiten en opnieuw openen is hij actief.

## Lokaal testen

Gewoon in de browser op de computer kan prima. Start vanuit deze map een webservertje
(dubbelklikken op `index.html` werkt níet, ES-modules en de service worker hebben een server nodig):

```
python -m http.server 8000
```
en open `http://localhost:8000` in Chrome of Edge.

- **Telefoon/tablet nabootsen:** druk F12 › klik het telefoon-icoon (*Toggle device toolbar*, Ctrl+Shift+M) en kies bijv. iPhone of iPad. Dan kun je ook met "touch" slepen op het tactiekbord.
- **Wijzigingen zien:** de service worker bewaart de app in de cache. Na het aanpassen van bestanden: F12 › *Application* › *Service workers* › vink *Update on reload* aan, of doe Ctrl+Shift+R.
- **Opnieuw beginnen:** F12 › *Application* › *Storage* › *Clear site data* wist alle lokale gegevens (teams, borden, pincode).
- **Op je eigen telefoon in hetzelfde wifi-netwerk:** start de server met `python -m http.server 8000 --bind 0.0.0.0` en open `http://<ip-van-je-pc>:8000` (ip vind je met `ipconfig`). Let op: via een ip-adres zonder https werken offline-gebruik en *installeren* niet; voor die twee test je de echte GitHub Pages-link.

## Opbouw

- `index.html`, `css/app.css`, `js/*.js` (ES-modules, geen build-stap nodig)
- `sw.js` (offline), `manifest.webmanifest` en `icons/` (installeren)
- `vendor/mammoth.browser.min.js` (Word-bestanden lezen, BSD-2-licentie), `fonts/` (Barlow, SIL Open Font License)
