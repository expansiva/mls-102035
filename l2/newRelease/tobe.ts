/// <mls fileReference="_102035_/l2/newRelease/tobe.ts" enhancement="_blank" />

import { assertNewReleaseEditable } from '/_102035_/l2/newRelease/helpers/revisionSelection.js';
import { implementationCommands, readL4Implementation } from '/_102035_/l2/solution/candidate/moduleImplementation.js';

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
import type { Ns4SolutionRegistryArtifact } from '/_102035_/l2/solution/helpers/organizationTypes.js';
import { ns5ConnectionCatalogs, readNs5ConnectionSources } from '/_102035_/l2/solution/helpers/connectionCatalog.js';
import { readNs5SiblingSystems } from '/_102035_/l2/solution/ns5Siblings.js';
import { siblingsFromRegistry } from '/_102035_/l2/newRelease/integrationRequests.js';
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
  type NewReleaseValidationIssue,
  type Ns5TobeArtifactPath,
  type Ns5TobeManifest,
} from '/_102035_/l2/solution/candidate/tobePaths.js';
import { historicalReleaseId, NEW_RELEASE_TOBE_UPDATED_EVENT, type NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import { clearChangeOrigins, recordManualChangeOrigin } from '/_102035_/l2/newRelease/helpers/changeOrigins.js';
import { completeL4Implementation, deleteInventory, listedCandidateFiles, listedPlanFiles, listedTobeFolder } from '/_102035_/l2/solution/candidate/tobeCompletion.js';
import { captureConfirmedL4Release, deactivateL4Change, editL4Candidate, originalL4FileInfo, prepareL4Change, readActiveL4Change, readL4Release, readSealedL4Candidate, revertL4CandidatePath, withModuleWriter, type L4ReleaseManifest, type L4SealedCandidateSnapshot } from '/_102035_/l2/solution/candidate/moduleRevision.js';
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
  confirmedRound?: L4ReleaseManifest['confirmedRound'];
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

function announceTobeUpdated(project: number, moduleName: string, version?: 'asis'): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NEW_RELEASE_TOBE_UPDATED_EVENT, { detail: { project, moduleName, version } }));
}

export class NewReleaseSaveValidationError extends Error {
  constructor(readonly reason: 'unavailable' | 'invalid' | 'missing', readonly issues: NewReleaseValidationIssue[]) {
    super(`new-release.save.${reason}`);
    this.name = 'NewReleaseSaveValidationError';
  }
}

export async function saveTobeArtifact(
  project: number,
  moduleName: string,
  pathValue: Ns5TobeArtifactPath,
  value: unknown,
  options: { expectedRevisionId: string | null; expectedChangeId?: string | null; jsonPath?: string; author?: string; now?: string },
): Promise<Ns5TobeManifest> {
  await assertNewReleaseEditable(project, moduleName);
  const path = normalizeTobeArtifactPath(pathValue);
  const active = await readActiveL4Change(project, moduleName);
  const reading = active ? 'tobe' : 'asis';
  const currentOverlay = await readNs5Overlay(project, moduleName, reading);
  const currentArtifact = currentOverlay.sources.all.find(artifact => artifact.path === path);
  if (!currentArtifact) throw new NewReleaseSaveValidationError('missing', []);
  const proposedOverlay = await readNs5Overlay(project, moduleName, reading, undefined, { path, value });
  const validation = proposedOverlay.validation;
  const unsupported = Object.entries(validation.coverage)
    .filter(([, area]) => area.status === 'unsupported')
    .map(([area, coverage]) => ({ area, reason: coverage.reason ?? '' }));
  if (unsupported.length) {
    console.error('[newRelease] candidate validation unavailable', JSON.stringify({
      project, moduleName, path, unsupported,
      previousOntologyCoverage: currentOverlay.validation.coverage.ontologyEntities,
    }));
    throw new NewReleaseSaveValidationError('unavailable', validation.issues);
  }
  const identity = (issue: NewReleaseValidationIssue) => `${issue.artifact}:${issue.path}:${issue.code}:${issue.message}`;
  const previousErrors = new Set(currentOverlay.validation.issues.filter(issue => issue.severity === 'error').map(identity));
  const newErrors = validation.issues.filter(issue => issue.severity === 'error' && !previousErrors.has(identity(issue)));
  if (newErrors.length) throw new NewReleaseSaveValidationError('invalid', newErrors);
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
    await recordManualChangeOrigin(project, moduleName, path, currentArtifact.value, value, options.now ? new Date(options.now) : undefined);
    return next;
  });
  manifest.changeId = revision.changeId;
  manifest.revisionId = revision.revisionId;
  manifest.baseId = revision.baseId;
  announceTobeUpdated(project, moduleName);
  return manifest;
}

