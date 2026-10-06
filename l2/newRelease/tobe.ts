/// <mls fileReference="_102035_/l2/newRelease/tobe.ts" enhancement="_blank" />

import { getSessionUser } from '/_102033_/l2/shared/sessionUser.js';
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
  Ns5OntologyIndexArtifact,
  Ns5OntologyIndexV3,
  Ns5PipelineState,
  Ns5RulesArtifact,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';
import { sha256Tobe, tobeDiff, type NewReleaseDiffEntry } from '/_102035_/l2/solution/candidate/tobeDiff.js';
import { validateNs5Overlay } from '/_102035_/l2/solution/candidate/overlayValidation.js';
import {
  assertProject,
  isNs5OntologyV3,
  normalizeTobeArtifactPath,
  ns5OntologyEntityIds,
  NS5_TOBE_MANIFEST_SCHEMA_VERSION,
  pathParts,
  tobeArtifactFileInfo,
  type NewReleaseArtifact,
  type NewReleaseOverlaySources,
  type NewReleaseOverlayValidation,
  type Ns5TobeArtifactPath,
  type Ns5TobeManifest,
} from '/_102035_/l2/solution/candidate/tobePaths.js';
import { historicalReleaseId, NEW_RELEASE_TOBE_UPDATED_EVENT, type NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import { deactivateL4Change, editL4Candidate, originalL4FileInfo, prepareL4Change, readActiveL4Change, readL4Release, readSealedL4Candidate, revertL4CandidatePath, type L4SealedCandidateSnapshot } from '/_102035_/l2/solution/candidate/moduleRevision.js';
import type { Ns5OntologyV3PlanDraft } from '/_102035_/l2/solution/gates/ontology30/contractsV3.js';

export { NEW_RELEASE_TOBE_UPDATED_EVENT } from '/_102035_/l2/newRelease/helpers/context.js';

export interface NewReleaseTobeDiff {
  path: Ns5TobeArtifactPath;
  entries: NewReleaseDiffEntry[];
}

export interface NewReleaseOverlayResult {
  sources: NewReleaseOverlaySources;
  manifest: Ns5TobeManifest | null;
  sealedRevision: L4SealedCandidateSnapshot | null;
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
  let sealedRevision: L4SealedCandidateSnapshot | null = null;
  if (version === 'tobe' && active?.activeRevisionId) {
    const path = `l4/${moduleName}/pipeline/changes/${active.changeId}/revisions/${active.activeRevisionId}`;
    try {
      sealedRevision = await readSealedL4Candidate(project, moduleName, active.changeId, active.activeRevisionId);
      if (!sealedRevision) errors.push({ path, message: 'The sealed revision failed its integrity check.' });
    } catch (error) {
      errors.push({ path, message: error instanceof Error ? error.message : String(error) });
    }
  }
  const [stalePaths, diffs] = await Promise.all([
    staleManifestPaths(project, moduleName, manifest),
    overlayDiffs(project, moduleName, sources, baseId),
  ]);
  return { sources, manifest, sealedRevision, changeId: active?.changeId ?? null, revisionId: active?.activeRevisionId ?? null, stalePaths, diffs, validation: await validateNs5Overlay(sources, { ...context, ontologyPlan }), errors };
}
