# dispatch20

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
