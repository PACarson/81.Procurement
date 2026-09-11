// ============================================================
// 61_ProcurementNormalizer.gs — Procurement OS — S2 Normalizer
//
// Purpose: map any source domain's native payload onto the
// canonical NormalizedProcurementRequest contract (Constitution
// 五、5.1). Validates required fields. Computes idempotency_key
// (Constitution 五、5.5 / ADR-003). Zero side effects — does not
// write Sheets. Only module allowed to call CapabilityIdentity
// (Constitution P2).
//
// EXPORTS:
//   ProcurementNormalizer.normalize(sourceDomain, rawPayload)
//     → NormalizedProcurementRequest
// ============================================================

var ProcurementNormalizer = (function () {
  'use strict';

  function normalize(sourceDomain, rawPayload) {
    var mapped;
    if (sourceDomain === 'Inventory') {
      mapped = _mapFromInventory(rawPayload);
    } else if (sourceDomain === 'Manual') {
      mapped = _mapFromManual(rawPayload);
    } else {
      // P7 — source-agnostic by design: an unknown domain is a
      // configuration gap (missing Adapter), not a reason to guess
      // a mapping. Fail loudly rather than silently mis-normalize.
      throw new Error('normalize: no Domain Adapter defined for source_domain="'
        + sourceDomain + '". Add one instead of guessing a mapping.');
    }

    var identity = _resolveIdentity(mapped);

    var normalized = {
      source_domain:        sourceDomain,
      source_reference:     mapped.source_reference,
      identity_id:          identity.identity_id,
      canonical_name:       identity.canonical_name,
      // Q3 — nullable, never fabricated. Inventory's real payload
      // does not carry these; leave them exactly as absent.
      estimated_quantity:   (mapped.estimated_quantity === undefined) ? null : mapped.estimated_quantity,
      unit:                 (mapped.unit === undefined) ? null : mapped.unit,
      reason:               (mapped.reason === undefined) ? null : mapped.reason,
      required_before:      (mapped.required_before === undefined) ? null : mapped.required_before,
      urgency:              _validateUrgency(mapped.urgency),
      requested_at:         _procNow()
    };
    normalized.idempotency_key = _computeIdempotencyKey(normalized);
    return normalized;
  }

  // ── Domain Adapters ─────────────────────────────────────────
  // Constitution 五、5.2 — mapping only, never enrichment/fabrication.

  function _mapFromInventory(rawPayload) {
    if (!rawPayload.itemId)     throw new Error('Inventory payload missing itemId.');
    if (!rawPayload.urgency)    throw new Error('Inventory payload missing urgency.');
    return {
      source_reference: String(rawPayload.itemId),
      // identityId may already be resolved on Inventory's side; we
      // still verify it exists via CapabilityIdentity.get() in
      // _resolveIdentity rather than trusting it blindly.
      _preResolvedIdentityId: rawPayload.identityId || null,
      _fallbackName: rawPayload.itemName || null,
      urgency: rawPayload.urgency
      // estimated_quantity / unit / reason / required_before:
      // deliberately absent — see Constitution 五、5.1 补充说明.
    };
  }

  function _mapFromManual(rawPayload) {
    if (!rawPayload.itemName) throw new Error('Manual payload missing itemName.');
    if (!rawPayload.urgency)  throw new Error('Manual payload missing urgency.');
    return {
      source_reference: rawPayload.requestRef || ('manual-' + new Date().getTime()),
      _preResolvedIdentityId: null,
      _fallbackName: rawPayload.itemName,
      urgency: rawPayload.urgency,
      estimated_quantity: (rawPayload.estimatedQuantity !== undefined) ? rawPayload.estimatedQuantity : undefined,
      unit: rawPayload.unit,
      reason: rawPayload.reason,
      required_before: rawPayload.requiredBefore
    };
  }

  // ── Identity resolution (only module allowed to do this — P2) ──

  function _resolveIdentity(mapped) {
    // Real deployment: CapabilityIdentity is a Shared Kernel module
    // owned by the Inventory OS repository (Constitution 三、),
    // reached here as a GAS Library dependency once Procurement OS
    // is added to that project the same way Inventory OS's own
    // handleInventoryCommand()-style entry points are consumed by
    // Personal AI Core (see State §Implementation Readiness —
    // this is an assumption, not verified against JARVIS's own
    // code, flagged there explicitly).
    if (typeof CapabilityIdentity !== 'undefined') {
      if (mapped._preResolvedIdentityId) {
        var existing = CapabilityIdentity.get(mapped._preResolvedIdentityId);
        if (existing) return { identity_id: existing.identity_id, canonical_name: existing.canonical_name };
        // Fall through to resolve-by-name if the passed ID doesn't
        // actually exist — don't blindly trust an upstream ID.
      }
      return CapabilityIdentity.resolve(mapped._fallbackName, 'Procurement');
    }

    // Standalone/test fallback ONLY (no real Shared Kernel available
    // in this execution context) — never used when CapabilityIdentity
    // is actually wired up. Makes smokeTestProcurementOS() runnable
    // in isolation; Constitution P2 still holds in real deployment.
    console.error('[Normalizer] CapabilityIdentity unavailable — using '
      + 'local fallback identity. This must never happen in production.');
    return {
      identity_id: mapped._preResolvedIdentityId || ('LOCAL-' + mapped._fallbackName),
      canonical_name: mapped._fallbackName || mapped._preResolvedIdentityId
    };
  }

  // ── Validation ──────────────────────────────────────────────

  function _validateUrgency(value) {
    var U = PROC_CONFIG.URGENCY;
    var valid = [U.NORMAL, U.HIGH, U.CRITICAL];
    if (valid.indexOf(value) === -1) {
      throw new Error('Invalid urgency: "' + value + '". Must be one of ' + valid.join('/') + '.');
    }
    return value;
  }

  // ── Idempotency key (Constitution 五、5.5 / ADR-003) ─────────
  // GOVERNED V0.x IDEMPOTENCY LIMITATION: uniqueness scope is
  // "same identity + same urgency, while a non-terminal request
  // already exists" — not true per-delivery event identity, because
  // Inventory's payload carries no correlation/event ID (Q3). This
  // is a documented, accepted limitation, not an oversight — see
  // ADR-003 and State §Risk Register.

  function _computeIdempotencyKey(normalized) {
    return normalized.source_domain + ':' + normalized.source_reference + ':' + normalized.urgency;
  }

  return { normalize: normalize };
})();
