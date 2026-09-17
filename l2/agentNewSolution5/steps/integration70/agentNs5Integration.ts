/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/integration70/agentNs5Integration.ts" enhancement="_blank"/>

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
import { readNs5Siblings, formatNs5Siblings, ns5PlatformEventIds } from '/_102035_/l2/agentNewSolution5/helpers/ns5Siblings.js';
import {
  draftFile,
  integrationFile,
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
import {
  ns5OntologyEntityIds,
  ns5OntologyEntityViews,
  type Ns5OntologyAnyIndex,
  type Ns5OntologyEntityViewItem,
} from '/_102035_/l2/solution/ontologyView.js';
import type {
  Ns5IntegrationItem,
  Ns5IntegrationPlugin,
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleArtifact,
  Ns5OntologyAnyEntity,
  Ns5PipelineState,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';
import type { Ns5SiblingModule } from '/_102035_/l2/agentNewSolution5/helpers/ns5Siblings.js';
import {
  NS5_PLUGIN_CATALOG,
  buildNs5IntegrationArtifact,
  buildNs5IntegrationTool,
  collectNs5IntegrationSignals,
  normalizeNs5IntegrationPayload,
} from '/_102035_/l2/agentNewSolution5/steps/integration70/contracts.js';
import {
  formatNs5IntegrationGate,
  validateNs5Integration,
} from '/_102035_/l2/agentNewSolution5/steps/integration70/gate.js';

const MAX_REPAIRS = 2;
const MAX_TRANSPORT_RETRIES = 1;
const REQUIRED_STEPS = ['rules40', 'workflows50', 'access60'] as const;

interface IntegrationArgs {
  planId: string;
  moduleName: string;
  repairAttempt: number;
  transportAttempt: number;
  gateFeedback: string;
}

/**
 * Every ref `usedBy` may name. The gate refuses anything else (`NS5_INTEGRATION_USED_BY`), and the prompt
 * used to promise this list without anyone building it — so the model invented plausible names.
 */
async function readUsedByRefs(moduleName: string): Promise<string[]> {
  const refs: string[] = [];
  const index = await readDefsJson<Ns5JourneyIndexArtifact>(journeyIndexFile(moduleName));
  for (const entry of index?.journeys || []) {
    const journey = await readDefsJson<Ns5JourneyArtifact>(journeyFile(moduleName, entry.journeyId));
    for (const step of journey?.business.steps || []) refs.push(`${entry.journeyId}.${step.stepId}`);
  }
  const workflows = await readDefsJson<Ns5WorkflowsArtifact>(workflowsFile(moduleName));
  for (const process of workflows?.processes || []) {
    for (const task of process.tasks || []) refs.push(`${process.processId}.${task.taskId}`);
  }
  return refs;
}

export function buildNs5IntegrationHumanPrompt(input: {
  sourcePrompt: string;
  userLanguage: string;
  actors: ReadonlyArray<{ actorId: string; kind: string; title: string; description: string }>;
  entities: ReadonlyArray<{ entityId: string; writer?: 'journey' | 'crud' | 'inbound'; transitions?: ReadonlyArray<{ transitionId: string }> }>;
  /** Every `journeyId.stepId` and `processId.taskId` that exists. `usedBy` may name nothing else. */
  usedByRefs: readonly string[];
  siblings: readonly Ns5SiblingModule[];
  inboundWriters: string[];
  platformEventIds: string[];
  gateFeedback?: string;
  previousDraft?: unknown;
}): string {
  const signals = collectNs5IntegrationSignals(input.actors, input.sourcePrompt, input.siblings);
  const entityLines = input.entities.length
    ? input.entities.map(entity => {
      const writer = entity.writer && entity.writer !== 'journey' ? ` writer=${entity.writer}` : '';
      const transitions = entity.transitions?.length
        ? ` transitions=${entity.transitions.map(item => item.transitionId).join(',')}`
        : '';
      return `- ${entity.entityId}${writer}${transitions}`;
    }).join('\n')
    : '(none)';
  return [
    '## Source request',
    input.sourcePrompt,
    '',
    `## userLanguage`,
    input.userLanguage,
    '',
    '## Actors',
    formatActors(input.actors),
    '',
    '## Ontology entities (writer inbound must appear in inbound.writes)',
    entityLines,
    '',
    '## usedBy — the only refs that exist (journeyId.stepId and processId.taskId)',
    input.usedByRefs.length ? input.usedByRefs.map(ref => `- ${ref}`).join('\n') : '(none)',
    '',
    formatNs5Siblings(input.siblings) || '## Sibling modules already in this organization\n(none)',
    '',
    '## Available sibling events (outbound already published)',
    input.siblings.some(item => item.events.length)
      ? input.siblings.flatMap(item => item.events.map(event => `- ${item.moduleName}.${event.eventId} on ${event.on}`)).join('\n')
      : '(none — inbound of a sibling event the sibling does not publish is queued as a request)',
    '',
    '## Platform events (inbound.from = organization)',
    input.platformEventIds.length ? input.platformEventIds.map(id => `- ${id}`).join('\n') : '(none)',
    '',
    '## Entities declared writer inbound (must have inbound.writes)',
    input.inboundWriters.length ? input.inboundWriters.map(id => `- ${id}`).join('\n') : '(none)',
    '',
    '## Platform plugin catalog',
    NS5_PLUGIN_CATALOG.map(item => `- ${item.pluginId} (terms: ${item.terms.join(', ')})`).join('\n'),
    '',
    '## Integration signals (why this call ran)',
    signals.length ? JSON.stringify(signals, null, 2) : '(none — this call should not run)',
    input.gateFeedback ? `## Deterministic repair required\n${input.gateFeedback}` : '',
    input.previousDraft ? `## Current draft; keep unrelated fields\n${JSON.stringify(input.previousDraft, null, 2)}` : '',
  ].filter(Boolean).join('\n');
}

export async function beforeNs5IntegrationPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution5:integration70] task invalid');
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt);
    moduleName = parsed.moduleName;
    const moduleArtifact = await readModule(moduleName);
    const actors = await readNs5Actors(moduleName);
    const sourcePrompt = await readSourcePrompt(context, moduleName, moduleArtifact);
    const siblings = await readNs5Siblings(moduleName);
    const signals = collectNs5IntegrationSignals(actors, sourcePrompt, siblings);
    if (!signals.length) {
      const pipeline = await requirePipeline(moduleName);
      const artifactPath = await persistArtifacts(moduleName, [], [], [], pipeline, true);
      return [
        doneAnchor(context, findMutableParent(context, parentStep), moduleName, [artifactPath]),
        updateStatus(context, parentStep, step, hookSequential, 'completed', `integration70 approved with noIntegrationSignal: ${artifactPath}`),
      ];
    }
    const [entities, usedByRefs, prompt, schema, previous] = await Promise.all([
      readEntities(moduleName),
      readUsedByRefs(moduleName),
      readAgentText('steps/integration70', 'prompt', '.md'),
      readAgentJson<Record<string, unknown>>('schemas', 'integration.schema', '.json'),
      moduleName ? readJson(draftFile(moduleName, 'integration70')) : Promise.resolve(null),
    ]);
    const tool = buildNs5IntegrationTool(schema, createStrictArtifactTool);
    const humanPrompt = buildNs5IntegrationHumanPrompt({
      sourcePrompt,
      userLanguage: moduleArtifact.userLanguage,
      actors,
      entities: entities.map(entity => ({
        entityId: entity.entityId,
        ...(entity.writer ? { writer: entity.writer } : {}),
        transitions: entity.transitions.map(item => ({ transitionId: item.transitionId })),
      })),
      siblings,
      usedByRefs,
      inboundWriters: entities.filter(entity => entity.writer === 'inbound').map(entity => entity.entityId),
      platformEventIds: ns5PlatformEventIds(),
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

export async function afterNs5IntegrationPromptStep(
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
      const failure = readPromptFailure(step, 'integration70 returned no usable integration artifact.');
      if (parsed.transportAttempt < MAX_TRANSPORT_RETRIES) {
        return [
          addStep(context, mutationParent, createNs5RetryStep('integration70', moduleName, 'transport', parsed.transportAttempt + 1)),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `integration70 transport retry ${parsed.transportAttempt + 1} scheduled: ${failure}`),
        ];
      }
      throw new Error(failure);
    }

    const { inbound, outbound, plugins, normalizations } = normalizeNs5IntegrationPayload(payload);
    const moduleArtifact = await readModule(moduleName);
    const [entities, actors, siblings, coverage] = await Promise.all([
      readEntities(moduleName),
      readNs5Actors(moduleName),
      readNs5Siblings(moduleName),
      readCoverage(moduleName),
    ]);
    const sourcePrompt = await readSourcePrompt(context, moduleName, moduleArtifact);
    let pipeline = await requirePipeline(moduleName);
    pipeline = await writeStepState(pipeline, {
      status: 'running',
      updatedAt: new Date().toISOString(),
    });
    const draftPath = await writeJson(draftFile(moduleName, 'integration70'), {
      inbound,
      outbound,
      plugins,
      ...(normalizations.length ? { normalizations } : {}),
    });
    const gate = validateNs5Integration(inbound, outbound, plugins, {
      moduleName,
      actors,
      entities: entities.map(entity => ({
        entityId: entity.entityId,
        ...(entity.writer ? { writer: entity.writer } : {}),
        transitions: entity.transitions.map(item => ({ transitionId: item.transitionId })),
      })),
      registryModuleNames: siblings.map(item => item.moduleName),
      siblings,
      sourcePrompt,
      journeySteps: coverage.journeySteps,
      processTasks: coverage.processTasks,
      platformEventIds: ns5PlatformEventIds(),
    });
    if (!gate.ok) {
      const feedback = formatNs5IntegrationGate(gate.issues);
      if (parsed.repairAttempt < MAX_REPAIRS) {
        return [
          addStep(context, mutationParent, createNs5RetryStep('integration70', moduleName, 'repair', parsed.repairAttempt + 1, { gateFeedback: feedback })),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `integration70 gate scheduled repair ${parsed.repairAttempt + 1}.`),
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

    const artifactPath = await persistArtifacts(moduleName, inbound, outbound, plugins, pipeline, false, normalizations);
    return [
      doneAnchor(context, mutationParent, moduleName, [artifactPath]),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `integration70 approved: ${artifactPath}`),
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
  inbound: Ns5IntegrationItem[],
  outbound: Ns5IntegrationItem[],
  plugins: Ns5IntegrationPlugin[],
  pipeline: Ns5PipelineState,
  noIntegrationSignal: boolean,
  normalizations: Array<{ kind: string; inboundId?: string; detail: string }> = [],
): Promise<string> {
  const artifact = buildNs5IntegrationArtifact(moduleName, inbound, outbound, plugins);
  const artifactPath = await writeDefs(integrationFile(moduleName), `${moduleName}Integration`, artifact, 'Ns5IntegrationArtifact');
  await writeJson(draftFile(moduleName, 'integration70'), {
    ...artifact,
    ...(normalizations.length ? { normalizations } : {}),
  });
  await writeStepState(pipeline, {
    status: 'approved',
    updatedAt: new Date().toISOString(),
    artifactPaths: [artifactPath],
    ...(noIntegrationSignal ? { noIntegrationSignal: true } : {}),
    ...(normalizations.length ? { normalizations } : {}),
    ...(pipeline.invocation.fast ? { autoReason: 'fast' } : {}),
  });
  return artifactPath;
}

async function readModule(moduleName: string): Promise<Ns5ModuleArtifact> {
  if (!moduleName) throw new Error('integration70 needs a moduleName.');
  const artifact = await readDefsJson<Ns5ModuleArtifact>(moduleFile(moduleName));
  if (!artifact) throw new Error(`module.defs.ts is missing for ${moduleName}; module10 must run first.`);
  const pipeline = await readPipeline(moduleName);
  for (const stepId of REQUIRED_STEPS) {
    if (pipeline?.steps[stepId]?.status !== 'approved') {
      throw new Error(`${stepId} must be approved before integration70 (${moduleName}).`);
    }
  }
  return artifact;
}

async function readEntities(moduleName: string): Promise<Ns5OntologyEntityViewItem[]> {
  const index = await readDefsJson<Ns5OntologyAnyIndex>(ontologyIndexFile(moduleName));
  if (!index) throw new Error(`ontology/index.defs.ts is missing for ${moduleName}; ontology30 must run first.`);
  const entities: Ns5OntologyAnyEntity[] = [];
  for (const entityId of ns5OntologyEntityIds(index)) {
    const artifact = await readDefsJson<Ns5OntologyAnyEntity>(ontologyEntityFile(moduleName, entityId));
    if (!artifact) throw new Error(`ontology/${entityId}.defs.ts is missing for ${moduleName}.`);
    entities.push(artifact);
  }
  return ns5OntologyEntityViews(entities);
}

async function readCoverage(moduleName: string): Promise<{
  journeySteps: Array<{ journeyId: string; stepIds: string[] }>;
  processTasks: Array<{ processId: string; taskIds: string[] }>;
}> {
  const journeyIndex = await readDefsJson<Ns5JourneyIndexArtifact>(journeyIndexFile(moduleName));
  const journeySteps: Array<{ journeyId: string; stepIds: string[] }> = [];
  for (const entry of journeyIndex?.journeys || []) {
    const journey = await readDefsJson<Ns5JourneyArtifact>(journeyFile(moduleName, entry.journeyId));
    if (!journey) continue;
    journeySteps.push({
      journeyId: journey.journeyId,
      stepIds: journey.business.steps.map(step => step.stepId).filter(Boolean),
    });
  }
  const workflows = await readDefsJson<Ns5WorkflowsArtifact>(workflowsFile(moduleName));
  const processTasks = (workflows?.processes || []).map(process => ({
    processId: process.processId,
    taskIds: process.tasks.map(task => task.taskId).filter(Boolean),
  }));
  return { journeySteps, processTasks };
}

async function requirePipeline(moduleName: string): Promise<Ns5PipelineState> {
  const pipeline = await readPipeline(moduleName);
  if (!pipeline) throw new Error(`pipeline.json is missing for ${moduleName}.`);
  return pipeline;
}

async function writeStepState(
  pipeline: Ns5PipelineState,
  next: Ns5PipelineState['steps']['integration70'] & { status: 'running' | 'approved' | 'failed'; updatedAt: string },
): Promise<Ns5PipelineState> {
  const updated = markNs5Step(pipeline, 'integration70', next);
  await writePipeline(updated);
  return updated;
}

async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readPipeline(moduleName);
    if (!pipeline) return;
    await writePipeline(markNs5Step(pipeline, 'integration70', {
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

function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): IntegrationArgs {
  const root = parseRecord(value);
  const moduleName = text(root.moduleName) || memoryString(context, 'moduleName');
  return {
    planId: text(root.planId) || 'integration70',
    moduleName,
    repairAttempt: integer(root.repairAttempt),
    transportAttempt: integer(root.transportAttempt),
    gateFeedback: text(root.gateFeedback),
  };
}

function formatActors(actors: ReadonlyArray<{ actorId: string; kind: string; title: string; description: string }>): string {
  if (!actors.length) return '(none)';
  return actors.map(actor => `- ${actor.actorId} (${actor.kind}): ${actor.title} — ${actor.description}`).join('\n');
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
    stepTitle: 'Integration done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({ moduleName, artifactPaths, completedStep: 'integration70', nextStep: 'finalize80' }),
    planning: { planId: 'integration70-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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

NS5_STEP_HOOKS.integration70 = {
  beforePromptStep: beforeNs5IntegrationPromptStep,
  afterPromptStep: afterNs5IntegrationPromptStep,
};
