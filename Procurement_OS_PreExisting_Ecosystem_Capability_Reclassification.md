# Procurement OS — Pre-Existing Ecosystem Capability Reclassification

Last Updated: 2026-09-15

Core principle applied: a capability that does not yet exist in another OS is not automatically a blocker for Procurement's own independently implementable internal capability. Do not make Procurement implement another OS's missing infrastructure. Do not create speculative adapters for integrations with no authoritative contract. Do not block an independently implementable capability merely because a future cross-OS integration hasn't been built yet.

---

## 1. New Baseline Facts (as given, re-confirmed against evidence where possible)

- Personal AI Core's EventBus is not yet actually implemented — this report treats it as a **Future Ecosystem Capability**, not a stub of something already real elsewhere.
- Inventory OS also has no completed cross-OS integration capability for Procurement to consume — its `sendProcurementRequest()` remains **Design Intent / Stub**, not Production Integration Contract.
- TASKS schema is real (E1); `_taskCreate()` is private; no sanctioned external creation interface exists.
- TASK_ID is Inventory-project-local; Procurement generating the same bare format risks collision — **if Procurement ever needs to generate one at all** (see §7 — reopened and revised this round).
- **New this round, not previously available:** Steven has run real GAS testing since the last report — a real execution log shows `setupProcurementOS()` and `smokeTestProcurementOS()` completing successfully in a live Apps Script project, producing the full `PROCUREMENT_REQUESTED → PROCUREMENT_PLANNED → PROCUREMENT_PROPOSED → PROCUREMENT_CONFIRMED → PROCUREMENT_EXECUTED` sequence with idempotency holding on a duplicate delivery. One real defect was found (date columns showing "Automatic" rather than "Plain text") and has been fixed this round (Config/Setup/Projection/Events changes, 21/21 regression re-run — see the implementation zip and `00_Project_State.js`).

This last point matters enormously for this reclassification: **P5 is no longer purely theoretical.** Real evidence now exists that Procurement's own internal lifecycle runs correctly end-to-end in a real GAS environment, using nothing but a direct function call — no Inventory, no Telegram, no TASKS, no EventBus involved at all.

---

## 2. Four-Category Reclassification

| Category | Definition | Blocks Slice 2A (Internal)? |
|---|---|---|
| **A — Procurement Internal Blocker** | Would break Procurement's own runtime correctness/data integrity/state-machine correctness | Yes |
| **B — External Contract Blocker** | Procurement cannot solve alone; a real integration needs an explicit contract that doesn't exist yet | Blocks the *integration*, not Procurement's internal capability |
| **C — Future Ecosystem Capability** | Another OS's own missing feature | No — must not be treated as a Procurement blocker |
| **D — Production Verification Requirement** | Needs real-environment confirmation before calling something production-ready | Blocks *production sign-off*, not continued development |

---

## 3. Slice 2's Real Original Scope (Q1–Q6)

**Q1 (what Slice 2 was meant to add):** Real GAS deployment of Procurement's own runtime; real invocation from *some* caller; Telegram confirmation made real; TASKS writing made real; the Recovery/orphan scheduler; the `confirmation_expires_at` migration.

**Q2 (capabilities entirely Procurement's own):** Real GAS deployment and verification of the existing Slice 1 lifecycle (Request→Normalizer→Planner→Decision→Confirmation→Execution→Events→Projection); the orphan/recovery scheduler (reads/writes only Procurement's own tables); the `confirmation_expires_at` schema migration (Procurement's own table, Procurement's own code); the date-format fix just completed.

**Q3 (capabilities needing Inventory/TASKS/Personal AI Core):** Real Inventory→Procurement transport; real TASKS writing; anything routed through a real EventBus; real JARVIS-driven invocation.

**Q4 (can Procurement do most of Slice 2 with zero EventBus?):** **Yes.** Nothing in Q2's list touches EventBus at all.

**Q5 (can Procurement implement its lifecycle with no TASKS public API?):** **Yes** — by design (Constitution §7 Failure semantics: EXECUTED stands on its own regardless of downstream Task-creation outcome).

