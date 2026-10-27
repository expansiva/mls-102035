/// <mls fileReference="_102035_/l2/newRelease/widgets/rulesModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Ns5JourneyArtifact, Ns5OntologyEntityArtifact, Ns5RulesArtifact } from '../../solution/types.js';
import {
  patchRuleText, humanizeRuleKey, ontologyRuleCitations, rulePresentationGroups, ruleEntityIds,
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


test('ontology groups use only explicit bindings, deduplicate membership and sort presentation labels', () => {
  const shared = {ruleId: 'cancelarApenasCriadorOuGestor', description: 'Only owner or manager.'};
  const list = [...rules.rules, shared];
  const first = {...entity, entityId: 'Z', title: 'Alpha', rules: [shared.ruleId, shared.ruleId]};
  const second = {...entity, entityId: 'A', title: 'Zulu', transitions: [], rules: [shared.ruleId]};
  const before = structuredClone([first, second]);
  const citations = ontologyRuleCitations(list, [first, second]);
  assert.equal(citationsForRule(citations, 'approvalRequired').length, 1);
  assert.equal(citationsForRule(citations, 'orphanRule').length, 0);
  assert.deepEqual(ruleEntityIds(citations, shared.ruleId), ['A', 'Z']);
  const groups = rulePresentationGroups(list, citations, [first, second], 'Unreferenced');
  assert.deepEqual(groups.map(group => group.title), ['Alpha', 'Unreferenced', 'Zulu']);
  assert.deepEqual(groups[0].rules.map(rule => rule.ruleId), ['approvalRequired', shared.ruleId]);
  assert.equal(humanizeRuleKey(shared.ruleId), 'Cancelar apenas criador ou gestor');
  assert.deepEqual([first, second], before);
});

test('v3 ontology without transitions accepts entity bindings and excludes unknown rules', () => {
  const v3: import('../../solution/types.js').Ns5OntologyEntityV3 = {
    schemaVersion: '2026-09-15-ns5-ontology-v3', moduleName: 'orders', entityId: 'Customer', title: 'Customer', description: '',
    kind: 'role', subtype: 'Person', source: '/platform', roleTag: 'orders.Customer', displayField: 'id',
    record: {fields: {id: {type: 'uuid'}}}, relationships: {}, capabilities: {}, rules: ['approvalRequired', 'externalRule'],
  };
  assert.deepEqual(ontologyRuleCitations(rules.rules, [v3]).map(citation => citation.ruleId), ['approvalRequired']);
});


test('value-only updates preserve both artifact forms and refuse unknown keys', () => {
  const map = {schemaVersion: '2026-09-16-ns5-rules-v2' as const, moduleName: 'orders', rules: {approvalRequired: 'Before', orphanRule: 'Other'}, metadata: {preserve: true}};
  for (const artifact of [rules, map]) {
    const before = structuredClone(artifact);
    const result = patchRuleText(artifact, 'approvalRequired', 'After');
    assert.deepEqual(patchRuleText(artifact, 'unknown', 'Invalid insertion'), before);
    assert.equal(result.schemaVersion, artifact.schemaVersion);
    assert.deepEqual(artifact, before);
    if (Array.isArray(result.rules)) {
      assert.equal(result.rules[0].description, 'After');
      assert.deepEqual(result.rules[1], rules.rules[1]);
    } else assert.deepEqual(result.rules, {approvalRequired: 'After', orphanRule: 'Other'});
  }
});
