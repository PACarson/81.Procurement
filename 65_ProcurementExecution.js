// ============================================================
// 65_ProcurementExecution.gs — Procurement OS — S5 Execution
//
// Purpose: the ONLY module that writes PROCUREMENT_REQUESTS; the
// ONLY LockService holder (Constitution C12). Two entry families:
//   (a) executeIntake — REQUESTED → PLANNED → (AWAITING_CONFIRMATION
//       | CLOSED), including the idempotency check (ADR-003)
//   (b) executeConfirmed / executeRejected / executeExpired /
//       executeCancelled — AWAITING_CONFIRMATION → a terminal state,
//       re-validating the confirmation snapshot (Constitution P9)
//       before executeConfirmed is allowed to reach EXECUTED
//
// HONEST LIMITATION (not glossed over): Apps Script/JS give every
// function returned from an IIFE module *global* callability — there
// is no real cross-file privacy. "Only Execution calls
// ProcurementProjection.updateProjection()" is therefore a
// convention enforced by code review and this Constitution, not a
// platform-enforced boundary. Inventory OS's own C12 has the exact
// same limitation. Slice 1's test harness verifies the NORMAL flow
// never bypasses the gate; it cannot prove bypassing is impossible.
//
// EXPORTS:
//   ProcurementExecution.executeIntake(candidateRequest, idempotencyKey)
//   ProcurementExecution.executeConfirmed(requestId, actorId)
//   ProcurementExecution.executeRejected(requestId, actorId)
//   ProcurementExecution.executeExpired(requestId)
//   ProcurementExecution.executeCancelled(requestId, reason, actorId)
// ============================================================

