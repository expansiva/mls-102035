/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/workflows50/agentNs5Workflows.ts" enhancement="_blank"/>

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
import {
  draftFile,
  journeyFile,
  journeyIndexFile,
  moduleFile,
  ontologyEntityFile,
  ontologyIndexFile,
  readAgentJson,
  readAgentText,
  readDefsJson,
  readJson,
  readPipeline,
  workflowsFile,
  writeDefs,
  writeJson,
  writePipeline,
} from '/_102035_/l2/solution/fs.js';
import { createStrictArtifactTool, unwrapArtifactPayload } from '/_102035_/l2/solution/lib.js';
import type {
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleArtifact,
  Ns5OntologyEntityArtifact,
  Ns5OntologyIndexArtifact,
  Ns5PipelineState,
  Ns5WorkflowProcess,
} from '/_102035_/l2/solution/types.js';
import {
  buildNs5WorkflowsArtifact,
  buildNs5WorkflowsTool,
  collectNs5ProcessSignals,
  collectNs5WorkflowsRefCatalog,
  normalizeNs5WorkflowsPayload,
} from '/_102035_/l2/agentNewSolution5/steps/workflows50/contracts.js';
import {
  formatNs5WorkflowsGate,
  validateNs5Workflows,
} from '/_102035_/l2/agentNewSolution5/steps/workflows50/gate.js';

const MAX_REPAIRS = 2;
const MAX_TRANSPORT_RETRIES = 1;

interface WorkflowsArgs {
  planId: string;
  moduleName: string;
  repairAttempt: number;
  transportAttempt: number;
  gateFeedback: string;
}

export function buildNs5WorkflowsHumanPrompt(input: {
  sourcePrompt: string;
  userLanguage: string;
  actorIds: string[];
  journeys: Ns5JourneyArtifact[];
  entities: Ns5OntologyEntityArtifact[];
  gateFeedback?: string;
  previousDraft?: unknown;
}): string {
  const signals = collectNs5ProcessSignals(input.journeys, input.entities);
  const catalog = collectNs5WorkflowsRefCatalog(input.journeys, input.actorIds);
  return [
    '## Source request',
    input.sourcePrompt,
    '',
    `## userLanguage`,
    input.userLanguage,
    '',
    '## Actors',
    input.actorIds.length ? input.actorIds.map(id => `- ${id}`).join('\n') : '(none)',
    '',
    '## Journeys (business)',
    formatJourneys(input.journeys),
    '',
    '## Ontology transitions (by actor)',
    formatTransitions(input.entities),
    '',
    '## Process signals (why this call ran)',
    signals.length ? JSON.stringify(signals, null, 2) : '(none — this call should not run)',
    '',
    '## Valid reference ids',
    JSON.stringify({
      actorIds: catalog.actorIds,
      journeyIds: catalog.journeyIds,
      stepRefs: catalog.stepRefs,
      handoffs: catalog.handoffs,
    }, null, 2),
    input.gateFeedback ? `## Deterministic repair required\n${input.gateFeedback}` : '',
    input.previousDraft ? `## Current draft; keep unrelated fields\n${JSON.stringify(input.previousDraft, null, 2)}` : '',
  ].filter(Boolean).join('\n');
}

