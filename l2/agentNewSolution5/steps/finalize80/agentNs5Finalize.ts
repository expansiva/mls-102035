/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/finalize80/agentNs5Finalize.ts" enhancement="_blank"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import {
  markNs5Complete,
  markNs5Step,
  nextNs5RunNn,
  ownerStepId,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import {
  NS5_STEP_HOOKS,
  drainWaitingSiblings,
  updateStatus,
} from '/_102035_/l2/agentNewSolution5/helpers/ns5Dispatch.js';
import {
  accessFile,
  finalizeReportFile,
  integrationFile,
  journeyFile,
  journeyIndexFile,
  listModuleDefsShortNames,
  listPipelineJsonShortNames,
  moduleFile,
  ontologyEntityFile,
  ontologyIndexFile,
  pipelineJsonFile,
  readDefsJson,
  readPipeline,
  readSolutionRegistry,
  rulesFile,
  workflowsFile,
  writeJson,
  writePipeline,
} from '/_102035_/l2/solution/fs.js';
import {
  applyPlatformBlockDefaults,
  buildProjectsBlock,
  buildSolutionRegistryModuleBlock,
  buildWorkspaceDependencies,
  collectProjectJsonIssues,
  collectPublishableConfigIssues,
  emptySolutionRegistry,
  ensureProjectAppEnv,
  ensureProjectModule,
  ensureProjectType,
  level1Subtypes,
  readL5Config,
  readL5Project,
  readProjectTypeFromProjectJson,
  upsertSolutionRegistryModule,
  validateSolutionRegistry,
  writeL5Config,
  writeL5Project,
  writeSolutionRegistry,
} from '/_102035_/l2/solution/lib.js';
import type {
  Ns5AccessArtifact,
  Ns5IntegrationArtifact,
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleArtifact,
  Ns5OntologyEntityArtifact,
  Ns5OntologyIndexArtifact,
  Ns5PipelineState,
  Ns5RulesArtifact,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';
import {
  ensureConfigListsModule,
  formatNs5Oracle,
  type Ns5FinalizeReport,
  type Ns5OracleSources,
} from '/_102035_/l2/agentNewSolution5/steps/finalize80/contracts.js';
import { runNs5Oracle } from '/_102035_/l2/agentNewSolution5/steps/finalize80/gate.js';

const REQUIRED_STEP = 'integration70' as const;

interface FinalizeArgs {
  planId: string;
  moduleName: string;
}

export async function beforeNs5FinalizePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  let reportPath = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt);
    moduleName = parsed.moduleName;
    const sources = await loadSources(moduleName);
    const report = runNs5Oracle(sources);
    reportPath = await writeJson(finalizeReportFile(moduleName), report);
    let pipeline = await requirePipeline(moduleName);
    if (report.finalStatus !== 'passed') {
      const message = formatNs5Oracle(report) || 'finalize80 oracle failed.';
      await writeStepState(pipeline, {
        status: 'failed',
        updatedAt: new Date().toISOString(),
        error: message,
        artifactPaths: [reportPath],
      });
      await persistRunSummary(context, moduleName, 'failed', message, report, []);
      return [
        ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
        updateStatus(context, parentStep, step, hookSequential, 'failed', `finalize80 failed: ${reportPath}`),
      ];
    }

    const artifactPaths = [reportPath];
    artifactPaths.push(await persistRegistry(moduleName, sources));
    const publishIssues = await persistL5(moduleName, sources.module.userLanguage);
    artifactPaths.push(...publishIssues.paths);
    pipeline = await requirePipeline(moduleName);
    const approvedAt = new Date().toISOString();
    pipeline = await writeStepState(pipeline, {
      status: 'approved',
      updatedAt: approvedAt,
      artifactPaths,
      ...(pipeline.invocation.fast ? { autoReason: 'fast' } : {}),
    });
    pipeline = markNs5Complete(pipeline, approvedAt);
    await writePipeline(pipeline);
    const mutationParent = findMutableParent(context, parentStep);
    const already = getAllSteps(context.task?.iaCompressed?.nextSteps).some(
      item => item.planning?.planId === 'finalize80-done',
    );
    const extra = already ? [] : [doneAnchor(context, mutationParent, moduleName, artifactPaths)];
    const base = already
      ? 'finalize80 completion was already recorded.'
      : `finalize80 passed; pipeline complete.${
        publishIssues.issues.length
          ? ` PUBLISH CHECKLIST (${publishIssues.issues.length}): ${publishIssues.issues.slice(0, 8).join('; ')}`
          : ' Publish checklist clean.'
      }`;
    const verdict = publishIssues.issues.length ? 'degraded' : 'completed';
    await persistRunSummary(context, moduleName, verdict, base, report, publishIssues.issues);
    return [
      ...extra,
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `${base} Never dispatched CB/CF.`),
    ];
  } catch (error) {
    const message = errorMessage(error);
    await recordFailure(moduleName, message, reportPath);
    if (moduleName) {
      try {
        await persistRunSummary(context, moduleName, 'failed', message, null, []);
      } catch { /* summary must not hide the step failure */ }
    }
    return [
      ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
      updateStatus(context, parentStep, step, hookSequential, 'failed', message),
    ];
  }
}

