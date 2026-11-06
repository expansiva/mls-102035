/// <mls fileReference="_102035_/l2/solution/candidate/moduleLayers.ts" enhancement="_blank" />

import { fileExists, readJson, readSourceText, writeJson, writeSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { originalL4FileInfo, readL4Release, resolveL4Folders, withModuleWriter } from '/_102035_/l2/solution/candidate/moduleRevision.js';

export const MODULE_LAYERS_SCHEMA = '2026-10-08-module-layers-v1' as const;
export const MODULE_APPLICATION_SCHEMA = '2026-11-06-module-application-v3' as const;
const LEGACY_APPLICATION_SCHEMA = '2026-11-04-module-application-v2' as const;
const PART_LIMIT = 1_400_000;

interface SealPart { name: string; sha256: string; }
interface StoredPart { index: number; content: string; }

async function digest(content: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return `sha256:${[...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function encodedSize(value: unknown): number {
  return new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`).length;
}

async function writeParts(info: Ns5FileInfo, prefix: string, serialized: string): Promise<{ parts: SealPart[]; sha256: string }> {
  const hash = await digest(serialized);
  const parts: SealPart[] = [];
  for (let offset = 0; offset < serialized.length; ) {
    const index = parts.length;
    let low = 1;
    let high = serialized.length - offset;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (encodedSize({ index, content: serialized.slice(offset, offset + mid) }) <= PART_LIMIT) low = mid;
      else high = mid - 1;
    }
    let length = low;
    if (offset + length < serialized.length && /[\uD800-\uDBFF]/u.test(serialized[offset + length - 1])) length--;
    if (length < 1 || encodedSize({ index, content: serialized.slice(offset, offset + length) }) > PART_LIMIT) {
      throw new Error('module-seal.part_too_large');
    }
    const content = serialized.slice(offset, offset + length);
    const name = `${prefix}-${hash.slice(7, 23)}-${String(index).padStart(4, '0')}`;
    await writeJson({ ...info, shortName: name }, { index, content } satisfies StoredPart);
    parts.push({ name, sha256: await digest(content) });
    offset += length;
  }
  return { parts, sha256: hash };
}

async function readParts(info: Ns5FileInfo, parts: SealPart[], sha256: string): Promise<string> {
  if (!parts.length || !/^sha256:[a-f0-9]{64}$/u.test(sha256)) throw new Error('module-seal.missing_part');
  const chunks: string[] = [];
  for (const [index, part] of parts.entries()) {
    if (!part || !/^(undo|layers)-[a-f0-9]{16}-\d{4}$/u.test(part.name)) throw new Error('module-seal.missing_part');
    const stored = await readJson<StoredPart>({ ...info, shortName: part.name });
    if (!stored || stored.index !== index || typeof stored.content !== 'string'
      || await digest(stored.content) !== part.sha256) throw new Error('module-seal.missing_part');
    chunks.push(stored.content);
  }
  const serialized = chunks.join('');
  if (await digest(serialized) !== sha256) throw new Error('module-seal.missing_part');
  return serialized;
}

async function removeUnusedParts(info: Ns5FileInfo, prefix: string, keep: readonly SealPart[]): Promise<void> {
  const selected = new Set(keep.map(part => part.name));
  const { deleteFile } = await import('/_102027_/l2/libStor.js');
  for (const file of Object.values(mls.stor.files)) {
    if (!file || file.project !== info.project || file.level !== info.level || file.folder !== info.folder
      || file.extension !== '.json' || !file.shortName.startsWith(`${prefix}-`) || selected.has(file.shortName)
      || file.status === 'deleted') continue;
    await deleteFile(file);
  }
}

interface ApplicationFile { level: 1 | 2 | 4; path: string; content: string; }
interface L5ModuleEntry { document: 'config' | 'project' | 'runtime.project'; existed: boolean; entry: unknown; source: string | null; }
export interface ModuleApplicationSeal {
  schemaVersion: typeof MODULE_APPLICATION_SCHEMA | typeof LEGACY_APPLICATION_SCHEMA;
  project: number;
  moduleName: string;
  changeId: string;
  revisionId: string;
  files: ApplicationFile[];
  l5: L5ModuleEntry[];
  /** New checkpoints store their payload in bounded parts. */
  parts?: SealPart[];
  sha256?: string;
  stage?: 'provisional' | 'compacted';
  added?: Array<Pick<ApplicationFile, 'level' | 'path'>>;
  cancelRequested?: boolean;
}

