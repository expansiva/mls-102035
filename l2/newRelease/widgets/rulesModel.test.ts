/// <mls fileReference="_102035_/l2/newRelease/widgets/rulesModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Ns5JourneyArtifact, Ns5OntologyEntityArtifact, Ns5RulesArtifact } from '../../solution/types.js';
import {
  citationsForRule,
  collectRuleCitations,
  filterRules,
  groupRulesByEntity,
  isValidNewRuleId,
  readRulesV2,
  editRulesV2Text,
} from './rulesModel.js';

test('reads v2 rule map for display without claiming it is editable v1', () => {
  assert.deepEqual(readRulesV2({ schemaVersion: '2026-09-16-ns5-rules-v2', rules: { approvalRequired: 'Approval is required.' } }), [
    { ruleId: 'approvalRequired', description: 'Approval is required.' },
  ]);
  assert.equal(readRulesV2(rules), null);
  assert.equal(readRulesV2({ schemaVersion: '2026-09-16-ns5-rules-v2', rules: { broken: 42 } }), null);
});

const rules: Ns5RulesArtifact = {
  schemaVersion: '2026-09-10-ns5-rules-v1',
  moduleName: 'orders',
  rules: [
    { ruleId: 'approvalRequired', description: 'Approval is required.' },
    { ruleId: 'orphanRule', description: 'A rule without references.' },
  ],
};

const entity: Ns5OntologyEntityArtifact = {
  schemaVersion: 3,
  moduleName: 'orders', entityId: 'Order', title: 'Order', description: 'Order.', kind: 'core', party: 'none',
  displayField: 'status', fields: [{ fieldId: 'status', title: 'Status', type: 'string', required: true, description: 'Status.' }],
  details: { audit: { type: 'text', description: 'Calculated with approvalRequired when applicable.' } },
  lifecycleStates: [{ state: 'open', reachedBy: 'actor' }, { state: 'approved', reachedBy: 'actor' }],
  transitions: [{
    transitionId: 'approve', from: ['open'], to: 'approved', by: ['manager'], description: 'Approve order.',
    ruleRefs: ['approvalRequired'],
  }],
  storage: { target: 'moduleDatabase', scope: 'orders', idField: 'id' },
};

const journey: Ns5JourneyArtifact = {
  schemaVersion: 3,
  journeyId: 'approveOrder',
  business: {
    actorRef: 'manager', title: 'Approve', goal: 'Approve the order.', entry: { mode: 'contextOrLookup' },
    steps: [{ stepId: 'approve', kind: 'act', entity: 'Order', effect: 'transition', transitionRef: 'approve', title: 'Approve', description: 'Approved.' }],
    outcome: { statement: 'Order approved.', evidence: ['Approved status.'] },
  },
  businessHash: 'sha256:test',
};

test('collects structural, detail and indirect journey citations', () => {
  const citations = collectRuleCitations(rules.rules, [entity], [journey]);
  assert.deepEqual(citationsForRule(citations, 'approvalRequired').map(item => item.kind), ['transition', 'detail', 'journey']);
  assert.equal(citationsForRule(citations, 'orphanRule').length, 0);
});

test('groups cited rules by entity and keeps orphan rules separate', () => {
  const citations = collectRuleCitations(rules.rules, [entity], [journey]);
  const groups = groupRulesByEntity(rules.rules, citations);
  assert.deepEqual(groups.map(group => [group.entityId, group.rules.map(rule => rule.ruleId)]), [
    ['Order', ['approvalRequired']],
    [null, ['orphanRule']],
  ]);
});

test('search includes citation labels and new ids must be lowerCamel and unique', () => {
  const citations = collectRuleCitations(rules.rules, [entity], [journey]);
  assert.deepEqual(filterRules(rules.rules, citations, 'Order.approve').map(rule => rule.ruleId), ['approvalRequired']);
  assert.equal(isValidNewRuleId(rules, 'newRule'), true);
  assert.equal(isValidNewRuleId(rules, 'NewRule'), false);
  assert.equal(isValidNewRuleId(rules, 'approvalRequired'), false);
});


test('v2 text edit preserves ids, other statements and metadata without mutating source', () => {
  const source = {
    schemaVersion: '2026-09-16-ns5-rules-v2' as const, moduleName: 'orders',
    metadata: { owner: 'manager', references: ['approvalRequired'] },
    rules: { approvalRequired: 'Approval required.', stockRequired: 'Stock required.', paymentRequired: 'Payment required.' },
  };
  const original = structuredClone(source);
  const edited = editRulesV2Text(source, 'approvalRequired', 'Manager approval is required.');
  assert.deepEqual(edited, { ...original, rules: { ...original.rules, approvalRequired: 'Manager approval is required.' } });
  assert.deepEqual(source, original);
  assert.deepEqual(Object.keys(edited!.rules), Object.keys(source.rules));
  assert.equal(editRulesV2Text(source, 'unknownRule', 'New text.'), null);
  assert.equal(editRulesV2Text(source, 'approvalRequired', '  '), null);
  assert.deepEqual(source, original);
});
