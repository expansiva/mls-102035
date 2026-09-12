/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/module10/agentNs5Module.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { formatNs4E1OrganizationContext } from '/_102035_/l2/agentNewSolution/helpers/organizationContext.js';
import { formatNs5Siblings, ns5SiblingsFromRegistry } from '/_102035_/l2/agentNewSolution5/helpers/ns5Siblings.js';
import {
  NS5_AGENT_NAME,
  createEmptyPipeline,
  createNs5RetryStep,
  existingModuleName,
  markNs5Step,
  moduleTokenOk,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import {
  NS5_STEP_HOOKS,
  drainWaitingSiblings,
  updateStatus,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5Dispatch.js';
import { composeNs5SystemPrompt, readNs5MdmSkill } from '/_102035_/l2/agentNewSolution5/helpers/ns5Skills.js';
import {
  draftFile,
  fileExists,
  moduleFile,
  readAgentJson,
  readAgentText,
  readJson,
  readPipeline,
  readSolutionRegistry,
  writeDefs,
  writeJson,
  writePipeline,
} from '/_102035_/l2/solution/fs.js';
import { createStrictArtifactTool, unwrapArtifactPayload } from '/_102035_/l2/solution/lib.js';
import type { Ns5Invocation, Ns5ModuleActor, Ns5ModuleArtifact, Ns5PipelineState } from '/_102035_/l2/solution/types.js';
import { buildNs5ModuleTool, normalizeNs5ModuleArtifact } from '/_102035_/l2/agentNewSolution5/steps/module10/contracts.js';
import { formatNs5ModuleGate, validateNs5ModuleArtifact } from '/_102035_/l2/agentNewSolution5/steps/module10/gate.js';

const MAX_REPAIRS = 2;
const MAX_TRANSPORT_RETRIES = 1;

interface ModuleArgs {
  planId: string;
  moduleName: string;
  repairAttempt: number;
  transportAttempt: number;
  gateFeedback: string;
}

export function buildNs5ModuleHumanPrompt(input: {
  sourcePrompt: string;
  fixedModuleName: string;
  organizationContext: string;
  gateFeedback?: string;
  previousDraft?: unknown;
}): string {
  return [
    '## Source request',
    input.sourcePrompt,
    '',
    '## Invocation',
    input.fixedModuleName
      ? `moduleName is fixed by /module: ${input.fixedModuleName}`
      : 'No /module flag. Propose a lowerCamel moduleName.',
    input.organizationContext,
    input.gateFeedback ? `## Deterministic repair required\n${input.gateFeedback}` : '',
    input.previousDraft ? `## Current draft; keep unrelated fields\n${JSON.stringify(input.previousDraft, null, 2)}` : '',
  ].filter(Boolean).join('\n');
}

export async function beforeNs5ModulePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution5:module10] task invalid');
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt);
    moduleName = parsed.moduleName;
    const sourcePrompt = await readSourcePrompt(context, moduleName);
    const pipeline = moduleName ? await readPipeline(moduleName) : null;
    const fixedModuleName = invocationOf(context, pipeline).module;
    const [mdm, prompt, schema, registry, previous] = await Promise.all([
      readNs5MdmSkill(),
      readAgentText('steps/module10', 'prompt', '.md'),
      readAgentJson<Record<string, unknown>>('schemas', 'module.schema', '.json'),
      readSolutionRegistry(),
      moduleName ? readJson(draftFile(moduleName, 'module10')) : Promise.resolve(null),
    ]);
    const tool = buildNs5ModuleTool(schema, createStrictArtifactTool);
    const humanPrompt = buildNs5ModuleHumanPrompt({
      sourcePrompt,
      fixedModuleName,
      organizationContext: [
        formatNs4E1OrganizationContext(registry),
        formatNs5Siblings(ns5SiblingsFromRegistry(registry, moduleName)),
      ].filter(Boolean).join('\n\n'),
      gateFeedback: parsed.gateFeedback,
      previousDraft: previous,
    });
    return [promptReady(context, parentStep, hookSequential, args || String(step.prompt || ''), composeNs5SystemPrompt(mdm, prompt), humanPrompt, tool)];
  } catch (error) {
    const message = errorMessage(error);
    await recordFailure(moduleName, message);
    return [
      ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
      updateStatus(context, parentStep, step, hookSequential, 'failed', message),
    ];
  }
}

