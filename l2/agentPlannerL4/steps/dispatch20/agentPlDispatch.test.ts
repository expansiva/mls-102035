/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/dispatch20/agentPlDispatch.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { createPlAgentStep, PL_L2_AGENT } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { PL_STEP_HOOKS } from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';
import {
  afterPlDispatchPromptStep,
  beforePlDispatchPromptStep,
} from '/_102035_/l2/agentPlannerL4/steps/dispatch20/agentPlDispatch.js';

type Stored = {
  project: number; level: number; folder: string; shortName: string; extension: string;
  status: string; versionRef: string; content: string;
  getValueInfo: () => Promise<{ content: string }>;
  getContent: () => Promise<string>;
};

type Host = { files: Record<string, Stored> };

const PROJECT = 102047;

function keyOf(info: { project: number | string; level: number | string; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function installHost(): Host {
  const host: Host = { files: {} };
  (globalThis as unknown as Record<string, unknown>).mls = {
    actualProject: PROJECT,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files: host.files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (params: { project: number; level: number; folder: string; shortName: string; extension: string }) => {
        const file: Stored = {
          project: params.project, level: params.level, folder: params.folder,
          shortName: params.shortName, extension: params.extension,
          status: 'new', versionRef: '0', content: '',
          getValueInfo: async () => ({ content: file.content }),
          getContent: async () => file.content,
        };
        host.files[keyOf(file)] = file;
        return file;
      },
      localStor: {
        setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; },
        listFolder: () => [],
      },
    },
  };
  return host;
}

function seed(
  host: Host,
  info: { level: number; folder: string; shortName: string; extension: string },
  content: string,
): Stored {
  const file: Stored = {
    project: PROJECT, ...info, status: 'changed', versionRef: '1', content,
    getValueInfo: async () => ({ content: file.content }),
    getContent: async () => file.content,
  };
  host.files[keyOf(file)] = file;
  return file;
}

const COMPLETE_PIPELINE = {
  schemaVersion: '2026-09-10-ns5-pipeline-v1',
  flowId: 'agentNewSolution5',
  moduleName: 'mensalidadesAcademia',
  status: 'complete',
  steps: {},
  sourcePrompt: '',
  invocation: { fast: false, module: 'mensalidadesAcademia', rebuildAll: false },
  updatedAt: '2026-09-18T00:00:00.000Z',
};

function contextWith(opts?: { l2Agent?: boolean }): {
  host: Host;
  context: mls.msg.ExecutionContext;
  parent: mls.msg.AIAgentStep;
  step: mls.msg.AIAgentStep;
  loop: mls.msg.AIAgentStep;
} {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  if (opts?.l2Agent) {
    seed(host, { level: 2, folder: 'agentPlannerL2', shortName: 'agentPlannerL2', extension: '.ts' }, '');
  }
  const step = createPlAgentStep('dispatch20', 'mensalidadesAcademia');
  step.stepId = 20;
  const loop = createPlAgentStep('loop30', 'mensalidadesAcademia');
  loop.stepId = 30;
  const parent: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: 'plan mensalidadesAcademia',
    status: 'waiting_human_input',
    nextSteps: [step, loop],
    agentName: 'agentPlannerL4',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  const context = {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '@@agentPlannerL4 mensalidadesAcademia' },
    task: {
      PK: 'task-1',
      iaCompressed: { nextSteps: [parent], longMemory: { moduleName: 'mensalidadesAcademia' } },
    },
    isTest: true,
  } as unknown as mls.msg.ExecutionContext;
  return { host, context, parent, step, loop };
}

const AGENT = { agentName: 'agentPlannerL4', agentDescription: '', visibility: 'public' as const };

void test('dispatch20 hook is registered as deterministic', () => {
  assert.equal(PL_STEP_HOOKS.dispatch20?.beforePromptStep, beforePlDispatchPromptStep);
  assert.equal(PL_STEP_HOOKS.dispatch20?.afterPromptStep, afterPlDispatchPromptStep);
});

void test('dispatch20 invokes L2 by name and says L1 stayed in the box', async () => {
  const { context, parent, step } = contextWith({ l2Agent: true });
  const intents = await beforePlDispatchPromptStep(AGENT, context, parent, step, 1);
  const added = intents.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  const l2 = added.find(intent => (intent.step as mls.msg.AIAgentStep).agentName === PL_L2_AGENT);
  assert.ok(l2, 'expected agentPlannerL2 step');
  const prompt = JSON.parse(String((l2.step as mls.msg.AIAgentStep).prompt)) as { moduleName: string; thread: string; file: string };
  assert.equal(prompt.moduleName, 'mensalidadesAcademia');
  assert.ok(prompt.thread);
  assert.match(prompt.file, /pool\/l2\//);
  assert.equal((l2.step as mls.msg.AIAgentStep).planning?.executionHost, 'client');
  assert.equal(added.some(intent => (intent.step as mls.msg.AIAgentStep).agentName === 'agentPlannerL1'), false);
  const status = intents.find((intent): intent is mls.msg.AgentIntentAddMessageAI => intent.type === 'add-message-ai');
  assert.match(String(status?.request.inputAI[1]?.content), /l1 pending \(agentPlannerL1 not available\)/);
  assert.match(String(status?.request.inputAI[1]?.content), /Requests stayed in the box/);
  assert.equal(added.some(intent => intent.step.planning?.planId === 'dispatch20-done'), true);
  assert.equal(added.some(intent => String(intent.step.planning?.planId || '').startsWith('loop30-wait-')), true);
  const loopDone = intents.find(
    (intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status' && intent.stepId === 30,
  );
  assert.equal(loopDone?.status, 'completed');
});

void test('dispatch20 afterPrompt fails an LLM reply', async () => {
  const { context, parent, step } = contextWith();
  const intents = await afterPlDispatchPromptStep(AGENT, context, parent, step, 1);
  assert.equal(intents[0]?.type, 'update-status');
  assert.equal((intents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
});
