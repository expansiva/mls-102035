/// <mls fileReference="_102035_/l2/solution/candidate/moduleLayers.ts" enhancement="_blank" />

import { fileExists, readJson, readSourceText, writeJson, writeSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { originalL4FileInfo, readL4Release, resolveL4Folders, withModuleWriter } from '/_102035_/l2/solution/candidate/moduleRevision.js';

export const MODULE_LAYERS_SCHEMA = '2026-10-08-module-layers-v1' as const;
export const MODULE_APPLICATION_SCHEMA = '2026-11-04-module-application-v2' as const;

interface ApplicationFile { level: 1 | 2 | 4; path: string; content: string; }
interface L5ModuleEntry { document: 'config' | 'project' | 'runtime.project'; existed: boolean; entry: unknown; source: string | null; }
export interface ModuleApplicationSeal {
  schemaVersion: typeof MODULE_APPLICATION_SCHEMA;
  project: number;
  moduleName: string;
  changeId: string;
  revisionId: string;
  files: ApplicationFile[];
  l5: L5ModuleEntry[];
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
    if (existing && existing.changeId === changeId && existing.revisionId === revisionId) return existing;
    const seal: ModuleApplicationSeal = { schemaVersion: MODULE_APPLICATION_SCHEMA, project, moduleName, changeId, revisionId,
      files: await applicationFiles(project, moduleName), l5: await applicationL5(project, moduleName) };
    await writeJson(info, seal);
    return seal;
  });
}

export async function restoreModuleApplication(project: number, moduleName: string, changeId: string, revisionId: string): Promise<void> {
  resolveL4Folders(project, moduleName, 'application', changeId, revisionId);
  await withModuleWriter(project, moduleName, async () => {
    const seal = await readJson<ModuleApplicationSeal>(applicationInfo(project, moduleName));
    if (!seal || seal.schemaVersion !== MODULE_APPLICATION_SCHEMA || seal.project !== project || seal.moduleName !== moduleName
      || seal.changeId !== changeId || seal.revisionId !== revisionId || !Array.isArray(seal.files) || !Array.isArray(seal.l5)) {
      throw new Error('module-application.invalid_seal');
    }
    const previous = new Map(seal.files.map(file => [`${file.level}:${file.path}`, file]));
    if (previous.size !== seal.files.length) throw new Error('module-application.invalid_seal');
    for (const file of seal.files) moduleFileInfo(project, moduleName, file);
    const current = await applicationFiles(project, moduleName);
    const { deleteFile } = await import('/_102027_/l2/libStor.js');
    for (const file of current) {
      if (previous.has(`${file.level}:${file.path}`)) continue;
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
    const checkpoint = mls.stor.files[mls.stor.getKeyToFile(applicationInfo(project, moduleName))];
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

async function applicationFiles(project: number, moduleName: string): Promise<ApplicationFile[]> {
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
    result.push({ level, path, content: await readSourceText(file) });
  }
  return result.sort((a, b) => a.level - b.level || a.path.localeCompare(b.path, 'en'));
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
