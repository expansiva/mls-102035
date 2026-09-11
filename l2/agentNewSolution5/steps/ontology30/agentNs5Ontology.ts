/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/ontology30/agentNs5Ontology.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { formatNs4Level1CatalogPrompt } from '/_102035_/l2/agentNewSolution/helpers/organizationContext.js';
import {
  NS5_AGENT_NAME,
  createNs5RetryStep,
  markNs5Step,
  ns5OntologyEntitySelector,
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
  reconcileModuleDefs,
  writeDefs,
  writeJson,
  writePipeline,
} from '/_102035_/l2/solution/fs.js';
import {
  bindingPromptEntity,
  createStrictArtifactTool,
  level1Catalog,
  unwrapArtifactPayload,
} from '/_102035_/l2/solution/lib.js';
import type {
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleActor,
  Ns5ModuleArtifact,
  Ns5OntologyEntityArtifact,
  Ns5PipelineState,
} from '/_102035_/l2/solution/types.js';
import {
  NS5_ONTOLOGY_MAX_PARALLEL,
  assembleNs5Ontology,
  buildNs5OntologyBindingsTool,
  buildNs5OntologyEntityTool,
  buildNs5OntologyPlanTool,
  normalizeNs5OntologyBindings,
  normalizeNs5OntologyEntity,
  normalizeNs5OntologyPlan,
  type Ns5OntologyBindingsDraft,
  type Ns5OntologyEntityDraft,
  type Ns5OntologyPlanDraft,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/contracts.js';
import {
  formatNs5OntologyGate,
  validateNs5OntologyBindings,
  validateNs5OntologyEntity,
  validateNs5OntologyPlan,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/gate.js';

const MAX_REPAIRS = 2;
const MAX_TRANSPORT_RETRIES = 1;
const MAX_ENTITY_REPAIR_ROUNDS = 2;

interface OntologyArgs {
  planId: string;
  moduleName: string;
  stage: 'plan' | 'finalize' | 'bindRelationships';
  repairAttempt: number;
  transportAttempt: number;
  entityRepairRound: number;
  gateFeedback: string;
}

export function buildNs5OntologyPlanHumanPrompt(input: {
  sourcePrompt: string;
  userLanguage: string;
  actors: Ns5ModuleActor[];
  journeys: Ns5JourneyArtifact[];
  level1Catalog: string;
  gateFeedback?: string;
  previousDraft?: unknown;
}): string {
  return [
    '## Source request',
    input.sourcePrompt,
    '',
    `## userLanguage`,
    input.userLanguage,
    '',
    '## Actors from module.defs.ts',
    formatActors(input.actors),
    '',
    '## Journeys (business)',
    formatJourneys(input.journeys),
    '',
    input.level1Catalog,
    input.gateFeedback ? `## Deterministic repair required\n${input.gateFeedback}` : '',
    input.previousDraft ? `## Current draft; keep unrelated fields\n${JSON.stringify(input.previousDraft, null, 2)}` : '',
  ].filter(Boolean).join('\n');
}

export function buildNs5OntologyEntityHumanPrompt(input: {
  sourcePrompt: string;
  userLanguage: string;
  actors: Ns5ModuleActor[];
  journeys: Ns5JourneyArtifact[];
  plan: Ns5OntologyPlanDraft;
  entityId: string;
  level1Catalog: string;
  gateFeedback?: string;
  previousDraft?: unknown;
}): string {
  const entity = input.plan.entities.find(item => item.entityId === input.entityId);
  const touching = input.plan.relationships.filter(item => item.fromEntity === input.entityId || item.toEntity === input.entityId);
  return [
    '## Source request',
    input.sourcePrompt,
    '',
    `## userLanguage`,
    input.userLanguage,
    '',
    '## Actors from module.defs.ts',
    formatActors(input.actors),
    '',
    '## Journeys that touch this entity',
    formatJourneys(input.journeys.filter(journey => journeyTouches(journey, input.entityId))),
    '',
    '## Frozen entity',
    JSON.stringify(entity, null, 2),
    '',
    '## Touching relationships',
    JSON.stringify(touching, null, 2),
    '',
    '## All valid entity ids and storage targets',
    JSON.stringify(input.plan.entities.map(item => ({ entityId: item.entityId, kind: item.kind, storage: item.storage.target }))),
    '',
    input.level1Catalog,
    input.gateFeedback ? `## Deterministic repair required\n${input.gateFeedback}` : '',
    input.previousDraft ? `## Current draft; keep unrelated fields\n${JSON.stringify(input.previousDraft, null, 2)}` : '',
  ].filter(Boolean).join('\n');
}

export function buildNs5OntologyBindingsHumanPrompt(input: {
  plan: Ns5OntologyPlanDraft;
  entities: Ns5OntologyEntityArtifact[];
  gateFeedback?: string;
  previousDraft?: unknown;
}): string {
  return [
    '## Frozen relationships',
    JSON.stringify(input.plan.relationships, null, 2),
    '',
    '## Entities with resolvable fields (mdm identity is included even when fields is empty)',
    JSON.stringify(input.entities.map(entity => bindingPromptEntity(entity)), null, 2),
    input.gateFeedback ? `## Deterministic repair required\n${input.gateFeedback}` : '',
    input.previousDraft ? `## Current draft; keep unrelated fields\n${JSON.stringify(input.previousDraft, null, 2)}` : '',
  ].filter(Boolean).join('\n');
}

export async function beforeNs5OntologyPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution5:ontology30] task invalid');
  const entityId = ns5OntologyEntitySelector(args) || ns5OntologyEntitySelector(step.prompt);
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, entityId ? JSON.stringify({ planId: 'ontology30' }) : (args || step.prompt));
    moduleName = parsed.moduleName;
    if (entityId) return [await buildEntityPrompt(context, parentStep, hookSequential, args || String(step.prompt || ''), parsed, entityId)];
    if (parsed.stage === 'finalize') {
      return await finalizeOntology(context, parentStep, step, hookSequential, parsed);
    }
    if (parsed.stage === 'bindRelationships') {
      return [await buildBindingsPrompt(context, parentStep, hookSequential, args || String(step.prompt || ''), parsed)];
    }
    return [await buildPlanPrompt(context, parentStep, hookSequential, args || String(step.prompt || ''), parsed)];
  } catch (error) {
    const message = errorMessage(error);
    if (entityId) {
      return [updateStatus(context, parentStep, step, hookSequential, 'completed', `Entity ${entityId} prompt failed; finalizer will repair it. | ${message}`)];
    }
    await recordFailure(moduleName, message);
    return [
      ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
      updateStatus(context, parentStep, step, hookSequential, 'failed', message),
    ];
  }
}

