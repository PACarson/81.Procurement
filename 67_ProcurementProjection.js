// ============================================================
// 67_ProcurementProjection.gs — Procurement OS — S7 Projection
//
// Purpose: maintain the PROCUREMENT_REQUESTS Read Model. Sole
// source of truth for queries (Constitution P5). Only
// 65_ProcurementExecution should call the write-side functions
// here (createRow/updateProjection); reads are open to any layer
// above it (Planner, Bridge, smoke test).
//
// SLICE 1 SCOPE NOTE: notifySubscribers()/pub-sub to Insights is a
// stub — 68_ProcurementInsights is explicitly out of Slice 1 scope
// (State §6).
//
// EXPORTS:
//   ProcurementProjection.createRow(fields) → request_id
//   ProcurementProjection.updateProjection(requestId, changes) → void
//   ProcurementProjection.getProjection(requestId) → row|null
//   ProcurementProjection.findByIdempotencyKey(key, excludeTerminal) → row|null
//   ProcurementProjection.listOpenByIdentity(identityId) → row[]
//   ProcurementProjection.resetRequestCache()
// ============================================================

var ProcurementProjection = (function () {
  'use strict';

  var _cache = null;

  function createRow(fields) {
    var sheet = _requireSheet(PROC_CONFIG.SHEETS.REQUESTS);
    var requestId = 'PR-' + _reserveIdBlock('PROC_REQ_ID', 20, function () { return 0; });
    var R = PROC_CONFIG.R;
    var row = new Array(R.TOTAL_COLS).fill('');
    row[R.REQUEST_ID - 1]              = requestId;
    row[R.IDEMPOTENCY_KEY - 1]         = fields.idempotency_key;
    row[R.IDENTITY_ID - 1]             = fields.identity_id;
    row[R.CANONICAL_NAME - 1]          = fields.canonical_name;
    row[R.SOURCE_DOMAIN - 1]           = fields.source_domain;
    row[R.SOURCE_REFERENCE - 1]        = fields.source_reference;
    row[R.ESTIMATED_QUANTITY - 1]      = (fields.estimated_quantity === null) ? '' : fields.estimated_quantity;
    row[R.UNIT - 1]                    = fields.unit || '';
    row[R.URGENCY - 1]                 = fields.urgency;
    row[R.REASON - 1]                  = fields.reason || '';
    row[R.REQUIRED_BEFORE - 1]         = fields.required_before || '';
    row[R.REQUESTED_AT - 1]            = fields.requested_at;
    row[R.STATUS - 1]                  = fields.status;
    row[R.DECIDED_QUANTITY - 1]        = (fields.decided_quantity === null || fields.decided_quantity === undefined) ? '' : fields.decided_quantity;
    row[R.UPDATED_AT - 1]              = fields.requested_at;
    sheet.appendRow(row);
    _cache = null;
    return requestId;
  }

  function updateProjection(requestId, changes) {
    var sheet = _requireSheet(PROC_CONFIG.SHEETS.REQUESTS);
    var rowIndex = _findRowIndex(requestId);
    if (rowIndex === -1) throw new Error('updateProjection: request_id not found: ' + requestId);
    var R = PROC_CONFIG.R;
    var touchedUpdatedAt = false;
    Object.keys(changes).forEach(function (key) {
      var colConst = key.toUpperCase();
      if (!R[colConst]) throw new Error('updateProjection: unknown column "' + key + '".');
      sheet.getRange(rowIndex, R[colConst]).setValue(changes[key]);
      if (colConst === 'UPDATED_AT') touchedUpdatedAt = true;
    });
    // Auto-bump on every normal write, UNLESS the caller explicitly
    // set updated_at itself (e.g. checkExpiry's timeout math needs
    // "when did this enter AWAITING_CONFIRMATION" to be stable across
    // unrelated writes — see State §Risk Register for why this is
    // flagged as a Slice-2 schema improvement, not fully solved here).
    if (!touchedUpdatedAt) {
      sheet.getRange(rowIndex, R.UPDATED_AT).setValue(_procNow());
    }
    _cache = null;
  }

  function getProjection(requestId) {
    var rows = _allRows();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][PROC_CONFIG.R.REQUEST_ID - 1] === requestId) return _rowToObject(rows[i]);
    }
    return null;
  }

  function findByIdempotencyKey(key, excludeTerminal) {
    var rows = _allRows();
    var terminal = PROC_CONFIG.TERMINAL_STATUSES;
    for (var i = 0; i < rows.length; i++) {
      var obj = _rowToObject(rows[i]);
      if (obj.idempotency_key !== key) continue;
      if (excludeTerminal && terminal.indexOf(obj.status) !== -1) continue;
      return obj;
    }
    return null;
  }

  function listOpenByIdentity(identityId) {
    var rows = _allRows();
    var terminal = PROC_CONFIG.TERMINAL_STATUSES;
    return rows
      .map(_rowToObject)
      .filter(function (o) { return o.identity_id === identityId && terminal.indexOf(o.status) === -1; });
  }

  function rebuildFromEvents(requestId, events) {
    // Emergency-path helper for 66_ProcurementEvents.rebuildProjection().
    // Not exercised by Slice 1's normal-path smoke test.
    console.log('[Projection] rebuildFromEvents stub called for ' + requestId
      + ' (' + events.length + ' events) — full replay logic is a later-slice item.');
  }

  function resetRequestCache() { _cache = null; }

  function _findRowIndex(requestId) {
    var sheet = _getSheet(PROC_CONFIG.SHEETS.REQUESTS);
    if (!sheet) return -1;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return -1;
    var ids = sheet.getRange(2, PROC_CONFIG.R.REQUEST_ID, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (ids[i][0] === requestId) return i + 2; // 1-based, +1 for header row
    }
    return -1;
  }

  function _allRows() {
    if (_cache) return _cache;
    var sheet = _getSheet(PROC_CONFIG.SHEETS.REQUESTS);
    if (!sheet || sheet.getLastRow() < 2) { _cache = []; return _cache; }
    _cache = sheet.getRange(2, 1, sheet.getLastRow() - 1, PROC_CONFIG.R.TOTAL_COLS).getValues();
    return _cache;
  }

  function _rowToObject(r) {
    var R = PROC_CONFIG.R;
    var snapshot = null;
    try { snapshot = JSON.parse(r[R.CONFIRMED_SNAPSHOT_JSON - 1] || 'null'); } catch (e) { snapshot = null; }
    return {
      request_id: r[R.REQUEST_ID - 1],
      idempotency_key: r[R.IDEMPOTENCY_KEY - 1],
      identity_id: r[R.IDENTITY_ID - 1],
      canonical_name: r[R.CANONICAL_NAME - 1],
      source_domain: r[R.SOURCE_DOMAIN - 1],
      source_reference: r[R.SOURCE_REFERENCE - 1],
      estimated_quantity: (r[R.ESTIMATED_QUANTITY - 1] === '') ? null : r[R.ESTIMATED_QUANTITY - 1],
      unit: r[R.UNIT - 1] || null,
      urgency: r[R.URGENCY - 1],
      reason: r[R.REASON - 1] || null,
      required_before: r[R.REQUIRED_BEFORE - 1] || null,
      requested_at: r[R.REQUESTED_AT - 1],
      status: r[R.STATUS - 1],
      decided_quantity: (r[R.DECIDED_QUANTITY - 1] === '') ? null : r[R.DECIDED_QUANTITY - 1],
      confirmed_at: r[R.CONFIRMED_AT - 1] || null,
      confirmed_by: r[R.CONFIRMED_BY - 1] || null,
      confirmed_snapshot: snapshot,
      executed_at: r[R.EXECUTED_AT - 1] || null,
      linked_task_id: r[R.LINKED_TASK_ID - 1] || null,
      closed_at: r[R.CLOSED_AT - 1] || null,
      updated_at: r[R.UPDATED_AT - 1]
    };
  }

  return {
    createRow: createRow,
    updateProjection: updateProjection,
    getProjection: getProjection,
    findByIdempotencyKey: findByIdempotencyKey,
    listOpenByIdentity: listOpenByIdentity,
    rebuildFromEvents: rebuildFromEvents,
    resetRequestCache: resetRequestCache
  };
})();
