# dispatch20 — list artifacts, write pool messages, invoke by name

Deterministic. No LLM call.

## Input

A complete module whose `entry10` already ran. Pool was empty at entry (entry10 refuses otherwise).

## Output

- `l4/<mod>/pool/l2/<stamp>_<thread>_1.json` and `pool/l1/...` — two equal messages except `to`.
- `pipeline.json` pool trace: two `delivered` lines.
- Step `agentPlannerL2` with `prompt: { moduleName, thread, file }` when that agent exists.
- Step `agentPlannerL1` only when that agent exists. Otherwise the status names the pending box.

## Artifact list

Every file under `l4/<mod>/` except `pipeline/`, `tobe/`, `pool/`. Paths relative to the module.
First generation is the complete list.