var ProcurementExecution = (function () {
  'use strict';

  var LOCK_TIMEOUT_MS = 10000;

  function executeIntake(candidateRequest, idempotencyKey) {
    var lock = _acquireLock();
    try {
      // ADR-003 — check and write in the same critical section.
      var existing = ProcurementProjection.findByIdempotencyKey(idempotencyKey, true);
      if (existing) {
        return { requestId: existing.request_id, duplicate: true, status: existing.status };
      }

      // Planner runs BEFORE this request's own row is created — it
      // queries existing open siblings by identity_id+source_domain,
      // and must not be able to find *this* not-yet-created request
      // as a false "sibling" of itself (a real bug caught by actually
      // running this end-to-end, not by inspection — see State
      // §Implementation Readiness).
      var plan = ProcurementPlanner.plan(candidateRequest);

      var requestId = ProcurementProjection.createRow({
        idempotency_key: idempotencyKey,
        identity_id: candidateRequest.identity_id,
        canonical_name: candidateRequest.canonical_name,
        source_domain: candidateRequest.source_domain,
        source_reference: candidateRequest.source_reference,
        estimated_quantity: candidateRequest.estimated_quantity,
        unit: candidateRequest.unit,
        urgency: candidateRequest.urgency,
        reason: candidateRequest.reason,
        required_before: candidateRequest.required_before,
        requested_at: candidateRequest.requested_at,
        status: PROC_CONFIG.STATUS.REQUESTED,
        decided_quantity: null
      });
      ProcurementEvents.record(PROC_CONFIG.EVENTS.REQUESTED, requestId, candidateRequest.identity_id,
        'system', { source_domain: candidateRequest.source_domain, source_reference: candidateRequest.source_reference });

      ProcurementProjection.updateProjection(requestId, { status: PROC_CONFIG.STATUS.PLANNED });
      ProcurementEvents.record(PROC_CONFIG.EVENTS.PLANNED, requestId, candidateRequest.identity_id,
        'system', { hasOpenSibling: plan.hasOpenSibling });

      var decision = ProcurementDecision.decide(plan);
      var result;

      if (decision.recommend) {
        var snapshot = {
          identity_id: candidateRequest.identity_id,
          urgency: decision.decidedUrgency,
          decided_quantity: decision.decidedQuantity
        };
        ProcurementProjection.updateProjection(requestId, {
          status: PROC_CONFIG.STATUS.AWAITING_CONFIRMATION,
          decided_quantity: (decision.decidedQuantity === null) ? '' : decision.decidedQuantity,
          confirmed_snapshot_json: JSON.stringify(snapshot)
        });
        ProcurementEvents.record(PROC_CONFIG.EVENTS.PROPOSED, requestId, candidateRequest.identity_id,
          'system', { rationale: decision.rationale });
        result = { requestId: requestId, duplicate: false, status: PROC_CONFIG.STATUS.AWAITING_CONFIRMATION, decision: decision };
      } else {
        ProcurementProjection.updateProjection(requestId, { status: PROC_CONFIG.STATUS.CLOSED, closed_at: _procNow() });
        ProcurementEvents.record(PROC_CONFIG.EVENTS.CLOSED, requestId, candidateRequest.identity_id,
          'system', { reason: 'not_recommended', rationale: decision.rationale });
        result = { requestId: requestId, duplicate: false, status: PROC_CONFIG.STATUS.CLOSED, decision: decision };
      }
      return result;
    } finally {
      lock.releaseLock();
    }
  }

  function executeConfirmed(requestId, actorId) {
    var lock = _acquireLock();
    try {
      var row = ProcurementProjection.getProjection(requestId);
      if (!row) throw new Error('executeConfirmed: request not found: ' + requestId);

      if (row.status !== PROC_CONFIG.STATUS.AWAITING_CONFIRMATION) {
        // Covers both "too early" (e.g. still PLANNED — test matrix
        // "Unconfirmed execution") and "too late" (already EXECUTED/
        // EXPIRED/etc — test matrix "Duplicate confirmation"). Both
        // reject; neither mutates state further.
        return { requestId: requestId, status: row.status, rejected: true, reason: 'not_awaiting_confirmation' };
      }

      var mismatch = _detectMaterialChange(row.confirmed_snapshot, row);
      if (mismatch) {
        // P9 — old confirmation cannot authorize a changed proposal.
        // Stays in AWAITING_CONFIRMATION; re-prompting is a Bridge-
        // level follow-up action, not something Execution triggers.
        ProcurementEvents.record(PROC_CONFIG.EVENTS.PROPOSED, requestId, row.identity_id, 'system',
          { note: 'confirmation invalidated by material change (P9)', mismatch: mismatch });
        return { requestId: requestId, status: PROC_CONFIG.STATUS.AWAITING_CONFIRMATION, rejected: true, reason: mismatch };
      }

      var nowStr = _procNow();
      ProcurementProjection.updateProjection(requestId, {
        status: PROC_CONFIG.STATUS.EXECUTED,
        confirmed_at: nowStr,
        confirmed_by: actorId || 'unknown',
        executed_at: nowStr
      });
      ProcurementEvents.record(PROC_CONFIG.EVENTS.CONFIRMED, requestId, row.identity_id, actorId || 'unknown', {});
      ProcurementEvents.record(PROC_CONFIG.EVENTS.EXECUTED, requestId, row.identity_id, 'system',
        { note: 'Slice 1: execution = Task handoff, no real purchase (Constitution DD8)' });

      var taskResult = ProcurementBridge.createOrUpdateTask(requestId, row);
      if (taskResult && taskResult.taskId) {
        ProcurementProjection.updateProjection(requestId, { linked_task_id: taskResult.taskId });
      }
      return { requestId: requestId, status: PROC_CONFIG.STATUS.EXECUTED, rejected: false };
    } finally {
      lock.releaseLock();
    }
  }

  function executeRejected(requestId, actorId) {
    return _confirmationTerminalTransition(requestId, PROC_CONFIG.STATUS.REJECTED,
      PROC_CONFIG.EVENTS.REJECTED, actorId || 'unknown');
  }

  function executeExpired(requestId) {
    return _confirmationTerminalTransition(requestId, PROC_CONFIG.STATUS.EXPIRED,
      PROC_CONFIG.EVENTS.EXPIRED, 'system');
  }

  function executeCancelled(requestId, reason, actorId) {
    var lock = _acquireLock();
    try {
      var row = ProcurementProjection.getProjection(requestId);
      if (!row) throw new Error('executeCancelled: request not found: ' + requestId);
      var nonCancellable = [PROC_CONFIG.STATUS.EXECUTED].concat(PROC_CONFIG.TERMINAL_STATUSES);
      if (nonCancellable.indexOf(row.status) !== -1) {
        return { requestId: requestId, status: row.status, rejected: true, reason: 'already_terminal' };
      }
      ProcurementProjection.updateProjection(requestId, { status: PROC_CONFIG.STATUS.CANCELLED, closed_at: _procNow() });
      ProcurementEvents.record(PROC_CONFIG.EVENTS.CANCELLED, requestId, row.identity_id, actorId || 'system', { reason: reason || '' });
      return { requestId: requestId, status: PROC_CONFIG.STATUS.CANCELLED, rejected: false };
    } finally {
      lock.releaseLock();
    }
  }

  // ── internals ────────────────────────────────────────────────

  function _confirmationTerminalTransition(requestId, newStatus, eventType, actorId) {
    var lock = _acquireLock();
    try {
      var row = ProcurementProjection.getProjection(requestId);
      if (!row) throw new Error('Execution: request not found: ' + requestId);
      if (row.status !== PROC_CONFIG.STATUS.AWAITING_CONFIRMATION) {
        return { requestId: requestId, status: row.status, rejected: true, reason: 'not_awaiting_confirmation' };
      }
      ProcurementProjection.updateProjection(requestId, { status: newStatus, closed_at: _procNow() });
      ProcurementEvents.record(eventType, requestId, row.identity_id, actorId, {});
      return { requestId: requestId, status: newStatus, rejected: false };
    } finally {
      lock.releaseLock();
    }
  }

  function _detectMaterialChange(snapshot, freshRow) {
    if (!snapshot) return 'no_snapshot_recorded';
    if (snapshot.identity_id !== freshRow.identity_id) return 'identity_id_changed';
    if (snapshot.urgency !== freshRow.urgency) return 'urgency_changed';

    var oldQ = snapshot.decided_quantity, newQ = freshRow.decided_quantity;
    if (oldQ === null && newQ === null) return null;
    if (oldQ === null || newQ === null) return 'quantity_nullability_changed';

    var pctChange = Math.abs(newQ - oldQ) / Math.max(1, Math.abs(oldQ)) * 100;
    if (pctChange > PROC_CONFIG.QUANTITY_CHANGE_TOLERANCE_PCT) return 'quantity_changed_beyond_tolerance';
    return null;
  }

  function _acquireLock() {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(LOCK_TIMEOUT_MS);
    } catch (e) {
      throw new Error('系统繁忙，请稍后重试。'); // matches Inventory OS's exact user-facing message convention
    }
    return lock;
  }

  return {
    executeIntake: executeIntake,
    executeConfirmed: executeConfirmed,
    executeRejected: executeRejected,
    executeExpired: executeExpired,
    executeCancelled: executeCancelled
  };
})();
