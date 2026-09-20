/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/dispatch20/agentPlDispatch.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { createPlAgentStep } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { PL_STEP_HOOKS } from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';
import {
  afterPlDispatchPromptStep,
  beforePlDispatchPromptStep,
} from '/_102035_/l2/agentPlannerL4/steps/dispatch20/agentPlDispatch.js';
import { listPoolBox, readPoolTrace } from '/_102035_/l2/solution/pool.js';

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

void test('dispatch20 writes the boxes, traces them, and does not create planner steps', async () => {
  const { context, parent, step } = contextWith({ l2Agent: true });
  const intents = await beforePlDispatchPromptStep(AGENT, context, parent, step, 1);
  const added = intents.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(added.length, 1);
  assert.equal(added[0]?.step.type, 'result');
  assert.equal(added.some(intent => intent.step.type === 'agent'), false);
  assert.equal(added.some(intent => String(intent.step.planning?.planId || '').startsWith('loop30-wait-')), false);
  assert.equal(intents.some(intent => intent.type === 'update-status' && (intent as mls.msg.AgentIntentUpdateStatus).stepId === 30), false);
  const done = added.find(intent => intent.step.planning?.planId === 'dispatch20-done');
  const result = JSON.parse(String((done?.step as mls.msg.AIResultStep).result)) as {
    moduleName: string; thread: string; artifactCount: number; status: string;
  };
  assert.equal(result.moduleName, 'mensalidadesAcademia');
  assert.ok(result.thread);
  assert.equal(result.artifactCount, 1);
  assert.match(result.status, /pool\/l1 and pool\/l2 pending for the planners/);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l1').length, 1);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l2').length, 1);
  const trace = await readPoolTrace('mensalidadesAcademia');
  assert.deepEqual(trace.map(line => line.outcome), ['delivered', 'delivered']);
  assert.deepEqual(trace.map(line => line.to), ['l2', 'l1']);
});

void test('dispatch20 afterPrompt fails an LLM reply', async () => {
  const { context, parent, step } = contextWith();
  const intents = await afterPlDispatchPromptStep(AGENT, context, parent, step, 1);
  assert.equal(intents[0]?.type, 'update-status');
  assert.equal((intents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
});
