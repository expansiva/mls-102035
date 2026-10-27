/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/steps/index10/index10.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { afterPromptStep, beforePromptStep } from '/_102035_/l2/agentNewReleasePrompt/agentNewReleasePrompt.js';
import { encodeNrpEditPrompt } from '/_102035_/l2/agentNewReleasePrompt/steps/edit30/edit30.js';
import type { NrpTriage } from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';

const PROJECT = 102047;
const MODULE = 'tarefas';
const REQUEST = 'Make priority optional.';
const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), '../../../solution/fixtures/finalize80/tarefas');

const TRIAGE: NrpTriage = {
  valid: true,
  reason: null,
  clarification: null,
  artifacts: ['ontology'],
  targets: ['Tarefa'],
  intent: 'Make the priority field optional.',
  mechanical: [{ op: 'setOptional', targetId: 'Tarefa', fieldId: 'prioridade', value: '' }],
};

type Stored = {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
  status: string;
  versionRef: string;
  content: string;
  getValueInfo: () => Promise<{ content: string }>;
  getContent: () => Promise<string>;
};

function keyOf(info: { project: number; level: number; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function seed(files: Record<string, Stored>, folder: string, shortName: string, content: string): void {
  const file: Stored = {
    project: PROJECT, level: 4, folder, shortName, extension: '.defs.ts',
    status: 'changed', versionRef: '1', content,
    getValueInfo: async () => ({ content: file.content }),
    getContent: async () => file.content,
  };
  files[keyOf(file)] = file;
}

function seedFixture(files: Record<string, Stored>, root: string, dir: string, rel = ''): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const next = join(dir, entry.name);
    const nextRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      seedFixture(files, root, next, nextRel);
      continue;
    }
    if (!entry.name.endsWith('.defs.ts')) continue;
    const folderRel = dirname(nextRel);
    const folder = folderRel === '.' ? root : `${root}/${folderRel}`;
    seed(files, folder, entry.name.slice(0, -'.defs.ts'.length), readFileSync(next, 'utf8'));
  }
}

function installHost(): void {
  const files: Record<string, Stored> = {};
  seedFixture(files, MODULE, FIXTURE);
  seedFixture(files, `${MODULE}/tobe/plan`, FIXTURE);
  (globalThis as unknown as { mls: unknown }).mls = {
    actualProject: PROJECT,
    stor: { files, getKeyToFile: keyOf },
  };
}

function parent(): mls.msg.AIAgentStep {
  return {
    type: 'agent', stepId: 1, interaction: null, nextSteps: [], status: 'waiting_human_input',
    agentName: 'agentNewReleasePrompt', stepTitle: 'Prompt edit', prompt: '', rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
}

function context(): mls.msg.ExecutionContext {
  return {
    message: { threadId: 'thread', orderAt: 'order', content: '' },
    task: { PK: 'task' },
    isTest: true,
  } as mls.msg.ExecutionContext;
}

function agentStep(planId: string, stepId: number, prompt: string, payload?: unknown): mls.msg.AIAgentStep {
  return {
    type: 'agent', stepId, interaction: payload === undefined ? null : { payload: [payload] },
    nextSteps: [], status: 'waiting_human_input', agentName: 'agentNewReleasePrompt',
    stepTitle: planId, prompt, rags: [],
    planning: { planId, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
}

function assertOwnStatusLast(label: string, intents: mls.msg.AgentIntent[], stepId: number, plants: boolean): void {
  const planted = intents.some(item => item.type === 'add-step');
  assert.equal(planted, plants, `${label}: add-step`);
  if (!planted) return;
  const last = intents[intents.length - 1];
  assert.equal(last?.type, 'update-status', `${label}: update-status is last`);
  assert.equal((last as mls.msg.AgentIntentUpdateStatus).stepId, stepId, `${label}: closes its own step`);
  assert.equal((last as mls.msg.AgentIntentUpdateStatus).status, 'completed', label);
}

void test('a hook that plants a step closes itself last', async () => {
  installHost();
  const invocation = JSON.stringify({ moduleName: MODULE, request: REQUEST });
  const ctx = context();
  const owner = parent();
  const meta = { agentName: 'agentNewReleasePrompt' } as IAgentMeta;
  const stopped = {
    valid: false, reason: 'Outside the specification.', clarification: null,
    artifacts: [], targets: [], intent: null, mechanical: [],
  };
  const cases: Array<{ planId: string; stepId: number; when: 'before' | 'after'; prompt: string; payload?: unknown; plants: boolean }> = [
    { planId: 'entry10', stepId: 2, when: 'before', prompt: invocation, plants: true },
    { planId: 'index10', stepId: 3, when: 'before', prompt: invocation, plants: true },
    { planId: 'triage20', stepId: 4, when: 'before', prompt: invocation, plants: false },
    { planId: 'triage20', stepId: 4, when: 'after', prompt: invocation, payload: stopped, plants: true },
    { planId: 'triage20', stepId: 5, when: 'after', prompt: invocation, payload: TRIAGE, plants: true },
    {
      planId: 'edit30', stepId: 6, when: 'before',
      prompt: encodeNrpEditPrompt(MODULE, REQUEST, { mode: 'apply', kind: null, triage: TRIAGE, rest: [], applied: [] }),
      plants: true,
    },
    {
      planId: 'edit30', stepId: 7, when: 'after',
      prompt: encodeNrpEditPrompt(MODULE, REQUEST, { mode: 'model', kind: 'rules', triage: { ...TRIAGE, mechanical: [], artifacts: ['rules'] }, rest: [], applied: [] }),
      payload: { artifactJson: JSON.stringify({ schemaVersion: 'recorded', moduleName: MODULE, rules: [] }) },
      plants: true,
    },
    {
      planId: 'gate40', stepId: 8, when: 'before',
      prompt: JSON.stringify({
        moduleName: MODULE, request: REQUEST,
        nrpGate: { moduleName: MODULE, request: REQUEST, triage: { ...TRIAGE, mechanical: [] }, applied: [], repaired: [], modelCalls: 0 },
      }),
      plants: true,
    },
    {
      planId: 'gate40', stepId: 9, when: 'after',
      prompt: JSON.stringify({
        moduleName: MODULE, request: REQUEST,
        nrpGate: {
          moduleName: MODULE, request: REQUEST,
          triage: { ...TRIAGE, mechanical: [], artifacts: ['rules'] },
          applied: [{ mode: 'model', kind: 'rules', artifact: { schemaVersion: '2026-09-16-ns5-rules-v2', moduleName: MODULE, rules: { BadId: '' } } }],
          repaired: [], modelCalls: 1,
        },
      }),
      payload: { artifactJson: JSON.stringify({ schemaVersion: '2026-09-16-ns5-rules-v2', moduleName: MODULE, rules: { okRule: 'Keep the catalog.' } }) },
      plants: true,
    },
    {
      planId: 'write50', stepId: 10, when: 'before',
      prompt: JSON.stringify({
        nrpWrite: {
          moduleName: MODULE, project: PROJECT, request: REQUEST,
          triage: { ...TRIAGE, mechanical: [] }, artifacts: {}, applied: [], issues: [],
          allowWrite: false, modelCalls: 0,
        },
      }),
      plants: true,
    },
  ];
  for (const item of cases) {
    const step = agentStep(item.planId, item.stepId, item.prompt, item.payload);
    const intents = item.when === 'before'
      ? await beforePromptStep(meta, ctx, owner, step, 1)
      : await afterPromptStep(meta, ctx, owner, step, 1);
    assertOwnStatusLast(`${item.planId} ${item.when}`, intents, item.stepId, item.plants);
  }
});
