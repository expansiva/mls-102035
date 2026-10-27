/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/write50/write50.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractNs4ClassicJsonObject } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import { changedNrpPaths, defsSourceFromSibling, nrpDefsRoundTripError, nrpPendingTextMarks, nrpReport, replaceDefsJsonLiteral } from '/_102035_/l2/agentNewReleasePrompt/steps/write50/write50.js';

const TAREFA = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../solution/fixtures/finalize80/tarefas/ontology/Tarefa.defs.ts',
);

void test('a field change rewrites one defs file and only that field line', () => {
  const source = readFileSync(TAREFA, 'utf8');
  const entity = JSON.parse(extractNs4ClassicJsonObject(source)) as {
    entityId: string;
    record: { fields: { prioridade: { required: boolean } } };
  };
  const before = { entities: [entity], ontologyIndex: { entities: [{ entityId: 'Tarefa' }] } } as unknown as NrpModuleArtifacts;
  const nextEntity = JSON.parse(JSON.stringify(entity)) as typeof entity;
  nextEntity.record.fields.prioridade.required = false;
  const after = { entities: [nextEntity], ontologyIndex: before.ontologyIndex } as unknown as NrpModuleArtifacts;
  assert.deepEqual(changedNrpPaths(before, after), ['ontology/Tarefa.defs.ts']);
  const patched = replaceDefsJsonLiteral(source, nextEntity);
  assert.match(patched, /fileReference="_102035_\/l2\/solution\/fixtures\/finalize80\/tarefas\/ontology\/Tarefa\.defs\.ts"/);
  assert.match(patched, /export const tarefasEntityTarefa/);
  const beforeLines = source.split('\n');
  const afterLines = patched.split('\n');
  const changed = afterLines.filter((line, index) => line !== beforeLines[index]);
  assert.deepEqual(changed, ['        "required": false,']);
  const report = nrpReport({
    moduleName: 'tarefas', project: 1, request: 'Make priority optional.',
    triage: { valid: true, reason: null, clarification: null, artifacts: ['ontology'], targets: ['Tarefa'], intent: 'Optional.', mechanical: [], mechanicalOnly: false },
    artifacts: after, applied: [], issues: [], allowWrite: true, modelCalls: 2,
  }, { written: true, reason: null, files: ['ontology/Tarefa.defs.ts'] });
  assert.equal(report.calls, 2);
  assert.equal(report.costUsd, null);
  const checks = report.checks as Array<{ kind: string; result: string }>;
  assert.equal(checks.some(row => row.kind === 'rules' && row.result === 'passed'), true);
  assert.equal(nrpDefsRoundTripError(patched, nextEntity), null);
});

void test('rewritten defs text matches the gated value for remove, replace and a new file', () => {
  const source = readFileSync(TAREFA, 'utf8');
  const entity = JSON.parse(extractNs4ClassicJsonObject(source)) as {
    record: { fields: { details: { fields: Record<string, unknown> }; prioridade: { values: unknown[] } } };
    lifecycleStates: unknown[];
  };
  const droppedField = JSON.parse(JSON.stringify(entity)) as typeof entity;
  delete droppedField.record.fields.details.fields.checklist;
  const fieldText = replaceDefsJsonLiteral(source, droppedField);
  assert.equal(fieldText.includes('undefined'), false);
  assert.equal(fieldText.includes('"checklist"'), false);
  assert.equal(nrpDefsRoundTripError(fieldText, droppedField), null);

  const droppedItem = JSON.parse(JSON.stringify(entity)) as typeof entity;
  droppedItem.lifecycleStates = droppedItem.lifecycleStates.slice(1);
  const listText = replaceDefsJsonLiteral(source, droppedItem);
  assert.equal(nrpDefsRoundTripError(listText, droppedItem), null);

  const changed = JSON.parse(JSON.stringify(entity)) as typeof entity;
  changed.record.fields.prioridade.values = changed.record.fields.prioridade.values.slice(0, 2);
  const valueText = replaceDefsJsonLiteral(source, changed);
  assert.equal(nrpDefsRoundTripError(valueText, changed), null);

  const created = defsSourceFromSibling(source, 'Tarefa', 'Nota', { ...droppedField, entityId: 'Nota' });
  assert.equal(nrpDefsRoundTripError(created, { ...droppedField, entityId: 'Nota' }), null);

  const report = nrpReport({
    moduleName: 'tarefas', project: 1, request: 'Drop labels.',
    triage: {
      valid: true, reason: null, clarification: null, artifacts: ['ontology'], targets: ['Tarefa'],
      intent: 'Remove the field.', mechanicalOnly: true,
      mechanical: [{ op: 'remove', targetId: 'Tarefa', fieldId: 'details.etiquetas', value: '' }],
    },
    artifacts: {
      module: { sourcePrompt: 'As tarefas usam etiquetas no detalhe.' },
    } as unknown as NrpModuleArtifacts,
    applied: [], issues: [], allowWrite: true, modelCalls: 1,
  }, { written: true, reason: null, files: [] });
  const notEdited = report.notEdited as Array<{ kind: string; term: string; note: string }>;
  assert.equal(notEdited.length, 1);
  assert.equal(notEdited[0].kind, 'module');
  assert.equal(notEdited[0].term, 'etiquetas');
  assert.equal(notEdited[0].note, 'não editado');
});

