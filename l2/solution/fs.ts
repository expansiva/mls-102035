/// <mls fileReference="_102035_/l2/solution/fs.ts" enhancement="_blank"/>

import { createStorFile } from '/_102027_/l2/libStor.js';
import { extractNs4ClassicJsonObject } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import type { Ns4SolutionRegistryArtifact } from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';
import type { Ns5OntologyAnyEntity, Ns5PipelineState, Ns5StepId } from '/_102035_/l2/solution/types.js';

export type Ns5FileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

const TYPES_IMPORT = '/_102035_/l2/solution/types.js';
const AGENT_PROJECT = 102035;
const AGENT_FOLDER = 'agentNewSolution5';

export function normalizeModuleName(value: unknown, fallback = 'newModule'): string {
  const raw = String(value || '').trim() || fallback;
  if (!raw) return '';
  const ascii = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = ascii.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length === 0) return 'newModule';
  const first = words[0].toLowerCase();
  const rest = words.slice(1).map(word => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase()).join('');
  const candidate = `${first}${rest}`.replace(/^[^a-z]+/, '').slice(0, 60);
  return candidate || 'newModule';
}

function currentProject(): number {
  return mls.actualProject || 0;
}

function moduleFolder(moduleName: string): string {
  return normalizeModuleName(moduleName);
}

export function moduleFile(moduleName: string): Ns5FileInfo {
  return moduleFileForProject(currentProject(), moduleName);
}

/** Read-only callers such as the Studio module browser must not depend on mls.actualProject. */
export function moduleFileForProject(project: number, moduleName: string): Ns5FileInfo {
  return { project, level: 4, folder: moduleFolder(moduleName), shortName: 'module', extension: '.defs.ts' };
}

export function journeyFile(moduleName: string, journeyId: string): Ns5FileInfo {
  return { project: currentProject(), level: 4, folder: `${moduleFolder(moduleName)}/journeys`, shortName: journeyId, extension: '.defs.ts' };
}

export function journeyIndexFile(moduleName: string): Ns5FileInfo {
  return { project: currentProject(), level: 4, folder: `${moduleFolder(moduleName)}/journeys`, shortName: 'index', extension: '.defs.ts' };
}

export function ontologyEntityFile(moduleName: string, entityId: string): Ns5FileInfo {
  return { project: currentProject(), level: 4, folder: `${moduleFolder(moduleName)}/ontology`, shortName: entityId, extension: '.defs.ts' };
}

export function ontologyIndexFile(moduleName: string): Ns5FileInfo {
  return { project: currentProject(), level: 4, folder: `${moduleFolder(moduleName)}/ontology`, shortName: 'index', extension: '.defs.ts' };
}

export function rulesFile(moduleName: string): Ns5FileInfo {
  return { project: currentProject(), level: 4, folder: moduleFolder(moduleName), shortName: 'rules', extension: '.defs.ts' };
}

export function workflowsFile(moduleName: string): Ns5FileInfo {
  return { project: currentProject(), level: 4, folder: moduleFolder(moduleName), shortName: 'workflows', extension: '.defs.ts' };
}

export function accessFile(moduleName: string): Ns5FileInfo {
  return { project: currentProject(), level: 4, folder: moduleFolder(moduleName), shortName: 'access', extension: '.defs.ts' };
}

export function integrationFile(moduleName: string): Ns5FileInfo {
  return { project: currentProject(), level: 4, folder: moduleFolder(moduleName), shortName: 'integration', extension: '.defs.ts' };
}

/** `l4/<target>/tobe/integration/<requestedBy>--<eventId>.defs.ts` — no extra dot in shortName. */
export function integrationRequestFile(targetModule: string, requestedBy: string, eventId: string): Ns5FileInfo {
  return {
    project: currentProject(),
    level: 4,
    folder: `${moduleFolder(targetModule)}/tobe/integration`,
    shortName: `${normalizeModuleName(requestedBy)}--${normalizeModuleName(eventId)}`,
    extension: '.defs.ts',
  };
}

