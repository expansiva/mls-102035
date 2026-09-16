/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/rules40/agentNs5Rules.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
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
  rulesFile,
  writeDefs,
  writeJson,
  writePipeline,
} from '/_102035_/l2/solution/fs.js';
import { createStrictArtifactTool, unwrapArtifactPayload } from '/_102035_/l2/solution/lib.js';
import {
  isNs5OntologyV3Entity,
  ns5OntologyEntityIds,
  ns5OntologyEntityViews,
  ns5OntologyV3FieldLines,
  type Ns5OntologyAnyIndex,
  type Ns5OntologyEntityViewItem,
} from '/_102035_/l2/solution/ontologyView.js';
import type {
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleArtifact,
  Ns5OntologyAnyEntity,
  Ns5PipelineState,
  Ns5Rule,
} from '/_102035_/l2/solution/types.js';
import {
  buildNs5RulesArtifact,
  buildNs5RulesTool,
  normalizeNs5RulesPayload,
} from '/_102035_/l2/agentNewSolution5/steps/rules40/contracts.js';
import {
  formatNs5RulesGate,
  validateNs5Rules,
} from '/_102035_/l2/agentNewSolution5/steps/rules40/gate.js';

const MAX_REPAIRS = 2;
const MAX_TRANSPORT_RETRIES = 1;

interface RulesArgs {
  planId: string;
  moduleName: string;
  repairAttempt: number;
  transportAttempt: number;
  gateFeedback: string;
}

export function buildNs5RulesHumanPrompt(input: {
  sourcePrompt: string;
  userLanguage: string;
  journeys: Ns5JourneyArtifact[];
  entities: Ns5OntologyEntityViewItem[];
  /**
   * ns5_43 T2. `pipeline.ontology30.citedRules[]` — every rule id the ontology cited, the platform ones
   * of `mdm.rules` included. Same nature as the `ruleRefs` of a transition: data, not instruction. The
   * step must keep these ids; finalize80 I4 checks each of them resolves.
   */
  citedRules?: readonly string[];
  gateFeedback?: string;
  previousDraft?: unknown;
}): string {
  const citedRuleIds = [...new Set([
    ...input.entities.flatMap(entity => entity.transitions.flatMap(transition => transition.ruleRefs || [])),
    ...(input.citedRules || []),
  ])].filter(Boolean);
  return [
    '## Source request',
    input.sourcePrompt,
    '',
    `## userLanguage`,
    input.userLanguage,
    '',
    '## Journeys (business)',
    formatJourneys(input.journeys),
    '',
    '## Ontology (entities, fields, transitions)',
    formatOntology(input.entities),
    citedRuleIds.length
      ? `## rules the ontology cited; keep these ids\n${citedRuleIds.map(id => `- ${id}`).join('\n')}`
      : '',
    input.gateFeedback ? `## Deterministic repair required\n${input.gateFeedback}` : '',
    input.previousDraft ? `## Current draft; keep unrelated fields\n${JSON.stringify(input.previousDraft, null, 2)}` : '',
  ].filter(Boolean).join('\n');
}

