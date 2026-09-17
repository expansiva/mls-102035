# rules40

## 2026-09-16 (ns5_45)

- The artifact is `rules-v2` (`2026-09-16-ns5-rules-v2`): `rules` is a MAP of `ruleId` to the one
  business sentence, aligned with `mls-102034/l4/ontology/mdm.defs.ts`. `rules-v1` (the array) stays
  valid and is what the thirteen recorded modules hold; `solution/rulesView.ts` is the one reading for
  both forms and `Ns5RulesAny` the union. The tool keeps asking for a list — an open key set is not
  expressible in a strict tool schema — and the normalize converts. The gate now validates the map and
  takes the duplicate ids from the normalize, since the map itself cannot carry a collision.
- The repair prompt shows the saved draft as a LIST (`ns5RulesToolPayload`), not verbatim: what is on
  disk is now the artifact (a map, with a `schemaVersion` the strict tool schema does not accept) and
  the model is asked to submit that draft back.

## 2026-09-16

- ns5_43 T2: the prompt carries `pipeline.ontology30.citedRules[]` under "rules the
  ontology cited; keep these ids", merged with the `ruleRefs` of the transitions.
  A v3 entity prints its record as paths; finalize80 I4 still confirms the ids resolve.

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
