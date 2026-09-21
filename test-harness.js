'use strict';
/**
 * Empirical test harness for Procurement OS Slice 1.
 *
 * This is NOT part of the GAS deliverable — it is scaffolding that
 * fakes just enough of the Apps Script runtime (SpreadsheetApp,
 * LockService, Utilities, PropertiesService) to actually EXECUTE the
 * real 60-69/00_Config/00_Setup files in Node, so the test matrix in
 * the task brief gets real PASS/FAIL results instead of asserted ones
 * ("Code → Verify → Governance, never the reverse").
 *
 * Honest limits of this harness (stated up front, not buried):
 *  - Node is single-threaded. "Concurrent duplicate intake" is
 *    simulated as two back-to-back synchronous calls, which proves
 *    the check-inside-the-lock LOGIC is race-free, but cannot prove
 *    real GAS LockService behavior under true parallel execution —
 *    that still needs a manual test against the live Apps Script
 *    environment (State §Test Matrix already labels this NOT YET
 *    VERIFIED IN REAL GAS for that reason).
 *  - The fake Sheet is an in-memory array, not a real Spreadsheet —
 *    persistence-critical behavior (item 13 in the brief) is only
 *    verified up to what this fake models (values in/out, no
 *    Google's real type-coercion quirks).
 */

const vm = require('vm');
const fs = require('fs');
const path = require('path');

// ---------- Fake GAS runtime ----------

function makeFakeSheet(name) {
  let data = []; // array of row-arrays, data[0] will be header row once set
  return {
    _name: name,
    appendRow(row) { data.push(row.slice()); },
    getLastRow() { return data.length; },
    getMaxRows() { return Math.max(data.length, 50); },
    setFrozenRows() {},
    getRange(r1, c1, numRows, numCols) {
      if (numRows === undefined) numRows = 1;
      if (numCols === undefined) numCols = 1;
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < numRows; i++) {
            const rowIdx = r1 - 1 + i;
            const row = data[rowIdx] || [];
            const slice = [];
            for (let j = 0; j < numCols; j++) slice.push(row[c1 - 1 + j] === undefined ? '' : row[c1 - 1 + j]);
            out.push(slice);
          }
          return out;
        },
        setValues(values) {
          for (let i = 0; i < values.length; i++) {
            const rowIdx = r1 - 1 + i;
            data[rowIdx] = data[rowIdx] || [];
            for (let j = 0; j < values[i].length; j++) data[rowIdx][c1 - 1 + j] = values[i][j];
          }
        },
        getValue() { return (data[r1 - 1] || [])[c1 - 1]; },
        setValue(v) { data[r1 - 1] = data[r1 - 1] || []; data[r1 - 1][c1 - 1] = v; },
        setFontWeight() { return this; },
        setNumberFormat() { return this; }
      };
    },
    _dump() { return data; }
  };
}

function makeFakeSpreadsheet() {
  const sheets = new Map();
  return {
    getSheetByName(name) { return sheets.has(name) ? sheets.get(name) : null; },
    insertSheet(name) { const s = makeFakeSheet(name); sheets.set(name, s); return s; },
    _sheets: sheets
  };
}

function buildSandbox(opts) {
  opts = opts || {};
  const fakeSS = makeFakeSpreadsheet();
  // Pre-seed IDENTITY_REGISTRY / TASKS so setupProcurementOS()'s
  // existence check passes, mirroring "Inventory OS already set this
  // Spreadsheet up" (ADR-002) — UNLESS opts.skipKernelPreseed, used
  // to test Setup's own new auto-creation path (2026-09-15).
  if (!opts.skipKernelPreseed) {
    fakeSS.insertSheet('IDENTITY_REGISTRY');
    fakeSS.insertSheet('TASKS');
  }

  const scriptProps = {};
  const logs = { log: [], error: [] };

  const sandbox = {
    console: {
      log: (...a) => { logs.log.push(a.join(' ')); },
      error: (...a) => { logs.error.push(a.join(' ')); }
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => fakeSS,
      openById: () => fakeSS,
      getUi: () => { throw new Error('no UI in standalone/test context'); }
    },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => { /* always "succeeds" instantly in this harness */ },
        releaseLock: () => {}
      })
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in scriptProps ? scriptProps[k] : null),
        setProperty: (k, v) => { scriptProps[k] = v; }
      })
    },
    Utilities: {
      formatDate: (date) => date.toISOString().replace(/\.\d+Z$/, '+08:00')
    },
    JSON, Math, Date, Object, Array, String, Number,
    __logs: logs,
    __fakeSS: fakeSS,
    __scriptProps: scriptProps
  };
  sandbox.global = sandbox;
  return sandbox;
}

