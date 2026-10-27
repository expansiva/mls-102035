/// <mls fileReference="_102035_/l2/newRelease/widgets/workflowsModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { comprasWorkflows } from './fixtures/compras-workflows.defs.js';
import {
  workflowEdges,
  appendWorkflowTask,
  workflowNewTaskError,
  WORKFLOW_TASK_KINDS,
  isEditableWorkflowSchema,
  isRecurringDuty,
  nextMemberId,
  normalizeWorkflows,
  workflowNextLabels,
  workflowOracleIssues,
  workflowStartTaskIds,
  workflowTaskCount,
} from './workflowsModel.js';

test('normalizes workflow v1 without inventing a trigger and keeps graph links', () => {
  const view = normalizeWorkflows({
    schemaVersion: '2026-09-10-ns5-workflows-v1',
    moduleName: 'legacy',
    processes: [{ processId: 'p', title: 'P', description: 'D', tasks: [
      { taskId: 'a', kind: 'human', actorRef: 'x', journeyRef: 'j', stepRef: 's', next: ['b'], description: 'A' },
      { taskId: 'b', kind: 'system', next: [], description: 'B' },
    ] }],
  });
  assert.equal(view.schema, 'v1');
  assert.equal(view.processes[0].trigger, null);
  assert.equal(workflowTaskCount(view.processes), 2);
  assert.deepEqual(workflowStartTaskIds(view.processes[0]), ['a']);
  assert.deepEqual(workflowNextLabels(view.processes[0], view.processes[0].tasks[0]), ['B']);
});

test('normalizes workflow v2 decisions and helpers', () => {
  const view = normalizeWorkflows({
    schemaVersion: '2026-09-12-ns5-workflows-v2', moduleName: 'm',
    processes: [{ processId: 'p', title: 'P', description: 'D', trigger: { kind: 'scheduled', schedule: 'monthly' }, tasks: [] }],
    journeyDecisions: [{ journeyId: 'j', inProcess: true, processId: 'p' }],
  });
  assert.equal(view.schema, 'v2');
  assert.equal(view.processes[0].trigger?.kind, 'scheduled');
  assert.equal(view.journeyDecisions[0].processId, 'p');
  assert.equal(nextMemberId('process', ['process1', 'process2']), 'process3');
});

test('selects workflow and I6 issues only', () => {
  const issues = workflowOracleIssues([
    { artifact: 'workflows.defs.ts', path: '$', severity: 'error', code: 'X', message: 'x', source: 'gate' },
    { artifact: 'module', path: '$', severity: 'warning', code: 'NS5_FINALIZE_I6_SYSTEM_TRANSITION_UNOWNED', message: 'i6', source: 'oracle' },
    { artifact: 'rules.defs.ts', path: '$', severity: 'error', code: 'I4', message: 'i4', source: 'oracle' },
  ]);
  assert.equal(issues.length, 2);
});

test('reads the frozen compras fixture as a v3 process', () => {
  const view = normalizeWorkflows(comprasWorkflows);
  assert.equal(view.schema, 'v3');
  assert.equal(view.processes.length, 1);
  assert.equal(view.processes[0].trigger?.kind, 'manual');
  assert.equal(workflowTaskCount(view.processes), 2);
  assert.equal(view.journeyDecisions.length, 5);
});

test('recognizes workflows v3 and derives the recurring duty from a scheduled alert process', () => {
  const view = normalizeWorkflows({
    schemaVersion: '2026-09-17-ns5-workflows-v3', moduleName: 'mensalidadesAcademia',
    processes: [
      { processId: 'gerarMensalidades', title: 'G', description: 'D', trigger: { kind: 'scheduled', schedule: 'todo mes, dia 1' }, tasks: [
        { taskId: 'avisar', kind: 'alert', actorRef: 'gerencia', next: [], description: 'Roda gerarMensalidadesDoMes.' },
      ] },
      { processId: 'atender', title: 'A', description: 'D', trigger: { kind: 'manual', actorRef: 'gerencia' }, tasks: [
        { taskId: 'agir', kind: 'mechanical', entityRef: 'Mensalidade', effect: 'create', next: [], description: 'Cria.' },
      ] },
    ],
    journeyDecisions: [{ journeyId: 'gerarMensalidadesDoMes', inProcess: true, processId: 'gerarMensalidades' }],
  });
  assert.equal(view.schema, 'v3');
  assert.equal(isEditableWorkflowSchema('v3'), true);
  assert.equal(isEditableWorkflowSchema('v2'), true);
  assert.equal(isEditableWorkflowSchema('v1'), false);
  assert.equal(view.processes[0].tasks[0].kind, 'alert');
  assert.equal(isRecurringDuty(view.processes[0]), true);
  assert.equal(isRecurringDuty(view.processes[1]), false);
});

test('lists process functions and uses an empty list when the artifact has none', () => {
  const withFunctions = normalizeWorkflows({
    schemaVersion: '2026-09-17-ns5-workflows-v3', moduleName: 'm',
    processes: [{ processId: 'p', title: 'P', description: 'D', trigger: { kind: 'manual', actorRef: 'a' }, tasks: [], functions: [
      { functionId: 'abrirOcorrencia', description: 'A tela chama, abre a mensagem e a Task, e devolve o id.' },
    ] }],
  });
  assert.deepEqual(withFunctions.processes[0].functions, [
    { functionId: 'abrirOcorrencia', description: 'A tela chama, abre a mensagem e a Task, e devolve o id.' },
  ]);
  const without = normalizeWorkflows({
    schemaVersion: '2026-09-17-ns5-workflows-v3', moduleName: 'm',
    processes: [{ processId: 'p', title: 'P', description: 'D', trigger: { kind: 'manual', actorRef: 'a' }, tasks: [] }],
  });
  assert.deepEqual(without.processes[0].functions, []);
  assert.equal(without.processes[0].functions.some(item => item === undefined), false);
});

