# rules40 — what has to hold

One LLM call with tool `submitNs5Rules`. Writes `l4/<mod>/rules.defs.ts`. Clarification is reserved
and has no screen; `/fast` auto-approves.

## Input

- The original request (`sourcePrompt`)
- Journeys (`business` entire)
- Ontology: entities, fields, `details`, allowed transitions

## Output

`Ns5RulesArtifact`: `rules[]` with `ruleId`, `title`, `description`, `appliesTo` (`entityRefs`,
`fieldRefs`, `transitionRefs`, `journeyRefs`). No `useRules` copies, no `sourceRefs`, no
implementation fields. An empty catalog is valid when the request and the journeys name no
constraint and no transition is `by: time`.

## Invariants

- Ids are unique lowerCamel.
- Every rule has at least one `appliesTo` reference, and every reference exists (entity,
  `Entity.field` or `Entity.details.name`, `Entity.transitionId`, journey).
- A calculated value declared in `details` is a valid field ref (`Entity.details.name`, or the
  detail name as `Entity.name`).
- A transition `by: time` without a rule that cites it fails `NS5_RULES_TIME_WITHOUT_RULE`.
- Gate repair is bounded (2). After that the pipeline step is `failed`.
- Success emits the `rules40-done` result. `integration70` still waits for `workflows50-done` and
  `access60-done`. A run then stops at the first unimplemented sibling (`workflows50`).

## Known traps

- Do not invent a rule that is not grounded in the request or a journey. Empty is valid.
- `appliesTo` is the inverse of NS4 `useRules`: the rule names whom it applies to; later screens
  and endpoints cite `ruleId`. A rule nobody cites is a later oracle warning, not this gate.
- Do not add prompt examples of a domain. Placeholders (`<Entity>`, `<field>`, `<journeyId>`) are
  context.