export function collectTobeIntegrationFilesCiting(moduleName: string): mls.stor.IFileInfo[] {
  const name = normalizeModuleName(moduleName);
  const prefix = `${name}--`;
  const project = currentProject();
  const collected: mls.stor.IFileInfo[] = [];
  const seen = new Set<string>();
  const consider = (file: Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>) => {
    if (file.project !== project || Number(file.level) !== 4) return;
    const folder = String(file.folder || '');
    if (!folder.endsWith('/tobe/integration') && folder !== 'organization/tobe/integration') return;
    const shortName = String(file.shortName || '');
    if (!shortName.startsWith(prefix)) return;
    const info = diskFileInfo(file);
    const key = mls.stor.getKeyToFile(info);
    if (seen.has(key)) return;
    seen.add(key);
    collected.push(info);
  };
  for (const file of Object.values(mls.stor.files)) {
    if (file) consider(file);
  }
  const listFolder = hostListFolder();
  if (listFolder) {
    const folders = new Set<string>(['organization/tobe/integration']);
    for (const file of Object.values(mls.stor.files)) {
      const folder = String(file?.folder || '');
      if (folder.endsWith('/tobe/integration')) folders.add(folder);
    }
    for (const folder of folders) {
      for (const info of listFolder(project, 4, folder)) consider(info);
    }
  }
  return collected;
}

export function pipelineFile(moduleName: string): Ns5FileInfo {
  return pipelineFileForProject(currentProject(), moduleName);
}

export function pipelineFileForProject(project: number, moduleName: string): Ns5FileInfo {
  return { project, level: 4, folder: `${moduleFolder(moduleName)}/pipeline`, shortName: 'pipeline', extension: '.json' };
}

export function pipelineJsonFile(moduleName: string, shortName: string): Ns5FileInfo {
  return pipelineJsonFileForProject(currentProject(), moduleName, shortName);
}

export function pipelineJsonFileForProject(project: number, moduleName: string, shortName: string): Ns5FileInfo {
  return { project, level: 4, folder: `${moduleFolder(moduleName)}/pipeline`, shortName, extension: '.json' };
}

export function finalizeReportFile(moduleName: string): Ns5FileInfo {
  return pipelineJsonFile(moduleName, 'finalize-report');
}

export function finalizeReportFileForProject(project: number, moduleName: string): Ns5FileInfo {
  return pipelineJsonFileForProject(project, moduleName, 'finalize-report');
}

export function listPipelineJsonShortNames(moduleName: string): string[] {
  const project = currentProject();
  const folder = `${moduleFolder(moduleName)}/pipeline`;
  const names: string[] = [];
  for (const file of Object.values(mls.stor.files) as Array<{
    project?: number; level?: number; folder?: string; shortName?: string; extension?: string; status?: string;
  }>) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (file.extension !== '.json' || String(file.folder || '') !== folder) continue;
    if (file.shortName) names.push(String(file.shortName));
  }
  return names;
}

export function draftFile(moduleName: string, step: Ns5StepId | string): Ns5FileInfo {
  return { project: currentProject(), level: 4, folder: `${moduleFolder(moduleName)}/pipeline`, shortName: `${step}-draft`, extension: '.json' };
}

export function agentFile(folder: string, shortName: string, extension: string): Ns5FileInfo {
  return {
    project: AGENT_PROJECT,
    level: 2,
    folder: folder ? `${AGENT_FOLDER}/${folder}` : AGENT_FOLDER,
    shortName,
    extension,
  };
}

export function registryFile(): Ns5FileInfo {
  return { project: currentProject(), level: 4, folder: 'organization', shortName: 'registry', extension: '.defs.ts' };
}

export function displayPath(fileInfo: Ns5FileInfo): string {
  const folder = fileInfo.folder ? `${fileInfo.folder}/` : '';
  return `l${fileInfo.level}/${folder}${fileInfo.shortName}${fileInfo.extension}`;
}

