# Supporters Freudental - Deployment auf GitHub Pages

Diese Anleitung führt dich Schritt für Schritt durch das Hosting der App auf GitHub Pages, damit sie auf iPhones einwandfrei läuft (CORS-Problem gelöst) und sich auf jedem Gerät als richtige PWA installieren lässt.

Plane circa 20 Minuten für das einmalige Setup ein. Du brauchst nichts auf deinem Computer zu installieren - alles läuft im Browser.

## Was du am Ende hast

Die App liegt unter einer URL wie `https://dein-name.github.io/supporters-freudental/`. Jeder im Team öffnet diese URL einmal, tippt auf "Zum Home-Bildschirm hinzufügen", und ab dann läuft die App im Vollbild wie eine native App. Updates am Code spielst du über GitHub ein und alle bekommen sie automatisch beim nächsten Öffnen.

## Schritt 1: GitHub-Konto anlegen (falls noch nicht vorhanden)

Öffne [github.com](https://github.com) und registriere dich mit deiner E-Mail-Adresse. GitHub ist für öffentliche Repositories kostenlos. Wähle einen Benutzernamen, den du im Fanclub-Kontext verwenden möchtest, zum Beispiel `vfb-freudental`.

## Schritt 2: Neues Repository anlegen

Klicke nach dem Login oben rechts auf das Plus-Symbol und wähle "New repository". Trage als Repository-Name `supporters-freudental` ein. Lass die Beschreibung leer oder schreib "Anwesenheitstool VfB Fanclub Supporters Freudental". Wähle **"Public"** - das ist Voraussetzung für kostenloses GitHub Pages. Setze unten den Haken bei "Add a README file" und klicke auf "Create repository".

## Schritt 3: Dateien hochladen

Im neu erstellten Repository klickst du auf "Add file" und dann "Upload files". Ziehe **alle Dateien aus dem `github-pages`-Ordner** ins Browser-Fenster. Das sind:

- `index.html` - die App selbst
- `manifest.json` - PWA-Beschreibung
- `sw.js` - Service Worker für Offline-Modus
- `icon-192.png`, `icon-512.png` - PWA-Icons
- `apple-touch-icon.png` und die kleineren Varianten - iOS-Icons
- `favicon-16.png`, `favicon-32.png` - Browser-Tab-Icons

Trage unten als Commit-Nachricht "Initial app upload" ein und klicke auf "Commit changes". Die Dateien sind jetzt im Repository.

## Schritt 4: GitHub Pages aktivieren

Klicke im Repository oben auf "Settings". In der linken Seitenleiste wählst du "Pages". Unter "Build and deployment" wählst du als Source **"Deploy from a branch"**. Darunter wählst du den Branch **"main"** und den Ordner **"/ (root)"**. Klicke auf "Save".

Nach ein bis zwei Minuten erscheint oben eine grüne Box mit der URL deiner Seite, etwa `https://dein-name.github.io/supporters-freudental/`. Diese URL ist eure App-Adresse.

## Schritt 5: App auf dem iPhone installieren

Öffne die URL im Safari-Browser auf dem iPhone (nicht in Chrome - die "Zum Home-Bildschirm" Funktion klappt auf iOS nur in Safari richtig). Tippe unten in der Mitte auf das **Teilen-Symbol** (Quadrat mit Pfeil nach oben). Im Menü scrollst du nach unten zu **"Zum Home-Bildschirm"** und tippst es an. Bestätige mit "Hinzufügen".

Auf dem Home-Bildschirm erscheint jetzt das App-Icon. Beim ersten Antippen startet die App im Vollbild ohne Browser-Leiste - das ist der PWA-Standalone-Modus.

Wichtig: ab jetzt öffnet jeder im Team die App über dieses Icon, nicht mehr über Safari. Daten werden zwischen dem Standalone-Modus und dem Safari-Tab nicht geteilt.

## Schritt 6: App auf Android installieren

Öffne die URL in Chrome. Chrome zeigt am unteren Rand automatisch einen Banner "App installieren" - tippe darauf. Alternativ: Drei-Punkte-Menü oben rechts und "Zum Startbildschirm hinzufügen".

## Schritt 7: Cloud-Sync einrichten

Sobald die App installiert ist, geht das Cloud-Sync-Setup genauso wie zuvor: oben rechts aufs Zahnrad, "Cloud-Sync einrichten", Apps-Script-URL, Token und Namen eintragen. Auf iOS funktioniert die Synchronisation jetzt einwandfrei, weil die App von einer richtigen `https://`-Domain läuft.

Falls du das Google-Sheet-Backend noch nicht eingerichtet hast: siehe die Datei `SETUP-ANLEITUNG.md` für die Einrichtung des Google Apps Scripts.

## Wichtig: Token nicht im Repository hinterlegen

Der Apps-Script-Token wird **nicht** im Code gespeichert - jeder Nutzer trägt ihn beim ersten Öffnen der App in den Einstellungen ein. Damit kann das Repository öffentlich auf GitHub liegen, ohne dass das Token kompromittiert wird. Gib das Token nur intern an die berechtigten Personen weiter (per persönlichem Kanal, nicht öffentlich).

Falls jemand den Fanclub verlässt oder das Token kompromittiert wird: ändere den `SECRET_TOKEN` im Apps Script und stelle es neu bereit. Die verbleibenden Nutzer tragen das neue Token in ihrer App-Konfiguration ein.

## Updates ausspielen

Wenn du später Änderungen am Code machst (zum Beispiel neue Saison, Bugfix):

1. Im Repository auf die jeweilige Datei klicken
2. Stift-Symbol oben rechts zum Bearbeiten
3. Änderungen machen, unten "Commit changes" klicken

Innerhalb von ein bis zwei Minuten ist die neue Version live. Beim nächsten Öffnen der App auf den Handys lädt der Service Worker die Updates nach. Bei größeren Updates: in `sw.js` die `CACHE_NAME`-Version hochzählen (zum Beispiel von `v1` auf `v2`), dann werden die Caches der Nutzer zwangsweise erneuert.

## Eigene Domain (optional)

Wenn euer Fanclub eine eigene Domain hat (zum Beispiel `supporters-freudental.de`), kannst du diese mit GitHub Pages verknüpfen: in den Settings unter Pages bei "Custom domain" die Domain eintragen und im DNS einen CNAME-Record auf `dein-name.github.io` setzen. Das spart das hässliche `github.io` in der URL.

## Bei Problemen

**Die Seite zeigt 404:** Warte 5 Minuten nach Aktivierung von Pages, das erste Deployment dauert manchmal. Stelle sicher, dass die Datei wirklich `index.html` heißt (nicht `Index.html` oder `index.HTML`).

**iPhone zeigt App nicht im Vollbild:** Öffne die App über das Home-Bildschirm-Icon, nicht über Safari. Falls schon installiert: Icon löschen, in Safari erneut die URL öffnen, wieder "Zum Home-Bildschirm" hinzufügen.

**Sync-Fehler "Failed to fetch":** Apps-Script-URL prüfen. Im Apps-Script-Editor unter "Bereitstellen" > "Bereitstellung verwalten" prüfen, ob "Wer hat Zugriff" auf "Jeder" steht.

**Sync-Fehler "Ungültiges Token":** Token in der App und im Apps Script vergleichen. Auf Leerzeichen achten.

**Service Worker aktualisiert nicht:** in der App per Zahnrad alle lokalen Daten zurücksetzen, App vom Home-Bildschirm löschen, Browser-Cache leeren, neu installieren.