export async function beforeNs5WorkflowsPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution5:workflows50] task invalid');
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt);
    moduleName = parsed.moduleName;
    const moduleArtifact = await readModule(moduleName);
    const [journeys, entities, actors] = await Promise.all([
      readJourneys(moduleName),
      readEntities(moduleName),
      readNs5Actors(moduleName),
    ]);
    const actorIds = actors.map(actor => actor.actorId).filter(Boolean);
    const signals = collectNs5ProcessSignals(journeys, entities);
    if (!signals.length) {
      const pipeline = await requirePipeline(moduleName);
      const artifactPath = await persistArtifacts(moduleName, [], pipeline, true);
      return [
        doneAnchor(context, findMutableParent(context, parentStep), moduleName, [artifactPath]),
        updateStatus(context, parentStep, step, hookSequential, 'completed', `workflows50 approved with noProcessSignal: ${artifactPath}`),
      ];
    }
    const sourcePrompt = await readSourcePrompt(context, moduleName, moduleArtifact);
    const [prompt, schema, previous] = await Promise.all([
      readAgentText('steps/workflows50', 'prompt', '.md'),
      readAgentJson<Record<string, unknown>>('schemas', 'workflows.schema', '.json'),
      moduleName ? readJson(draftFile(moduleName, 'workflows50')) : Promise.resolve(null),
    ]);
    const tool = buildNs5WorkflowsTool(schema, createStrictArtifactTool);
    const humanPrompt = buildNs5WorkflowsHumanPrompt({
      sourcePrompt,
      userLanguage: moduleArtifact.userLanguage,
      actorIds,
      journeys,
      entities,
      gateFeedback: parsed.gateFeedback,
      previousDraft: previous,
    });
    return [promptReady(context, parentStep, hookSequential, args || String(step.prompt || ''), prompt, humanPrompt, tool)];
  } catch (error) {
    const message = errorMessage(error);
    await recordFailure(moduleName, message);
    return [
      ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
      updateStatus(context, parentStep, step, hookSequential, 'failed', message),
    ];
  }
}

