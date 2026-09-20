# agentPlannerL4

## 2026-09-18 (p4_06)

- Dispatch to other planners is suspended (Wagner, 18/09) so the L4 planner can be tested
  alone. `dispatch20` writes `pool/l1` and `pool/l2`, traces `delivered`, and completes.
  `loop30` reports the boxes via `listPoolBox` and completes immediately. Neither step
  creates a `type: 'agent'` child or a wait. `createPlInvokeStep` and `decidePlLoop` stay
  in the code (the 3-round / `disputed` rule is unchanged; it is just not fired).

## 2026-09-18 (p4_05)

- A step never emits `add-message-ai`. Refusal and planner-missing status travel as an
  `AIResultStep` (`stepTitle: 'Status'` or the step's done-anchor) plus `updateStatus`.
  `plStatusMessage` lives next to `statusTask` and is not exported.

## 2026-09-18 (p4_03)

- `dispatch20` lists module artifacts (excluding `pipeline/`, `tobe/`, `pool/`), writes the two
  equal pool messages (`to: l2` and `to: l1`), traces them as `delivered`, and invokes
  `agentPlannerL2` by name. `agentPlannerL1` is invoked only when that agent is present in
  `mls.stor.files`; otherwise the status says the requests stayed in the box.
- `loop30` counts rounds from the L4 `pipeline.json` pool trace and `listPoolBox`. It never reads
  `l2/<mod>/pipeline/` or `l1/`. At round 3 with a non-empty box it records `disputed` and does
  not delete. No LLM.

## 2026-09-18 (p4_02)

- Skeleton in the NS5 pattern: `createAgent`, `helpers/plCore.ts` (parse, `plEntryRefusal`, planned
  steps `type: 'agent'`), `helpers/plDispatch.ts` (hooks per step), `docs/flow.json` +
  `flowContract.test.ts`. Steps `entry10 → dispatch20 → loop30`; 20 and 30 are declared and waiting.
- `entry10` is deterministic: invocation parse, refusals in English, `l5/config.json` planner
  deps (`102020`, `102021`) appended when missing, `l5Adjusted` recorded on the module pipeline.
  No LLM. A config that already lists both ids is left byte-identical.
- `/estimate` refuses with `not available yet`. Pool pending refuses with
  `module has pending pool messages; finish or dispute them first`.