test('shows room and wake when the artifact records them', () => {
  const view = normalizeWorkflows({
    schemaVersion: '2026-09-17-ns5-workflows-v3', moduleName: 'm',
    processes: [{
      processId: 'p', title: 'P', description: 'D', room: 'group',
      trigger: { kind: 'manual', actorRef: 'a' },
      tasks: [
        { taskId: 'esperar', kind: 'wait', next: [], description: 'Espera.', wake: { mode: 'periodic', every: 'PT1H' } },
        { taskId: 'agir', kind: 'human', actorRef: 'a', next: [], description: 'Age.', wake: { mode: 'periodic', every: 'PT1H' } },
      ],
    }],
  });
  assert.equal(view.processes[0].room, 'group');
  assert.deepEqual(view.processes[0].tasks[0].wake, { mode: 'periodic', every: 'PT1H' });
  assert.equal(view.processes[0].tasks[1].wake, undefined);
  assert.equal(JSON.stringify(view.processes[0]).includes('undefined'), false);
});

test('defaults a recorded process without room and a wait without wake', () => {
  const view = normalizeWorkflows({
    schemaVersion: '2026-09-17-ns5-workflows-v3', moduleName: 'm',
    processes: [{
      processId: 'p', title: 'P', description: 'D',
      trigger: { kind: 'manual', actorRef: 'a' },
      tasks: [{ taskId: 'esperar', kind: 'wait', next: [], description: 'Espera.' }],
    }],
  });
  assert.equal(view.processes[0].room, 'exclusive');
  assert.deepEqual(view.processes[0].tasks[0].wake, { mode: 'none' });
  assert.equal(view.processes[0].room === undefined, false);
  assert.equal(view.processes[0].tasks[0].wake === undefined, false);
});

test('a scheduled process with no stage is not a recurring duty', () => {
  const view = normalizeWorkflows({
    schemaVersion: '2026-09-17-ns5-workflows-v3', moduleName: 'm',
    processes: [{ processId: 'p', title: 'P', description: 'D', trigger: { kind: 'scheduled', schedule: 'mensal' }, tasks: [] }],
    journeyDecisions: [],
  });
  assert.equal(isRecurringDuty(view.processes[0]), false);
});


test('graph keeps declared returns and self cycles without inventing sequential edges', () => {
  const process = normalizeWorkflows({processes: [{tasks: [
    {taskId: 'a', kind: 'wait', next: ['c'], description: 'A'},
    {taskId: 'b', kind: 'human', next: [], description: 'B'},
    {taskId: 'c', kind: 'wait', next: ['a', 'c'], description: 'C'},
  ]}]}).processes[0];
  assert.deepEqual(workflowEdges(process), [{from: 0, to: 2, id: 'c'}, {from: 2, to: 0, id: 'a'}, {from: 2, to: 2, id: 'c'}]);
});
test('new stage validates its one-time identity and preserves all existing metadata and edges', () => {
  const artifact = structuredClone(comprasWorkflows);
  const before = structuredClone(artifact);
  const process = artifact.processes[0];
  assert.equal(workflowNewTaskError('', []), 'id');
  assert.equal(workflowNewTaskError('WrongId', []), 'id');
  assert.equal(workflowNewTaskError('new-stage', []), 'id');
  assert.equal(workflowNewTaskError(process.tasks[0].taskId, process.tasks.map(task => task.taskId)), 'duplicate');
  assert.equal(appendWorkflowTask(artifact, process.processId, ''), artifact);
  const next = appendWorkflowTask(artifact, process.processId, 'novaEtapa');
  assert.deepEqual(artifact, before);
  assert.deepEqual(next.processes[0].tasks.slice(0, -1), process.tasks);
  assert.deepEqual(next.processes[0].tasks.at(-1), {taskId: 'novaEtapa', kind: 'wait', description: '', next: [], wake: {mode: 'none'}});
  assert.deepEqual({...next.processes[0], tasks: []}, {...process, tasks: []});
  assert.deepEqual(next.journeyDecisions, artifact.journeyDecisions);
  assert.deepEqual(WORKFLOW_TASK_KINDS, ['human', 'mechanical', 'llm', 'wait', 'alert']);
});


test('workflow gate accepts a v3 entity without transitions through the neutral ontology view', async () => {
  const { ns5OntologyEntityViews } = await import('../../solution/ontologyView.js');
  const { validateNs5Workflows } = await import('../../solution/gates/workflows50/gate.js');
  const { default: fixture } = await import('../../solution/fixtures/ontology30/agendaClinica-v3/Consulta.defs.js');
  const entity = structuredClone(fixture) as unknown as import('../../solution/types.js').Ns5OntologyEntityV3;
  delete entity.transitions;
  const before = structuredClone(entity);
  const entities = ns5OntologyEntityViews([entity]);
  assert.deepEqual(entities[0].transitions, []);
  const result = validateNs5Workflows([{
    processId: 'atender', title: 'Atender', description: 'Atender consulta', room: 'exclusive',
    trigger: {kind: 'manual', actorRef: 'medico'}, functions: [],
    tasks: [{taskId: 'mudar', kind: 'mechanical', entityRef: entity.entityId, effect: 'transition', transitionRef: 'inexistente', description: 'Mudar consulta', next: []}],
  }], {moduleName: entity.moduleName, actorIds: ['medico'], journeys: [], entities, journeyDecisions: []});
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.message.includes('inexistente')));
  assert.deepEqual(entity, before);
});
