# journeys20 — business journeys only

One LLM call with tool `submitNs5Journeys`. Writes `l4/<mod>/journeys/<journeyId>.defs.ts` and
`journeys/index.defs.ts`. Clarification is reserved and has no screen; `/fast` auto-approves.

## Input

- The original request (`sourcePrompt`)
- Actors from `module.defs.ts` (`actorId`, `kind`, `origin`, `title`, `description`)

## Output

`Ns5JourneyArtifact` per journey: `business` (actor, entry, steps with `affects`, decide, outcome)
and `businessHash`. Index: order plus `systemDecisions`. No `useRules`, no `featureRefs`, no
`resolution`/`realization`.

## Invariants

- `actorRef` is an actor from `module.defs.ts`. Ids are unique lowerCamel.
- A journey of only `locate`/`inspect` is valid (consultation). `act`/`decide` only
  when the request names a change or a human choice.
- `affects` is only on `act`, does not repeat `entity`, has no duplicates.
- An `act` declares `effect`: `create` (new record), `transition` (names `transitionRef`)
  or `update` (edits fields). Missing `effect` is `NS5_JOURNEY_ACT_EFFECT_REQUIRED`.
  `transitionRef` without `effect: 'transition'` is dropped (`normalizations[]`);
  `effect: 'transition'` without `transitionRef` is `NS5_JOURNEY_TRANSITION_REF_REQUIRED`.
  Either field on a non-act is `NS5_JOURNEY_ACT_EFFECT_KIND`.
- `handoffTo` is an actor id and only on `handoff`.
- Twin journeys (same actor, same set of `kind:entity`) fail the gate.
- After the gate: inferred `external` actor without an exclusive step is dropped from
  `module.defs.ts` and recorded as `dropInferredActor<Actor>`. `kind: system` stays.
- A module with no `decide` step is valid; the count is stored on the pipeline step.

## Known traps

- A confirmation is not a `decide`. Do not add prompt examples to fight invented decides — the
  gate does not require a decide.
- Entity names here are UpperCamel text. ontology30 is the step that must declare them.
- `handoffTo` is only on `kind: handoff`. The model copies `actorRef` onto every step as a
  "who does this" label (measured: 17/17 non-handoff steps, 3 calls, after an explicit omit
  prompt plus named `gateFeedback`). Normalize drops the field unless `kind === 'handoff'`
  before the gate — same class as module10 overwriting `schemaVersion`/`sourcePrompt`. Schema
  `if/then` was not used: `x-tool-strict` would reject the whole tool call and leave the
  repair path. The gate still fails a `handoff` step that lacks `handoffTo` or names an unknown
  actor.
