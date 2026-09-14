/// <mls fileReference="_102035_/l2/newRelease/widgets/workflowsModel.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { comprasWorkflows } from '../../../../mls-102047/l4/compras/workflows.defs.js';
import {
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

test('reads the real compras fixture with two v2 processes', () => {
  const view = normalizeWorkflows(comprasWorkflows);
  assert.equal(view.schema, 'v2');
  assert.equal(view.processes.length, 2);
  assert.equal(view.processes[0].trigger?.kind, 'manual');
  assert.ok(workflowTaskCount(view.processes) >= 5);
});
