# rules40 — what has to hold

One LLM call with tool `submitNs5Rules`. Writes `l4/<mod>/rules.defs.ts`. Clarification is reserved
and has no screen; `/fast` auto-approves.

## Input

- The original request (`sourcePrompt`)
- Journeys (`business` entire)
- Ontology: entities, fields, `details`, allowed transitions

## Output

`Ns5RulesArtifact`: `rules[]` with `ruleId` and `description`. No title, no `appliesTo`,
no `useRules` copies, no `sourceRefs`, no implementation fields. An empty catalog is valid
when the request and the journeys name no constraint.

## Invariants

- Ids are unique lowerCamel. Description is non-empty. The gate checks form only.
- Who uses a rule cites it: `transitions[].ruleRefs` (I4 checks the id exists), later
  screens and endpoints. A rule nobody cites is not a defect at l4.
- If a transition already lists `ruleRefs`, those ids must appear in this catalog.
- Gate repair is bounded (2). After that the pipeline step is `failed`.
- Success emits the `rules40-done` result. `integration70` still waits for `workflows50-done` and
  `access60-done`.

## Known traps

- Do not invent a rule that is not grounded in the request or a journey. Empty is valid.
- Do not add prompt examples of a domain.
