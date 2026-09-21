/// <mls fileReference="_102035_/l2/newRelease/helpers/moduleRevision.ts" enhancement="_blank" />

import { fileExists, readDefsJson, readJson, readSourceText, writeJson, writeSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { Ns5ModuleArtifact, Ns5JourneyIndexArtifact, Ns5OntologyIndexArtifact, Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';
import { ns5OntologyEntityIds, normalizeTobeArtifactPath, tobeArtifactFileInfo, type Ns5TobeArtifactPath, type Ns5TobeManifest } from '/_102035_/l2/newRelease/tobe.js';

export const L4_REVISION_SCHEMA = '2026-09-20-nr-module-revision-v1' as const;
export type L4HashMap = Record<string, string>;
export type L4SchemaMap = Record<string, string | null>;

export interface L4ReleaseManifest {
  schemaVersion: typeof L4_REVISION_SCHEMA;
  project: number;
  moduleName: string;
  baseId: string;
  createdAt: string;
  files: L4HashMap;
  schemas: L4SchemaMap;
  provenance: { status: 'unverified' | 'verified'; label: string; deploymentId?: string; evidence?: string };
}

export interface L4ReleaseCatalog {
  schemaVersion: typeof L4_REVISION_SCHEMA;
  releases: Array<{ baseId: string; createdAt: string; provenance: L4ReleaseManifest['provenance'] }>;
}

export interface L4ChangeRecord {
  schemaVersion: typeof L4_REVISION_SCHEMA;
  project: number;
  moduleName: string;
  changeId: string;
  baseId: string;
  activeRevisionId: string | null;
  requestRevision: number;
  resultRevisionId: string | null;
  sourcePrompt: string;
  updatedAt: string;
}

export interface L4CandidateManifest {
  schemaVersion: typeof L4_REVISION_SCHEMA;
  project: number;
  moduleName: string;
  changeId: string;
  revisionId: string;
  baseId: string;
  createdAt: string;
  files: L4HashMap;
  changedPaths: string[];
  requestRevision: number;
}

const locks = new Map<string, Promise<void>>();
const CORE_PATHS = [
  'module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts',
  'rules.defs.ts', 'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts',
] as const;

function assertContext(project: number, moduleName: string): void {
  if (!Number.isInteger(project) || project <= 0) throw new Error('A valid project is required.');
  if (!/^[a-z][A-Za-z0-9]{0,59}$/u.test(moduleName)) throw new Error('Invalid module name.');
}

function assertSegment(value: string): void {
  if (!/^[a-zA-Z0-9-]+$/u.test(value)) throw new Error('Invalid revision identifier.');
}

export function resolveL4Folders(project: number, moduleName: string, baseId: string, changeId?: string, revisionId?: string) {
  assertContext(project, moduleName);
  assertSegment(baseId);
  if (changeId) assertSegment(changeId);
  if (revisionId) assertSegment(revisionId);
  const moduleRoot = `l4/${moduleName}`;
  const originalL4Path = `${moduleRoot}/pipeline/releases/${baseId}/l4`;
  const temporaryL4Path = `${moduleRoot}/tobe/plan`;
  if (originalL4Path === temporaryL4Path || originalL4Path.startsWith(`${temporaryL4Path}/`) || temporaryL4Path.startsWith(`${originalL4Path}/`)) {
    throw new Error('Original and temporary folders must be distinct.');
  }
  return {
    originalL4Path,
    temporaryL4Path,
    revisionL4Path: changeId && revisionId ? `${moduleRoot}/pipeline/changes/${changeId}/revisions/${revisionId}/l4` : null,
  };
}

function jsonInfo(project: number, moduleName: string, folder: string, shortName: string): Ns5FileInfo {
  assertContext(project, moduleName);
  return { project, level: 4, folder: `${moduleName}/${folder}`, shortName, extension: '.json' };
}

function releaseInfo(project: number, moduleName: string, baseId: string): Ns5FileInfo {
  assertSegment(baseId);
  return jsonInfo(project, moduleName, `pipeline/releases/${baseId}`, 'manifest');
}

function catalogInfo(project: number, moduleName: string): Ns5FileInfo {
  return jsonInfo(project, moduleName, 'pipeline/releases', 'index');
}

function changeInfo(project: number, moduleName: string, changeId: string): Ns5FileInfo {
  assertSegment(changeId);
  return jsonInfo(project, moduleName, `pipeline/changes/${changeId}`, 'change');
}

function activeInfo(project: number, moduleName: string): Ns5FileInfo {
  return jsonInfo(project, moduleName, 'pipeline/changes', 'active');
}

function revisionInfo(project: number, moduleName: string, changeId: string, revisionId: string): Ns5FileInfo {
  assertSegment(changeId);
  assertSegment(revisionId);
  return jsonInfo(project, moduleName, `pipeline/changes/${changeId}/revisions/${revisionId}`, 'manifest');
}

function artifactInfo(project: number, moduleName: string, path: Ns5TobeArtifactPath, area: 'asis' | 'tobe' | 'release' | 'revision', id?: string, revisionId?: string): Ns5FileInfo {
  const normalized = normalizeTobeArtifactPath(path);
  const origin = tobeArtifactFileInfo(project, moduleName, normalized, 'asis');
  if (area === 'asis') return origin;
  if (area === 'tobe') return tobeArtifactFileInfo(project, moduleName, normalized, 'tobe');
  if (!id) throw new Error('A snapshot identifier is required.');
  assertSegment(id);
  const prefix = area === 'release' ? `${moduleName}/pipeline/releases/${id}/l4` : `${moduleName}/pipeline/changes/${id}/revisions/${revisionId}/l4`;
  if (area === 'revision') {
    if (!revisionId) throw new Error('A revision identifier is required.');
    assertSegment(revisionId);
  }
  return { ...origin, folder: `${prefix}${origin.folder === moduleName ? '' : origin.folder.slice(moduleName.length)}` };
}

export function originalL4FileInfo(project: number, moduleName: string, baseId: string, path: Ns5TobeArtifactPath): Ns5FileInfo {
  resolveL4Folders(project, moduleName, baseId);
  return artifactInfo(project, moduleName, path, 'release', baseId);
}

async function sourceHash(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function mapHash(paths: Ns5TobeArtifactPath[], project: number, moduleName: string, area: 'asis' | 'tobe' | 'release' | 'revision', id?: string, revisionId?: string): Promise<L4HashMap> {
  const hashes: L4HashMap = {};
  for (const path of paths) {
    const info = artifactInfo(project, moduleName, path, area, id, revisionId);
    if (!fileExists(info)) throw new Error(`Missing L4 artifact: ${path}`);
    const source = await readSourceText(info);
    if (!source.trim()) throw new Error(`Unreadable L4 artifact: ${path}`);
    hashes[path] = await sourceHash(source);
  }
  return hashes;
}

async function mapSchemas(paths: Ns5TobeArtifactPath[], project: number, moduleName: string, area: 'asis' | 'release', baseId?: string): Promise<L4SchemaMap> {
  const schemas: L4SchemaMap = {};
  for (const path of paths) {
    const value = await readDefsJson<unknown>(artifactInfo(project, moduleName, path, area, baseId));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Unreadable L4 schema: ${path}`);
    const schema = (value as { schemaVersion?: unknown }).schemaVersion;
    if (typeof schema === 'string' && schema.trim()) schemas[path] = schema;
    else if (schema === undefined && (path === 'workspace-model.defs.ts' || path.startsWith('workspaces/'))) schemas[path] = null;
    else throw new Error(`Unsupported L4 schema: ${path}`);
  }
  return schemas;
}

function sameHashes(left: L4HashMap, right: L4HashMap): boolean {
  const keys = Object.keys(left).sort();
  return keys.length === Object.keys(right).length && keys.every(key => left[key] === right[key]);
}

function sameSchemas(left: L4SchemaMap, right: L4SchemaMap): boolean {
  const keys = Object.keys(left).sort();
  return keys.length === Object.keys(right).length && keys.every(key => left[key] === right[key]);
}

async function inventory(project: number, moduleName: string, area: 'asis' | 'release' = 'asis', baseId?: string): Promise<Ns5TobeArtifactPath[]> {
  assertContext(project, moduleName);
  const module = await readDefsJson<Ns5ModuleArtifact>(artifactInfo(project, moduleName, 'module.defs.ts', area, baseId));
  const journey = await readDefsJson<Ns5JourneyIndexArtifact>(artifactInfo(project, moduleName, 'journeys/index.defs.ts', area, baseId));
  const ontology = await readDefsJson<Ns5OntologyIndexArtifact | Ns5OntologyIndexV3>(artifactInfo(project, moduleName, 'ontology/index.defs.ts', area, baseId));
  if (!module || module.moduleName !== moduleName || !journey || !ontology) throw new Error('Incomplete or mismatched L4 module.');
  if (module.schemaVersion !== '2026-09-10-ns5-module-v2') throw new Error(`Unsupported L4 module schema: ${module.schemaVersion}`);
  const paths = new Set<Ns5TobeArtifactPath>(CORE_PATHS);
  for (const item of journey.journeys) paths.add(normalizeTobeArtifactPath(`journeys/${item.journeyId}.defs.ts`));
  for (const id of ns5OntologyEntityIds(ontology)) paths.add(normalizeTobeArtifactPath(`ontology/${id}.defs.ts`));
  const workspaceModelInfo = artifactInfo(project, moduleName, 'workspace-model.defs.ts', area, baseId);
  if (fileExists(workspaceModelInfo)) {
    const workspaceModel = await readDefsJson<{ menu?: Array<{ workspaceId?: string }> }>(workspaceModelInfo);
    if (!workspaceModel || !Array.isArray(workspaceModel.menu)) throw new Error('Unsupported L4 workspace model.');
    paths.add('workspace-model.defs.ts');
    for (const item of workspaceModel.menu) {
      if (typeof item.workspaceId !== 'string') throw new Error('Unsupported L4 workspace id.');
      paths.add(normalizeTobeArtifactPath(`workspaces/${item.workspaceId}.defs.ts`));
    }
  }
  const root = area === 'asis' ? moduleName : `${moduleName}/pipeline/releases/${baseId}/l4`;
  for (const file of Object.values(mls.stor.files)) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted' || file.extension !== '.defs.ts') continue;
    const folder = String(file.folder || '');
    if (folder !== root && folder !== `${root}/journeys` && folder !== `${root}/ontology` && folder !== `${root}/workspaces`) continue;
    const relative = `${folder === root ? '' : `${folder.slice(root.length + 1)}/`}${file.shortName}${file.extension}`;
    if (!paths.has(normalizeTobeArtifactPath(relative))) throw new Error(`Unindexed L4 source: ${relative}`);
  }
  // A schema's indexes define the complete source set; never enumerate pool/pipeline/tobe.
  const result = [...paths].sort();
  await mapHash(result, project, moduleName, area, baseId);
  return result;
}

export async function withModuleWriter<T>(project: number, moduleName: string, work: () => Promise<T>): Promise<T> {
  assertContext(project, moduleName);
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(`new-release-l4:${project}:${moduleName}`, () => inProcessWriter(project, moduleName, work));
  }
  return inProcessWriter(project, moduleName, work);
}

async function inProcessWriter<T>(project: number, moduleName: string, work: () => Promise<T>): Promise<T> {
  const key = `${project}/${moduleName}`;
  const previous = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>(resolve => { release = resolve; });
  const current = previous.then(() => next);
  locks.set(key, current);
  await previous;
  try { return await work(); }
  finally {
    release();
    if (locks.get(key) === current) locks.delete(key);
  }
}

export async function readActiveL4Change(project: number, moduleName: string): Promise<L4ChangeRecord | null> {
  const pointer = await readJson<{ changeId: string }>(activeInfo(project, moduleName));
  if (!pointer?.changeId) return null;
  const change = await readJson<L4ChangeRecord>(changeInfo(project, moduleName, pointer.changeId));
  if (!change || change.project !== project || change.moduleName !== moduleName || change.changeId !== pointer.changeId) throw new Error('Active L4 change is incomplete.');
  return change;
}

export async function readL4Release(project: number, moduleName: string, baseId: string): Promise<L4ReleaseManifest | null> {
  const catalog = await readJson<L4ReleaseCatalog>(catalogInfo(project, moduleName));
  if (!catalog?.releases.some(entry => entry.baseId === baseId)) return null;
  const manifest = await readJson<L4ReleaseManifest>(releaseInfo(project, moduleName, baseId));
  if (!manifest || manifest.project !== project || manifest.moduleName !== moduleName || manifest.baseId !== baseId) return null;
  try {
    const paths = Object.keys(manifest.files).map(normalizeTobeArtifactPath);
    const indexed = await inventory(project, moduleName, 'release', baseId);
    if (paths.length !== indexed.length || paths.some(path => !indexed.includes(path))) return null;
    const actual = await mapHash(paths, project, moduleName, 'release', baseId);
    const schemas = await mapSchemas(paths, project, moduleName, 'release', baseId);
    return sameHashes(actual, manifest.files) && manifest.schemas && sameSchemas(schemas, manifest.schemas) ? manifest : null;
  } catch {
    return null;
  }
}

export async function prepareL4Change(project: number, moduleName: string, oldManifest?: Ns5TobeManifest | null): Promise<{ release: L4ReleaseManifest; change: L4ChangeRecord; created: boolean }> {
  return withModuleWriter(project, moduleName, async () => {
    const active = await readActiveL4Change(project, moduleName);
    if (active) {
      const release = await readL4Release(project, moduleName, active.baseId);
      if (!release) throw new Error('Captured L4 base is missing or incomplete.');
      for (const rawPath of Object.keys(release.files)) {
        const path = normalizeTobeArtifactPath(rawPath);
        const temporary = artifactInfo(project, moduleName, path, 'tobe');
        if (!fileExists(temporary)) await writeSourceText(temporary, await readSourceText(originalL4FileInfo(project, moduleName, active.baseId, path)));
      }
      return { release, change: active, created: false };
    }
    const paths = await inventory(project, moduleName);
    const originalHashes = await mapHash(paths, project, moduleName, 'asis');
    const originalSchemas = await mapSchemas(paths, project, moduleName, 'asis');
    const planRoot = `${moduleName}/tobe/plan`;
    for (const file of Object.values(mls.stor.files)) {
      if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted' || file.extension !== '.defs.ts') continue;
      const folder = String(file.folder || '');
      if (folder !== planRoot && !folder.startsWith(`${planRoot}/`)) continue;
      const relative = `${folder === planRoot ? '' : `${folder.slice(planRoot.length + 1)}/`}${file.shortName}${file.extension}`;
      if (!paths.includes(normalizeTobeArtifactPath(relative))) throw new Error(`Unsupported prepared artifact: ${relative}`);
    }
    if (!oldManifest) {
      for (const path of paths) {
        const temporary = artifactInfo(project, moduleName, path, 'tobe');
        if (fileExists(temporary) && await sourceHash(await readSourceText(temporary)) !== originalHashes[path]) {
          throw new Error(`Prepared artifact lacks a base manifest: ${path}`);
        }
      }
    }
    if (oldManifest) {
      for (const [path, expected] of Object.entries(oldManifest.base)) {
        const value = await readDefsJson<unknown>(artifactInfo(project, moduleName, normalizeTobeArtifactPath(path), 'asis'));
        if (value === null || !expected || await import('/_102035_/l2/newRelease/tobeDiff.js').then(({ sha256Tobe }) => sha256Tobe(value)) !== expected) {
          throw new Error(`Prepared change has a stale base: ${path}`);
        }
      }
      for (const path of paths) {
        const temporary = artifactInfo(project, moduleName, path, 'tobe');
        if (fileExists(temporary) && !oldManifest.base[path] && await sourceHash(await readSourceText(temporary)) !== originalHashes[path]) {
          throw new Error(`Prepared edit is not tracked by the manifest: ${path}`);
        }
      }
    }
    const identity = await sourceHash(JSON.stringify(originalHashes));
    const baseId = `base-${identity.slice(7, 23)}`;
    const previous = await readL4Release(project, moduleName, baseId);
    const now = new Date().toISOString();
    const release: L4ReleaseManifest = previous ?? {
      schemaVersion: L4_REVISION_SCHEMA, project, moduleName, baseId, createdAt: now,
      files: originalHashes,
      schemas: originalSchemas,
      provenance: { status: 'unverified', label: 'Base captured — publication not verified' },
    };
    if (!previous) {
      for (const path of paths) {
        await writeSourceText(artifactInfo(project, moduleName, path, 'release', baseId), await readSourceText(artifactInfo(project, moduleName, path, 'asis')));
      }
      const captured = await mapHash(paths, project, moduleName, 'release', baseId);
      const stillCurrent = await mapHash(paths, project, moduleName, 'asis');
      const capturedSchemas = await mapSchemas(paths, project, moduleName, 'release', baseId);
      const stillSchemas = await mapSchemas(paths, project, moduleName, 'asis');
      if (!sameHashes(captured, originalHashes) || !sameHashes(stillCurrent, originalHashes)
        || !sameSchemas(capturedSchemas, originalSchemas) || !sameSchemas(stillSchemas, originalSchemas)) throw new Error('L4 base changed during capture.');
      await writeJson(releaseInfo(project, moduleName, baseId), release);
      const catalog = await readJson<L4ReleaseCatalog>(catalogInfo(project, moduleName));
      await writeJson(catalogInfo(project, moduleName), {
        schemaVersion: L4_REVISION_SCHEMA,
        releases: [...(catalog?.releases ?? []).filter(entry => entry.baseId !== baseId), { baseId, createdAt: now, provenance: release.provenance }],
      } satisfies L4ReleaseCatalog);
    }
    for (const path of paths) {
      const temporary = artifactInfo(project, moduleName, path, 'tobe');
      if (!fileExists(temporary)) await writeSourceText(temporary, await readSourceText(artifactInfo(project, moduleName, path, 'release', baseId)));
    }
    const changeId = `change-${Date.now()}-${crypto.randomUUID()}`;
    const module = await readDefsJson<Ns5ModuleArtifact>(artifactInfo(project, moduleName, 'module.defs.ts', 'asis'));
    const change: L4ChangeRecord = {
      schemaVersion: L4_REVISION_SCHEMA, project, moduleName, changeId, baseId,
      activeRevisionId: null, requestRevision: 0, resultRevisionId: null,
      sourcePrompt: module?.sourcePrompt ?? '', updatedAt: now,
    };
    await writeJson(changeInfo(project, moduleName, changeId), change);
    await writeJson(activeInfo(project, moduleName), { changeId });
    return { release, change, created: true };
  });
}

export async function sealL4Revision(project: number, moduleName: string, expectedRevisionId: string | null, request?: string): Promise<L4CandidateManifest> {
  return withModuleWriter(project, moduleName, () => sealL4RevisionInsideWriter(project, moduleName, expectedRevisionId, request));
}

export async function editL4Candidate<T>(project: number, moduleName: string, expectedRevisionId: string | null, expectedChangeId: string, edit: (change: L4ChangeRecord) => Promise<T>): Promise<{ value: T; revision: L4CandidateManifest }> {
  return withModuleWriter(project, moduleName, async () => {
    const current = await readActiveL4Change(project, moduleName);
    if (!current || current.changeId !== expectedChangeId || current.activeRevisionId !== expectedRevisionId) throw new Error('L4 revision conflict: reload before saving.');
    const value = await edit(current);
    const revision = await sealL4RevisionInsideWriter(project, moduleName, expectedRevisionId);
    return { value, revision };
  });
}

export async function revertL4CandidatePath(project: number, moduleName: string, path: Ns5TobeArtifactPath, expectedRevisionId: string | null, afterRestore?: () => Promise<void>): Promise<L4CandidateManifest> {
  const change = await readActiveL4Change(project, moduleName);
  if (!change) throw new Error('No active L4 change.');
  const result = await editL4Candidate(project, moduleName, expectedRevisionId, change.changeId, async current => {
    await writeSourceText(artifactInfo(project, moduleName, path, 'tobe'), await readSourceText(originalL4FileInfo(project, moduleName, current.baseId, path)));
    await afterRestore?.();
  });
  return result.revision;
}

export async function deactivateL4Change(project: number, moduleName: string, before?: () => Promise<void>): Promise<void> {
  await withModuleWriter(project, moduleName, async () => {
    await before?.();
    await writeJson(activeInfo(project, moduleName), { changeId: '' });
  });
}

/** A planner may publish a result only for the still-active, intact candidate revision. */
export async function markL4Result(project: number, moduleName: string, expectedRevisionId: string): Promise<L4ChangeRecord> {
  return withModuleWriter(project, moduleName, async () => {
    const change = await readActiveL4Change(project, moduleName);
    if (!change || change.activeRevisionId !== expectedRevisionId) throw new Error('L4 revision conflict: result is stale.');
    if (!await readL4Revision(project, moduleName, change.changeId, expectedRevisionId)) throw new Error('Candidate snapshot is incomplete.');
    const updated = { ...change, resultRevisionId: expectedRevisionId, updatedAt: new Date().toISOString() } satisfies L4ChangeRecord;
    await writeJson(changeInfo(project, moduleName, change.changeId), updated);
    return updated;
  });
}

async function sealL4RevisionInsideWriter(project: number, moduleName: string, expectedRevisionId: string | null, request?: string): Promise<L4CandidateManifest> {
    const change = await readActiveL4Change(project, moduleName);
    if (!change) throw new Error('No active L4 change.');
    if (change.activeRevisionId !== expectedRevisionId) throw new Error('L4 revision conflict: reload before saving.');
    const release = await readL4Release(project, moduleName, change.baseId);
    if (!release) throw new Error('Captured L4 base is incomplete.');
    const paths = Object.keys(release.files).map(normalizeTobeArtifactPath);
    const current = await mapHash(paths, project, moduleName, 'tobe');
    const changedPaths = paths.filter(path => current[path] !== release.files[path]);
    const hash = await sourceHash(JSON.stringify(current));
    const revisionId = `rev-${Date.now()}-${hash.slice(7, 19)}-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    for (const path of paths) {
      await writeSourceText(artifactInfo(project, moduleName, path, 'revision', change.changeId, revisionId), await readSourceText(artifactInfo(project, moduleName, path, 'tobe')));
    }
    if (!sameHashes(await mapHash(paths, project, moduleName, 'revision', change.changeId, revisionId), current)) throw new Error('Candidate snapshot is incomplete.');
    const manifest: L4CandidateManifest = {
      schemaVersion: L4_REVISION_SCHEMA, project, moduleName, changeId: change.changeId, revisionId,
      baseId: change.baseId, createdAt: now, files: current, changedPaths,
      requestRevision: change.requestRevision + (request === undefined ? 0 : 1),
    };
    await writeJson(revisionInfo(project, moduleName, change.changeId, revisionId), manifest);
    if (request !== undefined) {
      if (typeof request !== 'string') throw new Error('Change request must be text.');
      await writeJson(jsonInfo(project, moduleName, `pipeline/changes/${change.changeId}/requests`, `request-${manifest.requestRevision}`), {
        schemaVersion: L4_REVISION_SCHEMA, revision: manifest.requestRevision, request, createdAt: now,
      });
    }
    await writeJson(changeInfo(project, moduleName, change.changeId), {
      ...change, activeRevisionId: revisionId, requestRevision: manifest.requestRevision,
      resultRevisionId: null, updatedAt: now,
    } satisfies L4ChangeRecord);
    return manifest;
}

export async function readL4Revision(project: number, moduleName: string, changeId: string, revisionId: string): Promise<L4CandidateManifest | null> {
  const manifest = await readJson<L4CandidateManifest>(revisionInfo(project, moduleName, changeId, revisionId));
  if (!manifest || manifest.project !== project || manifest.moduleName !== moduleName || manifest.changeId !== changeId || manifest.revisionId !== revisionId) return null;
  try {
    const paths = Object.keys(manifest.files).map(normalizeTobeArtifactPath);
    const base = await readL4Release(project, moduleName, manifest.baseId);
    if (!base || paths.length !== Object.keys(base.files).length || paths.some(path => !(path in base.files))) return null;
    return sameHashes(await mapHash(paths, project, moduleName, 'revision', changeId, revisionId), manifest.files) ? manifest : null;
  } catch {
    return null;
  }
}
