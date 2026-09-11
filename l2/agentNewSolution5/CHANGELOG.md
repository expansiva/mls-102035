# agentNewSolution5

## 2026-09-10

- `workflows50`: orchestrated processes of human/system/wait tasks pointing at existing
  journeys/steps. Tool `submitNs5Workflows` only on a structural signal (handoff, foreign-by
  transition, cross-actor decide); otherwise `processes: []` with `noProcessSignal` and no LLM
  call. v1 form, provisional; align with the production harness (G3c) before any executor. A run
  then stops at `awaitingStep: access60`.
- `notImplemented` drains only siblings without a registered hook. A parallel unimplemented step
  (`workflows50`/`access60`) no longer completes an implemented sibling still running (`rules40`).
  Failure paths still drain every non-terminal sibling so the task does not hang.
- `rules40`: prose catalog with `ruleId` + `appliesTo` (entities, fields including `details.<name>`,
  transitions, journeys). Tool `submitNs5Rules`, gate, repair <= 2, persist `rules.defs.ts`. Time
  transitions without a citing rule fail. A run then stops at `awaitingStep: workflows50`.
- `ontology30`: isolated entity validation skips journey citation (fan-out of 1 entity vs N cited
  always failed). Plan and bindings still require every journey entity.
- `ontology30`: normalize drops `mdmSubtype` unless `kind === 'mdm'` and `mutability: appendOnly`
  unless `kind !== 'mdm'` (same class as journeys20 `handoffTo`). Gate still requires a subtype on
  a real mdm entity.
- `ontology30`: plan + entity fan-out + relationship bindings. MDM identity stays out of `fields[]`.
  Calculated values are `details`. Lifecycle carries allowed transitions. A run then stops at
  `awaitingStep: rules40`.
- `journeys20`: normalize drops `handoffTo` unless `kind === 'handoff'` (prompt/feedback did not stop the self-label). Schema `if/then` not used (`x-tool-strict` would leave the repair path). Gate still requires a valid receiver on a real handoff.
- `journeys20`: omit `handoffTo` except on `kind: handoff`; gate feedback names `stepId` and says remove the field. Gate unchanged.
- `journeys20`: business journeys only (`affects`, `decide`, inferred-actor drop). Tool `submitNs5Journeys`, gate, repair <= 2, persist `journeys/*.defs.ts` + index. A run then stops at `awaitingStep: ontology30`.
- `module10`: actors with `origin`, languages by prompt provenance, module name from `/module` or a proposal, scope lists. Tool `submitNs5Module`, gate, repair <= 2, persist `module.defs.ts`. A run then stops at `awaitingStep: journeys20`.
- Skeleton: `docs/flow.json`, `createAgent`, invocation flags, pipeline on disk, `l2/solution` types + re-exports + fs.
