# finalize80 — integrity oracle, registry, l5, complete

Deterministic. No LLM call. Writes `pipeline/finalize-report.json`, upserts the organization
registry, fills `l5/config.json` and `l5/project.json` with the same E10 publishable helpers
(re-exported from `solution/lib.ts`), marks `pipeline.status: complete`, and writes
`pipeline/runNN_newsolution5.json`. Never dispatches agentChangeBackend or agentChangeFrontend.

## Input

The six approved sources plus `pipeline.json` with `integration70: approved`.

## Output

- `l4/<mod>/pipeline/finalize-report.json` — checks I1-I13, `errors` and `warnings`
- organization `l4/organization/registry.defs.ts` — module block with actors,
  `mdmSubtype <- <mod>.<Entity>` roles, `entities`, outbound `events`
- `l5/config.json` / `l5/project.json` — workspaceDependencies, projects, platform block
  defaults, module listed, `appEnv`/`projectType`/`modules[]` only when absent
- `l4/<mod>/pipeline/pipeline.json` — `status: complete`, `finalize80: approved`
- `l4/<mod>/pipeline/runNN_newsolution5.json` — command, cost sum, verdict, `handoff: never`

## Oracle

| check | meaning | on fail |
|---|---|---|
| I1 | every id ref between sources exists (actor, entity, field, transition, rule, journey). A journey `entity`/`affects` naming an id in `pipeline.json` `ontology30.liftedAggregateEntities` is a `module.details` ref when that map has keys — not an unknown entity | error |
| I2 | an `act` with `effect: 'transition'` must cite a declared `transitionRef` whose `by` includes the journey actor and whose `from` intersects states reachable from source-SCC births (`NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION`); the same citation + reachability applies to workflow `mechanical`/`llm` stages (`by` is `system`/`time` or the actor). `create` is not an I2 error; `update` with a declared actor transition is a warning. Every `decide` has at least two transitions from the same origin state. Does not apply to a locate→inspect journey. Structural signal for `decide` (`requiresBranching`) comes from ontology30 `collectNs5LifecycleSignal` — do not recompute it here | error (warning does not fail) |
| I3 | every `access.actors` row has at least one journey and one grant | error |
| I4 | every cited `transitions[].ruleRefs` exists in `rules.defs.ts`. An uncited rule is not a defect at l4 | error |
| I5 | every mdm entity has `mdmSubtype`; every non-mdm entity on an `own` grant reaches a `party: person` (`anchorPath`) | error |
| I6 | a `handoff` without a covering human `journeyRef`, or a foreign-by / cross-actor decide with `processes: []`; a `by: system`/`time` transition that is not a mechanical/llm `effect: transition` or `trigger.event` (`NS5_FINALIZE_I6_SYSTEM_TRANSITION_UNOWNED`) | warning |
| I7 | `journeys/*.defs.ts` and `ontology/*.defs.ts` on disk equal the index plus `index.defs.ts` | error (`NS5_FINALIZE_I7_ORPHAN_FILE`) |
| I8 | every `own`/`related` grant whose `anchorEntity` is `party: person` is registered: internal-actor write (`act` entity or `affects`), or `writer: 'crud'` with an internal-actor grant, or an `act` of her own external actor (self-registration), or derived `parent`/`attach` (attach by an internal create is cadastro; by an external create is self-registration). No public `entry.mode` exists | error (`NS5_FINALIZE_I8_LOGIN_PERSON_WITHOUT_REGISTRATION`) |
| I9 | every `uniqueKeys` fieldId exists on the entity | error (`NS5_FINALIZE_I9`) |
| I10 | written entity is an `act` `entity` or `affects`, or `writer: 'crud'` / `'inbound'`, or derived `parent`/`attach`; crud has an internal-actor grant; inbound appears in `inbound.writes`. Same predicates as ontology30 / access60 | error (`NS5_FINALIZE_I10`) |
| I11 | inbound event from a sibling (or predicted module) that does not publish it; queues `l4/<target>/tobe/integration/<requestedBy>--<eventId>.defs.ts` | warning (`NS5_FINALIZE_I11_INBOUND_PENDING_IN_SIBLING`) |
| I12 | `outbound.on` is `Entity.transitionId` or `Entity.create` of this module; `plugins.usedBy` is an existing journey.step or process.task; `from: organization` events are in the platform catalog | error (`NS5_FINALIZE_I12`) |
| I13 | remaining `custom` grants (count in `checks.I13.warningCount`) | warning (`NS5_FINALIZE_I13`) |

Errors fail the run with the report. Warnings only continue.

ontology30 rejects `appendOnly` plus a transition `act` or a `decide` first, with repair. I2 still
fails a `decide` without a branching origin if that shape reaches here; an `update` `act` without
`transitionRef` is a warning, not an error.

## Invariants

- One code per check: `NS5_FINALIZE_I1` ... `NS5_FINALIZE_I6`; I7 uses `NS5_FINALIZE_I7_ORPHAN_FILE`;
  I2 act-without-transition uses `NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION`;
  possible missing `transitionRef` uses `NS5_FINALIZE_I2_POSSIBLE_MISSING_TRANSITION_REF`;
  I6 unowned system/time transition uses `NS5_FINALIZE_I6_SYSTEM_TRANSITION_UNOWNED`;
  I8 uses `NS5_FINALIZE_I8_LOGIN_PERSON_WITHOUT_REGISTRATION`; I9 uses `NS5_FINALIZE_I9`;
  I10 uses `NS5_FINALIZE_I10`; I11 uses `NS5_FINALIZE_I11_INBOUND_PENDING_IN_SIBLING`; I12 uses `NS5_FINALIZE_I12`;
  I13 uses `NS5_FINALIZE_I13`.
- An LLM reply on this step fails (`finalize80 is deterministic`).
- Status updates use `cleaner: input_output`.
- Converted ce02 / ce05 fixtures: comandaRestaurante5 and ordenServicio5 pass I1-I10
  with no warnings when disk matches the index. I10 counts `affects` as a writer
  (`ItemCardapio`, `Presupuesto`); I8 does too — `Cliente` in `capturarDatosRecepcion.affects`
  is an internal-actor write.