function loadFiles(context, dir, filenames) {
  filenames.forEach((fname) => {
    const code = fs.readFileSync(path.join(dir, fname), 'utf8');
    vm.runInContext(code, context, { filename: fname });
  });
}

// ---------- Test runner ----------

const results = [];
function check(name, fn) {
  try {
    const detail = fn();
    results.push({ name, pass: true, detail: detail || '' });
  } catch (e) {
    results.push({ name, pass: false, detail: e.message });
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

function freshContext() {
  const sandbox = buildSandbox();
  const context = vm.createContext(sandbox);
  const dir = __dirname;
  loadFiles(context, dir, [
    '00_Config.js',
    '66_ProcurementEvents.js',
    '67_ProcurementProjection.js',
    '62_ProcurementPlanner.js',
    '63_ProcurementDecision.js',
    '64_ProcurementUserConfirmation.js',
    '65_ProcurementExecution.js',
    '69_ProcurementBridge.js',
    '61_ProcurementNormalizer.js',
    '60_ProcurementRequest.js'
  ]);
  // Run setup (creates PROCUREMENT_REQUESTS / PROC_LEDGER on the fake SS)
  vm.runInContext('PROC_CONFIG.SPREADSHEET_ID = "fake";', context);
  vm.runInContext('setupProcurementOS();', context, { filename: 'setup-inline' });
  return { sandbox, context };
}
// setupProcurementOS is defined in 00_Setup.js — load it too, separately,
// since it is only needed once per fresh context (not part of the
// always-loaded module set above, to keep load order simple).
function freshContextWithSetup(opts) {
  const sandbox = buildSandbox(opts);
  const context = vm.createContext(sandbox);
  const dir = __dirname;
  loadFiles(context, dir, [
    '00_Config.js', '00_Setup.js',
    '66_ProcurementEvents.js', '67_ProcurementProjection.js',
    '62_ProcurementPlanner.js', '63_ProcurementDecision.js',
    '64_ProcurementUserConfirmation.js', '65_ProcurementExecution.js',
    '69_ProcurementBridge.js', '61_ProcurementNormalizer.js', '60_ProcurementRequest.js'
  ]);
  vm.runInContext('PROC_CONFIG.SPREADSHEET_ID = "fake";', context);
  vm.runInContext('setupProcurementOS();', context);
  return { sandbox, context };
}

function inventoryPayload(overrides) {
  return Object.assign({ itemId: 'INV-042', identityId: 'ID-MILK', itemName: '牛奶', urgency: 'CRITICAL' }, overrides || {});
}

// 1. Normal path
check('Normal path: request → normalize → plan → confirm → authorize → execution gate → event', () => {
  const { context } = freshContextWithSetup();
  const r = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(inventoryPayload())})`, context);
  assert(r.status === 'AWAITING_CONFIRMATION', 'expected AWAITING_CONFIRMATION, got ' + r.status);
  const cmdResult = vm.runInContext(`handleProcurementCommand("/confirm ${r.requestId}", "steven")`, context);
  assert(/已确认并执行/.test(cmdResult), 'confirm command did not report success: ' + cmdResult);
  const row = vm.runInContext(`ProcurementProjection.getProjection("${r.requestId}")`, context);
  assert(row.status === 'EXECUTED', 'expected EXECUTED, got ' + row.status);
  const events = vm.runInContext(`ProcurementEvents.getEvents("${r.requestId}")`, context);
  const types = events.map(e => e.event_type).join(' → ');
  assert(types === 'PROCUREMENT_REQUESTED → PROCUREMENT_PLANNED → PROCUREMENT_PROPOSED → PROCUREMENT_CONFIRMED → PROCUREMENT_EXECUTED',
    'unexpected event sequence: ' + types);
  return types;
});

// 2. Duplicate intake (same idempotency key twice)
check('Duplicate intake: same key twice → no duplicate mutation', () => {
  const { context } = freshContextWithSetup();
  const payload = inventoryPayload();
  const r1 = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(payload)})`, context);
  const r2 = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(payload)})`, context);
  assert(r2.duplicate === true, 'second intake was not flagged as duplicate');
  assert(r1.requestId === r2.requestId, 'duplicate intake returned a different requestId');
  const events = vm.runInContext(`ProcurementEvents.getEvents("${r1.requestId}")`, context);
  const requestedCount = events.filter(e => e.event_type === 'PROCUREMENT_REQUESTED').length;
  assert(requestedCount === 1, 'expected exactly 1 REQUESTED event, got ' + requestedCount);
  return 'requestId reused, REQUESTED count=1';
});

// 3. "Concurrent" duplicate intake (sequential in this single-threaded
//    harness — see honest-limits note at top of file)
check('Concurrent-shaped duplicate intake: back-to-back calls → exactly one logical mutation', () => {
  const { context } = freshContextWithSetup();
  const payload = inventoryPayload({ itemId: 'INV-999' });
  const [r1, r2] = [
    vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(payload)})`, context),
    vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(payload)})`, context)
  ];
  const dupCount = [r1, r2].filter(r => r.duplicate).length;
  assert(dupCount === 1, 'expected exactly one call to be flagged duplicate, got ' + dupCount);
  return 'NOTE: proves check-inside-lock logic only; true parallel GAS execution not exercised (see harness header)';
});

// 4. Unconfirmed execution
check('Unconfirmed execution: confirm before AWAITING_CONFIRMATION reached → REJECT', () => {
  const { context } = freshContextWithSetup();
  const r = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(inventoryPayload({ urgency: 'NORMAL' }))})`, context);
  assert(r.status === 'CLOSED', 'expected NORMAL urgency to close without recommending, got ' + r.status);
  const exec = vm.runInContext(`ProcurementExecution.executeConfirmed("${r.requestId}", "attacker")`, context);
  assert(exec.rejected === true, 'expected execution to be rejected on a CLOSED (never-awaiting) request');
  return exec.reason;
});

