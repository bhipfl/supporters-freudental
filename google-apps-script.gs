/**
 * Supporters Freudental - Google Apps Script Backend (v2)
 * =========================================================
 *
 * Erweitert v1 um Self-Service für Mitglieder:
 *  - jedes Mitglied bekommt einen eigenen Token (Spalte "token" im Mitglieder-Sheet)
 *  - neue Operation setSelfAttendance: ein Mitglied trägt nur sich selbst ein/aus
 *  - Admin (mit ADMIN_TOKEN) kann weiterhin alles wie bisher
 *
 * MIGRATION VON v1 ZU v2:
 *  1. Den kompletten Inhalt dieser Datei in den Apps-Script-Editor pasten
 *     (alte Funktionen ersetzen — die meisten Namen sind kompatibel)
 *  2. ADMIN_TOKEN unten setzen (war früher SECRET_TOKEN)
 *  3. Einmalig im Editor die Funktion migrateExistingMembers() ausführen
 *     -> sie ergänzt die Token-Spalte und generiert Tokens für alle vorhandenen Mitglieder
 *  4. Neue Bereitstellung erzeugen (Bereitstellen > Verwalten > Bearbeiten > neue Version)
 *  5. URL bleibt gleich, kein App-Update der bestehenden Geräte nötig (alte Ops funktionieren weiter)
 *
 * MITGLIEDS-LINKS ERZEUGEN:
 *  - Im Apps-Script-Editor die Funktion logAllMemberLinks() ausführen
 *  - Im Ausführungsprotokoll erscheinen die Links zum Kopieren
 *  - Format: BASE_URL/#u=MEMBER_ID&t=TOKEN
 *  - BASE_URL ist die GitHub-Pages-URL der App
 *
 * SICHERHEIT:
 *  - Der Admin-Token gibt volle Rechte. Den Token NIEMALS in einen Mitglieds-Link packen.
 *  - Member-Tokens dürfen nur die eigene Anwesenheit ändern (per setSelfAttendance).
 *  - Wer Lesezugriff auf das Sheet hat, sieht alle Member-Tokens.
 *    Daher Sheet privat halten und nur an Vertrauenswürdige freigeben.
 */

// >>> HIER EIGENES ADMIN-PASSWORT EINTRAGEN <<<
const ADMIN_TOKEN = 'GEHEIMNIS';

// >>> URL der GitHub-Pages-App (ohne Trailing Slash) <<<
const APP_BASE_URL = 'https://bhipfl.github.io/supporters-freudental';

// Tabellen-Namen
const MEMBERS_SHEET = 'Mitglieder';
const ATTENDANCE_SHEET = 'Anwesenheit';
const AUDIT_SHEET = 'Verlauf';

// ===================================================================
// HTTP-Endpoints
// ===================================================================

/**
 * GET: liefert aktuellen Stand. Tokens werden nur an Admin mitgesendet.
 * Aufruf: <URL>?token=DEIN_TOKEN
 */
function doGet(e) {
  try {
    const token = (e && e.parameter && e.parameter.token) || '';
    const auth = resolveAuth(token);
    if (!auth) return jsonResponse({ok: false, error: 'Ungueltiges Token'});
    const state = getCurrentState(auth.role === 'admin');
    return jsonResponse({ok: true, data: state, role: auth.role, memberId: auth.memberId});
  } catch (err) {
    return jsonResponse({ok: false, error: String(err && err.message || err)});
  }
}

/**
 * POST: wendet Operationen an, liefert neuen Zustand zurück.
 * Body: { token, userName, operations:[...] }
 */
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ok: false, error: 'Ungueltiger JSON-Body'});
  }
  const auth = resolveAuth(body.token || '');
  if (!auth) return jsonResponse({ok: false, error: 'Ungueltiges Token'});

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ops = body.operations || [];
    const userName = String(body.userName || 'unbekannt').slice(0, 60);
    const applied = applyOperations(ops, userName, auth);
    const state = getCurrentState(auth.role === 'admin');
    return jsonResponse({ok: true, data: state, appliedOps: applied, role: auth.role, memberId: auth.memberId});
  } catch (err) {
    return jsonResponse({ok: false, error: String(err && err.message || err)});
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// ===================================================================
// Auth
// ===================================================================

/**
 * Ermittelt Rolle und Mitglieds-ID anhand des Tokens.
 * Returns: {role:'admin', memberId:null} | {role:'member', memberId:'...'} | null
 */
function resolveAuth(token) {
  if (!token) return null;
  if (token === ADMIN_TOKEN) return {role: 'admin', memberId: null};
  const ss = SpreadsheetApp.getActive();
  initSheetsIfNeeded(ss);
  const memSheet = ss.getSheetByName(MEMBERS_SHEET);
  if (memSheet.getLastRow() < 2) return null;
  const data = memSheet.getRange(2, 1, memSheet.getLastRow() - 1, 4).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][3]) === String(token)) {
      return {role: 'member', memberId: String(data[i][0])};
    }
  }
  return null;
}