export async function afterNs5OntologyPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const entityId = ns5OntologyEntitySelector(args) || ns5OntologyEntitySelector(step.prompt);
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, entityId ? JSON.stringify({ planId: 'ontology30', moduleName: memoryString(context, 'moduleName') }) : step.prompt);
    moduleName = parsed.moduleName;
    const mutationParent = findMutableParent(context, parentStep);
    if (entityId) {
      return await handleEntityResult(context, mutationParent, step, hookSequential, parsed, entityId);
    }
    if (parsed.stage === 'bindRelationships') {
      return await handleBindingsResult(context, mutationParent, step, hookSequential, parsed);
    }
    if (parsed.stage === 'finalize') {
      throw new Error('ontology30 finalize is deterministic and must not call a model.');
    }
    return await handlePlanResult(agent, context, mutationParent, step, hookSequential, parsed);
  } catch (error) {
    const message = errorMessage(error);
    if (entityId) {
      return [updateStatus(context, parentStep, step, hookSequential, 'completed', `Entity ${entityId} failed; finalizer will repair it. | ${message}`)];
    }
    await recordFailure(moduleName, message);
    return [
      ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
      updateStatus(context, parentStep, step, hookSequential, 'failed', message),
    ];
  }
}

async function buildPlanPrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  args: string,
  parsed: OntologyArgs,
): Promise<mls.msg.AgentIntentPromptReady> {
  const [moduleArtifact, journeys, prompt, schema, previous] = await Promise.all([
    readModule(parsed.moduleName),
    readJourneys(parsed.moduleName),
    readAgentText('steps/ontology30', 'prompt', '.md'),
    readAgentJson<Record<string, unknown>>('schemas', 'ontology-plan.schema', '.json'),
    readJson(draftFile(parsed.moduleName, 'ontology30-plan')),
  ]);
  const sourcePrompt = await readSourcePrompt(context, parsed.moduleName, moduleArtifact);
  const tool = buildNs5OntologyPlanTool(schema, createStrictArtifactTool);
  const humanPrompt = buildNs5OntologyPlanHumanPrompt({
    sourcePrompt,
    userLanguage: moduleArtifact.userLanguage,
    actors: moduleArtifact.actors,
    journeys,
    level1Catalog: formatNs4Level1CatalogPrompt(level1Catalog()),
    gateFeedback: parsed.gateFeedback,
    previousDraft: previous,
  });
  return promptReady(context, parentStep, hookSequential, args, prompt, humanPrompt, tool);
}

