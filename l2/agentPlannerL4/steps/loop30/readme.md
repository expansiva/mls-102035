# loop30 — wait, L2 effort, conditional rounds 2–3, table

Deterministic. No LLM call.

After `dispatch20` created L2 r1, this step waits for L2 (and the children it
scheduled) until the `l2→l1` message is in the box, then creates `L1 r1` with that
real filename, then `L2 effort r1` with the real `l1→l2` filename (L2 does not
accept `file: ''` as a step prompt). A completed planner without output fails the
task. Further rounds only when a new message with `round > 1` is in the box, up to
3. Round 3 with a non-empty box is `disputed` (message stays).

## Input

The L4 pool trace (`l4/<mod>/pipeline/pipeline.json.pool[]`) and the boxes on disk
(`listPoolBox`). Never `l2/<mod>/pipeline/` or `l1/`.

## Output

- `l2-effort-r1` (and later rounds when needed) plus wait ticks `loop30-wait-N`.
- `loop30-done` result with `l1Count` / `l2Count` and the `{ round, l2, l1, effort }` table.
- The same table on the l4 `pipeline.json` as `plOrchestration`.
- A failed planner step fails this step with that planId.