// ===================================================================
// State lesen
// ===================================================================

function getCurrentState(includeTokens) {
  const ss = SpreadsheetApp.getActive();
  initSheetsIfNeeded(ss);
  const memSheet = ss.getSheetByName(MEMBERS_SHEET);
  const attSheet = ss.getSheetByName(ATTENDANCE_SHEET);

  const members = [];
  if (memSheet.getLastRow() > 1) {
    const memData = memSheet.getRange(2, 1, memSheet.getLastRow() - 1, 4).getValues();
    memData.forEach(row => {
      if (row[0]) {
        const m = {id: String(row[0]), name: String(row[1] || '')};
        if (includeTokens) m.token = String(row[3] || '');
        members.push(m);
      }
    });
  }

  const attendance = {};
  if (attSheet.getLastRow() > 1) {
    const attData = attSheet.getRange(2, 1, attSheet.getLastRow() - 1, 2).getValues();
    attData.forEach(row => {
      const matchId = String(row[0] || '');
      const memberId = String(row[1] || '');
      if (matchId && memberId) {
        if (!attendance[matchId]) attendance[matchId] = [];
        if (attendance[matchId].indexOf(memberId) < 0) attendance[matchId].push(memberId);
      }
    });
  }

  return {members: members, attendance: attendance, syncedAt: new Date().toISOString()};
}

// ===================================================================
// Operationen anwenden
// ===================================================================

function applyOperations(ops, userName, auth) {
  const ss = SpreadsheetApp.getActive();
  initSheetsIfNeeded(ss);
  const memSheet = ss.getSheetByName(MEMBERS_SHEET);
  const attSheet = ss.getSheetByName(ATTENDANCE_SHEET);
  const audSheet = ss.getSheetByName(AUDIT_SHEET);
  const now = new Date();
  let applied = 0;

  ops.forEach(function(op) {
    if (!op || !op.op) return;

    // ---- ADMIN-ONLY OPS ----
    if (op.op === 'addMember') {
      if (auth.role !== 'admin') return;
      const existing = findMemberRow(memSheet, op.id);
      if (existing < 0) {
        const token = generateToken();
        memSheet.appendRow([String(op.id), String(op.name || ''), now, token]);
      } else {
        // Nur Namen updaten, Token nicht überschreiben
        memSheet.getRange(existing, 2).setValue(String(op.name || ''));
      }
      audSheet.appendRow([now, userName, 'addMember', String(op.name || '')]);
      applied++;
    }

    else if (op.op === 'removeMember') {
      if (auth.role !== 'admin') return;
      const row = findMemberRow(memSheet, op.id);
      if (row > 0) {
        const name = memSheet.getRange(row, 2).getValue();
        memSheet.deleteRow(row);
        audSheet.appendRow([now, userName, 'removeMember', String(name)]);
      }
      removeMatchEntriesForMember(attSheet, op.id);
      applied++;
    }

    else if (op.op === 'setAttendance') {
      if (auth.role !== 'admin') return;
      replaceAttendanceForMatch(attSheet, op.matchId, op.memberIds || [], now);
      audSheet.appendRow([now, userName, 'setAttendance',
        'Spiel ' + op.matchId + ': ' + (op.memberIds || []).length + ' Fans']);
      applied++;
    }

    // ---- MEMBER-OP (auch Admin darf das nutzen) ----
    else if (op.op === 'setSelfAttendance') {
      // memberId KOMMT AUS DEM TOKEN, nicht aus dem Body — verhindert dass
      // ein Member sich als jemand anderes eintragen kann.
      const memberId = (auth.role === 'member') ? auth.memberId : String(op.memberId || '');
      if (!memberId) return;
      const matchId = String(op.matchId || '');
      if (!matchId) return;
      const present = !!op.present;
      const changed = setSingleAttendance(attSheet, matchId, memberId, present, now);
      if (changed) {
        const tag = (auth.role === 'member') ? 'self' : 'admin-as-' + memberId;
        audSheet.appendRow([now, userName + ' (' + tag + ')', 'setSelfAttendance',
          'Spiel ' + matchId + ': ' + memberId + ' = ' + (present ? 'dabei' : 'nicht dabei')]);
      }
      applied++;
    }
  });

  return applied;
}

