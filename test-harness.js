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

function buildSandbox() {
  const fakeSS = makeFakeSpreadsheet();
  // Pre-seed IDENTITY_REGISTRY / TASKS so setupProcurementOS()'s
  // existence check passes, mirroring "Inventory OS already set this
  // Spreadsheet up" (ADR-002).
  fakeSS.insertSheet('IDENTITY_REGISTRY');
  fakeSS.insertSheet('TASKS');

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
    __fakeSS: fakeSS
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
function freshContextWithSetup() {
  const sandbox = buildSandbox();
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
