# agentPlannerL4

## 2026-09-18 (p4_02)

- Skeleton in the NS5 pattern: `createAgent`, `helpers/plCore.ts` (parse, `plEntryRefusal`, planned
  steps `type: 'agent'`), `helpers/plDispatch.ts` (hooks per step), `docs/flow.json` +
  `flowContract.test.ts`. Steps `entry10 → dispatch20 → loop30`; 20 and 30 are declared and waiting.
- `entry10` is deterministic: invocation parse, refusals in English, `l5/config.json` planner
  deps (`102020`, `102021`) appended when missing, `l5Adjusted` recorded on the module pipeline.
  No LLM. A config that already lists both ids is left byte-identical.
- `/estimate` refuses with `not available yet`. Pool pending refuses with
  `module has pending pool messages; finish or dispute them first`.
