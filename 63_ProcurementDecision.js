// ============================================================
// 63_ProcurementDecision.gs — Procurement OS — S4 Decision
//
// Purpose: decide(plan) = preview (used pre-lock, e.g. for a
// fast-fail check); recompute(freshRow, plan) = authoritative
// result, called by Execution AFTER it holds the lock and has
// re-read the current state (Constitution P6 — Check/Use in the
// same critical section, directly copying Inventory OS's HIGH2
// fix rather than re-inventing it). Zero side effects. Never
// acquires a lock itself (Constitution DD6-equivalent reasoning —
// keeps this a pure function so any future Domain OS can copy the
// same Decision/Execution split without re-litigating "should
// Decision lock").
//
// Slice 1 scope note: the recommendation rule below is
// intentionally simple (CRITICAL/HIGH → recommend; NORMAL →
// don't) — this is a placeholder business rule, not an
// architectural commitment. Constitution 九、D2's quantity
// tolerance and this rule's exact thresholds are implementation
// parameters (PROC_CONFIG), not hard-coded magic numbers.
//
// EXPORTS:
//   ProcurementDecision.decide(plan) → DecisionObject
//   ProcurementDecision.recompute(freshRow, plan) → DecisionObject
// ============================================================

var ProcurementDecision = (function () {
  'use strict';

  function decide(plan) {
    return _evaluate(plan);
  }

  function recompute(freshRow, plan) {
    // freshRow is the authoritative just-re-read Projection row;
    // recompute() exists as a distinct entry point (not just an
    // alias for decide()) so that a future revision can make the
    // authoritative pass consider fields decide()'s preview
    // deliberately ignores (e.g. a lock-scoped budget check) without
    // touching every call site that only ever wants the preview.
    return _evaluate(plan, freshRow);
  }

  function _evaluate(plan, freshRow) {
    var U = PROC_CONFIG.URGENCY;
    var recommend = (plan.candidateUrgency === U.CRITICAL || plan.candidateUrgency === U.HIGH);

    var rationale = recommend
      ? ('urgency=' + plan.candidateUrgency + ' meets the recommend threshold')
      : ('urgency=' + plan.candidateUrgency + ' below recommend threshold — no action proposed');

    if (plan.hasOpenSibling) {
      rationale += '; an open request already exists for this identity+source (see contributingRequestIds)';
    }

    return {
      recommend: recommend,
      decidedQuantity: (plan.candidateQuantity === null || plan.candidateQuantity === undefined)
        ? null   // Q3 — never invent a number the source domain didn't provide
        : plan.candidateQuantity,
      decidedUrgency: plan.candidateUrgency,
      rationale: rationale
    };
  }

  return { decide: decide, recompute: recompute };
})();
