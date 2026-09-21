# Procurement OS

**Module range:** 60–69 (Domain) + shared Core Capability Layer (`00_Capability_*`, owned by the Inventory OS repository, accessed via a shared ecosystem Spreadsheet — ADR-002)

**Purpose:** Owns the lifecycle of procurement demand — Request → Normalize → Plan → Decision → User Confirmation → Execution Handoff → Events → Projection → Insights → Bridge. Not Inventory OS, not Finance OS, not a Supplier CRM, not Accounting OS, not Warehouse OS, not Payment OS, not a generic task manager.

**Implementation status: SLICE 1 — VERIFIED CORE** (see `00_Slice1_Closure_Ledger.js`). **Slice 2 reclassified 2026-09-15** (see `Procurement_OS_PreExisting_Ecosystem_Capability_Reclassification.md`) into three layers rather than one flat status: **Slice 2A (Procurement Internal) = CONDITIONAL**, **Slice 2B (TASKS Integration) = BLOCKED**, **Slice 2C (Cross-OS Integration) = FUTURE DEPENDENCY**. Real GAS testing (done by Steven, not simulated) confirmed the core lifecycle runs correctly end-to-end in a live Apps Script project; one real defect (date-column formatting) was found and fixed this round — see `implementation/`, now 21/21 regression tests.
- Implemented: `00_Config.js`, `00_Setup.js`, `60`–`67`, `69` (9 files)
- Not yet implemented (by design, see State §6): `68_ProcurementInsights.js`
- Verification: 19/19 test-matrix items PASS against the actual executed code (`implementation/test-harness.js`, independently re-run from both the working copy and the delivered zip — they match). This number has changed across rounds as gaps were found in the *tests themselves* (not just the code) — see the Ledger's "Independent re-verification" note for what changed and why, rather than treating any single PASS count as final.
- **Explicitly separated, not collapsed:** IMPLEMENTED=PASS, SIMULATED GAS=PASS, REAL GAS=NOT VERIFIED, INTEGRATION=NOT VERIFIED, PRODUCTION READY=NOT VERIFIED. Full Evidence Matrix (G1–G10) and the Slice 2 Entry Gate determination (currently **BLOCKED** — see Ledger §19-21) are in the Ledger, not repeated here.

**Governance:** Q1–Q5 closed (2026-09-09). Four ADRs: ADR-000 (independent Domain OS, adopts Inventory OS's S1–S9 + Capability Layer lineage), ADR-001 (User Confirmation as a hard, channel-agnostic, snapshot-scoped authorization boundary), ADR-002 (independent GAS runtime, temporarily shared persistence), ADR-003 (Bridge inbound idempotency, with its limitation explicitly labeled "GOVERNED V0.x IDEMPOTENCY LIMITATION").

**Source-of-truth files (in priority order):**
1. `Procurement_OS_PreExisting_Ecosystem_Capability_Reclassification.md` — most current: the Slice 2A/2B/2C split, and why (READ THIS FIRST)
2. `Slice2_Internal_vs_Integration_Scope.md` — exact scope of each layer
3. `Identity_Boundary_Matrix.md` — identity/ID ownership across Procurement/Inventory/TASKS
4. `Procurement_OS_External_Verification_and_CrossOS_Contract_Closure_Report.md` — cross-OS topology, TASKS ownership investigation, Human Verification Procedure
5. `00_Slice2_Entry_Gate.js` — original P1–P8 (2026-09-13) plus the 2026-09-15 reclassification supersession note
6. `00_Slice1_Closure_Ledger.js` — Slice 1 verification status, Evidence Matrix
7. `00_Project_Constitution.js` — principles (P1–P10), contracts (§5), governance baseline (§8)
8. `00_File_Map.js` — per-module spec + implementation status for every 60–69 file
9. `00_ADR.js` — ADR-000 through ADR-003 in full
10. `00_Project_State.js` — phase history (historical snapshots — current status is in the files above)
11. `implementation/` — the actual Slice 1 code + `test-harness.js` (now 21/21)

**Known upstream limitation (by design, not a gap):** Inventory OS's real `sendProcurementRequest()` payload today is only `{ itemId, identityId, itemName, urgency }`. `estimated_quantity`, `unit`, `reason`, and `required_before` are nullable in Procurement's contract and are never fabricated. Enriching Inventory OS's payload is tracked as an "UPSTREAM FOLLOW-UP — INVENTORY OS" item, not a Procurement OS blocker (State §9-G).

**Before deploying:** set `PROC_CONFIG.SPREADSHEET_ID` in `00_Config.js` to the real shared ecosystem Spreadsheet ID, add Procurement OS as a Library dependency wherever Telegram commands are routed (assumed to be Personal AI Core/JARVIS, by analogy with Inventory OS's `handleInventoryCommand` — this analogy is flagged as unverified in State §9-A, not confirmed against JARVIS's own code), then run `setupProcurementOS()` once.

**Next decision point (not a code task):** Slice 2 (real Inventory wiring + real Telegram + real Task creation) depends on cross-repo coordination that Procurement OS cannot resolve unilaterally — see State §9-I.
