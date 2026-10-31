/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/write50/write50.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractNs4ClassicJsonObject } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import type { NrpWritePayload } from '/_102035_/l2/agentNewReleasePrompt/steps/write50/write50.js';
import { persistNrp, defsSourceFromSibling, nrpDefsRoundTripError, nrpFileStates, nrpPendingTextMarks, nrpReport, replaceDefsJsonLiteral, changedNrpPaths } from '/_102035_/l2/agentNewReleasePrompt/steps/write50/write50.js';
import { setModuleRoot, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { L4_REVISION_SCHEMA, originalL4FileInfo, promoteL4Revision, sealL4Revision } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { sealModuleLayers } from '/_102035_/l2/solution/candidate/moduleLayers.js';
import { tobeArtifactFileInfo, type Ns5TobeArtifactPath } from '/_102035_/l2/solution/candidate/tobePaths.js';

const TAREFA = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../solution/fixtures/finalize80/tarefas/ontology/Tarefa.defs.ts',
);

void test('p4_81 s3 lists each written file as added, changed or removed', () => {
  assert.deepEqual(nrpFileStates(
    [{ path: 'journeys/criarTarefa.defs.ts', existed: true }, { path: 'journeys/nova.defs.ts', existed: false }],
    ['journeys/antiga.defs.ts'],
  ), [
    { path: 'journeys/criarTarefa.defs.ts', state: 'changed' },
    { path: 'journeys/nova.defs.ts', state: 'added' },
    { path: 'journeys/antiga.defs.ts', state: 'removed' },
  ]);
});

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

