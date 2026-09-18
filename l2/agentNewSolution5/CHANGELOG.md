# agentNewSolution5

## 2026-09-18 (ns5_52b)

- **Nothing is written until the request is known to be a module.** The deterministic invocation
  gates moved into `ns5EntryRefusal` (`helpers/ns5Core.ts`), one pure function the entry hook only
  carries to the user; `/rebuild all <module>` with no request in the body is now refused there
  instead of running a pipeline over the bare command line. Whether a non-empty text asks for a
  module at all is decided by `module10` in the tool call it already makes, before its first write.
- `ns5StatusMessage` (`helpers/ns5Dispatch.ts`) is the single way this flow answers the user without
  the root LLM; `statusTask` and the `module10` refusal both use it.

## 2026-09-17 (ns5_49)

- **Flow v2: `workflows50` runs before `ontology30`.** `NS5_STEP_IDS`, `NS5_STEP_DEPENDS_ON`,
  `docs/flow.json` (`schemaVersion 2026-09-17-ns5-flow-v2`) and `NS5_FLOW_VERSION` say the same
  order: `module10 -> journeys20 -> workflows50 -> ontology30 -> {rules40, access60} ->
  integration70 -> finalize80`. `rules40` and `access60` still fan out after `ontology30-done`;
  `integration70` still waits for the three done-anchors. Previous flow versions are not migrated.
- The step guards swapped: `workflows50` requires `journeys20` approved, `ontology30` requires
  `journeys20` AND `workflows50`.
- A `mechanical`/`llm` stage now CITES FORWARD: the `entityRef`/`effect`/`transitionRef` it names is
  a declaration, and `ontology30` declares it. A transition cited only by a stage has `by: []` --
  the process owns it, no person does.
- The pipeline panel (`newRelease/widgets/general.ts`) had its own copy of the step order; it now
  imports `NS5_STEP_IDS`.

## 2026-09-16 (ns5_45)

- `rules40` writes `rules-v2`: `rules.defs.ts` keeps the catalog as a MAP of `ruleId` to the one
  business sentence, the shape `mls-102034/l4/ontology/mdm.defs.ts` already uses. `rules-v1` (the
  array) stays valid — nothing was migrated — and `solution/rulesView.ts` is the one reading for both
  forms, used by finalize80 I4, by the newRelease screens and by the replay. The tool still asks for a
  list, as `ontology30` does since ns5_42: a strict tool schema cannot declare an open key set.

## 2026-09-16

- ns5_43: the steps after `ontology30` read the module ontology through
  `solution/ontologyView.ts` — one normalized reading of both forms. The v3 index
  (`entities[{ entityId, … }]`, `relationships[{ from, to, mode }]`) and the v3 entity
  (`record.fields` instead of `fields`) no longer break `rules40`, `workflows50`,
  `access60`, `integration70` and `finalize80` at the same eight lines.
- T1 `affects` may name a path into an embedded child (`PedidoCompra.details.itens`):
  the root is normalised, the path is kept, and finalize80 I1 resolves it against
  `record.fields` / `details`. `on: Entity.transition` is unchanged.
