# Auth map

## Gaps

- E4B (2026-09-08) writes person-scope anchors and synthesized authorities; E9 writes V4 `operationAuthorityRefs`. Remaining: disclosure projections for external `fieldsOnly` (n08) and CB applying the anchor (n09).
- Future: make E3 `allowedInformation` items carry exact ontology `entityRef`/`fieldRef` bindings. Today they are business-language descriptions, so E8 records a review decision for `fieldsOnly` projections and the server continues applying the E3 projection. Only after those bindings exist can the E8 disclosure check be promoted back to a blocking field-level gate with mechanical evidence.