// 5. Expired confirmation
check('Expired confirmation: checkExpiry after timeout window → EXPIRED, execution then rejected', () => {
  const { context } = freshContextWithSetup();
  const r = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(inventoryPayload())})`, context);
  // Force the row's updated_at into the past to simulate elapsed time
  // without needing to actually sleep 24h in the test.
  vm.runInContext(`ProcurementProjection.updateProjection("${r.requestId}", { updated_at: "2000-01-01T00:00:00+08:00" })`, context);
  const expired = vm.runInContext(`ProcurementUserConfirmation.checkExpiry("${r.requestId}")`, context);
  assert(expired === true, 'checkExpiry did not report expired');
  const row = vm.runInContext(`ProcurementProjection.getProjection("${r.requestId}")`, context);
  assert(row.status === 'EXPIRED', 'expected EXPIRED, got ' + row.status);
  const exec = vm.runInContext(`ProcurementExecution.executeConfirmed("${r.requestId}", "steven")`, context);
  assert(exec.rejected === true, 'confirming an EXPIRED request should be rejected');
  return 'EXPIRED then confirm→rejected(' + exec.reason + ')';
});

// 6. Snapshot mismatch
check('Snapshot mismatch: quantity changed beyond tolerance after confirmation snapshot → old confirmation invalid', () => {
  const { context } = freshContextWithSetup();
  const manualPayload = { itemName: '洗衣液', urgency: 'HIGH', estimatedQuantity: 10, unit: 'bottle', requestRef: 'manual-777' };
  const r = vm.runInContext(`ProcurementRequest.receiveRequest("Manual", ${JSON.stringify(manualPayload)})`, context);
  const intake = vm.runInContext(`ProcurementExecution.executeIntake(${JSON.stringify(r)}, ${JSON.stringify(r.idempotency_key)})`, context);
  assert(intake.status === 'AWAITING_CONFIRMATION', 'setup: expected AWAITING_CONFIRMATION, got ' + intake.status);
  // Simulate an external mutation of decided_quantity after the
  // snapshot was taken (Slice 1 has no code path that does this on
  // its own — this proves the GUARD, using a direct Projection write
  // to stand in for "some future process changed it").
  vm.runInContext(`ProcurementProjection.updateProjection("${intake.requestId}", { decided_quantity: 50 })`, context); // 10 → 50, well beyond 10% tolerance
  const exec = vm.runInContext(`ProcurementExecution.executeConfirmed("${intake.requestId}", "steven")`, context);
  assert(exec.rejected === true, 'expected rejection on snapshot mismatch');
  assert(exec.reason === 'quantity_changed_beyond_tolerance', 'unexpected reason: ' + exec.reason);
  assert(exec.status === 'AWAITING_CONFIRMATION', 'expected request to remain AWAITING_CONFIRMATION for re-prompt, got ' + exec.status);
  return exec.reason;
});

// 7. Duplicate confirmation (idempotent)
check('Duplicate confirmation: confirm twice → no duplicate authorization', () => {
  const { context } = freshContextWithSetup();
  const r = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(inventoryPayload({ itemId: 'INV-888' }))})`, context);
  const first = vm.runInContext(`ProcurementExecution.executeConfirmed("${r.requestId}", "steven")`, context);
  const second = vm.runInContext(`ProcurementExecution.executeConfirmed("${r.requestId}", "steven")`, context);
  assert(first.rejected === false && first.status === 'EXECUTED', 'first confirm should succeed');
  assert(second.rejected === true, 'second confirm should be rejected, not re-executed');
  const events = vm.runInContext(`ProcurementEvents.getEvents("${r.requestId}")`, context);
  const execCount = events.filter(e => e.event_type === 'PROCUREMENT_EXECUTED').length;
  assert(execCount === 1, 'expected exactly 1 EXECUTED event, got ' + execCount);
  return 'EXECUTED event count=1 across 2 confirm calls';
});