function relativePlanPath(file: Pick<mls.stor.IFileInfo, 'folder' | 'shortName' | 'extension'>, moduleName: string): string {
  const root = `${moduleName}/tobe/plan`;
  const suffix = String(file.folder || '').slice(root.length).replace(/^\//u, '');
  return `${suffix ? `${suffix}/` : ''}${file.shortName}${file.extension}`;
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
      await clearChangeOrigins(project, moduleName, path);
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
      const inventory = [...listedPlanFiles(project, moduleName), ...listedCandidateFiles(project, moduleName), ...listedTobeFolder(project, `${moduleName}/tobe/operations`)];
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
    const published = path === 'module.defs.ts' ? await readDefsJson<Ns5ModuleArtifact>(tobeArtifactFileInfo(project, moduleName, path, 'asis')) : null;
    const source = hasPlanned && value !== null && await sha256Tobe(value) !== await sha256Tobe(moduleLanguageBaseline(originalValue, value, published)) ? 'tobe' : 'asis';
    if (hasPlanned && value === null) errors.push({ path, message: 'Prepared artifact is unreadable; captured data was not substituted.' });
    return { path, source, value };
  } catch (error) {
    errors.push({ path, message: error instanceof Error ? error.message : String(error) });
    return { path, source: hasPlanned ? 'tobe' : 'asis', value: null };
  }
}