export async function afterNs5FinalizePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const message = 'finalize80 is deterministic and must never receive an LLM response.';
  try {
    const parsed = resolveArgs(context, step.prompt);
    await recordFailure(parsed.moduleName, message, '');
  } catch { /* trace is authoritative */ }
  return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
}

async function loadSources(moduleName: string): Promise<Ns5OracleSources> {
  if (!moduleName) throw new Error('finalize80 needs a moduleName.');
  const moduleArtifact = await readDefsJson<Ns5ModuleArtifact>(moduleFile(moduleName));
  if (!moduleArtifact) throw new Error(`module.defs.ts is missing for ${moduleName}; module10 must run first.`);
  const pipeline = await readPipeline(moduleName);
  if (pipeline?.steps[REQUIRED_STEP]?.status !== 'approved') {
    throw new Error(`${REQUIRED_STEP} must be approved before finalize80 (${moduleName}).`);
  }
  const journeyIndex = await readRequired<Ns5JourneyIndexArtifact>(journeyIndexFile(moduleName), 'journey index');
  const journeys: Ns5JourneyArtifact[] = [];
  for (const entry of journeyIndex.journeys) {
    const artifact = await readDefsJson<Ns5JourneyArtifact>(journeyFile(moduleName, entry.journeyId));
    if (!artifact) throw new Error(`journeys/${entry.journeyId}.defs.ts is missing for ${moduleName}.`);
    journeys.push(artifact);
  }
  const ontologyIndex = await readRequired<Ns5OntologyIndexArtifact>(ontologyIndexFile(moduleName), 'ontology index');
  const entities: Ns5OntologyEntityArtifact[] = [];
  for (const entityId of ontologyIndex.entities) {
    const artifact = await readDefsJson<Ns5OntologyEntityArtifact>(ontologyEntityFile(moduleName, entityId));
    if (!artifact) throw new Error(`ontology/${entityId}.defs.ts is missing for ${moduleName}.`);
    entities.push(artifact);
  }
  const [rules, workflows, access, integration] = await Promise.all([
    readRequired<Ns5RulesArtifact>(rulesFile(moduleName), 'rules'),
    readRequired<Ns5WorkflowsArtifact>(workflowsFile(moduleName), 'workflows'),
    readRequired<Ns5AccessArtifact>(accessFile(moduleName), 'access'),
    readRequired<Ns5IntegrationArtifact>(integrationFile(moduleName), 'integration'),
  ]);
  return {
    module: moduleArtifact,
    journeys,
    journeyIndex,
    entities,
    ontologyIndex,
    rules,
    workflows,
    access,
    integration,
    journeyDiskFiles: listModuleDefsShortNames(moduleName, 'journeys'),
    ontologyDiskFiles: listModuleDefsShortNames(moduleName, 'ontology'),
    liftedAggregateEntities: pipeline?.steps.ontology30?.liftedAggregateEntities || [],
  };
}

