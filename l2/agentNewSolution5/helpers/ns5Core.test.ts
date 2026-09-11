/// <mls fileReference="_102035_/l2/agentNewSolution5/helpers/ns5Core.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NS5_STEP_DEPENDS_ON,
  NS5_STEP_IDS,
  buildNs5PlannedSteps,
  createEmptyPipeline,
  createNs5RetryStep,
  markNs5Complete,
  markNs5Step,
  moduleTokenOk,
  nextNs5RunNn,
  ns5OntologyEntitySelector,
  ownerStepId,
  parseNs5Invocation,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';

void test('parseNs5Invocation strips flags and keeps the prompt', () => {
  const parsed = parseNs5Invocation('criar o modulo x /fast /module teste5');
  assert.equal(parsed.fast, true);
  assert.equal(parsed.rebuildAll, false);
  assert.equal(parsed.module, 'teste5');
  assert.equal(parsed.prompt, 'criar o modulo x');
});

void test('parseNs5Invocation reads /rebuild all <module>', () => {
  const parsed = parseNs5Invocation('/rebuild all teste5');
  assert.equal(parsed.rebuildAll, true);
  assert.equal(parsed.module, 'teste5');
  assert.equal(parsed.prompt, '');
});

void test('bare /rebuild is not /rebuild all', () => {
  const parsed = parseNs5Invocation('criar o modulo x /rebuild /module teste5');
  assert.equal(parsed.rebuildAll, false);
  assert.match(parsed.prompt, /\/rebuild/);
});

void test('moduleTokenOk accepts lowerCamel only', () => {
  assert.equal(moduleTokenOk('teste5'), true);
  assert.equal(moduleTokenOk('stockControl'), true);
  assert.equal(moduleTokenOk('Teste5'), false);
  assert.equal(moduleTokenOk(''), false);
});

void test('planned tree is eight sequential steps with module10 first', () => {
  const steps = buildNs5PlannedSteps('teste5');
  assert.equal(steps.length, 8);
  assert.deepEqual(steps.map(step => step.planning?.planId), [...NS5_STEP_IDS]);
  assert.equal(steps[0].status, 'waiting_human_input');
  assert.deepEqual(steps[0].planning?.dependsOn, []);
  for (const step of steps.slice(1)) {
    assert.equal(step.status, 'waiting_dependency');
    assert.equal(step.planning?.executionMode, 'sequential');
  }
  assert.deepEqual(steps.find(step => step.planning?.planId === 'rules40')?.planning?.dependsOn, [...NS5_STEP_DEPENDS_ON.rules40]);
});

void test('empty pipeline starts inProgress with empty steps', () => {
  const pipeline = createEmptyPipeline('teste5', 'criar o modulo x', { fast: true, module: 'teste5', rebuildAll: false }, '2026-09-10T00:00:00.000Z');
  assert.equal(pipeline.status, 'inProgress');
  assert.equal(pipeline.awaitingStep, undefined);
  assert.deepEqual(pipeline.steps, {});
  assert.equal(pipeline.schemaVersion, '2026-09-10-ns5-pipeline-v1');
  assert.equal(pipeline.flowId, 'agentNewSolution5');
});

void test('parseNs5Invocation allows a prompt without /module', () => {
  const parsed = parseNs5Invocation('criar o modulo x /fast');
  assert.equal(parsed.fast, true);
  assert.equal(parsed.module, '');
  assert.equal(parsed.prompt, 'criar o modulo x');
});

void test('ownerStepId and retry step keep the owning module10 hook', () => {
  assert.equal(ownerStepId('module10-repair-2'), 'module10');
  const retry = createNs5RetryStep('module10', 'teste5', 'repair', 1, { gateFeedback: 'NS5_MODULE_INTERNAL_ACTOR: missing' });
  assert.equal(retry.planning?.planId, 'module10-repair-1');
  assert.match(String(retry.prompt), /"planId":"module10"/);
  assert.match(String(retry.prompt), /gateFeedback/);
});

void test('ownerStepId maps ontology fan-out children and leaves done-anchors unmatched', () => {
  assert.equal(ownerStepId('ontology30-entities-0'), 'ontology30');
  assert.equal(ownerStepId('ontology30-bindings'), 'ontology30');
  assert.equal(ownerStepId('ontology30-finalize-1'), 'ontology30');
  assert.equal(ownerStepId('ontology30-done'), '');
  assert.equal(ownerStepId('ontology30-clarification'), '');
  assert.equal(ns5OntologyEntitySelector('entity:ItemCardapio'), 'ItemCardapio');
  assert.equal(ns5OntologyEntitySelector('{"planId":"ontology30"}'), '');
});

void test('nextNs5RunNn and markNs5Complete close the pipeline', () => {
  assert.equal(nextNs5RunNn([]), '01');
  assert.equal(nextNs5RunNn(['run02_newsolution5', 'pipeline']), '03');
  const pipeline = createEmptyPipeline('teste5', 'criar o modulo x', { fast: true, module: 'teste5', rebuildAll: false }, '2026-09-10T00:00:00.000Z');
  const complete = markNs5Complete(pipeline, '2026-09-10T03:00:00.000Z');
  assert.equal(complete.status, 'complete');
});

void test('markNs5Step refuses to overwrite approved', () => {
  const pipeline = createEmptyPipeline('teste5', 'criar o modulo x', { fast: true, module: 'teste5', rebuildAll: false }, '2026-09-10T00:00:00.000Z');
  const approved = markNs5Step(pipeline, 'module10', {
    status: 'approved',
    updatedAt: '2026-09-10T01:00:00.000Z',
    artifactPaths: ['l4/teste5/module.defs.ts'],
    autoReason: 'fast',
  });
  const afterFail = markNs5Step(approved, 'module10', {
    status: 'failed',
    updatedAt: '2026-09-10T02:00:00.000Z',
    error: 'late',
  });
  assert.equal(afterFail.steps.module10?.status, 'approved');
  assert.equal(afterFail.steps.module10?.error, undefined);
});
