# dispatch20

## 2026-09-21 (p4_09)

- Depends on `diff20-done`. Pool messages cite `pool/l1/web/l4diff.json` and
  `pool/l2/web/l4diff.json`. Invoke prompt includes `candidate`.

## 2026-09-20 (p4_08 rodada 2)

- Creates only L2 r1. L1 r1 is created by loop30 when the `l2→l1` message exists.

## 2026-09-20 (p4_08)

- Creates `type: 'agent'` steps L2 r1 then L1 r1 (`dependsOn: l2-r1`) in the same task.
  Prompt `{ moduleName, thread, file }`. Missing planner stays a readable status.

## 2026-09-18 (p4_06)

- Stops after writing the two boxes and the trace. No `type: 'agent'` child, no wait
  step. The `dispatch20-done` result names the module, the thread, the artifact count
  and that both boxes are pending. Dispatch to other planners is suspended
  (Wagner, 18/09).

## 2026-09-18 (p4_05)

- Missing-planner status travels on the `dispatch20-done` result (and `updateStatus`).
  No `add-message-ai`.

## 2026-09-18 (p4_03)

- Lists module artifacts, writes the two pool messages, traces `delivered`, invokes planners by
  name. L1 missing ⇒ status says the requests stayed in the box. No LLM.