export async function beforeNs5RulesPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution5:rules40] task invalid');
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt);
    moduleName = parsed.moduleName;
    const moduleArtifact = await readModule(moduleName);
    const [journeys, entities] = await Promise.all([readJourneys(moduleName), readEntities(moduleName)]);
    // ns5_43 T2: ontology30 records every rule id its entities cited, the platform ones included.
    const citedRules = (await readPipeline(moduleName))?.steps.ontology30?.citedRules || [];
    const sourcePrompt = await readSourcePrompt(context, moduleName, moduleArtifact);
    const [prompt, schema, previous] = await Promise.all([
      readAgentText('steps/rules40', 'prompt', '.md'),
      readAgentJson<Record<string, unknown>>('schemas', 'rules.schema', '.json'),
      moduleName ? readJson(draftFile(moduleName, 'rules40')) : Promise.resolve(null),
    ]);
    const tool = buildNs5RulesTool(schema, createStrictArtifactTool);
    const humanPrompt = buildNs5RulesHumanPrompt({
      sourcePrompt,
      userLanguage: moduleArtifact.userLanguage,
      journeys,
      entities,
      citedRules,
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

export async function afterNs5RulesPromptStep(
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
      const failure = readPromptFailure(step, 'rules40 returned no usable rules artifact.');
      if (parsed.transportAttempt < MAX_TRANSPORT_RETRIES) {
        return [
          addStep(context, mutationParent, createNs5RetryStep('rules40', moduleName, 'transport', parsed.transportAttempt + 1)),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `rules40 transport retry ${parsed.transportAttempt + 1} scheduled: ${failure}`),
        ];
      }
      throw new Error(failure);
    }

    const { rules } = normalizeNs5RulesPayload(payload);
    let pipeline = await requirePipeline(moduleName);
    pipeline = await writeStepState(pipeline, {
      status: 'running',
      updatedAt: new Date().toISOString(),
    });
    const draftPath = await writeJson(draftFile(moduleName, 'rules40'), { rules });
    const gate = validateNs5Rules(rules, { moduleName });
    if (!gate.ok) {
      const feedback = formatNs5RulesGate(gate.issues);
      if (parsed.repairAttempt < MAX_REPAIRS) {
        return [
          addStep(context, mutationParent, createNs5RetryStep('rules40', moduleName, 'repair', parsed.repairAttempt + 1, { gateFeedback: feedback })),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `rules40 gate scheduled repair ${parsed.repairAttempt + 1}.`),
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

    const artifactPath = await persistArtifacts(moduleName, rules, pipeline);
    return [
      doneAnchor(context, mutationParent, moduleName, [artifactPath]),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `rules40 approved: ${artifactPath}`),
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
  rules: Ns5Rule[],
  pipeline: Ns5PipelineState,
): Promise<string> {
  const artifact = buildNs5RulesArtifact(moduleName, rules);
  const artifactPath = await writeDefs(rulesFile(moduleName), `${moduleName}Rules`, artifact, 'Ns5RulesArtifact');
  await writeJson(draftFile(moduleName, 'rules40'), artifact);
  await writeStepState(pipeline, {
    status: 'approved',
    updatedAt: new Date().toISOString(),
    artifactPaths: [artifactPath],
    ...(pipeline.invocation.fast ? { autoReason: 'fast' } : {}),
  });
  return artifactPath;
}

async function readModule(moduleName: string): Promise<Ns5ModuleArtifact> {
  if (!moduleName) throw new Error('rules40 needs a moduleName.');
  const artifact = await readDefsJson<Ns5ModuleArtifact>(moduleFile(moduleName));
  if (!artifact) throw new Error(`module.defs.ts is missing for ${moduleName}; module10 must run first.`);
  const pipeline = await readPipeline(moduleName);
  if (pipeline?.steps.ontology30?.status !== 'approved') {
    throw new Error(`ontology30 must be approved before rules40 (${moduleName}).`);
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

async function requirePipeline(moduleName: string): Promise<Ns5PipelineState> {
  const pipeline = await readPipeline(moduleName);
  if (!pipeline) throw new Error(`pipeline.json is missing for ${moduleName}.`);
  return pipeline;
}

async function writeStepState(
  pipeline: Ns5PipelineState,
  next: Ns5PipelineState['steps']['rules40'] & { status: 'running' | 'approved' | 'failed'; updatedAt: string },
): Promise<Ns5PipelineState> {
  const updated = markNs5Step(pipeline, 'rules40', next);
  await writePipeline(updated);
  return updated;
}

async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readPipeline(moduleName);
    if (!pipeline) return;
    await writePipeline(markNs5Step(pipeline, 'rules40', {
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

function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): RulesArgs {
  const root = parseRecord(value);
  const moduleName = text(root.moduleName) || memoryString(context, 'moduleName');
  return {
    planId: text(root.planId) || 'rules40',
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
      const affects = step.affects?.length ? ` affects=${step.affects.join(',')}` : '';
      return `- ${step.stepId} ${step.kind} ${step.entity}${affects}: ${step.description}`;
    }),
  ].join('\n')).join('\n\n');
}

function formatOntology(views: Ns5OntologyEntityViewItem[]): string {
  if (!views.length) return '(none)';
  return views.map(view => {
    const entity = view.source;
    const transitions = view.transitions.map(transition => {
      const by = Array.isArray(transition.by) ? transition.by.join(',') : transition.by;
      return `- ${view.entityId}.${transition.transitionId} ${transition.from.join('|')} -> ${transition.to} by=${by}: ${transition.description}`;
    });
    // ns5_43 T2: a v3 entity has no flat `fields` — its data is the platform record, printed as paths.
    if (isNs5OntologyV3Entity(entity)) {
      const lines = ns5OntologyV3FieldLines(entity);
      return [
        `### ${view.entityId} (${view.kind})`,
        view.description,
        'Fields:',
        ...(lines.length ? lines : ['- (none)']),
        ...(transitions.length ? ['Transitions:', ...transitions] : ['Transitions:', '- (none)']),
      ].join('\n');
    }
    const fields = entity.fields.map(field =>
      `- ${entity.entityId}.${field.fieldId} (${field.type}${field.required ? ', required' : ''}): ${field.description}`,
    );
    if (entity.storage?.idField && !entity.fields.some(field => field.fieldId === entity.storage.idField)) {
      fields.unshift(`- ${entity.entityId}.${entity.storage.idField} (identity)`);
    }
    const details = entity.details
      ? Object.entries(entity.details).map(([name, description]) => `- ${entity.entityId}.details.${name}: ${description}`)
      : [];
    return [
      `### ${entity.entityId} (${entity.kind})`,
      entity.description,
      'Fields:',
      ...(fields.length ? fields : ['- (none)']),
      ...(details.length ? ['Details:', ...details] : []),
      ...(transitions.length ? ['Transitions:', ...transitions] : ['Transitions:', '- (none)']),
    ].join('\n');
  }).join('\n\n');
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
    stepTitle: 'Rules done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({ moduleName, artifactPaths, completedStep: 'rules40', nextStep: 'integration70' }),
    planning: { planId: 'rules40-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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

NS5_STEP_HOOKS.rules40 = {
  beforePromptStep: beforeNs5RulesPromptStep,
  afterPromptStep: afterNs5RulesPromptStep,
};
