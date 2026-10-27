/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
import { buildNrpIndex } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import { parseNrpInvocation } from '/_102035_/l2/agentNewReleasePrompt/helpers/invocation.js';
import { createAgent, beforePromptImplicit } from '/_102035_/l2/agentNewReleasePrompt/agentNewReleasePrompt.js';

const TAREFAS_FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../solution/fixtures/finalize80/tarefas',
);

function tarefasDefs<T>(name: string): T {
  const source = readFileSync(join(TAREFAS_FIXTURE, name), 'utf8');
  const json = extractNs4ClassicJsonObject(source);
  if (!json) throw new Error(`no JSON in ${name}`);
  return JSON.parse(json) as T;
}

void test('compact index of the tarefas fixture lists triage targets and stays small', () => {
  const journeyIndex = tarefasDefs<Ns5JourneyIndexArtifact>('journeys/index.defs.ts');
  const ontologyIndex = tarefasDefs<Ns5OntologyAnyIndex>('ontology/index.defs.ts');
  const entities = ns5OntologyEntityIds(ontologyIndex).map(entityId =>
    tarefasDefs<Ns5OntologyAnyEntity>(`ontology/${entityId}.defs.ts`),
  );
  const index = buildNrpIndex({
    module: tarefasDefs<Ns5ModuleArtifact>('module.defs.ts'),
    journeyIndex,
    journeys: journeyIndex.journeys.map(entry =>
      tarefasDefs<Ns5JourneyArtifact>(`journeys/${entry.journeyId}.defs.ts`),
    ),
    ontologyIndex,
    entities,
    rules: tarefasDefs<Ns5RulesAny>('rules.defs.ts'),
    workflows: tarefasDefs<Ns5WorkflowsArtifact>('workflows.defs.ts'),
    access: tarefasDefs<Ns5AccessArtifact>('access.defs.ts'),
    integration: tarefasDefs<Ns5IntegrationArtifact>('integration.defs.ts'),
  });
  const bytes = new TextEncoder().encode(JSON.stringify(index)).length;
  assert.ok(bytes < 8_192, `index is ${bytes} bytes`);
  assert.ok(index.entities.some(entity => entity.entityId === 'Tarefa' && entity.fields.some(field => field.id === 'prioridade' && field.required)));
  assert.ok(index.journeys.some(journey => journey.journeyId === 'criarTarefa' && journey.stepIds.length > 0));
  assert.ok(index.grants.some(grant => grant.grantId && grant.scope));
  assert.ok(index.processes.some(process => process.processId === 'cicloTarefa' && process.trigger.includes('manual')));
  assert.equal(Array.isArray(index.rules), true);
  assert.equal(Array.isArray(index.events), true);
});

void test('malformed invocation creates no model step', async () => {
  assert.equal(createAgent().visibility, 'private');
  const previous = (globalThis as { mls?: unknown }).mls;
  (globalThis as { mls: { actualProject: number } }).mls = { actualProject: 102047 };
  try {
    const context = {
      message: { threadId: 'thread', orderAt: 'order', content: '@@agentNewReleasePrompt {bad}' },
      task: undefined, isTest: true,
    } as mls.msg.ExecutionContext;
    const intents = await beforePromptImplicit(createAgent(), context, '{bad}');
    assert.equal(intents[0].type, 'add-message-ai');
    assert.equal((intents[0] as mls.msg.AgentIntentAddMessageAI).skipRootLLM, true);
    assert.equal((intents[1] as mls.msg.AgentIntentAddStep).step.type, 'result');
  } finally {
    (globalThis as { mls?: unknown }).mls = previous;
  }
});

void test('valid invocation schedules entry10 without a root LLM', async () => {
  const previous = (globalThis as { mls?: unknown }).mls;
  (globalThis as { mls: { actualProject: number } }).mls = { actualProject: 102047 };
  try {
    const body = '{"moduleName":"tarefas","request":"Make priority optional."}';
    const invocation = parseNrpInvocation(`@@agentNewReleasePrompt ${body}`, 102047);
    assert.equal(invocation.moduleName, 'tarefas');
    const context = {
      message: { threadId: 'thread', orderAt: 'order', content: `@@agentNewReleasePrompt ${body}` },
      task: undefined, isTest: true,
    } as mls.msg.ExecutionContext;
    const intents = await beforePromptImplicit(createAgent(), context, body);
    const step = intents.find((item): item is mls.msg.AgentIntentAddStep => item.type === 'add-step');
    assert.ok(step);
    assert.equal(step.step.planning?.planId, 'entry10');
  } finally {
    (globalThis as { mls?: unknown }).mls = previous;
  }
});

void test('agent folder has no node: imports in production files', () => {
  const root = dirname(fileURLToPath(import.meta.url));
  const agentRoot = dirname(root);
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, name.name);
      if (name.isDirectory()) walk(full);
      else if (name.name.endsWith('.ts') && !name.name.endsWith('.test.ts')) files.push(full);
    }
  };
  walk(agentRoot);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.equal(text.includes("from 'node:"), false, file);
  }
});
