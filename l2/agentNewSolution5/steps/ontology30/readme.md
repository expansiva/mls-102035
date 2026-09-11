# ontology30 — the things of the business and what may happen to them

Plan + fan-out, like NS4 E4: one overview call (`submitNs5OntologyPlan`), one call per entity
(`submitNs5Entity`), then relationship bindings (`submitNs5RelationshipBindings`). Writes
`l4/<mod>/ontology/<Entity>.defs.ts` and `ontology/index.defs.ts`. Clarification is reserved and
has no screen; `/fast` auto-approves.

## Input

- The original request (`sourcePrompt`)
- Actors from `module.defs.ts`
- Journeys (`business` entire: `entity`, `affects`, `decide`)
- Platform level-1 catalog as placeholders

## Output

`Ns5OntologyEntityArtifact` per entity: kind, party, mdmSubtype, displayField, namespace fields,
`details`, lifecycle states, allowed transitions, storage. Index: entity order plus relationships
with field realization. No `kind: projection`, `derivation`, `role`, `sourceRefs`, `useRules` or
`lifecyclePredicates`.

## Invariants

- MDM: `target: mdm`, `scope: organization`, `mdmType = '<mod>.<Entity>'`, `mdmSubtype` in level 1,
  `fields[]` without `idField` (`NS5_ONTOLOGY_MDM_ID_IN_FIELDS`), no lifecycle.
- Non-mdm stored identity: `idField` in `fields[]`, uuid, required.
- `displayField` is a field of the entity, or of level-1 identification/base when mdm.
- `appendOnly` has no lifecycle.
- Transitions: `from`/`to` are declared states; `by` is actor ids, `system` or `time`. An
  actor/command state with no arriving transition fails (birth states are the ones no transition
  targets). `time` states must not be arrived at by a transition.
- Relationships follow n15: resolvable fields, mdm endpoint exactly `[idField]`, both ends required.
- Every journey `entity`/`affects` exists on the **full** ontology (plan and bindings). Isolated
  entity validation does not run that check — the fan-out only has one entity. An entity no
  journey cites is a warning, not an error.
- Gate repair is bounded (2) per LLM call. Entity fan-out repairs missing/invalid entities in the
  finalizer (2 rounds). A run then continues to `rules40`.

## Known traps

- Calculated totals are `details`, not a projection entity.
- MDM `fields[]` is the module namespace and may be empty. Identity is `storage.idField`.
- Do not add prompt examples of a domain. Placeholders (`<Person>`, `<Entity>`) are context.
- `mdmSubtype` is only on `kind: mdm`. `mutability: appendOnly` is never on mdm. The model fills
  both on every entity; normalize drops them before the gate. The gate still fails a real mdm
  entity that lacks `mdmSubtype`.