function applicationInfo(project: number, moduleName: string): Ns5FileInfo {
  return { project, level: 4, folder: `${moduleName}/pipeline/application`, shortName: 'undo', extension: '.json' };
}

function moduleFileInfo(project: number, moduleName: string, file: Pick<ApplicationFile, 'level' | 'path'>): Ns5FileInfo {
  if (![1, 2, 4].includes(file.level) || !file.path || file.path.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('module-application.invalid_seal');
  }
  const fullPath = file.path;
  const slash = fullPath.lastIndexOf('/');
  const name = fullPath.slice(slash + 1);
  const dot = name.indexOf('.');
  if (dot <= 0) throw new Error('module-application.invalid_seal');
  const old = file.level === 1 && fullPath.startsWith('_old/');
  const root = old ? `${moduleName}_old` : moduleName;
  const folderPath = old ? fullPath.slice(5) : fullPath;
  const folderSlash = folderPath.lastIndexOf('/');
  return { project, level: file.level, folder: `${root}${folderSlash < 0 ? '' : '/' + folderPath.slice(0, folderSlash)}`,
    shortName: name.slice(0, dot), extension: name.slice(dot) };
}

function l5Entry(document: L5ModuleEntry['document'], source: string, project: number, moduleName: string): unknown {
  const parsed = JSON.parse(source) as Record<string, unknown>;
  const modules = document === 'config'
    ? ((parsed.projects as Record<string, { modules?: unknown[] }> | undefined)?.[String(project)]?.modules)
    : parsed.modules;
  if (modules === undefined) return null;
  if (!Array.isArray(modules)) throw new Error('module-application.invalid_l5');
  return modules.find(value => value && typeof value === 'object'
    && (value as Record<string, unknown>)[document === 'config' ? 'moduleId' : 'moduleName'] === moduleName) ?? null;
}

async function applicationL5(project: number, moduleName: string): Promise<L5ModuleEntry[]> {
  const result: L5ModuleEntry[] = [];
  for (const document of ['config', 'project', 'runtime.project'] as const) {
    const info = { project, level: 5, folder: '', shortName: document, extension: '.json' };
    const existed = fileExists(info);
    const source = existed ? await readSourceText(info) : null;
    result.push({ document, existed, entry: source === null ? null : l5Entry(document, source, project, moduleName), source });
  }
  return result;
}

export async function sealModuleApplication(project: number, moduleName: string, changeId: string, revisionId: string): Promise<ModuleApplicationSeal> {
  resolveL4Folders(project, moduleName, 'application', changeId, revisionId);
  return withModuleWriter(project, moduleName, async () => {
    const info = applicationInfo(project, moduleName);
    const existing = await readJson<ModuleApplicationSeal>(info);
    if (existing && existing.changeId === changeId && existing.revisionId === revisionId) return readApplicationSeal(project, moduleName);
    const files = await applicationFiles(project, moduleName);
    const l5 = await applicationL5(project, moduleName);
    const { parts, sha256 } = await writeParts(info, 'undo', JSON.stringify({ files, l5 }));
    const seal: ModuleApplicationSeal = { schemaVersion: MODULE_APPLICATION_SCHEMA, project, moduleName, changeId, revisionId,
      files: [], l5: [], parts, sha256, stage: 'provisional' };
    await writeJson(info, seal);
    await removeUnusedParts(info, 'undo', parts);
    return { ...seal, files, l5 };
  });
}

async function readApplicationSeal(project: number, moduleName: string): Promise<ModuleApplicationSeal> {
  const info = applicationInfo(project, moduleName);
  const index = await readJson<ModuleApplicationSeal>(info);
  if (!index) throw new Error('module-application.invalid_seal');
  if (index.schemaVersion === LEGACY_APPLICATION_SCHEMA) return index;
  if (index.schemaVersion !== MODULE_APPLICATION_SCHEMA || !Array.isArray(index.parts) || !index.sha256
    || (index.stage !== 'provisional' && index.stage !== 'compacted')) throw new Error('module-application.invalid_seal');
  const payload = JSON.parse(await readParts(info, index.parts, index.sha256)) as Pick<ModuleApplicationSeal, 'files' | 'l5' | 'added'>;
  if (!Array.isArray(payload.files) || !Array.isArray(payload.l5)
    || (index.stage === 'compacted' && !Array.isArray(payload.added))) throw new Error('module-application.invalid_seal');
  return { ...index, files: payload.files, l5: payload.l5, added: payload.added };
}

