/// <mls fileReference="_102035_/l2/solution/candidate/moduleLayers.ts" enhancement="_blank" />

import { fileExists, readJson, readSourceText, writeJson } from '/_102035_/l2/solution/fs.js';
import { resolveL4Folders, withModuleWriter } from '/_102035_/l2/solution/candidate/moduleRevision.js';

export const MODULE_LAYERS_SCHEMA = '2026-10-08-module-layers-v1' as const;

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
