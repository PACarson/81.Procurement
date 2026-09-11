# Procurement OS

**Module range:** 60–69 (Domain) + shared Core Capability Layer (`00_Capability_*`, owned by the Inventory OS repository, accessed via a shared ecosystem Spreadsheet — ADR-002)

**Purpose:** Owns the lifecycle of procurement demand — Request → Normalize → Plan → Decision → User Confirmation → Execution Handoff → Events → Projection → Insights → Bridge. Not Inventory OS, not Finance OS, not a Supplier CRM, not Accounting OS, not Warehouse OS, not Payment OS, not a generic task manager.

**Implementation status: Slice 1 implemented and empirically verified (2026-09-10).**
- Implemented: `00_Config.js`, `00_Setup.js`, `60`–`67`, `69` (9 files)
- Not yet implemented (by design, see State §6): `68_ProcurementInsights.js`
- Verification: 12/12 test-matrix items PASS against the actual executed code (`implementation/test-harness.js` fakes the GAS runtime and runs the real modules — not asserted, run). Three real bugs were found and fixed during this process; see State §9 for what they were.
- **Not yet verified:** true concurrent execution and real Sheets/LockService behavior in an actual GAS environment (the test harness runs in Node with a single-threaded fake). This is called out explicitly, not glossed over — see State §9 Risk Register H1/H3.

**Governance:** Q1–Q5 closed (2026-09-09). Four ADRs: ADR-000 (independent Domain OS, adopts Inventory OS's S1–S9 + Capability Layer lineage), ADR-001 (User Confirmation as a hard, channel-agnostic, snapshot-scoped authorization boundary), ADR-002 (independent GAS runtime, temporarily shared persistence), ADR-003 (Bridge inbound idempotency, with its limitation explicitly labeled "GOVERNED V0.x IDEMPOTENCY LIMITATION").

**Source-of-truth files (in priority order):**
1. `00_Project_Constitution.js` — principles (P1–P10), contracts (§5), governance baseline (§8)
2. `00_File_Map.js` — per-module spec + implementation status for every 60–69 file
3. `00_ADR.js` — ADR-000 through ADR-003 in full
4. `00_Project_State.js` — phase, closure record, Slice 1 implementation record (readiness findings, bugs found & fixed, real test results, risk register)
5. `implementation/` — the actual Slice 1 code + `test-harness.js`

**Known upstream limitation (by design, not a gap):** Inventory OS's real `sendProcurementRequest()` payload today is only `{ itemId, identityId, itemName, urgency }`. `estimated_quantity`, `unit`, `reason`, and `required_before` are nullable in Procurement's contract and are never fabricated. Enriching Inventory OS's payload is tracked as an "UPSTREAM FOLLOW-UP — INVENTORY OS" item, not a Procurement OS blocker (State §9-G).

**Before deploying:** set `PROC_CONFIG.SPREADSHEET_ID` in `00_Config.js` to the real shared ecosystem Spreadsheet ID, add Procurement OS as a Library dependency wherever Telegram commands are routed (assumed to be Personal AI Core/JARVIS, by analogy with Inventory OS's `handleInventoryCommand` — this analogy is flagged as unverified in State §9-A, not confirmed against JARVIS's own code), then run `setupProcurementOS()` once.

**Next decision point (not a code task):** Slice 2 (real Inventory wiring + real Telegram + real Task creation) depends on cross-repo coordination that Procurement OS cannot resolve unilaterally — see State §9-I.
