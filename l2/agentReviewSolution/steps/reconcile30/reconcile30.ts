/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/reconcile30/reconcile30.ts" enhancement="_blank" />

import {
  unavailableCandidateCoverage,
  validateV3Candidate,
  type CandidateArea,
} from '/_102035_/l2/newRelease/helpers/candidateValidation.js';
import { tobeDiff, type NewReleaseDiffEntry } from '/_102035_/l2/newRelease/tobeDiff.js';
import { validateNs5Overlay, type NewReleaseOverlayValidation, type NewReleaseValidationIssue } from '/_102035_/l2/newRelease/tobe.js';
import { NS5_ONTOLOGY_SCHEMA_VERSION, isNs5OntologyV3Version } from '/_102035_/l2/solution/types.js';
import { validate40AffectedAreas, validate40Sources, type Validate40Context } from '../validate40/validate40.js';

export interface Reconcile30AreaDiagnostic {
  area: CandidateArea | 'unmapped';
  status: 'checked' | 'clarification' | 'unsupported';
  reason: string;
  issues: NewReleaseValidationIssue[];
}

export interface Reconcile30Result {
  status: 'ready' | 'clarification' | 'unsupported';
  schemaFamily: 'v2' | 'v3' | 'unknown';
  changedPaths: string[];
  directAreas: CandidateArea[];
  dependencyAreas: CandidateArea[];
  diagnostics: Reconcile30AreaDiagnostic[];
  clarification: string;
  draft: Record<string, unknown>;
  mutations: [];
  validation: NewReleaseOverlayValidation | null;
}

