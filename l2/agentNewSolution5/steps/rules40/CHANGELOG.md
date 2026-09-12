# rules40

## 2026-09-11

- Catalog is `{ruleId, description}` only. `title` and `appliesTo` removed (they had
  no reader outside this gate). Gate: unique lowerCamel ids, non-empty description,
  nothing else. Time-without-citing-rule left with appliesTo. Consumers cite
  `ruleId` (`transitions[].ruleRefs`, later screens/endpoints).

## 2026-09-10

- First rules step of agentNewSolution5: prose catalog with `ruleId` + `appliesTo` references
  (entities, fields including `details.<name>`, transitions, journeys). Tool `submitNs5Rules`,
  gate, repair <= 2, persist `rules.defs.ts`. Time transitions without a citing rule fail
  `NS5_RULES_TIME_WITHOUT_RULE`. A run then stops at `awaitingStep: workflows50`.