// ===================================================================
// Sheet-Helfer
// ===================================================================

function findMemberRow(memSheet, id) {
  if (memSheet.getLastRow() < 2) return -1;
  const data = memSheet.getRange(2, 1, memSheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function findAttendanceRow(attSheet, matchId, memberId) {
  if (attSheet.getLastRow() < 2) return -1;
  const data = attSheet.getRange(2, 1, attSheet.getLastRow() - 1, 2).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(matchId) && String(data[i][1]) === String(memberId)) {
      return i + 2;
    }
  }
  return -1;
}

function removeMatchEntriesForMember(attSheet, memberId) {
  if (attSheet.getLastRow() < 2) return;
  const data = attSheet.getRange(2, 1, attSheet.getLastRow() - 1, 2).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    if (String(data[i][1]) === String(memberId)) attSheet.deleteRow(i + 2);
  }
}

function replaceAttendanceForMatch(attSheet, matchId, memberIds, now) {
  if (attSheet.getLastRow() > 1) {
    const data = attSheet.getRange(2, 1, attSheet.getLastRow() - 1, 1).getValues();
    for (let i = data.length - 1; i >= 0; i--) {
      if (String(data[i][0]) === String(matchId)) attSheet.deleteRow(i + 2);
    }
  }
  const rows = memberIds.map(function(mid) { return [String(matchId), String(mid), now]; });
  if (rows.length > 0) {
    attSheet.getRange(attSheet.getLastRow() + 1, 1, rows.length, 3).setValues(rows);
  }
}

function setSingleAttendance(attSheet, matchId, memberId, present, now) {
  const existing = findAttendanceRow(attSheet, matchId, memberId);
  if (present && existing < 0) {
    attSheet.appendRow([String(matchId), String(memberId), now]);
    return true;
  }
  if (!present && existing > 0) {
    attSheet.deleteRow(existing);
    return true;
  }
  return false;
}

function initSheetsIfNeeded(ss) {
  if (!ss.getSheetByName(MEMBERS_SHEET)) {
    const s = ss.insertSheet(MEMBERS_SHEET);
    s.appendRow(['id', 'name', 'createdAt', 'token']);
    s.setFrozenRows(1);
    s.getRange('A1:D1').setFontWeight('bold').setBackground('#E32219').setFontColor('#fff');
    s.setColumnWidth(1, 180);
    s.setColumnWidth(2, 220);
    s.setColumnWidth(3, 160);
    s.setColumnWidth(4, 280);
  } else {
    // Bestehende Tabelle: ggf. Token-Spalte ergänzen
    const s = ss.getSheetByName(MEMBERS_SHEET);
    if (s.getLastColumn() < 4) {
      s.getRange(1, 4).setValue('token').setFontWeight('bold').setBackground('#E32219').setFontColor('#fff');
      s.setColumnWidth(4, 280);
    }
  }
  if (!ss.getSheetByName(ATTENDANCE_SHEET)) {
    const s = ss.insertSheet(ATTENDANCE_SHEET);
    s.appendRow(['matchId', 'memberId', 'createdAt']);
    s.setFrozenRows(1);
    s.getRange('A1:C1').setFontWeight('bold').setBackground('#E32219').setFontColor('#fff');
    s.setColumnWidth(1, 130);
    s.setColumnWidth(2, 180);
    s.setColumnWidth(3, 160);
  }
  if (!ss.getSheetByName(AUDIT_SHEET)) {
    const s = ss.insertSheet(AUDIT_SHEET);
    s.appendRow(['Zeitstempel', 'Wer', 'Aktion', 'Details']);
    s.setFrozenRows(1);
    s.getRange('A1:D1').setFontWeight('bold').setBackground('#E32219').setFontColor('#fff');
    s.setColumnWidth(1, 160);
    s.setColumnWidth(2, 180);
    s.setColumnWidth(3, 160);
    s.setColumnWidth(4, 360);
  }
}

// ===================================================================
// Hilfsfunktionen (für den Apps-Script-Editor)
// ===================================================================

function generateToken() {
  // 32-stelliger zufälliger Token: UUID + Zusatz
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 32);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Einmalige Migration von v1 zu v2: ergänzt Token-Spalte und füllt sie für alle
 * bestehenden Mitglieder. Idempotent - kann mehrfach aufgerufen werden.
 * Manuell aus dem Apps-Script-Editor starten.
 */
