// ============================================================
// 64_ProcurementUserConfirmation.gs — Procurement OS — S4.5
// User Confirmation (Constitution P4/P9, ADR-001)
//
// Purpose: channel-agnostic confirmation boundary. Does not know
// about Telegram — that lives in a Telegram Adapter sub-component
// (below) that only handles transport, calling back into this
// module's recordUserResponse(). This module never writes
// PROCUREMENT_REQUESTS directly (Execution still does that) — it
// only produces a ConfirmationRecord for Execution to re-validate.
//
// SLICE 1 SCOPE NOTE: the "proposed snapshot" a confirmation is
// checked against lives on the PROCUREMENT_REQUESTS row itself
// (written once by Execution when it transitions a request to
// AWAITING_CONFIRMATION), not in this module or in CacheService —
// CacheService's 6-hour max TTL cannot reliably span the 24-72 hour
// confirmation windows Constitution 九、D1 anticipates, so durable
// row storage is the only correct choice, not a Slice-1 shortcut.
//
// EXPORTS:
//   ProcurementUserConfirmation.promptConfirmation(requestId, snapshot)
//   ProcurementUserConfirmation.recordUserResponse(requestId, actorId, response)
//     → ConfirmationRecord
//   ProcurementUserConfirmation.checkExpiry(requestId) → boolean (true if expired)
// ============================================================

var ProcurementUserConfirmation = (function () {
  'use strict';

  var VALID_RESPONSES = ['CONFIRM', 'REJECT', 'EXPIRE'];

  function promptConfirmation(requestId, snapshot) {
    var text = _formatPrompt(requestId, snapshot);
    // Transport only — this module decides WHAT to say, the
    // Adapter decides HOW to say it (Q4: Core stays channel-agnostic).
    TelegramConfirmationAdapter.send(text, requestId);
  }

  function recordUserResponse(requestId, actorId, response) {
    if (VALID_RESPONSES.indexOf(response) === -1) {
      throw new Error('recordUserResponse: invalid response "' + response + '".');
    }
    // P4: this function only ever RECORDS what a real caller told it.
    // It has no code path that manufactures CONFIRM on its own — the
    // only caller allowed to pass response=CONFIRM is the Telegram
    // Adapter (or an equivalent future channel adapter) relaying an
    // actual user action, and checkExpiry() below is the only path
    // allowed to pass response=EXPIRE.
    return {
      requestId: requestId,
      response: response,
      actorId: actorId,
      respondedAt: _procNow()
    };
  }

  function checkExpiry(requestId) {
    var row = ProcurementProjection.getProjection(requestId);
    if (!row || row.status !== PROC_CONFIG.STATUS.AWAITING_CONFIRMATION) return false;

    var timeoutHours = PROC_CONFIG.CONFIRMATION_TIMEOUT_HOURS[row.urgency]
      || PROC_CONFIG.CONFIRMATION_TIMEOUT_HOURS.NORMAL;
    var sinceMs = new Date().getTime() - new Date(row.updated_at).getTime();
    var expired = sinceMs > (timeoutHours * 60 * 60 * 1000);

    if (expired) {
      ProcurementExecution.executeExpired(requestId);
    }
    return expired;
  }

  function _formatPrompt(requestId, snapshot) {
    var qtyPart = (snapshot.decided_quantity === null || snapshot.decided_quantity === undefined)
      ? '（数量未知，需要你确认时补充）'
      : ('数量约 ' + snapshot.decided_quantity);
    return '🛒 采购确认 [' + requestId + ']\n'
      + _procEsc(snapshot.canonical_name || snapshot.identity_id) + ' — ' + snapshot.urgency + '\n'
      + qtyPart + '\n\n'
      + '回复 /confirm ' + requestId + ' 确认，或 /reject ' + requestId + ' 拒绝。';
  }

  return {
    promptConfirmation: promptConfirmation,
    recordUserResponse: recordUserResponse,
    checkExpiry: checkExpiry
  };
})();


// ============================================================
// Telegram Adapter (sub-component of 64, per Q4 — NOT part of 69).
// Owns transport only. Never decides CONFIRM/REJECT/EXPIRE itself.
// Replaceable: a future WebUiConfirmationAdapter would implement
// the same send()/the-same-inbound-shape without touching
// ProcurementUserConfirmation at all.
// ============================================================

var TelegramConfirmationAdapter = (function () {
  'use strict';

  function send(text, requestId) {
    // Real deployment: reuse whatever outbound Telegram transport
    // Inventory OS / JARVIS already has (Implementation Readiness —
    // Inventory's own 29_InventoryBridge.gs shows the intended shape
    // but its own sendProcurementRequest()/notifyTelegram() are
    // themselves stubs, so there is no existing *working* outbound
    // call to copy verbatim — only the shape to match). Falling back
    // to console.log keeps this runnable standalone.
    if (typeof UrlFetchApp !== 'undefined' && PROC_CONFIG.TELEGRAM_BOT_TOKEN) {
      // left intentionally unimplemented against a real bot token —
      // wiring a real token is a deployment step, not an architecture
      // decision, and is explicitly not in Slice 1 (Constitution
      // does not mandate a specific bot token handling scheme).
    }
    console.log('[TelegramAdapter→' + requestId + '] ' + text);
  }

  return { send: send };
})();
