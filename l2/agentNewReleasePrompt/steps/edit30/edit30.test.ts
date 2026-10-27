/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/edit30/edit30.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import { applyNrpMechanical, nrpModelKinds } from '/_102035_/l2/agentNewReleasePrompt/helpers/mechanical.js';
import {
  NRP_EDIT_SYSTEM_PROMPT,
  buildNrpEditHumanPrompt,
  buildNrpEditTool,
  normalizeNrpEdit,
  planNrpEditOrders,
} from '/_102035_/l2/agentNewReleasePrompt/steps/edit30/edit30.js';
import type { NrpTriage } from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function sample(): NrpModuleArtifacts {
  return {
    module: { moduleName: 'sample' },
    journeyIndex: { journeys: [{ journeyId: 'memberList' }] },
    journeys: [{
      journeyId: 'memberList',
      business: { title: 'List', actorRef: 'member', steps: [{ stepId: 'see', text: 'The member sees labels on the list.' }] },
    }],
    ontologyIndex: { entities: [{ entityId: 'WorkItem' }] },
    entities: [{
      entityId: 'WorkItem',
      title: 'Work item',
      description: '…itens marcáveis e etiquetas.',
      fields: [{ fieldId: 'priority', required: true }, { fieldId: 'labels', required: false }, { fieldId: 'etiquetas', required: false }],
      record: { fields: { priority: { type: 'enum', required: true }, labels: { type: 'string', required: false }, etiquetas: { type: 'string', required: false } } },
      transitions: [{ transitionId: 'cancel', from: ['open'], to: 'cancelled', by: ['member'] }],
    }],
    rules: { rules: [{ ruleId: 'whoCancels', description: 'A member may cancel.' }] },
    workflows: { processes: [] },
    access: { grants: [{ grantId: 'seeOwn', entityRefs: ['WorkItem', 'labels'] }] },
    integration: { inbound: [], outbound: [] },
  } as unknown as NrpModuleArtifacts;
}

const triage: NrpTriage = {
  valid: true,
  reason: null,
  clarification: null,
  artifacts: ['ontology', 'rules'],
  targets: ['WorkItem', 'priority'],
  intent: 'Priority becomes optional and a default rule is added.',
  mechanical: [{ op: 'setOptional', targetId: 'WorkItem', fieldId: 'priority', value: '' }],
};

void test('edit schema is strict and the prompt names no sample module', () => {
  const tool = buildNrpEditTool();
  assert.equal(tool.function.name, 'submitNrpEdit');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
  assert.equal(/tarefas/i.test(NRP_EDIT_SYSTEM_PROMPT), false);
  const human = buildNrpEditHumanPrompt('Add a rule.', triage, 'rules', { rules: [] });
  assert.match(human, /Kind: rules/);
  assert.match(human, /Add a rule\./);
});

void test('a recorded edit response is the whole artifact', () => {
  const recorded = JSON.parse(readFileSync(path.join(HERE, 'fixtures/recorded.json'), 'utf8')) as { rulesReplace: unknown };
  const artifact = normalizeNrpEdit('rules', recorded.rulesReplace) as { rules: Array<{ ruleId: string }> };
  assert.equal(artifact.rules[0].ruleId, 'defaultPriority');
  assert.throws(() => normalizeNrpEdit('rules', { artifactJson: '{"journeys":[]}' }), /wrong shape/);
});

void test('mechanical marks change the artifact and leave the other kind to the model', () => {
  const artifacts = sample();
  const edited = applyNrpMechanical(artifacts, [
    { op: 'setOptional', targetId: 'WorkItem', fieldId: 'priority', value: '' },
    { op: 'setRequired', targetId: 'WorkItem', fieldId: 'labels', value: '' },
    { op: 'setScalar', targetId: 'WorkItem', fieldId: 'title', value: 'Task' },
    { op: 'remove', targetId: 'labels', value: '', fieldId: '' },
  ]).artifacts;
  const entity = edited.entities[0] as unknown as {
    title: string;
    description: string;
    fields: Array<{ fieldId: string; required: boolean }>;
    record: { fields: Record<string, { required: boolean }> };
  };
  assert.equal(entity.title, 'Task');
  assert.equal(entity.description, '…itens marcáveis e etiquetas.');
  assert.equal(entity.fields.find(field => field.fieldId === 'priority')?.required, false);
  assert.equal(entity.fields.some(field => field.fieldId === 'labels'), false);
  assert.equal(entity.record.fields.priority.required, false);
  assert.equal(entity.record.fields.labels, undefined);
  const journey = edited.journeys[0] as unknown as { business: { steps: Array<{ text: string }> } };
  assert.equal(journey.business.steps[0].text, 'The member sees labels on the list.');
  const grant = edited.access.grants[0] as unknown as { entityRefs: string[] };
  assert.deepEqual(grant.entityRefs, ['WorkItem']);
  assert.deepEqual(nrpModelKinds(artifacts, triage.mechanical, triage.artifacts), ['rules']);
  const orders = planNrpEditOrders(artifacts, triage);
  assert.deepEqual(orders.map(order => order.mode), ['apply', 'model']);
  assert.equal(orders[1].kind, 'rules');
  assert.throws(() => applyNrpMechanical(artifacts, [{ op: 'setOptional', targetId: 'WorkItem', fieldId: 'missing', value: '' }]), /not found/);
});

void test('remove leaves a free-text citation intact and sends that kind back to the model', () => {
  const artifacts = sample();
  const phrase = '…itens marcáveis e etiquetas.';
  const removed = applyNrpMechanical(artifacts, [{ op: 'remove', targetId: 'etiquetas', value: '', fieldId: '' }]);
  const entity = removed.artifacts.entities[0] as unknown as {
    description: string;
    fields: Array<{ fieldId: string }>;
    record: { fields: Record<string, unknown> };
  };
  assert.equal(entity.description, phrase);
  assert.equal(entity.fields.some(field => field.fieldId === 'etiquetas'), false);
  assert.equal(entity.record.fields.etiquetas, undefined);
  const mark = removed.textMarks.find(item => item.text === phrase);
  assert.equal(mark?.kind, 'ontology');
  assert.equal(mark?.item, 'etiquetas');
  assert.equal(mark?.path.includes('description'), true);
  const prompt = buildNrpEditHumanPrompt('Drop labels.', {
    ...triage,
    artifacts: ['ontology'],
    mechanical: [{ op: 'remove', targetId: 'etiquetas', value: '', fieldId: '' }],
  }, 'ontology', { entities: [] }, removed.textMarks);
  assert.match(prompt, /does not cite etiquetas/);
  assert.equal(/tarefas/i.test(prompt), false);
  const orders = planNrpEditOrders(artifacts, {
    ...triage,
    artifacts: ['ontology'],
    mechanical: [{ op: 'remove', targetId: 'etiquetas', value: '', fieldId: '' }],
  });
  assert.deepEqual(orders.map(order => `${order.mode}:${order.kind}`), ['apply:null', 'model:ontology']);
});