async function buildEntityPrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  args: string,
  parsed: OntologyArgs,
  entityId: string,
): Promise<mls.msg.AgentIntentPromptReady> {
  const plan = await readPlanDraft(parsed.moduleName);
  if (!plan.entities.some(entity => entity.entityId === entityId)) {
    throw new Error(`Entity ${entityId} is not present in the ontology30 overview.`);
  }
  const [moduleArtifact, journeys, prompt, schema, previous] = await Promise.all([
    readModule(parsed.moduleName),
    readJourneys(parsed.moduleName),
    readAgentText('steps/ontology30', 'promptEntity', '.md'),
    readAgentJson<Record<string, unknown>>('schemas', 'ontology-entity.schema', '.json'),
    readJson(entityDraftFile(parsed.moduleName, entityId)),
  ]);
  const sourcePrompt = await readSourcePrompt(context, parsed.moduleName, moduleArtifact);
  const tool = buildNs5OntologyEntityTool(schema, createStrictArtifactTool);
  const humanPrompt = buildNs5OntologyEntityHumanPrompt({
    sourcePrompt,
    userLanguage: moduleArtifact.userLanguage,
    actors: moduleArtifact.actors,
    journeys,
    plan,
    entityId,
    level1Catalog: formatNs4Level1CatalogPrompt(level1Catalog()),
    previousDraft: previous,
  });
  return promptReady(context, parentStep, hookSequential, args, prompt, humanPrompt, tool);
}

async function buildBindingsPrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  args: string,
  parsed: OntologyArgs,
): Promise<mls.msg.AgentIntentPromptReady> {
  const plan = await readPlanDraft(parsed.moduleName);
  const details = await readAllEntityDrafts(plan);
  const assembled = assembleNs5Ontology(plan, details);
  const [prompt, schema, previous] = await Promise.all([
    readAgentText('steps/ontology30', 'promptRelationships', '.md'),
    readAgentJson<Record<string, unknown>>('schemas', 'ontology-bindings.schema', '.json'),
    readJson(draftFile(parsed.moduleName, 'ontology30-bindings')),
  ]);
  const tool = buildNs5OntologyBindingsTool(schema, createStrictArtifactTool);
  const humanPrompt = buildNs5OntologyBindingsHumanPrompt({
    plan,
    entities: assembled.entities,
    gateFeedback: parsed.gateFeedback,
    previousDraft: previous,
  });
  return promptReady(context, parentStep, hookSequential, args, prompt, humanPrompt, tool);
}