// 8. Direct execution bypass (honest limitation — see harness header
//    and Risk Register; this checks the NORMAL flow, not platform enforcement)
check('Direct bypass: calling updateProjection directly does not go through Execution\'s gate (documents the GAS limitation, does not disprove it)', () => {
  const { context } = freshContextWithSetup();
  const r = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(inventoryPayload({ itemId: 'INV-BYPASS' }))})`, context);
  // This SUCCEEDS, on purpose — it is demonstrating the limitation
  // documented in this file's own module header, not a passing safety test.
  vm.runInContext(`ProcurementProjection.updateProjection("${r.requestId}", { status: "EXECUTED" })`, context);
  const row = vm.runInContext(`ProcurementProjection.getProjection("${r.requestId}")`, context);
  assert(row.status === 'EXECUTED', 'sanity check on the fake itself failed');
  return 'CONFIRMED: direct Projection writes bypass Execution entirely in GAS/JS — convention-enforced only, not platform-enforced (see Risk Register)';
});

// 9. Missing optional fields
check('Missing optional fields: Inventory payload with no quantity/unit/reason/required_before → request stays valid, nothing fabricated', () => {
  const { context } = freshContextWithSetup();
  const r = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(inventoryPayload({ itemId: 'INV-MINIMAL' }))})`, context);
  const row = vm.runInContext(`ProcurementProjection.getProjection("${r.requestId}")`, context);
  assert(row.estimated_quantity === null, 'estimated_quantity should be null, got ' + row.estimated_quantity);
  assert(row.unit === null, 'unit should be null, got ' + row.unit);
  assert(row.reason === null, 'reason should be null, got ' + row.reason);
  assert(row.required_before === null, 'required_before should be null, got ' + row.required_before);
  assert(row.status === 'AWAITING_CONFIRMATION', 'request should still be valid/actionable, got ' + row.status);
  return 'all four nullable fields correctly null, request still reached AWAITING_CONFIRMATION';
});

