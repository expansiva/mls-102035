# finalize80

## 2026-09-12

- I13 (warning): remaining `custom` grants, one per grant; count is `checks.I13.warningCount`
  (backend does not apply `custom`).
- I10/I8: `writer: 'crud' | 'inbound'` replaces `maintenance: 'crud'`. I11 (warning)
  `NS5_FINALIZE_I11_INBOUND_PENDING_IN_SIBLING` queues
  `l4/<sibling|/organization>/tobe/integration/<requestedBy>--<eventId>.defs.ts`.
  I12 (error): `outbound.on` exists; `plugins.usedBy` exists; platform events are in the catalog.
  Registry module block stores `entities` and outbound `events`.
- I6: a journey `handoff` is covered by a human `journeyRef` (not a screen `stepRef`).
  A `by: system`/`time` transition that is neither `effect: transition` of a
  `mechanical`/`llm` stage nor `trigger.event` warns
  `NS5_FINALIZE_I6_SYSTEM_TRANSITION_UNOWNED` (warning, does not fail).
- I2 also checks `transitionRef` on workflow `mechanical`/`llm` stages (same citation
  + SCC reachability as `act`). I1 cites `trigger.event`, `entityRef`, `transitionRef`,
  `journeyDecisions`.
- I1 no longer checks `authorityRef` (the grant is the capability; `authorities[]` removed).
- I2 is citation + reachability: an `act` with `effect: 'transition'` needs that
  `transitionRef`, actor in `by`, and `from` intersecting states reachable from source-SCC
  births (`NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION`). `create` is not an error; `update`
  with a declared actor transition is `NS5_FINALIZE_I2_POSSIBLE_MISSING_TRANSITION_REF`
  (warning). Carry-over between journeys is gone.
- I8: a login person is also registered by `maintenance: 'crud'` with an internal-actor grant, or by an `act` of her own external actor (self-registration). Clinic `Profissional` and event `Participant` pass; no crud and no self-write fails.
- I8: an internal-actor write on the login person is `act` entity or `affects` (same writer predicate as I10). Frozen `ordenServicio5` and live `matricularAluno` (`affects: [Aluno]`) pass; empty `affects` fails.

## 2026-09-11

- I10: same writer predicates as ontology30 / access60 (`NS5_FINALIZE_I10`) —
  written entity is an `act` `entity` or `affects`, or `maintenance: 'crud'`;
  crud has an internal-actor grant. Conflicting crud is dropped by ontology30
  normalize.
- I9: each `uniqueKeys` fieldId exists on the entity (`NS5_FINALIZE_I9`). A uniqueness
  claim that lives only in rule prose is not checkable — I9 is the inverse.
- I3: every `access.actors` row has ≥1 journey and ≥1 grant. I1 cites `grant.actorRef`.
  Registry reads actors from access.
- I8: an `own`/`related` grant whose `anchorEntity` is `party: person` needs an
  internal-actor `act` on that entity (not `affects`). Code
  `NS5_FINALIZE_I8_LOGIN_PERSON_WITHOUT_REGISTRATION`. Fixture: live
  `matricularAlunoEmPlano` (`locate` Aluno) fails; `act` Aluno passes.
- I1 accepts a journey `entity`/`affects` that names an id ontology30 lifted into
  `module.details` (`pipeline.json` `ontology30.liftedAggregateEntities` and
  `module.details` still has keys). An unknown id that was not lifted stays an error.
  Fixture: live `acompanharIndicadoresDaAcademia` / `PainelGerencial`.
- I4 is integrity of cited `ruleRefs`: a `transitions[].ruleRefs` id must exist in
  `rules.defs.ts` (error). An uncited rule is not a defect at l4. I2 does not apply to a
  locate→inspect journey; fixture `consultarMisOrdenes` no longer has the fabricated `act`.
- I2 walks journeys in index order and tracks reachable origin states per entity
  (birth on first create; `any` if first seen via locate/inspect). An `act` on an
  already-provided entity that has lifecycle needs a transition with `by` of the
  journey actor and `from` intersecting reachable states; none ⇒
  `NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION` naming the step and entity. Live
  `consultarMisOrdenes` (`act` "registrar la consulta") is the failing fixture.
  Further `act`s on the same entity in the same journey are covered by the first
  match. Append-only entities without lifecycle may be written again after locate.
- I7: disk files in `journeys/` and `ontology/` must equal the index plus `index.defs.ts`.
  Difference is `NS5_FINALIZE_I7_ORPHAN_FILE` with the orphan list. Fixture: live
  `comandaRestaurante5` disk before reconcile (19 journeys / index 4) fails; after, passes.
- I2 structural signal (`requiresTransitions` / `requiresBranching`, branching origin) is
  imported from ontology30 (`collectNs5LifecycleSignal`, `ns5LifecycleHasBranchingOrigin`).
  The reachable-origin check (ns5_12) adds `NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION`.

## 2026-09-10

- First finalize step of agentNewSolution5. Deterministic oracle I1–I6, organization registry
  upsert (`mdmSubtype <- <mod>.<Entity>`), l5 config/project via E10 publishable helpers,
  `pipeline.status: complete`, `runNN_newsolution5.json`. Never dispatches CB/CF. I2 decide is
  kept strict against empty lifecycle (known ontology30 finding, not a finalize80 defect).