async function handlePlanResult(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsed: OntologyArgs,
): Promise<mls.msg.AgentIntent[]> {
  const payload = unwrapArtifactPayload(step.interaction?.payload?.[0]);
  if (!isRecord(payload)) {
    const failure = readPromptFailure(step, 'ontology30 returned no usable plan artifact.');
    if (parsed.transportAttempt < MAX_TRANSPORT_RETRIES) {
      return [
        addStep(context, mutationParent, createNs5RetryStep('ontology30', parsed.moduleName, 'transport', parsed.transportAttempt + 1)),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', `ontology30 transport retry ${parsed.transportAttempt + 1} scheduled: ${failure}`),
      ];
    }
    throw new Error(failure);
  }
  const moduleArtifact = await readModule(parsed.moduleName);
  const journeys = await readJourneys(parsed.moduleName);
  const plan = normalizeNs5OntologyPlan(payload, parsed.moduleName, journeys);
  plan.moduleName = parsed.moduleName;
  let pipeline = await requirePipeline(parsed.moduleName);
  pipeline = await writeStepState(pipeline, { status: 'running', updatedAt: new Date().toISOString() });
  await writeJson(draftFile(parsed.moduleName, 'ontology30-plan'), plan);
  const gate = validateNs5OntologyPlan(plan, {
    moduleName: parsed.moduleName,
    actors: moduleArtifact.actors,
    journeys,
  });
  if (!gate.ok) {
    const feedback = formatNs5OntologyGate(gate.issues);
    if (parsed.repairAttempt < MAX_REPAIRS) {
      return [
        addStep(context, mutationParent, createNs5RetryStep('ontology30', parsed.moduleName, 'repair', parsed.repairAttempt + 1, { gateFeedback: feedback })),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', `ontology30 plan gate scheduled repair ${parsed.repairAttempt + 1}.`),
      ];
    }
    await writeStepState(pipeline, {
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error: feedback,
    });
    throw new Error(feedback);
  }
  const parallel = parallelEntityStep(context, step, agent.agentName, plan, 0);
  return [
    parallel,
    addStep(context, mutationParent, createFinalizeStep(parsed.moduleName, 0, [String(parallel.step.planning?.planId || '')])),
    updateStatus(context, mutationParent, step, hookSequential, 'completed', `ontology30 overview ready; detailing ${plan.entities.length} entities with maxParallel=${NS5_ONTOLOGY_MAX_PARALLEL}.`),
  ];
}

async function handleEntityResult(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsed: OntologyArgs,
  entityId: string,
): Promise<mls.msg.AgentIntent[]> {
  const plan = await readPlanDraft(parsed.moduleName);
  const payload = unwrapArtifactPayload(step.interaction?.payload?.[0]);
  if (!isRecord(payload)) {
    return [updateStatus(context, mutationParent, step, hookSequential, 'completed', `Entity ${entityId} returned no usable payload; finalizer will repair it.`)];
  }
  const detail = normalizeNs5OntologyEntity(payload, entityId);
  await writeJson(entityDraftFile(parsed.moduleName, entityId), detail);
  const moduleArtifact = await readModule(parsed.moduleName);
  const journeys = await readJourneys(parsed.moduleName);
  const gate = validateNs5OntologyEntity(plan, detail, {
    moduleName: parsed.moduleName,
    actors: moduleArtifact.actors,
    journeys,
  });
  if (!gate.ok) {
    return [updateStatus(context, mutationParent, step, hookSequential, 'completed', `Entity ${entityId} gate failed; finalizer will repair it. | ${formatNs5OntologyGate(gate.issues)}`)];
  }
  return [updateStatus(context, mutationParent, step, hookSequential, 'completed', `Entity ${entityId} detail saved.`)];
}

