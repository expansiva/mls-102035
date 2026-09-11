# ontology30

## 2026-09-11

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
