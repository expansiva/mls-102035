# ontology30 — the things of the business and what may happen to them

Plan + fan-out, like NS4 E4: one overview call (`submitNs5OntologyPlan`), one call per entity
(`submitNs5Entity`), then relationship bindings (`submitNs5RelationshipBindings`). Writes
`l4/<mod>/ontology/<Entity>.defs.ts` and `ontology/index.defs.ts`. Clarification is reserved and
has no screen; `/fast` auto-approves.

## Input

- The original request (`sourcePrompt`)
- Actors from `module.defs.ts`
- Journeys (`business` entire: `entity`, `affects`, `decide`)
- Platform level-1 catalog as placeholders, plus the platform catalog (services and role rules) from `platform.defs.ts`

## Output

`Ns5OntologyEntityArtifact` per entity: kind, party, mdmSubtype, displayField, namespace fields,
`unique` / `uniqueKeys`, typed `details`, lifecycle states, allowed transitions (`ruleRefs`
optional), storage, optional `maintenance: 'crud'`. Index: entity order plus relationships with field realization and a
one-sentence `description`. Organization-wide aggregates go in typed `module.details` (plan
`moduleDetails`). No `kind: projection`, `derivation`, `role`, `sourceRefs`, `useRules` or
`lifecyclePredicates`.

## Form (v2)

| fact | where | not |
|---|---|---|
| type, required, `unique`, `uniqueKeys`, intrinsic domain (`constraints`) | ontology | business policy |
| calculated value | `details.{name}.{type, description}` | a projection entity |
| relationship edge label | `relationships[].description` | `title` |
| closed-domain label | `enum[{ value, title }]` | `NS4_PHRASES` (chrome only) |
| organization policy ("max 12 installments") | `rules.{ruleId, description}` | `constraints` |
| value that varies per record | a field the rule cites | a constant in `constraints` |

## Invariants

- MDM: `target: mdm`, `scope: organization`, `mdmType = '<mod>.<Entity>'`, `mdmSubtype` in level 1,
  `fields[]` without `idField` (`NS5_ONTOLOGY_MDM_ID_IN_FIELDS`), no lifecycle.
- Non-mdm stored identity: `idField` in `fields[]`, uuid, required.
- `displayField` is a field of the entity, or of level-1 identification/base when mdm.
- `appendOnly` has no lifecycle.
- An entity with written fields (`fields` besides `idField`; mdm namespace) is the
  `entity` of an `act`, listed in an act's `affects`, **or** `maintenance: 'crud'`
  (`NS5_ONTOLOGY_ENTITY_WITHOUT_WRITER`). Normalize drops `crud` when an `act`
  already writes it or the entity has lifecycle (`normalizations[]`).
  `valueObject` is out; normalize also drops its `maintenance`/`mutability`
  (`dropValueObjectTableAttrs` — no table).
- `unique` on `storage.idField` and `uniqueKeys` that contain the idField are dropped
  (`dropUniqueIdField` / `dropUniqueKeyIdField`). `NS5_ONTOLOGY_UNIQUE_ID_FIELD` is
  gone. `NS5_ONTOLOGY_UNIQUE_KEYS_ID_FIELD` stays as the skip-normalize net.
- Journeys that include a second `act` or a `decide` on an entity require `lifecycleStates` /
  `transitions` (`NS5_ONTOLOGY_LIFECYCLE_REQUIRED`). Normalize drops `appendOnly` on that entity
  before the gate (mutability is frozen on the plan). The gate still rejects `appendOnly` if
  normalize is skipped. A `decide` also needs two transitions from the same origin
  (`NS5_ONTOLOGY_LIFECYCLE_BRANCHING_REQUIRED`). Same predicate as finalize80 I2
  (`collectNs5LifecycleSignal`); I2 still checks that a later `act` matches `by`.
- Transitions: `from`/`to` are declared states; `by` is actor ids, `system` or `time`. An
  actor/command state not reachable from a source SCC fails (a cycle back to the birth
  state is reachable; an isolated state in an entity with transitions stays
  `NS5_ONTOLOGY_STATE_UNREACHABLE`). `time` states must not be arrived at by a transition.
- Relationships follow n15 plus a real FK: resolvable fields, non-owning mdm endpoint exactly
  `[idField]`, both ends required. Owner stores a `uuid` FK or a `json` collection, never
  `id → id`. MDM with `fields: []` cannot be owner
  (`NS5_ONTOLOGY_RELATIONSHIP_MDM_OWNER_WITHOUT_NAMESPACE`).
- A supporting/event entity whose content fields are ⊆ {url, fileName, mimeType, text} and that
  links `oneToOne`/`oneToMany` to an mdm entity is a warning
  (`NS5_ONTOLOGY_PLATFORM_SERVICE_CANDIDATE`, attachments/comments already exist) plus a
  `systemDecision` (`keepEntity` | `usePlatformService`). Name matching is not a gate.
- Every journey `entity`/`affects` exists on the **full** ontology (plan and bindings), except
  names `liftNs5AggregateOnlyEntities` moved to `module.details`. Isolated entity validation
  does not run that check — the fan-out only has one entity. An entity no journey cites is a
  warning, not an error.
- Gate repair is bounded (2) per LLM call. Entity fan-out repairs missing/invalid entities in the
  finalizer (2 rounds). A run then continues to `rules40`.

## Known traps

- Calculated totals are `details` on the owning entity, or `module.details` when they
  belong to the module (`NS5_ONTOLOGY_AGGREGATE_ONLY_ENTITY`). Not a projection entity.
  After fan-out, `liftNs5AggregateOnlyEntities` moves a non-mdm aggregate-only entity
  (`core`/`supporting`/`valueObject`/`event`, details not empty, no act/affects, no
  lifecycle) into `module.details` and drops it (the model keeps creating a panel;
  prompt plus gate did not stop it). Extra fields besides idField are reading
  parameters — discarded and recorded as `liftedFields`. Lifted ids are stored as
  `liftedAggregateEntities[]` on the ontology30 `pipeline.json` step so finalize80 I1
  can accept journey refs to them. A relationship to another entity is not lifted —
  the gate remains the net. Two entities claiming the same details key fail
  `NS5_ONTOLOGY_AGGREGATE_DETAIL_COLLISION`.
- MDM `fields[]` is the module namespace and may be empty. Identity is `storage.idField`.
- Do not add prompt examples of a domain. Placeholders (`<Person>`, `<Entity>`) are context.
- `mdmSubtype` is only on `kind: mdm`. `mutability: appendOnly` is never on mdm. The model fills
  both on every entity; normalize drops them before the gate. The gate still fails a real mdm
  entity that lacks `mdmSubtype`.
- Normalize also drops `appendOnly` when `collectNs5LifecycleSignal` is on (second `act` or a
  `decide`). Prompt plus gate feedback did not stop the model from keeping the label. The gate
  still fails if someone skips normalize.
