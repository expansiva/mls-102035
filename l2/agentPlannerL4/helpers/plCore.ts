/// <mls fileReference="_102035_/l2/agentPlannerL4/helpers/plCore.ts" enhancement="_blank"/>

import { listModuleFolders, normalizeModuleName, readPipeline, writePipeline } from '/_102035_/l2/solution/fs.js';
import { readL5Config, writeL5Config } from '/_102035_/l2/solution/lib.js';
import { poolHasPending } from '/_102035_/l2/solution/pool.js';
import type { Ns5PipelineState } from '/_102035_/l2/solution/types.js';

export const PL_FLOW_ID = 'agentPlannerL4' as const;
export const PL_FLOW_VERSION = '2026-09-18-pl-flow-v1' as const;
export const PL_AGENT_NAME = 'agentPlannerL4' as const;

export const PL_STEP_IDS = ['entry10', 'dispatch20', 'loop30'] as const;
export type PlStepId = (typeof PL_STEP_IDS)[number];

export const PL_PLANNER_PROJECTS = ['102020', '102021'] as const;

export const PL_STEP_TITLES: Record<PlStepId, string> = {
  entry10: 'Entry',
  dispatch20: 'Dispatch',
  loop30: 'Loop',
};

export const PL_STEP_DEPENDS_ON: Record<PlStepId, readonly string[]> = {
  entry10: [],
  dispatch20: ['entry10-done'],
  loop30: ['dispatch20-done'],
};

const FAST_RE = /(^|\s)\/fast(?=\s|$)/i;
const ESTIMATE_RE = /(^|\s)\/estimate(?=\s|$)/i;

export interface PlParsedInvocation {
  fast: boolean;
  estimate: boolean;
  module: string;
}

export interface PlEntryFacts {
  moduleExists: boolean;
  pipelineStatus: string;
  poolPending: boolean;
  l5ConfigExists: boolean;
}

export function isPlStepId(value: string): value is PlStepId {
  return (PL_STEP_IDS as readonly string[]).includes(value);
}

export function ownerStepId(planId: string): PlStepId | '' {
  if (isPlStepId(planId)) return planId;
  for (const id of PL_STEP_IDS) {
    if (planId === `${id}-done` || planId.startsWith(`${id}-clarification`)) continue;
    if (planId.startsWith(`${id}-`)) return id;
  }
  return '';
}

export function moduleTokenOk(moduleName: string): boolean {
  return /^[a-z][A-Za-z0-9]*$/.test(moduleName);
}

export function parsePlInvocation(value: string): PlParsedInvocation {
  const raw = String(value || '').replace(/^@@agentPlannerL4\b/i, ' ').trim();
  const fast = FAST_RE.test(raw);
  const estimate = ESTIMATE_RE.test(raw);
  const stripped = raw
    .replace(new RegExp(FAST_RE.source, 'gi'), ' ')
    .replace(new RegExp(ESTIMATE_RE.source, 'gi'), ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const token = stripped.split(' ')[0] || '';
  const module = moduleTokenOk(token) ? token : normalizeModuleName(token, '');
  return { fast, estimate, module };
}

export function existingModuleName(moduleName: string): string {
  const wanted = moduleName.toLowerCase();
  for (const name of listModuleFolders()) {
    if (name.toLowerCase() === wanted) return name;
  }
  return '';
}

/**
 * Every deterministic refusal of the invocation in one pure place. Empty string means
 * the run may continue. Texts are English (i18n default).
 */
export function plEntryRefusal(invocation: PlParsedInvocation, facts: PlEntryFacts): string {
  if (invocation.estimate) return 'not available yet';
  if (!invocation.module) return 'Provide the module name after @@agentPlannerL4 (lowerCamel).';
  if (!moduleTokenOk(invocation.module)) return 'Module name must be lowerCamel (example: stockControl).';
  if (!facts.moduleExists) return `Module "${invocation.module}" does not exist in l4/.`;
  if (facts.pipelineStatus !== 'complete') {
    return `Module "${invocation.module}" pipeline is not complete.`;
  }
  if (facts.poolPending) return 'module has pending pool messages; finish or dispute them first';
  if (!facts.l5ConfigExists) return 'l5/config.json is missing.';
  return '';
}

export async function gatherPlEntryFacts(moduleName: string): Promise<PlEntryFacts> {
  const existing = moduleName ? existingModuleName(moduleName) : '';
  const pipeline = existing ? await readPipeline(existing) : null;
  const config = await readL5Config();
  return {
    moduleExists: !!existing,
    pipelineStatus: pipeline?.status || '',
    poolPending: existing ? poolHasPending(existing) : false,
    l5ConfigExists: config !== null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export interface PlL5AdjustResult {
  config: Record<string, unknown>;
  adjusted: string[];
}

/**
 * Append planner projects to workspaceDependencies (existing order kept) and fill
 * `projects[id] = { root: '../mls-<id>', type: 'lib' }` when missing. No-op when both
 * 102020 and 102021 are already declared — caller must not rewrite the file then.
 */
export function adjustL5PlannerDeps(config: Record<string, unknown>): PlL5AdjustResult {
  const deps = Array.isArray(config.workspaceDependencies) ? [...config.workspaceDependencies] : [];
  const projects = isRecord(config.projects) ? { ...config.projects } : {};
  const adjusted: string[] = [];
  for (const id of PL_PLANNER_PROJECTS) {
    if (!deps.some(entry => String(entry) === id)) {
      deps.push(id);
      adjusted.push(`workspaceDependencies:+${id}`);
    }
    if (!isRecord(projects[id])) {
      projects[id] = { root: `../mls-${id}`, type: 'lib' };
      adjusted.push(`projects:+${id}`);
    }
  }
  if (!adjusted.length) return { config, adjusted };
  return { config: { ...config, workspaceDependencies: deps, projects }, adjusted };
}

/** Writes only when something was missing. Records tokens on the module pipeline. */
export async function applyL5PlannerDeps(moduleName: string): Promise<string[]> {
  const config = await readL5Config();
  // entry10 already refuses when the file is missing; a silent no-op here would hide the day
  // another caller reaches this without that guard.
  if (!config) throw new Error('[agentPlannerL4] l5/config.json is missing — cannot adjust planner dependencies.');
  const { config: next, adjusted } = adjustL5PlannerDeps(config);
  if (!adjusted.length) return [];
  await writeL5Config(next);
  const pipeline = await readPipeline(moduleName);
  if (pipeline) {
    const nextPipeline: Ns5PipelineState = {
      ...pipeline,
      l5Adjusted: [...(pipeline.l5Adjusted || []), ...adjusted],
      updatedAt: new Date().toISOString(),
    };
    await writePipeline(nextPipeline);
  }
  return adjusted;
}

export function createPlAgentStep(stepId: PlStepId, moduleName: string): mls.msg.AIAgentStep {
  const dependsOn = [...PL_STEP_DEPENDS_ON[stepId]];
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: PL_STEP_TITLES[stepId],
    status: dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [],
    agentName: PL_AGENT_NAME,
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

export function buildPlPlannedSteps(moduleName: string): mls.msg.AIAgentStep[] {
  return PL_STEP_IDS.map(stepId => createPlAgentStep(stepId, moduleName));
}
