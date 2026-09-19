# judge35

## 2026-09-19 (ns5_64)

- Third verdict `coveredByAct`: a cited `act` on a related entity is the same human act. `coveredBy`
  is `journeyId.stepId`. The gate names the refusal (`COVERED_BY` / `COVERED_STEP` / `COVERED_ACT` /
  `COVERED_TRANSITION` / `COVERED_LINK` / `COVERED_ACTOR` / `COVERED_KIND`); no silent accept.
  Records `normalizations[] { kind: 'transitionCoveredByAct' }` and does not repair.
- Candidates carry `likelyCoveredBy`: act steps whose `transitionRef` has the same id on a related
  index entity, same actor. Hint only; the judge confirms. Index N:N edges count (not a FK walk).

## 2026-09-19 (ns5_62)

- New step. After `ontology30-done`, before `rules40`/`access60`. Deterministic candidates (human
  transitions no journey or process cites; `decide` origins the module does not cover). Empty list
  approves without an LLM call. One strict-tool verdict per candidate. `missingJourney` repairs
  through the existing `journeys20` repair channel, nested under this step; `transitionUnjustified`
  is a warning and does not delete the transition. Two repair rounds, then a named failure.
