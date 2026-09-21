/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/entry10/agentPlEntry.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { createPlAgentStep } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { PL_STEP_HOOKS } from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';
import {
  afterPlEntryPromptStep,
  beforePlEntryPromptStep,
} from '/_102035_/l2/agentPlannerL4/steps/entry10/agentPlEntry.js';
import { listPoolBox } from '/_102035_/l2/solution/pool.js';

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
      localStor: {
        setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; },
        listFolder: () => [],
        deleteFile: (file: Stored) => { file.status = 'deleted'; },
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

const BOTH_CONFIG = {
  workspaceDependencies: ['102047', '102020', '102035', '102021'],
  projects: {
    '102020': { root: '../mls-102020', type: 'lib' },
    '102021': { root: '../mls-102021', type: 'lib' },
  },
};

function contextWith(moduleName: string, extraFiles?: (host: Host) => void): {
  host: Host;
  context: mls.msg.ExecutionContext;
  parent: mls.msg.AIAgentStep;
  step: mls.msg.AIAgentStep;
} {
  const host = installHost();
  seed(host, { level: 4, folder: moduleName, shortName: 'module', extension: '.defs.ts' }, '');
  seed(
    host,
    { level: 4, folder: `${moduleName}/pipeline`, shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  extraFiles?.(host);
  const step = createPlAgentStep('entry10', moduleName);
  step.stepId = 10;
  const dispatch = createPlAgentStep('dispatch20', moduleName);
  dispatch.stepId = 20;
  const parent: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: `plan ${moduleName}`,
    status: 'waiting_human_input',
    nextSteps: [step, dispatch],
    agentName: 'agentPlannerL4',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  const context = {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: `@@agentPlannerL4 ${moduleName}` },
    task: {
      PK: 'task-1',
      iaCompressed: { nextSteps: [parent], longMemory: { moduleName } },
    },
    isTest: true,
  } as unknown as mls.msg.ExecutionContext;
  return { host, context, parent, step };
}

const AGENT = { agentName: 'agentPlannerL4', agentDescription: '', visibility: 'public' as const };

void test('entry10 hook is registered as deterministic', () => {
  assert.equal(PL_STEP_HOOKS.entry10?.beforePromptStep, beforePlEntryPromptStep);
  assert.equal(PL_STEP_HOOKS.entry10?.afterPromptStep, afterPlEntryPromptStep);
});

void test('entry10 completes and emits entry10-done when l5 already lists both planners', async () => {
  const { host, context, parent, step } = contextWith('mensalidadesAcademia', h => {
    seed(h, { level: 5, folder: '', shortName: 'config', extension: '.json' }, `${JSON.stringify(BOTH_CONFIG, null, 2)}\n`);
  });
  const raw = host.files[keyOf({ project: PROJECT, level: 5, folder: '', shortName: 'config', extension: '.json' })]?.content;
  const intents = await beforePlEntryPromptStep(AGENT, context, parent, step, 1);
  assert.equal(host.files[keyOf({ project: PROJECT, level: 5, folder: '', shortName: 'config', extension: '.json' })]?.content, raw);
  const added = intents.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(added[0]?.step.planning?.planId, 'entry10-done');
  const status = intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  assert.equal(status?.status, 'completed');
});

void test('entry10 wipes a full pool and still emits entry10-done', async () => {
  const message = {
    from: 'l4', to: 'l2', thread: 'mensalidadesAcademia-20260918103000', round: 1, mode: 'implement',
    subject: 'Changed artifacts of mensalidadesAcademia',
    artifacts: ['module.defs.ts'],
    body: 'Evaluate and dispatch. The recipient decides what to do with these artifacts.',
  };
  const { host, context, parent, step } = contextWith('mensalidadesAcademia', h => {
    seed(h, { level: 5, folder: '', shortName: 'config', extension: '.json' }, `${JSON.stringify(BOTH_CONFIG, null, 2)}\n`);
    seed(
      h,
      { level: 4, folder: 'mensalidadesAcademia/pool/l2', shortName: '20260918103000_mensalidadesAcademia-20260918103000_1', extension: '.json' },
      `${JSON.stringify(message, null, 2)}\n`,
    );
    seed(h, { level: 4, folder: 'mensalidadesAcademia/pool/l2/web', shortName: 'menu', extension: '.json' }, '{}\n');
  });
  const intents = await beforePlEntryPromptStep(AGENT, context, parent, step, 1);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l2').length, 0);
  const done = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && intent.step.planning?.planId === 'entry10-done');
  assert.ok(done);
  const result = JSON.parse(String((done?.step as mls.msg.AIResultStep).result)) as { poolWiped: string[] };
  assert.equal(result.poolWiped.length >= 2, true);
  const pipeline = host.files[keyOf({
    project: PROJECT, level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json',
  })];
  const state = JSON.parse(pipeline.content) as { poolWiped: string[] };
  assert.deepEqual(state.poolWiped, result.poolWiped);
  const status = intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status' && intent.stepId === 10);
  assert.match(String(status?.traceMsg), /wiped/);
});

void test('entry10 afterPrompt fails an LLM reply', async () => {
  const { context, parent, step } = contextWith('mensalidadesAcademia');
  const intents = await afterPlEntryPromptStep(AGENT, context, parent, step, 1);
  assert.equal(intents[0]?.type, 'update-status');
  assert.equal((intents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
});