/** Reduce a completed application to the files it actually touched. Failed or retryable runs retain their provisional checkpoint. */
export async function compactModuleApplication(project: number, moduleName: string, changeId: string, revisionId: string): Promise<void> {
  await withModuleWriter(project, moduleName, async () => {
    const info = applicationInfo(project, moduleName);
    const seal = await readApplicationSeal(project, moduleName);
    if (seal.changeId !== changeId || seal.revisionId !== revisionId) throw new Error('module-application.invalid_seal');
    if (seal.schemaVersion === LEGACY_APPLICATION_SCHEMA || seal.stage === 'compacted') return;
    const current = new Map((await applicationFiles(project, moduleName)).map(file => [`${file.level}:${file.path}`, file]));
    const previous = new Map(seal.files.map(file => [`${file.level}:${file.path}`, file]));
    const changed = seal.files.filter(file => current.get(`${file.level}:${file.path}`)?.content !== file.content);
    const added = [...current.values()].filter(file => !previous.has(`${file.level}:${file.path}`))
      .map(({ level, path }) => ({ level, path }));
    const { parts, sha256 } = await writeParts(info, 'undo', JSON.stringify({ files: changed, added, l5: seal.l5 }));
    await writeJson(info, { ...seal, files: [], l5: [], added: undefined, parts, sha256, stage: 'compacted' } satisfies ModuleApplicationSeal);
    await removeUnusedParts(info, 'undo', parts);
  });
}

