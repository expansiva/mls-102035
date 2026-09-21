/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/review20/agentReview20.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReviewEntrySnapshot, ReviewInventories } from '/_102035_/l2/agentReviewSolution/helpers/entrySnapshot.js';
import { buildReviewTaskState } from '/_102035_/l2/agentReviewSolution/helpers/reviewTaskState.js';
import { REVIEW20_SCHEMA_VERSION } from '/_102035_/l2/agentReviewSolution/steps/review20/review20.js';
import {
  afterReview20PromptStep,
  beforeReview20PromptStep,
  createReview20Step,
  MAX_REVIEW20_PROMPT_CHARS,
  parseReview20PrivateState,
  REVIEW20_TOOL_NAME,
  type Review20Runtime,
} from './agentReview20.js';

const invocation = {
  project: 102047,
  moduleName: 'agendaClinica',
  originalL4Path: 'l4/agendaClinica/pipeline/releases/base-1/l4',
  temporaryL4Path: 'l4/agendaClinica/tobe/plan',
  request: 'Change the title.',
  baseId: 'base-1',
  expectedRevisionId: 'rev-1',
};
const snapshot: ReviewEntrySnapshot = {
  project: invocation.project,
  moduleName: invocation.moduleName,
  originalL4Path: invocation.originalL4Path,
  temporaryL4Path: invocation.temporaryL4Path,
  request: invocation.request,
  baseId: invocation.baseId,
  changeId: 'change-1',
  revisionId: 'rev-1',
  requestRevision: 3,
  originalHashes: { 'module.defs.ts': 'sha256:base' },
  candidateHashes: { 'module.defs.ts': 'sha256:candidate' },
  changedPaths: ['module.defs.ts'],
};
const inventories: ReviewInventories = {
  snapshot,
  persistedRequest: { revision: 3, request: invocation.request },
  base: { 'module.defs.ts': { schemaVersion: 'v1', moduleName: 'agendaClinica', title: 'Old title' } },
  candidate: { 'module.defs.ts': { schemaVersion: 'v1', moduleName: 'agendaClinica', title: 'Old title' } },
};
const schema = {
  type: 'object', additionalProperties: false,
  required: ['schemaVersion', 'decision', 'clarification', 'operations'],
  properties: {},
};

function runtime(loaded: ReviewInventories = inventories): Review20Runtime {
  return {
    load: async () => loaded,
    readPrompt: async () => 'Restricted system prompt.',
    readSchema: async () => schema,
  };
}

async function context(frozen: ReviewEntrySnapshot = snapshot): Promise<mls.msg.ExecutionContext> {
  const taskState = await buildReviewTaskState(frozen, {
    v3: { registryModuleNames: ['agendaClinica'] },
    v2: { registryModuleNames: ['agendaClinica'] },
  }, 0);
  return {
    message: { orderAt: 'order', threadId: 'thread' },
    task: { PK: 'task', iaCompressed: { longMemory: {
      entrySnapshot: JSON.stringify(frozen), reviewPrivateState: JSON.stringify(taskState),
    } } },
    isTest: true,
  } as unknown as mls.msg.ExecutionContext;
}

function parent(): mls.msg.AIAgentStep {
  return { type: 'agent', agentName: 'agentReviewSolution', stepId: 10, status: 'in_progress', interaction: null, nextSteps: [], rags: [] };
}

function step(payload?: unknown): mls.msg.AIAgentStep {
  return {
    ...createReview20Step(invocation),
    stepId: 20,
    status: payload === undefined ? 'waiting_human_input' : 'waiting_after_prompt',
    interaction: payload === undefined ? null : { input: [], cost: 0, trace: [], payload: [payload as mls.msg.AIPayload] },
  };
}

async function withProject<T>(fn: () => Promise<T>): Promise<T> {
  const previous = (globalThis as { mls?: unknown }).mls;
  (globalThis as { mls?: unknown }).mls = { actualProject: 102047 };
  try { return await fn(); }
  finally { (globalThis as { mls?: unknown }).mls = previous; }
}

test('review20 prepares exactly one structured model call from the persisted private snapshot', async () => withProject(async () => {
  const intents = await beforeReview20PromptStep(await context(), parent(), step(), 7, runtime());
  assert.equal(intents.length, 1);
  assert.equal(intents[0].type, 'prompt_ready');
  const ready = intents[0] as mls.msg.AgentIntentPromptReady;
  assert.equal(ready.tools?.length, 1);
  assert.equal(ready.tools?.[0].function.name, REVIEW20_TOOL_NAME);
  assert.equal((ready.toolChoice as { function: { name: string } }).function.name, REVIEW20_TOOL_NAME);
  assert.match(ready.humanPrompt, /"persistedRequest":"Change the title\."/u);
  assert.equal(ready.args, createReview20Step(invocation).prompt);
}));

