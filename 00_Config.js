// ============================================================
// 00_Config.gs — Procurement OS V0.x Global Configuration
//
// Single source of truth for all sheet schemas and constants.
// SYNC RULE: any schema change must update Constitution + this file.
//
// Mirrors Inventory OS 00_Config.gs conventions exactly (same
// SPREADSHEET_ID pattern, same 1-based column-index map style,
// same _reserveIdBlock/_now/_esc utilities) — see
// 00_Project_State.gs "Implementation Readiness" for the
// evidence this was copied from real, running code rather than
// invented fresh.
// ============================================================

var PROC_CONFIG = {

  // ADR-002: Persistence temporarily shared with Inventory OS's
  // ecosystem Spreadsheet. This is NOT a bound script (Procurement
  // OS is its own GAS project — ADR-002 Runtime boundary), so this
  // must be set to the real Spreadsheet ID before setupProcurementOS()
  // is run. Left blank here deliberately — do not guess a value.
  SPREADSHEET_ID: '', // TODO: set to the shared ecosystem Spreadsheet ID (ADR-002)

  SHEETS: {
    REQUESTS: 'PROCUREMENT_REQUESTS',
    LEDGER:   'PROC_LEDGER'
    // IDENTITY_REGISTRY / TASKS are NOT owned here — accessed only
    // through CapabilityIdentity.* / the Bridge's Task helpers,
    // never opened directly by Procurement OS (Constitution 三、C12/P3).
  },

  // PROCUREMENT_REQUESTS cols (1-based, 21 total, A–U) — Projection/Read Model
  R: {
    REQUEST_ID:               1,  // A
    IDEMPOTENCY_KEY:          2,  // B
    IDENTITY_ID:              3,  // C
    CANONICAL_NAME:           4,  // D
    SOURCE_DOMAIN:            5,  // E
    SOURCE_REFERENCE:         6,  // F
    ESTIMATED_QUANTITY:       7,  // G  ← nullable (Q3)
    UNIT:                     8,  // H  ← nullable (Q3)
    URGENCY:                  9,  // I
    REASON:                   10, // J  ← nullable (Q3)
    REQUIRED_BEFORE:          11, // K  ← nullable (Q3)
    REQUESTED_AT:             12, // L
    STATUS:                   13, // M
    DECIDED_QUANTITY:         14, // N
    CONFIRMED_AT:             15, // O
    CONFIRMED_BY:             16, // P
    CONFIRMED_SNAPSHOT_JSON:  17, // Q  ← P9 material-change check
    EXECUTED_AT:              18, // R
    LINKED_TASK_ID:           19, // S
    CLOSED_AT:                20, // T
    UPDATED_AT:               21, // U
    TOTAL_COLS:               21
  },

  // PROC_LEDGER cols (1-based, 7 total, A–G) — append-only
  L: {
    EVENT_ID:     1,
    EVENT_TYPE:   2,
    REQUEST_ID:   3,
    IDENTITY_ID:  4,
    ACTOR:        5,
    CONTEXT_JSON: 6,
    RECORDED_AT:  7,
    TOTAL_COLS:   7
  },

  REQUEST_HEADERS: ['request_id', 'idempotency_key', 'identity_id',
    'canonical_name', 'source_domain', 'source_reference',
    'estimated_quantity', 'unit', 'urgency', 'reason',
    'required_before', 'requested_at', 'status', 'decided_quantity',
    'confirmed_at', 'confirmed_by', 'confirmed_snapshot_json',
    'executed_at', 'linked_task_id', 'closed_at', 'updated_at'],

  LEDGER_HEADERS: ['event_id', 'event_type', 'request_id',
    'identity_id', 'actor', 'context_json', 'recorded_at'],

  // Constitution 六、STATUS — 9 states
  STATUS: {
    REQUESTED: 'REQUESTED', PLANNED: 'PLANNED',
    AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
    CONFIRMED: 'CONFIRMED', REJECTED: 'REJECTED', EXPIRED: 'EXPIRED',
    EXECUTED: 'EXECUTED', CLOSED: 'CLOSED', CANCELLED: 'CANCELLED'
  },
  // Terminal = no longer an open/actionable request (used by the
  // Planner aggregation lookup AND the idempotency intake check —
  // ADR-003, File_Map 62/65).
  TERMINAL_STATUSES: ['CLOSED', 'CANCELLED', 'REJECTED', 'EXPIRED'],

  URGENCY: { NORMAL: 'NORMAL', HIGH: 'HIGH', CRITICAL: 'CRITICAL' },

  // Constitution 五、5.3 — 9 fixed event types
  EVENTS: {
    REQUESTED: 'PROCUREMENT_REQUESTED', PLANNED: 'PROCUREMENT_PLANNED',
    PROPOSED: 'PROCUREMENT_PROPOSED', CONFIRMED: 'PROCUREMENT_CONFIRMED',
    REJECTED: 'PROCUREMENT_REJECTED', EXPIRED: 'PROCUREMENT_EXPIRED',
    EXECUTED: 'PROCUREMENT_EXECUTED', CLOSED: 'PROCUREMENT_CLOSED',
    CANCELLED: 'PROCUREMENT_CANCELLED'
  },

  // Constitution 九、D1 — configurable, NOT architectural truth.
  // Deliberately isolated here per the "no magic numbers baked into
  // the state machine" instruction — change these, not the modules.
  CONFIRMATION_TIMEOUT_HOURS: { CRITICAL: 24, HIGH: 48, NORMAL: 72 },

  // Constitution 九、D2 — material-change tolerance, also isolated
  // here rather than hard-coded in 65_ProcurementExecution.
  QUANTITY_CHANGE_TOLERANCE_PCT: 10
};

// ------------------------------------------------------------
// SHARED UTILITIES
// Local copies of Inventory OS's exact proven implementations.
// Kept local (not called cross-project) because these are pure,
// stateless functions with no persisted state of their own — unlike
// Identity, there is no "source of truth" problem in duplicating a
// six-line date formatter. See 00_Project_State.gs Implementation
// Readiness note for why this is NOT the same situation as Identity.
// ------------------------------------------------------------

function _procNow() {
  return Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', "yyyy-MM-dd'T'HH:mm:ss'+08:00'");
}

function _procEsc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Same block-reservation pattern as Inventory OS's _reserveIdBlock
 * (00_Config.gs, fixes audit MEDIUM3 there). PropertiesService is
 * already scoped per-GAS-project, so Procurement OS's own script
 * properties store cannot collide with Inventory OS's even if the
 * same propKey string were reused — a distinct prefix is still used
 * below for readability, not because it is required for safety.
 */
function _reserveIdBlock(propKey, blockSize, bootstrapFn) {
  var props = PropertiesService.getScriptProperties();
  var last  = Number(props.getProperty(propKey));

  if (!last) {
    last = (bootstrapFn ? Number(bootstrapFn()) : 0) || 0;
  }

  var blockStart = last + 1;
  props.setProperty(propKey, String(last + blockSize));
  return blockStart;
}

function _getSpreadsheet() {
  return PROC_CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(PROC_CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

/** Get named sheet; returns null if not found (safe version). */
function _getSheet(sheetName) {
  try { return _getSpreadsheet().getSheetByName(sheetName); }
  catch (e) { return null; }
}

/** Get named sheet; throws if not found (use after setup has run). */
function _requireSheet(sheetName) {
  var sheet = _getSheet(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName + ' — run setupProcurementOS() first.');
  return sheet;
}
