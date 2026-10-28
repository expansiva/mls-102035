/// <mls fileReference="_102035_/l2/solution/candidate/moduleVerification.ts" enhancement="_blank" />

/** One candidate check for the Studio screen and the text-order agent. */
import { validateNs5Journeys } from '/_102035_/l2/solution/gates/journeys20/gate.js';
import { validateNs5Rules } from '/_102035_/l2/solution/gates/rules40/gate.js';
import { validateNs5Workflows } from '/_102035_/l2/solution/gates/workflows50/gate.js';
import { validateNs5Access } from '/_102035_/l2/solution/gates/access60/gate.js';
import { validateNs5Integration } from '/_102035_/l2/solution/gates/integration70/gate.js';
import { runNs5Oracle } from '/_102035_/l2/solution/gates/finalize80/gate.js';
import type { Ns5FinalizeReport, Ns5OracleSources } from '/_102035_/l2/solution/gates/finalize80/contracts.js';
import { ns5OntologyEdges, ns5OntologyEntityViews, type Ns5OntologyAnyIndex } from '/_102035_/l2/solution/ontologyView.js';
import { ns5RuleRecord } from '/_102035_/l2/solution/rulesView.js';
import type {
  Ns5AccessArtifact,
  Ns5IntegrationArtifact,
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleArtifact,
  Ns5OntologyAnyEntity,
  Ns5RulesAny,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';

export const CANDIDATE_GATE_KINDS = ['ontology', 'rules', 'journeys', 'access', 'workflows', 'integration'] as const;
export type CandidateGateKind = typeof CANDIDATE_GATE_KINDS[number];
export type CandidateIssueKind = CandidateGateKind | 'coherence';

export interface CandidateModule {
  module: Ns5ModuleArtifact;
  journeyIndex: Ns5JourneyIndexArtifact;
  journeys: Ns5JourneyArtifact[];
  ontologyIndex: Ns5OntologyAnyIndex;
  entities: Ns5OntologyAnyEntity[];
  rules: Ns5RulesAny;
  workflows: Ns5WorkflowsArtifact;
  access: Ns5AccessArtifact;
  integration: Ns5IntegrationArtifact;
}

export interface CandidateAppliedEdit {
  mode: 'apply' | 'model';
  kind: CandidateGateKind | null;
  artifact: unknown;
}

export interface CandidateGateIssue {
  kind: CandidateIssueKind;
  code: string;
  message: string;
  path: string;
  /** Present when the same kind, code and path already failed before this edit. */
  baseline?: boolean;
}

export interface CandidateOracleResult {
  report: Ns5FinalizeReport | null;
  issues: CandidateGateIssue[];
}

/** Editing version plus applied edits. A full `apply` replaces the module; a `model` edit replaces one kind. */
export function assembleCandidateModule(base: CandidateModule, applied: CandidateAppliedEdit[]): CandidateModule {
  let next = clone(base);
  for (const edit of applied) {
    if (edit.mode === 'apply') {
      next = clone(edit.artifact as CandidateModule);
      continue;
    }
    if (!edit.kind) throw new Error('A model edit needs an artifact kind.');
    next = replaceKind(next, edit.kind, edit.artifact);
  }
  return next;
}

/**
 * Per-kind gates, then finalize80. Ontology v3 entity gates need platform catalogs the text agent does not load,
 * so `ontology` is skipped here. The screen runs those gates in `validateV3Candidate` before this oracle.
 * Optional oracle inputs (`journeyDiskFiles`, `ontologyDiskFiles`, `liftedAggregateEntities`, `siblings`,
 * `platformEventIds`) stay out unless `extras` passes them. Only a new error blocks: see `classifyCandidateIssues`.
 */
export function verifyCandidateModule(
  artifacts: CandidateModule,
  kinds: readonly CandidateGateKind[],
  extras?: CandidateOracleExtras,
): CandidateGateIssue[] {
  const issues: CandidateGateIssue[] = [];
  for (const kind of kinds) {
    if (kind === 'ontology') continue;
    issues.push(...gateIssuesForKind(artifacts, kind));
  }
  issues.push(...runCandidateOracle(artifacts, extras).issues);
  return issues;
}

export function candidateIssueKey(issue: CandidateGateIssue): string {
  return `${issue.kind}\u0000${issue.code}\u0000${issue.path}`;
}

/** Marks errors that already existed on the unedited module. Those do not fail the edit. */
export function classifyCandidateIssues(
  baseline: readonly CandidateGateIssue[],
  current: readonly CandidateGateIssue[],
): CandidateGateIssue[] {
  const known = new Set(baseline.map(candidateIssueKey));
  return current.map(issue => known.has(candidateIssueKey(issue)) ? { ...issue, baseline: true } : issue);
}

export function freshCandidateIssues(issues: readonly CandidateGateIssue[]): CandidateGateIssue[] {
  return issues.filter(issue => !issue.baseline);
}

export type CandidateOracleExtras = Pick<Ns5OracleSources,
  'journeyDiskFiles' | 'ontologyDiskFiles' | 'liftedAggregateEntities' | 'siblings' | 'platformEventIds'>;

export function runCandidateOracle(artifacts: CandidateModule, extras?: CandidateOracleExtras): CandidateOracleResult {
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
      ...extras,
    });
    return {
      report,
      issues: report.errors.map(error => ({
        kind: 'coherence' as const,
        code: error.code,
        message: error.message,
        path: error.path,
      })),
    };
  } catch (error) {
    console.error('[candidate] finalize80 rejected the candidate', error);
    return {
      report: null,
      issues: [{
        kind: 'coherence',
        code: 'NRP_FINALIZE_FAILED',
        message: error instanceof Error ? error.message : String(error),
        path: '$',
      }],
    };
  }
}

