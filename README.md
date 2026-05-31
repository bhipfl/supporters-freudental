# Supporters Freudental

Anwesenheitserfassungs-PWA für den VfB Stuttgart Fanclub Supporters Freudental.

Erfasst pro Pflichtspiel, welche Mitglieder im Stadion waren. Synchronisiert über Google Apps Script in ein gemeinsames Google Sheet, sodass mehrere Personen parallel erfassen können.

## Features

- Spielpläne pro Saison auswählbar (aktuell: 2025/26, vorbereitet: 2026/27)
- Pflichtspiele aus Supercup, Bundesliga, DFB-Pokal sowie Champions / Europa League
- Spieltag-Übersicht: prominentes „Nächstes Spiel" mit Countdown und Schnell-Abstimmung
- Abstimmsperre: Mitglieder tragen sich nur bis 7 Tage nach dem Spiel selbst ein (ab Saison 2026/27); Admins jederzeit
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
2. In `fixtures/index.json` das `current`-Flag der neuen Saison auf `true` setzen und bei der alten auf `false`. Bei neuen Saisons das Feld `"voteLockDays": 7` setzen (Abstimmsperre, siehe unten).
3. `sw.js`: Den Wert `CACHE_NAME` um eine Version hochzählen (z. B. `v3` → `v4`), damit alle Nutzer die neue Datei beim nächsten Öffnen bekommen.
4. Commit – fertig. Die App zeigt die neue Saison automatisch im Dropdown.

### Neue Saison ohne Spielplan

Während die Spiele noch nicht veröffentlicht sind, kann die Saison-Datei einfach mit leerem `matches`-Array existieren. Die App zeigt der Saison dann den Hinweis "Spielplan wird vor Saisonbeginn ergänzt".

## Self-Service für Mitglieder (Phase 1)

Mitglieder können sich selbst über einen persönlichen Link in der App eintragen — Admins können weiterhin alles korrigieren wie bisher.

### Rollout-Reihenfolge

1. **Apps Script aktualisieren:** Inhalt von `google-apps-script.gs` (v2) in den Apps-Script-Editor kopieren, `ADMIN_TOKEN` und `APP_BASE_URL` setzen, **„Bereitstellen > Verwalten > Neue Version"** ausführen. Die URL bleibt gleich.
2. **Einmalig im Editor `migrateExistingMembers()` ausführen** — generiert Tokens für alle bestehenden Mitglieder.
3. **`logAllMemberLinks()` ausführen** — gibt im Ausführungsprotokoll alle persönlichen Links aus.
4. **Links per WhatsApp / Mail verteilen** an die jeweiligen Mitglieder.

### Was passiert für die Mitglieder?

- Mitglied tippt seinen Link an → App öffnet sich, identifiziert ihn automatisch (Token aus URL-Fragment wird in localStorage gespeichert).
- App-Banner schlägt Installation auf Startbildschirm / Dock vor.
- In der Match-Detail-Seite ist nur die **eigene Zeile editierbar** (rot umrandet, „du"-Badge); andere Mitglieder werden nur gezeigt, lassen sich aber nicht antippen.
- Die Mitglieder-Verwaltungsseite und „Alle / Keiner"-Buttons sind im Member-Modus ausgeblendet.
- Einstellungen-Modal zeigt nur „Mein Account" mit Logout-Option.

### Token rotieren / neuen Link generieren

Im Apps-Script-Editor `rotateToken('mem-anna')` ausführen. Der alte Token wird damit ungültig.

### Admin-Modus bleibt unverändert

Der Admin trägt seine URL + Admin-Token wie bisher in den App-Einstellungen ein. Er sieht alles, kann alles korrigieren — auch Mitglieder ergänzen, die kein Smartphone haben.

### 3-State Anwesenheit

Jedes Mitglied hat pro Spiel drei mögliche Zustände:
- **Dabei** (✓ grün) — Klick auf ✓-Button
- **Nicht dabei** (✗ rot) — Klick auf ✗-Button
- **Nicht abgestimmt** (grau, „—") — initial bzw. nach erneutem Klick auf den aktiven Button

Der Admin sieht auf der Match-Detail-Seite zusätzlich „Alle dabei" und „Reset" — beides als Massenaktionen für alle Mitglieder.

Im Sheet wird der Status in Spalte D (`status`) gespeichert: `present` oder `absent`. Mitglieder, die nicht abgestimmt haben, haben gar keinen Eintrag.

### Abstimmsperre (7 Tage, ab Saison 26/27)

Damit niemand Wochen später seine Statistik aufhübscht, können sich **Mitglieder nur bis
`voteLockDays` Tage nach dem Spiel** selbst eintragen. Danach sind ihre Vote-Buttons gesperrt
(Hinweis „🔒 Abstimmung seit … geschlossen"). **Admins bleiben uneingeschränkt** und können
jederzeit nachtragen/korrigieren.

- Konfiguriert pro Saison in `fixtures/index.json` über das Feld `"voteLockDays": 7`.
- Ohne das Feld (z. B. Saison 2025/26) gibt es **keine** Sperre — nützlich für laufende Saisons,
  die noch komplett nachgetragen werden.
- Tag 0 bis einschließlich Tag 7 nach dem Spiel sind offen; ab Tag 8 ist gesperrt. Vor dem Spiel
  (Vorab-Abstimmung „Wer kommt mit?") ist immer erlaubt.
- **Rein client-seitig** umgesetzt (App-Oberfläche). Das Apps Script muss dafür nicht angefasst
  werden. Für die meisten Fanclub-Szenarien ausreichend; eine technisch versierte Person könnte
  die reine UI-Sperre theoretisch umgehen (z. B. Gerätedatum). Eine serverseitige Erzwingung wäre
  möglich (Apps Script lädt Termine via `APP_BASE_URL`), ist aber bewusst nicht umgesetzt.

### Migration v2 → v3

Nach dem Update auf v3 muss einmal `migrateAttendanceStatus()` im Apps-Script-Editor ausgeführt werden — das ergänzt die Status-Spalte und füllt bestehende Einträge mit `present`.

## Sicherheit

Es liegen keine Zugangsdaten im Code. Admins tragen den Admin-Token einmalig in den App-Einstellungen ein. Mitglieder bekommen einen personalisierten Link mit eigenem Token. Das Repository kann öffentlich sein.

Tokens stehen im Mitglieder-Tab des Sheets. Halte das Sheet privat und teile es nur mit Vertrauenswürdigen.