function idsFromFiles(project: number, moduleName: string, kind: 'journeys' | 'ontology', reading: 'asis' | 'tobe'): string[] {
  const folder = reading === 'tobe' ? `${moduleName}/tobe/plan/${kind}` : `${moduleName}/${kind}`;
  const names = new Set<string>();
  for (const file of Object.values(mls.stor.files as FileRecord)) {
    if (!file || file.status === 'deleted' || file.project !== project || file.level !== 4) continue;
    if (String(file.folder || '') !== folder || file.extension !== '.defs.ts' || file.shortName === 'index') continue;
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


/** Match only language metadata already applied directly to the published module. */
export function moduleLanguageBaseline(base: unknown, candidate: unknown, published: Ns5ModuleArtifact | null): unknown {
  if (!base || !candidate || !published || typeof base !== 'object' || typeof candidate !== 'object') return base;
  const next = candidate as Ns5ModuleArtifact;
  return JSON.stringify(next.productLanguages) === JSON.stringify(published.productLanguages) && next.defaultLanguage === published.defaultLanguage
    ? { ...base, productLanguages: published.productLanguages, defaultLanguage: published.defaultLanguage } : base;
}

export { saveDirectLanguageMetadata } from '/_102035_/l2/solution/candidate/moduleLanguages.js';

async function overlayDiffs(
  project: number,
  moduleName: string,
  sources: NewReleaseOverlaySources,
  baseId?: string,
  baseline?: NewReleaseOverlaySources,
  compareAll = false,
): Promise<NewReleaseTobeDiff[]> {
  const result: NewReleaseTobeDiff[] = [];
  for (const artifact of sources.all) {
    if ((!compareAll && artifact.source !== 'tobe') || artifact.value === null) continue;
    const asis = await readDefsJson<unknown>(baseId ? originalL4FileInfo(project, moduleName, baseId, artifact.path) : tobeArtifactFileInfo(project, moduleName, artifact.path, 'asis'));
    const published = !compareAll && artifact.path === 'module.defs.ts' ? await readDefsJson<Ns5ModuleArtifact>(tobeArtifactFileInfo(project, moduleName, artifact.path, 'asis')) : null;
    const entries = tobeDiff(asis === null ? undefined : compareAll ? asis : moduleLanguageBaseline(asis, artifact.value, published), artifact.value);
    if (entries.length) result.push({ path: artifact.path, entries });
  }
  if (baseline) {
    const present = new Set(sources.all.filter(artifact => artifact.value !== null).map(artifact => artifact.path));
    for (const artifact of baseline.all) {
      if (artifact.value === null || present.has(artifact.path)) continue;
      const entries = tobeDiff(artifact.value, undefined);
      if (entries.length) result.push({ path: artifact.path, entries });
    }
  }
  return result.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}

async function readOverlaySourceBundle(
  project: number,
  moduleName: string,
  reading: 'asis' | 'tobe',
  baseId: string | undefined,
  proposed?: { path: Ns5TobeArtifactPath; value: unknown },
): Promise<{ sources: NewReleaseOverlaySources; errors: Array<{ path: string; message: string }> }> {
  const errors: Array<{ path: string; message: string }> = [];
  const module = await readArtifact<Ns5ModuleArtifact>(project, moduleName, 'module.defs.ts', reading, errors, baseId);
  const journeyIndex = await readArtifact<Ns5JourneyIndexArtifact>(project, moduleName, 'journeys/index.defs.ts', reading, errors, baseId);
  const journeyIds = journeyIndex.value?.journeys.map(item => item.journeyId) || idsFromFiles(project, moduleName, 'journeys', reading);
  const journeys = await Promise.all(journeyIds.map(id => readArtifact<Ns5JourneyArtifact>(project, moduleName, `journeys/${id}.defs.ts`, reading, errors, baseId)));
  const ontologyIndex = await readArtifact<Ns5OntologyIndexArtifact | Ns5OntologyIndexV3>(project, moduleName, 'ontology/index.defs.ts', reading, errors, baseId);
  const entityIds = ns5OntologyEntityIds(ontologyIndex.value);
  const resolvedEntityIds = entityIds.length ? entityIds : idsFromFiles(project, moduleName, 'ontology', reading);
  const entities = await Promise.all(resolvedEntityIds.map(id => readArtifact<Ns5OntologyAnyEntity>(project, moduleName, `ontology/${id}.defs.ts`, reading, errors, baseId)));
  const [rules, workflows, access, integration] = await Promise.all([
    readArtifact<Ns5RulesArtifact>(project, moduleName, 'rules.defs.ts', reading, errors, baseId),
    readArtifact<Ns5WorkflowsArtifact>(project, moduleName, 'workflows.defs.ts', reading, errors, baseId),
    readArtifact<Ns5AccessArtifact>(project, moduleName, 'access.defs.ts', reading, errors, baseId),
    readArtifact<Ns5IntegrationArtifact>(project, moduleName, 'integration.defs.ts', reading, errors, baseId),
  ]);
  if (proposed) {
    const candidates: NewReleaseArtifact<unknown>[] = [module, journeyIndex, ...journeys, ontologyIndex, ...entities, rules, workflows, access, integration];
    const artifact = candidates.find(item => item.path === proposed.path);
    if (artifact) { artifact.value = structuredClone(proposed.value); artifact.source = 'tobe'; }
  }
  const all: NewReleaseArtifact<unknown>[] = [module, journeyIndex, ...journeys, ontologyIndex, ...entities, rules, workflows, access, integration];
  const sources: NewReleaseOverlaySources = { module, journeyIndex, journeys, ontologyIndex, entities, rules, workflows, access, integration, all };
  return { sources, errors };
}

export async function readNs5Overlay(
  project: number,
  moduleName: string,
  version: NewReleaseVersion = 'asis',
  context?: { pipeline?: Ns5PipelineState | null; registryModuleNames?: string[] },
  proposed?: { path: Ns5TobeArtifactPath; value: unknown },
): Promise<NewReleaseOverlayResult> {
  const historicalId = historicalReleaseId(version);
  const historicalRelease = historicalId ? await readL4Release(project, moduleName, historicalId) : null;
  if (historicalId && !historicalRelease) throw new Error('Historical release is incomplete.');
  let active = version === 'tobe' ? await readActiveL4Change(project, moduleName) : null;
  if (version === 'tobe' && !active) active = (await prepareL4Change(project, moduleName, await readManifest(project, moduleName))).change;
  const baseId = historicalId ?? active?.baseId;
  const reading = version === 'tobe' ? 'tobe' : 'asis';
  const loaded = await readOverlaySourceBundle(project, moduleName, reading, baseId, proposed);
  const { sources, errors } = loaded;
  let baseline: NewReleaseOverlaySources | undefined;
  const comparisonBaseId = historicalRelease?.confirmedRound?.sourceBaseId ?? (version === 'tobe' ? baseId : undefined);
  if (comparisonBaseId) {
    const base = await readOverlaySourceBundle(project, moduleName, 'asis', comparisonBaseId);
    if (base.errors.length === 0 && base.sources.all.every(artifact => artifact.value !== null)) baseline = base.sources;
    else if (historicalRelease?.confirmedRound) errors.push({ path: `pipeline/releases/${comparisonBaseId}`, message: 'Snapshot baseline is incomplete.' });
  }
  const ontologyPlan = !historicalId && isNs5OntologyV3(sources.ontologyIndex.value)
    ? await readJson<Ns5OntologyV3PlanDraft>(pipelineJsonFileForProject(project, moduleName, 'ontology30-plan-draft'))
    : null;
  const storedManifest = version === 'tobe' ? await readManifest(project, moduleName) : null;
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
    overlayDiffs(project, moduleName, sources, comparisonBaseId ?? baseId, baseline, !!historicalRelease?.confirmedRound && !!baseline),
  ]);
  let registry: Ns4SolutionRegistryArtifact | null = null;
  try {
    registry = await readDefsJson<Ns4SolutionRegistryArtifact>({
      project, level: 4, folder: 'organization', shortName: 'registry', extension: '.defs.ts',
    });
  } catch (error) {
    errors.push({ path: 'l4/organization/registry.defs.ts', message: error instanceof Error ? error.message : String(error) });
  }
  const previousProject = mls.actualProject;
  mls.actualProject = project;
  let siblingRead: Awaited<ReturnType<typeof readNs5SiblingSystems>>;
  try {
    siblingRead = await readNs5SiblingSystems(siblingsFromRegistry(registry, moduleName));
  } finally {
    mls.actualProject = previousProject;
  }
  errors.push(...siblingRead.errors);
  const siblingSystems = siblingRead.groups.flatMap(group => group.systems);
  const connectionSources = await readNs5ConnectionSources(ns5ConnectionCatalogs().map(catalog => catalog.connectionId));
  return { sources, manifest, sealedRevision, changeId: active?.changeId ?? null, revisionId: active?.activeRevisionId ?? null,
    confirmedRound: historicalRelease?.confirmedRound, stalePaths, diffs,
    validation: await validateNs5Overlay(sources, { ...context, siblingSystems, ontologyPlan, connectionSources }, baseline), errors };
}

/** Retire only the successfully applied revision, keeping its immutable history. */
export async function completeTobeImplementation(project: number, moduleName: string, changeId: string, revisionId: string, confirmedBy = ''): Promise<void> {
  await completeL4Implementation(project, moduleName, changeId, revisionId, confirmedBy);
  announceTobeUpdated(project, moduleName, 'asis');
}
