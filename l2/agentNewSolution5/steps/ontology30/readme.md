# ontology30 — the things of the business and what may happen to them

Plan + fan-out, like NS4 E4: one overview call (`submitNs5OntologyPlan`), one call per entity
(`submitNs5Entity`), then a deterministic finalize. Writes `l4/<mod>/ontology/<Entity>.defs.ts` and
`ontology/index.defs.ts`. Clarification is reserved and has no screen; `/fast` auto-approves.

## v3 (ns5_42) — what the step generates today

The step generates the **v3** ontology: a module ontology written ON TOP of the platform ontology
(`/_102034_/l4/ontology/mdm.defs.ts`). An entity is either a `role` — a papel over an MDM subtype,
copied from the platform record and only tightened, plus the branch `details.<moduleName>` — or an
`entity`, a table of the module whose columns exist only where there is an index and whose
everything else lives in one `details` document. `submitNs5RelationshipBindings` is gone: the
realization is derived from the `mode` of the plan.

The generation lives in `contractsV3.ts` + `gateV3.ts` + `schemas/ontology-{plan,entity}-v3.schema.json`.
`contracts.ts` and `gate.ts` next door are the **v2** normalize and gate, untouched: the eleven other
modules are recorded in v2 and `replayRealRuns.test.ts` replays them byte for byte through those exact
functions. They stay v2 until ns5_44 regenerates them (ns5_43 T7). The v3 form is proved against the
four hand-written `agendaClinica` files in `fixtures/agendaClinica-v3/` by `agentNs5OntologyV3.test.ts`.

The tool schemas ask for **arrays** of `{ id, … }` where the artifact keeps a string-keyed map
(`record.fields`, `capabilities`, `relationships`): a strict tool schema must declare
`additionalProperties: false` on every object, so an open key set is not expressible. `normalize`
turns the arrays into the maps and still reads a map, so a hand-written file goes through unchanged.

## Input

- The original request (`sourcePrompt`)
- Actors from `module.defs.ts`
- Journeys (`business` entire: `entity`, `affects`, `decide`)
- Plan prompt: internal actors whose journeys name a personal scope (own / team / assigned)
  as data ("Actors whose scope is personal"); not a rule — the model decides the Person role
- Platform level-1 catalog as placeholders, plus the platform catalog (services and role rules) from `platform.defs.ts`

## Output

`Ns5OntologyEntityArtifact` per entity: kind, party, mdmSubtype, displayField, namespace fields,
`unique` / `uniqueKeys`, typed `details`, lifecycle states, allowed transitions (`ruleRefs`
optional), storage, `writer: 'journey' | 'crud' | 'inbound'` (omitted = journey). Index: entity order plus relationships with field realization and a
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
  `entity` of an `act`, listed in an act's `affects`, **or** `writer: 'crud'` / `'inbound'`,
  **or** derived `parent` (many-side of a `manyToOne`/`oneToMany` whose other side has a
  writer) / `attach` (mdm referenced by a required FK of a create `act`)
  (`NS5_ONTOLOGY_ENTITY_WITHOUT_WRITER`). Derived writers land on `normalizations[]`
  as `writerDerived`. Normalize drops `crud`/`inbound` when an `act` already writes it;
  crud plus lifecycle is also dropped. `valueObject` is out; normalize also drops its
  `writer`/`mutability` (`dropValueObjectTableAttrs` — no table).
- `unique` on `storage.idField` and `uniqueKeys` that contain the idField are dropped
  (`dropUniqueIdField` / `dropUniqueKeyIdField`). `NS5_ONTOLOGY_UNIQUE_ID_FIELD` is
  gone. `NS5_ONTOLOGY_UNIQUE_KEYS_ID_FIELD` stays as the skip-normalize net.
- Journeys that include an `act` with `effect: 'transition'` or a `decide` on an entity require
  `lifecycleStates` / `transitions` (`NS5_ONTOLOGY_LIFECYCLE_REQUIRED`). `create` / `update` do
  not count. Normalize drops `appendOnly` on that entity before the gate (mutability is frozen
  on the plan). The gate still rejects `appendOnly` if normalize is skipped. A `decide` also
  needs two transitions from the same origin (`NS5_ONTOLOGY_LIFECYCLE_BRANCHING_REQUIRED`). Same
  predicate as finalize80 I2 (`collectNs5LifecycleSignal`); I2 checks a cited `transitionRef`
  (`effect: 'transition'`, `by` and reachable `from`).
- A journey `transitionRef` (`effect: 'transition'`) on this entity must be a declared `transitionId`
  (`NS5_ONTOLOGY_TRANSITION_REF_MISSING`). Normalize adds the journey actor to `by` when
  the transition exists without it (`addTransitionBy`). `effect: 'create'` on mdm is valid.
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
  (`core`/`supporting`/`valueObject`/`event`, details not empty, writer kind none, no
  field besides `idField`, no lifecycle) into `module.details` and drops it (the model
  keeps creating a panel; prompt plus gate did not stop it). A period field is not a
  panel — it belongs in `module.details` description. Extra identity-only panels still
  record leftover fields as `liftedFields`. Lifted ids are stored as
  `liftedAggregateEntities[]` on the ontology30 `pipeline.json` step so finalize80 I1
  can accept journey refs to them. A relationship to another entity is not lifted —
  the gate remains the net. Two entities claiming the same details key fail
  `NS5_ONTOLOGY_AGGREGATE_DETAIL_COLLISION`. When a panel is lifted, it replaces the
  same keys on `plan.moduleDetails`; plan keys the panel does not name stay.
  `normalizations[]` and `liftedFields` are stored on `pipeline.json` `ontology30`.
- MDM `fields[]` is the module namespace and may be empty. Identity is `storage.idField`.
- Do not add prompt examples of a domain. Placeholders (`<Person>`, `<Entity>`) are context.
- `mdmSubtype` is only on `kind: mdm`. `mutability: appendOnly` is never on mdm. The model fills
  both on every entity; normalize drops them before the gate. The gate still fails a real mdm
  entity that lacks `mdmSubtype`.
- Normalize also drops `appendOnly` when `collectNs5LifecycleSignal` is on (`effect: 'transition'`
  or a `decide`). Prompt plus gate feedback did not stop the model from keeping the label. The gate
  still fails if someone skips normalize.