export async function restoreModuleApplication(project: number, moduleName: string, changeId: string, revisionId: string): Promise<void> {
  resolveL4Folders(project, moduleName, 'application', changeId, revisionId);
  await withModuleWriter(project, moduleName, async () => {
    const seal = await readApplicationSeal(project, moduleName);
    if (seal.project !== project || seal.moduleName !== moduleName
      || seal.changeId !== changeId || seal.revisionId !== revisionId || !Array.isArray(seal.files) || !Array.isArray(seal.l5)) {
      throw new Error('module-application.invalid_seal');
    }
    const previous = new Map(seal.files.map(file => [`${file.level}:${file.path}`, file]));
    if (previous.size !== seal.files.length) throw new Error('module-application.invalid_seal');
    for (const file of seal.files) moduleFileInfo(project, moduleName, file);
    const current = seal.schemaVersion === LEGACY_APPLICATION_SCHEMA
      ? await legacyApplicationFiles(project, moduleName) : await applicationFiles(project, moduleName);
    const { deleteFile } = await import('/_102027_/l2/libStor.js');
    const remove = seal.stage === 'compacted' ? seal.added ?? []
      : current.filter(file => !previous.has(`${file.level}:${file.path}`));
    for (const file of remove) {
      const indexed = mls.stor.files[mls.stor.getKeyToFile(moduleFileInfo(project, moduleName, file))];
      if (indexed) await deleteFile(indexed);
    }
    for (const file of seal.files) await writeSourceText(moduleFileInfo(project, moduleName, file), file.content);
    for (const saved of seal.l5) {
      if (!['config', 'project', 'runtime.project'].includes(saved.document)) throw new Error('module-application.invalid_seal');
      if (saved.existed !== (typeof saved.source === 'string')) throw new Error('module-application.invalid_seal');
      const info = { project, level: 5, folder: '', shortName: saved.document, extension: '.json' };
      if (!fileExists(info)) {
        if (saved.existed) throw new Error('module-application.missing_l5');
        continue;
      }
      const currentSource = await readSourceText(info);
      const parsed = JSON.parse(currentSource) as Record<string, unknown>;
      const modules = saved.document === 'config'
        ? ((parsed.projects as Record<string, { modules?: unknown[] }> | undefined)?.[String(project)]?.modules)
        : parsed.modules;
      if (modules === undefined) {
        if (saved.entry === null) continue;
        throw new Error('module-application.invalid_l5');
      }
      if (!Array.isArray(modules)) throw new Error('module-application.invalid_l5');
      const field = saved.document === 'config' ? 'moduleId' : 'moduleName';
      const index = modules.findIndex(value => value && typeof value === 'object' && (value as Record<string, unknown>)[field] === moduleName);
      const untouched = saved.source !== null && sameOtherL5Content(saved.document, currentSource, saved.source, project, moduleName);
      const indexed = mls.stor.files[mls.stor.getKeyToFile(info)];
      if (!indexed) throw new Error('module-application.missing_l5');
      if (untouched) {
        if (currentSource !== saved.source) await mls.stor.localStor.setContent(indexed, { contentType: 'string', content: saved.source! });
        continue;
      }
      if (saved.entry === null) { if (index >= 0) modules.splice(index, 1); }
      else if (index >= 0) modules[index] = saved.entry;
      else modules.push(saved.entry);
      if (!saved.existed && modules.length === 0 && onlyModuleList(parsed, saved.document, project)) {
        await deleteFile(indexed);
        continue;
      }
      await mls.stor.localStor.setContent(indexed, { contentType: 'string', content: `${JSON.stringify(parsed, null, 2)}\n` });
    }
    if (seal.schemaVersion === MODULE_APPLICATION_SCHEMA) {
      // The revision history is preserved, but its live implementation reservation must be released for a retry.
      const changeFolder = `${moduleName}/pipeline/changes/${changeId}`;
      const implementation = { project, level: 4, folder: changeFolder, shortName: 'implementation', extension: '.json' };
      const indexed = mls.stor.files[mls.stor.getKeyToFile(implementation)];
      if (indexed) await deleteFile(indexed);
      const changeInfo = { project, level: 4, folder: changeFolder, shortName: 'change', extension: '.json' };
      const change = await readJson<Record<string, unknown>>(changeInfo);
      if (change?.promotedRevisionId === revisionId) {
        const { promotedRevisionId: _revision, promotedAt: _at, ...unpromoted } = change;
        await writeJson(changeInfo, unpromoted);
      }
    }
    const checkpoint = mls.stor.files[mls.stor.getKeyToFile(applicationInfo(project, moduleName))];
    for (const part of seal.parts ?? []) {
      const indexed = mls.stor.files[mls.stor.getKeyToFile({ ...applicationInfo(project, moduleName), shortName: part.name })];
      if (indexed) await deleteFile(indexed);
    }
    if (checkpoint) await deleteFile(checkpoint);
  });
}

function sameOtherL5Content(document: L5ModuleEntry['document'], current: string, saved: string, project: number, moduleName: string): boolean {
  const withoutModule = (source: string): string => {
    const value = JSON.parse(source) as Record<string, unknown>;
    const modules = document === 'config'
      ? ((value.projects as Record<string, { modules?: unknown[] }> | undefined)?.[String(project)]?.modules)
      : value.modules;
    if (Array.isArray(modules)) {
      const field = document === 'config' ? 'moduleId' : 'moduleName';
      const index = modules.findIndex(item => item && typeof item === 'object' && (item as Record<string, unknown>)[field] === moduleName);
      if (index >= 0) modules.splice(index, 1);
    }
    return JSON.stringify(value);
  };
  return withoutModule(current) === withoutModule(saved);
}

function onlyModuleList(value: Record<string, unknown>, document: L5ModuleEntry['document'], project: number): boolean {
  if (document !== 'config') return Object.keys(value).every(key => key === 'modules');
  if (Object.keys(value).some(key => key !== 'projects')) return false;
  const projects = value.projects as Record<string, Record<string, unknown>> | undefined;
  return !!projects && Object.keys(projects).every(key => key === String(project))
    && Object.keys(projects[String(project)] ?? {}).every(key => key === 'modules');
}