- T2 `rules40` receives `pipeline.ontology30.citedRules[]` as data ("rules the ontology
  cited; keep these ids"). T3 the disclosure paths of ns5_40 now reach the generator.
- T4 `registry.defs.ts` names a papel `{ subtype, roleTag, namespace }` and an entity row
  carries `class`; `level1SchemaVersion` is `mdm.defs.ts`'s own `schemaVersion`. Registries
  written before this are read through `ns4RegistryRoleSubtype` / `ns4RegistryRoleTag` and
  rewritten on the next finalize80.
- T5 I9 measures `uniqueKeys` against stored columns; I8/I10 read a v3 `role` as the papel
  over an MDM record. No new check: the eleven v2 modules replay unchanged.
- T7 the fixtures of the eleven stay v2; `replayRealRuns` reads both forms.

## 2026-09-12

- Replay fixtures of the 11 complete modules of the final leva (ns5_33 T6).
  `financeiro` stays out (content: `journeys20` collapsed to 1 journey).
- Lifecycle signal by `effect` (ns5_33): `requiresTransitions` is an `act` with
  `effect: 'transition'`; `create`/`update` do not count. `pt` → `pt-BR` only.
  Lifted panel replaces the same `module.details` keys. `normalizations[]` /
  `liftedFields` persist on `pipeline.json` `steps.<step>`.


- Internal actor with own/team/assigned scope is a Person role (mdm skill); access60
  `NS5_ACCESS_CUSTOM_HAS_ANCHOR` / `NS5_ACCESS_CUSTOM_WITHOUT_PERSON`; ontology30 plan
  injects personal-scope actors as data; finalize80 I13 counts remaining `custom` grants.
- Integration v2 (ns5_31 / G7): inbound `writes`+`effect` is a writer; outbound `on` binds the
  event to a transition/create; registry stores `entities`/`events`; sibling modules are data
  for module10/ontology30/integration70; `tobe/integration` queues a request to a sibling
  (I11 warning). `writer` replaces `maintenance?: 'crud'`.

## 2026-09-11

- Writer mode (ns5_21 r2): normalize drops `maintenance: 'crud'` when an `act` already
  writes the entity (`entity` or `affects`) or it has lifecycle (`normalizations[]`);
  WITHOUT_WRITER / I10 treat `affects` as a writer. `CRUD_WITH_ACT` / `CRUD_WITH_LIFECYCLE` gone.
- Writer mode (ns5_21): `maintenance?: 'crud'` on the ontology entity. ontology30
  `WITHOUT_WRITER`; access60 `CRUD_WITHOUT_INTERNAL_GRANT`; finalize80 I10.
- Ontology v2 (ns5_19): `unique`/`uniqueKeys`, typed `details`, relationship
  `description`, `enum[{value,title}]`, intrinsic `constraints`; finalize80 I9.
- Actors leave `module.defs.ts` (`-module-v2`, no `scope`) and live on the pipeline
  during generation, then on `access.defs.ts` (`-access-v2`, no `profiles`, grants by
  `actorRef`). Six clarifications; module10 and finalize80 have none.
- `/rebuild all` removes the whole module via `solution/removeModule` (l4/l1/l2/l5 trees,
  `l5/config.json`, `l5/project.json` including nested `routeKeys`, organization registry).
  Pipeline records `rebuildAll: { deleted, edited, at }`. `deleteModuleL4` is gone.
- MDM level-1 ontology (subtypes + `platform.defs.ts`) is emitted by 102034; ontology30
  reads it and warns `NS5_ONTOLOGY_PLATFORM_SERVICE_CANDIDATE` (ns5_14).
- Three subtractions (ns5_13): rules are `{ruleId, description}` (title/appliesTo gone;
  gate is form only); organization-wide aggregates live in `module.details` written by
  ontology30 (`NS5_ONTOLOGY_AGGREGATE_ONLY_ENTITY` against a panel entity); a
  locate→inspect journey is valid (the ≥1 `act|decide` gate is gone). Finalize I4
  checks cited `transitions[].ruleRefs` exist. MDM skill `skills/mdm.md` is the first
  block of the system prompt of module10, ontology30 (plan, entity, bindings) and
  access60. Login is the `mdm_tag` row in namespace `login`. Round 2: ontology30
  lifts an aggregate-only entity into `module.details` after fan-out
  (`liftNs5AggregateOnlyEntities`); the gate stays as the net.
  `NS5_ONTOLOGY_AGGREGATE_DETAIL_COLLISION` when two such entities share a key.
  Round 3: ontology30 writes `liftedAggregateEntities` on `pipeline.json`; finalize80
  I1 accepts a journey ref to a lifted id when `module.details` still has keys.
- Three form normalizations (ns5_12): access60 turns unrestricted `fieldsOnly` into
  `fullRecord` and drops stray `anchorEntity`; ontology30 rejects `id → id` relationship
  realization; finalize80 I2 requires a reachable origin-state transition for an `act`
  on an already-provided entity (`NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION`).
- Host unlink + per-item reconcile (ns5_11): `/rebuild all` lists the real `l4/<mod>/**`
  and deletes it; `journeys20` / `ontology30` drop defs that left the index;
  finalize80 I7 fails when disk ≠ index. Pipeline records `rebuildAll: { deleted, at }`.
- Certification: byte copies of the two complete runs (`comandaRestaurante5`,
  `ordenServicio5`) replace synthetic/derived happy-path fixtures. `replayRealRuns.test.ts`
  replays `normalize → gate → writeDefs` against the recorded defs (hashes stripped).
  `nsArtifactFieldRatchet` now lists every named source contract (module, journeys, ontology
  index included). Skill `mls-base/skills/agentNewSolution5.md`.

- `ontology30` normalize drops `appendOnly` when journeys require lifecycle (second
  `act` or a `decide`). Prompt plus two repair rounds left the label on the plan.
- `ontology30` plan prompt states the structural rule: omit `mutability` when journeys
  show a second `act` or a `decide` on the entity (gate feedback alone left `appendOnly`
  on the plan after two repair rounds).
- `ontology30` requires lifecycle when journeys show a second `act` or a `decide` on the
  entity (`collectNs5LifecycleSignal`, shared with finalize80 I2). `appendOnly` on those
  entities is rejected on the plan so frozen mutability cannot block entity repair.

## 2026-09-10

- `finalize80`: deterministic oracle I1–I6 across the six sources, organization registry upsert,
  l5 `config.json` / `project.json` via the E10 publishable helpers, `pipeline.status: complete`
  and `runNN_newsolution5.json`. Errors fail with `finalize-report.json`; warnings continue.
  Never dispatches CB/CF. I2 decide (at least two transitions from the same origin) is kept strict: an
  appendOnly entity with empty lifecycle plus a decide step is the ontology30 finding
  (task_6da10605) becoming blocking, not a finalize80 defect.
- `integration70`: inbound/outbound module endpoints, events and externals, plus platform
  plugins. Tool `submitNs5Integration` only on a structural signal (`kind: system` actor, or a
  plugin-catalog term in `sourcePrompt`); otherwise empty lists with `noIntegrationSignal` and
  no LLM call. v1 form, minimum; align with the production harness before any executor. A run
  then stops at `awaitingStep: finalize80`.
- `access60`: profiles, authorities and grants with structured disclosure (`allowedFields` /
  `deniedFields` as `Entity.field`) and a derivable person `anchorEntity` for `own` / `assigned` /
  `related`. Tool `submitNs5Access`, gate, repair <= 2, persist `access.defs.ts`. The path is
  computed by `anchorPath()` and is not stored. A run then stops at `awaitingStep: integration70`.
- `workflows50`: orchestrated processes of human/system/wait tasks pointing at existing
  journeys/steps. Tool `submitNs5Workflows` only on a structural signal (handoff, foreign-by
  transition, cross-actor decide); otherwise `processes: []` with `noProcessSignal` and no LLM
  call. v1 form, provisional; align with the production harness (G3c) before any executor. A run
  then stops at `awaitingStep: access60`.
- `notImplemented` drains only siblings without a registered hook. A parallel unimplemented step
  (`workflows50`/`access60`) no longer completes an implemented sibling still running (`rules40`).
  Failure paths still drain every non-terminal sibling so the task does not hang.
- `rules40`: prose catalog with `ruleId` + `appliesTo` (entities, fields including `details.<name>`,
  transitions, journeys). Tool `submitNs5Rules`, gate, repair <= 2, persist `rules.defs.ts`. Time
  transitions without a citing rule fail. A run then stops at `awaitingStep: workflows50`.
- `ontology30`: isolated entity validation skips journey citation (fan-out of 1 entity vs N cited
  always failed). Plan and bindings still require every journey entity.
- `ontology30`: normalize drops `mdmSubtype` unless `kind === 'mdm'` and `mutability: appendOnly`
  unless `kind !== 'mdm'` (same class as journeys20 `handoffTo`). Gate still requires a subtype on
  a real mdm entity.
- `ontology30`: plan + entity fan-out + relationship bindings. MDM identity stays out of `fields[]`.
  Calculated values are `details`. Lifecycle carries allowed transitions. A run then stops at
  `awaitingStep: rules40`.
- `journeys20`: normalize drops `handoffTo` unless `kind === 'handoff'` (prompt/feedback did not stop the self-label). Schema `if/then` not used (`x-tool-strict` would leave the repair path). Gate still requires a valid receiver on a real handoff.
- `journeys20`: omit `handoffTo` except on `kind: handoff`; gate feedback names `stepId` and says remove the field. Gate unchanged.
- `journeys20`: business journeys only (`affects`, `decide`, inferred-actor drop). Tool `submitNs5Journeys`, gate, repair <= 2, persist `journeys/*.defs.ts` + index. A run then stops at `awaitingStep: ontology30`.
- `module10`: actors with `origin`, languages by prompt provenance, module name from `/module` or a proposal, scope lists. Tool `submitNs5Module`, gate, repair <= 2, persist `module.defs.ts`. A run then stops at `awaitingStep: journeys20`.
- Skeleton: `docs/flow.json`, `createAgent`, invocation flags, pipeline on disk, `l2/solution` types + re-exports + fs.
