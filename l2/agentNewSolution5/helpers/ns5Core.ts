/// <mls fileReference="_102035_/l2/agentNewSolution5/helpers/ns5Core.ts" enhancement="_blank"/>

import {
  deleteModuleL4,
  listModuleFolders,
  normalizeModuleName,
  writePipeline,
} from '/_102035_/l2/solution/fs.js';
import {
  NS5_PIPELINE_SCHEMA_VERSION,
  NS5_STEP_IDS,
  type Ns5Invocation,
  type Ns5PipelineState,
  type Ns5PipelineStepState,
  type Ns5StepId,
} from '/_102035_/l2/solution/types.js';

export const NS5_FLOW_ID = 'agentNewSolution5' as const;
export const NS5_FLOW_VERSION = '2026-09-10-ns5-flow-v1' as const;
export const NS5_AGENT_NAME = 'agentNewSolution5' as const;

export { NS5_STEP_IDS };
export type { Ns5StepId };

const REBUILD_ALL_RE = /(^|\s)\/rebuild\s+all(?:\s+([A-Za-z][A-Za-z0-9]*))?(?=\s|$)/i;
const MODULE_RE = /(^|\s)\/module(?:\s+([A-Za-z][A-Za-z0-9]*))?(?=\s|$)/i;
const FAST_RE = /(^|\s)\/fast(?=\s|$)/i;

export const NS5_STEP_TITLES: Record<Ns5StepId, string> = {
  module10: 'Module',
  journeys20: 'Journeys',
  ontology30: 'Ontology',
  rules40: 'Rules',
  workflows50: 'Workflows',
  access60: 'Access',
  integration70: 'Integration',
  finalize80: 'Finalize',
};

export const NS5_STEP_DEPENDS_ON: Record<Ns5StepId, readonly string[]> = {
  module10: [],
  journeys20: ['module10-done'],
  ontology30: ['journeys20-done'],
  rules40: ['ontology30-done'],
  workflows50: ['ontology30-done'],
  access60: ['ontology30-done'],
  integration70: ['rules40-done', 'workflows50-done', 'access60-done'],
  finalize80: ['integration70-done'],
};

export interface Ns5ParsedInvocation {
  fast: boolean;
  rebuildAll: boolean;
  module: string;
  prompt: string;
}

export function isNs5StepId(value: string): value is Ns5StepId {
  return (NS5_STEP_IDS as readonly string[]).includes(value);
}

/**
 * Maps child planIds (repair/transport, ontology fan-out, bindings, finalize) back to the owning
 * step. Done-anchors and reserved clarification ids stay unmatched so they are not dispatched.
 */
export function ownerStepId(planId: string): Ns5StepId | '' {
  if (isNs5StepId(planId)) return planId;
  for (const id of NS5_STEP_IDS) {
    if (planId === `${id}-done` || planId.startsWith(`${id}-clarification`)) continue;
    if (planId.startsWith(`${id}-`)) return id;
  }
  return '';
}

/** Parallel ontology children are scheduled as `entity:<PascalId>` (prompt and/or hook args). */
export function ns5OntologyEntitySelector(value: unknown): string {
  if (typeof value !== 'string') return '';
  const match = /^entity:([A-Z][A-Za-z0-9]*)$/.exec(value.trim());
  return match?.[1] || '';
}

