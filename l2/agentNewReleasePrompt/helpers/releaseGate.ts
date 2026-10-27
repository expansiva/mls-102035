/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/releaseGate.ts" enhancement="_blank" />

import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import type { NrpArtifactKind } from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';
import { validateNs5Journeys } from '/_102035_/l2/solution/gates/journeys20/gate.js';
import { validateNs5Rules } from '/_102035_/l2/solution/gates/rules40/gate.js';
import { validateNs5Workflows } from '/_102035_/l2/solution/gates/workflows50/gate.js';
import { validateNs5Access } from '/_102035_/l2/solution/gates/access60/gate.js';
import { validateNs5Integration } from '/_102035_/l2/solution/gates/integration70/gate.js';
import { runNs5Oracle } from '/_102035_/l2/solution/gates/finalize80/gate.js';
import { ns5OntologyEdges, ns5OntologyEntityViews } from '/_102035_/l2/solution/ontologyView.js';
import { ns5RuleRecord } from '/_102035_/l2/solution/rulesView.js';
import { createNs4FlexibleWorkerTool } from '/_102035_/l2/solution/helpers/ns4WorkerTools.js';

export type NrpGateKind = NrpArtifactKind | 'coherence';

export interface NrpGateIssue {
  kind: NrpGateKind;
  code: string;
  message: string;
  path: string;
  /** Present when the same kind, code and path already failed before this edit. */
  baseline?: boolean;
}

export interface NrpAppliedEdit {
  mode: 'apply' | 'model';
  kind: NrpArtifactKind | null;
  artifact: unknown;
}

export type NrpGateActionName = 'write' | 'repair' | 'stop';

export interface NrpGateAction {
  action: NrpGateActionName;
  kind: NrpArtifactKind | null;
}

const REPAIR_TOOL = 'submitNrpEdit';

export function overlayNrpEdits(base: NrpModuleArtifacts, applied: NrpAppliedEdit[]): NrpModuleArtifacts {
  let next = clone(base);
  for (const edit of applied) {
    if (edit.mode === 'apply') {
      next = clone(edit.artifact as NrpModuleArtifacts);
      continue;
    }
    if (!edit.kind) throw new Error('A model edit needs an artifact kind.');
    next = replaceKind(next, edit.kind, edit.artifact);
  }
  return next;
}

/** Per-kind NS5 gate, then finalize80. Ontology v3 entity gates need platform catalogs this agent does not load. */
export function checkNrpGates(artifacts: NrpModuleArtifacts, kinds: readonly NrpArtifactKind[]): NrpGateIssue[] {
  const issues: NrpGateIssue[] = [];
  for (const kind of kinds) {
    if (kind === 'ontology') continue;
    issues.push(...checkKind(artifacts, kind));
  }
  issues.push(...checkCoherence(artifacts));
  return issues;
}

export function nrpIssueKey(issue: NrpGateIssue): string {
  return `${issue.kind}\u0000${issue.code}\u0000${issue.path}`;
}

/** Marks errors that already existed on the unedited module. Those do not fail the edit. */
export function classifyNrpGateIssues(
  baseline: readonly NrpGateIssue[],
  current: readonly NrpGateIssue[],
): NrpGateIssue[] {
  const known = new Set(baseline.map(nrpIssueKey));
  return current.map(issue => known.has(nrpIssueKey(issue)) ? { ...issue, baseline: true } : issue);
}

export function nrpFreshIssues(issues: readonly NrpGateIssue[]): NrpGateIssue[] {
  return issues.filter(issue => !issue.baseline);
}

export function nrpGateAction(
  issues: readonly NrpGateIssue[],
  changed: readonly NrpArtifactKind[],
  repaired: readonly NrpArtifactKind[],
): NrpGateAction {
  const fresh = nrpFreshIssues(issues);
  if (!fresh.length) return { action: 'write', kind: null };
  const pending = changed.filter(kind => !repaired.includes(kind));
  const kindFailure = pending.find(kind => fresh.some(issue => issue.kind === kind));
  if (kindFailure) return { action: 'repair', kind: kindFailure };
  if (fresh.some(issue => issue.kind === 'coherence') && pending.length) {
    return { action: 'repair', kind: pending[0] };
  }
  return { action: 'stop', kind: null };
}

export function nrpMayWrite(action: NrpGateActionName): boolean {
  return action === 'write';
}

export function buildNrpRepairHumanPrompt(
  request: string,
  kind: NrpArtifactKind,
  issues: readonly NrpGateIssue[],
  artifact: unknown,
): string {
  const lines = nrpFreshIssues(issues)
    .filter(issue => issue.kind === kind || issue.kind === 'coherence')
    .map(issue => `${issue.code} ${issue.path}: ${issue.message}`);
  return [
    `Kind: ${kind}`,
    `Request:\n${request}`,
    `Verification:\n${lines.join('\n')}`,
    `Artifact:\n${JSON.stringify(artifact)}`,
  ].join('\n\n');
}

export const NRP_REPAIR_SYSTEM_PROMPT = `<!-- modelType: reasoning -->
Repair one L4 artifact kind that failed verification.
The full user request is in the message. Keep every rule and value the request does not change.
Call submitNrpEdit. artifactJson is the whole artifact after the repair, as one JSON object serialized to text.`;