export function artifactForOraclePath(path: string): `journeys/${string}.defs.ts` | `ontology/${string}.defs.ts` | 'journeys/index.defs.ts' | 'rules.defs.ts' | 'workflows.defs.ts' | 'access.defs.ts' | 'integration.defs.ts' | 'module' {
  const journey = /^journeys\.([a-z][A-Za-z0-9]*)/u.exec(path);
  if (journey) return `journeys/${journey[1]}.defs.ts`;
  const entity = /^ontology\.([A-Z][A-Za-z0-9]*)/u.exec(path);
  if (entity) return `ontology/${entity[1]}.defs.ts`;
  if (path.startsWith('journeys/index')) return 'journeys/index.defs.ts';
  if (path.startsWith('rules')) return 'rules.defs.ts';
  if (path.startsWith('workflows')) return 'workflows.defs.ts';
  if (path.startsWith('access')) return 'access.defs.ts';
  if (path.startsWith('integration')) return 'integration.defs.ts';
  return 'module';
}

function gateIssuesForKind(artifacts: CandidateModule, kind: CandidateGateKind): CandidateGateIssue[] {
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
    if (kind === 'integration') {
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
    }
    return [];
  } catch (error) {
    console.error(`[candidate] ${kind} verification failed`, error);
    return [{
      kind,
      code: 'NRP_GATE_FAILED',
      message: error instanceof Error ? error.message : String(error),
      path: '$',
    }];
  }
}

function mapIssues(
  kind: CandidateGateKind,
  issues: ReadonlyArray<{ severity: 'error' | 'warning'; code: string; message: string; path?: string }>,
): CandidateGateIssue[] {
  return issues
    .filter(issue => issue.severity === 'error')
    .map(issue => ({ kind, code: issue.code, message: issue.message, path: issue.path || '$' }));
}

function replaceKind(artifacts: CandidateModule, kind: CandidateGateKind, slice: unknown): CandidateModule {
  const next = clone(artifacts);
  const root = record(slice, 'Edited artifact');
  if (!Array.isArray(root.files)) throw new Error('A model edit lists files.');
  for (const item of root.files) {
    const file = record(item, 'Edited file');
    const id = file.id;
    if (typeof id !== 'string' || !id) throw new Error('An edited file needs an id.');
    const body = file.artifact;
    if (kind === 'ontology') {
      if (id === 'index') next.ontologyIndex = body as CandidateModule['ontologyIndex'];
      else next.entities = upsert(next.entities, 'entityId', id, body);
    } else if (kind === 'journeys') {
      if (id === 'index') next.journeyIndex = body as CandidateModule['journeyIndex'];
      else next.journeys = upsert(next.journeys, 'journeyId', id, body);
    } else if (kind === 'rules') next.rules = body as CandidateModule['rules'];
    else if (kind === 'access') next.access = body as CandidateModule['access'];
    else if (kind === 'workflows') next.workflows = body as CandidateModule['workflows'];
    else next.integration = body as CandidateModule['integration'];
  }
  return next;
}

function upsert<T>(items: T[], key: keyof T, id: string, body: unknown): T[] {
  const next = items.slice();
  const index = next.findIndex(item => (item as Record<string, unknown>)[key as string] === id);
  if (index < 0) next.push(body as T);
  else next[index] = body as T;
  return next;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
