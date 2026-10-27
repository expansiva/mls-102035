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
  nextNrpEditAfterRefusal,
  assertFile,
  normalizeNrpEdit,
  nrpFileScope,
  planNrpEditOrders,
  type NrpEditCursor,
  type NrpFileScope,
} from '/_102035_/l2/agentNewReleasePrompt/steps/edit30/edit30.js';
import { checkNrpGates, classifyNrpGateIssues, nrpFreshIssues, overlayNrpEdits } from '/_102035_/l2/agentNewReleasePrompt/helpers/releaseGate.js';
import { recordNrpTriageRefusal } from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';
import { pipelineJsonFileForProject } from '/_102035_/l2/solution/fs.js';
import type { Ns5FileInfo } from '/_102035_/l2/solution/types.js';
import { extractNs4ClassicJsonObject } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import { ns5OntologyEntityIds, type Ns5OntologyAnyIndex } from '/_102035_/l2/solution/ontologyView.js';
import type {
  Ns5AccessArtifact,
  Ns5IntegrationArtifact,
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleArtifact,
  Ns5OntologyAnyEntity,
  Ns5RulesAny,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';
import { NRP_ARTIFACT_KINDS, type NrpTriage } from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';

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
  mechanicalOnly: true,
};

void test('edit schema is strict and the prompt names no sample module', () => {
  const tool = buildNrpEditTool();
  assert.equal(tool.function.name, 'submitNrpEdit');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
  assert.equal(/tarefas/i.test(NRP_EDIT_SYSTEM_PROMPT), false);
  const human = buildNrpEditHumanPrompt('Add a rule.', triage, 'rules', [{ id: 'rules', artifact: { rules: [] } }]);
  assert.match(human, /Kind: rules/);
  assert.match(human, /Add a rule\./);
});

void test('a recorded edit response applies one operation to the current file', () => {
  const recorded = JSON.parse(readFileSync(path.join(HERE, 'fixtures/recorded.json'), 'utf8')) as { rulesAdd: unknown };
  const scope: NrpFileScope = {
    present: ['rules'],
    creates: [],
    files: [{ id: 'rules', artifact: { schemaVersion: 'recorded', moduleName: 'sample', rules: [] } }],
  };
  const edited = normalizeNrpEdit('rules', recorded.rulesAdd, scope);
  const artifact = edited.files[0].artifact as { rules: Array<{ ruleId: string }> };
  assert.equal(edited.files[0].id, 'rules');
  assert.equal(artifact.rules[0].ruleId, 'defaultPriority');
  assert.throws(() => normalizeNrpEdit('rules', { artifactJson: '{"rules":[]}' }, scope), /list operations/);
  assert.throws(() => normalizeNrpEdit('rules', {
    operations: [{ file: 'rules', op: 'set', pointer: '/rules', expectedJson: '[]', valueJson: '{"journeys":[]}', reason: 'bad' }],
  }, scope), /wrong shape/);
  assert.throws(() => normalizeNrpEdit('ontology', {
    operations: [{ file: 'NewThing', op: 'set', pointer: '/title', expectedJson: '"x"', valueJson: '"y"', reason: 'no' }],
  }, { present: ['WorkItem'], creates: [], files: [{ id: 'WorkItem', artifact: { entityId: 'WorkItem', title: 'x' } }] }), /not a target/);
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
  const keepOntology = planNrpEditOrders(artifacts, { ...triage, mechanicalOnly: false });
  assert.deepEqual(keepOntology.map(order => `${order.mode}:${order.kind}`), ['apply:null', 'model:ontology', 'model:rules']);
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
  }, 'ontology', [{ id: 'WorkItem', artifact: { entityId: 'WorkItem' } }], removed.textMarks);
  assert.match(prompt, /does not cite etiquetas/);
  assert.equal(/tarefas/i.test(prompt), false);
  const orders = planNrpEditOrders(artifacts, {
    ...triage,
    artifacts: ['ontology'],
    mechanical: [{ op: 'remove', targetId: 'etiquetas', value: '', fieldId: '' }],
  });
  assert.deepEqual(orders.map(order => `${order.mode}:${order.kind}`), ['apply:null', 'model:ontology']);
});