async function persistRegistry(moduleName: string, sources: Ns5OracleSources): Promise<string> {
  const existing = await readSolutionRegistry();
  const current = existing ?? emptySolutionRegistry();
  const subtypes = level1Subtypes();
  if (existing) {
    const gate = validateSolutionRegistry(current, subtypes);
    if (!gate.ok) {
      throw new Error(`Solution registry is invalid: ${gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('; ')}`);
    }
  }
  const next = upsertSolutionRegistryModule(current, buildSolutionRegistryModuleBlock({
    moduleName,
    actors: sources.access.actors,
    entities: sources.entities,
    updatedAt: new Date().toISOString(),
  }));
  const gate = validateSolutionRegistry(next, subtypes);
  if (!gate.ok) {
    throw new Error(`Solution registry write rejected: ${gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('; ')}`);
  }
  return writeSolutionRegistry(next);
}

async function persistL5(
  moduleName: string,
  userLanguage: string,
): Promise<{ paths: string[]; issues: string[] }> {
  const projectId = mls.actualProject || 0;
  const dependencies = typeof mls.l5?.getProjectDependencies === 'function'
    ? mls.l5.getProjectDependencies(projectId, false)
    : [];
  const paths: string[] = [];
  const issues: string[] = [];
  const existing = (await readL5Config()) || {};
  let config = ensureConfigListsModule(existing, moduleName, userLanguage, projectId);
  config = { ...config, workspaceDependencies: buildWorkspaceDependencies(dependencies) };
  const typeById = await collectProjectTypes(projectId, dependencies);
  const projectsBlock = buildProjectsBlock(config.projects, projectId, dependencies, typeById);
  config.projects = projectsBlock.projects;
  issues.push(...projectsBlock.issues);
  if (!config.defaultProjectId) config.defaultProjectId = String(projectId);
  const withBlocks = applyPlatformBlockDefaults(config);
  issues.push(...withBlocks.issues);
  paths.push(await writeL5Config(withBlocks.config));
  issues.push(...collectPublishableConfigIssues(withBlocks.config, moduleName, dependencies));

  const projectJson = await readL5Project();
  if (!projectJson) {
    issues.push(...collectProjectJsonIssues(projectJson, moduleName));
  } else {
    const withAppEnv = ensureProjectAppEnv(projectJson);
    const withType = ensureProjectType(withAppEnv.projectJson, 'client');
    const withModule = ensureProjectModule(withType.projectJson, moduleName);
    if (withAppEnv.changed || withType.changed || withModule.changed) {
      paths.push(await writeL5Project(withModule.projectJson));
    }
    issues.push(...collectProjectJsonIssues(withModule.projectJson, moduleName));
  }
  return { paths, issues };
}

async function collectProjectTypes(projectId: number, dependencies: readonly number[]): Promise<Record<string, string>> {
  const typeById: Record<string, string> = {};
  for (const id of [...new Set([projectId, ...dependencies])]) {
    if (!Number.isFinite(id) || id <= 0) continue;
    try {
      const type = readProjectTypeFromProjectJson(await readL5Project(id));
      if (type) typeById[String(id)] = type;
    } catch {
      // Another project's project.json may be missing; the lib fallback remains.
    }
  }
  return typeById;
}