void test('a set that adds one workflow task rewrites only the new lines', () => {
  const source = readFileSync(join(dirname(TAREFA), '../workflows.defs.ts'), 'utf8');
  const workflows = JSON.parse(extractNs4ClassicJsonObject(source)) as {
    processes: Array<{ processId: string; tasks: Array<Record<string, unknown>> }>;
  };
  const next = JSON.parse(JSON.stringify(workflows)) as typeof workflows;
  const cycle = next.processes.find(process => process.processId === 'cicloTarefa');
  if (!cycle) throw new Error('cicloTarefa is missing from the tarefas fixture.');
  cycle.tasks.push({
    taskId: 'avisarCriador',
    kind: 'alert',
    actorRef: 'membro',
    next: [],
    description: 'Avisa quem criou a tarefa.',
  });
  const patched = replaceDefsJsonLiteral(source, next);
  const inserted = [
    ',',
    '        {',
    '          "taskId": "avisarCriador",',
    '          "kind": "alert",',
    '          "actorRef": "membro",',
    '          "next": [],',
    '          "description": "Avisa quem criou a tarefa."',
    '        }',
  ].join('\n');
  assert.equal(patched.includes(inserted), true);
  assert.equal(patched.replace(inserted, ''), source);
  assert.equal(nrpDefsRoundTripError(patched, next), null);
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

const project = 102035;
const moduleName = 'fixture';
const sha = (source: string) => `sha256:${createHash('sha256').update(source).digest('hex')}`;
const defs = (value: unknown) => `export const fixture = ${JSON.stringify(value)} as const;\n`;

function installRemovalFixture() {
  const previous = (globalThis as any).mls;
  const files: Record<string, any> = {};
  const contents = new Map<string, string>();
  const keyOf = (info: Ns5FileInfo) => `${info.project}:${info.level}:${info.folder || ''}:${info.shortName}${info.extension}`;
  const add = (info: Ns5FileInfo, content = '') => {
    const key = keyOf(info);
    contents.set(key, content);
    return files[key] = {
      ...info, status: 'unchanged', versionRef: '1',
      getContent: async () => contents.get(key) || '',
      getValueInfo: async () => ({ content: contents.get(key) || '' }),
    };
  };
  (globalThis as any).mls = {
    actualProject: project,
    stor: {
      files, getKeyToFile: keyOf, addOrUpdateFile: async (info: Ns5FileInfo) => add(info),
      localStor: {
        setContent: async (file: Ns5FileInfo, value: { content: string }) => { contents.set(keyOf(file), value.content); },
        deleteFile: async (file: Ns5FileInfo) => { contents.delete(keyOf(file)); delete files[keyOf(file)]; },
      },
    },
    editor: { models: {}, getKeyModel: () => '' },
    common: { crc: { crc32: () => 0 } },
  };
  const moduleArt = { schemaVersion: '2026-09-10-ns5-module-v2', moduleName };
  const emptyIndex = { schemaVersion: 'fixture', journeys: [] as Array<{ journeyId: string; actorRef: string; title: string }> };
  const oldIndex = { schemaVersion: 'fixture', journeys: [{ journeyId: 'oldJourney', actorRef: 'actor', title: 'Antiga' }] };
  const oldJourney = { schemaVersion: 'fixture', journeyId: 'oldJourney' };
  const ontologyIndex = { schemaVersion: 'fixture', entities: [] };
  const plain = { schemaVersion: 'fixture' };
  const values: Array<[Ns5TobeArtifactPath, object]> = [
    ['module.defs.ts', moduleArt],
    ['journeys/index.defs.ts', oldIndex],
    ['ontology/index.defs.ts', ontologyIndex],
    ['rules.defs.ts', plain],
    ['workflows.defs.ts', plain],
    ['access.defs.ts', plain],
    ['integration.defs.ts', plain],
  ];
  const sources = values.map(([path, value]) => ({ path, source: defs(value) }));
  const oldSource = defs(oldJourney);
  for (const item of sources) add(originalL4FileInfo(project, moduleName, 'base1', item.path), item.source);
  add(originalL4FileInfo(project, moduleName, 'base1', 'journeys/oldJourney.defs.ts'), oldSource);
  const manifestFiles = Object.fromEntries(sources.map(item => [item.path, sha(item.source)]));
  manifestFiles['journeys/oldJourney.defs.ts'] = sha(oldSource);
  const schemas = Object.fromEntries(values.map(([path, value]) => [path, (value as { schemaVersion: string }).schemaVersion]));
  schemas['journeys/oldJourney.defs.ts'] = 'fixture';
  const json = (folder: string, shortName: string, value: unknown) => add(
    { project, level: 4, folder: `${moduleName}/${folder}`, shortName, extension: '.json' },
    JSON.stringify(value),
  );
  json('pipeline/releases', 'index', { releases: [{ baseId: 'base1' }] });
  json('pipeline/releases/base1', 'manifest', {
    schemaVersion: L4_REVISION_SCHEMA, project, moduleName, baseId: 'base1', files: manifestFiles, schemas,
  });
  const change = {
    schemaVersion: L4_REVISION_SCHEMA, project, moduleName, changeId: 'change1', baseId: 'base1',
    activeRevisionId: 'rev1', requestRevision: 1, resultRevisionId: null,
    sourcePrompt: 'original', updatedAt: '2026-10-07T00:00:00.000Z',
  };
  json('pipeline/changes', 'active', { changeId: change.changeId });
  json('pipeline/changes/change1', 'change', change);
  json('pipeline/changes/change1/requests', 'request-1', { request: 'pedido' });
  for (const item of sources) add(tobeArtifactFileInfo(project, moduleName, item.path, 'tobe'), item.source);
  add(tobeArtifactFileInfo(project, moduleName, 'journeys/oldJourney.defs.ts', 'tobe'), oldSource);
  add(tobeArtifactFileInfo(project, moduleName, 'journeys/oldJourney.defs.ts', 'asis'), oldSource);
  const canonical = `${project}:4:${moduleName}/journeys:oldJourney.defs.ts`;
  const edited = `${project}:4:${moduleName}/tobe/plan/journeys:oldJourney.defs.ts`;
  const payload = {
    moduleName, project, request: 'Remove a jornada antiga.',
    triage: {
      valid: true, reason: null, clarification: null, artifacts: ['journeys'], targets: ['oldJourney'],
      intent: 'Remove a jornada.', mechanical: [], mechanicalOnly: false,
    },
    artifacts: {
      module: moduleArt, journeyIndex: emptyIndex, journeys: [],
      ontologyIndex, entities: [], rules: plain, workflows: plain, access: plain, integration: plain,
    },
    applied: [], issues: [], allowWrite: true, modelCalls: 1,
  } as unknown as NrpWritePayload;
  return {
    contents, canonical, edited, oldSource, payload,
    restore: () => { setModuleRoot(moduleName, null); (globalThis as any).mls = previous; },
  };
}

void test('p4_81 s4b: a request that drops a journey deletes it in the edited version, seals removed, and Apply deletes the canonical', async () => {
  const fixture = installRemovalFixture();
  try {
    const written = await persistNrp(fixture.payload);
    assert.equal(written.reason, null);
    assert.equal(written.fileStates.some(item => item.path === 'journeys/oldJourney.defs.ts' && item.state === 'removed'), true);
    assert.equal(fixture.contents.has(fixture.edited), false);
    assert.equal(fixture.contents.get(fixture.canonical), fixture.oldSource);
    const sealed = await sealL4Revision(project, moduleName, 'rev1');
    assert.equal(sealed.fileStates?.['journeys/oldJourney.defs.ts'], 'removed');
    await sealModuleLayers(project, moduleName, 'base1');
    await promoteL4Revision(project, moduleName, 'change1', sealed.revisionId);
    assert.equal(fixture.contents.has(fixture.canonical), false);
  } finally { fixture.restore(); }
});

void test('p4_81 s4b: a failed delete writes nothing', async () => {
  const fixture = installRemovalFixture();
  try {
    (globalThis as any).mls.stor.localStor.deleteFile = async () => { throw new Error('disk full'); };
    const indexKey = `${project}:4:${moduleName}/tobe/plan/journeys:index.defs.ts`;
    const indexBefore = fixture.contents.get(indexKey);
    const written = await persistNrp(fixture.payload);
    assert.match(written.reason || '', /Could not delete journeys\/oldJourney\.defs\.ts/);
    assert.deepEqual(written.files, []);
    assert.equal(fixture.contents.get(fixture.edited), fixture.oldSource);
    assert.equal(fixture.contents.get(fixture.canonical), fixture.oldSource);
    assert.equal(fixture.contents.get(indexKey), indexBefore);
  } finally { fixture.restore(); }
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
