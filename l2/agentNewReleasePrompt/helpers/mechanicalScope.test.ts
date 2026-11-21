/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/mechanicalScope.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { applyNrpMechanical, nrpFreeTextHits, nrpFieldTerms } from '/_102035_/l2/agentNewReleasePrompt/helpers/mechanical.js';
import { nrpPendingTextMarks } from '/_102035_/l2/agentNewReleasePrompt/steps/write50/write50.js';
import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/contracts.js';

function module(): NrpModuleArtifacts {
  return {
    entities: [
      { entityId: 'AgentBehavior', displayField: 'summary', fields: [{ fieldId: 'summary' }, { fieldId: 'role' }], description: 'The summary of how the agent behaves.' },
      { entityId: 'ExecutionSummary', displayField: 'summary', fields: [{ fieldId: 'summary' }], description: 'A summary of one run.' },
    ],
    journeys: [{
      journeyId: 'changeAgentBehavior',
      business: { steps: [
        { stepId: 'readBehavior', entity: 'AgentBehavior', description: 'Shows the summary and the role.' },
        { stepId: 'readRun', entity: 'ExecutionSummary', description: 'Shows the summary of the run.' },
      ] },
    }],
    rules: { rules: [
      { ruleId: 'a', description: 'AgentBehavior.summary is optional.' },
      { ruleId: 'b', description: 'The summary of the history is kept for a week.' },
      { ruleId: 'c', description: 'The AgentBehavior shows its summary first.' },
    ] },
    access: { grants: [
      { entity: 'AgentBehavior', fields: ['summary', 'role'] },
      { entity: 'ExecutionSummary', fields: ['summary'] },
    ] },
    integration: { operations: [
      { operationId: 'readAgent', entityRefs: ['AgentBehavior'], description: 'Reads the summary of the agent.' },
      { operationId: 'listRuns', entityRefs: ['ExecutionSummary'], description: 'Lists the summary of each run.' },
    ] },
  } as unknown as NrpModuleArtifacts;
}

test('removing AgentBehavior.summary marks only what belongs to AgentBehavior, not ExecutionSummary or other words', () => {
  const { artifacts, textMarks } = applyNrpMechanical(module(), [{ op: 'remove', targetId: 'AgentBehavior', fieldId: 'summary', value: '' }]);
  const marked = textMarks.map(mark => mark.text).sort();
  assert.deepEqual(marked, [
    'AgentBehavior.summary is optional.',
    'Reads the summary of the agent.',
    'Shows the summary and the role.',
    'The AgentBehavior shows its summary first.',
    'The summary of how the agent behaves.',
  ].sort());
  const entities = artifacts.entities as unknown as Array<{ entityId: string; displayField?: string; fields: Array<{ fieldId: string }> }>;
  const behavior = entities.find(entity => entity.entityId === 'AgentBehavior');
  const execution = entities.find(entity => entity.entityId === 'ExecutionSummary');
  assert.deepEqual(behavior?.fields.map(field => field.fieldId), ['role']);
  assert.equal(behavior?.displayField, undefined);
  assert.equal(execution?.displayField, 'summary', 'another entity keeps its own displayField');
  assert.deepEqual(execution?.fields.map(field => field.fieldId), ['summary']);
  const grants = (artifacts.access as unknown as { grants: Array<{ entity: string; fields: string[] }> }).grants;
  assert.deepEqual(grants.find(grant => grant.entity === 'AgentBehavior')?.fields, ['role']);
  assert.deepEqual(grants.find(grant => grant.entity === 'ExecutionSummary')?.fields, ['summary'], 'a grant of another entity keeps the field');
});

test('the bare name needs a scope and the qualified name counts anywhere', () => {
  const { terms, scope } = nrpFieldTerms('AgentBehavior', 'summary');
  assert.deepEqual(terms, ['summary', 'AgentBehavior.summary']);
  const other = { entityId: 'ExecutionSummary', description: 'The summary of a run, like AgentBehavior.summary.' };
  assert.equal(nrpFreeTextHits(other, terms, scope).length, 1);
  assert.equal(nrpFreeTextHits({ ...other, description: 'The summary of a run.' }, terms, scope).length, 0);
  assert.equal(nrpFreeTextHits({ ...other, description: 'The summary of a run.' }, terms).length, 1, 'no scope keeps the old reach');
});

test('the pending report applies the same scope', () => {
  const triage = {
    valid: true, reason: null, clarification: null, artifacts: ['ontology'], targets: ['AgentBehavior'],
    intent: 'Drop the summary.', mechanicalOnly: false, assumptions: [],
    mechanical: [{ op: 'remove' as const, targetId: 'AgentBehavior', fieldId: 'summary', value: '' }],
  };
  const pending = nrpPendingTextMarks(module(), triage);
  assert.equal(pending.some(row => row.text === 'The summary of the history is kept for a week.'), false);
  assert.equal(pending.some(row => row.text === 'Shows the summary of the run.'), false);
  assert.equal(pending.some(row => row.text === 'Shows the summary and the role.'), true);
});
