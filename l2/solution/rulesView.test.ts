/// <mls fileReference="_102035_/l2/solution/rulesView.test.ts" enhancement="_blank"/>
/**
 * ns5_45 — `rules.defs.ts` in the MAP form (`rules-v2`), and the one reading that answers for both
 * forms. The compile half lives in `mls-102034/l1/mdm/defs/resolveMdmEntity.test.ts`, which is the file
 * the certification type-checks (`tsconfig.frontend.json` excludes `l2/**\/*.test.ts`); here is the
 * runner half: the render, the gate and finalize80 I4 over a v2 catalog.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { renderDefsSource } from '/_102035_/l2/solution/fs.js';
import { isNs5RulesV2, ns5RuleEntries, ns5RuleIds, ns5RuleRecord } from '/_102035_/l2/solution/rulesView.js';
import type { Ns5RulesArtifact, Ns5RulesArtifactV2 } from '/_102035_/l2/solution/types.js';
import {
  buildNs5RulesArtifactV2,
  normalizeNs5RulesPayload,
} from '/_102035_/l2/agentNewSolution5/steps/rules40/contracts.js';
import { validateNs5Rules } from '/_102035_/l2/agentNewSolution5/steps/rules40/gate.js';
import { runNs5Oracle } from '/_102035_/l2/agentNewSolution5/steps/finalize80/gate.js';
import {
  asNs5RulesV2,
  loadNs5FixtureText,
  loadNs5OracleSources,
  loadNs5Rules,
  ns5ReplayModules,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5RealFixtures.test.js';
import { agendaClinicaRulesV2 } from '/_102035_/l2/agentNewSolution5/steps/rules40/fixtures/agendaClinica-rules-v2.defs.js';
import { agendaClinicaRules } from '/_102035_/l2/agentNewSolution5/steps/ontology30/fixtures/agendaClinica-v3/rules.defs.js';

const V1: Ns5RulesArtifact = agendaClinicaRules as unknown as Ns5RulesArtifact;
const V2: Ns5RulesArtifactV2 = agendaClinicaRulesV2;

// ---------------------------------------------------------------------------
// The reading
// ---------------------------------------------------------------------------

void test('the same catalog reads identically in both forms', () => {
  assert.equal(isNs5RulesV2(V1), false);
  assert.equal(isNs5RulesV2(V2), true);
  assert.deepEqual(ns5RuleEntries(V2), ns5RuleEntries(V1));
  assert.deepEqual(ns5RuleRecord(V2), ns5RuleRecord(V1));
  assert.deepEqual([...ns5RuleIds(V2)], [...ns5RuleIds(V1)]);
  assert.equal(
    ns5RuleRecord(V2).menorExigeResponsavel,
    V1.rules.find(rule => rule.ruleId === 'menorExigeResponsavel')?.description,
  );
});

void test('the order of the map is the order the rules were written in', () => {
  assert.deepEqual(ns5RuleEntries(V2).map(rule => rule.ruleId), V1.rules.map(rule => rule.ruleId));
});

// ---------------------------------------------------------------------------
// What rules40 writes
// ---------------------------------------------------------------------------

void test('a v2 catalog renders byte for byte to its rules.defs.ts', () => {
  const { rules, duplicateRuleIds } = normalizeNs5RulesPayload({ rules: V1.rules });
  const gate = validateNs5Rules(rules, { moduleName: 'agendaClinica', duplicateRuleIds });
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const rendered = renderDefsSource(
    { project: 102047, level: 4, folder: 'agendaClinica', shortName: 'rules', extension: '.defs.ts' },
    'agendaClinicaRulesV2',
    buildNs5RulesArtifactV2('agendaClinica', rules),
    'Ns5RulesArtifactV2',
  );
  assert.equal(
    rendered,
    loadNs5FixtureText('steps/rules40/fixtures', 'agendaClinica-rules-v2.defs.ts'),
  );
});

// ---------------------------------------------------------------------------
// finalize80 I4 over a v2 catalog
// ---------------------------------------------------------------------------

void test('I4 resolves cited ruleRefs against a v2 catalog exactly as against a v1 one', () => {
  const modules = ns5ReplayModules();
  assert.ok(modules.length >= 11, `expected the recorded cohort, measured ${modules.length}`);
  let citing = 0;
  for (const moduleName of modules) {
    const sources = loadNs5OracleSources(moduleName);
    const v1Report = runNs5Oracle(sources);
    const v2Report = runNs5Oracle({ ...sources, rules: asNs5RulesV2(loadNs5Rules(moduleName)) });
    assert.deepEqual(
      [...v2Report.errors, ...v2Report.warnings].map(issue => `${issue.code} ${issue.path} ${issue.message}`),
      [...v1Report.errors, ...v1Report.warnings].map(issue => `${issue.code} ${issue.path} ${issue.message}`),
      `${moduleName}: the form of the catalog changed the verdict`,
    );
    assert.equal(v2Report.counts.rules, v1Report.counts.rules, moduleName);
    // Measured, not implied by the comparison above: an id set that came back empty would fail BOTH
    // reports the same way and the deepEqual would still pass (probed).
    assert.deepEqual(v2Report.errors.filter(issue => issue.checkId === 'I4'), [], moduleName);
    if (sources.entities.some(entity => entity.transitions.some(transition => (transition.ruleRefs || []).length))) {
      citing += 1;
    }
  }
  assert.ok(citing > 0, 'no recorded module cites a rule: I4 would be proved by nothing');
});

void test('I4 still fails on a rule nobody wrote, whichever form the catalog is in', () => {
  const moduleName = ns5ReplayModules().find(name => {
    const sources = loadNs5OracleSources(name);
    return sources.entities.some(entity => entity.transitions.some(transition => (transition.ruleRefs || []).length));
  });
  assert.ok(moduleName, 'expected a recorded module citing a rule');
  const sources = loadNs5OracleSources(moduleName);
  const short = { ...asNs5RulesV2(loadNs5Rules(moduleName)), rules: {} };
  const report = runNs5Oracle({ ...sources, rules: short });
  assert.ok(report.errors.some(issue => issue.checkId === 'I4'), 'I4 did not fire on an empty v2 catalog');
});
