# ontology30

## 2026-09-17 (ns5_46)

- A table now starts from a CATALOG, like a role already did. `mls-102034/l4/ontology/tdm.defs.ts`
  (transactional) and `ddm.defs.ts` (derived) carry the record, the lines a table of that family is
  written by, and the capabilities it may offer — each with the status of the platform measured, and the
  file and line where it was measured. `startingPointFor` no longer returns `undefined` for a table
  (`agentNs5Ontology.ts:316` said so in one line); `formatNs5FamilyStartingPoint` projects the catalog in
  the same compact form the platform record already had, and drops `evidence`, which is for whoever
  reviews the catalog and not for the prompt.
- The plan declares `family` (`mdm` | `tdm` | `ddm`) and `storageKind` (`platform` | `relational` |
  `timeSeries`) — a decision of the whole, not of one entity. Both are required enums with a neutral
  value, never an optional flag (ns5_28). Where a draft has none, `ns5FamilyOfV3` derives the family from
  the kind, so the thirteen recorded modules and the hand-written v3 form do not change verdict.
- The gate checks the capabilities against the catalog of the ENTITY'S FAMILY, closing the hole where
  `<module>.anything` on a table was never checked and a platform id was only ever looked up in
  `mdm.capabilities`. An unknown id now carries the nearest id of that catalog, by the words both carry:
  `next.sequenceNumber` answers `Did you mean 'sequence.next'?`, which is the repair the `ordenServicio`
  run never got.
- New checks: `NS5_ONTOLOGY_FAMILY_INCOHERENT` (a role that is not `mdm`, a table that is),
  `NS5_ONTOLOGY_DDM_HAS_WRITER`, `NS5_ONTOLOGY_DDM_HAS_STATE`, `NS5_ONTOLOGY_DDM_UNIQUE_KEY`. On a `ddm`
  table `normalizeTableRecord` marks every field `derived` instead of asking for it and refusing it.
- Proof: `mls-102034/l1/mdm/defs/dataFamilyOntology.test.ts` (the catalogs, and what puts them inside the
  `tsc` program) and six probes in `agentNs5OntologyV3.test.ts`.

## 2026-09-16 (ns5_42)

- The step GENERATES v3. `contractsV3.ts` (plan, entity, index, platform projections, aggregate lift),
  `gateV3.ts` (plan / entity / assembly), `schemas/ontology-plan-v3.schema.json`,
  `schemas/ontology-entity-v3.schema.json`. `prompt.md` and `promptEntity.md` rewritten;
  `promptRelationships.md` deleted with the bindings pass.
- `skills/ontologyTable.md` is injected next to `skills/mdm.md` in both passes, and both were brought
  onto the v3 grammar (`origin`/`layer` are gone; `indexed`, `derived`, `owner` are what exists).
- New checks: `NS5_ONTOLOGY_COLUMN_WITHOUT_INDEX`, `NS5_ONTOLOGY_COLUMN_IS_OBJECT`,
  `NS5_ONTOLOGY_UNIQUE_KEY_NOT_COLUMN`, `NS5_ONTOLOGY_RECORD_TARGET_UNKNOWN`,
  `NS5_ONTOLOGY_PLATFORM_FIELD_UNKNOWN`, `NS5_ONTOLOGY_PLATFORM_FIELD_LOOSENED`,
  `NS5_ONTOLOGY_NAMESPACE_CONFLICT`, `NS5_ONTOLOGY_NAMESPACE_IMITATES_SERVICE`,
  `NS5_ONTOLOGY_NAMESPACE_WITHOUT_TRACE` (warning), `NS5_ONTOLOGY_NAMESPACE_EMPTY_TEXT` (warning),
  `NS5_ONTOLOGY_CATALOG_*`, `NS5_ONTOLOGY_COMPOSITION_*`, `NS5_ONTOLOGY_CARDINALITY_INCOHERENT`.
  None of them can fire on a v2 artifact: `validateNs5OntologyEntityV3` returns green on any
  `schemaVersion` that is not v3, and the eleven recorded modules are measured in the v3 test.
