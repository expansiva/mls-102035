# finalize80

## 2026-09-12

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
