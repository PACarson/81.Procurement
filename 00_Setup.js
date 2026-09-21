// ============================================================
// 00_Setup.gs — Procurement OS V0.x — One-Time Initialization
//
// Run setupProcurementOS() once from the Apps Script editor to
// create all sheets and headers. Safe to run multiple times —
// idempotent (mirrors Inventory OS 00_Setup.gs exactly).
//
// SPREADSHEET_ID / TELEGRAM_CHAT_ID / TELEGRAM_BOT_TOKEN now come
// from Script Properties (00_Config.gs, 2026-09-15) — set them via
// Project Settings → Script Properties in the Apps Script editor,
// not by editing 00_Config.gs.
//
// 2026-09-15: setupProcurementOS() now CREATES IDENTITY_REGISTRY and
// TASKS if they are missing, rather than requiring them to pre-exist.
// This is a standalone-testing convenience — see 00_Config.gs's file
// header note on why the IDENTITY_REGISTRY schema created here does
// NOT necessarily match Inventory OS's real, current schema. If this
// Spreadsheet is later pointed at the real shared ecosystem one where
// Inventory OS already owns real IDENTITY_REGISTRY/TASKS tables, this
// function correctly leaves them untouched (see _setupSheet's
// header-already-present check) — it will not overwrite real data or
// headers, only fill in a sheet that's genuinely missing.
// ============================================================

/**
 * Entry point. Run this once from the Apps Script editor.
 * Creates PROCUREMENT_REQUESTS, PROC_LEDGER, and — if not already
 * present — standalone-test versions of IDENTITY_REGISTRY and TASKS.
 */
function setupProcurementOS() {
  var ss = _getSpreadsheet();

  var createdStandaloneKernel = [];
  if (!ss.getSheetByName(PROC_CONFIG.SHEETS.IDENTITY_REGISTRY)) {
    _setupSheet(ss, PROC_CONFIG.SHEETS.IDENTITY_REGISTRY, PROC_CONFIG.IDENTITY_REGISTRY_HEADERS);
    createdStandaloneKernel.push('IDENTITY_REGISTRY');
  }
  if (!ss.getSheetByName(PROC_CONFIG.SHEETS.TASKS)) {
    _setupSheet(ss, PROC_CONFIG.SHEETS.TASKS, PROC_CONFIG.TASKS_HEADERS);
    createdStandaloneKernel.push('TASKS');
  }

  _setupSheet(ss, PROC_CONFIG.SHEETS.REQUESTS, PROC_CONFIG.REQUEST_HEADERS);
  _setupSheet(ss, PROC_CONFIG.SHEETS.LEDGER,   PROC_CONFIG.LEDGER_HEADERS);

  var msg = 'Procurement OS V0.x setup complete.\n\n'
    + 'Sheets: PROCUREMENT_REQUESTS, PROC_LEDGER\n'
    + (createdStandaloneKernel.length
        ? ('Created standalone-test versions of: ' + createdStandaloneKernel.join(', ')
           + '\n(NOTE: IDENTITY_REGISTRY here is NOT necessarily Inventory OS\'s\n'
           + 'real schema — see 00_Config.gs header note — Procurement\'s own\n'
           + 'fallback identity path never reads/writes it anyway.)\n')
        : '(IDENTITY_REGISTRY, TASKS already present, left untouched)\n')
    + '\nArchitecture: S1-S9 Domain OS Lifecycle Standard (ADR-000)\n'
    + 'Request → Normalizer → [Identity] → Planner → Decision →\n'
    + '[UserConfirmation] → Execution → Events → Projection';

  console.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* standalone script */ }
}

/**
 * Standalone utility — (re)apply plain-text formatting to every
 * known date/timestamp column across PROCUREMENT_REQUESTS and
 * PROC_LEDGER, without touching headers or data. Added 2026-09-15
 * after real-GAS testing showed the date columns' Format → Number
 * menu reading "Automatic" rather than "Plain text" post-setup —
 * root cause not fully isolated from this sandbox (see
 * 00_Project_State.gs entry for that date), so this is provided as
 * a direct, safe remedy Steven can run any time regardless of cause,
 * rather than a guess dressed up as a fix. Safe to run repeatedly.
 */
