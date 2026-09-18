/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/loop30/agentPlLoop.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { createPlAgentStep, createPlLoopWaitStep, PL_L2_AGENT } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { PL_STEP_HOOKS } from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';
import {
  afterPlLoopPromptStep,
  beforePlLoopPromptStep,
} from '/_102035_/l2/agentPlannerL4/steps/loop30/agentPlLoop.js';
import { displayPath } from '/_102035_/l2/solution/fs.js';
import { listPoolBox, writePoolMessage } from '/_102035_/l2/solution/pool.js';

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

function contextWith(step: mls.msg.AIAgentStep): {
  host: Host;
  context: mls.msg.ExecutionContext;
  parent: mls.msg.AIAgentStep;
} {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  seed(
    host,
    { level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json' },
    `${JSON.stringify(COMPLETE_PIPELINE, null, 2)}\n`,
  );
  step.stepId = 30;
  const parent: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: 'plan mensalidadesAcademia',
    status: 'waiting_human_input',
    nextSteps: [step],
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
  return { host, context, parent };
}

const AGENT = { agentName: 'agentPlannerL4', agentDescription: '', visibility: 'public' as const };
const THREAD = 'mensalidadesAcademia-20260918103000';
const AT = new Date(Date.UTC(2026, 8, 18, 10, 30, 0));

void test('loop30 hook is registered as deterministic', () => {
  assert.equal(PL_STEP_HOOKS.loop30?.beforePromptStep, beforePlLoopPromptStep);
  assert.equal(PL_STEP_HOOKS.loop30?.afterPromptStep, afterPlLoopPromptStep);
});

void test('loop30 stops when L1 is absent and leaves the message in the box', async () => {
  const step = createPlAgentStep('loop30', 'mensalidadesAcademia');
  const { host, context, parent } = contextWith(step);
  const msg = {
    from: 'l4', to: 'l1', thread: THREAD, round: 1, mode: 'implement',
    subject: 'Changed artifacts of mensalidadesAcademia',
    artifacts: ['module.defs.ts'],
    body: 'Evaluate and dispatch. The recipient decides what to do with these artifacts.',
  };
  const written = await writePoolMessage('mensalidadesAcademia', msg, AT);
  const pipeline = host.files[keyOf({
    project: PROJECT, level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json',
  })];
  const state = JSON.parse(pipeline.content) as { pool?: unknown[] };
  state.pool = [{
    at: AT.toISOString(), file: displayPath(written), from: 'l4', to: 'l1',
    thread: THREAD, round: 1, mode: 'implement', outcome: 'delivered',
  }];
  pipeline.content = `${JSON.stringify(state, null, 2)}\n`;

  const intents = await beforePlLoopPromptStep(AGENT, context, parent, step, 1);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l1').length, 1);
  const added = intents.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  const done = added.find(intent => intent.step.planning?.planId === 'loop30-done');
  assert.match(String((done?.step as mls.msg.AIResultStep).result), /l1 pending \(agentPlannerL1 not available\)/);
  assert.match(String((done?.step as mls.msg.AIResultStep).result), /Requests stayed in the box/);
  assert.equal(added.some(intent => intent.step.planning?.planId === 'loop30-done'), true);
  assert.equal(added.some(intent => (intent.step as mls.msg.AIAgentStep).agentName === 'agentPlannerL1'), false);
});

void test('loop30 at round 3 records disputed and does not delete', async () => {
  const step = createPlLoopWaitStep('mensalidadesAcademia', ['pool-l2-x-3'], 3);
  const { host, context, parent } = contextWith(step);
  const msg = {
    from: 'l4', to: 'l2', thread: THREAD, round: 3, mode: 'implement',
    subject: 'Changed artifacts of mensalidadesAcademia',
    artifacts: ['module.defs.ts'],
    body: 'Evaluate and dispatch. The recipient decides what to do with these artifacts.',
  };
  const written = await writePoolMessage('mensalidadesAcademia', msg, AT);
  const path = displayPath(written);
  const pipeline = host.files[keyOf({
    project: PROJECT, level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json',
  })];
  const state = JSON.parse(pipeline.content) as { pool?: unknown[] };
  state.pool = [1, 2, 3].map(round => ({
    at: AT.toISOString(),
    file: round === 3 ? path : `l4/mensalidadesAcademia/pool/l2/prior_${round}.json`,
    from: 'l4', to: 'l2', thread: THREAD, round, mode: 'implement', outcome: 'delivered',
  }));
  pipeline.content = `${JSON.stringify(state, null, 2)}\n`;

  const before = listPoolBox('mensalidadesAcademia', 'l2').length;
  const intents = await beforePlLoopPromptStep(AGENT, context, parent, step, 1);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l2').length, before);
  const done = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && intent.step.planning?.planId === 'loop30-done');
  assert.match(String((done?.step as mls.msg.AIResultStep).result), /disputed/);
  const nextPipeline = JSON.parse(pipeline.content) as { pool: Array<{ outcome: string }> };
  assert.equal(nextPipeline.pool.some(line => line.outcome === 'disputed'), true);
});

void test('loop30 does not invoke a present L2 and still completes', async () => {
  const step = createPlAgentStep('loop30', 'mensalidadesAcademia');
  const { host, context, parent } = contextWith(step);
  seed(host, { level: 2, folder: 'agentPlannerL2', shortName: PL_L2_AGENT, extension: '.ts' }, '');
  const msg = {
    from: 'l4', to: 'l2', thread: THREAD, round: 1, mode: 'implement',
    subject: 'Changed artifacts of mensalidadesAcademia',
    artifacts: ['module.defs.ts'],
    body: 'Evaluate and dispatch. The recipient decides what to do with these artifacts.',
  };
  await writePoolMessage('mensalidadesAcademia', msg, AT);

  const intents = await beforePlLoopPromptStep(AGENT, context, parent, step, 1);
  const added = intents.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(added.some(intent => intent.step.type === 'agent'), false);
  assert.equal(added.some(intent => (intent.step as mls.msg.AIAgentStep).agentName === PL_L2_AGENT), false);
  assert.equal(added.some(intent => String(intent.step.planning?.planId || '').startsWith('loop30-wait-')), false);
  const done = added.find(intent => intent.step.planning?.planId === 'loop30-done');
  const result = JSON.parse(String((done?.step as mls.msg.AIResultStep).result)) as {
    l1Count: number; l2Count: number; completedStep: string;
  };
  assert.equal(result.completedStep, 'loop30');
  assert.equal(result.l2Count, 1);
  assert.equal(result.l1Count, 0);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l2').length, 1);
});

void test('loop30 afterPrompt fails an LLM reply', async () => {
  const step = createPlAgentStep('loop30', 'mensalidadesAcademia');
  const { context, parent } = contextWith(step);
  const intents = await afterPlLoopPromptStep(AGENT, context, parent, step, 1);
  assert.equal(intents[0]?.type, 'update-status');
  assert.equal((intents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
});