void test('an ontology edit prompt sends the target file, not the whole kind', () => {
  const fixture = path.join(HERE, '../../../solution/fixtures/finalize80/tarefas');
  const defs = <T>(name: string): T => JSON.parse(extractNs4ClassicJsonObject(readFileSync(path.join(fixture, name), 'utf8'))) as T;
  const ontologyIndex = defs<Ns5OntologyAnyIndex>('ontology/index.defs.ts');
  const entities = ns5OntologyEntityIds(ontologyIndex).map(entityId => defs<Ns5OntologyAnyEntity>(`ontology/${entityId}.defs.ts`));
  const artifacts = {
    ...sample(),
    ontologyIndex,
    entities,
  };
  const ask = { ...triage, artifacts: ['ontology'] as NrpTriage['artifacts'], targets: ['Tarefa', 'prioridade'], mechanical: [] };
  const scope = nrpFileScope(artifacts, 'ontology', ask);
  assert.deepEqual(scope.files.map(file => file.id), ['Tarefa']);
  const one = buildNrpEditHumanPrompt('Make priority optional.', ask, 'ontology', scope.files);
  const whole = buildNrpEditHumanPrompt('Make priority optional.', ask, 'ontology', [
    { id: 'index', artifact: ontologyIndex },
    ...entities.map(entity => ({ id: entity.entityId, artifact: entity })),
  ]);
  const oneBytes = new TextEncoder().encode(one).length;
  const wholeBytes = new TextEncoder().encode(whole).length;
  assert.equal(oneBytes, 2891);
  assert.equal(wholeBytes, 4103);
  assert.ok(oneBytes < wholeBytes);
  assert.equal(one.includes('Tarefa'), true);
  assert.equal(one.includes('"entityId":"Lista"') || one.includes('"entityId": "Lista"'), false);
});

function workItemScope(): NrpFileScope {
  const artifact = {
    schemaVersion: 'v',
    moduleName: 'sample',
    entityId: 'WorkItem',
    title: 'Work item',
    record: { fields: { details: { type: 'object', fields: { note: { type: 'text', title: 'Note' } } } } },
    tags: ['open'],
  };
  return { present: ['WorkItem'], creates: [], files: [{ id: 'WorkItem', artifact }] };
}

function op(partial: Record<string, string>): Record<string, string> {
  return { file: 'WorkItem', op: 'set', pointer: '/title', expectedJson: '"Work item"', valueJson: '"Task"', reason: 'rename', ...partial };
}

void test('operations set text, add a details field, append a list, and remove', () => {
  const scope = workItemScope();
  const set = normalizeNrpEdit('ontology', { operations: [op({})] }, scope);
  assert.equal((set.files[0].artifact as { title: string }).title, 'Task');
  const added = normalizeNrpEdit('ontology', {
    operations: [op({
      op: 'add',
      pointer: '/record/fields/details/fields/hours',
      expectedJson: '',
      valueJson: '{"type":"number","title":"Hours"}',
      reason: 'add hours',
    })],
  }, scope);
  const fields = (added.files[0].artifact as { record: { fields: { details: { fields: Record<string, { title: string }> } } } }).record.fields.details.fields;
  assert.equal(fields.hours.title, 'Hours');
  assert.equal(fields.note.title, 'Note');
  const listed = normalizeNrpEdit('ontology', {
    operations: [op({ op: 'add', pointer: '/tags/-', expectedJson: '', valueJson: '"closed"', reason: 'append' })],
  }, scope);
  assert.deepEqual((listed.files[0].artifact as { tags: string[] }).tags, ['open', 'closed']);
  const removed = normalizeNrpEdit('ontology', {
    operations: [op({
      op: 'remove',
      pointer: '/record/fields/details/fields/note',
      expectedJson: '{"type":"text","title":"Note"}',
      valueJson: '',
      reason: 'drop note',
    })],
  }, scope);
  const left = (removed.files[0].artifact as { record: { fields: { details: { fields: Record<string, unknown> } } } }).record.fields.details.fields;
  assert.equal(left.note, undefined);
});

void test('create adds a journey only when triage asked for it', () => {
  const created = normalizeNrpEdit('journeys', {
    operations: [{
      file: 'gestorCopia',
      op: 'create',
      pointer: '',
      expectedJson: '',
      valueJson: '{"journeyId":"gestorCopia","business":{"title":"Copy","actorRef":"gestor","steps":[]}}',
      reason: 'new journey',
    }],
  }, { present: [], creates: ['gestorCopia'], files: [] });
  assert.equal((created.files[0].artifact as { journeyId: string }).journeyId, 'gestorCopia');
  assert.throws(() => normalizeNrpEdit('ontology', {
    operations: [{ file: 'NewThing', op: 'create', pointer: '', expectedJson: '', valueJson: '{"entityId":"NewThing"}', reason: 'no' }],
  }, { present: [], creates: ['NewThing'], files: [] }), /only adds a journey/);
});

