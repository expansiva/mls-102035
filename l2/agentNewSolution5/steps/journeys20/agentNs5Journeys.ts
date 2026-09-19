/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/journeys20/agentNs5Journeys.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { readNs5Actors } from '/_102035_/l2/agentNewSolution5/helpers/ns5Actors.js';
import {
  createNs5RetryStep,
  markNs5Step,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import {
  NS5_STEP_HOOKS,
  drainWaitingSiblings,
  updateStatus,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5Dispatch.js';
import { composeNs5SystemPrompt, readNs5MdmSkill } from '/_102035_/l2/agentNewSolution5/helpers/ns5Skills.js';
import {
  draftFile,
  journeyFile,
  journeyIndexFile,
  moduleFile,
  readAgentJson,
  readAgentText,
  readDefsJson,
  readJson,
  readPipeline,
  reconcileModuleDefs,
  writeDefs,
  writeJson,
  writePipeline,
} from '/_102035_/l2/solution/fs.js';
import { createStrictArtifactTool, unwrapArtifactPayload } from '/_102035_/l2/solution/lib.js';
import type {
  Ns5JourneyArtifact,
  Ns5ModuleActor,
  Ns5ModuleArtifact,
  Ns5PipelineState,
  Ns5SystemDecision,
} from '/_102035_/l2/solution/types.js';
import {
  buildNs5JourneyIndex,
  buildNs5JourneysTool,
  countNs5DecideSteps,
  hashNs5Journey,
  normalizeNs5JourneysPayload,
  type Ns5JourneyDraft,
} from '/_102035_/l2/agentNewSolution5/steps/journeys20/contracts.js';
import {
  applyNs5InferredActorDrop,
  formatNs5JourneyGate,
  validateNs5Journeys,
} from '/_102035_/l2/agentNewSolution5/steps/journeys20/gate.js';

const MAX_REPAIRS = 2;
const MAX_TRANSPORT_RETRIES = 1;

interface JourneysArgs {
  planId: string;
  moduleName: string;
  repairAttempt: number;
  transportAttempt: number;
  gateFeedback: string;
}

export function buildNs5JourneysHumanPrompt(input: {
  sourcePrompt: string;
  userLanguage: string;
  actors: Ns5ModuleActor[];
  gateFeedback?: string;
  previousDraft?: unknown;
}): string {
  const actorLines = input.actors.map(actor =>
    `- ${actor.actorId} (${actor.kind}, ${actor.origin}): ${actor.title} — ${actor.description}`,
  );
  return [
    '## Source request',
    input.sourcePrompt,
    '',
    `## userLanguage`,
    input.userLanguage,
    '',
    '## Actors',
    actorLines.length ? actorLines.join('\n') : '(none)',
    input.gateFeedback ? `## Deterministic repair required\n${input.gateFeedback}` : '',
    input.previousDraft ? `## Current draft; keep unrelated fields\n${JSON.stringify(input.previousDraft, null, 2)}` : '',
  ].filter(Boolean).join('\n');
}

export async function beforeNs5JourneysPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution5:journeys20] task invalid');
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt);
    moduleName = parsed.moduleName;
    const moduleArtifact = await readModule(moduleName);
    const actors = await readNs5Actors(moduleName);
    const sourcePrompt = await readSourcePrompt(context, moduleName, moduleArtifact);
    const [mdm, prompt, schema, previous] = await Promise.all([
      readNs5MdmSkill(),
      readAgentText('steps/journeys20', 'prompt', '.md'),
      readAgentJson<Record<string, unknown>>('schemas', 'journey.schema', '.json'),
      moduleName ? readJson(draftFile(moduleName, 'journeys20')) : Promise.resolve(null),
    ]);
    const tool = buildNs5JourneysTool(schema, createStrictArtifactTool);
    const humanPrompt = buildNs5JourneysHumanPrompt({
      sourcePrompt,
      userLanguage: moduleArtifact.userLanguage,
      actors,
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

export async function afterNs5JourneysPromptStep(
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
      const failure = readPromptFailure(step, 'journeys20 returned no usable journeys artifact.');
      if (parsed.transportAttempt < MAX_TRANSPORT_RETRIES) {
        return [
          addStep(context, mutationParent, createNs5RetryStep('journeys20', moduleName, 'transport', parsed.transportAttempt + 1)),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `journeys20 transport retry ${parsed.transportAttempt + 1} scheduled: ${failure}`),
        ];
      }
      throw new Error(failure);
    }

    const moduleArtifact = await readModule(moduleName);
    const actors = await readNs5Actors(moduleName);
    const { journeys, normalizations } = normalizeNs5JourneysPayload(payload);
    let pipeline = await requirePipeline(moduleName);
    pipeline = await writeStepState(pipeline, {
      status: 'running',
      updatedAt: new Date().toISOString(),
    });
    const draftPath = await writeJson(draftFile(moduleName, 'journeys20'), { journeys, normalizations });
    const gate = validateNs5Journeys(journeys, { actors, moduleName });
    if (!gate.ok) {
      const feedback = formatNs5JourneyGate(gate.issues);
      if (parsed.repairAttempt < MAX_REPAIRS) {
        return [
          addStep(context, mutationParent, createNs5RetryStep('journeys20', moduleName, 'repair', parsed.repairAttempt + 1, { gateFeedback: feedback })),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `journeys20 gate scheduled repair ${parsed.repairAttempt + 1}.`),
        ];
      }
      await writeStepState(pipeline, {
        status: 'failed',
        updatedAt: new Date().toISOString(),
        error: feedback,
        artifactPaths: [draftPath],
      });
      throw new Error(feedback);
    }

    const dropped = applyNs5InferredActorDrop(journeys, actors);
    const artifactPaths = await persistArtifacts(moduleName, dropped, pipeline, normalizations);
    // Nested repair from judge35 must not emit a second journeys20-done: planIds are unique in the task.
    const intents: mls.msg.AgentIntent[] = [];
    if (!hasPlanId(context, 'journeys20-done')) {
      intents.push(doneAnchor(context, mutationParent, moduleName, artifactPaths));
    }
    intents.push(updateStatus(context, mutationParent, step, hookSequential, 'completed', `journeys20 approved: ${artifactPaths.join(', ')}`));
    return intents;
  } catch (error) {
    const message = errorMessage(error);
    await recordFailure(moduleName, message);
    return [
      ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
      updateStatus(context, parentStep, step, hookSequential, 'failed', message),
    ];
  }
}

