# Procurement OS — External Verification & Cross-OS Contract Closure Report

Last Updated: 2026-09-14

Governing principles applied throughout: Evidence before implementation. Ownership follows data, not UI name. AI recommendation ≠ authorization. Cross-OS integration is a contract, not an assumption. A simulated PASS is not a Real GAS PASS.

---

## 1. Executive Summary

No runtime code was modified this round (confirmed by not needing to re-run the test suite — see §22 rule). This round re-investigated Inventory OS's real code more deeply and checked additional stored context (Rider OS, Reminder OS memory) not consulted in prior rounds. Two real corrections resulted: TASKS schema is now E1-verified (was wrongly treated as fully unknown before), and the cross-OS transport hypothesis shifted — three independent sources now point toward a shared-Spreadsheet-mediated pattern as the ecosystem's dominant transport, though this is still not confirmed for the specific Inventory→Procurement link. Real GAS verification remains structurally impossible from this sandbox — this round produces a Human Verification Procedure instead of pretending otherwise. TASK_ID collision risk gets a concrete, evidence-based recommendation (Option C) rather than "the format looks the same so it should be fine." Final call: **SLICE 2 — BLOCKED**.

---

## 2. Previous Claims Revalidated

| Claim (prior round) | This round | Reason |
|---|---|---|
| TASKS schema not independently verified | **CORRECTED (upgraded)** | Re-searched 82_Inventory-main more thoroughly; the real 9-column schema was in `00_Config.txt` all along (§5) |
| "JARVIS calls handleInventoryCommand as a Library" (leading hypothesis) | **DOWNGRADED to co-equal candidate, not leading** | New evidence (Reminder OS polls a shared Tasks sheet; Personal AI Core's EventBus is Sheet-backed) makes a Sheet/EventBus-mediated transport at least as well-supported — see §4 |
| H1 cross-project locking is a known risk | **CONFIRMED, unchanged** | No new evidence either way |
| Q1–Q5, ADR-000–003 architecture | **CONFIRMED, not reopened** | No correctness contradiction found; per task boundary, not revisited |
| Orphan threshold = 10 minutes | **CONFIRMED as reasoning, RECLASSIFIED as operational parameter, not domain rule** | See §9 |
| Command Entrypoint = INTEGRATION CONTRACT — UNVERIFIED | **CONFIRMED, still unverified** | No new evidence closes this — see §11 |

---

## 3. V1 — Real GAS Verification

Cannot be performed from this environment. This Claude session runs in a sandboxed Linux container with no access to any real Google account, Apps Script project, or Spreadsheet. This is not a gap in effort — it is a structural property of the environment. Every one of the nine sub-checks the task lists (deploy/execute/connect/CRUD/state transition/persist projection/LockService/idempotency/logs) is:

**V1 = EXTERNAL VERIFICATION REQUIRED** (see External Verification Pack, §14, EV-01)

---

## 4. V2 — Cross-OS Communication Topology

### Observed Evidence (directly read, not inferred)

- `29_InventoryBridge.gs`, `emitToCore(eventType, payload)`: comment reads "[STUB] Broadcast a domain event to Personal AI Core's EventBus" / `// future: EventBus.emit(eventType, payload);` — a stub, not live.
- Same file, `sendProcurementRequest(payload)`: comment reads `// future: ProcurementBridge.receiveFromInventory(payload);` — a direct cross-namespace call shape, not an EventBus emit.
- Stored context (prior session, Personal AI Core): "multiple independent GAS projects (Personal AI Core, Productivity OS, Reminder OS, Rider OS) sharing a Google Sheets backend"; "all multi-file communication routes through the shared Spreadsheet"; "all modules follow event-sourcing discipline with an EventBus at the center"; "Added LockService protection to EventBus publish()/publishBatch()".
- Stored context (prior session, Reminder OS): "a platform-wide time and notification service **polling a shared Tasks sheet hourly**"; "all multi-file communication routes through the shared Spreadsheet" (independently stated in this project's own record too).
- Stored context (prior session, Rider OS): "event-driven architecture (**Router→Parser→EventEngine→Service**)" — uses the name "EventEngine", not "EventBus"; does not mention Personal AI Core's EventBus by name.
- `00_Config.gs` (Inventory): TASKS schema includes a `SOURCE_SYSTEM` column.
- `handleInventoryCommand(rawCommand)`: bare global function (not IIFE-namespaced), comment: "Call this from any entry point (Telegram webhook, menu, test)".

### Inference / Hypothesis (built on the above, not directly stated anywhere)

- That "EventBus" (Personal AI Core's term) and "EventEngine" (Rider OS's term) are the same mechanism, or merely analogous per-project patterns — **not confirmed either way**.
- That Inventory OS is not yet actually connected to Personal AI Core's EventBus (its own `emitToCore` is a stub) but intends to be.
- That `handleInventoryCommand`'s "any entry point" framing implies at least one real external caller exists today — but which mechanism, unconfirmed.
- That JARVIS and Personal AI Core are the same system (stored context lists these as aliases for one project) — this is fairly solid (E1-level, from the project's own alias record), so this report treats "JARVIS → Procurement" and "Personal AI Core → Procurement" as the same row, not two.

### Topology Table

| Path | Producer | Transport | Consumer | Evidence | Status |
|---|---|---|---|---|---|
| Inventory → Procurement | Inventory OS (`sendProcurementRequest`, stub) | **Ambiguous**: stub comment shows a direct cross-namespace call; broader ecosystem pattern favors Sheet-mediated | Procurement OS (`receiveFromInventory`) | E1 (stub) + E1 (ecosystem pattern, 3 independent sources) | CONTRACT DEFINED (Procurement side) / transport = **UNKNOWN, two candidates recorded separately, not merged** |
| JARVIS/Personal AI Core → Procurement | JARVIS = Personal AI Core (same system) | UNKNOWN (candidates: EventBus/Sheet-poll; direct Library call; something Procurement-specific not yet designed) | Procurement (entry point itself unconfirmed) | E0 (Procurement has no consumer contract built for this at all) | **UNKNOWN** |
| Telegram → Procurement | Telegram, via an adapter of unconfirmed ownership | UNKNOWN | Procurement's `TelegramConfirmationAdapter` (Slice 1 code, unwired) | E1 (Inventory's own Telegram send is also a stub) + E2 (Procurement's simulated contract) | CONTRACT DEFINED (Procurement side, simulated only) |
| Procurement → TASKS | Procurement (proposed, not built) | Direct Sheet write (proposed) — **sanctioned status unknown** | TASKS table | E1 (real schema) + E0 (no Procurement writer exists) | CONTRACT DEFINED (proposal) / **OWNERSHIP UNKNOWN** — see §6 |
| Procurement → EventBus | N/A | N/A | Personal AI Core | E0 — Procurement's own code has no `emitToCore`-equivalent stub anywhere | NOT APPLICABLE (not even proposed yet) |

This round does not collapse the two Inventory→Procurement transport candidates into one. Both are recorded because the evidence conflicts (a specific stub's literal wording vs. the ecosystem's general pattern), and picking one without stronger evidence would be exactly the "二选一脑补" this task explicitly forbids.

---

## 5. V3 — TASK_ID Authority / Namespace

**Q1 (authoritative generator today):** Inventory OS's private `_generateTaskId()` function (`29_InventoryBridge.gs`), backed by `_reserveIdBlock('LAST_TASK_ID_NUM', 20, ...)` against Inventory OS's own `PropertiesService` store. This is E1 — directly read, not inferred.

**Q2 (uniqueness scope):** Inventory-project-local. `PropertiesService.getScriptProperties()` is scoped per GAS project; nothing outside Inventory OS's own script can see or coordinate with this counter.

**Q3 (who generates TASK_ID if Procurement creates a task):** Unresolved — see Decision below.

**Q4 (how should Procurement create a task):** Cannot be answered with evidence today — `_taskCreate()` is a **private** function, not exported from `29_InventoryBridge.gs`'s public API. There is currently no sanctioned interface for any external caller (Procurement included) to request a task be created. This is a real, concrete gap, not a design nuance.

**Q5 (collision risk if Procurement generates its own "TSK-####" IDs):** Real and unaddressed. Two independent `PropertiesService` counters (Inventory's and a hypothetical Procurement one) would each start from their own zero point and could both legitimately produce `TSK-0001`, `TSK-0002`, etc.

**Q6 (does the current format carry a namespace):** No. `TSK-` plus a bare number carries no source/project disambiguation. Per instruction, this is recorded as an **architectural contract gap**, not silently patched.

### Decision — Observed Gap → Risk → Options → Recommendation → Required Decision

**Observed Gap:** `TASK_ID` format has no namespace; the generator is Inventory-private and per-project-scoped.
**Risk:** Any independent ID generation by Procurement using the same format risks real collisions in a shared table.

**Options:**
- **A — Procurement never generates TASK_ID; the TASKS owner does.** Requires a sanctioned interface that does not exist today (`_taskCreate` is private). Cleanest long-term, but not achievable without an external change.
- **B — Procurement generates via an authoritative shared allocator.** No shared allocator exists anywhere in the evidence gathered. Would require new shared infrastructure — cannot be built this round (scope boundary), and building it without evidence it's needed elsewhere risks over-engineering a two-user problem into ecosystem infrastructure.
- **C — TASK_ID is explicitly source-scoped; Procurement generates its own namespace** (e.g., a distinct prefix such as `PTSK-` instead of `TSK-`). Achievable entirely within Procurement's own code, requires zero changes to Inventory OS, and eliminates collision **by construction** (disjoint prefixes cannot collide), not by probability.
- **D — Other.** No other option is supported by current evidence.

**Recommendation: Option C.** It is the only option Procurement can implement unilaterally without an external dependency or new shared infrastructure, and "different prefix" is a structural guarantee, not a hope. It does not foreclose migrating to Option A later if TASKS' true owner ever exposes a public creation interface — that would simply mean Procurement stops minting its own IDs and starts requesting them.

**Required Decision (Steven):** Approve Option C, or direct otherwise. Not implemented this round regardless (scope boundary) — this is a recommendation awaiting authorization, not a completed migration.

---

## 6. TASKS Ownership

| Dimension | Finding | Confidence |
|---|---|---|
| **Data Ownership** | UNKNOWN. Two live hypotheses: (a) Inventory OS owns TASKS outright; (b) TASKS is a genuinely shared, multi-writer ecosystem table that Inventory happens to be the *current* implementer of. The `SOURCE_SYSTEM` column's existence is suggestive of (b) — `CATEGORY` already covers "type of task", so a second, separate "which system" field reads as designed for multiple writers — but this is inference, not confirmation. | Low |
| **Runtime Ownership** (who actually writes today) | Inventory OS exclusively — confirmed by direct code read. | High (E1) |
| **ID Authority** | Inventory OS exclusively, via its own private, project-scoped `PropertiesService` counter. | High (E1) |
| **Integration Authority** (who should authorize Procurement to create a task) | UNKNOWN. No process, interface, or documentation anywhere addresses this. This is the actual crux of P4 — not a schema question but an unresolved cross-project permission question only Steven (owning both systems) can answer. | None — genuinely open |

Per "Ownership follows data, not UI name": nothing here assumes Procurement owns TASKS just because it might one day have a "create task" affordance. The finding is the opposite — Procurement currently has **no sanctioned way in** at all.

---

## 7. Procurement → TASKS Contract (proposal, not built)

| Field | Specification |
|---|---|
| Input Procurement can provide | title, category, priority, sourceSystem, refItemId — matching Inventory's real `_taskCreate` parameter shape (E1-grounded proposal) |
| Required | title, sourceSystem, refItemId |
| Nullable | category, priority may default (proposal: category='Procurement', priority mapped from urgency) |
| Identity | See §5 Decision — Option C, Procurement-namespaced IDs, pending approval |
| Dedup | Proposal: match on `refItemId` (=`request_id`) rather than Inventory's title-based `_findOpenTask`, since request_id is precise and title text can drift; **not implemented, not verified against the real owner's expectations** |
| Ownership | Unresolved (§6) — a proposal cannot substitute for an actual answer here |
| State | OPEN/DONE-equivalent values would need to be defined by whoever owns TASKS' lifecycle semantics — Procurement does not get to define this unilaterally |
| Lock | Proposal: mirror Inventory's own documented discipline — task-creation call happens inside the caller's (Execution's) already-held lock, does not acquire its own |
| Failure | Explicitly NOT `try { createTask() } catch { ignore }`. Proposal: Procurement's own EXECUTED state and event fact are written first and stand on their own regardless of Task-creation outcome (a procurement authorization is real even if the downstream Task reminder fails to appear); a task-creation failure is recorded as its own fact in `PROC_LEDGER` (`context_json.task_creation_failed = true`), `linked_task_id` stays null, and whether/how a retry happens is an open Slice 2 question, not resolved here |
| Idempotency vs. Procurement's own idempotency | **Explicitly separate mechanisms**: Procurement's own request-level idempotency (ADR-003) governs whether a *procurement request* is treated as a duplicate; TASKS-side dedup (whatever it turns out to be) governs whether a *task row* is treated as a duplicate. A request could legitimately produce exactly one task even across a system restart, without the two mechanisms needing to be the same code path. |

This entire section is a **proposal awaiting Integration Authority resolution (§6)** — it is not implemented, and per scope boundary, will not be implemented this round even if it looks straightforward.

---

## 8. V4 — Real GAS Verification Boundary

**Layer A — Static Verification (this round's actual work, achievable by Claude):**
Source inspection of Inventory OS's TASKS/Bridge/EventBus code (§5, §6), Spreadsheet ID/table contract inspection (Procurement's own `00_Config.js` — `SPREADSHEET_ID` still blank, a real deployment prerequisite), LockService usage inspection (confirmed C12-consistent design, both sides), PropertiesService inspection (confirmed per-project scoping, the basis of the §5 collision finding), GAS API compatibility inspection (Procurement's code uses only APIs Inventory OS's own real, running V4.1 code already uses — no exotic/unverified API surface introduced).

**Layer B — Simulated GAS Verification (already exists, preserved):**
19/19 PASS, `implementation/test-harness.js`, regression coverage included (R1–R7 per the Closure Ledger). Not re-run this round — no runtime code changed (§22 rule).

**Layer C — Real GAS Verification:**
**NOT VERIFIED BY CLAUDE.** Requires Steven's own Google/Apps Script access. See Human Verification Procedure below.

### Human Verification Procedure (minimal, modeled on Steven's own established practice — Rider OS's real audits were closed exactly this way: automated test functions run live in the Apps Script editor, plus a short manual checklist)

| Step | Action | Expected Result | Evidence to Capture | Pass/Fail Criterion |
|---|---|---|---|---|
| 1 | Create/open a GAS project bound to the shared ecosystem Spreadsheet; paste in the 11 files from `implementation/` | Project saves with no syntax errors | Screenshot or copy of the Apps Script editor's file list | No red error indicators on any file |
| 2 | Set `PROC_CONFIG.SPREADSHEET_ID` in `00_Config.js` to the real Spreadsheet ID (or leave blank if bound directly to it) | — | The value you set | N/A |
| 3 | Run `setupProcurementOS()` from the editor | Two new sheets appear: `PROCUREMENT_REQUESTS`, `PROC_LEDGER`, with headers | Screenshot of the Spreadsheet showing both sheets | Both sheets exist with the exact header row from `PROC_CONFIG.REQUEST_HEADERS` / `LEDGER_HEADERS` |
| 4 | Run `setupProcurementOS()` a second time | No duplicate sheets, no data loss | Row counts before/after | Row counts identical |
| 5 | Run `smokeTestProcurementOS()` | Execution log shows the same narrated sequence as the Node harness (INTAKE #1, INTAKE #2 duplicate, CONFIRM, EVENTS) | Copy of the Execution log | Log shows `duplicate:true` for INTAKE #2 and a 4-event sequence ending in `PROCUREMENT_EXECUTED` |
| 6 | Open `PROCUREMENT_REQUESTS` and inspect the `requested_at`/`updated_at` cells' actual cell format | Cells display as plain text (the ISO string), not right-aligned as a date/number | Screenshot of the cell format menu (Format → Number) | Format reads "Plain text", confirming the `setNumberFormat('@')` protection actually took effect in a real Sheet (this is exactly the class of thing the simulated harness cannot prove) |
| 7 | Trigger `executeIntake` (via `smokeTestProcurementOS` or a manual call) twice in rapid succession from two separate manual runs (e.g., two browser tabs, or one run started while another is mid-execution) | Only one `PROCUREMENT_REQUESTED` event for the shared idempotency key | `ProcurementEvents.getEvents(requestId)` output | Exactly one `PROCUREMENT_REQUESTED` event, not two |
| 8 | Check the Apps Script "Executions" log for step 7 | One execution should show a measurable wait before acquiring the lock if truly overlapping | Executions log timing | If both executions ran with any real time overlap, the second one's log should show lock-wait behavior, not an immediate independent write |

Do not go beyond these 8 steps for this round — no exploratory testing requested.

---

## 9. V5 — Orphan / Recovery Semantics

**Q1 (what counts as orphan):** A request that has entered `REQUESTED` or `PLANNED` and has not progressed to any further state (`AWAITING_CONFIRMATION`, `CLOSED`, etc.) within a bounded window.

**Q2 (classification):** **Technical/operational timeout**, not a domain lifecycle rule. The 10-minute figure is derived from a platform constraint (GAS's 6-minute single-execution ceiling plus a safety margin) — it describes "how long a stuck execution could plausibly still be running," not any business meaning about procurement. It should not be written into the Constitution as a domain principle; it belongs in `PROC_CONFIG` as a named, adjustable operational parameter.

**Q3 (is 10 minutes just a V0 operational threshold):** Yes. Nothing about it is architecturally load-bearing — changing it from 10 to 15 minutes tomorrow would not require an ADR.

**Q4 (should it be configuration, not hardcoded):** Yes — proposal: `PROC_CONFIG.ORPHAN_DETECTION_THRESHOLD_MINUTES = 10`, exactly mirroring how `CONFIRMATION_TIMEOUT_HOURS` is already isolated as a named config value rather than a magic number inline in `65_ProcurementExecution.js`. **Not implemented this round** — this is a proposal, and adding the constant without the scanning mechanism that uses it would be incomplete, scope-creeping runtime code for no immediate benefit.

**Q5 (recovery policy re-verified):** The prior round's proposal — "mark as a special terminal state, no automatic retry" — holds up under re-examination. Reasoning restated and sharpened: an interrupted `executeIntake()` means the intake itself did not complete; there is no guarantee about which side-effects landed, so automatically retrying or replanning risks a second, different side-effect on top of a partial one. Marking as terminal (proposal: reuse `CANCELLED` with `reason='orphaned_timeout'`) is the only option that doesn't need to reason about partial-completion state.

**Terminal lifecycle state ≠ Planning inactivity — addressed explicitly:** Yes, `ORPHANED`/orphan-marked-`CANCELLED` records must **not** be treated as active siblings. This is a governance decision proposal, consistent with Steven's stated default safety direction, recorded here for approval:

> **Proposed governance rule (not yet implemented):** `62_ProcurementPlanner.js`'s `listOpenByIdentity`-based sibling lookup must exclude any request whose `CANCELLED` transition carries `reason='orphaned_timeout'` in its terminal event context — an orphaned, abandoned intake should not make a genuinely new, healthy request think something is already "in flight." Today's code already excludes all `CANCELLED` rows from sibling detection regardless of reason (Constitution 六、`TERMINAL_STATUSES`), so this rule is **already satisfied by the existing exclusion list** — orphan-marked records, if implemented as proposed (reusing `CANCELLED`), would automatically NOT pollute sibling detection without any further code change. This is worth stating explicitly rather than assuming, since it's exactly the kind of thing that's easy to get backwards.

---

## 10. P7 — Confirmation Expiry (status check only, not reopened)

Confirmed: Slice 1 still uses `updated_at` as the temporary implementation (unchanged this round — no runtime touched). It remains explicitly marked as technical debt (Constitution/Ledger). Slice 2 does need the dedicated field per the prior approved decision. Migration is Slice 2 scope, not this round's — no migration performed, per instruction.

---

## 11. Command Entrypoint Contract

Re-investigated per the expanded question list. No new evidence closes any of these:

- **Who/where calls it:** UNKNOWN.
- **Library invocation:** Not confirmed; remains a candidate (§4).
- **Telegram adapter:** Not confirmed to route through this specific function; Procurement's own `TelegramConfirmationAdapter` is a separate, simulated-only construct.
- **EventBus consumer:** No evidence `handleProcurementCommand` itself is an EventBus consumer — nothing in Procurement's code subscribes to anything.
- **Parameter contract:** Defined on Procurement's side (`rawCommand`, `actorId`) — not validated against any real caller's actual argument shape.
- **Error handling:** Try/catch, returns a safe string (verified in simulation, test #18).
- **Return value:** Plain string (mirrors Inventory's real `handleInventoryCommand` shape — the one thing here with E1 support, since it's an intentional analogy to confirmed real code).
- **Repeated invocation:** Not specifically tested for this entry point beyond the general idempotency tests; a genuinely duplicate `/confirm` call is covered (test #7), but "the same webhook delivery calling this function twice" as a transport-level concern is not separately modeled.
- **Direct-call path and event-driven path coexisting:** Cannot be ruled out given §4's unresolved topology — if both existed, `handleProcurementCommand` and a hypothetical EventBus-consumer path could both attempt to process the same user action. Not designed against this round, since the underlying topology itself is unresolved.

**Command Entrypoint = INTEGRATION CONTRACT — UNVERIFIED** (unchanged; see EV-04 for what would close it).

---

## 12. Integration Contract Registry v2

### IC-01 — Inventory → Procurement
Producer: Inventory OS (`sendProcurementRequest`, stub) · Consumer: Procurement (`receiveFromInventory`) · Transport: UNKNOWN (§4, two candidates) · Payload: `{itemId, identityId, itemName, urgency}` (E1, real, verified) · Identity: `source_reference=itemId` · Idempotency: Procurement-side, ADR-003, governed limitation · Authorization: N/A (system-to-system signal, not a user action) · Failure behavior: undefined on Inventory's stub side (it's a stub) · Ownership: Inventory owns the payload shape; Procurement owns normalization · Evidence: E1 · Verification status: CONTRACT DEFINED (Procurement side), transport UNKNOWN · Open questions: which transport; who updates Inventory's stub to call the real function

### IC-02 — JARVIS/Personal AI Core → Procurement
Producer: JARVIS/Personal AI Core · Consumer: UNKNOWN (candidate: `handleProcurementCommand`) · Transport: UNKNOWN · Payload: UNKNOWN · Identity: UNKNOWN (no actor-mapping evidence found) · Idempotency: UNKNOWN · Authorization: UNKNOWN · Failure behavior: UNKNOWN · Ownership: JARVIS side entirely unread this round (no source access) · Evidence: E0 · Verification status: UNKNOWN · Open questions: essentially all of them — this is the least-resolved contract in the registry

### IC-03 — Telegram → Procurement
Producer: Telegram (adapter TBD) · Consumer: `TelegramConfirmationAdapter` (simulated only) · Transport: UNKNOWN (webhook vs. something else) · Payload: user reply text (assumed `/confirm <id>` / `/reject <id>` shape, by analogy to the command router) · Identity: `request_id` + `confirmed_snapshot_json` · Idempotency: duplicate confirmation handled (test #7) · Authorization: none beyond "a Telegram user replied" — no stronger auth modeled · Failure behavior: safe string returned, no throw (test #18) · Ownership: Procurement owns confirmation semantics; Telegram owns transport only (Q4, unchanged) · Evidence: E2 · Verification status: CONTRACT DEFINED, simulated only · Open questions: real bot token/environment (P3, BLOCKED)

### IC-04 — Procurement → TASKS
See §5–§7 in full. Evidence: E1 (schema) + E0 (writer). Verification status: CONTRACT DEFINED (proposal), OWNERSHIP UNKNOWN. Open questions: Integration Authority (§6), TASK_ID namespace approval (§5).

### IC-05 — Procurement ↔ Personal AI Core / EventBus
Producer/Consumer: N/A — Procurement has no code on either side of this relationship today. Evidence: E0. Verification status: NOT APPLICABLE. Open questions: whether this link should exist at all is itself undecided; not proposing it prematurely (EP3).

---

## 13. Evidence Matrix

| Item | Evidence Level | Status | Evidence |
|---|---|---|---|
| Slice 1 simulated runtime | E2 | PASS | 19/19, `test-harness.js` |
| TASKS schema | E1 | VERIFIED (schema only, not ownership) | `00_Config.txt`, `29_InventoryBridge.txt` |
| TASK_ID generation mechanism | E1 | VERIFIED | `_generateTaskId`/`_reserveIdBlock` read directly |
| Inventory→Procurement transport | E1 (conflicting) | UNKNOWN | Stub comment vs. ecosystem pattern |
| EventBus existence (Personal AI Core) | E1 (stored context, not re-verified this round against live JARVIS source) | PARTIALLY VERIFIED | Prior-session memory + Inventory's own stub referencing it |
| Reminder OS Sheet-polling pattern | E1 (stored context) | PARTIALLY VERIFIED | Prior-session memory |
| JARVIS→Procurement contract | E0 | UNKNOWN | None |
| Real GAS execution | — | EXTERNAL VERIFICATION REQUIRED | N/A — see §14 |
| Cross-OS integration (any link) | E0 | UNKNOWN | None reach E4 |

---

## 14. External Verification Pack

**EV-01 — Real GAS Procurement Smoke.** See the 8-step Human Verification Procedure in §8.

**EV-02 — TASK_ID Authority.**
Action: Inspect Inventory OS's live `PropertiesService` (Project Settings → Script Properties, in the real Apps Script editor) for the key `LAST_TASK_ID_NUM`.
Expected: A single integer value.
Evidence to capture: The current value.
Pass/fail: N/A (informational) — confirms Q1/Q2 findings match the deployed reality, not just the source snapshot given to Claude.

**EV-03 — TASKS Ownership.**
Action: Ask whoever owns the TASKS Spreadsheet/sheet (this may be a "who do I go ask" question more than a technical step) whether any system besides Inventory OS is expected to write rows there, and whether a public task-creation interface is planned.
Expected: A definitive answer to §6's Integration Authority question.
Evidence to capture: The answer itself.
Pass/fail: N/A — this is a decision, not a test.

**EV-04 — Cross-OS Transport.**
Action: Open Personal AI Core's real source (or ask its owner — likely also Steven) whether `EventBus.emit()`/`EventBus.subscribe()` (or equivalent) is real, deployed code today, and whether Inventory OS is registered as a producer/consumer on it.
Expected: Confirms or refutes Candidate A vs. B from §4.
Evidence to capture: Whichever file/answer resolves it.
Pass/fail: Resolves IC-01/IC-02's transport column from UNKNOWN to VERIFIED or CONTRACT DEFINED.

**EV-05 — End-to-End Procurement Request.**
Explicitly gated: only attempt after EV-01 through EV-04 have resolved their respective open questions. Not attempted this round, and not specified in more detail than that, per instruction ("这项只有在前置 contract 已明确之后才能做").

---

## 15. Governance Changes

This round updates (see §16 for the file-by-file list): `00_Project_State.js` and `README.md`, both pointing to this new report — no `Gate criteria` were altered anywhere, and no architecture already frozen (Q1–Q5, ADR-000–003) was reopened or rewritten.

---

## 16. P1–P8 Entry Gate Recheck

| Gate | Status | Evidence | Blocking? |
|---|---|---|---|
| P1 (Minimum vs Rich definition) | DEFINED | §18 below | — |
| P2 (real invocation/command entrypoint) | UNKNOWN (topology unresolved) | §4, §11 | Yes |
| P3 (Telegram) | BLOCKED | No real environment | Yes (Rich) |
| P4 (TASKS) | BLOCKED | §6 — Integration Authority genuinely unresolved, not just schema | Yes (Rich) |
| P5 (Real GAS) | EXTERNAL VERIFICATION REQUIRED | §3, §8 | Yes |
| P6 (Concurrency architecture) | READY (unchanged) | Ledger §13/H1 | No |
| P7 (Confirmation expiry) | DECISION APPROVED (unchanged) | §10 | No |
| P8 (Recovery) | POLICY DEFINED, Slice 2 Mandatory (unchanged) | §9 | No |

---

## 17. Minimum Slice 2

- **MUST HAVE BEFORE Slice 2 (any version):** P2 resolved to at least CONTRACT DEFINED + some real evidence of the transport; P5 real GAS smoke (EV-01).
- **CAN DEFER (Rich-only):** P3 (Telegram), P4 (TASKS) — a Minimum Slice 2 could plausibly run with `TelegramConfirmationAdapter`/`createOrUpdateTask` still stubbed, as Slice 1 already does, as long as that's an explicit, acknowledged limitation rather than a silent gap.
- **EXTERNAL VERIFICATION ONLY (doesn't block local implementation):** EV-02 (informational), aspects of EV-04 that only confirm rather than change behavior.
- **MUST RESOLVE BEFORE PRODUCTION (can wait past Slice 2's start, not past shipping):** TASKS Integration Authority (§6) — Slice 2 could ship without real Task creation working, but production use implies real tasks eventually need to appear somewhere.

---

## 18. Remaining Blockers

1. Cross-OS transport for Inventory→Procurement and JARVIS→Procurement — genuinely two unresolved questions, not one (§4).
2. Real GAS environment access (§3) — external to this session entirely.
3. TASKS Integration Authority (§6) — an ownership/permission question, not a technical one.

---

## 19. Recommended Next Action

Steven runs the 8-step Human Verification Procedure (§8) at his convenience — it needs no further design work, just real GAS access. In parallel, EV-03/EV-04 are conversations/lookups Steven can resolve without Claude at all (they depend on systems Claude cannot read). Once those two return real answers, a future round can close P2/P4 with actual evidence instead of candidate hypotheses.

---

## 20. STOP / GO Decision

**SLICE 2 — BLOCKED**

Per the governing rule, this holds regardless of how close individual gates look — P2 and P5 are unresolved regardless of scope (Minimum or Rich), and both require evidence this round could not manufacture.

---

**STOP.** No Slice 2 implementation, no Inventory/JARVIS/Telegram/TASKS runtime changes, no `confirmation_expires_at` migration, and no unilateral EventBus/JARVIS/TASK_ID decision made final — §5's Option C is a recommendation awaiting Steven's approval, not an implemented change. Awaiting next authorization.