void test('a mismatched expectedJson and a missing pointer are refused and the mismatch is recorded', async () => {
  const scope = workItemScope();
  assert.throws(() => normalizeNrpEdit('ontology', {
    operations: [op({ expectedJson: '"Other"' })],
  }, scope), /expectedJson does not match/);
  assert.throws(() => normalizeNrpEdit('ontology', {
    operations: [op({ pointer: '/missing' })],
  }, scope), /does not exist/);
  let stored: unknown;
  const info = pipelineJsonFileForProject(1, 'sample', 'newReleasePrompt-refused');
  const citation = await recordNrpTriageRefusal(info, 'expectedJson does not match the current value at /title.', { operations: [] }, async (_file: Ns5FileInfo, value: unknown) => {
    stored = value;
  });
  assert.match(citation, /newReleasePrompt-refused\.json$/);
  assert.equal((stored as { reason: string }).reason.includes('expectedJson'), true);
});

void test('operation count and value size are refused', () => {
  const scope = workItemScope();
  const many = Array.from({ length: 41 }, () => op({}));
  assert.throws(() => normalizeNrpEdit('ontology', { operations: many }, scope), /40/);
  assert.throws(() => normalizeNrpEdit('ontology', {
    operations: [op({ valueJson: JSON.stringify('x'.repeat(6001)) })],
  }, scope), /6000/);
});

void test('a refused edit is retried once with the same request and the error', () => {
  const order: NrpEditCursor = { mode: 'model', kind: 'ontology', triage, rest: [], applied: [], attempts: 0, editErrors: [] };
  const again = nextNrpEditAfterRefusal(order, 'Pointer /missing does not exist.');
  assert.equal(again?.attempts, 1);
  const prompt = buildNrpEditHumanPrompt('Add hours.', triage, 'ontology', workItemScope().files, [], [], again?.editErrors || []);
  assert.match(prompt, /Add hours\./);
  assert.match(prompt, /Pointer \/missing does not exist/);
  assert.equal(nextNrpEditAfterRefusal(again || order, 'again'), null);
});

void test('the recorded hour-estimate operations apply to Tarefa and pass the gates', () => {
  const fixture = path.join(HERE, '../../../solution/fixtures/finalize80/tarefas');
  const defs = <T>(name: string): T => {
    const json = extractNs4ClassicJsonObject(readFileSync(path.join(fixture, name), 'utf8'));
    if (!json) throw new Error(`no JSON in ${name}`);
    return JSON.parse(json) as T;
  };
  const journeyIndex = defs<Ns5JourneyIndexArtifact>('journeys/index.defs.ts');
  const ontologyIndex = defs<Ns5OntologyAnyIndex>('ontology/index.defs.ts');
  const artifacts = {
    module: defs<Ns5ModuleArtifact>('module.defs.ts'),
    journeyIndex,
    journeys: journeyIndex.journeys.map(entry => defs<Ns5JourneyArtifact>(`journeys/${entry.journeyId}.defs.ts`)),
    ontologyIndex,
    entities: ns5OntologyEntityIds(ontologyIndex).map(entityId => defs<Ns5OntologyAnyEntity>(`ontology/${entityId}.defs.ts`)),
    rules: defs<Ns5RulesAny>('rules.defs.ts'),
    workflows: defs<Ns5WorkflowsArtifact>('workflows.defs.ts'),
    access: defs<Ns5AccessArtifact>('access.defs.ts'),
    integration: defs<Ns5IntegrationArtifact>('integration.defs.ts'),
  } as unknown as NrpModuleArtifacts;
  const ask = { ...triage, artifacts: ['ontology'] as NrpTriage['artifacts'], targets: ['Tarefa'], mechanical: [] };
  const scope = nrpFileScope(artifacts, 'ontology', ask);
  const recorded = JSON.parse(readFileSync(path.join(HERE, 'fixtures/recorded.json'), 'utf8')) as { tarefaHours: unknown };
  const edited = normalizeNrpEdit('ontology', recorded.tarefaHours, scope);
  assert.equal(edited.files.length, 1);
  assert.equal(edited.files[0].id, 'Tarefa');
  const merged = overlayNrpEdits(artifacts, [{ mode: 'model', kind: 'ontology', artifact: edited }]);
  const entity = merged.entities.find(item => item.entityId === 'Tarefa') as unknown as {
    record: { fields: { details: { fields: Record<string, { title: string }> } } };
  };
  assert.equal(entity.record.fields.details.fields.estimativaHoras.title, 'Estimativa de horas');
  const before = checkNrpGates(artifacts, ['ontology']);
  const after = classifyNrpGateIssues(before, checkNrpGates(merged, ['ontology']));
  assert.deepEqual(nrpFreshIssues(after), []);
});