async function persistArtifacts(
  moduleName: string,
  dropped: {
    journeys: Ns5JourneyDraft[];
    actors: Ns5ModuleActor[];
    systemDecisions: Ns5SystemDecision[];
    droppedActorIds: string[];
  },
  pipeline: Ns5PipelineState,
  normalizations: { kind: string; detail: string; journeyId?: string; stepId?: string }[] = [],
): Promise<string[]> {
  const artifacts: Ns5JourneyArtifact[] = [];
  for (const draft of dropped.journeys) artifacts.push(await hashNs5Journey(draft));
  const artifactPaths: string[] = [];
  for (const artifact of artifacts) {
    artifactPaths.push(
      await writeDefs(journeyFile(moduleName, artifact.journeyId), `${artifact.journeyId}Journey`, artifact, 'Ns5JourneyArtifact'),
    );
  }
  const index = buildNs5JourneyIndex(moduleName, artifacts, dropped.systemDecisions);
  artifactPaths.push(
    await writeDefs(journeyIndexFile(moduleName), `${moduleName}JourneyIndex`, index, 'Ns5JourneyIndexArtifact'),
  );
  const removedOrphans = await reconcileModuleDefs(
    moduleName,
    'journeys',
    artifacts.map(artifact => artifact.journeyId),
  );
  await writeJson(draftFile(moduleName, 'journeys20'), {
    journeys: artifacts,
    systemDecisions: dropped.systemDecisions,
    droppedActors: dropped.droppedActorIds,
    removedOrphans,
    ...(normalizations.length ? { normalizations } : {}),
  });
  await writeStepState(pipeline, {
    status: 'approved',
    updatedAt: new Date().toISOString(),
    artifactPaths,
    decideStepCount: countNs5DecideSteps(dropped.journeys),
    droppedActors: dropped.droppedActorIds,
    ...(normalizations.length ? { normalizations } : {}),
    ...(pipeline.invocation.fast ? { autoReason: 'fast' } : {}),
  });
  return artifactPaths;
}

async function readModule(moduleName: string): Promise<Ns5ModuleArtifact> {
  if (!moduleName) throw new Error('journeys20 needs a moduleName.');
  const artifact = await readDefsJson<Ns5ModuleArtifact>(moduleFile(moduleName));
  if (!artifact) throw new Error(`module.defs.ts is missing for ${moduleName}; module10 must run first.`);
  const pipeline = await readPipeline(moduleName);
  if (pipeline?.steps.module10?.status !== 'approved') {
    throw new Error(`module10 must be approved before journeys20 (${moduleName}).`);
  }
  return artifact;
}

async function requirePipeline(moduleName: string): Promise<Ns5PipelineState> {
  const pipeline = await readPipeline(moduleName);
  if (!pipeline) throw new Error(`pipeline.json is missing for ${moduleName}.`);
  return pipeline;
}

async function writeStepState(
  pipeline: Ns5PipelineState,
  next: Ns5PipelineState['steps']['journeys20'] & { status: 'running' | 'approved' | 'failed'; updatedAt: string },
): Promise<Ns5PipelineState> {
  const updated = markNs5Step(pipeline, 'journeys20', next);
  await writePipeline(updated);
  return updated;
}

async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readPipeline(moduleName);
    if (!pipeline) return;
    await writePipeline(markNs5Step(pipeline, 'journeys20', {
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error,
    }));
  } catch { /* task trace remains the fallback */ }
}

async function readSourcePrompt(
  context: mls.msg.ExecutionContext,
  moduleName: string,
  moduleArtifact: Ns5ModuleArtifact,
): Promise<string> {
  if (moduleName) {
    const pipeline = await readPipeline(moduleName);
    if (pipeline?.sourcePrompt) return pipeline.sourcePrompt;
  }
  return moduleArtifact.sourcePrompt || memoryString(context, 'sourcePrompt');
}

function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): JourneysArgs {
  const root = parseRecord(value);
  const moduleName = text(root.moduleName) || memoryString(context, 'moduleName');
  return {
    planId: text(root.planId) || 'journeys20',
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
  artifactPaths: string[],
): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Journeys done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({ moduleName, artifactPaths, completedStep: 'journeys20', nextStep: 'workflows50' }),
    planning: { planId: 'journeys20-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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

function hasPlanId(context: mls.msg.ExecutionContext, planId: string): boolean {
  return getAllSteps(context.task?.iaCompressed?.nextSteps).some(step => step.planning?.planId === planId);
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

NS5_STEP_HOOKS.journeys20 = {
  beforePromptStep: beforeNs5JourneysPromptStep,
  afterPromptStep: afterNs5JourneysPromptStep,
};
