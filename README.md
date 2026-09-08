# Procurement OS

**Module range:** 60–69 (Domain) + shared Core Capability Layer (`00_Capability_*`, owned by the Inventory OS repository)

**Purpose:** Owns the lifecycle of procurement demand within its approved scope — Request → Plan → Decision → User Confirmation → Execution Handoff → History/Insight. It is not Inventory OS, not Finance OS, not a Supplier CRM, not Accounting OS, not Warehouse OS, not Payment OS, and not a generic task manager.

**Architecture status:** Architecture Initialization. No `.gs`/`.js` implementation files exist under 60–69. No `PROCUREMENT_REQUESTS` or `PROC_LEDGER` sheets exist. The integration point on the Inventory OS side (`sendProcurementRequest()` in `29_InventoryBridge.gs`) is currently a stub that only logs to console.

**Governance status:** Full governance package drafted from repository evidence (`00_Project_Constitution.js`, `00_Project_State.js`, `00_File_Map.js`, `00_ADR.js`). Two architecture decisions recorded (ADR-000: independent Domain OS; ADR-001: explicit User Confirmation boundary). Four open questions remain for owner sign-off — see `00_Project_Constitution.js` §9.

**Current phase:** Architecture Initialization — governance and design only, per explicit instruction not to begin implementation until the open questions below are resolved.

**Source-of-truth files (in priority order):**
1. `00_Project_Constitution.js` — architecture contract, principles, open questions
2. `00_File_Map.js` — per-module spec for all 60–69 files
3. `00_ADR.js` — ADR-000 and ADR-001 in full
4. `00_Project_State.js` — phase, repository diagnosis, design decisions, next steps

**Implementation status:** 0% — governance and architecture only. Do not treat any prior `00_Project_Constitution` / `00_Project_State` / `00_File_Map` content found elsewhere in this repository's history as authoritative for Procurement OS: that content belonged to Inventory OS V2.1 (modules 21–26) and was misplaced here.

**Open questions requiring owner decision before implementation begins:**
- Q1 — Adopt Inventory OS's own "Domain OS Lifecycle Standard" (S1–S9 + Capability Layer) as Procurement OS's architecture baseline, rather than the separately-maintained Universal Domain OS Blueprint tree?
- Q2 — Deployment: same Google Spreadsheet/Apps Script project as Inventory OS, or a genuinely separate one (which would require explicit cross-project access to `IDENTITY_REGISTRY` and `TASKS`)?
- Q3 — Who updates Inventory OS's `sendProcurementRequest()` stub to send the full request contract — this task, or a future Inventory OS iteration?
- Q4 — What is the actual Telegram UX for User Confirmation?

Full detail and rationale for all four: `00_Project_Constitution.js` §9.
