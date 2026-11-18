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

```
python -m http.server 8000
```
en open `http://localhost:8000`.

## Opbouw

- `index.html`, `css/app.css`, `js/*.js` (ES-modules, geen build-stap nodig)
- `sw.js` (offline), `manifest.webmanifest` en `icons/` (installeren)
- `vendor/mammoth.browser.min.js` (Word-bestanden lezen, BSD-2-licentie), `fonts/` (Barlow, SIL Open Font License)
