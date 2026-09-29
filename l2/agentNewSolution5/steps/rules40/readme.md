# rules40 — what has to hold

One LLM call with tool `submitNs5Rules`. Writes `l4/<mod>/rules.defs.ts`. Clarification is reserved
and has no screen; `/fast` auto-approves.

## Input

- The original request (`sourcePrompt`)
- Journeys (`business` entire)
- Ontology: entities, fields, `details`, allowed transitions

## Output

`Ns5RulesArtifactV2`: `rules` is a MAP of `ruleId` to the one business sentence, the shape
`mls-102034/l4/ontology/mdm.defs.ts` uses for its own `rules` and `capabilities`. No title, no
`appliesTo`, no `useRules` copies, no `sourceRefs`, no implementation fields. An empty catalog is
valid when the request and the journeys name no constraint.

The TOOL still asks for a LIST of `{ruleId, description}`: a strict tool schema must declare
`additionalProperties: false` on every object, so an open key set cannot be expressed. The normalize
turns the list into the map (same move as `keyed()` in `steps/ontology30/contractsV3.ts`).

A catalog written as `rules-v1` (an array of `{ruleId, description}`) stays valid and is what every
recorded module holds; readers go through `solution/rulesView.ts`, which answers for both forms.

## Invariants

- Ids are unique lowerCamel. Description is non-empty. The gate checks form only.
- A map cannot hold a duplicate id, so the normalize reports the collision and the gate reads it from
  `duplicateRuleIds`; a catalog read off disk brings no such evidence and is not accused of one.
- Who uses a rule cites it: `transitions[].ruleRefs` (I4 checks the id exists), later
  screens and endpoints. A rule nobody cites is not a defect at l4.
- If a transition already lists `ruleRefs`, those ids must appear in this catalog.
- Gate repair is bounded (2). After that the pipeline step is `failed`.
- Success emits the `rules40-done` result. `integration70` still waits for `workflows50-done` and
  `access60-done`.
- p4_20: after writing, `rules.defs.ts` go through the Studio compiler (`helpers/ns5Compile.ts`, never a disk tsc). Diagnostics go to this step's repair as `gateFeedback`, same budget as the gate; past it the step is `failed` with the error. `steps.rules40.compile` records `clean`/`errors`/`unavailable` and the file count; `unavailable` (no `mls.l2.typescript`) is a state, never clean.

## Known traps

- Do not invent a rule that is not grounded in the request or a journey. Empty is valid.
- Do not add prompt examples of a domain.
