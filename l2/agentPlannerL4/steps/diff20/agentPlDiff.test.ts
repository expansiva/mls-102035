/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/diff20/agentPlDiff.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { createPlAgentStep } from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { PL_STEP_HOOKS } from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';
import {
  afterPlDiffPromptStep,
  beforePlDiffPromptStep,
} from '/_102035_/l2/agentPlannerL4/steps/diff20/agentPlDiff.js';
import { setModuleRoot } from '/_102035_/l2/solution/fs.js';

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

const AGENT = { agentName: 'agentPlannerL4', agentDescription: '', visibility: 'public' as const };

void test('diff20 hook is registered as deterministic', () => {
  assert.equal(PL_STEP_HOOKS.diff20?.beforePromptStep, beforePlDiffPromptStep);
  assert.equal(PL_STEP_HOOKS.diff20?.afterPromptStep, afterPlDiffPromptStep);
});

void test('diff20 without /candidate writes empty l4diff.json and emits diff20-done', async () => {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  const step = createPlAgentStep('diff20', 'mensalidadesAcademia');
  step.stepId = 15;
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
    task: { PK: 'task-1', iaCompressed: { nextSteps: [parent], longMemory: { moduleName: 'mensalidadesAcademia' } } },
    isTest: true,
  } as unknown as mls.msg.ExecutionContext;
  try {
    setModuleRoot('mensalidadesAcademia', null);
    const intents = await beforePlDiffPromptStep(AGENT, context, parent, step, 1);
    const done = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
      intent.type === 'add-step' && intent.step.planning?.planId === 'diff20-done');
    assert.ok(done);
    const result = JSON.parse(String((done?.step as mls.msg.AIResultStep).result)) as { itemCount: number; nextStep: string };
    assert.equal(result.itemCount, 0);
    assert.equal(result.nextStep, 'dispatch20');
    const written = host.files[keyOf({
      project: PROJECT, level: 4, folder: 'mensalidadesAcademia/pool/l2/web', shortName: 'l4diff', extension: '.json',
    })];
    assert.equal(JSON.parse(written.content).items.length, 0);
  } finally {
    setModuleRoot('mensalidadesAcademia', null);
  }
});

void test('diff20 afterPrompt fails an LLM reply', async () => {
  const host = installHost();
  seed(host, { level: 4, folder: 'mensalidadesAcademia', shortName: 'module', extension: '.defs.ts' }, '');
  const step = createPlAgentStep('diff20', 'mensalidadesAcademia');
  step.stepId = 15;
  const parent: mls.msg.AIAgentStep = {
    type: 'agent', stepId: 1, interaction: null, stepTitle: 'plan', status: 'waiting_human_input',
    nextSteps: [step], agentName: 'agentPlannerL4', prompt: '', rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  const context = {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '@@agentPlannerL4 mensalidadesAcademia' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [parent], longMemory: { moduleName: 'mensalidadesAcademia' } } },
    isTest: true,
  } as unknown as mls.msg.ExecutionContext;
  const intents = await afterPlDiffPromptStep(AGENT, context, parent, step, 1);
  assert.equal(intents[0]?.type, 'update-status');
  assert.equal((intents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
});
