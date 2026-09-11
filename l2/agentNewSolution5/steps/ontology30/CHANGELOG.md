# ontology30

## 2026-09-10

- Isolated entity validation skips journey citation (`requireJourneyCitation: false`). The
  fan-out filters the plan to one entity, so `NS5_ONTOLOGY_JOURNEY_ENTITY` always failed when
  journeys cited more than one. Plan and bindings still require the full set.
- Normalize drops `mdmSubtype` unless `kind === 'mdm'` and `mutability: appendOnly` unless
  `kind !== 'mdm'` (prompt did not stop the model filling both on every entity). Schema `if/then`
  not used (`x-tool-strict` would leave the repair path). Gate still requires `mdmSubtype` on a
  real mdm entity. Fixture: live `comandaRestaurante5` plan draft.
- First ontology step of agentNewSolution5: entities, mdm as a role on level 1, `details`,
  lifecycle with allowed transitions, relationship bindings. Tools `submitNs5OntologyPlan`,
  `submitNs5Entity`, `submitNs5RelationshipBindings`. Gate keeps E4 idField/mdm/displayField and
  n15 relationship rules; drops projection/derivation/general/sourceRefs. Repair <= 2. Persist
  `ontology/<Entity>.defs.ts` and `ontology/index.defs.ts`. A run then stops at
  `awaitingStep: rules40`.
