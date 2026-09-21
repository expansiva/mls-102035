# entry10

## 2026-09-20 (p4_08)

- Wipes the module pool on accept (messages + `web/*.json`). `poolWiped` on the l4
  pipeline. Pending pool no longer refuses.

## 2026-09-18 (p4_05)

- A refusal is an `AIResultStep` (`stepTitle: 'Status'`) plus `updateStatus` and
  `drainWaitingSiblings`. No `add-message-ai`.

## 2026-09-18 (p4_02)

- Deterministic entry: parse `@@agentPlannerL4 <lowerCamel> [/fast]`, refuse in `plEntryRefusal`,
  adjust `l5/config.json` planner deps, write `l5Adjusted` on the module `pipeline.json`, emit
  `entry10-done`. No LLM. `/estimate` is not available yet.