void test('removing a details field touches only that field line, and a leftover citation is pending', () => {
  const source = readFileSync(TAREFA, 'utf8');
  const needle = '          "descricao": { "type": "text", "title": "Descrição" },\n';
  const planted = source.replace(needle, `${needle}          "etiquetas": { "type": "text", "title": "Etiquetas" },\n`);
  const entity = JSON.parse(extractNs4ClassicJsonObject(planted)) as {
    record: { fields: { details: { fields: Record<string, unknown> } } };
    lifecycleStates: Array<{ state: string }>;
  };
  delete entity.record.fields.details.fields.etiquetas;
  const patched = replaceDefsJsonLiteral(planted, entity);
  assert.equal(patched, planted.replace('          "etiquetas": { "type": "text", "title": "Etiquetas" },\n', ''));
  assert.equal(nrpDefsRoundTripError(patched, entity), null);

  const droppedState = JSON.parse(JSON.stringify(entity)) as typeof entity;
  droppedState.lifecycleStates = droppedState.lifecycleStates.filter(state => state.state !== 'emAndamento');
  const listText = replaceDefsJsonLiteral(patched, droppedState);
  assert.match(listText, /"state": "aFazer"/);
  assert.match(listText, /"state": "emRevisao"/);
  assert.equal(listText.includes('"state": "emAndamento"'), false);
  assert.equal(listText.includes('{"state":"aFazer"'), false);
  assert.equal(nrpDefsRoundTripError(listText, droppedState), null);

  const pending = nrpPendingTextMarks({
    entities: [],
    journeys: [{ journeyId: 'criarTarefa', business: { steps: [{ description: 'Grava a tarefa com etiquetas.' }] } }],
  } as unknown as NrpModuleArtifacts, {
    valid: true, reason: null, clarification: null, artifacts: ['ontology', 'journeys'], targets: ['Tarefa'],
    intent: 'Drop labels.', mechanicalOnly: false,
    mechanical: [{ op: 'remove', targetId: 'Tarefa', fieldId: 'details.etiquetas', value: '' }],
  });
  assert.equal(pending.length, 1);
  assert.equal(pending[0].file, 'criarTarefa');
  assert.equal(pending[0].term, 'etiquetas');
  const report = nrpReport({
    moduleName: 'tarefas', project: 1, request: 'Drop labels.',
    triage: {
      valid: true, reason: null, clarification: null, artifacts: ['journeys'], targets: ['Tarefa'],
      intent: 'Drop labels.', mechanicalOnly: false,
      mechanical: [{ op: 'remove', targetId: 'Tarefa', fieldId: 'details.etiquetas', value: '' }],
    },
    artifacts: {
      journeys: [{ journeyId: 'criarTarefa', business: { steps: [{ description: 'Grava a tarefa com etiquetas.' }] } }],
    } as unknown as NrpModuleArtifacts,
    applied: [{ mode: 'model', kind: 'journeys', artifact: { files: [] } }],
    issues: [], allowWrite: true, modelCalls: 2,
  }, { written: true, reason: null, files: [] });
  assert.equal((report.pendingTextMarks as unknown[]).length, 1);
});

