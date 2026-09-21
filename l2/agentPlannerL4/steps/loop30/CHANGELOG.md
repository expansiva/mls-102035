# loop30

## 2026-09-20 (p4_08 rodada 2)

- Creates L1 r1 with the real `l2→l1` file when that message is in the box (same
  ramification B as effort). Waits for open L2/L1 child steps so it does not run
  before they write. A completed planner without output (`menu.json`+`l2→l1` for L2,
  `l1→l2` or `backend.json` for L1) fails the task: `<planId> ran without output`.

## 2026-09-20 (p4_08)

- Waits for L2 r1 / L1 r1, then creates L2 effort r1 with the real `l1→l2` file
  (ramification B). Further rounds only when a new `round > 1` message is in the box,
  up to 3 (`disputed` at 3). Writes `{ round, l2, l1, effort }` on the l4 pipeline.
  A failed planner step fails the task with the step name.

## 2026-09-18 (p4_06)

- Completes immediately and reports `listPoolBox`. Does not create planner or wait
  steps. `decidePlLoop` still runs (invoke ignored, `disputed` still recorded).
  Dispatch to other planners is suspended (Wagner, 18/09).

## 2026-09-18 (p4_05)

- Stop status stays on the `loop30-done` result and the `updateStatus` trace. No
  `add-message-ai`.

## 2026-09-18 (p4_03)

- Counts rounds from the L4 trace and `listPoolBox`. Stops at 3 with `disputed` (no delete).
  Missing L1 is a readable pending, not a silent error. No LLM.
