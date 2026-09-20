# dispatch20 — list artifacts, write pool messages, stop

Deterministic. No LLM call.

Dispatch to other planners is suspended (Wagner, 18/09). This step does **not** create
an `agentPlannerL2` / `agentPlannerL1` child or a wait. `createPlInvokeStep` stays in
`plCore` for when that suspension lifts.

## Input

A complete module whose `entry10` already ran. Pool was empty at entry (entry10 refuses otherwise).

## Output

- `l4/<mod>/pool/l2/<stamp>_<thread>_1.json` and `pool/l1/...` — two equal messages except `to`.
- `pipeline.json` pool trace: two `delivered` lines.
- `dispatch20-done` result: module, thread, artifact count, both boxes pending for the planners.

## Artifact list

Every file under `l4/<mod>/` except `pipeline/`, `tobe/`, `pool/`. Paths relative to the module.
First generation is the complete list.
