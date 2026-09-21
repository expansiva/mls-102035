# dispatch20 — list artifacts, write pool messages, create L2 r1

Deterministic. No LLM call.

Creates a `type: 'agent'` child for `agentPlannerL2` in the same task. L1 r1 is created
by loop30 when the `l2→l1` message is in the box. Missing planner: readable status, no
silent skip of the box (the message stays).

## Input

A complete module whose `entry10` already ran and wiped the previous pool.

## Output

- `l4/<mod>/pool/l2/<stamp>_<thread>_1.json` and `pool/l1/...` — two equal messages except `to`.
- `pipeline.json` pool trace: two `delivered` lines.
- Step `l2-r1`. Prompt `{ moduleName, thread, file }`.
- `dispatch20-done` result: module, thread, artifact count, invoke count.

## Artifact list

Every file under `l4/<mod>/` except `pipeline/`, `tobe/`, `pool/`. Paths relative to the module.
First generation is the complete list.
