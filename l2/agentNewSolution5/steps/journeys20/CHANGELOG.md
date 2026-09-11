# journeys20

## 2026-09-11

- After writing `journeys/index.defs.ts`, remove every `journeys/*.defs.ts` whose id is not
  in the index. Draft records `removedOrphans[]`. Closes the class where a new id set left
  previous files on disk (Q1 / ns5_11).

## 2026-09-10

- Normalize drops `handoffTo` unless `kind === 'handoff'` (prompt + named `gateFeedback` did not
  stop the model filling the field as a self-label: 17/17 x 3). Schema `if/then` not used:
  `x-tool-strict` would reject the batch and leave the repair path. Gate still requires a valid
  `handoffTo` on a real handoff. Fixture: live `comandaRestaurante5` self-label payload.
- Prompt omits `handoffTo` except on `kind: handoff` (structural counter-example with placeholders).
  `NS5_JOURNEY_HANDOFF_TO_KIND` names the `stepId` and says `remove the field`; formatted feedback
  includes the path. Gate unchanged. `MAX_REPAIRS` stays 2.
- First journeys step of agentNewSolution5: business only, `affects`, `decide`, mechanical drop of
  inferred external actors without an exclusive step. Tool `submitNs5Journeys`, gate, repair <= 2,
  persist `journeys/*.defs.ts` and `journeys/index.defs.ts`. A run then stops at
  `awaitingStep: ontology30`.
