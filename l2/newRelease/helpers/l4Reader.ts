/// <mls fileReference="_102035_/l2/newRelease/helpers/l4Reader.ts" enhancement="_blank" />

import {
  finalizeReportFileForProject,
  moduleFileForProject,
  pipelineJsonFileForProject,
  readDefsJson,
  readJson,
  readPipelineForProject,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';
import type {
  Ns5ModuleArtifact,
  Ns5PipelineState,
  Ns5PipelineStatus,
  Ns5StepId,
} from '/_102035_/l2/solution/types.js';
import type { NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';
import {
  readNs5Overlay,
  type NewReleaseOverlaySources,
  type NewReleaseOverlayValidation,
  type NewReleaseTobeDiff,
  type Ns5TobeArtifactPath,
  type Ns5TobeManifest,
} from '/_102035_/l2/newRelease/tobe.js';

export type { NewReleaseVersion } from '/_102035_/l2/newRelease/helpers/context.js';

export interface Ns5OracleCheckSummary {
  checkId: string;
  status: 'passed' | 'failed' | 'warned';
  errorCount: number;
  warningCount: number;
}

export interface Ns5FinalizeReportView {
  moduleName: string;
  finalStatus: 'passed' | 'failed';
  checks: Ns5OracleCheckSummary[];
  errors: unknown[];
  warnings: unknown[];
  counts?: Record<string, number>;
}

export interface Ns5RunView {
  savedAt?: string;
  verdict?: string;
  cost?: {
    total?: number;
    byStep?: Partial<Record<Ns5StepId, number>>;
  };
}

export interface NewReleaseReadError {
  path: string;
  message: string;
}

export interface NewReleaseModuleData {
  module: Ns5ModuleArtifact | null;
  pipeline: Ns5PipelineState | null;
  finalizeReport: Ns5FinalizeReportView | null;
  run: Ns5RunView | null;
  tobeChanges: number;
  artifacts: NewReleaseOverlaySources;
  manifest: Ns5TobeManifest | null;
  stalePaths: Ns5TobeArtifactPath[];
  diffs: NewReleaseTobeDiff[];
  validation: NewReleaseOverlayValidation;
  errors: NewReleaseReadError[];
}

type FileRecord = Record<string, {
  project?: number;
  level?: number;
  folder?: string;
  shortName?: string;
  extension?: string;
  status?: string;
  getContent?: () => Promise<unknown>;
} | undefined>;

export interface NewReleaseModuleSummary {
  name: string;
  title: string;
  status: Ns5PipelineStatus | 'unknown';
  failedStep: Ns5StepId | null;
  tobeChanges: number;
  module: Ns5ModuleArtifact | null;
}

function liveFiles(files: FileRecord): NonNullable<FileRecord[string]>[] {
  return Object.values(files).filter((file): file is NonNullable<FileRecord[string]> => !!file && file.status !== 'deleted');
}

export function listReadableProjectsFromFiles(files: FileRecord): number[] {
  const projects = new Set<number>();
  for (const file of liveFiles(files)) {
    if (file.level !== 4 || file.shortName !== 'module' || file.extension !== '.defs.ts') continue;
    if (!file.folder || file.folder.includes('/')) continue;
    if (typeof file.project === 'number' && file.project > 0) projects.add(file.project);
  }
  return [...projects].sort((a, b) => a - b);
}

export function listNs5ModulesFromFiles(files: FileRecord, project: number): string[] {
  const modules = new Set<string>();
  for (const file of liveFiles(files)) {
    if (file.project !== project || file.level !== 4 || file.shortName !== 'module' || file.extension !== '.defs.ts') continue;
    if (!file.folder || file.folder.includes('/') || file.folder === 'organization') continue;
    modules.add(file.folder);
  }
  return [...modules].sort((a, b) => a.localeCompare(b));
}

export function listReadableProjects(): number[] {
  return listReadableProjectsFromFiles(mls.stor.files as FileRecord);
}

export function listNs5Modules(project: number): string[] {
  return listNs5ModulesFromFiles(mls.stor.files as FileRecord, project);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function runtimeConfigHasModules(value: unknown, project: number): boolean {
  if (!isRecord(value) || !isRecord(value.projects)) return false;
  const projectConfig = value.projects[String(project)];
  return isRecord(projectConfig) && Array.isArray(projectConfig.modules) && projectConfig.modules.length > 0;
}

async function readRuntimeConfig(project: number): Promise<unknown | null> {
  const file = liveFiles(mls.stor.files as FileRecord).find(candidate =>
    candidate.project === project
    && candidate.level === 5
    && !candidate.folder
    && candidate.shortName === 'config'
    && candidate.extension === '.json',
  );
  if (!file?.getContent) return null;
  try {
    const content = await file.getContent();
    if (typeof content !== 'string' || !content.trim()) return null;
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/** Projects with an L4 module and a materialized runtime config containing modules. */
export async function listEligibleProjects(): Promise<number[]> {
  const candidates = listReadableProjects();
  const accepted = await Promise.all(candidates.map(async project =>
    runtimeConfigHasModules(await readRuntimeConfig(project), project) ? project : null,
  ));
  return accepted.filter((project): project is number => project !== null);
}

function filePath(file: Ns5FileInfo): string {
  return `l${file.level}/${file.folder ? `${file.folder}/` : ''}${file.shortName}${file.extension}`;
}

async function optionalRead<T>(
  file: Ns5FileInfo,
  reader: () => Promise<T | null>,
  errors: NewReleaseReadError[],
): Promise<T | null> {
  try {
    return await reader();
  } catch (error) {
    errors.push({ path: filePath(file), message: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

function filesForPipeline(project: number, moduleName: string): Ns5FileInfo[] {
  const folder = `${moduleName}/pipeline`;
  return liveFiles(mls.stor.files as FileRecord)
    .filter(file => file.project === project
      && file.level === 4
      && file.folder === folder
      && file.extension === '.json'
      && /^run\d+_newsolution5$/.test(String(file.shortName || '')))
    .map(file => ({
      project,
      level: 4,
      folder,
      shortName: String(file.shortName),
      extension: '.json',
    }));
}

async function readLatestRun(project: number, moduleName: string, errors: NewReleaseReadError[]): Promise<Ns5RunView | null> {
  const runs = await Promise.all(filesForPipeline(project, moduleName).map(file =>
    optionalRead(file, () => readJson<Ns5RunView>(file), errors),
  ));
  return runs
    .filter((run): run is Ns5RunView => !!run)
    .sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')))[0] ?? null;
}

async function readTobeChanges(project: number, moduleName: string, errors: NewReleaseReadError[]): Promise<number> {
  const file: Ns5FileInfo = {
    project,
    level: 4,
    folder: `${moduleName}/tobe/plan`,
    shortName: 'tobe',
    extension: '.json',
  };
  const manifest = await optionalRead(file, () => readJson<{ changes?: unknown[] }>(file), errors);
  return Array.isArray(manifest?.changes) ? manifest.changes.length : 0;
}

/** Read a complete NS5 module, substituting each prepared artifact independently in `tobe` mode. */
export async function readNs5Module(
  project: number,
  moduleName: string,
  version: NewReleaseVersion = 'asis',
): Promise<NewReleaseModuleData> {
  const errors: NewReleaseReadError[] = [];
  const pipelineInfo = pipelineJsonFileForProject(project, moduleName, 'pipeline');
  const reportInfo = finalizeReportFileForProject(project, moduleName);

  const [pipeline, persistedReport, run] = await Promise.all([
    optionalRead(pipelineInfo, () => readPipelineForProject(project, moduleName), errors),
    optionalRead(reportInfo, () => readJson<Ns5FinalizeReportView>(reportInfo), errors),
    readLatestRun(project, moduleName, errors),
  ]);
  const overlay = await readNs5Overlay(project, moduleName, version, {
    pipeline,
    registryModuleNames: listNs5Modules(project),
  });
  errors.push(...overlay.errors);
  const finalizeReport = version === 'tobe' && overlay.validation.oracle
    ? overlay.validation.oracle
    : persistedReport;

  return {
    module: overlay.sources.module.value,
    pipeline,
    finalizeReport,
    run,
    tobeChanges: overlay.manifest?.changes.length ?? 0,
    artifacts: overlay.sources,
    manifest: overlay.manifest,
    stalePaths: overlay.stalePaths,
    diffs: overlay.diffs,
    validation: overlay.validation,
    errors,
  };
}

export async function listNs5ModuleSummaries(project: number): Promise<NewReleaseModuleSummary[]> {
  const summaries = await Promise.all(listNs5Modules(project).map(async name => {
    const errors: NewReleaseReadError[] = [];
    const moduleInfo = moduleFileForProject(project, name);
    const pipelineInfo = pipelineJsonFileForProject(project, name, 'pipeline');
    const [module, pipeline, tobeChanges] = await Promise.all([
      optionalRead(moduleInfo, () => readDefsJson<Ns5ModuleArtifact>(moduleInfo), errors),
      optionalRead(pipelineInfo, () => readPipelineForProject(project, name), errors),
      readTobeChanges(project, name, errors),
    ]);
    return {
      name,
      title: module?.title || name,
      status: pipeline?.status || 'unknown',
      failedStep: failedStepOf(pipeline),
      tobeChanges,
      module,
    } satisfies NewReleaseModuleSummary;
  }));
  return summaries.sort((a, b) => a.title.localeCompare(b.title));
}

export function failedStepOf(pipeline: Ns5PipelineState | null): Ns5StepId | null {
  if (!pipeline) return null;
  const entry = Object.entries(pipeline.steps).find(([, step]) => step?.status === 'failed');
  return (entry?.[0] as Ns5StepId | undefined) ?? null;
}
