/// <mls fileReference="_102035_/l2/agentNewSolution5/helpers/ns5Dispatch.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { createAgent } from '/_102035_/l2/agentNewSolution5/agentNewSolution5.js';
import { createNs5AgentStep, type Ns5StepId } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import {
  NS5_STEP_HOOKS,
  drainWaitingSiblings,
  planIdOf,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5Dispatch.js';

function numberedStep(stepId: number, planId: Ns5StepId, status: mls.msg.AIStepStatus): mls.msg.AIAgentStep {
  const step = createNs5AgentStep(planId, 'comandaRestaurante5');
  step.stepId = stepId;
  step.status = status;
  return step;
}

function parallelBatch(): { root: mls.msg.AIAgentStep; byPlan: Record<Ns5StepId, mls.msg.AIAgentStep> } {
  const steps = [
    numberedStep(10, 'module10', 'completed'),
    numberedStep(20, 'journeys20', 'completed'),
    numberedStep(30, 'ontology30', 'completed'),
    numberedStep(40, 'rules40', 'waiting_human_input'),
    numberedStep(50, 'workflows50', 'waiting_human_input'),
    numberedStep(60, 'access60', 'waiting_human_input'),
    numberedStep(70, 'integration70', 'waiting_dependency'),
    numberedStep(80, 'finalize80', 'waiting_dependency'),
  ];
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: 'plan comandaRestaurante5',
    status: 'waiting_human_input',
    nextSteps: steps,
    agentName: 'agentNewSolution5',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  const byPlan = {} as Record<Ns5StepId, mls.msg.AIAgentStep>;
  for (const step of steps) byPlan[planIdOf(step) as Ns5StepId] = step;
  return { root, byPlan };
}

function contextWith(root: mls.msg.AIAgentStep): mls.msg.ExecutionContext {
  return {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '' },
    task: {
      PK: 'task-1',
      iaCompressed: { nextSteps: [root], longMemory: {} },
    },
  } as mls.msg.ExecutionContext;
}

function statusStepIds(intents: mls.msg.AgentIntent[]): number[] {
  return intents
    .filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status')
    .map(intent => intent.stepId);
}

void test('all eight steps including finalize80 are hooked', () => {
  createAgent();
  assert.ok(NS5_STEP_HOOKS.rules40?.beforePromptStep, 'rules40 hook must be registered');
  assert.ok(NS5_STEP_HOOKS.workflows50?.beforePromptStep, 'workflows50 hook must be registered');
  assert.ok(NS5_STEP_HOOKS.access60?.beforePromptStep, 'access60 hook must be registered');
  assert.ok(NS5_STEP_HOOKS.integration70?.beforePromptStep, 'integration70 hook must be registered');
  assert.ok(NS5_STEP_HOOKS.finalize80?.beforePromptStep, 'finalize80 hook must be registered');
  assert.ok(NS5_STEP_HOOKS.finalize80?.afterPromptStep, 'finalize80 afterPrompt must fail an LLM reply');
});

void test('notImplemented drain leaves hooked siblings running', () => {
  const { root, byPlan } = parallelBatch();
  const intents = drainWaitingSiblings(
    contextWith(root),
    byPlan.finalize80,
    1,
    'stopped: awaiting step finalize80',
    { onlyUnimplemented: true },
  );
  const ids = new Set(statusStepIds(intents));
  assert.equal(ids.has(byPlan.rules40.stepId), false, 'rules40 has a hook and must keep running');
  assert.equal(ids.has(byPlan.workflows50.stepId), false, 'workflows50 has a hook and must keep running');
  assert.equal(ids.has(byPlan.access60.stepId), false, 'access60 has a hook and must keep running');
  assert.equal(ids.has(byPlan.integration70.stepId), false, 'integration70 has a hook and must keep running');
  assert.equal(ids.has(byPlan.finalize80.stepId), false, 'current step is not a sibling');
});

void test('failure drain still completes a hooked sibling so the task does not hang', () => {
  const { root, byPlan } = parallelBatch();
  const intents = drainWaitingSiblings(
    contextWith(root),
    byPlan.ontology30,
    1,
    'stopped: ontology30 failed',
  );
  const ids = new Set(statusStepIds(intents));
  assert.equal(ids.has(byPlan.rules40.stepId), true);
  assert.equal(ids.has(byPlan.workflows50.stepId), true);
  assert.equal(ids.has(byPlan.access60.stepId), true);
});

void test('notImplemented drain with every sibling hooked completes none', () => {
  const { root, byPlan } = parallelBatch();
  const intents = drainWaitingSiblings(
    contextWith(root),
    byPlan.module10,
    1,
    'stopped: awaiting a future step',
    { onlyUnimplemented: true },
  );
  const ids = new Set(statusStepIds(intents));
  assert.equal(ids.size, 0);
  assert.equal(ids.has(byPlan.finalize80.stepId), false);
});
