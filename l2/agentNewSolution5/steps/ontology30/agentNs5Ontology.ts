/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/ontology30/agentNs5Ontology.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { ddm } from '/_102034_/l4/ontology/ddm.defs.js';
import { mdm } from '/_102034_/l4/ontology/mdm.defs.js';
import { tdm } from '/_102034_/l4/ontology/tdm.defs.js';
import { resolvePlatformEntity } from '/_102034_/l2/mdm/resolveMdmEntity.js';
import type { MdmSubtypeName } from '/_102034_/l1/mdm/defs/ontologyTypes.js';
import { readNs5Actors } from '/_102035_/l2/agentNewSolution5/helpers/ns5Actors.js';
import { formatNs5Siblings, readNs5Siblings } from '/_102035_/l2/agentNewSolution5/helpers/ns5Siblings.js';
import {
  NS5_AGENT_NAME,
  createNs5RetryStep,
  markNs5Step,
  ns5OntologyEntitySelector,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import {
  composeNs5SystemPrompt,
  readNs5MdmSkill,
  readNs5OntologyTableSkill,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5Skills.js';
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
  workflowsFile,
  writeDefs,
  writeJson,
  writePipeline,
} from '/_102035_/l2/solution/fs.js';
import {
  createStrictArtifactTool,
  unwrapArtifactPayload,
} from '/_102035_/l2/solution/lib.js';
import type {
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleActor,
  Ns5ModuleArtifact,
  Ns5OntologyEntityV3,
  Ns5PipelineState,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';
import {
  applyNs5ModuleDetails,
  collectNs5CitedProcessStages,
  collectNs5CitedTransitions,
  collectNs5PersonalScopeActors,
  formatNs5PersonalScopeActors,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/contracts.js';
import {
  NS5_ONTOLOGY_V3_MAX_PARALLEL,
  assembleNs5OntologyIndexV3,
  buildNs5OntologyEntityV3Tool,
  buildNs5OntologyPlanV3Tool,
  collectNs5CitedCapabilitiesV3,
  collectNs5CitedEntitiesV3,
  collectNs5CitedRulesV3,
  formatNs5FamilyStartingPoint,
  formatNs5PlatformCatalog,
  formatNs5PlatformStartingPoint,
  liftNs5AggregateOnlyEntitiesV3,
  normalizeNs5OntologyEntityV3,
  normalizeNs5OntologyPlanV3,
  ns5FamilyOfV3,
  type Ns5OntologyV3Normalization,
  type Ns5OntologyV3PlanDraft,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/contractsV3.js';
import {
  formatNs5OntologyV3Gate,
  validateNs5OntologyAssemblyV3,
  validateNs5OntologyEntityV3,
  validateNs5OntologyPlanV3,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/gateV3.js';

const MAX_REPAIRS = 2;
const MAX_TRANSPORT_RETRIES = 1;
const MAX_ENTITY_REPAIR_ROUNDS = 2;

interface OntologyArgs {
  planId: string;
  moduleName: string;
  stage: 'plan' | 'finalize';
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
  /** ns5_49: workflows50 already ran; its stages name entities this plan must declare. */
  workflows?: Ns5WorkflowsArtifact | null;
  platformCatalog: string;
  siblingsText?: string;
  gateFeedback?: string;
  previousDraft?: unknown;
}): string {
  return [
    '## Source request',
    input.sourcePrompt,
    '',
    '## userLanguage',
    input.userLanguage,
    '',
    '## Actors',
    formatActors(input.actors),
    '',
    '## Journeys (business)',
    formatJourneys(input.journeys),
    '',
    formatNs5PersonalScopeActors(collectNs5PersonalScopeActors(input.actors, input.journeys)),
    '',
    '## Entities the process stages write',
    formatProcessStages(input.workflows, ''),
    '',
    input.siblingsText || '',
    input.platformCatalog,
    input.gateFeedback ? `## Deterministic repair required\n${input.gateFeedback}` : '',
    input.previousDraft ? `## Current draft; keep unrelated fields\n${JSON.stringify(input.previousDraft, null, 2)}` : '',
  ].filter(Boolean).join('\n');
}

export function buildNs5OntologyEntityHumanPrompt(input: {
  sourcePrompt: string;
  userLanguage: string;
  actors: Ns5ModuleActor[];
  journeys: Ns5JourneyArtifact[];
  /** ns5_49: the second source of citations; a stage owns the transition it applies. */
  workflows?: Ns5WorkflowsArtifact | null;
  plan: Ns5OntologyV3PlanDraft;
  entityId: string;
  /** The catalog of the entity's family: the platform record on a role, `tdm`/`ddm` on a table. */
  startingPoint?: string;
  platformCatalog: string;
  gateFeedback?: string;
  previousDraft?: unknown;
}): string {
  const entity = input.plan.entities.find(item => item.entityId === input.entityId);
  const touching = input.plan.relationships.filter(item => item.from === input.entityId || item.to === input.entityId);
  return [
    '## Source request',
    input.sourcePrompt,
    '',
    '## userLanguage',
    input.userLanguage,
    '',
    '## Actors',
    formatActors(input.actors),
    '',
    '## Journeys that touch this entity',
    formatJourneys(input.journeys.filter(journey => journeyTouches(journey, input.entityId))),
    '',
    '## Process stages that touch this entity',
    formatProcessStages(input.workflows, input.entityId),
    '',
    '## Cited transitions this entity must declare',
    formatCitedTransitions(input.journeys, input.workflows, input.entityId),
    '',
    '## Frozen entity',
    JSON.stringify(entity, null, 2),
    '',
    '## Links this entity reads (relationshipId is frozen)',
    JSON.stringify(touching, null, 2),
    '',
    '## All entity ids of this module',
    JSON.stringify(input.plan.entities.map(item => ({ entityId: item.entityId, kind: item.kind, family: item.family, subtype: item.subtype, class: item.class }))),
    '',
    input.startingPoint || '',
    // A role's starting point IS the platform record, so the catalog would repeat it. A table now has a
    // starting point of its own and still needs the catalog: the value types it may reuse (`of`) and the
    // subtypes its foreign keys point at live there.
    entity?.kind === 'role' && input.startingPoint ? '' : input.platformCatalog,
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

/** The system prompt of every ontology30 pass: the MDM skill, then the table skill, then the step. */
async function ontologySystemPrompt(stepPrompt: string): Promise<string> {
  const [mdmSkill, tableSkill] = await Promise.all([readNs5MdmSkill(), readNs5OntologyTableSkill()]);
  return composeNs5SystemPrompt([mdmSkill, tableSkill], stepPrompt);
}

async function buildPlanPrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  args: string,
  parsed: OntologyArgs,
): Promise<mls.msg.AgentIntentPromptReady> {
  const [moduleArtifact, journeys, workflows, prompt, schema, previous, siblings] = await Promise.all([
    readModule(parsed.moduleName),
    readJourneys(parsed.moduleName),
    readWorkflows(parsed.moduleName),
    readAgentText('steps/ontology30', 'prompt', '.md'),
    readAgentJson<Record<string, unknown>>('schemas', 'ontology-plan-v3.schema', '.json'),
    readJson(draftFile(parsed.moduleName, 'ontology30-plan')),
    readNs5Siblings(parsed.moduleName),
  ]);
  const sourcePrompt = await readSourcePrompt(context, parsed.moduleName, moduleArtifact);
  const tool = buildNs5OntologyPlanV3Tool(schema, createStrictArtifactTool);
  const humanPrompt = buildNs5OntologyPlanHumanPrompt({
    sourcePrompt,
    userLanguage: moduleArtifact.userLanguage,
    actors: await readNs5Actors(parsed.moduleName),
    journeys,
    workflows,
    platformCatalog: formatNs5PlatformCatalog(mdm),
    siblingsText: formatNs5Siblings(siblings),
    gateFeedback: parsed.gateFeedback,
    previousDraft: previous,
  });
  return promptReady(context, parentStep, hookSequential, args, await ontologySystemPrompt(prompt), humanPrompt, tool);
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
  const frozen = plan.entities.find(entity => entity.entityId === entityId);
  if (!frozen) {
    throw new Error(`Entity ${entityId} is not present in the ontology30 overview.`);
  }
  const [moduleArtifact, journeys, workflows, prompt, schema, previous] = await Promise.all([
    readModule(parsed.moduleName),
    readJourneys(parsed.moduleName),
    readWorkflows(parsed.moduleName),
    readAgentText('steps/ontology30', 'promptEntity', '.md'),
    readAgentJson<Record<string, unknown>>('schemas', 'ontology-entity-v3.schema', '.json'),
    readJson(entityDraftFile(parsed.moduleName, entityId)),
  ]);
  const sourcePrompt = await readSourcePrompt(context, parsed.moduleName, moduleArtifact);
  const tool = buildNs5OntologyEntityV3Tool(schema, createStrictArtifactTool);
  const humanPrompt = buildNs5OntologyEntityHumanPrompt({
    sourcePrompt,
    userLanguage: moduleArtifact.userLanguage,
    actors: await readNs5Actors(parsed.moduleName),
    journeys,
    workflows,
    plan,
    entityId,
    startingPoint: startingPointFor(frozen, parsed.moduleName),
    platformCatalog: formatNs5PlatformCatalog(mdm),
    gateFeedback: parsed.gateFeedback,
    previousDraft: previous,
  });
  return promptReady(context, parentStep, hookSequential, args, await ontologySystemPrompt(prompt), humanPrompt, tool);
}

/**
 * Every entity starts from the catalog of its family (ns5_46): a role from the platform record of its
 * subtype, a table from `tdm.defs.ts` or `ddm.defs.ts`. Before this, a table started from nothing, and
 * each call of the fan-out invented what a table may do.
 */
function startingPointFor(entity: Ns5OntologyV3PlanDraft['entities'][number], moduleName: string): string | undefined {
  const family = ns5FamilyOfV3(entity);
  if (family === 'mdm') {
    if (entity.kind !== 'role' || !entity.subtype) return undefined;
    if (!(entity.subtype in mdm.subtypes)) return undefined;
    const view = resolvePlatformEntity(mdm, entity.subtype as MdmSubtypeName, moduleName);
    return formatNs5PlatformStartingPoint(view, entity.subtype);
  }
  return formatNs5FamilyStartingPoint(family === 'ddm' ? ddm : tdm, entity);
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
  await readModule(parsed.moduleName);
  const journeys = await readJourneys(parsed.moduleName);
  const workflows = await readWorkflows(parsed.moduleName);
  const plan = normalizeNs5OntologyPlanV3(payload, parsed.moduleName);
  plan.moduleName = parsed.moduleName;
  let pipeline = await requirePipeline(parsed.moduleName);
  pipeline = await writeStepState(pipeline, { status: 'running', updatedAt: new Date().toISOString() });
  await writeJson(draftFile(parsed.moduleName, 'ontology30-plan'), plan);
  const gate = validateNs5OntologyPlanV3(plan, { moduleName: parsed.moduleName, mdm, tdm, ddm, journeys, workflows });
  if (!gate.ok) {
    const feedback = formatNs5OntologyV3Gate(gate.issues);
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
    updateStatus(context, mutationParent, step, hookSequential, 'completed', `ontology30 overview ready; detailing ${plan.entities.length} entities with maxParallel=${NS5_ONTOLOGY_V3_MAX_PARALLEL}.`),
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
  const moduleArtifact = await readModule(parsed.moduleName);
  const journeys = await readJourneys(parsed.moduleName);
  const workflows = await readWorkflows(parsed.moduleName);
  const normalizations: Ns5OntologyV3Normalization[] = [];
  const entity = normalizeNs5OntologyEntityV3(payload, entityId, {
    moduleName: parsed.moduleName,
    mdm,
    plan,
    journeys,
    workflows,
  }, normalizations);
  if (!entity) {
    return [updateStatus(context, mutationParent, step, hookSequential, 'completed', `Entity ${entityId} is not in the plan; finalizer will repair it.`)];
  }
  await writeJson(entityDraftFile(parsed.moduleName, entityId), { entity, normalizations });
  const gate = validateNs5OntologyEntityV3(entity, plan, {
    moduleName: parsed.moduleName,
    mdm,
    tdm,
    ddm,
    journeys,
    workflows,
    evidenceText: await evidenceText(context, parsed.moduleName, moduleArtifact, journeys),
    actors: (await readNs5Actors(parsed.moduleName)).map(actor => actor.actorId),
  });
  if (!gate.ok) {
    return [updateStatus(context, mutationParent, step, hookSequential, 'completed', `Entity ${entityId} gate failed; finalizer will repair it. | ${formatNs5OntologyV3Gate(gate.issues)}`)];
  }
  return [updateStatus(context, mutationParent, step, hookSequential, 'completed', `Entity ${entityId} detail saved.`)];
}

/** Where a module field has to have a trace: the request plus the journey prose. */
async function evidenceText(
  context: mls.msg.ExecutionContext,
  moduleName: string,
  moduleArtifact: Ns5ModuleArtifact,
  journeys: Ns5JourneyArtifact[],
): Promise<string> {
  const sourcePrompt = await readSourcePrompt(context, moduleName, moduleArtifact);
  return [sourcePrompt, formatJourneys(journeys)].join('\n');
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
  const moduleArtifact = await readModule(parsed.moduleName);
  const [journeys, workflows, actors] = await Promise.all([
    readJourneys(parsed.moduleName),
    readWorkflows(parsed.moduleName),
    readNs5Actors(parsed.moduleName),
  ]);
  const gateContext = {
    moduleName: parsed.moduleName,
    mdm,
    tdm,
    ddm,
    journeys,
    workflows,
    evidenceText: await evidenceText(context, parsed.moduleName, moduleArtifact, journeys),
    actors: actors.map(actor => actor.actorId),
  };
  const invalid: string[] = [];
  const entities: Ns5OntologyEntityV3[] = [];
  const normalizations: Ns5OntologyV3Normalization[] = [];
  for (const planned of plan.entities) {
    const saved = await readJson<{ entity?: Ns5OntologyEntityV3; normalizations?: Ns5OntologyV3Normalization[] }>(
      entityDraftFile(parsed.moduleName, planned.entityId),
    );
    const entity = saved?.entity;
    if (!entity || !validateNs5OntologyEntityV3(entity, plan, gateContext).ok) {
      invalid.push(planned.entityId);
      continue;
    }
    entities.push(entity);
    normalizations.push(...(saved?.normalizations || []));
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
  // A panel is not a table: an entity nobody writes, with no lifecycle and no link, is lifted into
  // `module.details` and leaves the ontology (ns5_42 T6, the v3 form of the v2 aggregate lift).
  const lift = liftNs5AggregateOnlyEntitiesV3(plan, entities, journeys, workflows);
  const index = assembleNs5OntologyIndexV3(lift.plan, moduleNamespaceDescription(parsed.moduleName));
  const assembly = validateNs5OntologyAssemblyV3(index, lift.entities, gateContext);
  if (!assembly.ok) throw new Error(formatNs5OntologyV3Gate(assembly.issues));
  if (lift.liftedEntityIds.length) {
    await writeJson(draftFile(parsed.moduleName, 'ontology30-plan'), lift.plan);
    await writeDefs(
      moduleFile(parsed.moduleName),
      `${parsed.moduleName}Module`,
      applyNs5ModuleDetails(moduleArtifact, lift.moduleDetails),
      'Ns5ModuleArtifact',
    );
  }
  const pipeline = await requirePipeline(parsed.moduleName);
  const artifactPaths = await persistArtifacts(
    parsed.moduleName,
    lift.plan,
    index,
    lift.entities,
    [...normalizations, ...lift.normalizations],
    pipeline,
    journeys,
    lift.liftedEntityIds,
  );
  return [
    doneAnchor(context, mutationParent, parsed.moduleName, artifactPaths),
    updateStatus(context, mutationParent, step, hookSequential, 'completed', `ontology30 approved: ${artifactPaths.join(', ')}`),
  ];
}

function moduleNamespaceDescription(moduleName: string): string {
  return `Branch details.${moduleName} of the master records this module has a role on; only this module writes it.`;
}

async function persistArtifacts(
  moduleName: string,
  plan: Ns5OntologyV3PlanDraft,
  index: ReturnType<typeof assembleNs5OntologyIndexV3>,
  entities: Ns5OntologyEntityV3[],
  entityNormalizations: Ns5OntologyV3Normalization[],
  pipeline: Ns5PipelineState,
  journeys: Ns5JourneyArtifact[],
  liftedAggregateEntities: string[] = [],
): Promise<string[]> {
  const artifactPaths: string[] = [];
  for (const entity of entities) {
    artifactPaths.push(
      await writeDefs(
        ontologyEntityFile(moduleName, entity.entityId),
        `${moduleName}Entity${entity.entityId}`,
        entity,
        'Ns5OntologyEntityV3',
      ),
    );
  }
  artifactPaths.push(
    await writeDefs(ontologyIndexFile(moduleName), `${moduleName}OntologyIndex`, index, 'Ns5OntologyIndexV3'),
  );
  const removedOrphans = await reconcileModuleDefs(moduleName, 'ontology', entities.map(entity => entity.entityId));
  const normalizations = [...(plan.normalizations || []), ...entityNormalizations];
  const citedRules = collectNs5CitedRulesV3(entities);
  const citedCapabilities = collectNs5CitedCapabilitiesV3(entities);
  const cited = collectNs5CitedEntitiesV3(journeys);
  const uncitedEntities = entities.map(entity => entity.entityId).filter(entityId => !cited.has(entityId));
  await writeJson(draftFile(moduleName, 'ontology30'), {
    plan,
    entities,
    relationships: index.relationships,
    removedOrphans,
    liftedAggregateEntities,
    ...(normalizations.length ? { normalizations } : {}),
  });
  await writeStepState(pipeline, {
    status: 'approved',
    updatedAt: new Date().toISOString(),
    artifactPaths,
    uncitedEntities,
    liftedAggregateEntities,
    ...(normalizations.length ? { normalizations } : {}),
    ...(citedRules.length ? { citedRules } : {}),
    ...(citedCapabilities.length ? { citedCapabilities } : {}),
    ...(pipeline.invocation.fast ? { autoReason: 'fast' } : {}),
  });
  return artifactPaths;
}

function parallelEntityStep(
  context: mls.msg.ExecutionContext,
  hostStep: mls.msg.AIAgentStep,
  agentName: string,
  plan: Ns5OntologyV3PlanDraft,
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
        trace: [`queued ${entityIds.length} ontology30 entities with maxParallel=${NS5_ONTOLOGY_V3_MAX_PARALLEL}`],
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
    executionMode: { type: 'parallel', args: entityIds.map(entityId => `entity:${entityId}`), maxParallel: NS5_ONTOLOGY_V3_MAX_PARALLEL },
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


async function readModule(moduleName: string): Promise<Ns5ModuleArtifact> {
  if (!moduleName) throw new Error('ontology30 needs a moduleName.');
  const artifact = await readDefsJson<Ns5ModuleArtifact>(moduleFile(moduleName));
  if (!artifact) throw new Error(`module.defs.ts is missing for ${moduleName}; module10 must run first.`);
  const pipeline = await readPipeline(moduleName);
  if (pipeline?.steps.journeys20?.status !== 'approved') {
    throw new Error(`journeys20 must be approved before ontology30 (${moduleName}).`);
  }
  // ns5_49: the ontology honours the entities and transitions the process stages cite, so it waits
  // for workflows50 too.
  if (pipeline?.steps.workflows50?.status !== 'approved') {
    throw new Error(`workflows50 must be approved before ontology30 (${moduleName}).`);
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

/**
 * ns5_49: workflows50 runs before this step, so `workflows.defs.ts` is on disk. It is missing only on
 * a module recorded under flow v1, and then there is simply nothing cited forward — `null`, not a throw.
 */
async function readWorkflows(moduleName: string): Promise<Ns5WorkflowsArtifact | null> {
  return await readDefsJson<Ns5WorkflowsArtifact>(workflowsFile(moduleName));
}

async function readPlanDraft(moduleName: string): Promise<Ns5OntologyV3PlanDraft> {
  const plan = await readJson<Ns5OntologyV3PlanDraft>(draftFile(moduleName, 'ontology30-plan'));
  if (!plan?.entities?.length) throw new Error(`ontology30 plan draft is missing for ${moduleName}.`);
  return plan;
}

/**
 * ns5_52b achado 4: the `entity-` segment keeps an entity called `Plan` off the plan draft
 * (`ontology30-plan-draft.json`), which on a case-insensitive file system (APFS) overwrote it and
 * failed the step with "ontology30 plan draft is missing". Lower-casing the id would make the
 * collision certain on every OS instead.
 */
function entityDraftFile(moduleName: string, entityId: string) {
  return draftFile(moduleName, `ontology30-entity-${entityId}`);
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
    stage: stage === 'finalize' ? stage : 'plan',
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
      const effect = step.effect ? ` effect=${step.effect}` : '';
      const transition = step.effect === 'transition' && step.transitionRef ? ` transitionRef=${step.transitionRef}` : '';
      const decide = step.kind === 'decide' ? ' decide' : '';
      return `- ${step.stepId} ${step.kind} ${step.entity}${affects}${effect}${transition}${decide}: ${step.description}`;
    }),
  ].join('\n')).join('\n\n');
}

/**
 * ns5_49: a transition may be cited by a journey act (a person applies it) or by a process stage
 * (nobody does — the process owns it, and `by` is written as `[]`). Both are listed, tagged.
 */
function formatCitedTransitions(
  journeys: Ns5JourneyArtifact[],
  workflows: Ns5WorkflowsArtifact | null | undefined,
  entityId: string,
): string {
  const lines = collectNs5CitedTransitions(journeys)
    .filter(item => item.entityId === entityId)
    .map(item => `- ${item.transitionId} by ${item.actorRef} (${item.stepId})`);
  const byJourney = new Set(
    collectNs5CitedTransitions(journeys).filter(item => item.entityId === entityId).map(item => item.transitionId),
  );
  for (const stage of collectNs5CitedProcessStages(workflows)) {
    if (stage.entityId !== entityId || stage.effect !== 'transition' || !stage.transitionId) continue;
    if (byJourney.has(stage.transitionId)) continue;
    lines.push(`- ${stage.transitionId} by: (process) (${stage.processId}.${stage.taskId})`);
  }
  return lines.length ? lines.join('\n') : '(none)';
}

/** The `mechanical`/`llm` stages, all of them or only the ones writing `entityId`. */
function formatProcessStages(workflows: Ns5WorkflowsArtifact | null | undefined, entityId: string): string {
  const lines = collectNs5CitedProcessStages(workflows)
    .filter(stage => !entityId || stage.entityId === entityId)
    .map(stage => {
      const transition = stage.effect === 'transition' && stage.transitionId ? ` transitionRef=${stage.transitionId}` : '';
      return `- ${stage.processId}.${stage.taskId} ${stage.entityId} effect=${stage.effect}${transition}`;
    });
  return lines.length ? lines.join('\n') : '(none)';
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
