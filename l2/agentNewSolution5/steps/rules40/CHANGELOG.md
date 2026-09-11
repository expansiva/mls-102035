# rules40

## 2026-09-10

- First rules step of agentNewSolution5: prose catalog with `ruleId` + `appliesTo` references
  (entities, fields including `details.<name>`, transitions, journeys). Tool `submitNs5Rules`,
  gate, repair <= 2, persist `rules.defs.ts`. Time transitions without a citing rule fail
  `NS5_RULES_TIME_WITHOUT_RULE`. A run then stops at `awaitingStep: workflows50`.