export function assertShortName(shortName: string): void {
  if (shortName.includes('.')) {
    throw new Error(`[agentNewSolution5] filename out of standard: '${shortName}' — shortName must not contain dots`);
  }
}

export function fileExists(fileInfo: Ns5FileInfo): boolean {
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  return !!file && file.status !== 'deleted';
}

export function listModuleFolders(): Set<string> {
  const project = currentProject();
  const modules = new Set<string>();
  for (const file of Object.values(mls.stor.files)) {
    if (!file || file.project !== project || file.status === 'deleted' || !file.folder) continue;
    if (file.level !== 4) continue;
    const first = file.folder.split('/')[0];
    if (!first || first === 'organization') continue;
    modules.add(normalizeModuleName(first));
  }
  return modules;
}

export function isExactModuleFolder(folder: string, moduleName: string): boolean {
  const normalized = moduleFolder(moduleName);
  const first = String(folder || '').split('/').filter(Boolean)[0] || '';
  return !!first && normalizeModuleName(first) === normalized;
}

export const MODULE_TREE_LEVELS = [1, 2, 4, 5] as const;

export function isProtectedModuleFile(file: { level?: number; folder?: string; shortName?: string }): boolean {
  const first = String(file.folder || '').split('/').filter(Boolean)[0] || '';
  const folder = String(file.folder || '');
  if (Number(file.level) === 4 && first === 'organization') {
    return folder !== 'organization/tobe/integration' && !folder.startsWith('organization/tobe/');
  }
  if (Number(file.level) === 2 && !first && (file.shortName === 'designSystem' || file.shortName === 'project')) return true;
  if (Number(file.level) === 5 && !first && (file.shortName === 'config' || file.shortName === 'project')) return true;
  return false;
}

export function listModuleL4Keys(
  files: Record<string, { project?: number; level?: number; folder?: string; status?: string } | undefined>,
  project: number,
  moduleName: string,
): string[] {
  const keys: string[] = [];
  for (const [key, file] of Object.entries(files)) {
    if (!file || file.project !== project || file.status === 'deleted' || !file.folder) continue;
    if (file.level !== 4) continue;
    if (!isExactModuleFolder(file.folder, moduleName)) continue;
    keys.push(key);
  }
  return keys;
}

/** Index ∪ host disk of exact `l<level>/<mod>/**`. Never prefix; never protected paths. */
export function collectExactModuleFiles(
  moduleName: string,
  levels: readonly number[] = MODULE_TREE_LEVELS,
): mls.stor.IFileInfo[] {
  const project = currentProject();
  const folder = moduleFolder(moduleName);
  const files = mls.stor.files as Record<string, mls.stor.IFileInfo | undefined>;
  const levelSet = new Set(levels);
  const keys = new Set<string>();
  for (const [key, file] of Object.entries(files)) {
    if (!file || file.project !== project || !file.folder) continue;
    if (!levelSet.has(Number(file.level))) continue;
    if (!isExactModuleFolder(file.folder, moduleName)) continue;
    if (isProtectedModuleFile(file)) continue;
    keys.add(key);
  }
  const listFolder = hostListFolder();
  if (listFolder) {
    for (const level of levels) {
      for (const info of listFolder(project, level, folder)) {
        if (isProtectedModuleFile(info)) continue;
        if (!isExactModuleFolder(String(info.folder || ''), moduleName)) continue;
        const key = mls.stor.getKeyToFile(info);
        keys.add(key);
        if (!files[key]) files[key] = diskFileInfo(info);
      }
    }
  }
  const collected: mls.stor.IFileInfo[] = [];
  for (const key of keys) {
    const file = files[key];
    if (file) collected.push(file);
  }
  return collected;
}

export type Ns5DefsKind = 'journeys' | 'ontology';

type ListedStorFile = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

