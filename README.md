# Supporters Freudental

Anwesenheitserfassungs-PWA für den VfB Stuttgart Fanclub Supporters Freudental.

Erfasst pro Spiel der Saison 2025/26, welche Mitglieder im Stadion waren. Synchronisiert über Google Apps Script in ein gemeinsames Google Sheet, sodass mehrere Personen parallel erfassen können.

## Features

- Kompletter Spielplan 2025/26 vorbefüllt (Bundesliga, DFB-Pokal, Europa League, Supercup)
- Touchoptimierte Oberfläche für mobiles Erfassen am Spieltag
- Auswertungen: Heim/Auswärts getrennt, Anwesenheitsquote, Top-Treueranking pro Wettbewerb
- Offline-fähig (Service Worker), synchronisiert automatisch bei Internetverbindung
- Cloud-Sync über Google Sheets mit Token-Schutz und Audit-Log
- Als PWA auf Android und iOS installierbar (Vollbild-Modus)

## Setup

Siehe `DEPLOY-GITHUB-PAGES.md` für die einmalige Einrichtung des Hostings.

Für das Cloud-Sync-Backend siehe die separate Anleitung im Apps Script `google-apps-script.gs`.

## Sicherheit

Es liegen keine Zugangsdaten im Code. Jeder Nutzer trägt URL und Token einmalig in den App-Einstellungen ein. Das Repository kann öffentlich sein.