async function handleBindingsResult(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsed: OntologyArgs,
): Promise<mls.msg.AgentIntent[]> {
  const payload = unwrapArtifactPayload(step.interaction?.payload?.[0]);
  if (!isRecord(payload)) {
    const failure = readPromptFailure(step, 'ontology30 returned no usable relationship bindings.');
    if (parsed.transportAttempt < MAX_TRANSPORT_RETRIES) {
      return [
        addStep(context, mutationParent, createBindingsStep(parsed.moduleName, parsed.repairAttempt, parsed.transportAttempt + 1, parsed.gateFeedback)),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', `ontology30 bindings transport retry ${parsed.transportAttempt + 1} scheduled: ${failure}`),
      ];
    }
    throw new Error(failure);
  }
  const plan = await readPlanDraft(parsed.moduleName);
  const details = await readAllEntityDrafts(plan);
  const bindings = normalizeNs5OntologyBindings(payload);
  await writeJson(draftFile(parsed.moduleName, 'ontology30-bindings'), bindings);
  const moduleArtifact = await readModule(parsed.moduleName);
  const journeys = await readJourneys(parsed.moduleName);
  const gate = validateNs5OntologyBindings(plan, details, bindings, {
    moduleName: parsed.moduleName,
    actors: moduleArtifact.actors,
    journeys,
  });
  if (!gate.ok) {
    const feedback = formatNs5OntologyGate(gate.issues);
    if (parsed.repairAttempt < MAX_REPAIRS) {
      return [
        addStep(context, mutationParent, createBindingsStep(parsed.moduleName, parsed.repairAttempt + 1, 0, feedback)),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', `ontology30 bindings gate scheduled repair ${parsed.repairAttempt + 1}.`),
      ];
    }
    throw new Error(feedback);
  }
  const pipeline = await requirePipeline(parsed.moduleName);
  const artifactPaths = await persistArtifacts(parsed.moduleName, plan, details, bindings, pipeline, gate.uncitedEntities);
  return [
    doneAnchor(context, mutationParent, parsed.moduleName, artifactPaths),
    updateStatus(context, mutationParent, step, hookSequential, 'completed', `ontology30 approved: ${artifactPaths.join(', ')}`),
  ];
}

async function finalizeOntology(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsed: OntologyArgs,
): Promise<mls.msg.AgentIntent[]> {
  const mutationParent = findMutableParent(context, parentStep);
  const plan = await readPlanDraft(parsed.moduleName);
  const invalid: string[] = [];
  const details: Ns5OntologyEntityDraft[] = [];
  const moduleArtifact = await readModule(parsed.moduleName);
  const journeys = await readJourneys(parsed.moduleName);
  for (const entity of plan.entities) {
    const detail = await readJson<Ns5OntologyEntityDraft>(entityDraftFile(parsed.moduleName, entity.entityId));
    if (!detail || !validateNs5OntologyEntity(plan, detail, {
      moduleName: parsed.moduleName,
      actors: moduleArtifact.actors,
      journeys,
    }).ok) {
      invalid.push(entity.entityId);
    } else {
      details.push(detail);
    }
  }
  if (invalid.length && parsed.entityRepairRound < MAX_ENTITY_REPAIR_ROUNDS) {
    const parallel = parallelEntityStep(context, step, NS5_AGENT_NAME, plan, parsed.entityRepairRound + 1, invalid);
    return [
      parallel,
      addStep(context, mutationParent, createFinalizeStep(parsed.moduleName, parsed.entityRepairRound + 1, [String(parallel.step.planning?.planId || '')])),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `${invalid.length} invalid/missing entities; targeted parallel repair started: ${invalid.join(', ')}.`),
    ];
  }
  if (invalid.length) {
    throw new Error(`ontology30 entities remain invalid after repair: ${invalid.join(', ')}.`);
  }
  if (!plan.relationships.length) {
    const pipeline = await requirePipeline(parsed.moduleName);
    const emptyBindings: Ns5OntologyBindingsDraft = { bindings: [] };
    const gate = validateNs5OntologyBindings(plan, details, emptyBindings, {
      moduleName: parsed.moduleName,
      actors: moduleArtifact.actors,
      journeys,
      requireRelationshipRealization: false,
    });
    if (!gate.ok) throw new Error(formatNs5OntologyGate(gate.issues));
    const artifactPaths = await persistArtifacts(parsed.moduleName, plan, details, emptyBindings, pipeline, gate.uncitedEntities);
    return [
      doneAnchor(context, mutationParent, parsed.moduleName, artifactPaths),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `ontology30 approved: ${artifactPaths.join(', ')}`),
    ];
  }
  return [
    addStep(context, mutationParent, createBindingsStep(parsed.moduleName, 0, 0, '')),
    updateStatus(context, mutationParent, step, hookSequential, 'completed', `ontology30 entities ready; binding ${plan.relationships.length} relationships.`),
  ];
}