export function parseNs5Invocation(value: string): Ns5ParsedInvocation {
  const raw = String(value || '');
  const fast = FAST_RE.test(raw);
  const rebuildMatch = REBUILD_ALL_RE.exec(raw);
  const rebuildAll = !!rebuildMatch;
  const moduleMatch = MODULE_RE.exec(raw);
  const moduleFromFlag = moduleMatch?.[2] || '';
  const moduleFromRebuild = rebuildMatch?.[2] || '';
  const module = normalizeModuleName(moduleFromFlag || moduleFromRebuild, '');
  const prompt = raw
    .replace(new RegExp(FAST_RE.source, 'gi'), '$1')
    .replace(new RegExp(MODULE_RE.source, 'gi'), '$1')
    .replace(new RegExp(REBUILD_ALL_RE.source, 'gi'), '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return { fast, rebuildAll, module, prompt };
}

export function createEmptyPipeline(
  moduleName: string,
  sourcePrompt: string,
  invocation: Ns5Invocation,
  now = new Date().toISOString(),
): Ns5PipelineState {
  return {
    schemaVersion: NS5_PIPELINE_SCHEMA_VERSION,
    flowId: NS5_FLOW_ID,
    moduleName,
    status: 'inProgress',
    steps: {},
    sourcePrompt,
    invocation,
    updatedAt: now,
  };
}

export function createNs5AgentStep(
  stepId: Ns5StepId,
  moduleName: string,
): mls.msg.AIAgentStep {
  const dependsOn = [...NS5_STEP_DEPENDS_ON[stepId]];
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: NS5_STEP_TITLES[stepId],
    status: dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [],
    agentName: NS5_AGENT_NAME,
    prompt: JSON.stringify({ planId: stepId, moduleName }),
    rags: [],
    planning: {
      planId: stepId,
      dependsOn,
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

export function buildNs5PlannedSteps(moduleName: string): mls.msg.AIAgentStep[] {
  return NS5_STEP_IDS.map(stepId => createNs5AgentStep(stepId, moduleName));
}

export function existingModuleName(moduleName: string): string {
  const wanted = moduleName.toLowerCase();
  for (const name of listModuleFolders()) {
    if (name.toLowerCase() === wanted) return name;
  }
  return '';
}

export async function startNs5Pipeline(
  moduleName: string,
  sourcePrompt: string,
  invocation: Ns5Invocation,
  rebuildAll: boolean,
): Promise<Ns5PipelineState> {
  if (rebuildAll) await deleteModuleL4(moduleName);
  const pipeline = createEmptyPipeline(moduleName, sourcePrompt, invocation);
  await writePipeline(pipeline);
  return pipeline;
}

export function moduleTokenOk(moduleName: string): boolean {
  return /^[a-z][A-Za-z0-9]*$/.test(moduleName);
}

export function createNs5RetryStep(
  stepId: Ns5StepId,
  moduleName: string,
  kind: 'repair' | 'transport',
  attempt: number,
  extra: Record<string, unknown> = {},
): mls.msg.AIAgentStep {
  const planId = `${stepId}-${kind}-${attempt}`;
  const suffix = kind === 'repair' ? `R${attempt}` : `T${attempt}`;
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: `${NS5_STEP_TITLES[stepId]} · ${suffix}`,
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: NS5_AGENT_NAME,
    prompt: JSON.stringify({ planId: stepId, moduleName, [`${kind}Attempt`]: attempt, ...extra }),
    rags: [],
    planning: {
      planId,
      dependsOn: [],
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

export function nextNs5RunNn(existingShortNames: readonly string[]): string {
  const re = /^run(\d+)_newsolution5$/;
  let max = 0;
  for (const name of existingShortNames) {
    const match = re.exec(name);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return String(max + 1).padStart(2, '0');
}

export function markNs5Complete(pipeline: Ns5PipelineState, now = new Date().toISOString()): Ns5PipelineState {
  if (pipeline.status === 'failed') return pipeline;
  return {
    ...pipeline,
    status: 'complete',
    awaitingStep: undefined,
    updatedAt: now,
  };
}

export function markNs5Step(
  pipeline: Ns5PipelineState,
  stepId: Ns5StepId,
  next: Ns5PipelineStepState,
): Ns5PipelineState {
  const current = pipeline.steps[stepId];
  if (current?.status === 'approved') {
    return { ...pipeline, updatedAt: next.updatedAt };
  }
  const failed = next.status === 'failed';
  const approved = next.status === 'approved';
  return {
    ...pipeline,
    steps: { ...pipeline.steps, [stepId]: next },
    updatedAt: next.updatedAt,
    ...(failed ? { status: 'failed' as const, awaitingStep: undefined } : {}),
    ...(approved && pipeline.awaitingStep === stepId
      ? { status: 'inProgress' as const, awaitingStep: undefined }
      : {}),
  };
}
