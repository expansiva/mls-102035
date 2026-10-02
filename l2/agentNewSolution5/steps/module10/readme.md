# module10 — the module, its actors and languages

One LLM call with tool `submitNs5Module`. Writes `l4/<mod>/module.defs.ts` and a draft at
`pipeline/module10-draft.json`. Actors go to `pipeline.json` `module10.actors`. No clarification
anchor; `/fast` auto-approves.

## Input

- The original request (`sourcePrompt`)
- Optional `/module <lowerCamel>` (fixed name; otherwise the model proposes)
- Organization registry actors, when present (same shape as NS4 E1 context)

## Output

`Ns5ModuleArtifact`: `moduleName`, `title`, languages, `sourcePrompt`. Actors are pipeline
state (`readNs5Actors`). No features, no strategy, no `scope`.

## Invariants

- Ids are unique lowerCamel. At least one `internal` actor.
- `defaultLanguage` belongs to `productLanguages`.
- Product languages are only those the request cites.
- `pt` is rewritten to `pt-BR` (BCP-47 with region). `en` is not rewritten to `en-US`.
  Recorded on `pipeline.json` `module10.normalizations[]` (`ptToPtBR`).
- `origin: inferred` on an external actor is recorded here; `journeys20` drops it when it has no
  exclusive step.
- Gate repair is bounded (2). After that the pipeline step is `failed`.
- Success emits the `module10-done` result that unlocks `journeys20`.
- p4_20: after writing, `module.defs.ts` go through the Studio compiler (`helpers/ns5Compile.ts`, never a disk tsc). Diagnostics go to this step's repair as `gateFeedback`, same budget as the gate; past it the step is `failed` with the error. `steps.module10.compile` records `clean`/`errors`/`unavailable` and the file count; `unavailable` (no `mls.l2.typescript`) is a state, never clean. A compile repair may rewrite the `module.defs.ts` this same run wrote (not a pre-existing module).

## Known traps

- A persona in the prose is not an actor. The model still infers one; do not add prompt examples
  to fight that — the later mechanical drop is the fix.
- Do not invent product languages. `/fast` never asks.
- p4_21: `gate.ts` moved to `solution/gates/module10/` (pure normalize/validate, used outside the agent; `mls-base/skills/agentCodeIsPrivate.md`). Dated reexport left at the old path of `gate.ts` for consumers of another owner (newRelease, agentReviewSolution); delete it when they switch.