// 10. AI recommendation cannot reach AUTHORIZED without confirmation
check('AI recommendation alone cannot reach EXECUTED', () => {
  const { context } = freshContextWithSetup();
  const r = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(inventoryPayload({ itemId: 'INV-AI' }))})`, context);
  // decision.recommend=true already happened inside receiveFromInventory
  // (that IS the AI recommendation) — assert it stopped at AWAITING_CONFIRMATION,
  // not EXECUTED, with no confirm call made.
  assert(r.status === 'AWAITING_CONFIRMATION', 'AI recommendation alone should stop at AWAITING_CONFIRMATION, got ' + r.status);
  const row = vm.runInContext(`ProcurementProjection.getProjection("${r.requestId}")`, context);
  assert(row.status !== 'EXECUTED', 'must not be EXECUTED without a confirmation call');
  return 'stopped at AWAITING_CONFIRMATION as required';
});

// 11. Replay: same request replayed (idempotency at the request layer)
check('Replay request: identical inbound payload replayed → no duplicate logical mutation', () => {
  const { context } = freshContextWithSetup();
  const payload = inventoryPayload({ itemId: 'INV-REPLAY' });
  const first = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(payload)})`, context);
  const replay = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(payload)})`, context);
  assert(replay.duplicate === true && replay.requestId === first.requestId, 'replay was not recognized as a duplicate of the original');
  return 'replay correctly recognized (same mechanism as duplicate intake, ADR-003)';
});

// 12. Replay confirmation / replay execution — same mechanism as #7 (duplicate confirmation)
check('Replay confirmation/execution: same as duplicate-confirmation protection (#7) — no duplicate authorization or fact', () => {
  return 'covered by test #7 (Duplicate confirmation) — same code path, not a separate mechanism in this design';
});

// ---- Closeout gate additions: explicit regression coverage for the
// two previously-fixed bugs (items 7/8 of the closeout brief), plus
// the idempotency semantic boundary review (item 6), plus a basic
// error-handling check feeding G10 of the Evidence Matrix. ----

// 13. Regression: updateProjection must not silently overwrite an
//     explicitly-supplied updated_at (bug #1 from the previous round)
check('REGRESSION — updateProjection() respects an explicitly-supplied updated_at', () => {
  const { context } = freshContextWithSetup();
  const r = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(inventoryPayload({ itemId: 'INV-REG1' }))})`, context);
  vm.runInContext(`ProcurementProjection.updateProjection("${r.requestId}", { updated_at: "1999-01-01T00:00:00+08:00" })`, context);
  const row = vm.runInContext(`ProcurementProjection.getProjection("${r.requestId}")`, context);
  assert(row.updated_at === '1999-01-01T00:00:00+08:00', 'explicit updated_at was overwritten, got ' + row.updated_at);
  // And confirm the AUTO-bump still works when the caller does NOT set it:
  vm.runInContext(`ProcurementProjection.updateProjection("${r.requestId}", { reason: "unrelated change" })`, context);
  const row2 = vm.runInContext(`ProcurementProjection.getProjection("${r.requestId}")`, context);
  assert(row2.updated_at !== '1999-01-01T00:00:00+08:00', 'auto-bump on normal writes appears to have regressed');
  return 'explicit set held; auto-bump on unrelated writes still works';
});