async function persistRunSummary(
  context: mls.msg.ExecutionContext,
  moduleName: string,
  verdict: 'completed' | 'failed' | 'degraded',
  reason: string,
  report: Ns5FinalizeReport | null,
  publishIssues: string[],
): Promise<void> {
  try {
    const pipeline = await readPipeline(moduleName);
    const nn = nextNs5RunNn(listPipelineJsonShortNames(moduleName));
    const cost = sumInteractionCost(context);
    const stepCounts: Record<string, string> = {};
    if (pipeline?.steps) {
      for (const [id, step] of Object.entries(pipeline.steps)) {
        if (step && typeof step === 'object' && 'status' in step) stepCounts[id] = String(step.status);
      }
    }
    const flags = pipeline?.invocation;
    const command = [
      flags?.fast ? '/fast' : '',
      flags?.rebuildAll ? '/rebuild all' : '',
      pipeline?.sourcePrompt || '',
    ].filter(Boolean).join(' ').trim();
    const degradations = publishIssues.map(item => ({
      at: new Date().toISOString(),
      kind: 'publish-checklist',
      reason: item,
    }));
    await writeJson(pipelineJsonFile(moduleName, `run${nn}_newsolution5`), {
      savedAt: new Date().toISOString(),
      moduleName,
      agent: 'agentNewSolution5',
      command,
      startedAt: pipeline?.updatedAt || null,
      finishedAt: new Date().toISOString(),
      verdict,
      reason,
      cost: { total: roundCost(cost.total), byStep: cost.byStep },
      counts: { steps: stepCounts, oracle: report?.counts || null },
      checks: report?.checks || [],
      handoff: 'never',
      degradations,
    });
  } catch { /* the run summary must never fail finalize80 */ }
}

function sumInteractionCost(context: mls.msg.ExecutionContext): { total: number; byStep: Record<string, number> } {
  const byStep: Record<string, number> = {};
  let total = 0;
  const walk = (steps: mls.msg.AIPayload[] | undefined) => {
    if (!steps) return;
    for (const item of steps) {
      if (item.type === 'agent') {
        const cost = interactionCost(item);
        const owner = ownerStepId(item.planning?.planId || '') || item.planning?.planId || '';
        if (cost && owner) {
          total += cost;
          byStep[owner] = roundCost((byStep[owner] || 0) + cost);
        }
      }
      if (item.nextSteps?.length) walk(item.nextSteps);
    }
  };
  walk(context.task?.iaCompressed?.nextSteps);
  return { total: roundCost(total), byStep };
}

function interactionCost(step: mls.msg.AIAgentStep): number {
  const cost = step.interaction && typeof (step.interaction as { cost?: unknown }).cost === 'number'
    ? (step.interaction as { cost: number }).cost
    : 0;
  return Number.isFinite(cost) ? cost : 0;
}

function roundCost(value: number): number {
  return Math.round(value * 10000) / 10000;
}

async function readRequired<T>(file: Parameters<typeof readDefsJson>[0], label: string): Promise<T> {
  const value = await readDefsJson<T>(file);
  if (!value) throw new Error(`Unable to read approved ${label}.`);
  return value;
}

async function requirePipeline(moduleName: string): Promise<Ns5PipelineState> {
  const pipeline = await readPipeline(moduleName);
  if (!pipeline) throw new Error(`pipeline.json is missing for ${moduleName}.`);
  return pipeline;
}

async function writeStepState(
  pipeline: Ns5PipelineState,
  next: Ns5PipelineState['steps']['finalize80'] & { status: 'running' | 'approved' | 'failed'; updatedAt: string },
): Promise<Ns5PipelineState> {
  const updated = markNs5Step(pipeline, 'finalize80', next);
  await writePipeline(updated);
  return updated;
}

async function recordFailure(moduleName: string, error: string, reportPath: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readPipeline(moduleName);
    if (!pipeline) return;
    await writePipeline(markNs5Step(pipeline, 'finalize80', {
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error,
      ...(reportPath ? { artifactPaths: [reportPath] } : {}),
    }));
  } catch { /* task trace remains the fallback */ }
}

function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): FinalizeArgs {
  const root = parseRecord(value);
  return {
    planId: text(root.planId) || 'finalize80',
    moduleName: text(root.moduleName) || memoryString(context, 'moduleName'),
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
    stepTitle: 'Finalize done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({ moduleName, artifactPaths, completedStep: 'finalize80', nextStep: 'complete' }),
    planning: { planId: 'finalize80-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

NS5_STEP_HOOKS.finalize80 = {
  beforePromptStep: beforeNs5FinalizePromptStep,
  afterPromptStep: afterNs5FinalizePromptStep,
};
