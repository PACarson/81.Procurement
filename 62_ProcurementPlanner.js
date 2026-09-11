// ============================================================
// 62_ProcurementPlanner.gs — Procurement OS — S3 Planner
//
// Purpose: build a candidate Plan (preview) from a normalized
// request, optionally aggregating with other still-open requests
// for the same identity_id. Never calls CapabilityIdentity. Never
// makes the final decision. Zero side effects.
//
// SLICE 1 SCOPE NOTE: full multi-request merge logic is
// intentionally minimal here — Slice 1 proves the request→
// confirmation→execution boundary, not aggregation sophistication
// (State §6 Implementation Sequence explicitly defers this). The
// lookup against Projection is real (not stubbed), so a later
// slice can extend the merge rule without touching this function's
// signature.
//
// EXPORTS:
//   ProcurementPlanner.plan(normalizedRequest) → PlanObject
// ============================================================

var ProcurementPlanner = (function () {
  'use strict';

  function plan(normalizedRequest) {
    var openSiblings = ProcurementProjection.listOpenByIdentity(normalizedRequest.identity_id)
      .filter(function (row) { return row.source_domain === normalizedRequest.source_domain; });

    // Slice 1: if an open sibling already exists for this exact
    // identity+source, don't propose a second independent plan —
    // this is a narrower, source-scoped cousin of the idempotency
    // check (which is about *delivery* duplicates; this is about
    // *business* duplicates, e.g. two different-but-related signals
    // for the same underlying need). Full urgency-upgrade/merge
    // logic is deferred (see note above).
    var hasOpenSibling = openSiblings.length > 0;

    return {
      identity_id: normalizedRequest.identity_id,
      canonical_name: normalizedRequest.canonical_name,
      candidateQuantity: normalizedRequest.estimated_quantity, // may be null — Decision must handle that
      candidateUrgency: normalizedRequest.urgency,
      candidateUnit: normalizedRequest.unit,
      candidateReason: normalizedRequest.reason,
      requiredBefore: normalizedRequest.required_before,
      hasOpenSibling: hasOpenSibling,
      contributingRequestIds: openSiblings.map(function (r) { return r.request_id; })
    };
  }

  return { plan: plan };
})();
