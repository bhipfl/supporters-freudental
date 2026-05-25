# Supporters Freudental

Anwesenheitserfassungs-PWA für den VfB Stuttgart Fanclub Supporters Freudental.

Erfasst pro Pflichtspiel, welche Mitglieder im Stadion waren. Synchronisiert über Google Apps Script in ein gemeinsames Google Sheet, sodass mehrere Personen parallel erfassen können.

## Features

- Spielpläne pro Saison auswählbar (aktuell: 2025/26, vorbereitet: 2026/27)
- Pflichtspiele aus Supercup, Bundesliga, DFB-Pokal sowie Champions / Europa League
- Touchoptimierte Oberfläche für mobiles Erfassen am Spieltag
- Auswertungen: Heim/Auswärts getrennt, Anwesenheitsquote, Top-Treueranking pro Wettbewerb
- Offline-fähig (Service Worker), synchronisiert automatisch bei Internetverbindung
- Cloud-Sync über Google Sheets mit Token-Schutz und Audit-Log
- Als PWA auf Android und iOS installierbar (Vollbild-Modus)

## Setup

Siehe `DEPLOY-GITHUB-PAGES.md` für die einmalige Einrichtung des Hostings.

Für das Cloud-Sync-Backend siehe die separate Anleitung im Apps Script `google-apps-script.gs`.

## Spielpläne pflegen

Die Spielpläne liegen als JSON-Dateien im Ordner `fixtures/`. Pro Saison eine Datei plus eine Übersichtsdatei `fixtures/index.json`. Updates spielst du über die normale GitHub-Bearbeitung ein – der Service Worker zieht sie beim nächsten App-Öffnen nach.

### Bestehende Spiele ändern

Öffne `fixtures/2025-26.json` im GitHub-Web-Editor, ändere Datum oder Gegner, "Commit changes". Innerhalb von ein bis zwei Minuten ist die neue Version live.

### Neue Saison anlegen (z. B. wenn der Spielplan 2026/27 verfügbar ist)

1. `fixtures/2026-27.json` öffnen und die `matches`-Liste füllen. Jeder Eintrag hat dieses Schema:
   ```json
   { "id": "bl1", "date": "2026-08-21", "type": "BL", "loc": "A", "opp": "FC Bayern", "round": "1. Spieltag" }
   ```
   - `id` muss innerhalb der Saison eindeutig sein (Konvention: `bl1`…`bl34`, `dfb1`…, `cl1`/`el1`…, `sc1`)
   - `type`: `BL` (Bundesliga), `DFB` (DFB-Pokal), `CL` (Champions League), `EL` (Europa League), `SC` (Supercup)
   - `loc`: `H` (Heim) oder `A` (Auswärts)
2. In `fixtures/index.json` das `current`-Flag der neuen Saison auf `true` setzen und bei der alten auf `false`.
3. `sw.js`: Den Wert `CACHE_NAME` um eine Version hochzählen (z. B. `v3` → `v4`), damit alle Nutzer die neue Datei beim nächsten Öffnen bekommen.
4. Commit – fertig. Die App zeigt die neue Saison automatisch im Dropdown.

### Neue Saison ohne Spielplan

Während die Spiele noch nicht veröffentlicht sind, kann die Saison-Datei einfach mit leerem `matches`-Array existieren. Die App zeigt der Saison dann den Hinweis "Spielplan wird vor Saisonbeginn ergänzt".

## Sicherheit

Es liegen keine Zugangsdaten im Code. Jeder Nutzer trägt URL und Token einmalig in den App-Einstellungen ein. Das Repository kann öffentlich sein.
