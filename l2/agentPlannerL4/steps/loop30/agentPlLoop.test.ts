/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/loop30/agentPlLoop.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPlAgentStep,
  createPlInvokeStep,
  createPlLoopWaitStep,
  PL_L1_AGENT,
  PL_L2_AGENT,
  plRoundPlanId,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
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

function contextWith(step: mls.msg.AIAgentStep, extras: mls.msg.AIPayload[] = []): {
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
    nextSteps: [...extras, step],
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

function plannerChild(
  agentName: string,
  planId: string,
  status: mls.msg.AIStepStatus,
): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: planId,
    status,
    nextSteps: [],
    agentName,
    prompt: '{}',
    rags: [],
    planning: { planId, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
}

function dispatchDone(): mls.msg.AIResultStep {
  return {
    type: 'result',
    stepId: 21,
    interaction: null,
    stepTitle: 'Dispatch done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({ moduleName: 'mensalidadesAcademia', thread: THREAD, completedStep: 'dispatch20' }),
    planning: { planId: 'dispatch20-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  };
}

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

void test('loop30 does not create L1 r1 until the l2→l1 message exists, then uses the real file', async () => {
  const wait = createPlLoopWaitStep('mensalidadesAcademia', [plRoundPlanId('l2', 1)], 1);
  const l2 = createPlInvokeStep({
    agentName: PL_L2_AGENT, moduleName: 'mensalidadesAcademia', thread: THREAD, file: 'x',
    planId: plRoundPlanId('l2', 1),
  });
  l2.status = 'completed';
  const menu = plannerChild(PL_L2_AGENT, 'menu20', 'waiting_human_input');
  const { host, context, parent } = contextWith(wait, [dispatchDone(), l2, menu]);
  seed(host, { level: 2, folder: 'agentPlannerL2', shortName: PL_L2_AGENT, extension: '.ts' }, '');
  seed(host, { level: 2, folder: 'agentPlannerL1', shortName: PL_L1_AGENT, extension: '.ts' }, '');

  const empty = await beforePlLoopPromptStep(AGENT, context, parent, wait, 1);
  const emptyAdded = empty.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(emptyAdded.some(intent => intent.step.planning?.planId === plRoundPlanId('l1', 1)), false);
  assert.equal(empty.some(intent => intent.type === 'update-status' && (intent as mls.msg.AgentIntentUpdateStatus).status === 'failed'), false);
  assert.equal(emptyAdded.some(intent => String(intent.step.planning?.planId || '').startsWith('loop30-wait-')), true);

  const wait2 = createPlLoopWaitStep('mensalidadesAcademia', ['menu20'], 2);
  menu.status = 'completed';
  const needs = plannerChild(PL_L2_AGENT, 'needs30', 'completed');
  const { host: host2, context: context2, parent: parent2 } = contextWith(wait2, [dispatchDone(), l2, menu, needs]);
  seed(host2, { level: 2, folder: 'agentPlannerL2', shortName: PL_L2_AGENT, extension: '.ts' }, '');
  seed(host2, { level: 2, folder: 'agentPlannerL1', shortName: PL_L1_AGENT, extension: '.ts' }, '');
  seed(host2, { level: 4, folder: 'mensalidadesAcademia/pool/l2/web', shortName: 'menu', extension: '.json' }, '{}\n');
  const written = await writePoolMessage('mensalidadesAcademia', {
    from: 'l2', to: 'l1', thread: THREAD, round: 1, mode: 'implement',
    subject: 'needs.json for the module',
    artifacts: ['pool/l1/web/needs.json'],
    body: 'Needs from the L2 menu.',
  }, AT);
  const path = displayPath(written);

  const filled = await beforePlLoopPromptStep(AGENT, context2, parent2, wait2, 1);
  const filledAdded = filled.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  const l1 = filledAdded.find(intent => intent.step.planning?.planId === plRoundPlanId('l1', 1));
  assert.ok(l1);
  assert.equal((l1?.step as mls.msg.AIAgentStep).agentName, PL_L1_AGENT);
  const prompt = JSON.parse(String((l1?.step as mls.msg.AIAgentStep).prompt)) as {
    moduleName: string; thread: string; file: string;
  };
  assert.equal(prompt.moduleName, 'mensalidadesAcademia');
  assert.equal(prompt.thread, THREAD);
  assert.equal(prompt.file, path);
  assert.notEqual(prompt.file, '');
});

void test('loop30 fails the task when a completed planner produced no output', async () => {
  const wait = createPlLoopWaitStep('mensalidadesAcademia', [plRoundPlanId('l2', 1)], 1);
  const l2 = createPlInvokeStep({
    agentName: PL_L2_AGENT, moduleName: 'mensalidadesAcademia', thread: THREAD, file: 'x',
    planId: plRoundPlanId('l2', 1),
  });
  l2.status = 'completed';
  const { host, context, parent } = contextWith(wait, [dispatchDone(), l2]);
  seed(host, { level: 2, folder: 'agentPlannerL2', shortName: PL_L2_AGENT, extension: '.ts' }, '');
  seed(host, { level: 2, folder: 'agentPlannerL1', shortName: PL_L1_AGENT, extension: '.ts' }, '');

  const intents = await beforePlLoopPromptStep(AGENT, context, parent, wait, 1);
  assert.equal(intents[0]?.type, 'update-status');
  assert.equal((intents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
  assert.equal((intents[0] as mls.msg.AgentIntentUpdateStatus).traceMsg, 'l2-r1 ran without output');
  const pipeline = host.files[keyOf({
    project: PROJECT, level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json',
  })];
  const state = JSON.parse(pipeline.content) as { plOrchestration: Array<{ l2: string }> };
  assert.equal(state.plOrchestration[0]?.l2, 'no-output');
});

void test('loop30 after L1 r1 creates L2 effort r1 with the real l1→l2 file (ramification B)', async () => {
  const wait = createPlLoopWaitStep('mensalidadesAcademia', [plRoundPlanId('l1', 1)], 1);
  const l1Step = createPlInvokeStep({
    agentName: PL_L1_AGENT,
    moduleName: 'mensalidadesAcademia',
    thread: THREAD,
    file: '',
    planId: plRoundPlanId('l1', 1),
    stepTitle: 'L1 r1',
  });
  l1Step.status = 'completed';
  const { host, context, parent } = contextWith(wait, [dispatchDone(), l1Step]);
  seed(host, { level: 2, folder: 'agentPlannerL2', shortName: PL_L2_AGENT, extension: '.ts' }, '');
  seed(host, { level: 2, folder: 'agentPlannerL1', shortName: PL_L1_AGENT, extension: '.ts' }, '');
  const msg = {
    from: 'l1', to: 'l2', thread: THREAD, round: 1, mode: 'implement',
    subject: 'backend.json for the module',
    artifacts: ['pool/l2/web/backend.json'],
    body: 'Effort from the backend plan.',
  };
  const written = await writePoolMessage('mensalidadesAcademia', msg, AT);
  const path = displayPath(written);

  const intents = await beforePlLoopPromptStep(AGENT, context, parent, wait, 1);
  const added = intents.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  const effort = added.find(intent => intent.step.planning?.planId === plRoundPlanId('effort', 1));
  assert.ok(effort);
  assert.equal((effort?.step as mls.msg.AIAgentStep).agentName, PL_L2_AGENT);
  const prompt = JSON.parse(String((effort?.step as mls.msg.AIAgentStep).prompt)) as {
    moduleName: string; thread: string; file: string;
  };
  assert.equal(prompt.moduleName, 'mensalidadesAcademia');
  assert.equal(prompt.thread, THREAD);
  assert.equal(prompt.file, path);
  assert.notEqual(prompt.file, '');
  assert.equal(added.some(intent => String(intent.step.planning?.planId || '').startsWith('loop30-wait-')), true);
  assert.equal(added.some(intent => intent.step.planning?.planId === 'loop30-done'), false);
});

void test('loop30 with no new round-2 message completes with the orchestration table', async () => {
  const wait = createPlLoopWaitStep('mensalidadesAcademia', [plRoundPlanId('effort', 1)], 2);
  const l2 = createPlInvokeStep({
    agentName: PL_L2_AGENT, moduleName: 'mensalidadesAcademia', thread: THREAD, file: 'x',
    planId: plRoundPlanId('l2', 1),
  });
  l2.status = 'completed';
  const l1 = createPlInvokeStep({
    agentName: PL_L1_AGENT, moduleName: 'mensalidadesAcademia', thread: THREAD, file: '',
    planId: plRoundPlanId('l1', 1),
  });
  l1.status = 'completed';
  const effort = createPlInvokeStep({
    agentName: PL_L2_AGENT, moduleName: 'mensalidadesAcademia', thread: THREAD, file: 'y',
    planId: plRoundPlanId('effort', 1),
  });
  effort.status = 'completed';
  const { host, context, parent } = contextWith(wait, [dispatchDone(), l2, l1, effort]);
  seed(host, { level: 2, folder: 'agentPlannerL2', shortName: PL_L2_AGENT, extension: '.ts' }, '');
  seed(host, { level: 2, folder: 'agentPlannerL1', shortName: PL_L1_AGENT, extension: '.ts' }, '');
  seed(host, { level: 4, folder: 'mensalidadesAcademia/pool/l2/web', shortName: 'menu', extension: '.json' }, '{}\n');
  seed(host, { level: 4, folder: 'mensalidadesAcademia/pool/l2/web', shortName: 'backend', extension: '.json' }, '{}\n');
  const needs = await writePoolMessage('mensalidadesAcademia', {
    from: 'l2', to: 'l1', thread: THREAD, round: 1, mode: 'implement',
    subject: 'needs', artifacts: ['pool/l1/web/needs.json'], body: 'needs',
  }, AT);
  const pipelineTrace = host.files[keyOf({
    project: PROJECT, level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json',
  })];
  const traced = JSON.parse(pipelineTrace.content) as { pool?: unknown[] };
  traced.pool = [{
    at: AT.toISOString(), file: displayPath(needs), from: 'l2', to: 'l1',
    thread: THREAD, round: 1, mode: 'implement', outcome: 'delivered',
  }];
  pipelineTrace.content = `${JSON.stringify(traced, null, 2)}\n`;

  const intents = await beforePlLoopPromptStep(AGENT, context, parent, wait, 1);
  const added = intents.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(added.some(intent => intent.step.planning?.planId === plRoundPlanId('l2', 2)), false);
  const done = added.find(intent => intent.step.planning?.planId === 'loop30-done');
  const result = JSON.parse(String((done?.step as mls.msg.AIResultStep).result)) as {
    table: Array<{ round: number; l2: string; l1: string; effort: string }>;
  };
  assert.deepEqual(result.table[0], { round: 1, l2: 'done', l1: 'done', effort: 'done' });
  const pipeline = host.files[keyOf({
    project: PROJECT, level: 4, folder: 'mensalidadesAcademia/pipeline', shortName: 'pipeline', extension: '.json',
  })];
  const state = JSON.parse(pipeline.content) as { plOrchestration: unknown };
  assert.deepEqual(state.plOrchestration, result.table);
});

void test('loop30 fails the task when a planner step failed', async () => {
  const wait = createPlLoopWaitStep('mensalidadesAcademia', [plRoundPlanId('l2', 1)], 1);
  const l2 = createPlInvokeStep({
    agentName: PL_L2_AGENT, moduleName: 'mensalidadesAcademia', thread: THREAD, file: 'x',
    planId: plRoundPlanId('l2', 1),
  });
  l2.status = 'failed';
  const { context, parent } = contextWith(wait, [l2]);
  const intents = await beforePlLoopPromptStep(AGENT, context, parent, wait, 1);
  assert.equal(intents[0]?.type, 'update-status');
  assert.equal((intents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
  assert.match(String((intents[0] as mls.msg.AgentIntentUpdateStatus).traceMsg), /l2-r1 failed/);
});

void test('loop30 afterPrompt fails an LLM reply', async () => {
  const step = createPlAgentStep('loop30', 'mensalidadesAcademia');
  const { context, parent } = contextWith(step);
  const intents = await afterPlLoopPromptStep(AGENT, context, parent, step, 1);
  assert.equal(intents[0]?.type, 'update-status');
  assert.equal((intents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
});