async function persistArtifacts(
  moduleName: string,
  plan: Ns5OntologyPlanDraft,
  details: Ns5OntologyEntityDraft[],
  bindings: Ns5OntologyBindingsDraft,
  pipeline: Ns5PipelineState,
  uncitedEntities: string[],
): Promise<string[]> {
  const assembled = assembleNs5Ontology(plan, details, bindings);
  const artifactPaths: string[] = [];
  for (const entity of assembled.entities) {
    artifactPaths.push(
      await writeDefs(
        ontologyEntityFile(moduleName, entity.entityId),
        `${moduleName}Entity${entity.entityId}`,
        entity,
        'Ns5OntologyEntityArtifact',
      ),
    );
  }
  artifactPaths.push(
    await writeDefs(ontologyIndexFile(moduleName), `${moduleName}OntologyIndex`, assembled.index, 'Ns5OntologyIndexArtifact'),
  );
  const removedOrphans = await reconcileModuleDefs(
    moduleName,
    'ontology',
    assembled.entities.map(entity => entity.entityId),
  );
  await writeJson(draftFile(moduleName, 'ontology30'), {
    plan,
    entities: assembled.entities,
    relationships: assembled.index.relationships,
    removedOrphans,
  });
  await writeStepState(pipeline, {
    status: 'approved',
    updatedAt: new Date().toISOString(),
    artifactPaths,
    uncitedEntities,
    ...(pipeline.invocation.fast ? { autoReason: 'fast' } : {}),
  });
  return artifactPaths;
}

function parallelEntityStep(
  context: mls.msg.ExecutionContext,
  hostStep: mls.msg.AIAgentStep,
  agentName: string,
  plan: Ns5OntologyPlanDraft,
  repairRound: number,
  entityIds = plan.entities.map(entity => entity.entityId),
): mls.msg.AgentIntentAddStep {
  if (!context.task) throw new Error('[agentNewSolution5:ontology30] task invalid');
  if (!entityIds.length) throw new Error('ontology30 entity fan-out cannot be empty.');
  const planId = `ontology30-entities-${repairRound}`;
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    parentStepId: hostStep.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: {
        input: [{ type: 'system', content: '<!-- modelType: reasoning -->' }],
        cost: 0,
        trace: [`queued ${entityIds.length} ontology30 entities with maxParallel=${NS5_ONTOLOGY_MAX_PARALLEL}`],
        payload: null,
      },
      stepTitle: 'Detailing {{completed}}/{{total}} ontology entities, failed {{failed}}',
      status: 'in_progress',
      nextSteps: [],
      agentName,
      onFailure: 'wait_after_prompt',
      prompt: JSON.stringify({ planId: 'ontology30', moduleName: plan.moduleName }),
      rags: [],
      planning: { planId, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
    executionMode: { type: 'parallel', args: entityIds.map(entityId => `entity:${entityId}`), maxParallel: NS5_ONTOLOGY_MAX_PARALLEL },
  };
}