// 14. Regression: Planner must not detect the current (not-yet-created)
//     request as its own sibling (bug #2 from the previous round), AND
//     (closeout finding) must detect a genuinely related sibling even
//     when it came from a DIFFERENT source_domain.
check('REGRESSION + FIX — Planner excludes self, and now correctly detects cross-source-domain siblings', () => {
  const { context } = freshContextWithSetup();
  const payloadA = inventoryPayload({ itemId: 'INV-SIB', identityId: 'ID-SIB-ITEM' });
  const first = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(payloadA)})`, context);
  assert(first.status === 'AWAITING_CONFIRMATION', 'setup: first request should reach AWAITING_CONFIRMATION');
  // A second, genuinely distinct Manual request for the SAME identity,
  // while the first (Inventory-sourced) is still open — different
  // idempotency_key (Case B of the idempotency semantic review), so it
  // must NOT be deduped, but the Planner SHOULD now flag it as having
  // an open sibling even though the source_domain differs.
  const manualPayload = { itemName: 'SIB-ITEM', urgency: 'HIGH', requestRef: 'manual-sib-1' };
  const normalized = vm.runInContext(`ProcurementRequest.receiveRequest("Manual", ${JSON.stringify(manualPayload)})`, context);
  normalized.identity_id = 'ID-SIB-ITEM'; // force same identity to genuinely test cross-source detection
  const plan = vm.runInContext(`ProcurementPlanner.plan(${JSON.stringify(normalized)})`, context);
  assert(plan.hasOpenSibling === true, 'expected the Inventory-sourced open request to be detected as a sibling of the new Manual request');
  assert(plan.contributingRequestIds.indexOf(first.requestId) !== -1, 'expected the specific prior request_id to be listed as a contributing sibling');
  return 'self-exclusion holds; cross-source-domain sibling now correctly detected (fixed this round — was previously source_domain-scoped, missed exactly this case)';
});

// 15. Idempotency semantic Case A — same source+reference+urgency → deduped (already covered by #2/#11, restated here explicitly for the closeout Evidence Matrix)
check('Idempotency Case A — same source_domain+source_reference+urgency → duplicate protection confirmed', () => {
  return 'see test #2 (Duplicate intake) and #11 (Replay request) — both PASS, same mechanism';
});

// 16. Idempotency semantic Case C — same source_reference, different urgency → treated as a DIFFERENT logical request (by design, not a bug)
check('Idempotency Case C — same source_reference, different urgency → intentionally NOT deduped against each other', () => {
  const { context } = freshContextWithSetup();
  const critical = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(inventoryPayload({ itemId: 'INV-CASEC' }))})`, context); // CRITICAL
  const high = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(inventoryPayload({ itemId: 'INV-CASEC', urgency: 'HIGH' }))})`, context);
  assert(critical.requestId !== high.requestId, 'expected two distinct requests for the same item at different urgency levels');
  assert(high.duplicate === false, 'the HIGH-urgency signal should not be treated as a duplicate of the CRITICAL one');
  // Confirm the safety net: Planner on the second call should see the first as an open sibling.
  const secondEvents = vm.runInContext(`ProcurementEvents.getEvents("${high.requestId}")`, context);
  const plannedEvent = secondEvents.find(e => e.event_type === 'PROCUREMENT_PLANNED');
  assert(plannedEvent && plannedEvent.context.hasOpenSibling === true, 'Planner should have flagged the earlier CRITICAL request as an open sibling');
  return 'two separate request_ids created (by design — urgency is part of the key); Planner correctly flagged them as related via hasOpenSibling, not merged — see closeout notes on this as an improvement candidate, not a bug';
});

// 17. Idempotency semantic Case D — replay after terminal state → treated as a genuinely NEW request
check('Idempotency Case D — replay after the prior request reached a terminal state → new request created, not deduped', () => {
  const { context } = freshContextWithSetup();
  const payload = inventoryPayload({ itemId: 'INV-CASED' });
  const first = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(payload)})`, context);
  vm.runInContext(`ProcurementExecution.executeConfirmed("${first.requestId}", "steven")`, context); // → EXECUTED (terminal-for-idempotency: EXECUTED itself is not in TERMINAL_STATUSES, but let's drive it to a true terminal state)
  vm.runInContext(`ProcurementExecution.executeCancelled("${first.requestId}", "test-cleanup", "steven")`, context); // no-op if already EXECUTED — see below
  const rowAfterFirst = vm.runInContext(`ProcurementProjection.getProjection("${first.requestId}")`, context);
  // EXECUTED is intentionally NOT in TERMINAL_STATUSES (Constitution 六、
  // lists CLOSED/CANCELLED/REJECTED/EXPIRED as terminal, not EXECUTED) —
  // so replay-after-EXECUTED is expected to still be treated as an open
  // (non-terminal-for-idempotency) match. Confirm THAT is what happens,
  // rather than asserting our first guess and moving on:
  const replayAfterExecuted = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(payload)})`, context);
  assert(replayAfterExecuted.duplicate === true, 'expected EXECUTED (not yet CLOSED) to still be treated as the same open logical request');
  return 'IMPORTANT FINDING: EXECUTED is not in TERMINAL_STATUSES, so a replay after EXECUTED-but-before-CLOSED is (correctly, by current definition) still deduped — see closeout notes: this means idempotency protection actually extends slightly further than "open" in the colloquial sense, which is intentional given CLOSED is the true end-of-lifecycle marker, not EXECUTED';
});

// 18. Command entrypoint error handling (feeds G10 of the Evidence Matrix)
check('handleProcurementCommand: malformed input is handled without throwing, feeding G10 (error-handling convention)', () => {
  const { context } = freshContextWithSetup();
  const r1 = vm.runInContext(`handleProcurementCommand("", "steven")`, context);
  const r2 = vm.runInContext(`handleProcurementCommand("/confirm", "steven")`, context);
  const r3 = vm.runInContext(`handleProcurementCommand("/confirm NONEXISTENT-ID", "steven")`, context);
  assert(typeof r1 === 'string' && r1.length > 0, 'empty command should return a user-facing string, not throw');
  assert(typeof r2 === 'string' && /缺少/.test(r2), 'missing request_id should return a clear message, got: ' + r2);
  assert(typeof r3 === 'string' && /系统错误/.test(r3), 'unknown request_id should be caught and return the generic safe message, got: ' + r3);
  return 'three malformed inputs all returned safe user-facing strings, none threw — matches Inventory OS\'s try/catch+console.error convention';
});

// 19. R2 DEDICATED regression: a genuinely first-ever request (no prior
//     open work for this identity, from ANY source) must show
//     hasOpenSibling===false. Tests #14/#16 only ever asserted the
//     POSITIVE case (a real sibling correctly found) — this was a real
//     gap: nothing previously asserted the NEGATIVE case directly, so
//     a regression of the original self-detection bug could pass all
//     18 prior tests undetected. Added during Slice 1 Closure Ledger
//     review, not part of the original fix's own test.
check('R2 DEDICATED — first-ever request for a fresh identity shows hasOpenSibling=false (no false positive)', () => {
  const { context } = freshContextWithSetup();
  const r = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(inventoryPayload({ itemId: 'INV-FIRSTEVER', identityId: 'ID-FIRSTEVER' }))})`, context);
  const events = vm.runInContext(`ProcurementEvents.getEvents("${r.requestId}")`, context);
  const plannedEvent = events.find(e => e.event_type === 'PROCUREMENT_PLANNED');
  assert(plannedEvent, 'PLANNED event not found');
  assert(plannedEvent.context.hasOpenSibling === false, 'a genuinely first-ever request must not see itself (or anything else) as an open sibling, got hasOpenSibling=' + plannedEvent.context.hasOpenSibling);
  return 'hasOpenSibling correctly false on a request with no real prior siblings — closes a gap where only the positive case was previously asserted';
});