function hostListFolder(): ((project: number, level: number, folder: string) => ListedStorFile[]) | undefined {
  const fn = (mls.stor.localStor as { listFolder?: unknown } | undefined)?.listFolder;
  return typeof fn === 'function' ? fn as ((project: number, level: number, folder: string) => ListedStorFile[]) : undefined;
}

function diskFileInfo(info: ListedStorFile): mls.stor.IFileInfo {
  const key = mls.stor.getKeyToFile(info);
  const existing = mls.stor.files[key];
  if (existing) return existing;
  return {
    ...info,
    versionRef: '0',
    inLocalStorage: true,
    status: 'changed',
    hasError: false,
  } as mls.stor.IFileInfo;
}

/** shortNames of `.defs.ts` in `l4/<mod>/<kind>/`, including status=deleted and host disk. */
export function listModuleDefsShortNames(moduleName: string, kind: Ns5DefsKind): string[] {
  const project = currentProject();
  const folder = `${moduleFolder(moduleName)}/${kind}`;
  const names = new Set<string>();
  for (const file of Object.values(mls.stor.files)) {
    if (!file || file.project !== project || file.level !== 4) continue;
    if (String(file.folder || '') !== folder || file.extension !== '.defs.ts') continue;
    if (file.shortName) names.add(file.shortName);
  }
  const listFolder = hostListFolder();
  if (listFolder) {
    for (const info of listFolder(project, 4, folder)) {
      if (info.extension === '.defs.ts' && info.shortName) names.add(info.shortName);
    }
  }
  return [...names].sort();
}

export function ns5DefsOrphans(diskShortNames: string[], indexIds: string[]): string[] {
  const keep = new Set<string>(['index', ...indexIds.filter(Boolean)]);
  const seen = new Set<string>();
  const orphans: string[] = [];
  for (const raw of diskShortNames) {
    const name = String(raw || '').replace(/\.defs\.ts$/, '');
    if (!name || keep.has(name) || seen.has(name)) continue;
    seen.add(name);
    orphans.push(name);
  }
  return orphans.sort();
}

export async function reconcileModuleDefs(
  moduleName: string,
  kind: Ns5DefsKind,
  indexIds: string[],
): Promise<string[]> {
  const orphans = ns5DefsOrphans(listModuleDefsShortNames(moduleName, kind), indexIds);
  if (!orphans.length) return [];
  const { deleteFile } = await import('/_102027_/l2/libStor.js');
  const removed: string[] = [];
  for (const shortName of orphans) {
    const info = kind === 'journeys' ? journeyFile(moduleName, shortName) : ontologyEntityFile(moduleName, shortName);
    await deleteFile(diskFileInfo(info));
    removed.push(shortName);
  }
  return removed;
}

export async function readJson<T>(fileInfo: Ns5FileInfo): Promise<T | null> {
  const raw = await readText(fileInfo, false);
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJson(fileInfo: Ns5FileInfo, value: unknown): Promise<string> {
  await writeText(fileInfo, `${JSON.stringify(value, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeDefs(
  fileInfo: Ns5FileInfo,
  exportName: string,
  value: unknown,
  typeName: string,
): Promise<string> {
  await writeText(fileInfo, renderDefsSource(fileInfo, exportName, value, typeName));
  return displayPath(fileInfo);
}

export function renderDefsSource(
  fileInfo: Ns5FileInfo,
  exportName: string,
  value: unknown,
  typeName: string,
): string {
  const safeExportName = normalizeModuleName(exportName);
  const exactTypeName = `${safeExportName.slice(0, 1).toUpperCase()}${safeExportName.slice(1)}Type`;
  return `/// <mls fileReference="_${fileInfo.project}_/l${fileInfo.level}/${fileInfo.folder}/${fileInfo.shortName}${fileInfo.extension}" enhancement="_blank"/>\n\n`
    + `import type { ${typeName} } from '${TYPES_IMPORT}';\n\n`
    + `export const ${safeExportName} = ${JSON.stringify(value, null, 2)} as const satisfies ${typeName};\n\n`
    + `export type ${exactTypeName} = typeof ${safeExportName};\n\n`
    + `export default ${safeExportName};\n`;
}

export async function readPipeline(moduleName: string): Promise<Ns5PipelineState | null> {
  return readJson<Ns5PipelineState>(pipelineFile(moduleName));
}

export async function readPipelineForProject(project: number, moduleName: string): Promise<Ns5PipelineState | null> {
  return readJson<Ns5PipelineState>(pipelineFileForProject(project, moduleName));
}

export async function writePipeline(state: Ns5PipelineState): Promise<string> {
  return writeJson(pipelineFile(state.moduleName), state);
}

export async function readAgentText(folder: string, shortName: string, extension = '.md'): Promise<string> {
  return readText(agentFile(folder, shortName, extension), true);
}

export async function readAgentJson<T>(folder: string, shortName: string, extension = '.json'): Promise<T> {
  const raw = await readText(agentFile(folder, shortName, extension), true);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`[agentNewSolution5] invalid JSON: ${displayPath(agentFile(folder, shortName, extension))}`);
  }
}