export function buildNrpRepairTool(): mls.msg.LLMTool {
  return createNs4FlexibleWorkerTool(
    REPAIR_TOOL,
    'Return the repaired artifact as JSON text. One kind only.',
    {
      $id: 'https://collab.codes/schemas/agentNewReleasePrompt/repair/2026-10-27-nrp-repair-v1',
      type: 'object',
      additionalProperties: false,
      required: ['artifactJson'],
      properties: { artifactJson: { type: 'string', minLength: 2 } },
    },
  );
}

function checkKind(artifacts: NrpModuleArtifacts, kind: NrpArtifactKind): NrpGateIssue[] {
  try {
    if (kind === 'rules') {
      return mapIssues(kind, validateNs5Rules(ns5RuleRecord(artifacts.rules), { moduleName: artifacts.module.moduleName }).issues);
    }
    if (kind === 'journeys') {
      const actors = artifacts.access.actors || [];
      return mapIssues(kind, validateNs5Journeys(
        artifacts.journeys.map(journey => ({ journeyId: journey.journeyId, business: journey.business })),
        { actors, moduleName: artifacts.module.moduleName },
      ).issues);
    }
    const views = ns5OntologyEntityViews(artifacts.entities);
    if (kind === 'workflows') {
      return mapIssues(kind, validateNs5Workflows(artifacts.workflows.processes, {
        moduleName: artifacts.module.moduleName,
        actorIds: (artifacts.access.actors || []).map(actor => actor.actorId),
        journeys: artifacts.journeys,
        entities: views,
        journeyDecisions: artifacts.workflows.journeyDecisions,
      }).issues);
    }
    if (kind === 'access') {
      return mapIssues(kind, validateNs5Access(artifacts.access.grants, {
        moduleName: artifacts.module.moduleName,
        actors: artifacts.access.actors,
        entities: views,
        relationships: ns5OntologyEdges(artifacts.ontologyIndex),
        journeys: artifacts.journeys,
      }).issues);
    }
    return mapIssues(kind, validateNs5Integration(
      artifacts.integration.inbound,
      artifacts.integration.outbound,
      artifacts.integration.plugins,
      {
        moduleName: artifacts.module.moduleName,
        actors: artifacts.access.actors || [],
        entities: views,
        registryModuleNames: [artifacts.module.moduleName],
        sourcePrompt: artifacts.module.sourcePrompt || '',
        journeySteps: artifacts.journeys.map(journey => ({
          journeyId: journey.journeyId,
          stepIds: journey.business.steps.map(step => step.stepId),
        })),
        processTasks: artifacts.workflows.processes.map(process => ({
          processId: process.processId,
          taskIds: process.tasks.map(task => task.taskId),
        })),
      },
    ).issues);
  } catch (error) {
    console.error(`[agentNewReleasePrompt] ${kind} verification failed`, error);
    return [{
      kind,
      code: 'NRP_GATE_FAILED',
      message: error instanceof Error ? error.message : String(error),
      path: '$',
    }];
  }
}

function checkCoherence(artifacts: NrpModuleArtifacts): NrpGateIssue[] {
  try {
    const report = runNs5Oracle({
      module: artifacts.module,
      journeys: artifacts.journeys,
      journeyIndex: artifacts.journeyIndex,
      entities: ns5OntologyEntityViews(artifacts.entities),
      ontologyIndex: artifacts.ontologyIndex,
      rules: artifacts.rules,
      workflows: artifacts.workflows,
      access: artifacts.access,
      integration: artifacts.integration,
    });
    return report.errors.map(error => ({
      kind: 'coherence' as const,
      code: error.code,
      message: error.message,
      path: error.path,
    }));
  } catch (error) {
    console.error('[agentNewReleasePrompt] finalize80 rejected the candidate', error);
    return [{
      kind: 'coherence',
      code: 'NRP_FINALIZE_FAILED',
      message: error instanceof Error ? error.message : String(error),
      path: '$',
    }];
  }
}

function mapIssues(
  kind: NrpArtifactKind,
  issues: ReadonlyArray<{ severity: 'error' | 'warning'; code: string; message: string; path?: string }>,
): NrpGateIssue[] {
  return issues
    .filter(issue => issue.severity === 'error')
    .map(issue => ({ kind, code: issue.code, message: issue.message, path: issue.path || '$' }));
}

function replaceKind(artifacts: NrpModuleArtifacts, kind: NrpArtifactKind, slice: unknown): NrpModuleArtifacts {
  const next = clone(artifacts);
  const root = record(slice, 'Edited artifact');
  if (kind === 'ontology') {
    next.ontologyIndex = root.ontologyIndex as NrpModuleArtifacts['ontologyIndex'];
    next.entities = root.entities as NrpModuleArtifacts['entities'];
    return next;
  }
  if (kind === 'rules') {
    next.rules = root as unknown as NrpModuleArtifacts['rules'];
    return next;
  }
  if (kind === 'journeys') {
    next.journeyIndex = root.journeyIndex as NrpModuleArtifacts['journeyIndex'];
    next.journeys = root.journeys as NrpModuleArtifacts['journeys'];
    return next;
  }
  if (kind === 'access') {
    next.access = root as unknown as NrpModuleArtifacts['access'];
    return next;
  }
  if (kind === 'workflows') {
    next.workflows = root as unknown as NrpModuleArtifacts['workflows'];
    return next;
  }
  next.integration = root as unknown as NrpModuleArtifacts['integration'];
  return next;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
