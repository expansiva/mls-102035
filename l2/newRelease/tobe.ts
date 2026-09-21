/// <mls fileReference="_102035_/l2/newRelease/tobe.ts" enhancement="_blank" />

import { getSessionUser } from '/_102033_/l2/shared/sessionUser.js';
import type { Ns5FinalizeReport, Ns5OracleSources } from '/_102035_/l2/agentNewSolution5/steps/finalize80/contracts.js';
import {
  fileExists,
  pipelineJsonFileForProject,
  readDefsJson,
  readJson,
  writeDefs,
  writeJson,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';
import type {
  Ns5AccessArtifact,
  Ns5IntegrationArtifact,
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleActor,
  Ns5ModuleArtifact,
  Ns5OntologyAnyEntity,
  Ns5OntologyEntityArtifact,
  Ns5OntologyIndexArtifact,
  Ns5OntologyIndexV3,
  Ns5PipelineState,
  Ns5RulesArtifact,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';
import { ns5OntologyEdges, ns5OntologyEntityViews } from '/_102035_/l2/solution/ontologyView.js';
import { ns5RuleRecord } from '/_102035_/l2/solution/rulesView.js';
import { isNewReleaseOntologyV3Version } from '/_102035_/l2/newRelease/ontologyV3Contract.js';
import { sha256Tobe, tobeDiff, type NewReleaseDiffEntry } from '/_102035_/l2/newRelease/tobeDiff.js';
import { historicalReleaseId, NEW_RELEASE_TOBE_UPDATED_EVENT, type NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import { deactivateL4Change, editL4Candidate, originalL4FileInfo, prepareL4Change, readActiveL4Change, readL4Release, revertL4CandidatePath } from '/_102035_/l2/newRelease/helpers/moduleRevision.js';
import type { CandidateArea, CandidateCoverage } from '/_102035_/l2/newRelease/helpers/candidateValidation.js';
import type { Ns5OntologyV3PlanDraft } from '/_102035_/l2/agentNewSolution5/steps/ontology30/contractsV3.js';

// The complete gates depend on the backend-only level-1 catalog. Keep that graph out of the
// browser bundle: the review UI enforces its own edit invariants and the full validation still
// runs in Node/worker flows before apply or execute.
const validationRuntimePromise = typeof window === 'undefined'
  ? Promise.all([
    import('/_102035_/l2/agentNewSolution5/steps/module10/gate.js'),
    import('/_102035_/l2/agentNewSolution5/steps/journeys20/gate.js'),
    import('/_102035_/l2/agentNewSolution5/steps/ontology30/gate.js'),
    import('/_102035_/l2/agentNewSolution5/steps/rules40/gate.js'),
    import('/_102035_/l2/agentNewSolution5/steps/workflows50/gate.js'),
    import('/_102035_/l2/agentNewSolution5/steps/access60/gate.js'),
    import('/_102035_/l2/agentNewSolution5/steps/integration70/gate.js'),
    import('/_102035_/l2/agentNewSolution5/steps/finalize80/gate.js'),
  ] as const)
  : null;

const v3ValidationRuntimePromise = typeof window === 'undefined'
  ? Promise.all([
    import('/_102035_/l2/newRelease/helpers/candidateValidation.js'),
    import('/_102034_/l4/ontology/mdm.defs.js'),
    import('/_102034_/l4/ontology/tdm.defs.js'),
    import('/_102034_/l4/ontology/ddm.defs.js'),
  ] as const)
  : null;

export { NEW_RELEASE_TOBE_UPDATED_EVENT } from '/_102035_/l2/newRelease/helpers/context.js';

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

export interface NewReleaseTobeDiff {
  path: Ns5TobeArtifactPath;
  entries: NewReleaseDiffEntry[];
}

export interface NewReleaseOverlayResult {
  sources: NewReleaseOverlaySources;
  manifest: Ns5TobeManifest | null;
  changeId: string | null;
  revisionId: string | null;
  stalePaths: Ns5TobeArtifactPath[];
  diffs: NewReleaseTobeDiff[];
  validation: NewReleaseOverlayValidation;
  errors: Array<{ path: string; message: string }>;
}

type FileRecord = Record<string, (mls.stor.IFileInfo & {
  getContent?: () => Promise<unknown>;
}) | undefined>;

interface GateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

function assertProject(project: number): void {
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

function pathParts(path: Ns5TobeArtifactPath): { subfolder: string; shortName: string } {
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

export function tobeManifestFileInfo(project: number, moduleName: string): Ns5FileInfo {
  assertProject(project);
  return { project, level: 4, folder: `${moduleName}/tobe/plan`, shortName: 'tobe', extension: '.json' };
}

function changeNow(now?: string): string {
  return now || new Date().toISOString();
}

export function recordTobeSave(
  current: Ns5TobeManifest | null,
  path: Ns5TobeArtifactPath,
  jsonPath: string,
  baseHash: string,
  author: string,
  now?: string,
): Ns5TobeManifest {
  const at = changeNow(now);
  const createdAt = current?.createdAt || at;
  return {
    schemaVersion: NS5_TOBE_MANIFEST_SCHEMA_VERSION,
    createdAt,
    updatedAt: at,
    author: author || current?.author || 'anonymous',
    base: { ...(current?.base || {}), [path]: current?.base?.[path] || baseHash },
    changes: [...(current?.changes || []), { path, jsonPath: jsonPath || '$', at }],
  };
}

export function recordTobeDiscard(
  current: Ns5TobeManifest,
  path: Ns5TobeArtifactPath,
  now?: string,
): Ns5TobeManifest | null {
  const base = { ...current.base };
  delete base[path];
  const changes = current.changes.filter(change => change.path !== path);
  if (!Object.keys(base).length && !changes.length) return null;
  return { ...current, base, changes, updatedAt: changeNow(now) };
}

async function readManifest(project: number, moduleName: string): Promise<Ns5TobeManifest | null> {
  return readJson<Ns5TobeManifest>(tobeManifestFileInfo(project, moduleName));
}

function artifactWriteSpec(moduleName: string, path: Ns5TobeArtifactPath): { exportName: string; typeName: string } {
  const shortName = pathParts(path).shortName;
  if (path === 'module.defs.ts') return { exportName: `${moduleName}Module`, typeName: 'Ns5ModuleArtifact' };
  if (path === 'journeys/index.defs.ts') return { exportName: `${moduleName}JourneyIndex`, typeName: 'Ns5JourneyIndexArtifact' };
  if (path.startsWith('journeys/')) return { exportName: `${shortName}Journey`, typeName: 'Ns5JourneyArtifact' };
  if (path === 'ontology/index.defs.ts') return { exportName: `${moduleName}OntologyIndex`, typeName: 'Ns5OntologyIndexArtifact' };
  if (path.startsWith('ontology/')) return { exportName: `${moduleName}Entity${shortName}`, typeName: 'Ns5OntologyEntityArtifact' };
  if (path === 'rules.defs.ts') return { exportName: `${moduleName}Rules`, typeName: 'Ns5RulesArtifact' };
  if (path === 'workflows.defs.ts') return { exportName: `${moduleName}Workflows`, typeName: 'Ns5WorkflowsArtifact' };
  if (path === 'access.defs.ts') return { exportName: `${moduleName}Access`, typeName: 'Ns5AccessArtifact' };
  if (path === 'integration.defs.ts') return { exportName: `${moduleName}Integration`, typeName: 'Ns5IntegrationArtifact' };
  if (path === 'workspace-model.defs.ts') return { exportName: `${moduleName}WorkspaceModel`, typeName: 'unknown' };
  if (path.startsWith('workspaces/')) return { exportName: `${shortName}Workspace`, typeName: 'unknown' };
  throw new Error(`Unsupported tobe artifact path: ${path}`);
}

async function manifestAuthor(): Promise<string> {
  const user = await getSessionUser();
  return user.email || user.name || 'anonymous';
}

function announceTobeUpdated(project: number, moduleName: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NEW_RELEASE_TOBE_UPDATED_EVENT, { detail: { project, moduleName } }));
}

export async function saveTobeArtifact(
  project: number,
  moduleName: string,
  pathValue: Ns5TobeArtifactPath,
  value: unknown,
  options: { expectedRevisionId: string | null; expectedChangeId?: string | null; jsonPath?: string; author?: string; now?: string },
): Promise<Ns5TobeManifest> {
  const path = normalizeTobeArtifactPath(pathValue);
  const oldManifest = await readManifest(project, moduleName);
  const prepared = await prepareL4Change(project, moduleName, oldManifest);
  if (options.expectedChangeId !== undefined && options.expectedChangeId !== prepared.change.changeId && !(options.expectedChangeId === null && prepared.created)) {
    throw new Error('L4 change conflict: reload before saving.');
  }
  const expected = options.expectedRevisionId;
  const { value: manifest, revision } = await editL4Candidate(project, moduleName, expected, prepared.change.changeId, async () => {
    const original = await readDefsJson<unknown>(originalL4FileInfo(project, moduleName, prepared.release.baseId, path));
    if (original === null) throw new Error(`Cannot prepare ${path}: captured artifact was not found.`);
    const current = await readManifest(project, moduleName);
    const baseHash = current?.base?.[path] || await sha256Tobe(original);
    const spec = artifactWriteSpec(moduleName, path);
    await writeDefs(tobeArtifactFileInfo(project, moduleName, path, 'tobe'), spec.exportName, value, spec.typeName);
    const next = recordTobeSave(current, path, options.jsonPath || '$', baseHash, options.author || await manifestAuthor(), options.now);
    await writeJson(tobeManifestFileInfo(project, moduleName), next);
    return next;
  });
  manifest.changeId = revision.changeId;
  manifest.revisionId = revision.revisionId;
  manifest.baseId = revision.baseId;
  announceTobeUpdated(project, moduleName);
  return manifest;
}

function listedPlanFiles(project: number, moduleName: string): mls.stor.IFileInfo[] {
  const folder = `${moduleName}/tobe/plan`;
  const files = mls.stor.files as FileRecord;
  const keys = new Set<string>();
  for (const [key, file] of Object.entries(files)) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (file.folder === folder || file.folder?.startsWith(`${folder}/`)) keys.add(key);
  }
  const listFolder = (mls.stor.localStor as { listFolder?: (project: number, level: number, folder: string) => mls.stor.IFileInfo[] }).listFolder;
  if (typeof listFolder === 'function') {
    for (const info of listFolder(project, 4, folder) || []) {
      if (info.folder !== folder && !String(info.folder || '').startsWith(`${folder}/`)) continue;
      const key = mls.stor.getKeyToFile(info);
      keys.add(key);
      if (!files[key]) files[key] = { ...info, versionRef: '0', inLocalStorage: true, status: 'changed', hasError: false } as mls.stor.IFileInfo;
    }
  }
  return [...keys].map(key => files[key]).filter((file): file is mls.stor.IFileInfo => !!file && file.status !== 'deleted');
}

function relativePlanPath(file: Pick<mls.stor.IFileInfo, 'folder' | 'shortName' | 'extension'>, moduleName: string): string {
  const root = `${moduleName}/tobe/plan`;
  const suffix = String(file.folder || '').slice(root.length).replace(/^\//u, '');
  return `${suffix ? `${suffix}/` : ''}${file.shortName}${file.extension}`;
}

async function deleteInventory(files: mls.stor.IFileInfo[]): Promise<void> {
  if (!files.length) return;
  const { deleteFile } = await import('/_102027_/l2/libStor.js');
  for (const file of files) await deleteFile(file);
}

export async function discardTobe(
  project: number,
  moduleName: string,
  pathValue?: Ns5TobeArtifactPath,
  announce = true,
): Promise<{ deleted: string[]; manifest: Ns5TobeManifest | null }> {
  assertProject(project);
  const path = pathValue ? normalizeTobeArtifactPath(pathValue) : null;
  const deleted: string[] = [];

  let manifest: Ns5TobeManifest | null = null;
  if (path) {
    const updateManifest = async () => {
      const current = await readManifest(project, moduleName);
      if (!current) return;
      manifest = recordTobeDiscard(current, path);
      if (manifest) await writeJson(tobeManifestFileInfo(project, moduleName), manifest);
      else {
        const manifestFile = listedPlanFiles(project, moduleName)
          .find(file => relativePlanPath(file, moduleName) === 'tobe.json');
        if (manifestFile) {
          await deleteInventory([manifestFile]);
          deleted.push(`l4/${manifestFile.folder}/${manifestFile.shortName}${manifestFile.extension}`);
        }
      }
    };
    const active = await readActiveL4Change(project, moduleName);
    if (active) {
      await revertL4CandidatePath(project, moduleName, path, active.activeRevisionId, updateManifest);
    } else {
      const inventory = listedPlanFiles(project, moduleName);
      const target = inventory.filter(file => relativePlanPath(file, moduleName) === path);
      deleted.push(...target.map(file => `l4/${file.folder}/${file.shortName}${file.extension}`));
      await deleteInventory(target);
      await updateManifest();
    }
  } else {
    await deactivateL4Change(project, moduleName, async () => {
      const inventory = listedPlanFiles(project, moduleName);
      deleted.push(...inventory.map(file => `l4/${file.folder}/${file.shortName}${file.extension}`));
      await deleteInventory(inventory);
    });
  }

  const remaining = listedPlanFiles(project, moduleName)
    .map(file => relativePlanPath(file, moduleName));
  const forbidden = path ? (manifest ? [] : ['tobe.json']) : remaining;
  if (forbidden.some(item => remaining.includes(item))) {
    throw new Error(`Discard inventory mismatch: ${forbidden.filter(item => remaining.includes(item)).join(', ')}`);
  }
  if (announce) announceTobeUpdated(project, moduleName);
  return { deleted: [...new Set(deleted)].sort(), manifest };
}

async function readArtifact<T>(
  project: number,
  moduleName: string,
  path: Ns5TobeArtifactPath,
  version: 'asis' | 'tobe',
  errors: Array<{ path: string; message: string }>,
  baseId?: string,
): Promise<NewReleaseArtifact<T>> {
  const planned = tobeArtifactFileInfo(project, moduleName, path, 'tobe');
  const original = baseId ? originalL4FileInfo(project, moduleName, baseId, path) : tobeArtifactFileInfo(project, moduleName, path, 'asis');
  const hasPlanned = version === 'tobe' && fileExists(planned);
  const info = hasPlanned ? planned : original;
  try {
    const value = await readDefsJson<T>(info);
    const originalValue = hasPlanned ? await readDefsJson<T>(original) : value;
    const source = hasPlanned && value !== null && await sha256Tobe(value) !== await sha256Tobe(originalValue) ? 'tobe' : 'asis';
    if (hasPlanned && value === null) errors.push({ path, message: 'Prepared artifact is unreadable; captured data was not substituted.' });
    return { path, source, value };
  } catch (error) {
    errors.push({ path, message: error instanceof Error ? error.message : String(error) });
    return { path, source: hasPlanned ? 'tobe' : 'asis', value: null };
  }
}

function idsFromFiles(project: number, moduleName: string, kind: 'journeys' | 'ontology'): string[] {
  const folders = new Set([`${moduleName}/${kind}`, `${moduleName}/tobe/plan/${kind}`]);
  const names = new Set<string>();
  for (const file of Object.values(mls.stor.files as FileRecord)) {
    if (!file || file.status === 'deleted' || file.project !== project || file.level !== 4) continue;
    if (!folders.has(String(file.folder || '')) || file.extension !== '.defs.ts' || file.shortName === 'index') continue;
    names.add(String(file.shortName || ''));
  }
  return [...names].filter(Boolean).sort();
}

function missingIssue(path: Ns5TobeArtifactPath): NewReleaseValidationIssue {
  return { artifact: path, path: '$', severity: 'error', code: 'NR_ARTIFACT_MISSING', message: `Required artifact ${path} is missing.`, source: 'gate' };
}

function pushGate(issues: NewReleaseValidationIssue[], artifact: Ns5TobeArtifactPath, values: GateIssue[]): void {
  for (const issue of values) issues.push({ artifact, path: issue.path || '$', ...issue, source: 'gate' });
}

function artifactForOraclePath(path: string): Ns5TobeArtifactPath | 'module' {
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

export async function validateNs5Overlay(
  sources: NewReleaseOverlaySources,
  context?: { pipeline?: Ns5PipelineState | null; registryModuleNames?: string[]; ontologyPlan?: Ns5OntologyV3PlanDraft | null },
): Promise<NewReleaseOverlayValidation> {
  const issues: NewReleaseValidationIssue[] = [];
  const module = sources.module.value;
  const journeyIndex = sources.journeyIndex.value;
  const journeys = sources.journeys.map(item => item.value).filter((value): value is Ns5JourneyArtifact => !!value);
  const ontologyIndex = sources.ontologyIndex.value;
  const ontologyV3 = isNs5OntologyV3(ontologyIndex);
  if (ontologyV3) {
    if (v3ValidationRuntimePromise) {
      const [adapter, { mdm }, { tdm }, { ddm }] = await v3ValidationRuntimePromise;
      return adapter.validateV3Candidate(sources, { mdm, tdm, ddm, ontologyPlan: context?.ontologyPlan, registryModuleNames: context?.registryModuleNames });
    }
    const areas: CandidateArea[] = ['module', 'journeys', 'ontologyAssembly', 'ontologyEntities', 'rules', 'workflows', 'access', 'integration', 'oracle'];
    const coverage = Object.fromEntries(areas.map(area => [area, {
      status: 'unsupported', reason: 'Complete v3 gates run in the validator worker, not this browser.',
    }])) as CandidateCoverage;
    return {
      ok: false, oracle: null, coverage,
      issues: [{ artifact: 'ontology/index.defs.ts', path: '$', severity: 'warning', code: 'NR_VALIDATION_UNAVAILABLE', message: 'Complete v3 validation has not run in this browser.', source: 'gate' }],
    };
  }
  const entities = ontologyV3
    ? []
    : sources.entities.map(item => item.value).filter((value): value is Ns5OntologyEntityArtifact => !!value);
  const rules = sources.rules.value;
  const workflows = sources.workflows.value;
  const access = sources.access.value;
  const integration = sources.integration.value;

  for (const artifact of sources.all) if (!artifact.value) issues.push(missingIssue(artifact.path));
  let oracle: Ns5FinalizeReport | null = null;
  const coverage: CandidateCoverage = Object.fromEntries(
    (['module', 'journeys', 'ontologyAssembly', 'ontologyEntities', 'rules', 'workflows', 'access', 'integration', 'oracle'] as CandidateArea[])
      .map(area => [area, { status: 'unsupported', reason: 'Gate has not run.' }]),
  ) as CandidateCoverage;
  const checked = (area: CandidateArea) => { coverage[area] = { status: 'checked' }; };
  const validationRuntime = validationRuntimePromise ? await validationRuntimePromise : null;
  if (validationRuntime) {
    const [moduleGate, journeysGate, ontologyGate, rulesGate, workflowsGate, accessGate, integrationGate, finalizeGate] = validationRuntime;
    if (module) { pushGate(issues, 'module.defs.ts', moduleGate.validateNs5ModuleArtifact(module, { fixedModuleName: module.moduleName, actors: access?.actors }).issues); checked('module'); }
    if (module && journeys.length) {
      pushGate(issues, 'journeys/index.defs.ts', journeysGate.validateNs5Journeys(
        journeys.map(journey => ({ journeyId: journey.journeyId, business: journey.business })),
        { actors: access?.actors || context?.pipeline?.steps.module10?.actors || [], moduleName: module.moduleName },
      ).issues);
      if (journeys.length === sources.journeys.length && journeyIndex) checked('journeys');
    }
    if (module && ontologyIndex && !ontologyV3 && entities.length) {
      pushGate(issues, 'ontology/index.defs.ts', ontologyGate.validateNs5OntologyAssembly(
        { index: ontologyIndex, entities },
        {
          moduleName: module.moduleName,
          actors: access?.actors || context?.pipeline?.steps.module10?.actors || [],
          journeys,
          liftedAggregateEntityIds: context?.pipeline?.steps.ontology30?.liftedAggregateEntities,
        },
      ).issues);
      if (entities.length === sources.entities.length) { checked('ontologyAssembly'); checked('ontologyEntities'); }
    }
    if (rules) { pushGate(issues, 'rules.defs.ts', rulesGate.validateNs5Rules(ns5RuleRecord(rules), { moduleName: module?.moduleName }).issues); checked('rules'); }
    if (workflows && !ontologyV3) { pushGate(issues, 'workflows.defs.ts', workflowsGate.validateNs5Workflows(workflows.processes, {
      moduleName: module?.moduleName,
      actorIds: (access?.actors || []).map(actor => actor.actorId),
      journeys,
      entities,
      journeyDecisions: workflows.journeyDecisions,
    }).issues); checked('workflows'); }
    if (access && ontologyIndex && !ontologyV3) { pushGate(issues, 'access.defs.ts', accessGate.validateNs5Access(access.grants, {
      moduleName: module?.moduleName,
      actors: access.actors,
      entities,
      relationships: ontologyIndex.relationships,
      journeys,
    }).issues); checked('access'); }
    if (integration && module && !ontologyV3) { pushGate(issues, 'integration.defs.ts', integrationGate.validateNs5Integration(
      integration.inbound,
      integration.outbound,
      integration.plugins,
      {
        moduleName: module.moduleName,
        actors: access?.actors || [],
        entities,
        registryModuleNames: context?.registryModuleNames || [module.moduleName],
        sourcePrompt: module.sourcePrompt,
        journeySteps: journeys.map(journey => ({ journeyId: journey.journeyId, stepIds: journey.business.steps.map(step => step.stepId) })),
        processTasks: workflows?.processes.map(process => ({ processId: process.processId, taskIds: process.tasks.map(task => task.taskId) })) || [],
      },
    ).issues); checked('integration'); }

    if (!ontologyV3 && module && journeyIndex && ontologyIndex && rules && workflows && access && integration
      && journeys.length === sources.journeys.length && entities.length === sources.entities.length) {
      const oracleSources: Ns5OracleSources = {
        module, journeyIndex, journeys, ontologyIndex,
        // ns5_43: the oracle reads the normalized view of the ontology, not the raw v2 artifacts.
        entities: ns5OntologyEntityViews(entities),
        rules, workflows, access, integration,
        journeyDiskFiles: ['index', ...sources.journeys.map(item => pathParts(item.path).shortName)],
        ontologyDiskFiles: ['index', ...sources.entities.map(item => pathParts(item.path).shortName)],
        liftedAggregateEntities: context?.pipeline?.steps.ontology30?.liftedAggregateEntities,
      };
      oracle = finalizeGate.runNs5Oracle(oracleSources);
      checked('oracle');
      for (const issue of [...oracle.errors, ...oracle.warnings]) {
        issues.push({
          artifact: artifactForOraclePath(issue.path),
          path: issue.path,
          severity: oracle.errors.includes(issue) ? 'error' : 'warning',
          code: issue.code,
          message: issue.message,
          source: 'oracle',
        });
      }
    }
  }
  if (!validationRuntime) issues.push({
    artifact: 'module.defs.ts', path: '$', severity: 'warning', code: 'NR_VALIDATION_UNAVAILABLE',
    message: 'Complete L4 gates have not run in this browser.', source: 'gate',
  });
  const areaArtifacts: Partial<Record<CandidateArea, string[]>> = {
    module: ['module.defs.ts'], journeys: ['journeys/index.defs.ts'], ontologyAssembly: ['ontology/index.defs.ts'],
    ontologyEntities: ['ontology/index.defs.ts'], rules: ['rules.defs.ts'], workflows: ['workflows.defs.ts'],
    access: ['access.defs.ts'], integration: ['integration.defs.ts'], oracle: [],
  };
  for (const area of Object.keys(coverage) as CandidateArea[]) {
    if (coverage[area].status !== 'checked') continue;
    if (issues.some(issue => issue.severity === 'error' && (issue.source === 'oracle' && area === 'oracle' || areaArtifacts[area]?.includes(issue.artifact)))) {
      coverage[area] = { status: 'error' };
    }
  }
  return { ok: Object.values(coverage).every(item => item.status === 'checked') && !issues.some(issue => issue.severity === 'error'), issues, oracle, coverage };
}

async function staleManifestPaths(
  project: number,
  moduleName: string,
  manifest: Ns5TobeManifest | null,
): Promise<Ns5TobeArtifactPath[]> {
  if (!manifest) return [];
  const stale: Ns5TobeArtifactPath[] = [];
  for (const [rawPath, expected] of Object.entries(manifest.base)) {
    const path = normalizeTobeArtifactPath(rawPath);
    const asis = await readDefsJson<unknown>(tobeArtifactFileInfo(project, moduleName, path, 'asis'));
    if (!expected || asis === null || await sha256Tobe(asis) !== expected) stale.push(path);
  }
  return stale.sort();
}

async function overlayDiffs(
  project: number,
  moduleName: string,
  sources: NewReleaseOverlaySources,
  baseId?: string,
): Promise<NewReleaseTobeDiff[]> {
  const result: NewReleaseTobeDiff[] = [];
  for (const artifact of sources.all) {
    if (artifact.source !== 'tobe' || artifact.value === null) continue;
    const asis = await readDefsJson<unknown>(baseId ? originalL4FileInfo(project, moduleName, baseId, artifact.path) : tobeArtifactFileInfo(project, moduleName, artifact.path, 'asis'));
    if (asis === null) continue;
    const entries = tobeDiff(asis, artifact.value);
    if (entries.length) result.push({ path: artifact.path, entries });
  }
  return result;
}

export async function readNs5Overlay(
  project: number,
  moduleName: string,
  version: NewReleaseVersion = 'asis',
  context?: { pipeline?: Ns5PipelineState | null; registryModuleNames?: string[] },
): Promise<NewReleaseOverlayResult> {
  const errors: Array<{ path: string; message: string }> = [];
  const historicalId = historicalReleaseId(version);
  if (historicalId && !await readL4Release(project, moduleName, historicalId)) throw new Error('Historical release is incomplete.');
  let active = historicalId ? null : await readActiveL4Change(project, moduleName);
  if (version === 'tobe' && !active) active = (await prepareL4Change(project, moduleName, await readManifest(project, moduleName))).change;
  const baseId = historicalId ?? active?.baseId;
  const reading = version === 'tobe' ? 'tobe' : 'asis';
  const module = await readArtifact<Ns5ModuleArtifact>(project, moduleName, 'module.defs.ts', reading, errors, baseId);
  const journeyIndex = await readArtifact<Ns5JourneyIndexArtifact>(project, moduleName, 'journeys/index.defs.ts', reading, errors, baseId);
  const journeyIds = journeyIndex.value?.journeys.map(item => item.journeyId) || idsFromFiles(project, moduleName, 'journeys');
  const journeys = await Promise.all(journeyIds.map(id => readArtifact<Ns5JourneyArtifact>(project, moduleName, `journeys/${id}.defs.ts`, reading, errors, baseId)));
  const ontologyIndex = await readArtifact<Ns5OntologyIndexArtifact | Ns5OntologyIndexV3>(project, moduleName, 'ontology/index.defs.ts', reading, errors, baseId);
  const entityIds = ns5OntologyEntityIds(ontologyIndex.value);
  const resolvedEntityIds = entityIds.length ? entityIds : idsFromFiles(project, moduleName, 'ontology');
  const entities = await Promise.all(resolvedEntityIds.map(id => readArtifact<Ns5OntologyAnyEntity>(project, moduleName, `ontology/${id}.defs.ts`, reading, errors, baseId)));
  const [rules, workflows, access, integration] = await Promise.all([
    readArtifact<Ns5RulesArtifact>(project, moduleName, 'rules.defs.ts', reading, errors, baseId),
    readArtifact<Ns5WorkflowsArtifact>(project, moduleName, 'workflows.defs.ts', reading, errors, baseId),
    readArtifact<Ns5AccessArtifact>(project, moduleName, 'access.defs.ts', reading, errors, baseId),
    readArtifact<Ns5IntegrationArtifact>(project, moduleName, 'integration.defs.ts', reading, errors, baseId),
  ]);
  const all: NewReleaseArtifact<unknown>[] = [module, journeyIndex, ...journeys, ontologyIndex, ...entities, rules, workflows, access, integration];
  const sources: NewReleaseOverlaySources = { module, journeyIndex, journeys, ontologyIndex, entities, rules, workflows, access, integration, all };
  const ontologyPlan = !historicalId && isNs5OntologyV3(ontologyIndex.value)
    ? await readJson<Ns5OntologyV3PlanDraft>(pipelineJsonFileForProject(project, moduleName, 'ontology30-plan-draft'))
    : null;
  const storedManifest = historicalId ? null : await readManifest(project, moduleName);
  const manifest = storedManifest && active ? { ...storedManifest, changeId: active.changeId, revisionId: active.activeRevisionId ?? undefined, baseId: active.baseId } : storedManifest;
  const [stalePaths, diffs] = await Promise.all([
    staleManifestPaths(project, moduleName, manifest),
    overlayDiffs(project, moduleName, sources, baseId),
  ]);
  return { sources, manifest, changeId: active?.changeId ?? null, revisionId: active?.activeRevisionId ?? null, stalePaths, diffs, validation: await validateNs5Overlay(sources, { ...context, ontologyPlan }), errors };
}