const TEXT_FIELDS = new Set(['title', 'description', 'sourcePrompt', 'goal', 'expectedOutcome', 'summary', 'label']);
const STRUCTURAL_DEPENDENTS: Partial<Record<CandidateArea, CandidateArea[]>> = {
  module: ['journeys', 'ontologyAssembly', 'ontologyEntities', 'rules', 'workflows', 'access', 'integration'],
  journeys: ['ontologyAssembly', 'ontologyEntities', 'workflows', 'access', 'integration'],
  ontologyAssembly: ['ontologyEntities', 'workflows', 'access', 'integration'],
  ontologyEntities: ['ontologyAssembly', 'workflows', 'access', 'integration'],
  workflows: ['ontologyAssembly', 'ontologyEntities', 'integration'],
  access: ['module', 'journeys', 'ontologyAssembly', 'ontologyEntities', 'workflows', 'integration'],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneInventory(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function areaForPath(path: string): CandidateArea[] {
  if (path === 'module.defs.ts') return ['module'];
  if (path.startsWith('journeys/')) return ['journeys'];
  if (path.startsWith('ontology/')) return ['ontologyAssembly', 'ontologyEntities'];
  if (path === 'rules.defs.ts') return ['rules'];
  if (path === 'workflows.defs.ts') return ['workflows'];
  if (path === 'access.defs.ts') return ['access'];
  if (path === 'integration.defs.ts') return ['integration'];
  return [];
}

function isTextOnly(entries: readonly NewReleaseDiffEntry[]): boolean {
  return entries.length > 0 && entries.every(entry => {
    const field = /\.([A-Za-z][A-Za-z0-9]*)$/u.exec(entry.jsonPath)?.[1] || '';
    return TEXT_FIELDS.has(field) && typeof entry.before === 'string' && typeof entry.after === 'string';
  });
}

function issueBelongsTo(area: CandidateArea, issue: NewReleaseValidationIssue): boolean {
  if (area === 'module') return issue.artifact === 'module' || issue.artifact === 'module.defs.ts';
  if (area === 'journeys') return issue.artifact.startsWith('journeys/');
  if (area === 'ontologyAssembly' || area === 'ontologyEntities') return issue.artifact.startsWith('ontology/');
  if (area === 'rules') return issue.artifact === 'rules.defs.ts';
  if (area === 'workflows') return issue.artifact === 'workflows.defs.ts';
  if (area === 'access') return issue.artifact === 'access.defs.ts';
  if (area === 'integration') return issue.artifact === 'integration.defs.ts';
  return issue.source === 'oracle';
}

function unavailable(reason: string): NewReleaseOverlayValidation {
  return { ok: false, oracle: null, coverage: unavailableCandidateCoverage(reason), issues: [] };
}

/** Diagnostic core only. There is intentionally no mutation/compiler path here. */
export async function reconcile30Private(
  base: Record<string, unknown>,
  proposal: Record<string, unknown>,
  context: Validate40Context = {},
): Promise<Reconcile30Result> {
  const draft = cloneInventory(proposal);
  const paths = [...new Set([...Object.keys(base), ...Object.keys(proposal)])].sort();
  const changedPaths = paths.filter(path => tobeDiff(base[path], proposal[path]).length > 0);
  const direct = validate40AffectedAreas(base, proposal);
  const dependencies = new Set<CandidateArea>(direct.areas);
  for (const path of changedPaths) {
    const entries = tobeDiff(base[path], proposal[path]);
    if (isTextOnly(entries)) continue;
    for (const area of areaForPath(path)) for (const dependent of STRUCTURAL_DEPENDENTS[area] || []) dependencies.add(dependent);
  }

  const rawIndex = proposal['ontology/index.defs.ts'];
  const schemaFamily: Reconcile30Result['schemaFamily'] = isRecord(rawIndex) && typeof rawIndex.schemaVersion === 'string'
    ? isNs5OntologyV3Version(rawIndex.schemaVersion) ? 'v3'
      : rawIndex.schemaVersion === NS5_ONTOLOGY_SCHEMA_VERSION ? 'v2' : 'unknown'
    : 'unknown';
  let validation: NewReleaseOverlayValidation | null = null;
  let operationalReason = '';
  try {
    const sources = validate40Sources(base, proposal);
    if (schemaFamily === 'v3') {
      validation = validateV3Candidate(sources, context.v3 || {});
      if (!context.v3?.registryModuleNames) validation = { ...validation, ok: false, coverage: { ...validation.coverage,
        integration: { status: 'unsupported', reason: 'The caller did not provide the real module registry.' } } };
    } else if (schemaFamily === 'v2') {
      validation = await validateNs5Overlay(sources, context.v2);
      if (!context.v2?.registryModuleNames) validation = { ...validation, ok: false, coverage: { ...validation.coverage,
        integration: { status: 'unsupported', reason: 'The caller did not provide the real module registry.' } } };
    } else {
      operationalReason = 'Ontology schema family is unavailable.';
      validation = unavailable(operationalReason);
    }
  } catch (error) {
    operationalReason = error instanceof Error ? error.message : String(error);
    validation = unavailable(operationalReason);
  }

  const diagnostics: Reconcile30AreaDiagnostic[] = [...dependencies].map(area => {
    const issues = validation!.issues.filter(issue => issueBelongsTo(area, issue));
    const coverage = validation!.coverage[area];
    if (coverage.status === 'error' || issues.some(issue => issue.severity === 'error')) {
      return { area, status: 'clarification', reason: coverage.reason || issues.find(issue => issue.severity === 'error')?.message || 'Reference validation failed.', issues };
    }
    if (coverage.status === 'unsupported') {
      return { area, status: 'unsupported', reason: coverage.reason || 'No pure gate is available.', issues };
    }
    return { area, status: 'checked', reason: 'Pure gate checked the supplied inventory.', issues };
  });
  for (const path of direct.unsupportedPaths) diagnostics.push({
    area: 'unmapped', status: 'unsupported', reason: `No reconcile30 rule covers ${path}.`, issues: [],
  });
  if (operationalReason && diagnostics.length === 0) diagnostics.push({
    area: 'unmapped', status: 'unsupported', reason: operationalReason, issues: [],
  });
  const hasClarification = diagnostics.some(item => item.status === 'clarification');
  const hasUnsupported = diagnostics.some(item => item.status === 'unsupported');
  const status: Reconcile30Result['status'] = hasClarification ? 'clarification' : hasUnsupported ? 'unsupported' : 'ready';
  const clarification = status === 'ready' ? '' : diagnostics
    .filter(item => item.status !== 'checked')
    .map(item => `${item.area}: ${item.reason}`)
    .join('\n');
  return {
    status, schemaFamily, changedPaths, directAreas: direct.areas, dependencyAreas: [...dependencies],
    diagnostics, clarification, draft, mutations: [], validation,
  };
}
