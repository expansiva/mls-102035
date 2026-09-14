/// <mls fileReference="_102035_/l2/newRelease/integrationRequests.ts" enhancement="_blank" />

import type { Ns4SolutionRegistryArtifact } from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';
import type { Ns5SiblingModule } from '/_102035_/l2/agentNewSolution5/helpers/ns5Siblings.js';
import type { Ns5IntegrationRequestArtifact } from '/_102035_/l2/solution/types.js';
import {
  normalizeModuleName,
  readDefsJson,
  writeDefs,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';
import {
  requestDirection,
  requestExportName,
  type IntegrationRequestView,
} from '/_102035_/l2/newRelease/widgets/integrationModel.js';

type FileRecord = Record<string, (mls.stor.IFileInfo & { getContent?: () => Promise<unknown> }) | undefined>;

export interface IntegrationWorkspace {
  siblings: Ns5SiblingModule[];
  received: IntegrationRequestView[];
  sent: IntegrationRequestView[];
  errors: Array<{ path: string; message: string }>;
}

function requestTarget(folder: string): string | null {
  if (folder === 'organization/tobe/integration') return 'organization';
  const match = /^([a-z][A-Za-z0-9]*)\/tobe\/integration$/u.exec(folder);
  return match?.[1] || null;
}

function requestFiles(files: FileRecord, project: number): Ns5FileInfo[] {
  return Object.values(files)
    .filter((file): file is NonNullable<FileRecord[string]> => !!file
      && file.status !== 'deleted'
      && file.project === project
      && Number(file.level) === 4
      && file.extension === '.defs.ts'
      && !!requestTarget(String(file.folder || '')))
    .map(file => ({
      project,
      level: 4,
      folder: String(file.folder || ''),
      shortName: String(file.shortName || ''),
      extension: '.defs.ts',
    }));
}

export function siblingsFromRegistry(
  registry: Ns4SolutionRegistryArtifact | null,
  moduleName: string,
): Ns5SiblingModule[] {
  return (registry?.modules || [])
    .filter(module => module.moduleName !== moduleName)
    .map(module => ({
      moduleName: module.moduleName,
      roles: [...module.roles],
      entities: [...(module.entities || [])],
      events: [...(module.events || [])],
    }));
}

export async function readIntegrationWorkspace(project: number, moduleName: string): Promise<IntegrationWorkspace> {
  const errors: IntegrationWorkspace['errors'] = [];
  let registry: Ns4SolutionRegistryArtifact | null = null;
  try {
    registry = await readDefsJson<Ns4SolutionRegistryArtifact>({
      project,
      level: 4,
      folder: 'organization',
      shortName: 'registry',
      extension: '.defs.ts',
    });
  } catch (error) {
    errors.push({ path: 'l4/organization/registry.defs.ts', message: error instanceof Error ? error.message : String(error) });
  }

  const requests: IntegrationRequestView[] = [];
  for (const file of requestFiles(mls.stor.files as FileRecord, project)) {
    const path = `l4/${file.folder}/${file.shortName}${file.extension}`;
    try {
      const value = await readDefsJson<Ns5IntegrationRequestArtifact>(file);
      const targetModule = requestTarget(String(file.folder || ''));
      if (value && targetModule) requests.push({ targetModule, path, value });
    } catch (error) {
      errors.push({ path, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return {
    siblings: siblingsFromRegistry(registry, moduleName),
    received: requests.filter(request => requestDirection(request, moduleName) === 'received'),
    sent: requests.filter(request => requestDirection(request, moduleName) === 'sent'),
    errors,
  };
}

export async function writeIntegrationRequest(
  project: number,
  targetModule: string,
  value: Ns5IntegrationRequestArtifact,
): Promise<string> {
  const target = normalizeModuleName(targetModule);
  const requestedBy = normalizeModuleName(value.requestedBy);
  const eventId = normalizeModuleName(value.eventId);
  if (!project || !target || !requestedBy || !eventId) throw new Error('A valid project, target module, requester and event are required.');
  return writeDefs(
    {
      project,
      level: 4,
      folder: `${target}/tobe/integration`,
      shortName: `${requestedBy}--${eventId}`,
      extension: '.defs.ts',
    },
    requestExportName(requestedBy, eventId),
    { ...value, requestedBy, eventId },
    'Ns5IntegrationRequestArtifact',
  );
}

