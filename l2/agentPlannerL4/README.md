# agentPlannerL4

L4 planner. Lists the artifacts of an existing complete module and writes `pool/l1` and
`pool/l2`. No LLM. Does not read ontology to opine.

Dispatch to other planners is **suspended** (Wagner, 18/09) so the L4 planner can be
tested alone. `createPlInvokeStep` and `decidePlLoop` stay in the code; the steps do not
call them to spawn L2/L1.

`entry10` is implemented (parse, refusals, `l5/config.json` planner deps). `dispatch20`
lists artifacts, writes `pool/l1` + `pool/l2`, traces `delivered`, and completes.
`loop30` reports the boxes via `listPoolBox` and completes immediately (round counting
and `disputed` stay in `decidePlLoop`).

## Invocation

```
@@agentPlannerL4 <lowerCamel>
@@agentPlannerL4 <lowerCamel> /fast
```

- Module must already exist in `l4/` with `pipeline.status: complete`.
- Pending pool messages refuse: `module has pending pool messages; finish or dispute them first`.
- `/estimate` is refused (`not available yet`). There is no `/rebuild`.
- Mode is implicit `implement`.

## What entry10 writes

If `l5/config.json` of the current project is missing `102020` or `102021` in
`workspaceDependencies`, they are appended (existing order kept) and
`projects[id] = { root: '../mls-<id>', type: 'lib' }` is filled when absent.
Tokens land on `pipeline.json` as `l5Adjusted` (e.g. `workspaceDependencies:+102021`).
When both ids are already there the file is not rewritten.

## L4 table

| path | owner |
|---|---|
| `l4/<mod>/pipeline/pipeline.json` | NS5 run + planner `l5Adjusted` and pool trace |
| `l4/<mod>/pool/{l1,l2,l4}/` | mailbox (`solution/pool.ts`) |
| `l5/config.json` | planner deps `102020` / `102021` |

Types of the pool live in `/_102035_/l2/solution/pool.ts`. `docs/flow.json` is the contract.