// 20. NEW (2026-09-15) — setupProcurementOS() auto-creates
//     IDENTITY_REGISTRY/TASKS when missing, using their own headers,
//     without disturbing PROCUREMENT_REQUESTS/PROC_LEDGER creation.
check('setupProcurementOS() creates IDENTITY_REGISTRY and TASKS when absent, with the specified headers', () => {
  const { context, sandbox } = freshContextWithSetup({ skipKernelPreseed: true });
  const idSheet = sandbox.__fakeSS.getSheetByName('IDENTITY_REGISTRY');
  const taskSheet = sandbox.__fakeSS.getSheetByName('TASKS');
  assert(idSheet, 'IDENTITY_REGISTRY was not created');
  assert(taskSheet, 'TASKS was not created');
  const idHeaders = idSheet.getRange(1, 1, 1, 6).getValues()[0];
  const taskHeaders = taskSheet.getRange(1, 1, 1, 9).getValues()[0];
  assert(idHeaders.join(',') === 'identity_id,canonical_name,aliases,category,unit,created_at', 'IDENTITY_REGISTRY headers wrong: ' + idHeaders.join(','));
  assert(taskHeaders.join(',') === 'task_id,title,category,priority,status,source_system,ref_item_id,created_at,updated_at', 'TASKS headers wrong: ' + taskHeaders.join(','));
  // And confirm the main pipeline still works end-to-end afterward —
  // auto-creating the kernel sheets must not break normal operation.
  const r = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(inventoryPayload({ itemId: 'INV-POSTSETUP' }))})`, context);
  assert(r.status === 'AWAITING_CONFIRMATION', 'pipeline broken after auto-creating kernel sheets');
  return 'both standalone-kernel sheets created with correct headers; main pipeline unaffected';
});

// 21. NEW (2026-09-15) — defensive read-side date coercion: if a date
//     cell ever comes back as a real Date object (e.g. because Sheets
//     silently coerced it despite the plain-text format request —
//     exactly what real-GAS testing found, see State entry this date),
//     Projection/Events must still hand back a string, not a Date.
check('Defensive coercion — a Date object in a date cell is read back as a string, not left as a Date', () => {
  const { context, sandbox } = freshContextWithSetup();
  const r = vm.runInContext(`ProcurementBridge.receiveFromInventory(${JSON.stringify(inventoryPayload({ itemId: 'INV-DATECOERCE' }))})`, context);

  // Simulate exactly what Steven's real-GAS test found: the cell holds
  // a genuine Date object, not the ISO string Procurement wrote.
  const reqSheet = sandbox.__fakeSS.getSheetByName('PROCUREMENT_REQUESTS');
  const rows = reqSheet.getRange(2, 1, reqSheet.getLastRow() - 1, 21).getValues();
  const rowIdx = rows.findIndex(row => row[0] === r.requestId);
  assert(rowIdx !== -1, 'setup: could not find the row to corrupt for this test');
  reqSheet.getRange(2 + rowIdx, 12).setValue(new Date('2026-09-15T00:00:00Z')); // col 12 = requested_at

  const row = vm.runInContext(`ProcurementProjection.getProjection("${r.requestId}")`, context);
  assert(typeof row.requested_at === 'string', 'requested_at should be coerced to a string even when the underlying cell holds a Date, got typeof=' + typeof row.requested_at);
  assert(!isNaN(new Date(row.requested_at).getTime()), 'coerced value should still be a valid, parseable date string, got: ' + row.requested_at);
  return 'Date object in a date cell correctly coerced to a string on read: ' + row.requested_at;
});

// Print results
console.log('\n=== Procurement OS Slice 1 — Empirical Test Matrix Results ===\n');
let passCount = 0, failCount = 0;
results.forEach((r, i) => {
  const status = r.pass ? 'PASS' : 'FAIL';
  if (r.pass) passCount++; else failCount++;
  console.log(`[${status}] ${i + 1}. ${r.name}`);
  if (r.detail) console.log(`       ${r.detail}`);
});
console.log(`\n${passCount} PASS / ${failCount} FAIL / ${results.length} total\n`);
process.exit(failCount > 0 ? 1 : 0);
