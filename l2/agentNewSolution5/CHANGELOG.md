# agentNewSolution5

## 2026-09-10

- `journeys20`: normalize drops `handoffTo` unless `kind === 'handoff'` (prompt/feedback did not stop the self-label). Schema `if/then` not used (`x-tool-strict` would leave the repair path). Gate still requires a valid receiver on a real handoff.
- `journeys20`: omit `handoffTo` except on `kind: handoff`; gate feedback names `stepId` and says remove the field. Gate unchanged.
- `journeys20`: business journeys only (`affects`, `decide`, inferred-actor drop). Tool `submitNs5Journeys`, gate, repair <= 2, persist `journeys/*.defs.ts` + index. A run then stops at `awaitingStep: ontology30`.
- `module10`: actors with `origin`, languages by prompt provenance, module name from `/module` or a proposal, scope lists. Tool `submitNs5Module`, gate, repair <= 2, persist `module.defs.ts`. A run then stops at `awaitingStep: journeys20`.
- Skeleton: `docs/flow.json`, `createAgent`, invocation flags, pipeline on disk, `l2/solution` types + re-exports + fs.
