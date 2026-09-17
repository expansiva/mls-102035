/// <mls fileReference="_102035_/l2/solution/rulesView.ts" enhancement="_blank"/>

/**
 * ONE reading of `l4/<module>/rules.defs.ts`, in whichever form it was written (ns5_45).
 *
 * WHY IT EXISTS. `rules40` now emits the MAP form (`Ns5RulesArtifactV2`, `rules: Record<ruleId,
 * sentence>`), aligned with `mls-102034/l4/ontology/mdm.defs.ts`; the ARRAY form
 * (`Ns5RulesArtifact`) stays valid and is what every recorded module holds. Every reader wants a
 * slightly different shape — `finalize80` I4 a `Set` of ids, the gate and the newRelease screens the
 * record, the replay the ordered list — and all of them fall out of ONE ordered entry list. One helper,
 * therefore, instead of the same `schemaVersion` branch written out at each site and drifting.
 *
 * THE ONE EXCEPTION is `mls-102034/l2/mdm/resolveMdmEntity.ts`, whose own test proves it has no value
 * import at all (the clarification screen loads it in the browser); it repeats the branch in three
 * lines, and that test pins the two readings against each other.
 *
 * PURE ON PURPOSE, like `ontologyView.ts` and `resolveMdmEntity.ts`: types only, no `node:*`, no
 * `mls.*`, no I/O. That is what lets `mls-102034/l2/mdm/resolveMdmEntity.ts` — which the clarification
 * screen imports in the browser — call it, and what puts it under `tsconfig.backend.json` through the
 * `l1` test that imports it.
 *
 * ORDER IS THE WRITTEN ORDER. `ruleId` is `^[a-z][A-Za-z0-9]*$`, never integer-like, so a map keeps
 * insertion order and array to map to array is byte-stable — which is what lets the recorded v1 runs
 * still replay to their fixtures after the normalize started producing a map.
 */

import {
  NS5_RULES_SCHEMA_VERSION_V2,
  type Ns5Rule,
  type Ns5RulesAny,
  type Ns5RulesArtifactV2,
} from '/_102035_/l2/solution/types.js';

/** The form discriminator. The only place that looks at `schemaVersion`. */
export function isNs5RulesV2(artifact: Ns5RulesAny): artifact is Ns5RulesArtifactV2 {
  return artifact.schemaVersion === NS5_RULES_SCHEMA_VERSION_V2;
}

/** The catalog as ordered `{ ruleId, description }`, from either form. */
export function ns5RuleEntries(artifact: Ns5RulesAny): Ns5Rule[] {
  if (isNs5RulesV2(artifact)) {
    return Object.entries(artifact.rules).map(([ruleId, description]) => ({ ruleId, description }));
  }
  return artifact.rules.map(rule => ({ ruleId: rule.ruleId, description: rule.description }));
}

/** The catalog as the record the gate and the artifact hold, from either form. */
export function ns5RuleRecord(artifact: Ns5RulesAny): Record<string, string> {
  const rules: Record<string, string> = {};
  for (const rule of ns5RuleEntries(artifact)) rules[rule.ruleId] = rule.description;
  return rules;
}

/** The cited-id check of finalize80 I4, from either form. */
export function ns5RuleIds(artifact: Ns5RulesAny): Set<string> {
  return new Set(ns5RuleEntries(artifact).map(rule => rule.ruleId).filter(Boolean));
}
