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

The platform, on a platform release. Since ns5_43 there is ONE file: `mls-102034/l4/ontology/mdm.defs.ts`,
written by hand and proved by `mls-102034/l1/mdm/defs/mdmOntology.test.ts`. The fifteen emitted
`mls-102034/l4/organization/ontology/*.defs.ts` and their emitter are gone; the behavioural half of the
catalog (layers, visibility, identity, services, invariants) sits beside it in
`mls-102034/l4/ontology/platform.defs.ts`. `l2/agentNewSolution/helpers/level1Catalog.ts` derives from
those two what the NS4 readers see, and `level1Catalog.test.ts` freezes the prompt it produces. This
folder holds no copy.
