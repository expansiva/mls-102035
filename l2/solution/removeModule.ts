/// <mls fileReference="_102035_/l2/solution/removeModule.ts" enhancement="_blank"/>

import { ns4Level1Subtypes } from '/_102035_/l2/agentNewSolution/helpers/level1Catalog.js';
import {
  readNs4L5Config,
  readNs4L5Project,
  writeNs4L5Config,
  writeNs4L5Project,
  writeNs4SolutionRegistry,
} from '/_102035_/l2/agentNewSolution/helpers/ns4Fs.js';
import type { Ns4SolutionRegistryArtifact } from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';
import { validateNs4SolutionRegistry } from '/_102035_/l2/agentNewSolution/helpers/registryGate.js';
import {
  collectExactModuleFiles,
  collectTobeIntegrationFilesCiting,
  displayPath,
  isProtectedModuleFile,
  normalizeModuleName,
  readSolutionRegistry,
  registryFile,
} from '/_102035_/l2/solution/fs.js';

export interface RemoveModuleResult {
  deleted: string[];
  edited: string[];
  skipped: string[];
}

export interface RemoveModuleOpts {
  dryRun?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function moduleEntryName(item: unknown): string {
  if (typeof item === 'string') return item.trim();
  if (!isRecord(item)) return '';
  for (const field of ['moduleName', 'moduleId', 'name'] as const) {
    const value = item[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function sameModule(name: string, moduleName: string): boolean {
  return !!name && normalizeModuleName(name) === normalizeModuleName(moduleName);
}

function routeKeyBelongsTo(key: string, moduleName: string): boolean {
  const normalized = normalizeModuleName(moduleName);
  return key === normalized || key.startsWith(`${normalized}.`);
}

function pathCitesModule(path: string, moduleName: string): boolean {
  const prefix = `/${normalizeModuleName(moduleName)}`;
  return path === prefix || path.startsWith(`${prefix}/`);
}

function entryCitesModulePath(item: unknown, moduleName: string): boolean {
  if (typeof item === 'string') return pathCitesModule(item, moduleName) || routeKeyBelongsTo(item, moduleName);
  if (!isRecord(item)) return false;
  if (sameModule(moduleEntryName(item), moduleName)) return true;
  for (const field of ['href', 'basePath'] as const) {
    const value = item[field];
    if (typeof value === 'string' && pathCitesModule(value, moduleName)) return true;
  }
  return false;
}

function stripNode(value: unknown, moduleName: string, key: string): { value: unknown; changed: boolean } {
  if (Array.isArray(value)) {
    if (key === 'modules' || key === 'persistenceModules') {
      const kept: unknown[] = [];
      let changed = false;
      for (const item of value) {
        if (sameModule(moduleEntryName(item), moduleName)) {
          changed = true;
          continue;
        }
        const inner = stripNode(item, moduleName, '');
        kept.push(inner.value);
        if (inner.changed) changed = true;
      }
      return { value: changed ? kept : value, changed };
    }
    if (key === 'routeKeys') {
      const kept = value.filter(item => typeof item !== 'string' || !routeKeyBelongsTo(item, moduleName));
      const changed = kept.length !== value.length;
      return { value: changed ? kept : value, changed };
    }
    if (key === 'navigation' || key === 'headerLinks') {
      const kept: unknown[] = [];
      let changed = false;
      for (const item of value) {
        if (entryCitesModulePath(item, moduleName)) {
          changed = true;
          continue;
        }
        const inner = stripNode(item, moduleName, '');
        kept.push(inner.value);
        if (inner.changed) changed = true;
      }
      return { value: changed ? kept : value, changed };
    }
    let changed = false;
    const next = value.map(item => {
      const inner = stripNode(item, moduleName, '');
      if (inner.changed) changed = true;
      return inner.value;
    });
    return { value: changed ? next : value, changed };
  }
  if (isRecord(value)) {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [childKey, child] of Object.entries(value)) {
      const inner = stripNode(child, moduleName, childKey);
      next[childKey] = inner.value;
      if (inner.changed) changed = true;
    }
    return { value: changed ? next : value, changed };
  }
  return { value, changed: false };
}

/** Project/config JSON: drop the module entry, nested `<mod>.*` routeKeys, and menus that name it. */
export function stripModuleFromJson(
  json: Record<string, unknown>,
  moduleName: string,
): { value: Record<string, unknown>; changed: boolean } {
  const stripped = stripNode(json, moduleName, '');
  return {
    value: isRecord(stripped.value) ? stripped.value : json,
    changed: stripped.changed,
  };
}

export function stripModuleFromRegistry(
  registry: Ns4SolutionRegistryArtifact,
  moduleName: string,
): { value: Ns4SolutionRegistryArtifact; changed: boolean } {
  const name = normalizeModuleName(moduleName);
  const modules = registry.modules.filter(block => !sameModule(block.moduleName, name));
  if (modules.length === registry.modules.length) return { value: registry, changed: false };
  return { value: { ...registry, modules }, changed: true };
}

export async function removeModule(moduleName: string, opts?: RemoveModuleOpts): Promise<RemoveModuleResult> {
  const raw = String(moduleName || '').trim();
  if (!raw) return { deleted: [], edited: [], skipped: ['(empty)'] };
  const name = normalizeModuleName(raw);

  const files = collectExactModuleFiles(name);
  const tobeFiles = collectTobeIntegrationFilesCiting(name);
  const allFiles = [...files];
  const seenKeys = new Set(files.map(file => mls.stor.getKeyToFile(file)));
  for (const file of tobeFiles) {
    const key = mls.stor.getKeyToFile(file);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    allFiles.push(file);
  }
  const deleted: string[] = [];
  const skipped: string[] = [];
  for (const file of allFiles) {
    if (isProtectedModuleFile(file)) skipped.push(displayPath(file));
    else deleted.push(displayPath(file));
  }
  deleted.sort();
  skipped.sort();

  const edited: string[] = [];
  const projectJson = await readNs4L5Project();
  const nextProject = projectJson ? stripModuleFromJson(projectJson, name) : null;
  if (nextProject?.changed) edited.push('l5/project.json');

  const configJson = await readNs4L5Config();
  const nextConfig = configJson ? stripModuleFromJson(configJson, name) : null;
  if (nextConfig?.changed) edited.push('l5/config.json');

  const registry = await readSolutionRegistry();
  let nextRegistry: Ns4SolutionRegistryArtifact | null = null;
  if (registry) {
    const stripped = stripModuleFromRegistry(registry, name);
    if (stripped.changed) {
      const gate = validateNs4SolutionRegistry(stripped.value, ns4Level1Subtypes());
      if (!gate.ok) {
        throw new Error(`Solution registry write rejected: ${gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('; ')}`);
      }
      nextRegistry = stripped.value;
      edited.push(displayPath(registryFile()));
    }
  }
  edited.sort();

  if (!deleted.length && !edited.length) {
    return { deleted, edited, skipped: skipped.length ? skipped : [name] };
  }
  if (opts?.dryRun) return { deleted, edited, skipped };

  if (deleted.length) {
    const { deleteFile } = await import('/_102027_/l2/libStor.js');
    for (const file of allFiles) {
      if (isProtectedModuleFile(file)) continue;
      await deleteFile(file);
    }
  }
  if (nextProject?.changed) await writeNs4L5Project(nextProject.value);
  if (nextConfig?.changed) await writeNs4L5Config(nextConfig.value);
  if (nextRegistry) await writeNs4SolutionRegistry(nextRegistry);
  return { deleted, edited, skipped };
}
