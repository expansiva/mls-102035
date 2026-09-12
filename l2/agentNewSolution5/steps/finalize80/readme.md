# finalize80 — integrity oracle, registry, l5, complete

Deterministic. No LLM call. Writes `pipeline/finalize-report.json`, upserts the organization
registry, fills `l5/config.json` and `l5/project.json` with the same E10 publishable helpers
(re-exported from `solution/lib.ts`), marks `pipeline.status: complete`, and writes
`pipeline/runNN_newsolution5.json`. Never dispatches agentChangeBackend or agentChangeFrontend.

## Input

The six approved sources plus `pipeline.json` with `integration70: approved`.

## Output

- `l4/<mod>/pipeline/finalize-report.json` — checks I1-I8, `errors` and `warnings`
- organization `l4/organization/registry.defs.ts` — module block with actors and
  `mdmSubtype <- <mod>.<Entity>` roles
- `l5/config.json` / `l5/project.json` — workspaceDependencies, projects, platform block
  defaults, module listed, `appEnv`/`projectType`/`modules[]` only when absent
- `l4/<mod>/pipeline/pipeline.json` — `status: complete`, `finalize80: approved`
- `l4/<mod>/pipeline/runNN_newsolution5.json` — command, cost sum, verdict, `handoff: never`

## Oracle

| check | meaning | on fail |
|---|---|---|
| I1 | every id ref between sources exists (actor, entity, field, transition, rule, journey, profile, authority). A journey `entity`/`affects` naming an id in `pipeline.json` `ontology30.liftedAggregateEntities` is a `module.details` ref when that map has keys — not an unknown entity | error |
| I2 | first `act` on an entity is create; a later `act` on an already-provided entity with lifecycle needs a transition whose `by` includes the journey actor and whose `from` intersects reachable origin states (`NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION`); every `decide` has at least two transitions from the same origin state. Does not apply to a locate→inspect journey. Structural signal (`requiresTransitions` / `requiresBranching`) comes from ontology30 `collectNs5LifecycleSignal` — do not recompute it here | error |
| I3 | every actor has at least one journey and one profile; every profile has at least one grant | error |
| I4 | every cited `transitions[].ruleRefs` exists in `rules.defs.ts`. An uncited rule is not a defect at l4 | error |
| I5 | every mdm entity has `mdmSubtype`; every non-mdm entity on an `own` grant reaches a `party: person` (`anchorPath`) | error |
| I6 | a `handoff` without a covering process, or a foreign-by / cross-actor decide with `processes: []` | warning |
| I7 | `journeys/*.defs.ts` and `ontology/*.defs.ts` on disk equal the index plus `index.defs.ts` | error (`NS5_FINALIZE_I7_ORPHAN_FILE`) |
| I8 | every `own`/`related` grant whose `anchorEntity` is `party: person` has an internal-actor `act` on that entity (`entity == P`, not `affects`). No public `entry.mode` exists | error (`NS5_FINALIZE_I8_LOGIN_PERSON_WITHOUT_REGISTRATION`) |

Errors fail the run with the report. Warnings only continue.

I2 is not relaxed for `mutability: appendOnly` with empty `lifecycleStates`/`transitions`. ontology30
now rejects that shape when journeys show a repeated `act` or a `decide` (with repair). This oracle
still fails the same shape if it reaches here; do not invent a transition and do not weaken the check.

## Invariants

- One code per check: `NS5_FINALIZE_I1` ... `NS5_FINALIZE_I6`; I7 uses `NS5_FINALIZE_I7_ORPHAN_FILE`;
  I2 act-without-transition uses `NS5_FINALIZE_I2_ACT_WITHOUT_TRANSITION`;
  I8 uses `NS5_FINALIZE_I8_LOGIN_PERSON_WITHOUT_REGISTRATION`.
- An LLM reply on this step fails (`finalize80 is deterministic`).
- Status updates use `cleaner: input_output`.
- Converted ce02 / ce05 fixtures: comandaRestaurante5 passes I1-I8 with no warnings
  when disk matches the index; ordenServicio5 fails I8 (`Cliente` only in `affects`).
