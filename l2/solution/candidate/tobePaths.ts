/// <mls fileReference="_102035_/l2/solution/candidate/tobePaths.ts" enhancement="_blank" />

import type { Ns5FinalizeReport } from '/_102035_/l2/solution/gates/finalize80/contracts.js';
import { type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type {
  Ns5AccessArtifact,
  Ns5IntegrationArtifact,
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleArtifact,
  Ns5OntologyAnyEntity,
  Ns5OntologyIndexArtifact,
  Ns5OntologyIndexV3,
  Ns5RulesArtifact,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';
import type { CandidateCoverage } from '/_102035_/l2/newRelease/helpers/candidateValidation.js';
import { isNewReleaseOntologyV3Version } from '/_102035_/l2/solution/candidate/ontologyV3Contract.js';

export const NS5_TOBE_MANIFEST_SCHEMA_VERSION = '2026-09-13-ns5-tobe-plan-v1' as const;

export type Ns5TobeArtifactPath =
  | 'module.defs.ts'
  | 'journeys/index.defs.ts'
  | `journeys/${string}.defs.ts`
  | 'ontology/index.defs.ts'
  | `ontology/${string}.defs.ts`
  | 'rules.defs.ts'
  | 'workflows.defs.ts'
  | 'access.defs.ts'
  | 'integration.defs.ts'
  | 'workspace-model.defs.ts'
  | `workspaces/${string}.defs.ts`;

export interface Ns5TobeChange {
  path: Ns5TobeArtifactPath;
  jsonPath: string;
  at: string;
}

export interface Ns5TobeManifest {
  schemaVersion: typeof NS5_TOBE_MANIFEST_SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  author: string;
  base: Partial<Record<Ns5TobeArtifactPath, string>>;
  changes: Ns5TobeChange[];
  changeId?: string;
  revisionId?: string;
  baseId?: string;
}

export interface NewReleaseArtifact<T> {
  path: Ns5TobeArtifactPath;
  source: 'asis' | 'tobe';
  value: T | null;
}

export interface NewReleaseOverlaySources {
  module: NewReleaseArtifact<Ns5ModuleArtifact>;
  journeyIndex: NewReleaseArtifact<Ns5JourneyIndexArtifact>;
  journeys: NewReleaseArtifact<Ns5JourneyArtifact>[];
  ontologyIndex: NewReleaseArtifact<Ns5OntologyIndexArtifact | Ns5OntologyIndexV3>;
  entities: NewReleaseArtifact<Ns5OntologyAnyEntity>[];
  rules: NewReleaseArtifact<Ns5RulesArtifact>;
  workflows: NewReleaseArtifact<Ns5WorkflowsArtifact>;
  access: NewReleaseArtifact<Ns5AccessArtifact>;
  integration: NewReleaseArtifact<Ns5IntegrationArtifact>;
  all: NewReleaseArtifact<unknown>[];
}

export function isNs5OntologyV3(
  value: Ns5OntologyIndexArtifact | Ns5OntologyIndexV3 | null | undefined,
): value is Ns5OntologyIndexV3 {
  return isNewReleaseOntologyV3Version(value?.schemaVersion);
}

export function ns5OntologyEntityIds(
  value: Ns5OntologyIndexArtifact | Ns5OntologyIndexV3 | null | undefined,
): string[] {
  if (!value) return [];
  return isNs5OntologyV3(value)
    ? value.entities.map(entity => entity.entityId)
    : [...value.entities];
}

export interface NewReleaseValidationIssue {
  artifact: Ns5TobeArtifactPath | 'module';
  path: string;
  severity: 'error' | 'warning';
  code: string;
  message: string;
  source: 'gate' | 'oracle';
}

export interface NewReleaseOverlayValidation {
  ok: boolean;
  issues: NewReleaseValidationIssue[];
  oracle: Ns5FinalizeReport | null;
  coverage: CandidateCoverage;
}

export function assertProject(project: number): void {
  if (!Number.isInteger(project) || project <= 0) throw new Error('A valid project is required.');
}

export function normalizeTobeArtifactPath(path: string): Ns5TobeArtifactPath {
  const value = String(path || '');
  const fixed = new Set([
    'module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts', 'rules.defs.ts',
    'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts', 'workspace-model.defs.ts',
  ]);
  if (fixed.has(value)) return value as Ns5TobeArtifactPath;
  if (/^(journeys\/[a-z][A-Za-z0-9]*|ontology\/[A-Z][A-Za-z0-9]*)\.defs\.ts$/u.test(value)) {
    return value as Ns5TobeArtifactPath;
  }
  if (/^workspaces\/[a-z][A-Za-z0-9]*\.defs\.ts$/u.test(value)) return value as Ns5TobeArtifactPath;
  throw new Error(`Unsupported tobe artifact path: ${path}`);
}

export function pathParts(path: Ns5TobeArtifactPath): { subfolder: string; shortName: string } {
  const segments = path.replace(/\.defs\.ts$/u, '').split('/');
  return { shortName: segments.pop() || '', subfolder: segments.join('/') };
}

export function tobeArtifactFileInfo(
  project: number,
  moduleName: string,
  path: Ns5TobeArtifactPath,
  source: 'asis' | 'tobe',
): Ns5FileInfo {
  assertProject(project);
  const normalized = normalizeTobeArtifactPath(path);
  const parts = pathParts(normalized);
  const root = source === 'tobe' ? `${moduleName}/tobe/plan` : moduleName;
  return {
    project,
    level: 4,
    folder: parts.subfolder ? `${root}/${parts.subfolder}` : root,
    shortName: parts.shortName,
    extension: '.defs.ts',
  };
}
