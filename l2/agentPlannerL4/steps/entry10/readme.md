# entry10 — parse, refuse, adjust l5/config.json

Deterministic. No LLM call.

## Input

`@@agentPlannerL4 <lowerCamel>` on a module that already exists in `l4/` with
`pipeline.status: complete`. The pool is wiped on accept (it is derived from l4).

## Output

- `l5/config.json` — `workspaceDependencies` gains `102020` / `102021` at the end when missing;
  `projects[id] = { root: '../mls-<id>', type: 'lib' }` when that id is absent. Unchanged when
  both are already there.
- `l4/<mod>/pipeline/pipeline.json` — `l5Adjusted` tokens when something was added;
  `poolWiped` paths of the mailbox that was cleared.
- Done-anchor `entry10-done` so `dispatch20` can run.

## Refusals

All in `plEntryRefusal` (English): missing module token; module not in `l4/`; pipeline not
`complete`; missing `l5/config.json`; `/estimate`. Pending pool does not refuse.