export async function afterNs5WorkflowsPromptStep(
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
      const failure = readPromptFailure(step, 'workflows50 returned no usable workflows artifact.');
      if (parsed.transportAttempt < MAX_TRANSPORT_RETRIES) {
        return [
          addStep(context, mutationParent, createNs5RetryStep('workflows50', moduleName, 'transport', parsed.transportAttempt + 1)),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `workflows50 transport retry ${parsed.transportAttempt + 1} scheduled: ${failure}`),
        ];
      }
      throw new Error(failure);
    }

    const { processes } = normalizeNs5WorkflowsPayload(payload);
    const moduleArtifact = await readModule(moduleName);
    const [journeys, entities, actors] = await Promise.all([
      readJourneys(moduleName),
      readEntities(moduleName),
      readNs5Actors(moduleName),
    ]);
    let pipeline = await requirePipeline(moduleName);
    pipeline = await writeStepState(pipeline, {
      status: 'running',
      updatedAt: new Date().toISOString(),
    });
    const draftPath = await writeJson(draftFile(moduleName, 'workflows50'), { processes });
    const gate = validateNs5Workflows(processes, {
      moduleName,
      actorIds: actors.map(actor => actor.actorId),
      journeys,
      entities,
    });
    if (!gate.ok) {
      const feedback = formatNs5WorkflowsGate(gate.issues);
      if (parsed.repairAttempt < MAX_REPAIRS) {
        return [
          addStep(context, mutationParent, createNs5RetryStep('workflows50', moduleName, 'repair', parsed.repairAttempt + 1, { gateFeedback: feedback })),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `workflows50 gate scheduled repair ${parsed.repairAttempt + 1}.`),
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

    const artifactPath = await persistArtifacts(moduleName, processes, pipeline, false);
    return [
      doneAnchor(context, mutationParent, moduleName, [artifactPath]),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `workflows50 approved: ${artifactPath}`),
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

async function persistArtifacts(
  moduleName: string,
  processes: Ns5WorkflowProcess[],
  pipeline: Ns5PipelineState,
  noProcessSignal: boolean,
): Promise<string> {
  const artifact = buildNs5WorkflowsArtifact(moduleName, processes);
  const artifactPath = await writeDefs(workflowsFile(moduleName), `${moduleName}Workflows`, artifact, 'Ns5WorkflowsArtifact');
  await writeJson(draftFile(moduleName, 'workflows50'), artifact);
  await writeStepState(pipeline, {
    status: 'approved',
    updatedAt: new Date().toISOString(),
    artifactPaths: [artifactPath],
    ...(noProcessSignal ? { noProcessSignal: true } : {}),
    ...(pipeline.invocation.fast ? { autoReason: 'fast' } : {}),
  });
  return artifactPath;
}

async function readModule(moduleName: string): Promise<Ns5ModuleArtifact> {
  if (!moduleName) throw new Error('workflows50 needs a moduleName.');
  const artifact = await readDefsJson<Ns5ModuleArtifact>(moduleFile(moduleName));
  if (!artifact) throw new Error(`module.defs.ts is missing for ${moduleName}; module10 must run first.`);
  const pipeline = await readPipeline(moduleName);
  if (pipeline?.steps.ontology30?.status !== 'approved') {
    throw new Error(`ontology30 must be approved before workflows50 (${moduleName}).`);
  }
  return artifact;
}

async function readJourneys(moduleName: string): Promise<Ns5JourneyArtifact[]> {
  const index = await readDefsJson<Ns5JourneyIndexArtifact>(journeyIndexFile(moduleName));
  if (!index) throw new Error(`journeys/index.defs.ts is missing for ${moduleName}; journeys20 must run first.`);
  const journeys: Ns5JourneyArtifact[] = [];
  for (const entry of index.journeys) {
    const artifact = await readDefsJson<Ns5JourneyArtifact>(journeyFile(moduleName, entry.journeyId));
    if (artifact) journeys.push(artifact);
  }
  return journeys;
}

async function readEntities(moduleName: string): Promise<Ns5OntologyEntityArtifact[]> {
  const index = await readDefsJson<Ns5OntologyIndexArtifact>(ontologyIndexFile(moduleName));
  if (!index) throw new Error(`ontology/index.defs.ts is missing for ${moduleName}; ontology30 must run first.`);
  const entities: Ns5OntologyEntityArtifact[] = [];
  for (const entityId of index.entities) {
    const artifact = await readDefsJson<Ns5OntologyEntityArtifact>(ontologyEntityFile(moduleName, entityId));
    if (!artifact) throw new Error(`ontology/${entityId}.defs.ts is missing for ${moduleName}.`);
    entities.push(artifact);
  }
  return entities;
}

async function requirePipeline(moduleName: string): Promise<Ns5PipelineState> {
  const pipeline = await readPipeline(moduleName);
  if (!pipeline) throw new Error(`pipeline.json is missing for ${moduleName}.`);
  return pipeline;
}

async function writeStepState(
  pipeline: Ns5PipelineState,
  next: Ns5PipelineState['steps']['workflows50'] & { status: 'running' | 'approved' | 'failed'; updatedAt: string },
): Promise<Ns5PipelineState> {
  const updated = markNs5Step(pipeline, 'workflows50', next);
  await writePipeline(updated);
  return updated;
}

async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readPipeline(moduleName);
    if (!pipeline) return;
    await writePipeline(markNs5Step(pipeline, 'workflows50', {
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

function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): WorkflowsArgs {
  const root = parseRecord(value);
  const moduleName = text(root.moduleName) || memoryString(context, 'moduleName');
  return {
    planId: text(root.planId) || 'workflows50',
    moduleName,
    repairAttempt: integer(root.repairAttempt),
    transportAttempt: integer(root.transportAttempt),
    gateFeedback: text(root.gateFeedback),
  };
}

function formatJourneys(journeys: Ns5JourneyArtifact[]): string {
  if (!journeys.length) return '(none)';
  return journeys.map(journey => [
    `### ${journey.journeyId} (${journey.business.actorRef})`,
    journey.business.title,
    journey.business.goal,
    ...journey.business.steps.map(step => {
      const handoff = step.kind === 'handoff' && step.handoffTo ? ` handoffTo=${step.handoffTo}` : '';
      return `- ${step.stepId} ${step.kind} ${step.entity}${handoff}: ${step.description}`;
    }),
  ].join('\n')).join('\n\n');
}

function formatTransitions(entities: Ns5OntologyEntityArtifact[]): string {
  const blocks = entities.map(entity => {
    if (!entity.transitions.length) return '';
    const lines = entity.transitions.map(transition => {
      const by = Array.isArray(transition.by) ? transition.by.join(',') : transition.by;
      return `- ${entity.entityId}.${transition.transitionId} ${transition.from.join('|')} -> ${transition.to} by=${by}`;
    });
    return `### ${entity.entityId}\n${lines.join('\n')}`;
  }).filter(Boolean);
  return blocks.length ? blocks.join('\n\n') : '(none)';
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
    stepTitle: 'Workflows done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({ moduleName, artifactPaths, completedStep: 'workflows50', nextStep: 'integration70' }),
    planning: { planId: 'workflows50-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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

NS5_STEP_HOOKS.workflows50 = {
  beforePromptStep: beforeNs5WorkflowsPromptStep,
  afterPromptStep: afterNs5WorkflowsPromptStep,
};
