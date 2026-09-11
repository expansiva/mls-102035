# workflows50

## 2026-09-10

- First workflows step of agentNewSolution5: orchestrated processes of human/system/wait tasks
  pointing at existing journeys/steps. Tool `submitNs5Workflows` only when a structural signal
  exists (handoff, foreign-by transition, or cross-actor decide); otherwise persist
  `processes: []` with `noProcessSignal` and no LLM call. Gate: refs, human actorRef, uncovered
  handoff, cycle without wait. v1 form, provisional; align with the production harness (G3c)
  before any executor. A run then stops at `awaitingStep: access60`.