void test('an add keeps the rest of the file and the report names every written kind once', () => {
  const source = readFileSync(TAREFA, 'utf8');
  const entity = JSON.parse(extractNs4ClassicJsonObject(source)) as {
    record: { fields: { prioridade: { values: Array<{ value: string; title: string }>; default?: string } } };
  };
  const withValue = JSON.parse(JSON.stringify(entity)) as typeof entity;
  withValue.record.fields.prioridade.values.push({ value: 'urgente', title: 'Urgente' });
  const valueText = replaceDefsJsonLiteral(source, withValue);
  assert.equal(
    valueText.replace(
      /,\n          \{\n            "value": "urgente",\n            "title": "Urgente"\n          \}/u,
      '',
    ),
    source,
  );
  const valueSpan = changedSpan(source, valueText);
  assert.equal(valueSpan.length >= 4 && valueSpan.length <= 6, true);
  assert.equal(nrpDefsRoundTripError(valueText, withValue), null);

  const withDefault = JSON.parse(JSON.stringify(entity)) as typeof entity;
  withDefault.record.fields.prioridade.default = 'media';
  const defaultText = replaceDefsJsonLiteral(source, withDefault);
  assert.equal(defaultText.replace(',\n        "default": "media"', ''), source);
  assert.equal(nrpDefsRoundTripError(defaultText, withDefault), null);

  const indexPath = join(dirname(TAREFA), '../journeys/index.defs.ts');
  const indexSource = readFileSync(indexPath, 'utf8');
  const index = JSON.parse(extractNs4ClassicJsonObject(indexSource)) as { journeys: Array<{ journeyId: string }> };
  const nextIndex = JSON.parse(JSON.stringify(index)) as typeof index;
  nextIndex.journeys.push({ journeyId: 'duplicarTarefa', actorRef: 'gestor', title: 'Duplicar tarefa' } as { journeyId: string });
  const indexText = replaceDefsJsonLiteral(indexSource, nextIndex);
  assert.equal(
    indexText.replace(
      /,\n    \{\n      "journeyId": "duplicarTarefa",\n      "actorRef": "gestor",\n      "title": "Duplicar tarefa"\n    \}/u,
      '',
    ),
    indexSource,
  );
  assert.equal(nrpDefsRoundTripError(indexText, nextIndex), null);

  const rulesPath = join(dirname(TAREFA), '../rules.defs.ts');
  const rulesSource = readFileSync(rulesPath, 'utf8').replace(
    '"rules": []',
    '"rules": {\n    "edicaoNaoMudaSituacao": "A edição não muda a situação."\n  }',
  );
  const rules = JSON.parse(extractNs4ClassicJsonObject(rulesSource)) as { rules: Record<string, string> };
  const nextRules = JSON.parse(JSON.stringify(rules)) as typeof rules;
  nextRules.rules.gestorDuplicaTarefa = 'O gestor pode duplicar uma tarefa.';
  const rulesText = replaceDefsJsonLiteral(rulesSource, nextRules);
  assert.equal(
    rulesText.replace(',\n    "gestorDuplicaTarefa": "O gestor pode duplicar uma tarefa."', ''),
    rulesSource,
  );
  assert.equal(nrpDefsRoundTripError(rulesText, nextRules), null);

  const report = nrpReport({
    moduleName: 'tarefas', project: 1, request: 'Drop labels.',
    triage: {
      valid: true, reason: null, clarification: null, artifacts: ['ontology'], targets: ['Tarefa'],
      intent: 'Drop labels.', mechanicalOnly: false,
      mechanical: [{ op: 'remove', targetId: 'Tarefa', fieldId: 'details.etiquetas', value: '' }],
    },
    artifacts: { entities: [] } as unknown as NrpModuleArtifacts,
    applied: [
      { mode: 'model', kind: 'journeys', artifact: { files: [] } },
      { mode: 'model', kind: 'journeys', artifact: { files: [] } },
    ],
    issues: [], allowWrite: true, modelCalls: 3,
  }, { written: true, reason: null, files: ['ontology/Tarefa.defs.ts', 'journeys/criarTarefa.defs.ts'] });
  assert.deepEqual(report.changed, ['ontology', 'journeys']);
  assert.deepEqual(report.modelKinds, ['journeys']);

  const optional = nrpReport({
    moduleName: 'tarefas', project: 1, request: 'Make priority optional.',
    triage: {
      valid: true, reason: null, clarification: null, artifacts: ['ontology'], targets: ['Tarefa'],
      intent: 'Make priority optional.', mechanicalOnly: true,
      mechanical: [{ op: 'setOptional', targetId: 'Tarefa', fieldId: 'prioridade', value: '' }],
    },
    artifacts: { entities: [] } as unknown as NrpModuleArtifacts,
    applied: [],
    issues: [], allowWrite: true, modelCalls: 1,
  }, { written: true, reason: null, files: ['tarefas/tarefas/tobe/plan/ontology/Tarefa.defs.ts'] });
  assert.deepEqual(optional.changed, ['ontology']);

  const three = nrpReport({
    moduleName: 'tarefas', project: 1, request: 'Priority, a rule, and a journey.',
    triage: {
      valid: true, reason: null, clarification: null, artifacts: ['ontology', 'rules', 'journeys'], targets: ['Tarefa'],
      intent: 'Priority, a rule, and a journey.', mechanicalOnly: false, mechanical: [],
    },
    artifacts: { entities: [] } as unknown as NrpModuleArtifacts,
    applied: [
      { mode: 'model', kind: 'rules', artifact: { files: [] } },
      { mode: 'model', kind: 'journeys', artifact: { files: [] } },
    ],
    issues: [], allowWrite: true, modelCalls: 3,
  }, {
    written: true, reason: null,
    files: [
      'tarefas/tobe/plan/ontology/Tarefa.defs.ts',
      'tarefas/tobe/plan/rules.defs.ts',
      'tarefas/tobe/plan/journeys/criarTarefa.defs.ts',
      'tarefas/pipeline/newReleasePrompt.json',
    ],
  });
  assert.deepEqual(three.changed, ['ontology', 'rules', 'journeys']);
  assert.deepEqual(three.modelKinds, ['rules', 'journeys']);
});

function changedSpan(before: string, after: string): string[] {
  const left = before.split('\n');
  const right = after.split('\n');
  let start = 0;
  while (start < left.length && start < right.length && left[start] === right[start]) start += 1;
  let endLeft = left.length - 1;
  let endRight = right.length - 1;
  while (endLeft >= start && endRight >= start && left[endLeft] === right[endRight]) {
    endLeft -= 1;
    endRight -= 1;
  }
  return right.slice(start, endRight + 1);
}
