/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/judge35/agentNs5Judge.ts" enhancement="_blank"/>

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
  workflowsFile,
  writeJson,
  writePipeline,
} from '/_102035_/l2/solution/fs.js';
import { createStrictArtifactTool, unwrapArtifactPayload } from '/_102035_/l2/solution/lib.js';
import {
  ns5OntologyEdges,
  ns5OntologyEntityIds,
  ns5OntologyEntityViews,
  type Ns5OntologyAnyIndex,
} from '/_102035_/l2/solution/ontologyView.js';
import { ns5RuleEntries } from '/_102035_/l2/solution/rulesView.js';
import type {
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleArtifact,
  Ns5OntologyAnyEntity,
  Ns5PipelineState,
  Ns5RulesAny,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';
import {
  createFinalizeStep,
  parallelEntityStep,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/agentNs5Ontology.js';
import {
  NS5_JUDGE_MAX_REPAIRS,
  NS5_JUDGE_ONTOLOGY_REPAIR_ROUND,
  buildNs5JudgeTool,
  asNs5JudgeJourneys,
  collectNs5JudgeCandidates,
  decideNs5JudgeAction,
  ns5JudgeFieldsOf,
  normalizeNs5JudgePayload,
  ns5JudgeNormalizations,
  planNs5JudgeOntologyRevalidate,
  planNs5JudgeRepairSteps,
  type Ns5JudgeCandidate,
  type Ns5JudgeDraft,
  type Ns5JudgeEntityView,
  type Ns5JudgeRelationshipView,
} from '/_102035_/l2/agentNewSolution5/steps/judge35/contracts.js';
import type { Ns5OntologyV3PlanDraft } from '/_102035_/l2/agentNewSolution5/steps/ontology30/contractsV3.js';
import {
  formatNs5JudgeGate,
  validateNs5JudgeVerdicts,
} from '/_102035_/l2/agentNewSolution5/steps/judge35/gate.js';

const MAX_TRANSPORT_RETRIES = 1;

interface JudgeArgs {
  planId: string;
  moduleName: string;
  repairAttempt: number;
  ontologyRepairAttempt: number;
  transportAttempt: number;
  gateFeedback: string;
}

export function buildNs5JudgeHumanPrompt(input: {
  journeys: Ns5JourneyArtifact[];
  entities: ReadonlyArray<{
    entityId: string;
    lifecycleStates: ReadonlyArray<{ state: string }>;
    transitions: ReadonlyArray<{
      transitionId: string;
      from: readonly string[];
      to: string;
      by: string[] | 'system' | 'time';
      description: string;
    }>;
  }>;
  processes: Ns5WorkflowsArtifact['processes'];
  candidates: readonly Ns5JudgeCandidate[];
}): string {
  return [
    '## Journeys',
    formatJourneys(input.journeys),
    '',
    '## Ontology (id, lifecycle, transitions with by)',
    formatEntities(input.entities),
    '',
    '## Processes',
    formatProcesses(input.processes),
    '',
    '## Candidates (judge only these)',
    'likelyCoveredBy is a deterministic hint; confirm or decide otherwise.',
    'citedBy on a writtenSwitch is a deterministic hint; confirm switchNeedsLifecycle or keep the field.',
    input.candidates.length ? JSON.stringify(input.candidates, null, 2) : '(none)',
  ].join('\n');
}

export async function beforeNs5JudgePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution5:judge35] task invalid');
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt);
    moduleName = parsed.moduleName;
    const mutationParent = findMutableParent(context, parentStep);
    const { journeys, entities, processes, relationships, rules } = await readSources(moduleName);
    const candidates = collectNs5JudgeCandidates(
      asNs5JudgeJourneys(journeys),
      asNs5JudgeEntities(entities),
      processes,
      relationships,
      rules,
    );
    const previous = (await readJson(draftFile(moduleName, 'judge35'))) as Ns5JudgeDraft | null;
    const verdicts = previous?.verdicts || [];
    const action = decideNs5JudgeAction({
      candidates,
      verdicts,
      repairAttempt: parsed.repairAttempt,
      ontologyRepairAttempt: parsed.ontologyRepairAttempt,
    });

    if (action.type === 'approveWithoutModel' || action.type === 'approveWithWarnings') {
      const warnings = action.type === 'approveWithWarnings' ? action.warnings : [];
      const draftPath = await persistApproval(moduleName, {
        candidates,
        verdicts,
        rounds: parsed.repairAttempt,
        ...(candidates.length ? {} : { noJudgeSignal: true }),
        ...(warnings.length ? { warnings } : {}),
      }, warnings);
      return [
        doneAnchor(context, mutationParent, moduleName, [draftPath]),
        updateStatus(
          context,
          parentStep,
          step,
          hookSequential,
          'completed',
          candidates.length
            ? `judge35 approved with warnings: ${draftPath}`
            : `judge35 approved with noJudgeSignal: ${draftPath}`,
        ),
      ];
    }

    if (action.type === 'repairJourneys') {
      const planned = planNs5JudgeRepairSteps(parsed.moduleName, action.attempt, action.briefs);
      await writeJson(draftFile(moduleName, 'judge35'), {
        candidates,
        verdicts,
        rounds: action.attempt,
      } satisfies Ns5JudgeDraft);
      return [
        addStep(context, mutationParent, planned.repair),
        addStep(context, mutationParent, planned.revalidate),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', `judge35 scheduled journeys20 repair ${action.attempt}.`),
      ];
    }

    if (action.type === 'repairOntology') {
      await writeJson(draftFile(moduleName, 'judge35'), {
        candidates,
        verdicts,
        rounds: parsed.repairAttempt,
      } satisfies Ns5JudgeDraft);
      return await scheduleOntologyRepair(
        context,
        mutationParent,
        step,
        hookSequential,
        agent.agentName,
        moduleName,
        action,
        parsed.repairAttempt,
      );
    }

    if (action.type === 'fail') {
      await recordFailure(moduleName, action.message);
      return [
        ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${action.message}`),
        updateStatus(context, parentStep, step, hookSequential, 'failed', action.message),
      ];
    }

    const [prompt, schema] = await Promise.all([
      readAgentText('steps/judge35', 'prompt', '.md'),
      readAgentJson<Record<string, unknown>>('schemas', 'judge.schema', '.json'),
    ]);
    const tool = buildNs5JudgeTool(schema, createStrictArtifactTool);
    const humanPrompt = buildNs5JudgeHumanPrompt({
      journeys,
      entities,
      processes,
      candidates,
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

export async function afterNs5JudgePromptStep(
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
      const failure = readPromptFailure(step, 'judge35 returned no usable verdict.');
      if (parsed.transportAttempt < MAX_TRANSPORT_RETRIES) {
        return [
          addStep(context, mutationParent, createNs5RetryStep('judge35', moduleName, 'transport', parsed.transportAttempt + 1)),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `judge35 transport retry ${parsed.transportAttempt + 1} scheduled: ${failure}`),
        ];
      }
      throw new Error(failure);
    }

    const { journeys, entities, processes, relationships, rules } = await readSources(moduleName);
    const candidates = collectNs5JudgeCandidates(
      asNs5JudgeJourneys(journeys),
      asNs5JudgeEntities(entities),
      processes,
      relationships,
      rules,
    );
    const verdicts = normalizeNs5JudgePayload(payload);
    const gate = validateNs5JudgeVerdicts(verdicts, candidates, {
      journeys: asNs5JudgeJourneys(journeys),
      relationships,
    });
    if (!gate.ok) {
      const feedback = formatNs5JudgeGate(gate.issues);
      if (parsed.repairAttempt < NS5_JUDGE_MAX_REPAIRS) {
        return [
          addStep(context, mutationParent, createNs5RetryStep('judge35', moduleName, 'repair', parsed.repairAttempt + 1, { gateFeedback: feedback })),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `judge35 gate scheduled repair ${parsed.repairAttempt + 1}.`),
        ];
      }
      throw new Error(feedback);
    }

    await writeJson(draftFile(moduleName, 'judge35'), {
      candidates,
      verdicts,
      rounds: parsed.repairAttempt,
    } satisfies Ns5JudgeDraft);

    const action = decideNs5JudgeAction({
      candidates,
      verdicts,
      repairAttempt: parsed.repairAttempt,
      ontologyRepairAttempt: parsed.ontologyRepairAttempt,
    });

    if (action.type === 'repairJourneys') {
      const planned = planNs5JudgeRepairSteps(moduleName, action.attempt, action.briefs);
      await writeJson(draftFile(moduleName, 'judge35'), {
        candidates,
        verdicts,
        rounds: action.attempt,
      } satisfies Ns5JudgeDraft);
      return [
        addStep(context, mutationParent, planned.repair),
        addStep(context, mutationParent, planned.revalidate),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', `judge35 scheduled journeys20 repair ${action.attempt}.`),
      ];
    }

    if (action.type === 'repairOntology') {
      await writeJson(draftFile(moduleName, 'judge35'), {
        candidates,
        verdicts,
        rounds: parsed.repairAttempt,
      } satisfies Ns5JudgeDraft);
      return await scheduleOntologyRepair(
        context,
        mutationParent,
        step,
        hookSequential,
        agent.agentName,
        moduleName,
        action,
        parsed.repairAttempt,
      );
    }

    if (action.type === 'fail') {
      throw new Error(action.message);
    }

    const warnings = action.type === 'approveWithWarnings' ? action.warnings : [];
    const draftPath = await persistApproval(moduleName, {
      candidates,
      verdicts,
      rounds: parsed.repairAttempt,
      ...(warnings.length ? { warnings } : {}),
    }, warnings);
    return [
      doneAnchor(context, mutationParent, moduleName, [draftPath]),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `judge35 approved: ${draftPath}`),
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

async function persistApproval(
  moduleName: string,
  draft: Ns5JudgeDraft,
  warnings: readonly string[],
): Promise<string> {
  const pipeline = await requirePipeline(moduleName);
  const draftPath = await writeJson(draftFile(moduleName, 'judge35'), draft);
  const normalizations = ns5JudgeNormalizations(draft.candidates, draft.verdicts);
  const next = markNs5Step(pipeline, 'judge35', {
    status: 'approved',
    updatedAt: new Date().toISOString(),
    artifactPaths: [draftPath],
    ...(draft.noJudgeSignal ? { noJudgeSignal: true } : {}),
    ...(warnings.length ? { warnings: [...warnings] } : {}),
    ...(normalizations.length ? { normalizations } : {}),
    ...(pipeline.invocation.fast ? { autoReason: 'fast' } : {}),
  });
  await writePipeline(next);
  return draftPath;
}

async function scheduleOntologyRepair(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  agentName: string,
  moduleName: string,
  action: Extract<ReturnType<typeof decideNs5JudgeAction>, { type: 'repairOntology' }>,
  repairAttempt: number,
): Promise<mls.msg.AgentIntent[]> {
  const plan = await readJson<Ns5OntologyV3PlanDraft>(draftFile(moduleName, 'ontology30-plan'));
  if (!plan || !plan.entities?.length) {
    throw new Error(`judge35 cannot repair ontology: ontology30 plan draft is missing for ${moduleName}.`);
  }
  const round = NS5_JUDGE_ONTOLOGY_REPAIR_ROUND + action.attempt - 1;
  const parallel = parallelEntityStep(context, step, agentName, plan, round, action.entityIds, action.entityFeedback);
  const finalizePlanId = `ontology30-finalize-${round}`;
  return [
    parallel,
    addStep(context, mutationParent, createFinalizeStep(moduleName, round, [String(parallel.step.planning?.planId || '')])),
    addStep(context, mutationParent, planNs5JudgeOntologyRevalidate(moduleName, action.attempt, repairAttempt, finalizePlanId)),
    updateStatus(context, mutationParent, step, hookSequential, 'completed', `judge35 scheduled ontology30 entity repair ${action.attempt}: ${action.entityIds.join(', ')}.`),
  ];
}

function asNs5JudgeEntities(views: ReturnType<typeof ns5OntologyEntityViews>): Ns5JudgeEntityView[] {
  return views.map(view => {
    const split = ns5JudgeFieldsOf(view.source);
    return {
      entityId: view.entityId,
      transitions: view.transitions,
      lifecycleStates: view.lifecycleStates,
      fields: split.fields,
      derivedFields: split.derivedFields,
    };
  });
}

async function readSources(moduleName: string): Promise<{
  journeys: Ns5JourneyArtifact[];
  entities: ReturnType<typeof ns5OntologyEntityViews>;
  processes: Ns5WorkflowsArtifact['processes'];
  relationships: Ns5JudgeRelationshipView[];
  rules: ReturnType<typeof ns5RuleEntries>;
}> {
  await readModule(moduleName);
  const journeys = await readJourneys(moduleName);
  const { entities, relationships } = await readOntology(moduleName);
  const [workflows, rulesArtifact] = await Promise.all([
    readDefsJson<Ns5WorkflowsArtifact>(workflowsFile(moduleName)),
    readDefsJson<Ns5RulesAny>(rulesFile(moduleName)),
  ]);
  return {
    journeys,
    entities,
    processes: workflows?.processes || [],
    relationships,
    rules: rulesArtifact ? ns5RuleEntries(rulesArtifact) : [],
  };
}

async function readModule(moduleName: string): Promise<Ns5ModuleArtifact> {
  if (!moduleName) throw new Error('judge35 needs a moduleName.');
  const artifact = await readDefsJson<Ns5ModuleArtifact>(moduleFile(moduleName));
  if (!artifact) throw new Error(`module.defs.ts is missing for ${moduleName}; module10 must run first.`);
  const pipeline = await readPipeline(moduleName);
  if (pipeline?.steps.ontology30?.status !== 'approved') {
    throw new Error(`ontology30 must be approved before judge35 (${moduleName}).`);
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

async function readOntology(moduleName: string): Promise<{
  entities: ReturnType<typeof ns5OntologyEntityViews>;
  relationships: Ns5JudgeRelationshipView[];
}> {
  const index = await readDefsJson<Ns5OntologyAnyIndex>(ontologyIndexFile(moduleName));
  if (!index) throw new Error(`ontology/index.defs.ts is missing for ${moduleName}; ontology30 must run first.`);
  const entities: Ns5OntologyAnyEntity[] = [];
  for (const entityId of ns5OntologyEntityIds(index)) {
    const artifact = await readDefsJson<Ns5OntologyAnyEntity>(ontologyEntityFile(moduleName, entityId));
    if (!artifact) throw new Error(`ontology/${entityId}.defs.ts is missing for ${moduleName}.`);
    entities.push(artifact);
  }
  return {
    entities: ns5OntologyEntityViews(entities),
    relationships: ns5OntologyEdges(index).map(edge => ({
      relationshipId: edge.relationshipId,
      fromEntity: edge.fromEntity,
      toEntity: edge.toEntity,
    })),
  };
}

async function requirePipeline(moduleName: string): Promise<Ns5PipelineState> {
  const pipeline = await readPipeline(moduleName);
  if (!pipeline) throw new Error(`pipeline.json is missing for ${moduleName}.`);
  return pipeline;
}

async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readPipeline(moduleName);
    if (!pipeline) return;
    await writePipeline(markNs5Step(pipeline, 'judge35', {
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error,
    }));
  } catch { /* task trace remains the fallback */ }
}

function formatJourneys(journeys: Ns5JourneyArtifact[]): string {
  if (!journeys.length) return '(none)';
  return journeys.map(journey => {
    const steps = journey.business.steps.map(step => {
      const ref = step.transitionRef ? ` transitionRef=${step.transitionRef}` : '';
      return `- ${step.stepId} ${step.kind} ${step.entity}${ref}: ${step.title}`;
    }).join('\n');
    return `### ${journey.journeyId} (${journey.business.actorRef})\n${journey.business.title}\n${journey.business.goal}\n${steps}`;
  }).join('\n\n');
}

