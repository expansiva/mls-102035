# finalize80

## 2026-09-11

- I7: disk files in `journeys/` and `ontology/` must equal the index plus `index.defs.ts`.
  Difference is `NS5_FINALIZE_I7_ORPHAN_FILE` with the orphan list. Fixture: live
  `comandaRestaurante5` disk before reconcile (19 journeys / index 4) fails; after, passes.
- I2 structural signal (`requiresTransitions` / `requiresBranching`, branching origin) is
  imported from ontology30 (`collectNs5LifecycleSignal`, `ns5LifecycleHasBranchingOrigin`).
  Observable I2 codes and messages are unchanged. The rule itself lives in ontology30.

## 2026-09-10

- First finalize step of agentNewSolution5. Deterministic oracle I1–I6, organization registry
  upsert (`mdmSubtype <- <mod>.<Entity>`), l5 config/project via E10 publishable helpers,
  `pipeline.status: complete`, `runNN_newsolution5.json`. Never dispatches CB/CF. I2 decide is
  kept strict against empty lifecycle (known ontology30 finding, not a finalize80 defect).
