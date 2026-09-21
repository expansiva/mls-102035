# diff20 — sealed base × candidate `l4diff.json`

Deterministic. No LLM call.

Runs between `entry10` and `dispatch20`. Compares the sealed release l4
(`pipeline/releases/<active>/l4`) with the `/candidate` root and writes
`pool/l1/web/l4diff.json` and `pool/l2/web/l4diff.json`.

## Input

A module whose `entry10` already ran. `/candidate` is optional: without it the
diff is empty (`items: []`) and the canonical l4 is not read as a candidate.

## Output

- `l4/<mod>/pool/l1/web/l4diff.json` and `pool/l2/web/l4diff.json` — same JSON.
- Schema `2026-09-21-p4-l4diff-v1`. Items are `added | changed | removed` per
  entity, field, transition, rule, grant, process, task, inbound, outbound.
- `diff20-done` so `dispatch20` can cite the two files in the pool messages.

Without a sealed base the left side is empty. Unknown `pipeline.flowId` is
recorded in `entry10`, not refused here.