void test('assertFile accepts every tarefas fixture file and a rules map', () => {
  const fixture = path.join(HERE, '../../../solution/fixtures/finalize80/tarefas');
  const defs = (name: string): unknown => JSON.parse(extractNs4ClassicJsonObject(readFileSync(path.join(fixture, name), 'utf8')));
  const files: Array<[Parameters<typeof assertFile>[0], string, string]> = [
    ['rules', 'rules', 'rules.defs.ts'],
    ['access', 'access', 'access.defs.ts'],
    ['workflows', 'workflows', 'workflows.defs.ts'],
    ['integration', 'integration', 'integration.defs.ts'],
    ['ontology', 'index', 'ontology/index.defs.ts'],
    ['ontology', 'Tarefa', 'ontology/Tarefa.defs.ts'],
    ['ontology', 'Lista', 'ontology/Lista.defs.ts'],
    ['journeys', 'index', 'journeys/index.defs.ts'],
  ];
  for (const journey of ['criarTarefa', 'executarTarefa', 'gerenciarTarefas', 'manterListas', 'manterTarefa', 'revisarTarefa']) {
    files.push(['journeys', journey, `journeys/${journey}.defs.ts`]);
  }
  for (const [kind, id, name] of files) assertFile(kind, id, defs(name));
  assertFile('rules', 'rules', {
    schemaVersion: '2026-09-10-ns5-rules-v2',
    moduleName: 'tarefas',
    rules: { edicaoNaoMudaSituacao: 'Editar não muda a situação.' },
  });
  assert.throws(() => assertFile('rules', 'rules', { rules: { edicaoNaoMudaSituacao: { description: 'no' } } }), /wrong shape/);
});

