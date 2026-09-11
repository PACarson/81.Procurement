// ============================================================
// 69_ProcurementBridge.gs — Procurement OS — S9 Bridge
//
// Purpose: sole external-facing window. Inbound: receiveFromInventory
// drives a request through the full pipeline. Outbound: Task
// creation, Telegram transport (delegated to TelegramConfirmationAdapter
// for confirmation-specific messages — this file only handles Task
// creation and the raw send used by that adapter). No business logic,
// no Decision logic, no CONFIRM/REJECT/EXPIRE judgment (that is 64's
// job — Q4). Never acquires a lock itself (Constitution C12).
//
// EXPORTS:
//   ProcurementBridge.receiveFromInventory(rawPayload) → intake result
//   ProcurementBridge.createOrUpdateTask(requestId, row) → {taskId}|null
//
// Also defines the GLOBAL entry point handleProcurementCommand(),
// mirroring Inventory OS's handleInventoryCommand() exactly — a bare
// (non-namespaced) function so it can be called from any entry point
// (Telegram webhook, menu, test), the same way Personal AI Core/
// JARVIS is assumed to call into Inventory OS's equivalent (see
// State §Implementation Readiness — this cross-project assumption is
// explicitly flagged there, not silently assumed to be verified).
// ============================================================

var ProcurementBridge = (function () {
  'use strict';

  function receiveFromInventory(rawPayload) {
    var normalized = ProcurementRequest.receiveRequest('Inventory', rawPayload);
    var intakeResult = ProcurementExecution.executeIntake(normalized, normalized.idempotency_key);

    if (!intakeResult.duplicate && intakeResult.status === PROC_CONFIG.STATUS.AWAITING_CONFIRMATION) {
      // Outside any lock — executeIntake has already returned, this
      // is pure I/O with no data mutation riding on it.
      ProcurementUserConfirmation.promptConfirmation(intakeResult.requestId, {
        identity_id: normalized.identity_id,
        canonical_name: normalized.canonical_name,
        urgency: intakeResult.decision.decidedUrgency,
        decided_quantity: intakeResult.decision.decidedQuantity
      });
    }
    return intakeResult;
  }

  function createOrUpdateTask(requestId, row) {
    // Slice 2 item (State §6 Implementation Sequence) — TASKS is a
    // genuinely shared table whose exact schema was not independently
    // read/verified in this session (Constitution 三、says "不新建，
    // 复用现有共享表" but that presumes knowing its real column
    // layout). Writing to it without that verification would be
    // guessing at a shared resource's shape, which is worse than
    // clearly stubbing it. Left as an explicit, visible stub rather
    // than a silent no-op.
    console.log('[Bridge] (stub) createOrUpdateTask for ' + requestId
      + ' — real TASKS write deferred to Slice 2 pending schema verification.');
    return null;
  }

  return {
    receiveFromInventory: receiveFromInventory,
    createOrUpdateTask: createOrUpdateTask
  };
})();


/**
 * Global command router — call from any entry point (Telegram
 * webhook, menu, test). Mirrors Inventory OS's handleInventoryCommand
 * signature/shape exactly, including returning a plain string meant
 * to be relayed back to the user, not an object.
 */
function handleProcurementCommand(rawCommand, actorId) {
  try {
    var parts = String(rawCommand || '').trim().split(/\s+/);
    var verb = parts[0];
    var requestId = parts[1];

    if (!requestId) return '缺少 request_id。用法：/confirm <request_id> 或 /reject <request_id>';

    if (verb === '/confirm') {
      var confirmRecord = ProcurementUserConfirmation.recordUserResponse(requestId, actorId, 'CONFIRM');
      var execResult = ProcurementExecution.executeConfirmed(requestId, confirmRecord.actorId);
      if (execResult.rejected) {
        return '⚠️ 无法确认 [' + requestId + ']：' + execResult.reason
          + (execResult.status === PROC_CONFIG.STATUS.AWAITING_CONFIRMATION
              ? '（提案已变化，需要重新确认）' : '');
      }
      return '✅ 已确认并执行 [' + requestId + ']';
    }

    if (verb === '/reject') {
      ProcurementUserConfirmation.recordUserResponse(requestId, actorId, 'REJECT');
      var rejectResult = ProcurementExecution.executeRejected(requestId, actorId);
      return rejectResult.rejected
        ? ('⚠️ 无法拒绝 [' + requestId + ']：' + rejectResult.reason)
        : ('已拒绝 [' + requestId + ']');
    }

    return '未知指令：' + verb;
  } catch (e) {
    console.error('[handleProcurementCommand] ' + e.message);
    return '系统错误，请稍后重试或联系管理员。';
  }
}