export async function afterNs5ModulePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, step.prompt);
    moduleName = parsed.moduleName;
    const mutationParent = findMutableParent(context, parentStep);
    const payload = unwrapArtifactPayload(step.interaction?.payload?.[0]);
    if (!isRecord(payload)) {
      const failure = readPromptFailure(step, 'module10 returned no usable module artifact.');
      if (parsed.transportAttempt < MAX_TRANSPORT_RETRIES) {
        return [
          addStep(context, mutationParent, createNs5RetryStep('module10', moduleName, 'transport', parsed.transportAttempt + 1)),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `module10 transport retry ${parsed.transportAttempt + 1} scheduled: ${failure}`),
        ];
      }
      throw new Error(failure);
    }

    const sourcePrompt = await readSourcePrompt(context, moduleName);
    const invocation = invocationOf(context, moduleName ? await readPipeline(moduleName) : null);
    const fixedModuleName = invocation.module;
    const { artifact, actors, i18nWarnings, normalizations } = normalizeNs5ModuleArtifact(payload, { sourcePrompt, fixedModuleName });
    moduleName = artifact.moduleName;
    if (!moduleTokenOk(moduleName)) throw new Error('moduleName must be lowerCamel.');
    await assertModuleWritable(moduleName, invocation.rebuildAll);

    let pipeline = await ensurePipeline(moduleName, sourcePrompt, invocation);
    pipeline = await writeStepState(pipeline, 'module10', {
      status: 'running',
      updatedAt: new Date().toISOString(),
    });
    const draftPath = await writeJson(draftFile(moduleName, 'module10'), {
      ...artifact,
      actors,
      ...(normalizations.length ? { normalizations } : {}),
    });
    const gate = validateNs5ModuleArtifact(artifact, { fixedModuleName, actors });
    if (!gate.ok) {
      const feedback = formatNs5ModuleGate(gate.issues);
      if (parsed.repairAttempt < MAX_REPAIRS) {
        return [
          addStep(context, mutationParent, createNs5RetryStep('module10', moduleName, 'repair', parsed.repairAttempt + 1, { gateFeedback: feedback })),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `module10 gate scheduled repair ${parsed.repairAttempt + 1}.`),
        ];
      }
      await writeStepState(pipeline, 'module10', {
        status: 'failed',
        updatedAt: new Date().toISOString(),
        error: feedback,
        artifactPaths: [draftPath],
      });
      throw new Error(feedback);
    }

    const artifactPath = await persistArtifact(moduleName, artifact, actors, invocation, normalizations);
    const warningNote = i18nWarnings.map(item => `\nwarning: ${item}`).join('');
    return [
      doneAnchor(context, mutationParent, moduleName, artifactPath),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `module10 approved: ${artifactPath}${warningNote}`),
    ];
  } catch (error) {
    const message = errorMessage(error);
    await recordFailure(moduleName, message);
    return [
      ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
      updateStatus(context, parentStep, step, hookSequential, 'failed', message),
    ];
  }
}

async function persistArtifact(
  moduleName: string,
  artifact: Ns5ModuleArtifact,
  actors: Ns5ModuleActor[],
  invocation: Ns5Invocation,
  normalizations: { kind: string; detail: string }[],
): Promise<string> {
  await assertModuleWritable(moduleName, invocation.rebuildAll);
  const artifactPath = await writeDefs(moduleFile(moduleName), `${moduleName}Module`, artifact, 'Ns5ModuleArtifact');
  const pipeline = await ensurePipeline(moduleName, artifact.sourcePrompt, invocation);
  await writeStepState(pipeline, 'module10', {
    status: 'approved',
    updatedAt: new Date().toISOString(),
    artifactPaths: [artifactPath],
    actors,
    ...(normalizations.length ? { normalizations } : {}),
    ...(invocation.fast ? { autoReason: 'fast' } : {}),
  });
  return artifactPath;
}

async function assertModuleWritable(moduleName: string, rebuildAll: boolean): Promise<void> {
  if (rebuildAll) return;
  if (fileExists(moduleFile(moduleName))) {
    throw new Error(`Module "${moduleName}" already exists. To regenerate, use "@@newSolution5 ${moduleName} /rebuild all". Nothing was changed.`);
  }
  const collision = existingModuleName(moduleName);
  if (!collision) return;
  const existing = await readPipeline(collision);
  if (existing?.flowId === 'agentNewSolution5') return;
  throw new Error(`Module "${collision}" already exists. To regenerate, use "@@newSolution5 ${collision} /rebuild all". Nothing was changed.`);
}

