# Identity Boundary Matrix

Last Updated: 2026-09-15

No cell below is guessed to complete the table — where evidence doesn't exist, the cell says so.

| Identity | Owner | Scope | Generator | Shared? | Current Status |
|---|---|---|---|---|---|
| Inventory TASK_ID | Inventory OS (runtime/ID authority) — but see note below on Data Ownership | Inventory-project-local (`PropertiesService`) | Inventory OS (`_generateTaskId`, private) | Ambiguous — `SOURCE_SYSTEM` column suggests intended multi-writer design, but the only real writer today is Inventory | VERIFIED (E1 — real code read) |
| Procurement Request ID | Procurement | Procurement | Procurement (`_reserveIdBlock('PROC_REQ_ID', ...)`, `PR-####`) | No | VERIFIED — both simulated (test-harness) and real (Steven's execution log shows `PR-1`) |
| Procurement Task ID | N/A | N/A | N/A | N/A | **NOT NEEDED for Slice 2A** — see Reclassification report §7. No decision required until Slice 2B is scheduled. |
| Shared TASK_ID (ecosystem-wide, if it were to exist) | TASKS' true owner — unresolved | Ecosystem (hypothesized) | Unresolved | Yes (hypothesized) | NOT EXISTING / UNKNOWN — unchanged from the prior report |

## Note on "Inventory TASK_ID" Owner column

This table intentionally does not collapse "Inventory owns it" into a single cell the way a first pass might. Runtime Ownership and ID Authority are both confirmed Inventory (E1). Data Ownership (does TASKS *conceptually* belong to Inventory, or to some broader ecosystem task-management concept Inventory merely implements today) remains genuinely open — see the External Verification report §6 for the fuller discussion. This matrix reports the confirmable parts precisely rather than rounding up to a single tidy "Inventory" answer.

## Decision A — Procurement Identity Namespace

**Approved, trivially:** Procurement already uses its own local identity namespace (`request_id`, format `PR-####`) for everything its internal lifecycle needs — this was not a new decision to make, just something to recognize explicitly rather than re-litigate through a TASK_ID-shaped question that doesn't apply yet.

**Not approved (withdrawn):** Naming or implementing a `PTSK-`/`ProcurementTask_ID` scheme now. No second consumer or producer requiring it exists today (§16 Do Not Over-Abstract). Recorded as:

> **DEFERRED — WAIT FOR REAL USE CASE.** Revisit only when Slice 2B (TASKS Integration) is actually being scheduled, using whatever TASKS Ownership resolution exists by then to decide whether Procurement mints its own scoped identity or requests one from TASKS' authoritative owner.
