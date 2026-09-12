# organization — platform level 1

Level 1 is the MDM ontology of the platform: identification columns plus typed base fields inside
the document. It is not a generated client module. A client project only stores
`l4/organization/registry.defs.ts` (roles, actors, `general` fields in use).

## Identification vs base

- **Identification** lives in the engine index (`name`, `docType`, `docId`, `countryCode`, `tags`).
  The engine searches and deduplicates on these.
- **Base** is the rest of what the platform knows about a subtype (`contacts[]`, `addresses[]`,
  `aliases[]`, `birthDate`, `legalName`, `companyKind`, …) plus the relationship types that subtype
  may use. These keys are typed by the platform even when they sit in the document jsonb.

`general` (organization-wide extra fields) and each module namespace are **not** level 1.

## Who edits this folder

The platform, on a platform release. The engine emits
`mls-102034/l4/organization/ontology/*.defs.ts` (`l1/mdm/scripts/emitLevel1Defs.ts`). This folder
no longer holds a copy. Never edit those defs by hand — a drift test in 102034 fails if they
diverge from the engine.
