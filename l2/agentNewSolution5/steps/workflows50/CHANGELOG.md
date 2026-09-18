# workflows50

## 2026-09-17 (ns5_49)

- Runs on the journeys alone: `readEntities` returns `[]` when there is no ontology index instead of
  throwing, the `## Entities with lifecycle` block leaves the human prompt, and `## Valid reference
  ids` is built from the journeys (`collectNs5JourneyEntityIds`, `collectNs5JourneyTransitionRefs`),
  unioned with the ontology when one is passed -- which is the case for the thirteen recorded v2 runs.
- The gate checks that need an ontology (`NS5_WORKFLOWS_ENTITY_UNKNOWN`, the `trigger.event`
  transition lookup, `NS5_WORKFLOWS_TRANSITION` / `NS5_WORKFLOWS_TRANSITION_BY`) only run when
  `context.entities` is non-empty. `replayRealRuns` passes entities and is unchanged.
- `MUST_PROCESS` is `handoff | crossActorDecide`. `foreignBy` is read off the ontology, which does
  not exist yet at this point, so it can no longer oblige a process here; finalize80 I6 still warns.
- `prompt.md`: an `entityRef`/`transitionRef` on a `mechanical`/`llm` stage, and a `trigger.event`,
  are declarations the ontology will honour.

## 2026-09-17

- ns5_48 (`-workflows-v3`): 4th stage `kind: 'alert'` — a recurring duty of a person
  (`taskId, kind, actorRef, next, description`, all required, nothing optional). The schedule
  stays on `trigger.schedule` and the instruction on `description`; an alert names no journey
  and no entity (`NS5_WORKFLOWS_KIND` when it does, `NS5_WORKFLOWS_ALERT_ACTOR` when the actor
  is missing or unknown). Prompt: a condition read from the data (overdue, blocked) is neither
  an alert nor a process; write an alert only when the request names a recurrence or a date with
  a human duty. `NS5_WORKFLOWS_SCHEMA_VERSION_V3` is emitted by the step; the thirteen recorded
  runs stay v2 and replay through `buildNs5WorkflowsArtifact`, as ontology30 did for v2/v3.

## 2026-09-16

- ns5_43 T1: a `crossActorDecide` signal is indexed by the ROOT of an `affects` reference,
  so an act on an embedded child counts for the entity that owns it. Reads both ontology forms.

## 2026-09-12

- G13 form (`-workflows-v2`): process `trigger` (`scheduled` | `event` | `manual`);
  stage `kind` `human` | `mechanical` | `llm` | `wait`; `human` points at a journey
  (no `stepRef`); `mechanical`/`llm` point at an entity with `effect` (same form as
  `act`). One `journeyDecisions[]` row per journey. Time/event phrases are extracted
  in code (`todo|cada|quando|automaticamente|a cada|mensal|diario`, accents folded) and injected as
  data. Normalize drops duplicate `kind`+`journeyRef|entityRef`+`effect` in the same
  process. `trigger.event` is `Entity.transitionId` or `module.eventId` of an inbound event (ns5_31).

## 2026-09-11

- Actors come from `readNs5Actors` (pipeline), not `module.defs.ts`.

## 2026-09-10

- First workflows step of agentNewSolution5: orchestrated processes of human/system/wait tasks
  pointing at existing journeys/steps. Tool `submitNs5Workflows` only when a structural signal
  exists (handoff, foreign-by transition, or cross-actor decide); otherwise persist
  `processes: []` with `noProcessSignal` and no LLM call. Gate: refs, human actorRef, uncovered
  handoff, cycle without wait. v1 form, provisional; align with the production harness (G3c)
  before any executor. A run then stops at `awaitingStep: access60`.