**Q6 (can Request/Planner/Decision/Confirmation/Authorization/Execution/Projection all be implemented and verified with zero Inventory→Procurement transport?):** **Yes — already demonstrated twice**: once in simulation (21/21, `test-harness.js`) and once for real (Steven's own execution log, direct function calls, no Inventory wiring involved).

Per the governing rule, none of Q4–Q6 being "yes" may be treated as a reason to keep blocking these internal capabilities.

---

## 4. Reclassifying P1–P8

| Gate | Classification | Procurement Internal Blocker? | External Dependency? | Future Capability? | Verification Only? |
|---|---|---|---|---|---|
| P1 | Definitional (Minimum/Rich split) | — | — | — | — |
| P2 (invocation/entrypoint) | **Reclassified**: internal lifecycle does not need this resolved to be tested/deployed (Steven already did so via direct calls); *automatic* production triggering does | No (for internal capability) | Partially (for automatic real-world triggering) | Partially (EventBus side) | Yes (whether a *specific* real caller works) |
| P3 (Telegram) | Category C/B, not A | No | Yes (for a real channel) | Yes (real bot/environment) | — |
| P4 (TASKS) | Category B, not A | No | Yes (ownership/interface) | No (schema is real, just ownership unresolved) | — |
| P5 (Real GAS) | **Substantially upgraded this round** — see §5 | No longer purely blocking; largely satisfied for the core lifecycle | No | No | Yes (remaining: concurrency, the just-shipped date-format fix) |
| P6 (Concurrency, logical) | Already Category A, already satisfied | Resolved | No | No | Runtime-layer piece is Category D |
| P7 (Confirmation expiry) | Category A, decision made, migration not yet done | Yes, but low-risk and entirely Procurement's own to schedule | No | No | No |
| P8 (Recovery) | Category A, policy defined, scheduler not yet built | Yes, but entirely Procurement's own to schedule | No | No | No |

The headline change from the prior round: **P2, P3, P4 are none of them Category A.** They were previously written as flat "BLOCKED" without this distinction, which is exactly the overcollapse this round's principle exists to correct.

---

## 5. P5 Re-Examined With Steven's Real Evidence

What the execution log actually demonstrates (E3 — real GAS evidence, not simulated):

- `setupProcurementOS()` ran without error in a live Apps Script project.
- `smokeTestProcurementOS()` completed the full lifecycle: intake, duplicate-intake detection (`"duplicate":true` on the second call), Telegram-adapter message construction (still console.log-only, as designed), command-driven confirmation, and execution — ending in exactly the expected 5-event sequence.
- The `[Normalizer] CapabilityIdentity unavailable — using local fallback identity` message appearing is **expected, not an error in the concerning sense** — it's the designed fallback path (Constitution §5.2/61_ProcurementNormalizer.js) firing correctly because no real `CapabilityIdentity` Library is wired up yet, exactly as documented.
- One real defect found: date columns showed "Automatic" rather than "Plain text" after setup. **Fixed this round** (see `00_Project_State.js` for the fix and the 21/21 regression re-run) — both the write-side fix (reordered formatting, applied before header writes) and the read-side defensive coercion (`_coerceDateString`, the other half of the ecosystem's own documented "format at creation AND coerce defensively on read" lesson, which this project had only half-implemented until now).

**What remains NOT verified even after this:** true concurrent execution (Steven's test was sequential, same as the Node harness — this round doesn't claim otherwise), and whether the *just-applied* date-format fix actually resolves the real-Sheets behavior (needs Steven to re-run the same check — see the updated Human Verification step).

**P5 reclassification: from "EXTERNAL VERIFICATION REQUIRED" to "SUBSTANTIALLY VERIFIED (E3, core lifecycle) — CONCURRENCY AND THE DATE-FORMAT FIX STILL PENDING RE-CHECK."** This is a real upgrade, not a relabeling — it rests on evidence Steven generated himself, not on this session assuming success.

---

## 6. Decision C — Personal AI Core EventBus

**Confirmed: Personal AI Core's EventBus is a Future Ecosystem Capability, not a Procurement integration dependency that exists today.** Procurement's own code contains no `emitToCore`-equivalent stub anywhere (confirmed by the External Verification report's IC-05 finding: NOT APPLICABLE, nothing exists on Procurement's side either) — there is nothing to "wait for" here because nothing has been designed to depend on it yet. This is recorded, not treated as resolved: if a real requirement for Procurement to publish domain events ever appears, it gets designed against real EventBus evidence at that time, not spec'd speculatively now (§16, Do Not Over-Abstract).

---

## 7. TASK_ID — Reopened and Revised

The prior round's "Option C — Procurement uses its own `PTSK-` prefix" recommendation is **withdrawn as premature**, not merely deferred. Re-examining Question 1 first: **does Procurement's Slice 2A (Internal) actually need to generate any TASK_ID at all?** No. Procurement's own lifecycle produces `request_id` (its own local identity, already implemented, already real per Steven's log showing `PR-1`) — a "Task" only enters the picture at the TASKS-integration boundary (Slice 2B), which is explicitly not part of Slice 2A. Designing a `PTSK-` namespace before Slice 2B is even scheduled was solving a problem that doesn't exist yet — exactly the premature abstraction §16 warns against.

Revised answers:
- **Q1:** No, not for Slice 2A.
- **Q2:** If Slice 2B eventually needs its own task-shaped identity distinct from a shared `TASK_ID`, a name like `ProcurementTask_ID` would be the honest label (it says what it is — Procurement's own, not the ecosystem's), decided when Slice 2B is actually being designed.
- **Q3:** If Procurement eventually writes to the real shared TASKS table, `TASK_ID` authority should default back to whoever owns that table (§ TASKS Ownership, still unresolved) — Procurement should not assume it can mint ecosystem-global IDs.
- **Q4:** Any local identity Procurement mints for its own internal purposes (which, again, it doesn't currently need one of — `request_id` already covers this) would be Procurement-local, never presented as a global `TASK_ID`.

See `Identity_Boundary_Matrix.md` for the full table.

---

## 8. Two-Layer Slice 2 Gate Model

See `Slice2_Internal_vs_Integration_Scope.md` for the full breakdown. Summary:

- **Layer 1 — Internal Readiness (Slice 2A):** Procurement's own lifecycle, real GAS deployment, `confirmation_expires_at` migration, orphan/recovery scheduler. **CONDITIONAL** — substantially demonstrated (including for real, this round), with two concrete remaining items (concurrency re-check, confirming the date-format fix in real Sheets) rather than open architecture questions.
- **Layer 2 — Integration Readiness (Slice 2B/2C):** TASKS writing, real Inventory transport, real Telegram, any EventBus-based JARVIS path. **BLOCKED / FUTURE DEPENDENCY** — genuinely external, not something this round's evidence changes.

---

## 9. Overall Recommendation

**Option 2: allow Slice 2A (Internal Procurement Capability) to proceed independently, while Slice 2B (TASKS) and Slice 2C (Cross-OS Integration) remain BLOCKED / FUTURE DEPENDENCY.**

Basis (per the required grounding — not "wanting to keep building"):
- **Current evidence:** Steven's own real-GAS execution log already demonstrates Slice 2A's core claim works outside simulation.
- **Architecture ownership:** Slice 2A touches only tables/code Procurement itself owns (`PROCUREMENT_REQUESTS`, `PROC_LEDGER`); Slice 2B/2C touch resources Procurement does not own or control (TASKS, Inventory's transport, PAC's EventBus).
- **Implementation independence:** §3's Q4–Q6 all resolve to "yes" — internal capability does not structurally depend on any unresolved external contract.
- **Future integration risk:** proceeding with Slice 2A does not foreclose any Slice 2B/2C design choice — the adapter boundaries (`ProcurementBridge.receiveFromInventory`, `createOrUpdateTask`) already exist as clearly-labeled stubs, not premature implementations.
- **No premature abstraction:** this round explicitly withdraws the one place prior work *did* lean speculative (TASK_ID Option C, §7) rather than compounding it.

This is not "SLICE 2 — BLOCKED" reasserted, and it is not "SLICE 2 — READY" overclaimed. It is a structurally different answer than either: **the whole-Slice-2 question was the wrong granularity.**

---

## 10. Final Decision Outputs

- **Procurement Internal:** CONDITIONAL (real evidence exists; two concrete re-checks remain — see §5)
- **TASKS Integration:** BLOCKED (§ TASKS Ownership genuinely unresolved)
- **Cross-OS Integration:** FUTURE DEPENDENCY (EventBus not built; Inventory transport unresolved; not currently blocking, not currently actionable either)
- **Real GAS:** PARTIALLY VERIFIED (E3 for the core lifecycle happy path; concurrency and the date-format fix's real effect still need a re-check)

---

**RECLASSIFICATION COMPLETE — AWAITING AUTHORIZATION**