async function ensurePipeline(
  moduleName: string,
  sourcePrompt: string,
  invocation: Ns5Invocation,
): Promise<Ns5PipelineState> {
  const existing = await readPipeline(moduleName);
  if (existing) {
    return existing.moduleName === moduleName
      ? existing
      : { ...existing, moduleName, sourcePrompt: existing.sourcePrompt || sourcePrompt };
  }
  const created = createEmptyPipeline(moduleName, sourcePrompt, { ...invocation, module: moduleName });
  await writePipeline(created);
  return created;
}

async function writeStepState(
  pipeline: Ns5PipelineState,
  stepId: 'module10',
  next: Ns5PipelineState['steps']['module10'] & { status: 'running' | 'approved' | 'failed'; updatedAt: string },
): Promise<Ns5PipelineState> {
  const updated = markNs5Step(pipeline, stepId, next);
  await writePipeline(updated);
  return updated;
}

async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readPipeline(moduleName);
    if (!pipeline) return;
    await writePipeline(markNs5Step(pipeline, 'module10', {
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error,
    }));
  } catch { /* task trace remains the fallback */ }
}

async function readSourcePrompt(context: mls.msg.ExecutionContext, moduleName: string): Promise<string> {
  if (moduleName) {
    const pipeline = await readPipeline(moduleName);
    if (pipeline?.sourcePrompt) return pipeline.sourcePrompt;
  }
  return memoryString(context, 'sourcePrompt');
}

function invocationOf(context: mls.msg.ExecutionContext, pipeline: Ns5PipelineState | null): Ns5Invocation {
  if (pipeline?.invocation) return pipeline.invocation;
  return {
    fast: memoryString(context, 'fastMode') === 'true',
    module: memoryString(context, 'moduleName'),
    rebuildAll: memoryString(context, 'rebuildAll') === 'true',
  };
}

function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): ModuleArgs {
  const root = parseRecord(value);
  const moduleName = text(root.moduleName) || memoryString(context, 'moduleName');
  return {
    planId: text(root.planId) || 'module10',
    moduleName,
    repairAttempt: integer(root.repairAttempt),
    transportAttempt: integer(root.transportAttempt),
    gateFeedback: text(root.gateFeedback),
  };
}

function promptReady(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  args: string,
  systemPrompt: string,
  humanPrompt: string,
  tool: mls.msg.LLMTool,
): mls.msg.AgentIntentPromptReady {
  return {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [tool],
    toolChoice: { type: 'function', function: { name: tool.function.name } },
  };
}

function doneAnchor(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  artifactPath: string,
): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Module done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({ moduleName, artifactPath, completedStep: 'module10', nextStep: 'journeys20' }),
    planning: { planId: 'module10-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function addStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIPayload,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step,
  };
}

function findMutableParent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
): mls.msg.AIAgentStep {
  const all = getAllSteps(context.task?.iaCompressed?.nextSteps);
  const current = all.find(item => item.stepId === parentStep.stepId);
  if (isOpenAgent(current)) return current;
  const owner = all.find(candidate => isOpenAgent(candidate)
    && (candidate.nextSteps?.some(child => child.stepId === parentStep.stepId)
      || candidate.interaction?.payload?.some(child => child.stepId === parentStep.stepId)));
  if (isOpenAgent(owner)) return owner;
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  return root?.type === 'agent' ? root : parentStep;
}

function isOpenAgent(step: mls.msg.AIPayload | undefined): step is mls.msg.AIAgentStep {
  return step?.type === 'agent' && step.status !== 'completed' && step.status !== 'failed';
}

function readPromptFailure(step: mls.msg.AIAgentStep, fallback: string): string {
  const payload = step.interaction?.payload?.[0];
  const recordValue = isRecord(payload) ? payload : parseRecord(payload);
  if (typeof recordValue.result === 'string' && recordValue.result.trim()) return recordValue.result.trim();
  return fallback;
}

function parseRecord(value: unknown): Record<string, unknown> {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) ? parsed : {};
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean); } catch { return value; }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function integer(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
}

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

NS5_STEP_HOOKS.module10 = {
  beforePromptStep: beforeNs5ModulePromptStep,
  afterPromptStep: afterNs5ModulePromptStep,
};
