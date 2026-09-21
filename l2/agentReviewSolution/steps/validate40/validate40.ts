/// <mls fileReference="_102035_/l2/agentReviewSolution/steps/validate40/validate40.ts" enhancement="_blank" />

import {
  candidateCanPublish,
  unavailableCandidateCoverage,
  validateV3Candidate,
  type CandidateArea,
  type CandidateV3Context,
} from '/_102035_/l2/newRelease/helpers/candidateValidation.js';
import { stableStringifyTobe } from '/_102035_/l2/newRelease/tobeDiff.js';
import {
  validateNs5Overlay,
  type NewReleaseArtifact,
  type NewReleaseOverlaySources,
  type NewReleaseOverlayValidation,
  type Ns5TobeArtifactPath,
} from '/_102035_/l2/newRelease/tobe.js';
import {
  NS5_ONTOLOGY_SCHEMA_VERSION,
  isNs5OntologyV3Version,
  type Ns5AccessArtifact,
  type Ns5IntegrationArtifact,
  type Ns5JourneyArtifact,
  type Ns5JourneyIndexArtifact,
  type Ns5ModuleArtifact,
  type Ns5OntologyAnyEntity,
  type Ns5OntologyIndexArtifact,
  type Ns5OntologyIndexV3,
  type Ns5PipelineState,
  type Ns5RulesArtifact,
  type Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';

export const VALIDATE40_MAX_ATTEMPTS = 3 as const;

export interface Validate40CorrectionState {
  requestKey: string;
  correctionAttemptsUsed: number;
}

export interface Validate40Context {
  v3?: CandidateV3Context;
  v2?: { pipeline?: Ns5PipelineState | null; registryModuleNames?: string[] };
}

export interface Validate40Input {
  requestKey: string;
  state: Validate40CorrectionState;
  base: Record<string, unknown>;
  proposal: Record<string, unknown>;
  context: Validate40Context;
}

export interface Validate40Result {
  status: 'publishable' | 'draft' | 'attempt-limit';
  publishable: boolean;
  mayCorrect: boolean;
  schemaFamily: 'v2' | 'v3' | 'unknown';
  affectedAreas: CandidateArea[];
  unsupportedPaths: string[];
  state: Validate40CorrectionState;
  draft: Record<string, unknown>;
  validation: NewReleaseOverlayValidation | null;
  reasons: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validArtifactPath(path: string): path is Ns5TobeArtifactPath {
  return /^(?:module|rules|workflows|access|integration|workspace-model)\.defs\.ts$|^(?:journeys|ontology)\/index\.defs\.ts$/u.test(path)
    || /^(?:journeys\/[a-z][A-Za-z0-9]*|ontology\/[A-Z][A-Za-z0-9]*|workspaces\/[a-z][A-Za-z0-9]*)\.defs\.ts$/u.test(path);
}

function cloneInventory(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function sourceOf(path: string, base: Record<string, unknown>, proposal: Record<string, unknown>): 'asis' | 'tobe' {
  return stableStringifyTobe(base[path]) === stableStringifyTobe(proposal[path]) ? 'asis' : 'tobe';
}

function artifact<T>(path: Ns5TobeArtifactPath, base: Record<string, unknown>, proposal: Record<string, unknown>): NewReleaseArtifact<T> {
  const raw = proposal[path];
  return { path, source: sourceOf(path, base, proposal), value: isRecord(raw) ? raw as T : null };
}

/** JSON boundary adapter. The imported gates, not TypeScript assertions, decide whether artifact values are valid. */
export function validate40Sources(base: Record<string, unknown>, proposal: Record<string, unknown>): NewReleaseOverlaySources {
  const paths = [...new Set([...Object.keys(base), ...Object.keys(proposal)])].sort();
  for (const path of paths) if (!validArtifactPath(path)) throw new Error(`invalid L4 artifact path: ${path}`);
  const one = <T>(path: Ns5TobeArtifactPath) => artifact<T>(path, base, proposal);
  const journeys = paths.filter(path => /^journeys\/[a-z][A-Za-z0-9]*\.defs\.ts$/u.test(path) && path !== 'journeys/index.defs.ts')
    .map(path => one<Ns5JourneyArtifact>(path as Ns5TobeArtifactPath));
  const entities = paths.filter(path => /^ontology\/[A-Z][A-Za-z0-9]*\.defs\.ts$/u.test(path))
    .map(path => one<Ns5OntologyAnyEntity>(path as Ns5TobeArtifactPath));
  const module = one<Ns5ModuleArtifact>('module.defs.ts');
  const journeyIndex = one<Ns5JourneyIndexArtifact>('journeys/index.defs.ts');
  const ontologyIndex = one<Ns5OntologyIndexArtifact | Ns5OntologyIndexV3>('ontology/index.defs.ts');
  const rules = one<Ns5RulesArtifact>('rules.defs.ts');
  const workflows = one<Ns5WorkflowsArtifact>('workflows.defs.ts');
  const access = one<Ns5AccessArtifact>('access.defs.ts');
  const integration = one<Ns5IntegrationArtifact>('integration.defs.ts');
  const typed = [module, journeyIndex, ...journeys, ontologyIndex, ...entities, rules, workflows, access, integration];
  const known = new Set(typed.map(item => item.path));
  const extra = paths.filter(path => !known.has(path as Ns5TobeArtifactPath))
    .map(path => one<unknown>(path as Ns5TobeArtifactPath));
  return { module, journeyIndex, journeys, ontologyIndex, entities, rules, workflows, access, integration, all: [...typed, ...extra] };
}

function affectedByPath(path: string): CandidateArea[] {
  if (path === 'module.defs.ts') return ['module'];
  if (path.startsWith('journeys/')) return ['journeys'];
  if (path.startsWith('ontology/')) return ['ontologyAssembly', 'ontologyEntities'];
  if (path === 'rules.defs.ts') return ['rules'];
  if (path === 'workflows.defs.ts') return ['workflows'];
  if (path === 'access.defs.ts') return ['access'];
  if (path === 'integration.defs.ts') return ['integration'];
  return [];
}

export function validate40AffectedAreas(base: Record<string, unknown>, proposal: Record<string, unknown>): {
  areas: CandidateArea[];
  unsupportedPaths: string[];
} {
  const areas = new Set<CandidateArea>();
  const unsupportedPaths: string[] = [];
  for (const path of [...new Set([...Object.keys(base), ...Object.keys(proposal)])].sort()) {
    if (stableStringifyTobe(base[path]) === stableStringifyTobe(proposal[path])) continue;
    const mapped = affectedByPath(path);
    if (!mapped.length) unsupportedPaths.push(path);
    mapped.forEach(area => areas.add(area));
  }
  return { areas: [...areas], unsupportedPaths };
}

function failureValidation(code: 'REVIEW_VALIDATE40_EXCEPTION' | 'REVIEW_VALIDATE40_SCHEMA', message: string, affected: readonly CandidateArea[]): NewReleaseOverlayValidation {
  const coverage = unavailableCandidateCoverage(message);
  for (const area of affected) coverage[area] = { status: 'error', reason: message };
  return {
    ok: false, oracle: null, coverage,
    issues: [{ artifact: 'module.defs.ts', path: '$', severity: 'error', code, message, source: 'gate' }],
  };
}

function reasonsFor(validation: NewReleaseOverlayValidation, affected: readonly CandidateArea[], unsupportedPaths: readonly string[]): string[] {
  const reasons = unsupportedPaths.map(path => `No validate40 coverage for ${path}.`);
  for (const area of affected) {
    const coverage = validation.coverage[area];
    if (coverage.status !== 'checked') reasons.push(`${area}: ${coverage.status}${coverage.reason ? ` — ${coverage.reason}` : ''}`);
  }
  for (const issue of validation.issues.filter(item => item.severity === 'error')) reasons.push(`${issue.code} ${issue.path}: ${issue.message}`);
  return [...new Set(reasons)];
}

/** Pure core. Validation observes correction state but never consumes a correction attempt. */
export async function validate40Private(input: Validate40Input): Promise<Validate40Result> {
  if (!input.requestKey.trim() || input.state.requestKey !== input.requestKey) {
    throw new Error('validate40 attempt state does not belong to this persisted request');
  }
  if (!Number.isSafeInteger(input.state.correctionAttemptsUsed) || input.state.correctionAttemptsUsed < 0
    || input.state.correctionAttemptsUsed > VALIDATE40_MAX_ATTEMPTS) {
    throw new Error('invalid validate40 correction counter');
  }
  const draft = cloneInventory(input.proposal);
  const affected = validate40AffectedAreas(input.base, input.proposal);
  const rawIndex = input.proposal['ontology/index.defs.ts'];
  const schemaFamily: Validate40Result['schemaFamily'] = isRecord(rawIndex) && typeof rawIndex.schemaVersion === 'string'
    ? isNs5OntologyV3Version(rawIndex.schemaVersion) ? 'v3'
      : rawIndex.schemaVersion === NS5_ONTOLOGY_SCHEMA_VERSION ? 'v2' : 'unknown'
    : 'unknown';
  const state = { ...input.state };
  let validation: NewReleaseOverlayValidation;
  try {
    const sources = validate40Sources(input.base, input.proposal);
    if (schemaFamily === 'v3') {
      validation = validateV3Candidate(sources, input.context.v3 || {});
      if (!input.context.v3?.registryModuleNames) {
        validation = { ...validation, ok: false, coverage: { ...validation.coverage,
          integration: { status: 'unsupported', reason: 'The caller did not provide the real module registry.' } } };
      }
    } else if (schemaFamily === 'v2') {
      validation = await validateNs5Overlay(sources, input.context.v2);
      if (!input.context.v2?.registryModuleNames) {
        validation = { ...validation, ok: false, coverage: { ...validation.coverage,
          integration: { status: 'unsupported', reason: 'The caller did not provide the real module registry.' } } };
      }
    } else {
      validation = failureValidation('REVIEW_VALIDATE40_SCHEMA', 'Ontology schema family is unavailable.', affected.areas);
    }
  } catch (error) {
    validation = failureValidation('REVIEW_VALIDATE40_EXCEPTION', error instanceof Error ? error.message : String(error), affected.areas);
  }
  const publishable = affected.unsupportedPaths.length === 0 && candidateCanPublish(validation, affected.areas);
  const affectedUnsupported = affected.unsupportedPaths.length > 0
    || affected.areas.some(area => validation.coverage[area].status === 'unsupported');
  const operationalFailure = validation.issues.some(issue => issue.code === 'REVIEW_VALIDATE40_EXCEPTION' || issue.code === 'NR_GATE_EXCEPTION');
  const correctableInvalid = !publishable && !affectedUnsupported && !operationalFailure
    && (affected.areas.some(area => validation.coverage[area].status === 'error')
      || validation.issues.some(issue => issue.severity === 'error'));
  const attemptLimit = correctableInvalid && state.correctionAttemptsUsed >= VALIDATE40_MAX_ATTEMPTS;
  const mayCorrect = correctableInvalid && !attemptLimit;
  const reasons = reasonsFor(validation, affected.areas, affected.unsupportedPaths);
  if (attemptLimit) reasons.unshift(`Correction attempt limit (${VALIDATE40_MAX_ATTEMPTS}) reached for this request.`);
  return {
    status: publishable ? 'publishable' : attemptLimit ? 'attempt-limit' : 'draft', publishable, mayCorrect, schemaFamily,
    affectedAreas: affected.areas, unsupportedPaths: affected.unsupportedPaths,
    state, draft, validation, reasons,
  };
}
