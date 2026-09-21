# Slice 2 — Internal vs Integration Scope

Last Updated: 2026-09-15

---

## Slice 2A — Procurement Internal Capability

**Must not depend on:** Personal AI Core EventBus, Inventory's future bridge, TASKS public API, JARVIS future integration — unless a specific item below is explicitly marked otherwise.

**Contents:**
- Real GAS deployment of the existing Slice 1 lifecycle (60–67, 69, Config, Setup) — **substantially demonstrated this round** via Steven's own real execution log.
- The date-column format fix (Config/Setup/Projection/Events changes made this round) — needs one more real-Sheets re-check (does the reordered `setNumberFormat('@')` + defensive read coercion actually resolve what the "Automatic" finding showed) but is otherwise Procurement's own, self-contained work.
- `confirmation_expires_at` migration (P7, decision already approved — schema change touches only `PROCUREMENT_REQUESTS`, Procurement's own table).
- Orphan/Recovery scheduler (P8, policy already defined — reads/writes only `PROCUREMENT_REQUESTS`/`PROC_LEDGER`).
- Real GAS concurrency re-check (sequential-only evidence exists so far, from both the Node harness and Steven's own single-execution test).

**Preserved integration seams (boundary exists, no premature implementation):**
- `ProcurementBridge.receiveFromInventory(payload)` — already exists as the adapter boundary; stays a clearly-labeled, callable stub until a real transport contract exists.
- `createOrUpdateTask(requestId, row)` — already exists as the adapter boundary; stays a clearly-labeled, callable stub until TASKS Ownership resolves.

**Status: CONDITIONAL** — not READY in the unqualified sense (two concrete re-checks remain), not BLOCKED (nothing here depends on an unresolved external contract).

---

## Slice 2B — TASKS Integration

**Only implementable once:** TASKS Ownership (Data Ownership + Integration Authority) is resolved by whoever actually owns that table — this round's investigation (External Verification report §6) found this is a real, unanswered permission question, not a technical gap Claude can close by reading more code.

**Contents (once unblocked):** a real `_taskCreate`-equivalent public interface (or Procurement gets authorized to write directly, with an agreed schema contract); the `request_id`-scoped dedup approach proposed earlier; failure semantics for a Task-creation failure that doesn't roll back Procurement's own EXECUTED fact.

**Status: BLOCKED — EXTERNAL CONTRACT NOT EXISTING.** Not "Procurement architecture blocked" — the internal side has nothing left to design until the external side answers.

---

## Slice 2C — Cross-OS Integration

**Contents:** real Inventory→Procurement transport (whichever of the two candidates in the External Verification report's topology table turns out to be real, or both); any EventBus-based publish/subscribe Procurement might eventually need; real JARVIS-driven invocation of `handleProcurementCommand`.

**Status: FUTURE DEPENDENCY.** EventBus itself doesn't exist yet on Personal AI Core's side (confirmed baseline fact this round) — this is explicitly not something Procurement should build a workaround for, and not something delaying it costs Slice 2A anything.

---

## Why This Split, Not Some Other One

The task's own Q4–Q6 (Reclassification report §3) are the actual test applied: for each candidate Slice 2A item, "if the external thing didn't exist today, could this still be built and verified?" A **yes** puts it in 2A. TASKS writing and cross-OS transport both fail this test by construction (they *are* the external thing) — everything else passes.
