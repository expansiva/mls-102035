/// <mls fileReference="_102035_/l2/solution/fs.ts" enhancement="_blank"/>

import { createStorFile } from '/_102027_/l2/libStor.js';
import { extractNs4ClassicJsonObject } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import type { Ns4SolutionRegistryArtifact } from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';
import type { Ns5PipelineState, Ns5StepId } from '/_102035_/l2/solution/types.js';

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
  return { project: currentProject(), level: 4, folder: moduleFolder(moduleName), shortName: 'module', extension: '.defs.ts' };
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

export function pipelineFile(moduleName: string): Ns5FileInfo {
  return { project: currentProject(), level: 4, folder: `${moduleFolder(moduleName)}/pipeline`, shortName: 'pipeline', extension: '.json' };
}

export function pipelineJsonFile(moduleName: string, shortName: string): Ns5FileInfo {
  return { project: currentProject(), level: 4, folder: `${moduleFolder(moduleName)}/pipeline`, shortName, extension: '.json' };
}

export function finalizeReportFile(moduleName: string): Ns5FileInfo {
  return pipelineJsonFile(moduleName, 'finalize-report');
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

export async function deleteModuleL4(moduleName: string): Promise<string[]> {
  const project = currentProject();
  const keys = listModuleL4Keys(mls.stor.files, project, moduleName);
  const { deleteFile } = await import('/_102027_/l2/libStor.js');
  const deleted: string[] = [];
  for (const key of keys) {
    const file = mls.stor.files[key];
    if (!file) continue;
    await deleteFile(file);
    deleted.push(key);
  }
  return deleted;
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