async function legacyApplicationFiles(project: number, moduleName: string, includeHistory = true): Promise<ApplicationFile[]> {
  const result: ApplicationFile[] = [];
  for (const file of Object.values(mls.stor.files)) {
    if (!file || file.project !== project || file.status === 'deleted') continue;
    const level = Number(file.level);
    if (level !== 1 && level !== 2 && level !== 4) continue;
    const root = level === 1 && (file.folder === `${moduleName}_old` || file.folder.startsWith(`${moduleName}_old/`))
      ? `${moduleName}_old` : moduleName;
    if (file.folder !== root && !file.folder.startsWith(`${root}/`)) continue;
    const path = `${root === moduleName ? '' : '_old/'}${file.folder === root ? '' : file.folder.slice(root.length + 1) + '/'}${file.shortName}${file.extension}`;
    if (level === 4 && path.startsWith('pipeline/application/')) continue;
    if (!includeHistory && level === 4
      && ['pipeline/changes/', 'pipeline/releases/'].some(prefix => path.startsWith(prefix))) continue;
    result.push({ level, path, content: await readSourceText(file) });
  }
  return result.sort((a, b) => a.level - b.level || a.path.localeCompare(b.path, 'en'));
}

async function applicationFiles(project: number, moduleName: string): Promise<ApplicationFile[]> {
  return legacyApplicationFiles(project, moduleName, false);
}

export interface ModuleLayerFile {
  level: 1 | 2;
  /** Relative to the module folder at this level. */
  path: string;
  sha256: string;
  content: string;
}

export interface ModuleLayersSeal {
  schemaVersion: typeof MODULE_LAYERS_SCHEMA;
  project: number;
  moduleName: string;
  baseId: string;
  createdAt: string;
  files: ModuleLayerFile[];
}

export interface ModuleLayerDiff {
  level: 1 | 2;
  path: string;
  status: 'changed' | 'added' | 'removed';
  sealedSha256?: string;
  currentSha256?: string;
}

