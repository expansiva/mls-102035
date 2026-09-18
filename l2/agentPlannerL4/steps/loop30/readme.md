# loop30 — report the boxes and complete immediately

Deterministic. No LLM call.

Dispatch to other planners is suspended (Wagner, 18/09). This step does **not** create
the next planner step. `decidePlLoop` still runs so the 3-round / `disputed` rule stays
live; invoke is ignored, `disputed` is still recorded.

## Input

The L4 pool trace (`l4/<mod>/pipeline/pipeline.json.pool[]`) and the boxes on disk
(`listPoolBox`). Never `l2/<mod>/pipeline/` or `l1/`.

## Output

- `loop30-done` result with `l1Count` / `l2Count` from `listPoolBox`.
- At round 3 with a non-empty box: `outcome: disputed` on the L4 trace. The message stays.
- Completes immediately so the task can leave `in progress`.
