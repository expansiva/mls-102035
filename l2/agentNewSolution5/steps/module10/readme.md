# module10 — the module, its actors and its scope

One LLM call with tool `submitNs5Module`. Writes `l4/<mod>/module.defs.ts` and a draft at
`pipeline/module10-draft.json`. Clarification is reserved and has no screen; `/fast` auto-approves.

## Input

- The original request (`sourcePrompt`)
- Optional `/module <lowerCamel>` (fixed name; otherwise the model proposes)
- Organization registry actors, when present (same shape as NS4 E1 context)

## Output

`Ns5ModuleArtifact`: `moduleName`, `title`, languages, `actors[]` (`actorId`, `kind`, `origin`,
`title`, `description`), `scope.inScope` / `scope.outOfScope`. No features, no strategy.

## Invariants

- Ids are unique lowerCamel. At least one `internal` actor.
- `defaultLanguage` belongs to `productLanguages`.
- Product languages are only those the request cites.
- `origin: inferred` on an external actor is recorded here; `journeys20` drops it when it has no
  exclusive step.
- Gate repair is bounded (2). After that the pipeline step is `failed`.
- Success emits the `module10-done` result that unlocks `journeys20`.

## Known traps

- A persona in the prose is not an actor. The model still infers one; do not add prompt examples
  to fight that — the later mechanical drop is the fix.
- Do not invent product languages. `/fast` never asks.
