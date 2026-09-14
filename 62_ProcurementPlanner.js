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
    // CLOSEOUT FINDING (found via test #14, not part of the original
    // checklist): earlier version filtered this lookup to the SAME
    // source_domain only, so an Inventory-sourced open request and a
    // Manual request for the identical item would never see each
    // other as siblings — exactly the case a human would consider
    // obviously related. Sibling-awareness is a business-level "is
    // there already related work in flight for this physical item"
    // check, not a per-source-domain concern, so it now looks across
    // ALL source domains. This does NOT touch the idempotency key
    // (source_domain remains part of that, unchanged, per the
    // closeout instruction not to alter it without evidence it is
    // wrong) — it only widens what counts as an informational sibling
    // for Decision's rationale text.
    var openSiblings = ProcurementProjection.listOpenByIdentity(normalizedRequest.identity_id);

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
