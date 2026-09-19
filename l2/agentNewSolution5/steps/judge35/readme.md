# judge35 — what has to hold

One LLM call with tool `submitNs5Judge`, and only when the deterministic candidate list is not
empty. Writes `l4/<mod>/pipeline/judge35-draft.json`. No clarification. `/fast` auto-approves.

## Input

- Journeys (`business` entire)
- Ontology: entity id, lifecycle, transitions with `by`
- Processes (stages that cite a transition)
- The candidate list, computed with no LLM

## Output

A draft of `{ candidates, verdicts, rounds }`. No l4 source. Completeness is repaired by a nested
`journeys20` repair (`createNs5RetryStep(..., 'repair', n, { gateFeedback })`) under this step.

## Invariants

- Empty candidates ⇒ approve, `noJudgeSignal`, cost 0. Nine of the twelve v4 modules take this path.
- Candidates: (a) human transition (`by` is a non-empty actor list) that no journey `transitionRef`
  and no process stage cites, keyed `entityId.transitionId`; (b) a `decide` whose origin has N>=2
  leaving transitions, this journey cites fewer than N, and the module as a whole also cites fewer
  than N.
- Verdict enum is required: `missingJourney` | `transitionUnjustified`.
- `missingJourney` schedules at most two nested journeys20 repairs, then fails naming the leftovers.
- `transitionUnjustified` is recorded on `pipeline.judge35.warnings` / `normalizations[]`. The
  transition is not deleted.
- The ontology does not regenerate.

## Known traps

- Do not ask the judge to hunt for other defects. Only the candidates.
- Do not emit a second `journeys20-done` from the nested repair: planIds are unique in the task.
- `rules40` and `access60` wait for `judge35-done`, not `ontology30-done`.
