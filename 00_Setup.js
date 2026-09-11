// ============================================================
// 00_Setup.gs — Procurement OS V0.x — One-Time Initialization
//
// Run setupProcurementOS() once from the Apps Script editor to
// create all sheets and headers. Safe to run multiple times —
// idempotent (mirrors Inventory OS 00_Setup.gs exactly).
//
// PREREQUISITE: PROC_CONFIG.SPREADSHEET_ID (00_Config.gs) must be
// set to the shared ecosystem Spreadsheet ID (ADR-002) before
// running this. Left unset on purpose — see 00_Config.gs.
// ============================================================

/**
 * Entry point. Run this once from the Apps Script editor.
 * Creates PROCUREMENT_REQUESTS and PROC_LEDGER sheets.
 * Does NOT create IDENTITY_REGISTRY or TASKS — those belong to
 * Inventory OS / the Shared Kernel (Constitution 三、), and must
 * already exist in the target Spreadsheet before this is run.
 */
function setupProcurementOS() {
  if (!PROC_CONFIG.SPREADSHEET_ID) {
    var msg = 'setupProcurementOS() aborted: PROC_CONFIG.SPREADSHEET_ID '
      + 'is not set (00_Config.gs). This must point at the shared '
      + 'ecosystem Spreadsheet per ADR-002 — set it explicitly, do '
      + 'not run against a blank/wrong Spreadsheet.';
    console.error(msg);
    throw new Error(msg);
  }

  var ss = _getSpreadsheet();

  // Fail loudly if the Shared Kernel tables this project depends on
  // are missing — Procurement OS must never create its own copy of
  // IDENTITY_REGISTRY or TASKS (Constitution 三、"不新建，复用").
  if (!ss.getSheetByName('IDENTITY_REGISTRY')) {
    throw new Error('IDENTITY_REGISTRY not found in target Spreadsheet. '
      + 'Procurement OS must point at the same Spreadsheet Inventory OS '
      + 'already set up (ADR-002) — it does not create this table itself.');
  }
  if (!ss.getSheetByName('TASKS')) {
    throw new Error('TASKS not found in target Spreadsheet. Same as above.');
  }

  _setupSheet(ss, PROC_CONFIG.SHEETS.REQUESTS, PROC_CONFIG.REQUEST_HEADERS);
  _setupSheet(ss, PROC_CONFIG.SHEETS.LEDGER,   PROC_CONFIG.LEDGER_HEADERS);

  var msg = 'Procurement OS V0.x setup complete.\n\n'
    + 'Sheets: PROCUREMENT_REQUESTS, PROC_LEDGER\n'
    + '(IDENTITY_REGISTRY, TASKS confirmed present, not owned here)\n\n'
    + 'Architecture: S1-S9 Domain OS Lifecycle Standard (ADR-000)\n'
    + 'Request → Normalizer → [Identity] → Planner → Decision →\n'
    + '[UserConfirmation] → Execution → Events → Projection';

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
  var firstCell = sheet.getRange(1, 1).getValue();
  if (!firstCell || firstCell === '') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    console.log('Headers set for: ' + sheetName);
  }
  // HIGH finding (Constitution 六、) — force date/timestamp-bearing
  // columns to plain-text so Sheets never silently coerces an ISO
  // string into a Date serial. Applied here, at table-creation time,
  // as a default — not something deferred to "when it breaks".
  var dateCols = _dateColumnsFor(sheetName);
  dateCols.forEach(function (colIndex) {
    sheet.getRange(1, colIndex, sheet.getMaxRows(), 1).setNumberFormat('@');
  });
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
