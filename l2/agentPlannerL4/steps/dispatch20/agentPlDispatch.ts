/// <mls fileReference="_102035_/l2/agentPlannerL4/steps/dispatch20/agentPlDispatch.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  candidateRootOf,
  createRound1InvokeSteps,
  existingModuleName,
  loadPlRevision,
  runPlDispatch,
} from '/_102035_/l2/agentPlannerL4/helpers/plCore.js';
import { l4diffFile } from '/_102035_/l2/agentPlannerL4/helpers/plDiff.js';
import {
  describeItemEffort,
  effortMasters,
  effortRegistry,
  mergeEffort,
  writeChangeEffort,
} from '/_102035_/l2/agentPlannerL4/helpers/plEffort.js';
import {
  addPlStep,
  PL_STEP_HOOKS,
  updateStatus,
} from '/_102035_/l2/agentPlannerL4/helpers/plDispatch.js';
import { enumerateModuleLayers } from '/_102035_/l2/solution/candidate/moduleLayers.js';
import { readChangeRequest } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import { moduleFile, readJson } from '/_102035_/l2/solution/fs.js';
import { resolveDescribeEffort } from '/_102035_/l2/solution/effortRegistry.js';
import { readL5Project } from '/_102035_/l2/solution/lib.js';
import {
  CHANGE_EFFORT_SCHEMA_VERSION,
  type ChangeEffortFile,
  type EffortAnswer,
  type EffortInput,
  type EffortMaster,
  type EffortPromptRequest,
  type L4Diff,
  type L4DiffItem,
} from '/_102035_/l2/solution/poolPlan.js';

const EFFORT_MODEL_PLAN = 'dispatch20-effort';

interface EffortSlot {
  master: EffortMaster;
  input: EffortInput;
  prompt?: EffortPromptRequest;
  answer?: EffortAnswer;
}

interface EffortWork {
  moduleName: string;
  base: { baseId: string; revisionId: string };
  requestText: string;
  masters: EffortMaster[];
  items: L4DiffItem[];
  slots: EffortSlot[];
  ask: number;
}

export async function beforePlDispatchPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const planId = step.planning?.planId || '';
  if (planId.startsWith(`${EFFORT_MODEL_PLAN}-`)) return beforeEffortModelStep(context, parentStep, step, hookSequential);
  const moduleName = existingModuleName(memoryString(context, 'moduleName') || moduleNameFromPrompt(step))
    || memoryString(context, 'moduleName')
    || moduleNameFromPrompt(step);
  if (candidateRootOf(moduleName)) {
    const work = await prepareMaintenanceEffort(moduleName);
    const ask = work.slots.findIndex(slot => slot.prompt && !slot.answer);
    if (ask < 0) {
      const file = await writePreparedEffort(work);
      return finishCandidateEffort(context, parentStep, step, hookSequential, moduleName, file);
    }
    return [
      addPlStep(context, parentStep, effortModelStep({ ...work, ask })),
      updateStatus(context, parentStep, step, hookSequential, 'in_progress', 'dispatch20 is waiting for the effort model.'),
    ];
  }
  const result = await runPlDispatch(moduleName, new Date());
  const invoke = createRound1InvokeSteps(moduleName, result);
  const missing = result.status;
  const status = missing
    || `pool/l2 pending for the planner (${result.artifacts.length} artifacts).`;
  return [
    ...invoke.map(child => addPlStep(context, parentStep, child)),
    doneAnchor(context, parentStep, moduleName, result.thread, result.artifacts.length, status, invoke.length),
    updateStatus(
      context,
      parentStep,
      step,
      hookSequential,
      'completed',
      missing
        || `dispatch20 wrote pool/l2 and created ${invoke.length} planner step(s).`,
    ),
  ];
}

export async function afterPlDispatchPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const planId = step.planning?.planId || '';
  if (planId.startsWith(`${EFFORT_MODEL_PLAN}-`)) return afterEffortModelStep(context, parentStep, step, hookSequential);
  const message = 'dispatch20 is deterministic and must never receive an LLM response.';
  return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
}

function beforeEffortModelStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): mls.msg.AgentIntent[] {
  const parsed = parseEffortWork(String(step.prompt || ''));
  const slot = parsed.work?.slots[parsed.work.ask];
  if (!parsed.work || !slot?.prompt) {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', parsed.error || 'dispatch20 effort step has no model request.')];
  }
  const tool: mls.msg.LLMTool = {
    type: 'function',
    function: {
      name: 'submitEffort',
      description: 'Submit the effort answer for this maintenance change.',
      parameters: slot.prompt.schema as Record<string, unknown>,
    },
  };
  return [{
    type: 'prompt_ready',
    args: String(step.prompt || ''),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: '<!-- modelType: reasoning -->\nCall submitEffort with the effort answer.',
    humanPrompt: slot.prompt.prompt,
    tools: [tool],
    toolChoice: { type: 'function', function: { name: tool.function.name } },
  }];
}

async function afterEffortModelStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseEffortWork(String(step.prompt || ''));
  const work = parsed.work;
  const slot = work?.slots[work.ask];
  if (!work || !slot) {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', parsed.error || 'dispatch20 effort step has no model request.')];
  }
  slot.answer = await finishModelSlot(slot, modelOutputOf(step));
  delete slot.prompt;
  const ask = work.slots.findIndex(item => item.prompt && !item.answer);
  if (ask >= 0) {
    return [
      addPlStep(context, parentStep, effortModelStep({ ...work, ask })),
      updateStatus(context, parentStep, step, hookSequential, 'completed', 'dispatch20 received one effort model reply.'),
    ];
  }
  const file = await writePreparedEffort(work);
  const dispatch = parentStep.nextSteps?.find(item => item.planning?.planId === 'dispatch20');
  return finishCandidateEffort(context, parentStep, step, hookSequential, work.moduleName, file, dispatch);
}

/** `contract`, or an l2 answer with `regenerateDefs` / `create` / `remove`, opens the same l4→l2 estimate and loop30 hand-off as creation. `blocked` and materialize-only stay closed. The pool stays. */
function opensPlannerConversation(file: ChangeEffortFile): boolean {
  if (file.status === 'blocked') return false;
  if (file.status === 'contract') return true;
  return file.perItem.some(row => row.answers.some(answer =>
    answer.master.kind === 'l2'
    && (answer.regenerateDefs.length > 0 || answer.create.length > 0 || answer.remove.length > 0)));
}

async function finishCandidateEffort(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  moduleName: string,
  file: ChangeEffortFile,
  dispatch?: mls.msg.AIPayload,
): Promise<mls.msg.AgentIntent[]> {
  const closeDispatch = dispatch
    ? [updateStatus(context, parentStep, dispatch, hookSequential, 'completed', 'dispatch20 wrote pool/l4/changeEffort.json.')]
    : [];
  if (!opensPlannerConversation(file)) {
    return [
      doneAnchor(context, parentStep, moduleName, '', 1, 'pool/l4/changeEffort.json written.', 0),
      ...closeDispatch,
      updateStatus(context, parentStep, step, hookSequential, 'completed', 'dispatch20 wrote pool/l4/changeEffort.json.'),
    ];
  }
  const result = await runPlDispatch(moduleName, new Date());
  const invoke = createRound1InvokeSteps(moduleName, result);
  const missing = result.status;
  const status = missing || `pool/l2 pending for the planner (${result.artifacts.length} artifacts).`;
  return [
    ...invoke.map(child => addPlStep(context, parentStep, child)),
    doneAnchor(context, parentStep, moduleName, result.thread, result.artifacts.length, status, invoke.length),
    ...closeDispatch,
    updateStatus(
      context,
      parentStep,
      step,
      hookSequential,
      'completed',
      missing || `dispatch20 wrote pool/l2 and created ${invoke.length} planner step(s).`,
    ),
  ];
}

