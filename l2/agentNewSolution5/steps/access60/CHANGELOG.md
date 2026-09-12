# access60

## 2026-09-12

- CRUD grant uses `ns5ResolveEntityWriter` (`kind === 'crud'`), same resolution as ontology30 / I10.
- `custom` with a reachable `party: person` whose description cites the actor is
  `NS5_ACCESS_CUSTOM_HAS_ANCHOR` (repair: own/assigned/related + `anchorEntity`).
  `custom` with no Person in the module is warning `NS5_ACCESS_CUSTOM_WITHOUT_PERSON`.
- CRUD grant: `writer: 'crud'` (was `maintenance: 'crud'`). `writer: 'inbound'` does not need a crud grant.
- Artifact is actors + grants (`-access-v3`). `authorities` gone; the grant carries
  `title`/`description`. Gate: unique `grantId`, required `title`. ns5_12 form
  normalizations unchanged; they persist on `pipeline.json` `access60.normalizations[]`.

## 2026-09-11

- `NS5_ACCESS_CRUD_WITHOUT_INTERNAL_GRANT`: an entity with `maintenance: 'crud'`
  must appear in `entityRefs` of a grant whose actor is `internal`.
- Artifact is actors + authorities + grants (`-access-v2`). `profiles` gone;
  grants use `actorRef`. LLM does not emit actors. No `anonymous` (no fixture used it).
- System prompt prepends the MDM skill. `own` reaches the Person whose `mdm_tag`
  login row (namespace `login`) is the session e-mail; `docType`/`docId` is the
  national document and is not the own-anchor.
- Deterministic form cleanup after the LLM payload: `fieldsOnly` whose `allowedFields`
  cover every resolvable field of the grant entities and whose `deniedFields` is empty
  becomes `fullRecord` (lists dropped); `anchorEntity` is removed unless
  `dataScope.mode` is `own` / `assigned` / `related`. Both land on `draft.normalizations[]`.
  The gate then requires `fieldsOnly` / `summaryOnly` lists to be a proper restriction
  (`NS5_ACCESS_DISCLOSURE_FIELDS`). Live access of the three measured modules is the fixture.

## 2026-09-10

- First access step of agentNewSolution5: profiles, authorities and grants with structured
  disclosure (`allowedFields` / `deniedFields` as `Entity.field`) and a derivable person
  `anchorEntity` for `own` / `assigned` / `related`. Tool `submitNs5Access`, gate, repair <= 2,
  persist `access.defs.ts`. Path is `anchorPath()`, tested, not stored. A run then stops at
  `awaitingStep: finalize80`.