export async function diffModuleLayers(project: number, moduleName: string, baseId: string): Promise<ModuleLayerDiff[]> {
  resolveL4Folders(project, moduleName, baseId);
  const seal = await readJson<ModuleLayersSeal>({ project, level: 4,
    folder: `${moduleName}/pipeline/releases/${baseId}`, shortName: 'layers', extension: '.json' });
  if (!seal || seal.schemaVersion !== MODULE_LAYERS_SCHEMA || seal.project !== project
    || seal.moduleName !== moduleName || seal.baseId !== baseId || !Array.isArray(seal.files)) {
    throw new Error('module-layers.invalid_seal');
  }
  const key = (file: ModuleLayerFile) => `${file.level}:${file.path}`;
  const current = new Map((await enumerateModuleLayers(project, moduleName)).map(file => [key(file), file]));
  const diff: ModuleLayerDiff[] = [];
  for (const sealed of seal.files) {
    const file = current.get(key(sealed));
    if (!file) {
      diff.push({ level: sealed.level, path: sealed.path, status: 'removed', sealedSha256: sealed.sha256 });
    } else if (file.sha256 !== sealed.sha256) {
      diff.push({ level: sealed.level, path: sealed.path, status: 'changed',
        sealedSha256: sealed.sha256, currentSha256: file.sha256 });
    }
    current.delete(key(sealed));
  }
  for (const file of current.values()) {
    diff.push({ level: file.level, path: file.path, status: 'added', currentSha256: file.sha256 });
  }
  return diff.sort((a, b) => a.level - b.level || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export async function enumerateModuleLayers(project: number, moduleName: string): Promise<ModuleLayerFile[]> {
  resolveL4Folders(project, moduleName, 'inventory');
  const files: ModuleLayerFile[] = [];
  for (const file of Object.values(mls.stor.files)) {
    if (!file || file.project !== project || file.status === 'deleted') continue;
    const level = Number(file.level);
    if (level !== 1 && level !== 2) continue;
    if (file.folder !== moduleName && !file.folder.startsWith(`${moduleName}/`)) continue;
    const path = `${file.folder === moduleName ? '' : file.folder.slice(moduleName.length + 1) + '/'}${file.shortName}${file.extension}`;
    if (level === 1 && path.startsWith('materialization/')) continue;
    if (path.endsWith('.ts') && !path.endsWith('.defs.ts')) continue;
    const receipt = path.startsWith(`pipeline/agentDefsL${level}/`);
    const def = path.endsWith('.defs.ts') && (level === 1 || path.startsWith('web/'));
    if (!receipt && !def) continue;
    const content = await readSourceText(file);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
    const sha256 = `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
    files.push({ level, path, sha256, content });
  }
  return files.sort((a, b) => a.level - b.level || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export async function sealModuleLayers(project: number, moduleName: string, baseId: string): Promise<ModuleLayersSeal> {
  resolveL4Folders(project, moduleName, baseId);
  return withModuleWriter(project, moduleName, async () => {
    const info = { project, level: 4, folder: `${moduleName}/pipeline/releases/${baseId}`, shortName: 'layers', extension: '.json' };
    const files = await enumerateModuleLayers(project, moduleName);
    if (fileExists(info)) {
      const existing = await readJson<ModuleLayersSeal>(info);
      if (!existing || existing.schemaVersion !== MODULE_LAYERS_SCHEMA || existing.project !== project
        || existing.moduleName !== moduleName || existing.baseId !== baseId || !Array.isArray(existing.files)
        || existing.files.length !== files.length || existing.files.some((file, index) =>
          file.level !== files[index].level || file.path !== files[index].path || file.sha256 !== files[index].sha256)) {
        throw new Error('module-layers.seal_conflict');
      }
      return existing;
    }
    const seal: ModuleLayersSeal = { schemaVersion: MODULE_LAYERS_SCHEMA, project, moduleName, baseId, createdAt: new Date().toISOString(), files };
    await writeJson(info, seal);
    return seal;
  });
}

export async function restoreModuleFromSeals(project: number, moduleName: string, baseId: string): Promise<void> {
  const { originalL4Path } = resolveL4Folders(project, moduleName, baseId);
  await withModuleWriter(project, moduleName, async () => {
    const release = await readL4Release(project, moduleName, baseId);
    if (!release) throw new Error('module-restoration.invalid_release');
    const diff = await diffModuleLayers(project, moduleName, baseId);
    const seal = (await readJson<ModuleLayersSeal>({ project, level: 4,
      folder: `${moduleName}/pipeline/releases/${baseId}`, shortName: 'layers', extension: '.json' }))!;
    const hash = async (content: string) => {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
      return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
    };
    const layerInfo = (file: Pick<ModuleLayerFile, 'level' | 'path'>) => {
      const path = file.path;
      if ((file.level !== 1 && file.level !== 2) || path.split('/').some(part => !part || part === '.' || part === '..')
        || (file.level === 1 && path.startsWith('materialization/'))
        || (path.endsWith('.ts') && !path.endsWith('.defs.ts'))
        || !(path.startsWith(`pipeline/agentDefsL${file.level}/`)
          || (path.endsWith('.defs.ts') && (file.level === 1 || path.startsWith('web/'))))) {
        throw new Error('module-layers.invalid_seal');
      }
      const slash = path.lastIndexOf('/');
      const name = path.slice(slash + 1);
      const dot = name.indexOf('.');
      return { project, level: file.level, folder: moduleName + (slash < 0 ? '' : '/' + path.slice(0, slash)),
        shortName: dot < 0 ? name : name.slice(0, dot), extension: dot < 0 ? '' : name.slice(dot) };
    };
    const layers = await Promise.all(seal.files.map(async file => {
      const info = layerInfo(file);
      if (await hash(file.content) !== file.sha256) throw new Error('module-layers.invalid_seal');
      return { info, ...file };
    }));
    const l4 = await Promise.all(Object.entries(release.files).map(async ([path, sha256]) => {
      const source = originalL4FileInfo(project, moduleName, baseId, path as Parameters<typeof originalL4FileInfo>[3]);
      return { info: { ...source, folder: moduleName + source.folder.slice(originalL4Path.slice(3).length) },
        content: await readSourceText(source), sha256 };
    }));
    for (const file of [...l4, ...layers]) await writeSourceText(file.info, file.content);
    const { deleteFile } = await import('/_102027_/l2/libStor.js');
    for (const file of diff.filter(file => file.status === 'added')) {
      const indexed = mls.stor.files[mls.stor.getKeyToFile(layerInfo(file))];
      if (indexed) await deleteFile(indexed);
    }
    if ((await diffModuleLayers(project, moduleName, baseId)).length) throw new Error('module-restoration.layers_mismatch');
    for (const file of l4) {
      if (await hash(await readSourceText(file.info)) !== file.sha256) throw new Error('module-restoration.l4_mismatch');
    }
  });
}
