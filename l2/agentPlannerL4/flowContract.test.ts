/// <mls fileReference="_102035_/l2/agentPlannerL4/flowContract.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createAgent } from '/_102035_/l2/agentPlannerL4/agentPlannerL4.js';
import { PL_STEP_HOOKS } from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';
import {
  PL_AGENT_NAME,
  PL_FLOW_ID,
  PL_FLOW_VERSION,
  PL_STEP_DEPENDS_ON,
  PL_STEP_IDS,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FLOW_PATH = path.join(HERE, 'docs/flow.json');
const STEPS_ROOT = path.join(HERE, 'steps');

interface FlowStep {
  id: string;
  kind: string;
  dependsOn: string[];
  doneAnchor: string;
  implementation?: string;
  artifact: string;
  goal?: string;
}

interface FlowDoc {
  flowId: string;
  schemaVersion: string;
  description: string;
  principles: string[];
  artifacts: Record<string, string>;
  steps: FlowStep[];
}

const EXPECTED_ARTIFACTS: Record<string, string> = {
  pipeline: 'l4/{module}/pipeline/pipeline.json',
  l5config: 'l5/config.json',
  poolL1: 'l4/{module}/pool/l1/{stamp}_{thread}_{round}.json',
  poolL2: 'l4/{module}/pool/l2/{stamp}_{thread}_{round}.json',
  poolL4: 'l4/{module}/pool/l4/{stamp}_{thread}_{round}.json',
  l4diffL1: 'l4/{module}/pool/l1/web/l4diff.json',
  l4diffL2: 'l4/{module}/pool/l2/web/l4diff.json',
};

function loadFlow(): FlowDoc {
  return JSON.parse(readFileSync(FLOW_PATH, 'utf8')) as FlowDoc;
}

void test('createAgent meta matches the public planner L4', () => {
  const agent = createAgent();
  assert.equal(agent.agentName, PL_AGENT_NAME);
  assert.equal(agent.agentProject, 102035);
  assert.equal(agent.agentFolder, 'agentPlannerL4');
  assert.equal(agent.visibility, 'public');
  assert.equal(typeof agent.beforePromptImplicit, 'function');
});

void test('flow has exactly four steps in declared order with declared dependencies', () => {
  const flow = loadFlow();
  assert.equal(flow.flowId, PL_FLOW_ID);
  assert.equal(flow.schemaVersion, PL_FLOW_VERSION);
  assert.equal(flow.steps.length, 4);
  assert.deepEqual(flow.steps.map(step => step.id), [...PL_STEP_IDS]);

  for (const step of flow.steps) {
    assert.deepEqual(step.dependsOn, [...PL_STEP_DEPENDS_ON[step.id as keyof typeof PL_STEP_DEPENDS_ON]]);
    assert.equal(step.doneAnchor, `${step.id}-done`);
    assert.equal(step.kind, 'deterministic');
    assert.ok(step.artifact, `${step.id} missing artifact`);
  }

  assert.equal(flow.steps.find(step => step.id === 'dispatch20')?.implementation, undefined);
  assert.equal(flow.steps.find(step => step.id === 'loop30')?.implementation, undefined);
  assert.equal(flow.steps.find(step => step.id === 'entry10')?.implementation, undefined);
});

void test('flow artifacts match the planner table', () => {
  const flow = loadFlow();
  assert.deepEqual(flow.artifacts, EXPECTED_ARTIFACTS);
});

void test('flow records that L4 orchestrates L2 then L1 then L2 in the same task', () => {
  const flow = loadFlow();
  assert.match(flow.description, /orchestrate L2/i);
  assert.equal(flow.principles.some(line => /same task/i.test(line)), true);
  const entry = flow.steps.find(step => step.id === 'entry10');
  const diff = flow.steps.find(step => step.id === 'diff20');
  const dispatch = flow.steps.find(step => step.id === 'dispatch20');
  const loop = flow.steps.find(step => step.id === 'loop30');
  assert.match(entry?.goal || '', /wipe/i);
  assert.match(entry?.goal || '', /candidate/i);
  assert.match(diff?.goal || '', /l4diff/i);
  assert.match(dispatch?.goal || '', /L2 r1/i);
  assert.match(loop?.goal || '', /L1 r1/i);
  assert.match(loop?.goal || '', /effort/i);
});

void test('each step folder that exists implements beforePromptStep and is on the dispatch table', async () => {
  if (!existsSync(STEPS_ROOT)) return;
  for (const stepId of PL_STEP_IDS) {
    const folder = path.join(STEPS_ROOT, stepId);
    if (!existsSync(folder)) continue;
    const agentFiles = readdirSync(folder).filter(name => /^agentPl\w+\.ts$/.test(name) && !name.endsWith('.test.ts'));
    assert.ok(agentFiles.length > 0, `${stepId} has a folder but no agentPl*.ts`);
    const source = readFileSync(path.join(folder, agentFiles[0]), 'utf8');
    assert.match(source, /export async function beforePl\w+PromptStep/, `${agentFiles[0]} must export beforePromptStep`);
    await import(`/_102035_/l2/agentPlannerL4/steps/${stepId}/${agentFiles[0].replace(/\.ts$/, '.js')}`);
    assert.equal(typeof PL_STEP_HOOKS[stepId]?.beforePromptStep, 'function', `${stepId} folder exists but is missing from PL_STEP_HOOKS`);
  }
});