function effortModelStep(work: EffortWork): mls.msg.AIAgentStep {
  const planId = `${EFFORT_MODEL_PLAN}-${work.ask}`;
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: 'Effort model',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentPlannerL4',
    prompt: JSON.stringify(work),
    rags: [],
    planning: { planId, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
}

function modelOutputOf(step: mls.msg.AIAgentStep): { ok: true; value: unknown } | { ok: false; reason: string } {
  const first = step.interaction?.payload?.[0];
  if (first === undefined || first === null) return { ok: false, reason: 'model unavailable: the reply did not arrive' };
  return unwrapEffortOutput(first);
}

/** Tool reply as an object, or JSON text, including `function.arguments` (same nesting as the L1 resolve). */
function unwrapEffortOutput(value: unknown): { ok: true; value: unknown } | { ok: false; reason: string } {
  if (typeof value === 'string') {
    try {
      return unwrapEffortOutput(JSON.parse(value) as unknown);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, reason: `model unavailable: reply is not JSON (${message})` };
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: true, value };
  const record = value as Record<string, unknown>;
  const fn = record.function;
  if (fn && typeof fn === 'object' && !Array.isArray(fn) && (fn as Record<string, unknown>).arguments !== undefined) {
    return unwrapEffortOutput((fn as Record<string, unknown>).arguments);
  }
  if (typeof record.args === 'string') return unwrapEffortOutput(record.args);
  if (record.arguments !== undefined) return unwrapEffortOutput(record.arguments);
  if (record.result !== undefined) return unwrapEffortOutput(record.result);
  return { ok: true, value: record };
}

async function finishModelSlot(
  slot: EffortSlot,
  output: { ok: true; value: unknown } | { ok: false; reason: string },
): Promise<EffortAnswer> {
  if (!output.ok) return abendAnswer(slot.master, slot.input, output.reason);
  const entry = await loadMasterEffort(slot.master.project);
  if (!entry?.finishEffort) {
    return abendAnswer(slot.master, slot.input, `model unavailable: finishEffort is missing for master ${slot.master.project}`);
  }
  try {
    return await entry.finishEffort(slot.input, output.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return abendAnswer(slot.master, slot.input, `model unavailable: finishEffort failed for master ${slot.master.project}: ${message}`);
  }
}

function abendAnswer(master: EffortMaster, input: EffortInput, reason: string): EffortAnswer {
  return {
    master,
    item: input.item.changeId,
    status: 'abend',
    create: [],
    regenerateDefs: [],
    materialize: [],
    remove: [],
    runAgents: [],
    contract: 'keep',
    abend: { reason },
  };
}

async function loadMasterEffort(project: string): Promise<{
  effortPrompt?: ((input: EffortInput) => EffortPromptRequest | null | Promise<EffortPromptRequest | null>) | null;
  finishEffort?: ((input: EffortInput, modelOutput: unknown) => EffortAnswer | Promise<EffortAnswer>) | null;
} | undefined> {
  const injected = effortRegistry[project];
  if (injected) return injected;
  return resolveDescribeEffort(project);
}

function doneAnchor(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  thread: string,
  artifactCount: number,
  status: string,
  invokeCount: number,
): mls.msg.AgentIntentAddStep {
  return addPlStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Dispatch done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({
      moduleName, thread, artifactCount, status, invokeCount,
      completedStep: 'dispatch20', nextStep: 'loop30',
    }),
    planning: { planId: 'dispatch20-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

/** After `l4diff`, on `/candidate` only: one slot per item × master. A prompt waits for the model step. */
async function prepareMaintenanceEffort(moduleName: string): Promise<EffortWork> {
  const diff = await readJson<L4Diff>(l4diffFile(moduleName, 'l2'));
  if (!diff) throw new Error(`l4diff missing for ${moduleName}`);
  const projectJson = await readL5Project();
  const masters = effortMasters(projectJson, 'l5/project.json');
  const revision = await loadPlRevision(moduleName);
  const request = await readChangeRequest(moduleFile(moduleName).project, moduleName);
  const base = { baseId: revision?.baseId ?? '', revisionId: revision?.revisionId ?? '' };
  const slots: EffortSlot[] = [];
  for (const item of diff.items) {
    for (const master of masters) {
      const input: EffortInput = { module: moduleName, base, item };
      slots.push(await slotFor(master, input));
    }
  }
  return {
    moduleName,
    base,
    requestText: request?.text ?? '',
    masters,
    items: diff.items,
    slots,
    ask: -1,
  };
}

async function slotFor(master: EffortMaster, input: EffortInput): Promise<EffortSlot> {
  const entry = await loadMasterEffort(master.project);
  if (!entry?.effortPrompt) {
    return { master, input, answer: await describeItemEffort(master, input) };
  }
  try {
    const request = await entry.effortPrompt(input);
    if (!request) return { master, input, answer: await describeItemEffort(master, input) };
    if (!request.prompt.trim()) {
      return { master, input, answer: abendAnswer(master, input, 'model unavailable: the master prompt is empty') };
    }
    if (!entry.finishEffort) {
      return { master, input, answer: abendAnswer(master, input, `model unavailable: finishEffort is missing for master ${master.project}`) };
    }
    return { master, input, prompt: request };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { master, input, answer: abendAnswer(master, input, `model unavailable: effortPrompt failed for master ${master.project}: ${message}`) };
  }
}

async function writePreparedEffort(work: EffortWork): Promise<ChangeEffortFile> {
  const perItem = work.items.map(item => ({
    item,
    answers: work.slots.filter(slot => slot.input.item.changeId === item.changeId).map(slot => {
      if (!slot.answer) throw new Error(`changeEffort missing an answer for ${item.changeId}`);
      return slot.answer;
    }),
  }));
  const merged = mergeEffort(perItem);
  const file: ChangeEffortFile = {
    schemaVersion: CHANGE_EFFORT_SCHEMA_VERSION,
    module: work.moduleName,
    base: { ...work.base, candidateRoot: candidateRootOf(work.moduleName) },
    request: { text: work.requestText, items: work.items },
    masters: work.masters,
    perItem: merged.perItem,
    merged: merged.merged,
    untouched: await untouchedOf(work.moduleName, perItem.flatMap(row => row.answers)),
    status: merged.status,
  };
  await writeChangeEffort(work.moduleName, file);
  return file;
}

function parseEffortWork(prompt: string): { work?: EffortWork; error?: string } {
  try {
    const parsed = JSON.parse(prompt) as EffortWork;
    if (!parsed || !Array.isArray(parsed.slots) || !Array.isArray(parsed.items)) {
      return { error: 'dispatch20 effort step is not effort work' };
    }
    return { work: parsed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: `dispatch20 effort step is not JSON (${message})` };
  }
}

/** Module layer files no answer cites. Hash is the review seal digest of `{level, path, sha256}`. */
async function untouchedOf(
  moduleName: string,
  answers: readonly EffortAnswer[],
): Promise<ChangeEffortFile['untouched']> {
  const files = await enumerateModuleLayers(moduleFile(moduleName).project, moduleName);
  const cited = citedLayerKeys(moduleName, answers);
  const kept = files
    .filter(file => !cited.has(`${file.level}:${file.path}`))
    .map(file => ({ level: file.level, path: file.path, sha256: file.sha256 }));
  return { count: kept.length, sealHash: await sha256Text(JSON.stringify(kept)) };
}

function citedLayerKeys(moduleName: string, answers: readonly EffortAnswer[]): Set<string> {
  const keys = new Set<string>();
  for (const answer of answers) {
    for (const unit of [...answer.create, ...answer.regenerateDefs, ...answer.materialize, ...answer.remove]) {
      const key = layerKey(moduleName, unit.path);
      if (key) keys.add(key);
    }
  }
  return keys;
}

function layerKey(moduleName: string, unitPath: string): string | undefined {
  for (const level of [1, 2] as const) {
    const prefix = `l${level}/${moduleName}/`;
    if (unitPath.startsWith(prefix)) return `${level}:${unitPath.slice(prefix.length)}`;
  }
  return undefined;
}

async function sha256Text(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function moduleNameFromPrompt(step: mls.msg.AIAgentStep): string {
  try {
    const parsed = JSON.parse(String(step.prompt || '{}')) as { moduleName?: unknown };
    return typeof parsed.moduleName === 'string' ? parsed.moduleName : '';
  } catch {
    return '';
  }
}

PL_STEP_HOOKS.dispatch20 = {
  beforePromptStep: beforePlDispatchPromptStep,
  afterPromptStep: afterPlDispatchPromptStep,
};
