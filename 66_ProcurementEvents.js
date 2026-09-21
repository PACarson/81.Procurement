// ============================================================
// 66_ProcurementEvents.gs — Procurement OS — S6 Events
//
// Purpose: immutable Ledger (PROC_LEDGER). record() appends only —
// never called outside Execution's held lock (Constitution C12).
// getEvents() is a plain read. replayEvents/rebuildProjection exist
// only for the emergency case where Projection is corrupted.
//
// EXPORTS:
//   ProcurementEvents.record(eventType, requestId, identityId, actor, contextObj)
//   ProcurementEvents.getEvents(requestId) → events[]
//   ProcurementEvents.rebuildProjection() → number (rows rebuilt) — emergency use only
// ============================================================

var ProcurementEvents = (function () {
  'use strict';

  var _cache = null; // request-scoped, mirrors Inventory OS A11

  function record(eventType, requestId, identityId, actor, contextObj) {
    var valid = _validEventTypes();
    if (valid.indexOf(eventType) === -1) {
      throw new Error('record: "' + eventType + '" is not one of the 9 fixed event types (Constitution 五、5.3).');
    }
    var sheet = _requireSheet(PROC_CONFIG.SHEETS.LEDGER);
    var eventId = 'PL-' + _reserveIdBlock('PROC_LEDGER_ID', 20, function () { return 0; });
    var row = [];
    row[PROC_CONFIG.L.EVENT_ID - 1]     = eventId;
    row[PROC_CONFIG.L.EVENT_TYPE - 1]   = eventType;
    row[PROC_CONFIG.L.REQUEST_ID - 1]   = requestId;
    row[PROC_CONFIG.L.IDENTITY_ID - 1]  = identityId || '';
    row[PROC_CONFIG.L.ACTOR - 1]        = actor || 'system';
    row[PROC_CONFIG.L.CONTEXT_JSON - 1] = JSON.stringify(contextObj || {});
    row[PROC_CONFIG.L.RECORDED_AT - 1]  = _procNow();
    sheet.appendRow(row);
    if (_cache) _cache = null; // invalidate — cheap and correct beats a stale cache
    return eventId;
  }

  function getEvents(requestId) {
    var rows = _allRows();
    return rows
      .filter(function (r) { return r[PROC_CONFIG.L.REQUEST_ID - 1] === requestId; })
      .map(_rowToEvent);
  }

  function resetRequestCache() { _cache = null; }

  function rebuildProjection() {
    // Emergency use only (Constitution S7/S6). Replays every
    // REQUESTED-through-terminal event per request_id and rewrites
    // ProcurementProjection accordingly. Deliberately not wired into
    // any normal-path call — Slice 1 includes this for completeness
    // of the S6 contract, not because Slice 1 exercises it.
    var rows = _allRows();
    var byRequest = {};
    rows.forEach(function (r) {
      var rid = r[PROC_CONFIG.L.REQUEST_ID - 1];
      (byRequest[rid] = byRequest[rid] || []).push(_rowToEvent(r));
    });
    var rebuilt = 0;
    Object.keys(byRequest).forEach(function (rid) {
      ProcurementProjection.rebuildFromEvents(rid, byRequest[rid]);
      rebuilt++;
    });
    return rebuilt;
  }

  function _allRows() {
    if (_cache) return _cache;
    var sheet = _getSheet(PROC_CONFIG.SHEETS.LEDGER);
    if (!sheet || sheet.getLastRow() < 2) { _cache = []; return _cache; }
    _cache = sheet.getRange(2, 1, sheet.getLastRow() - 1, PROC_CONFIG.L.TOTAL_COLS).getValues();
    return _cache;
  }

  function _rowToEvent(r) {
    var ctx = {};
    try { ctx = JSON.parse(r[PROC_CONFIG.L.CONTEXT_JSON - 1] || '{}'); } catch (e) { /* leave {} */ }
    return {
      event_id: r[PROC_CONFIG.L.EVENT_ID - 1],
      event_type: r[PROC_CONFIG.L.EVENT_TYPE - 1],
      request_id: r[PROC_CONFIG.L.REQUEST_ID - 1],
      identity_id: r[PROC_CONFIG.L.IDENTITY_ID - 1],
      actor: r[PROC_CONFIG.L.ACTOR - 1],
      context: ctx,
      // Defensive read-side coercion (2026-09-15) — see 00_Config.gs.
      recorded_at: _coerceDateString(r[PROC_CONFIG.L.RECORDED_AT - 1])
    };
  }

  function _validEventTypes() {
    var E = PROC_CONFIG.EVENTS;
    return [E.REQUESTED, E.PLANNED, E.PROPOSED, E.CONFIRMED, E.REJECTED,
      E.EXPIRED, E.EXECUTED, E.CLOSED, E.CANCELLED];
  }

  return {
    record: record,
    getEvents: getEvents,
    resetRequestCache: resetRequestCache,
    rebuildProjection: rebuildProjection
  };
})();
