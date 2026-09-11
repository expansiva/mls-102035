# access60

## 2026-09-11

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
