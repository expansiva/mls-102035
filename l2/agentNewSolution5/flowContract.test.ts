/// <mls fileReference="_102035_/l2/agentNewSolution5/flowContract.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { NS5_STEP_HOOKS } from '/_102035_/l2/agentNewSolution5/helpers/ns5Dispatch.js';
import {
  NS5_FLOW_ID,
  NS5_FLOW_VERSION,
  NS5_STEP_DEPENDS_ON,
  NS5_STEP_IDS,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FLOW_PATH = path.join(HERE, 'docs/flow.json');
const STEPS_ROOT = path.join(HERE, 'steps');

interface FlowStep {
  id: string;
  kind: string;
  dependsOn: string[];
  doneAnchor: string;
  clarificationAnchor: { id: string; status: string };
  modelAlias?: string;
  artifact: string;
}

interface FlowDoc {
  flowId: string;
  schemaVersion: string;
  artifacts: Record<string, string>;
  steps: FlowStep[];
}

const EXPECTED_ARTIFACTS: Record<string, string> = {
  module: 'l4/{module}/module.defs.ts',
  journey: 'l4/{module}/journeys/{journeyId}.defs.ts',
  journeyIndex: 'l4/{module}/journeys/index.defs.ts',
  ontologyEntity: 'l4/{module}/ontology/{Entity}.defs.ts',
  ontologyIndex: 'l4/{module}/ontology/index.defs.ts',
  rules: 'l4/{module}/rules.defs.ts',
  workflows: 'l4/{module}/workflows.defs.ts',
  access: 'l4/{module}/access.defs.ts',
  integration: 'l4/{module}/integration.defs.ts',
  pipeline: 'l4/{module}/pipeline/pipeline.json',
  draft: 'l4/{module}/pipeline/{step}-draft.json',
  finalizeReport: 'l4/{module}/pipeline/finalize-report.json',
  runSummary: 'l4/{module}/pipeline/runNN_newsolution5.json',
};

function loadFlow(): FlowDoc {
  return JSON.parse(readFileSync(FLOW_PATH, 'utf8')) as FlowDoc;
}

void test('flow has exactly eight steps in declared order with declared dependencies', () => {
  const flow = loadFlow();
  assert.equal(flow.flowId, NS5_FLOW_ID);
  assert.equal(flow.schemaVersion, NS5_FLOW_VERSION);
  assert.equal(flow.steps.length, 8);
  assert.deepEqual(flow.steps.map(step => step.id), [...NS5_STEP_IDS]);

  for (const step of flow.steps) {
    assert.deepEqual(step.dependsOn, [...NS5_STEP_DEPENDS_ON[step.id as keyof typeof NS5_STEP_DEPENDS_ON]]);
    assert.equal(step.doneAnchor, `${step.id}-done`);
    assert.deepEqual(step.clarificationAnchor, { id: `${step.id}-clarification`, status: 'reserved' });
    if (step.id === 'finalize80') {
      assert.equal(step.kind, 'deterministic');
      assert.equal(step.modelAlias, undefined);
    } else {
      assert.equal(step.kind, 'agent-checkpoint');
      assert.equal(step.modelAlias, 'reasoning');
    }
    assert.ok(step.artifact, `${step.id} missing artifact`);
  }

  assert.deepEqual(flow.steps.find(step => step.id === 'rules40')?.dependsOn, ['ontology30-done']);
  assert.deepEqual(flow.steps.find(step => step.id === 'workflows50')?.dependsOn, ['ontology30-done']);
  assert.deepEqual(flow.steps.find(step => step.id === 'access60')?.dependsOn, ['ontology30-done']);
});

void test('flow artifacts match the l4 table', () => {
  const flow = loadFlow();
  assert.deepEqual(flow.artifacts, EXPECTED_ARTIFACTS);
});

void test('each step folder that exists implements beforePromptStep and is on the dispatch table', async () => {
  if (!existsSync(STEPS_ROOT)) return;
  for (const stepId of NS5_STEP_IDS) {
    const folder = path.join(STEPS_ROOT, stepId);
    if (!existsSync(folder)) continue;
    const agentFiles = readdirSync(folder).filter(name => /^agentNs5\w+\.ts$/.test(name) && !name.endsWith('.test.ts'));
    assert.ok(agentFiles.length > 0, `${stepId} has a folder but no agentNs5*.ts`);
    const source = readFileSync(path.join(folder, agentFiles[0]), 'utf8');
    assert.match(source, /export async function beforeNs5\w+PromptStep/, `${agentFiles[0]} must export beforePromptStep`);
    await import(`/_102035_/l2/agentNewSolution5/steps/${stepId}/${agentFiles[0].replace(/\.ts$/, '.js')}`);
    assert.equal(typeof NS5_STEP_HOOKS[stepId]?.beforePromptStep, 'function', `${stepId} folder exists but is missing from NS5_STEP_HOOKS`);
  }
});