function reformatProcurementDateColumns() {
  var ss = _getSpreadsheet();
  var results = [];
  [PROC_CONFIG.SHEETS.REQUESTS, PROC_CONFIG.SHEETS.LEDGER].forEach(function (sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) { results.push(sheetName + ': NOT FOUND, skipped'); return; }
    var dateCols = _dateColumnsFor(sheetName);
    dateCols.forEach(function (colIndex) {
      sheet.getRange(1, colIndex, sheet.getMaxRows(), 1).setNumberFormat('@');
    });
    results.push(sheetName + ': reformatted ' + dateCols.length + ' column(s)');
  });
  var msg = 'reformatProcurementDateColumns() done:\n' + results.join('\n')
    + '\n\nThis only changes cell FORMAT, not the underlying values already '
    + 'stored — if a date cell was already silently converted to a real '
    + 'Date/serial before this ran, re-formatting the column to plain text '
    + 'will not retroactively turn that specific stored value back into the '
    + 'original ISO string (it will just display the serial as text). New '
    + 'writes going forward will be protected. Existing rows may need a '
    + 'manual re-save (or a small script re-writing them through '
    + '_procNow()-formatted strings) if any already got coerced.';
  console.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* standalone script */ }
}

/**
 * Smoke test for the Slice 1 pipeline. Run from editor after setup
 * to verify Request→Normalizer→Planner→Decision→UserConfirmation→
 * Execution→Events chain end-to-end, using a synthetic request
 * (does NOT depend on real Inventory OS wiring — State §6 Slice 1
 * scope). Mirrors Inventory OS's smokeTestInventoryOS() pattern:
 * plain console.log narration for manual eyeball verification, not
 * an assertion framework.
 */
function smokeTestProcurementOS() {
  console.log('--- Procurement OS Slice 1 Smoke Test ---');

  // NOTE: this calls a fake/local identity resolver stand-in when
  // running standalone without a real CapabilityIdentity available
  // (see 61_ProcurementNormalizer.gs _resolveIdentity for the
  // fallback used only when CapabilityIdentity is undefined).

  var raw = { itemId: 'INV-SMOKE-1', identityId: null, itemName: '猫粮', urgency: 'CRITICAL' };

  var r1 = ProcurementBridge.receiveFromInventory(raw);
  console.log('INTAKE #1: ' + JSON.stringify(r1));

  var r2 = ProcurementBridge.receiveFromInventory(raw); // duplicate delivery
  console.log('INTAKE #2 (duplicate, same key): ' + JSON.stringify(r2));
  console.log('Idempotency held: ' + (r1.requestId === r2.requestId && r2.duplicate === true));

  var confirmResp = handleProcurementCommand('/confirm ' + r1.requestId, 'smoke-test-user');
  console.log('CONFIRM (this already runs Execution internally — see 69_ProcurementBridge handleProcurementCommand): ' + confirmResp);

  var events = ProcurementEvents.getEvents(r1.requestId);
  console.log('EVENTS (' + events.length + '): ' + events.map(function(e){ return e.event_type; }).join(' → '));

  console.log('--- Smoke Test Complete ---');
}

// ------------------------------------------
// INTERNAL SETUP HELPERS (identical pattern to Inventory OS)
// ------------------------------------------

function _setupSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    console.log('Created sheet: ' + sheetName);
  }
  // Format BEFORE writing headers/data — belt-and-suspenders in case
  // GAS's auto-detection ever looks at existing cell content when a
  // value is first written into a still-"Automatic"-formatted cell.
  var dateCols = _dateColumnsFor(sheetName);
  dateCols.forEach(function (colIndex) {
    sheet.getRange(1, colIndex, sheet.getMaxRows(), 1).setNumberFormat('@');
  });

  var firstCell = sheet.getRange(1, 1).getValue();
  if (!firstCell || firstCell === '') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    console.log('Headers set for: ' + sheetName);
  }
}

function _dateColumnsFor(sheetName) {
  var C = PROC_CONFIG.R, L = PROC_CONFIG.L;
  if (sheetName === PROC_CONFIG.SHEETS.REQUESTS) {
    return [C.REQUESTED_AT, C.CONFIRMED_AT, C.EXECUTED_AT, C.CLOSED_AT, C.UPDATED_AT];
  }
  if (sheetName === PROC_CONFIG.SHEETS.LEDGER) {
    return [L.RECORDED_AT];
  }
  return [];
}