function formatEntities(entities: ReadonlyArray<{
  entityId: string;
  lifecycleStates: ReadonlyArray<{ state: string }>;
  transitions: ReadonlyArray<{
    transitionId: string;
    from: readonly string[];
    to: string;
    by: string[] | 'system' | 'time';
    description: string;
  }>;
}>): string {
  if (!entities.length) return '(none)';
  return entities.map(entity => {
    const states = entity.lifecycleStates.map(item => item.state).join(', ') || '(none)';
    const transitions = entity.transitions.length
      ? entity.transitions.map(item => {
        const by = Array.isArray(item.by) ? item.by.join(',') : String(item.by);
        return `- ${item.transitionId} ${item.from.join('|')}→${item.to} by=${by} ${item.description}`;
      }).join('\n')
      : '(none)';
    return `### ${entity.entityId}\nlifecycle: ${states}\n${transitions}`;
  }).join('\n\n');
}

function formatProcesses(processes: Ns5WorkflowsArtifact['processes']): string {
  if (!processes.length) return '(none)';
  return processes.map(process => {
    const tasks = process.tasks.map(task => {
      const ref = task.transitionRef ? ` ${task.entityRef}.${task.transitionRef}` : '';
      return `- ${task.taskId} ${task.kind}${ref}`;
    }).join('\n');
    return `### ${process.processId}\n${tasks}`;
  }).join('\n\n');
}

function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): JudgeArgs {
  const root = parseRecord(value);
  const moduleName = text(root.moduleName) || memoryString(context, 'moduleName');
  return {
    planId: text(root.planId) || 'judge35',
    moduleName,
    repairAttempt: integer(root.repairAttempt),
    ontologyRepairAttempt: integer(root.ontologyRepairAttempt),
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
    stepTitle: 'Judge done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({ moduleName, artifactPaths, completedStep: 'judge35', nextStep: 'rules40' }),
    planning: { planId: 'judge35-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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

NS5_STEP_HOOKS.judge35 = {
  beforePromptStep: beforeNs5JudgePromptStep,
  afterPromptStep: afterNs5JudgePromptStep,
};
