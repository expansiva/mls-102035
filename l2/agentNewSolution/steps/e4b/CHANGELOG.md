# E4B changelog

## 2026-09-09 — disclosure fields use ns4ResolvableFields

`sourceFieldIds` / `allowedDisclosureFieldIds` include `storage.idField` when it is absent from
`fields[]`. The id may appear on a disclosure projection; the proper-subset check is measured on
the resolvable set. A field that is neither resolvable nor level-1 is still
`NS4_E4B_DISCLOSURE_FIELD_UNKNOWN`.

## 2026-09-09 — disclosure projection extraction

For each external grant with limited disclosure (`fieldsOnly` / `summaryOnly` / `aggregateOnly`),
E4B proposes a derived projection `<Entity><Profile>View`, writes
`ontology/<Entity><Profile>View.defs.ts`, and sets `access-bindings` `grants` (bindings)
`projectionRef` plus `excludedFields`. Gate codes:
`NS4_E4B_DISCLOSURE_PROJECTION_REQUIRED`, `NS4_E4B_DISCLOSURE_NOT_PROPER_SUBSET`,
`NS4_E4B_DISCLOSURE_EXCLUDED_FIELDS_REQUIRED`, `NS4_E4B_DISCLOSURE_FIELD_UNKNOWN`.
E8/E10 do not consume `projectionRef` yet.

## 2026-09-08 — first implementation

Access realization step between E4 and E5. Permanent artifact
`access/access-bindings.defs.ts` (`ns4-access-bindings-v1`): per-grant person-scope anchors
and synthesized authorities `synth:<entity>:<profile>`. Gate validates each hop; a missing
field returns ownership to E4.