function createFinalizeStep(moduleName: string, entityRepairRound: number, dependsOn: string[]): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: entityRepairRound ? `Finalize ontology · ${entityRepairRound}` : 'Finalize ontology',
    status: dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [],
    agentName: NS5_AGENT_NAME,
    prompt: JSON.stringify({ planId: 'ontology30', moduleName, stage: 'finalize', entityRepairRound }),
    rags: [],
    planning: {
      planId: `ontology30-finalize-${entityRepairRound}`,
      dependsOn,
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

function createBindingsStep(
  moduleName: string,
  repairAttempt: number,
  transportAttempt: number,
  gateFeedback: string,
): mls.msg.AIAgentStep {
  const suffix = repairAttempt ? ` · R${repairAttempt}` : '';
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: `Bind ontology relationships${suffix}`,
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: NS5_AGENT_NAME,
    prompt: JSON.stringify({
      planId: 'ontology30',
      moduleName,
      stage: 'bindRelationships',
      repairAttempt,
      transportAttempt,
      ...(gateFeedback ? { gateFeedback } : {}),
    }),
    rags: [],
    planning: {
      planId: repairAttempt ? `ontology30-bindings-repair-${repairAttempt}` : 'ontology30-bindings',
      dependsOn: [],
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

async function readModule(moduleName: string): Promise<Ns5ModuleArtifact> {
  if (!moduleName) throw new Error('ontology30 needs a moduleName.');
  const artifact = await readDefsJson<Ns5ModuleArtifact>(moduleFile(moduleName));
  if (!artifact) throw new Error(`module.defs.ts is missing for ${moduleName}; module10 must run first.`);
  const pipeline = await readPipeline(moduleName);
  if (pipeline?.steps.journeys20?.status !== 'approved') {
    throw new Error(`journeys20 must be approved before ontology30 (${moduleName}).`);
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

async function readPlanDraft(moduleName: string): Promise<Ns5OntologyPlanDraft> {
  const plan = await readJson<Ns5OntologyPlanDraft>(draftFile(moduleName, 'ontology30-plan'));
  if (!plan?.entities?.length) throw new Error(`ontology30 plan draft is missing for ${moduleName}.`);
  return plan;
}

async function readAllEntityDrafts(plan: Ns5OntologyPlanDraft): Promise<Ns5OntologyEntityDraft[]> {
  const details = await Promise.all(plan.entities.map(entity => readJson<Ns5OntologyEntityDraft>(entityDraftFile(plan.moduleName, entity.entityId))));
  if (details.some(detail => !detail)) throw new Error('ontology30 relationship binding cannot start before every entity detail exists.');
  return details as Ns5OntologyEntityDraft[];
}

function entityDraftFile(moduleName: string, entityId: string) {
  return draftFile(moduleName, `ontology30-${entityId}`);
}

async function requirePipeline(moduleName: string): Promise<Ns5PipelineState> {
  const pipeline = await readPipeline(moduleName);
  if (!pipeline) throw new Error(`pipeline.json is missing for ${moduleName}.`);
  return pipeline;
}

async function writeStepState(
  pipeline: Ns5PipelineState,
  next: Ns5PipelineState['steps']['ontology30'] & { status: 'running' | 'approved' | 'failed'; updatedAt: string },
): Promise<Ns5PipelineState> {
  const updated = markNs5Step(pipeline, 'ontology30', next);
  await writePipeline(updated);
  return updated;
}

async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readPipeline(moduleName);
    if (!pipeline) return;
    await writePipeline(markNs5Step(pipeline, 'ontology30', {
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

function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): OntologyArgs {
  const root = parseRecord(value);
  const stage = text(root.stage);
  return {
    planId: text(root.planId) || 'ontology30',
    moduleName: text(root.moduleName) || memoryString(context, 'moduleName'),
    stage: stage === 'finalize' || stage === 'bindRelationships' ? stage : 'plan',
    repairAttempt: integer(root.repairAttempt),
    transportAttempt: integer(root.transportAttempt),
    entityRepairRound: integer(root.entityRepairRound),
    gateFeedback: text(root.gateFeedback),
  };
}

function formatActors(actors: Ns5ModuleActor[]): string {
  if (!actors.length) return '(none)';
  return actors.map(actor => `- ${actor.actorId} (${actor.kind}, ${actor.origin}): ${actor.title} — ${actor.description}`).join('\n');
}

function formatJourneys(journeys: Ns5JourneyArtifact[]): string {
  if (!journeys.length) return '(none)';
  return journeys.map(journey => [
    `### ${journey.journeyId} (${journey.business.actorRef})`,
    journey.business.title,
    journey.business.goal,
    ...journey.business.steps.map(step => {
      const affects = step.affects?.length ? ` affects=${step.affects.join(',')}` : '';
      const decide = step.kind === 'decide' ? ' decide' : '';
      return `- ${step.stepId} ${step.kind} ${step.entity}${affects}${decide}: ${step.description}`;
    }),
  ].join('\n')).join('\n\n');
}

function journeyTouches(journey: Ns5JourneyArtifact, entityId: string): boolean {
  return journey.business.steps.some(step => step.entity === entityId || step.affects?.includes(entityId));
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
    stepTitle: 'Ontology done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({ moduleName, artifactPaths, completedStep: 'ontology30', nextStep: 'rules40' }),
    planning: { planId: 'ontology30-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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

NS5_STEP_HOOKS.ontology30 = {
  beforePromptStep: beforeNs5OntologyPromptStep,
  afterPromptStep: afterNs5OntologyPromptStep,
};
