// ============================================================
// 60_ProcurementRequest.gs — Procurement OS — S1 Request
//
// Purpose: capture raw input, zero business logic (Constitution 二、
// S1). Does not validate, does not touch Sheets, does not call
// CapabilityIdentity. Pure pass-through to Normalizer.
//
// EXPORTS:
//   ProcurementRequest.receiveRequest(sourceDomain, rawPayload)
//     → NormalizedProcurementRequest
// ============================================================

var ProcurementRequest = (function () {
  'use strict';

  function receiveRequest(sourceDomain, rawPayload) {
    if (!sourceDomain) throw new Error('receiveRequest: sourceDomain is required.');
    if (!rawPayload || typeof rawPayload !== 'object') {
      throw new Error('receiveRequest: rawPayload must be an object.');
    }
    return ProcurementNormalizer.normalize(sourceDomain, rawPayload);
  }

  return { receiveRequest: receiveRequest };
})();