test('review20 validates the model result and keeps the proposal only in a bounded private result step', async () => withProject(async () => {
  const response = {
    type: 'flexible',
    result: {
      schemaVersion: REVIEW20_SCHEMA_VERSION,
      decision: 'apply',
      clarification: '',
      operations: [{
        artifactPath: 'module.defs.ts', op: 'replace', pointer: '/title', basis: 'base-unchanged',
        expectedJson: '"Old title"', valueJson: '"New title"', reason: 'The persisted request explicitly changes the title.',
      }],
    },
  };
  const intents = await afterReview20PromptStep(await context(), parent(), step(response), 8, runtime());
  assert.deepEqual(intents.map(intent => intent.type), ['add-step', 'add-step', 'update-status']);
  const result = (intents[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIResultStep;
  assert.equal(result.planning?.planId, 'review20-private-result');
  const reconcile = (intents[1] as mls.msg.AgentIntentAddStep).step as mls.msg.AIAgentStep;
  assert.equal(reconcile.planning?.planId, 'reconcile30');
  assert.deepEqual(reconcile.planning?.dependsOn, ['review20-private-result']);
  const state = parseReview20PrivateState(result.result);
  assert.equal((state.proposal['module.defs.ts'] as Record<string, unknown>).title, 'New title');
  assert.equal(state.revisionId, 'rev-1');
  assert.equal(state.correctionState.correctionAttemptsUsed, 0);
  assert.match(state.validationContextHash, /^sha256:/u);
  assert.equal(intents.some(intent => intent.type === 'add-message-ai'), false);
}));

test('review20 turns a contradiction into a legible waiting clarification without a proposal result', async () => withProject(async () => {
  const response = {
    type: 'flexible', result: {
      schemaVersion: REVIEW20_SCHEMA_VERSION, decision: 'clarification',
      clarification: 'Should the title be changed for every journey?', operations: [],
    },
  };
  const intents = await afterReview20PromptStep(await context(), parent(), step(response), 9, runtime());
  const clarification = (intents[0] as mls.msg.AgentIntentAddStep).step as mls.msg.AIClarificationStep;
  assert.equal(clarification.type, 'clarification');
  assert.equal(clarification.status, 'waiting_human_input');
  assert.match(String(clarification.json), /Should the title be changed/u);
  assert.equal(intents.some(intent => intent.type === 'prompt_ready'), false);
}));

test('review20 fails invalid output once and does not schedule an automatic retry', async () => withProject(async () => {
  const invalid = { type: 'flexible', result: {
    schemaVersion: REVIEW20_SCHEMA_VERSION, decision: 'apply', clarification: '', operations: [],
  } };
  const intents = await afterReview20PromptStep(await context(), parent(), step(invalid), 10, runtime());
  assert.equal(intents.length, 1);
  assert.equal(intents[0].type, 'update-status');
  assert.equal((intents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
}));

test('review20 refuses a changed revision before preparing a prompt', async () => withProject(async () => {
  const changed = { ...snapshot, revisionId: 'rev-2' };
  const intents = await beforeReview20PromptStep(await context(), parent(), step(), 11, runtime({ ...inventories, snapshot: changed }));
  assert.equal(intents.length, 1);
  assert.equal(intents[0].type, 'update-status');
  assert.match(String((intents[0] as mls.msg.AgentIntentUpdateStatus).traceMsg), /revision conflict/u);
}));

test('review20 rejects an oversized private prompt before calling the model', async () => withProject(async () => {
  const oversized = 'x'.repeat(MAX_REVIEW20_PROMPT_CHARS);
  const loaded: ReviewInventories = {
    ...inventories,
    base: { 'module.defs.ts': { moduleName: 'agendaClinica', title: oversized } },
    candidate: { 'module.defs.ts': { moduleName: 'agendaClinica', title: oversized } },
  };
  const intents = await beforeReview20PromptStep(await context(), parent(), step(), 12, runtime(loaded));
  assert.equal(intents.length, 1);
  assert.equal(intents[0].type, 'update-status');
  assert.match(String((intents[0] as mls.msg.AgentIntentUpdateStatus).traceMsg), /size limit/u);
}));