void test('remove of a details field keeps the entity and drops only that field', () => {
  const fixture = path.join(HERE, '../../../solution/fixtures/finalize80/tarefas');
  const defs = <T>(name: string): T => {
    const json = extractNs4ClassicJsonObject(readFileSync(path.join(fixture, name), 'utf8'));
    if (!json) throw new Error(`no JSON in ${name}`);
    return JSON.parse(json) as T;
  };
  const journeyIndex = defs<Ns5JourneyIndexArtifact>('journeys/index.defs.ts');
  const ontologyIndex = defs<Ns5OntologyAnyIndex>('ontology/index.defs.ts');
  const artifacts = {
    module: defs<Ns5ModuleArtifact>('module.defs.ts'),
    journeyIndex,
    journeys: journeyIndex.journeys.map(entry => defs<Ns5JourneyArtifact>(`journeys/${entry.journeyId}.defs.ts`)),
    ontologyIndex,
    entities: ns5OntologyEntityIds(ontologyIndex).map(entityId => defs<Ns5OntologyAnyEntity>(`ontology/${entityId}.defs.ts`)),
    rules: defs<Ns5RulesAny>('rules.defs.ts'),
    workflows: defs<Ns5WorkflowsArtifact>('workflows.defs.ts'),
    access: defs<Ns5AccessArtifact>('access.defs.ts'),
    integration: defs<Ns5IntegrationArtifact>('integration.defs.ts'),
  } as unknown as NrpModuleArtifacts;
  const baseline = checkNrpGates(artifacts, [...NRP_ARTIFACT_KINDS]);
  const entityRefs = (module: NrpModuleArtifacts) => module.journeys.reduce((count, journey) => {
    const steps = (journey as unknown as { business: { steps: Array<{ entity?: string }> } }).business.steps;
    return count + steps.filter(step => step.entity === 'Tarefa').length;
  }, 0);
  const refsBefore = entityRefs(artifacts);
  const seeded = JSON.parse(JSON.stringify(artifacts)) as NrpModuleArtifacts;
  const tarefa = seeded.entities.find(entity => entity.entityId === 'Tarefa') as unknown as {
    description: string;
    rules: string[];
    record: { fields: { details: { fields: Record<string, unknown> } } };
  };
  tarefa.record.fields.details.fields.etiquetas = { type: 'text', title: 'Etiquetas' };
  tarefa.rules.push('details.etiquetas', 'Tarefa.details.etiquetas');
  tarefa.description = `${tarefa.description} O campo details.etiquetas sai.`;
  const removed = applyNrpMechanical(seeded, [{ op: 'remove', targetId: 'Tarefa', fieldId: 'details.etiquetas', value: '' }]);
  const entity = removed.artifacts.entities.find(item => item.entityId === 'Tarefa') as unknown as {
    entityId: string;
    description: string;
    rules: string[];
    record: { fields: { details: { fields: Record<string, unknown> } } };
  };
  assert.equal(entity.entityId, 'Tarefa');
  assert.equal(entity.record.fields.details.fields.etiquetas, undefined);
  assert.equal(entity.record.fields.details.fields.descricao !== undefined, true);
  assert.deepEqual(entity.rules, []);
  assert.match(entity.description, /details\.etiquetas/);
  assert.equal(removed.textMarks.some(mark => mark.item === 'details.etiquetas' && mark.kind === 'ontology'), true);
  const cited = JSON.parse(JSON.stringify(seeded)) as NrpModuleArtifacts;
  const citedEntity = cited.entities.find(item => item.entityId === 'Tarefa') as unknown as {
    record: { fields: { details: { fields: Record<string, unknown> } } };
  };
  citedEntity.record.fields.details.fields.etiquetas = { type: 'text', title: 'Etiquetas' };
  const citedJourney = cited.journeys.find(item => item.journeyId === 'criarTarefa') as unknown as {
    business: { steps: Array<{ description: string }> };
  };
  citedJourney.business.steps[0].description = 'Grava a tarefa com etiquetas.';
  (cited.rules as { rules: Record<string, string> }).rules = {
    edicaoNaoMudaSituacao: 'A edição não mexe em etiquetas.',
    outra: 'etiquetario permanece.',
  };
  const marked = applyNrpMechanical(cited, [{ op: 'remove', targetId: 'Tarefa', fieldId: 'details.etiquetas', value: '' }]);
  assert.equal(marked.textMarks.some(mark => mark.kind === 'journeys' && mark.item === 'etiquetas' && mark.text.includes('etiquetas')), true);
  assert.equal(marked.textMarks.some(mark => mark.kind === 'rules' && mark.text.includes('edicao') === false && mark.item === 'etiquetas'), true);
  assert.equal(marked.textMarks.some(mark => mark.text.includes('etiquetario')), false);
  const orders = planNrpEditOrders(cited, {
    valid: true, reason: null, clarification: null, artifacts: ['ontology'], targets: ['Tarefa'],
    intent: 'Drop labels.', mechanicalOnly: true,
    mechanical: [{ op: 'remove', targetId: 'Tarefa', fieldId: 'details.etiquetas', value: '' }],
  });
  assert.equal(orders.some(order => order.mode === 'model' && order.kind === 'journeys'), true);
  assert.equal(orders.some(order => order.mode === 'model' && order.kind === 'rules'), true);
  assert.equal(entityRefs(removed.artifacts), refsBefore);
  const after = classifyNrpGateIssues(baseline, checkNrpGates(removed.artifacts, [...NRP_ARTIFACT_KINDS]));
  assert.deepEqual(nrpFreshIssues(after), []);
  assert.throws(
    () => applyNrpMechanical(artifacts, [{ op: 'remove', targetId: 'Tarefa', fieldId: '', value: '' }]),
    /not a mechanical mark/,
  );
  const withRule = {
    ...artifacts,
    rules: { schemaVersion: '2026-09-10-ns5-rules-v1', moduleName: 'tarefas', rules: { edicaoNaoMudaSituacao: 'Editar não muda a situação.' } },
  } as unknown as NrpModuleArtifacts;
  const dropped = applyNrpMechanical(withRule, [{ op: 'remove', targetId: 'edicaoNaoMudaSituacao', fieldId: '', value: '' }]);
  assert.equal(Object.prototype.hasOwnProperty.call((dropped.artifacts.rules as { rules: Record<string, string> }).rules, 'edicaoNaoMudaSituacao'), false);
  assert.equal(dropped.artifacts.entities.some(item => item.entityId === 'Tarefa'), true);
});