export async function readDefsJson<T>(fileInfo: Ns5FileInfo): Promise<T | null> {
  const source = await readText(fileInfo, false);
  const json = extractNs4ClassicJsonObject(source);
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * An ontology entity file in whichever form it is written (ns5_39 T4). Both forms are one JSON literal,
 * so the reading is the same; only the type of what comes back changes, and `schemaVersion` is the
 * discriminator — v3 (`agendaClinica`) carries `record`, v2 (the other eleven modules) carries `fields`.
 */
export async function readOntologyEntityAny(fileInfo: Ns5FileInfo): Promise<Ns5OntologyAnyEntity | null> {
  return readDefsJson<Ns5OntologyAnyEntity>(fileInfo);
}

export async function readSolutionRegistry(): Promise<Ns4SolutionRegistryArtifact | null> {
  return readDefsJson<Ns4SolutionRegistryArtifact>(registryFile());
}

type ReadableFile = {
  status?: string;
  versionRef?: unknown;
  getValueInfo?: () => Promise<{ content?: unknown }>;
  getContent: () => Promise<unknown>;
};

async function readText(fileInfo: Ns5FileInfo, required: boolean): Promise<string> {
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)] as ReadableFile | undefined;
  if (!file || file.status === 'deleted') {
    if (required) throw new Error(`[agentNewSolution5] file not found: ${displayPath(fileInfo)}`);
    return '';
  }
  if (file.getValueInfo) {
    try {
      const local = await file.getValueInfo();
      const text = contentText(local?.content, fileInfo.extension);
      if (text !== null) return text;
    } catch { /* fall through */ }
  }
  if (String(file.versionRef || '').trim() === '0') {
    if (required) throw new Error(`[agentNewSolution5] local content unavailable for new file: ${displayPath(fileInfo)}`);
    return '';
  }
  const text = contentText(await file.getContent(), fileInfo.extension);
  if (text !== null) return text;
  if (required) throw new Error(`[agentNewSolution5] invalid text file: ${displayPath(fileInfo)}`);
  return '';
}

async function writeText(fileInfo: Ns5FileInfo, content: string): Promise<void> {
  assertShortName(fileInfo.shortName);
  const key = mls.stor.getKeyToFile(fileInfo);
  let file = mls.stor.files[key];
  if (!file) {
    file = await createStorFile({ ...fileInfo, source: content }, false, false, false);
  } else if (file.status === 'deleted') {
    file.status = 'changed';
    file.updatedAt = new Date().toISOString();
  }
  await mls.stor.localStor.setContent(file, { contentType: 'string', content });
}

function contentText(content: unknown, extension: string): string | null {
  if (typeof content === 'string') return content;
  if (extension === '.json' && typeof content === 'object' && content !== null) {
    return `${JSON.stringify(content, null, 2)}\n`;
  }
  return null;
}