- `pipeline.json` `ontology30` gains `citedRules[]` and `citedCapabilities[]` next to `normalizations[]`.
- `version` is a column with no index on purpose (the engine's counter); the index rule skips it.
- A module dropping `required` on a platform field is NOT an error: the platform marks a field
  required when the engine always writes the key, which is not the same as forcing a person to fill
  it, and the hand-written gabarito omits it on four `base` fields. normalize restores the platform
  flag, so generated output never diverges.

## 2026-09-12

- Writer resolution `ns5ResolveEntityWriter`: child of a written parent (`parent`) and MDM attached by a create act (`attach`) count as writers; recorded as `writerDerived`. WITHOUT_WRITER only when `kind === 'none'`. Panel requires no field besides `idField`.
- `collectNs5LifecycleSignal.requiresTransitions` is an `act` with `effect: 'transition'`
  (not a count of `act`s). `create`/`update` do not demand lifecycle. Frota relote2
  `OrdemManutencao` (2 create + 1 update) is the fixture.
- Lifted panel replaces the same keys on `plan.moduleDetails`; plan-only keys stay
  (`replacePlanModuleDetails`). `normalizations[]` and `liftedFields` are stored on
  `pipeline.json` `ontology30`.


- Plan prompt injects internal actors whose journeys name a personal scope
  (`próprio|própria|minhas|seus|sua equipe|atribuído`) as data
  ("Actors whose scope is personal"); the model decides the Person role.
- `writer: 'journey' | 'crud' | 'inbound'` replaces `maintenance?: 'crud'` (required in the tool
  schema; omitted on the artifact means journey). `inbound` is a writer without an `act`.
  Siblings from the registry are injected as data; same `entityId`+`mdmSubtype` or core/event
  `entityId` as a sibling warns `NS5_ONTOLOGY_SIBLING_ENTITY`.
- Journey `transitionRef` citations (`effect: 'transition'`) are required on the entity
  (`NS5_ONTOLOGY_TRANSITION_REF_MISSING`); normalize adds a missing actor to `by`
  (`addTransitionBy`). Source-SCC helpers live on contracts
  (`ns5SourceSccStates` / `ns5ReachableStates`) for I2.
- Normalize drops `unique` on `idField` and `uniqueKeys` that contain it (`dropUniqueIdField` /
  `dropUniqueKeyIdField`); `NS5_ONTOLOGY_UNIQUE_ID_FIELD` is gone. Lifecycle reachability uses
  source SCCs so a cycle back to the birth state passes; an isolated state still fails. Lift covers
  any non-mdm aggregate-only kind (valueObject/event too), discards extra fields into
  `liftedFields`, and strips valueObject `maintenance`/`mutability`. Fixtures: live `Pagamento`,
  `Matricula`, `IndicadorAcademia`.

## 2026-09-11

- Normalize drops `maintenance: 'crud'` when an `act` writes the entity (`entity`
  or `affects`) or it has lifecycle; recorded on `normalizations[]`. Writer is
  `act.entity ∪ act.affects` (`NS5_ONTOLOGY_ENTITY_WITHOUT_WRITER`).
  `NS5_ONTOLOGY_CRUD_WITH_ACT` / `NS5_ONTOLOGY_CRUD_WITH_LIFECYCLE` gone. Live
  `mensalidadesAcademia` plan-draft (crud on every entity) is the strip fixture.
- `maintenance?: 'crud'` on the plan and the entity artifact. Gate:
  `NS5_ONTOLOGY_ENTITY_WITHOUT_WRITER` (written fields, not written by an `act`
  as `entity` or `affects`, not crud). Plan prompt: one sentence.
- Schema `2026-09-11-ns5-ontology-v2`: `unique` / `uniqueKeys`, typed `details`
  (`{ type, description }`), required relationship `description`, `enum[{ value, title }]`,
  intrinsic `constraints` (`min`/`max`/`maxLength`/`precision`). String `details` and
  `enum: string[]` are no longer accepted. Gate: uniqueKeys fields exist, never
  `idField`; constraints match the field type; `lifecycleStates[].state` ⊆
  `status.enum.value`.
- Actors come from `readNs5Actors` (pipeline), not `module.defs.ts`.
- Level-1 catalog (and the platform catalog) is read from 102034. Plan and entity
  prompts receive subtypes plus services/role rules derived from `platform.defs.ts`.
  `NS5_ONTOLOGY_PLATFORM_SERVICE_CANDIDATE` warns when a supporting/event entity
  whose content fields are ⊆ {url, fileName, mimeType, text} links oneToOne/oneToMany
  to an mdm entity; persist records `systemDecision` keepEntity | usePlatformService.
- Persist `liftedAggregateEntities` on the ontology30 `pipeline.json` step (and the
  draft), same class as `uncitedEntities` / `removedOrphans`. finalize80 I1 reads it.
- After entity fan-out, `liftNs5AggregateOnlyEntities` moves a core/supporting
  entity that only stores aggregates into `plan.moduleDetails` and drops it from
  the plan (no `.defs.ts`). Same predicate as `NS5_ONTOLOGY_AGGREGATE_ONLY_ENTITY`
  (the gate stays as the net when the entity has a relationship). Two lifted
  entities sharing a details key fail `NS5_ONTOLOGY_AGGREGATE_DETAIL_COLLISION`.
  Prompt plus two repair rounds left `PainelGerencial` in place; the entity pass
  cannot uncreate a plan entity. Fixtures: live `PainelGerencial`, `PainelMensalidades`.
- Plan may emit `moduleDetails` (name → description). Persist copies them onto
  `module.defs.ts` as `details`. A `core`/`supporting` entity whose only job is
  aggregates (details not empty, no journey `act` on it or in `affects`) fails
  `NS5_ONTOLOGY_AGGREGATE_ONLY_ENTITY`. Fixture: `PainelMensalidades`.
- Transitions may list `ruleRefs` (form: unique lowerCamel). Existence is finalize80 I4
  because rules40 runs after this step.
- MDM skill prepended to plan, entity and bindings system prompts.
- Persisted `oneToOne` / `oneToMany` / `manyToOne` (`fieldReference` / `fieldCollection`)
  must store a real foreign key on the owner: not `id → id`. `fieldReference` owner is
  the many side (`uuid` field); `fieldCollection` owner field is `json`. The other
  endpoint binds exactly `[idField]`. MDM owner with `fields: []` fails
  `NS5_ONTOLOGY_RELATIONSHIP_MDM_OWNER_WITHOUT_NAMESPACE`. Live `serviceOrderPhotos`
  (`id → id`, owner FotoOrdenServicio mdm empty namespace) is the failing fixture.
- After writing `ontology/index.defs.ts`, remove every `ontology/*.defs.ts` whose id is not
  in the index. Draft records `removedOrphans[]` (ns5_11).
- Normalize drops `mutability: appendOnly` when `collectNs5LifecycleSignal` is on
  (second `act` or a `decide`). Prompt plus two repair rounds did not drop the label.
  The plan gate (`NS5_ONTOLOGY_LIFECYCLE_REQUIRED`) stays as the skip-normalize net.
- Plan prompt (`prompt.md` Persistence) states the structural rule: omit `mutability`
  when journeys show a second `act` or a `decide` on the entity. Gate feedback alone
  did not drop `appendOnly` on the plan after two repair rounds.
- `collectNs5LifecycleSignal` / `ns5LifecycleHasBranchingOrigin` are the I2 structural
  predicate (second `act` or a `decide` on the same entity). The entity/bindings gate now
  requires lifecycle when that signal is on (`NS5_ONTOLOGY_LIFECYCLE_REQUIRED`,
  `NS5_ONTOLOGY_LIFECYCLE_BRANCHING_REQUIRED`). The plan rejects `appendOnly` for those
  entities so the frozen mutability cannot block entity repair. A single `act` may stay
  `appendOnly`. finalize80.checkI2 imports the same functions.

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
