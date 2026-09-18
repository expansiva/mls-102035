# loop30 — count rounds, next planner step, stop at 3

Deterministic. No LLM call.

## Input

The L4 pool trace (`l4/<mod>/pipeline/pipeline.json.pool[]`) and the boxes on disk
(`listPoolBox`). Never `l2/<mod>/pipeline/` or `l1/`.

## Output

- Next `agentPlannerL2` / `agentPlannerL1` step while there is a new message and `round < 3`.
- At round 3 with a non-empty box: `outcome: disputed` on the L4 trace. The message stays.
- Status in English. Without L1, round 1 with `pool/l1` pending is the expected stop.
