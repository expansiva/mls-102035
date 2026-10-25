/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/dispatch20/agentPlDispatch.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { createPlAgentStep, PL_L1_AGENT, PL_L2_AGENT, plRoundPlanId } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { PL_STEP_HOOKS } from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';
import {
  afterPlDispatchPromptStep,
  beforePlDispatchPromptStep,
} from '/_102035_/l2/agentPlannerL4/steps/dispatch20/agentPlDispatch.js';
import { effortRegistry } from '/_102035_/l2/agentPlannerL4/helpers/plEffort.js';
import { setModuleRoot } from '/_102035_/l2/solution/fs.js';
import type { EffortAnswer, EffortInput } from '/_102035_/l2/solution/poolPlan.js';
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

function contextWith(opts?: { l2Agent?: boolean; l1Agent?: boolean }): {
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
  if (opts?.l1Agent) {
    seed(host, { level: 2, folder: 'agentPlannerL1', shortName: 'agentPlannerL1', extension: '.ts' }, '');
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

void test('dispatch20 writes only pool/l2 and creates only L2 r1 — L1 waits for the box', async () => {
  const { context, parent, step } = contextWith({ l2Agent: true, l1Agent: true });
  const intents = await beforePlDispatchPromptStep(AGENT, context, parent, step, 1);
  const added = intents.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  const agents = added.filter(intent => intent.step.type === 'agent');
  assert.equal(agents.length, 1);
  assert.equal((agents[0].step as mls.msg.AIAgentStep).agentName, PL_L2_AGENT);
  assert.equal(agents[0].step.planning?.planId, plRoundPlanId('l2', 1));
  const l2Prompt = JSON.parse(String((agents[0].step as mls.msg.AIAgentStep).prompt)) as {
    moduleName: string; thread: string; file: string; candidate: string;
  };
  assert.equal(l2Prompt.moduleName, 'mensalidadesAcademia');
  assert.ok(l2Prompt.thread);
  assert.match(l2Prompt.file, /pool\/l2\//);
  assert.equal(l2Prompt.candidate, '');
  assert.equal(added.some(intent => (intent.step as mls.msg.AIAgentStep).agentName === PL_L1_AGENT), false);
  const done = added.find(intent => intent.step.planning?.planId === 'dispatch20-done');
  const result = JSON.parse(String((done?.step as mls.msg.AIResultStep).result)) as {
    moduleName: string; thread: string; artifactCount: number; invokeCount: number;
  };
  assert.equal(result.moduleName, 'mensalidadesAcademia');
  assert.ok(result.thread);
  assert.equal(result.artifactCount, 3);
  assert.equal(result.invokeCount, 1);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l1').length, 0);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l2').length, 1);
  const trace = await readPoolTrace('mensalidadesAcademia');
  assert.deepEqual(trace.map(line => line.outcome), ['delivered']);
  assert.deepEqual(trace.map(line => line.to), ['l2']);
});

void test('dispatch20 without planners writes only pool/l2 and creates no agent steps', async () => {
  const { context, parent, step } = contextWith();
  const intents = await beforePlDispatchPromptStep(AGENT, context, parent, step, 1);
  const added = intents.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.equal(added.some(intent => intent.step.type === 'agent'), false);
  const done = added.find(intent => intent.step.planning?.planId === 'dispatch20-done');
  const result = JSON.parse(String((done?.step as mls.msg.AIResultStep).result)) as { status: string };
  assert.match(result.status, /l2 pending \(agentPlannerL2 not available\)/);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l1').length, 0);
  assert.equal(listPoolBox('mensalidadesAcademia', 'l2').length, 1);
});

void test('dispatch20 afterPrompt fails an LLM reply', async () => {
  const { context, parent, step } = contextWith();
  const intents = await afterPlDispatchPromptStep(AGENT, context, parent, step, 1);
  assert.equal(intents[0]?.type, 'update-status');
  assert.equal((intents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
});

const REVISION = 'mensalidadesAcademia/pipeline/changes/c1/revisions/r1/l4';

const ARTIFACT_ITEM = {
  changeId: 'artifact:journeys/atendimento.defs.ts',
  kind: 'artifact',
  op: 'changed',
  entity: '',
  source: 'journeys/atendimento.defs.ts',
};

const RULE_ITEM = {
  changeId: 'rule:anotacao',
  kind: 'rule',
  op: 'changed',
  entity: 'Consulta',
  source: 'rules.defs.ts',
};

function seedEffortInputs(host: Host, items: readonly unknown[]): void {
  seed(host, { level: 5, folder: '', shortName: 'config', extension: '.json' }, `${JSON.stringify({
    workspaceDependencies: ['102020', '102021'],
  })}\n`);
  seed(host, { level: 5, folder: '', shortName: 'project', extension: '.json' }, `${JSON.stringify({
    masters: {
      frontend: { masterProject: 102020, agentFolder: 'web', runtimeProject: 1 },
      backend: { masterProject: 102021, agentFolder: 'api', runtimeProject: 2 },
    },
  })}\n`);
  seed(
    host,
    { level: 2, folder: 'mensalidadesAcademia/web/contracts', shortName: 'tela', extension: '.defs.ts' },
    'export const tela = {};\n',
  );
  seed(
    host,
    { level: 1, folder: 'mensalidadesAcademia', shortName: 'caso', extension: '.defs.ts' },
    'export const caso = {};\n',
  );
  seed(
    host,
    { level: 4, folder: `${REVISION}/pool/l2/web`, shortName: 'l4diff', extension: '.json' },
    `${JSON.stringify({ items })}\n`,
  );
}

async function changeEffortFor(items: readonly unknown[]): Promise<{
  status: string;
  request: { items: Array<{ changeId: string }> };
  merged: { abend: Array<{ item: string; master: { project: string }; reason: string }> };
  untouched: { count: number; sealHash: string };
}> {
  const { host, context, parent, step } = contextWith();
  setModuleRoot('mensalidadesAcademia', REVISION);
  try {
    seedEffortInputs(host, items);
    await beforePlDispatchPromptStep(AGENT, context, parent, step, 1);
    const stored = host.files[`${PROJECT}_4_${REVISION}/pool/l4/changeEffort.json`];
    assert.ok(stored, 'changeEffort.json was not written');
    return JSON.parse(stored.content) as {
      status: string;
      request: { items: Array<{ changeId: string }> };
      merged: { abend: Array<{ item: string; master: { project: string }; reason: string }> };
      untouched: { count: number; sealHash: string };
    };
  } finally {
    setModuleRoot('mensalidadesAcademia', null);
  }
}

function abendsCiting(file: Awaited<ReturnType<typeof changeEffortFor>>, changeId: string): string[] {
  return file.merged.abend
    .filter(row => row.item === changeId)
    .map(row => `${row.master.project}: ${row.reason}`);
}

void test('dispatch20 blocks a journey artifact the masters do not compute', async () => {
  const file = await changeEffortFor([ARTIFACT_ITEM]);
  assert.equal(file.status, 'blocked');
  assert.deepEqual(abendsCiting(file, ARTIFACT_ITEM.changeId).sort(), [
    '102020: v1 computes only rule changed; artifact changed is not handled',
    '102021: kind/op fora da v1: artifact changed',
  ]);
});

void test('dispatch20 counts module files no answer cites', async () => {
  const cited = 'l2/mensalidadesAcademia/web/contracts/tela.defs.ts';
  const answer = (input: EffortInput): EffortAnswer => ({
    master: { project: '102020', kind: 'l2', device: 'web' },
    item: input.item.changeId,
    status: 'computed',
    create: [],
    regenerateDefs: [],
    materialize: [{ kind: 'page', id: 'tela', path: cited }],
    remove: [],
    runAgents: [],
    contract: 'keep',
  });
  effortRegistry['102020'] = { describeEffort: answer };
  effortRegistry['102021'] = { describeEffort: (input) => ({ ...answer(input), master: { project: '102021', kind: 'l1', device: 'web' }, materialize: [] }) };
  try {
    const file = await changeEffortFor([RULE_ITEM]);
    assert.equal(file.untouched.count, 1);
    assert.match(file.untouched.sealHash, /^sha256:[0-9a-f]{64}$/);
  } finally {
    delete effortRegistry['102020'];
    delete effortRegistry['102021'];
  }
});

function computedAnswer(input: EffortInput, project: string, kind: 'l1' | 'l2'): EffortAnswer {
  return {
    master: { project, kind, device: 'web' },
    item: input.item.changeId,
    status: 'computed',
    create: [],
    regenerateDefs: [],
    materialize: kind === 'l2'
      ? [{ kind: 'page', id: 'tela', path: 'l2/mensalidadesAcademia/web/contracts/tela.defs.ts' }]
      : [],
    remove: [],
    runAgents: [],
    contract: 'keep',
  };
}

void test('dispatch20 asks only the master that requests a model and joins both answers', async () => {
  let described = 0;
  effortRegistry['102020'] = {
    describeEffort: () => { described += 1; throw new Error('describeEffort should not run'); },
    effortPrompt: () => ({ prompt: 'which page', schema: { type: 'object' } }),
    finishEffort: (input, output) => ({
      ...computedAnswer(input, '102020', 'l2'),
      materialize: [{
        kind: 'page',
        id: String((output as { page?: string }).page || ''),
        path: 'l2/mensalidadesAcademia/web/contracts/tela.defs.ts',
      }],
    }),
  };
  effortRegistry['102021'] = { describeEffort: input => computedAnswer(input, '102021', 'l1') };
  const { host, context, parent, step } = contextWith();
  setModuleRoot('mensalidadesAcademia', REVISION);
  try {
    seedEffortInputs(host, [RULE_ITEM]);
    const opened = await beforePlDispatchPromptStep(AGENT, context, parent, step, 1);
    assert.equal(host.files[`${PROJECT}_4_${REVISION}/pool/l4/changeEffort.json`], undefined);
    const added = opened.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
    const child = added?.step as mls.msg.AIAgentStep;
    assert.equal(child.planning?.planId, 'dispatch20-effort-0');
    const ready = await beforePlDispatchPromptStep(AGENT, context, parent, child, 2);
    const prompt = ready.find((intent): intent is mls.msg.AgentIntentPromptReady => intent.type === 'prompt_ready');
    assert.equal(prompt?.humanPrompt, 'which page');
    assert.equal(prompt?.systemPrompt?.split('\n')[0], '<!-- modelType: reasoning -->');
    assert.equal(prompt?.tools?.[0]?.function.name, 'submitEffort');
    assert.deepEqual(prompt?.tools?.[0]?.function.parameters, { type: 'object' });
    assert.deepEqual(prompt?.toolChoice, { type: 'function', function: { name: 'submitEffort' } });
    child.interaction = {
      input: [],
      cost: 0,
      trace: [],
      payload: [{
        function: { name: 'submitEffort', arguments: JSON.stringify({ page: 'tela' }) },
      } as unknown as mls.msg.AIResultStep],
    };
    await afterPlDispatchPromptStep(AGENT, context, parent, child, 3);
    const stored = host.files[`${PROJECT}_4_${REVISION}/pool/l4/changeEffort.json`];
    assert.ok(stored);
    const file = JSON.parse(stored.content) as { perItem: Array<{ answers: EffortAnswer[] }> };
    assert.deepEqual(file.perItem[0].answers.map(answer => answer.master.project), ['102020', '102021']);
    assert.equal(file.perItem[0].answers[0].materialize[0].id, 'tela');
    assert.equal(file.perItem[0].answers[1].status, 'computed');
    assert.equal(described, 0);
  } finally {
    delete effortRegistry['102020'];
    delete effortRegistry['102021'];
    setModuleRoot('mensalidadesAcademia', null);
  }
});

void test('dispatch20 turns a missing model reply into that master abend and still joins the file', async () => {
  effortRegistry['102020'] = {
    describeEffort: input => computedAnswer(input, '102020', 'l2'),
    effortPrompt: () => ({ prompt: 'which page', schema: { type: 'object' } }),
    finishEffort: input => computedAnswer(input, '102020', 'l2'),
  };
  effortRegistry['102021'] = { describeEffort: input => computedAnswer(input, '102021', 'l1') };
  const { host, context, parent, step } = contextWith();
  setModuleRoot('mensalidadesAcademia', REVISION);
  try {
    seedEffortInputs(host, [RULE_ITEM]);
    const opened = await beforePlDispatchPromptStep(AGENT, context, parent, step, 1);
    const added = opened.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
    const child = added?.step as mls.msg.AIAgentStep;
    await afterPlDispatchPromptStep(AGENT, context, parent, child, 2);
    const stored = host.files[`${PROJECT}_4_${REVISION}/pool/l4/changeEffort.json`];
    assert.ok(stored);
    const file = JSON.parse(stored.content) as {
      status: string;
      perItem: Array<{ answers: EffortAnswer[] }>;
    };
    assert.equal(file.status, 'blocked');
    assert.match(file.perItem[0].answers[0].abend?.reason || '', /model unavailable/);
    assert.equal(file.perItem[0].answers[1].status, 'computed');
  } finally {
    delete effortRegistry['102020'];
    delete effortRegistry['102021'];
    setModuleRoot('mensalidadesAcademia', null);
  }
});

void test('dispatch20 blocks a rule plus an artifact — no partial accept', async () => {
  const file = await changeEffortFor([RULE_ITEM, ARTIFACT_ITEM]);
  assert.equal(file.status, 'blocked');
  assert.deepEqual(file.request.items.map(item => item.changeId), [RULE_ITEM.changeId, ARTIFACT_ITEM.changeId]);
  assert.deepEqual(abendsCiting(file, ARTIFACT_ITEM.changeId).sort(), [
    '102020: v1 computes only rule changed; artifact changed is not handled',
    '102021: kind/op fora da v1: artifact changed',
  ]);
});