function migrateExistingMembers() {
  const ss = SpreadsheetApp.getActive();
  initSheetsIfNeeded(ss); // legt Spalte 'token' an falls nötig
  const memSheet = ss.getSheetByName(MEMBERS_SHEET);
  if (memSheet.getLastRow() < 2) {
    Logger.log('Keine Mitglieder vorhanden.');
    return;
  }
  const data = memSheet.getRange(2, 1, memSheet.getLastRow() - 1, 4).getValues();
  let generated = 0;
  data.forEach((row, idx) => {
    if (!row[3]) {
      const token = generateToken();
      memSheet.getRange(idx + 2, 4).setValue(token);
      generated++;
    }
  });
  Logger.log('Tokens generiert: ' + generated + ' (insgesamt ' + data.length + ' Mitglieder)');
}

/**
 * Loggt für alle Mitglieder den persönlichen Login-Link.
 * Manuell aus dem Apps-Script-Editor starten und im Ausführungsprotokoll kopieren.
 * Der Link enthält auch die Apps-Script-URL (s=), sodass die App nichts mehr
 * konfigurieren muss.
 */
function logAllMemberLinks() {
  const scriptUrl = getWebAppExecUrl();
  if (!scriptUrl) {
    Logger.log('FEHLER: Script ist noch nicht bereitgestellt. Erst "Bereitstellen > Web-App" durchführen.');
    return;
  }
  const ss = SpreadsheetApp.getActive();
  const memSheet = ss.getSheetByName(MEMBERS_SHEET);
  if (!memSheet || memSheet.getLastRow() < 2) {
    Logger.log('Keine Mitglieder.');
    return;
  }
  const data = memSheet.getRange(2, 1, memSheet.getLastRow() - 1, 4).getValues();
  data.forEach(row => {
    const id = row[0], name = row[1], token = row[3];
    if (id && token) {
      const link = buildMemberLink(id, token, scriptUrl);
      Logger.log(name + '  ->  ' + link);
    } else if (id && !token) {
      Logger.log(name + '  ->  KEIN TOKEN (migrateExistingMembers() ausführen)');
    }
  });
}

/**
 * Liefert die /exec-URL der deployten Web-App.
 * ScriptApp.getService().getUrl() gibt im Editor-Kontext immer /dev zurück
 * (selbst wenn deployed) - das funktioniert nur für den Script-Besitzer.
 * Für öffentliche Links brauchen wir /exec.
 */
function getWebAppExecUrl() {
  let url = ScriptApp.getService().getUrl();
  if (!url) return '';
  if (url.endsWith('/dev')) url = url.slice(0, -4) + '/exec';
  return url;
}

function buildMemberLink(memberId, token, scriptUrl) {
  return APP_BASE_URL + '/#u=' + encodeURIComponent(memberId)
    + '&t=' + encodeURIComponent(token)
    + '&s=' + encodeURIComponent(scriptUrl);
}

/**
 * Erzeugt einen frischen Token für ein bestehendes Mitglied. Der alte Token wird ungültig.
 * Im Apps-Script-Editor manuell aufrufen, z.B. rotateToken('mp1234abc')
 */
function rotateToken(memberId) {
  const scriptUrl = getWebAppExecUrl();
  const ss = SpreadsheetApp.getActive();
  const memSheet = ss.getSheetByName(MEMBERS_SHEET);
  const row = findMemberRow(memSheet, memberId);
  if (row < 0) { Logger.log('Mitglied nicht gefunden: ' + memberId); return; }
  const token = generateToken();
  memSheet.getRange(row, 4).setValue(token);
  const name = memSheet.getRange(row, 2).getValue();
  Logger.log('Neuer Link fuer ' + name + ':  ' + buildMemberLink(memberId, token, scriptUrl || '(noch nicht bereitgestellt)'));
}

/**
 * Setup-Test - kann vor erster Bereitstellung manuell ausgeführt werden.
 */
function testSetup() {
  const ss = SpreadsheetApp.getActive();
  initSheetsIfNeeded(ss);
  Logger.log('Sheets bereit. Admin-Token: ' + (ADMIN_TOKEN === 'GEHEIMNIS' ? 'BITTE ADMIN_TOKEN AENDERN!' : 'OK'));
  Logger.log('APP_BASE_URL: ' + APP_BASE_URL);
}
