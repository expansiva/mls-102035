# workflows50

## 2026-09-12

- G13 form (`-workflows-v2`): process `trigger` (`scheduled` | `event` | `manual`);
  stage `kind` `human` | `mechanical` | `llm` | `wait`; `human` points at a journey
  (no `stepRef`); `mechanical`/`llm` point at an entity with `effect` (same form as
  `act`). One `journeyDecisions[]` row per journey. Time/event phrases are extracted
  in code (`todo|cada|quando|automaticamente|a cada|mensal|diario`, accents folded) and injected as
  data. Normalize drops duplicate `kind`+`journeyRef|entityRef`+`effect` in the same
  process. `trigger.event` is `Entity.transitionId` until inbound (ns5_31).

## 2026-09-11

- Actors come from `readNs5Actors` (pipeline), not `module.defs.ts`.

## 2026-09-10

- First workflows step of agentNewSolution5: orchestrated processes of human/system/wait tasks
  pointing at existing journeys/steps. Tool `submitNs5Workflows` only when a structural signal
  exists (handoff, foreign-by transition, or cross-actor decide); otherwise persist
  `processes: []` with `noProcessSignal` and no LLM call. Gate: refs, human actorRef, uncovered
  handoff, cycle without wait. v1 form, provisional; align with the production harness (G3c)
  before any executor. A run then stops at `awaitingStep: access60`.
