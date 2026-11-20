/// <mls fileReference="_102035_/l2/solution/ns5Siblings.ts" enhancement="_blank"/>

import {
  ns4RegistryRoleSubtype,
  ns4RegistryRoleTag,
} from '/_102035_/l2/solution/helpers/organizationTypes.js';
import type {
  Ns4SolutionRegistryArtifact,
  Ns4SolutionRegistryEntity,
  Ns4SolutionRegistryEvent,
  Ns4SolutionRegistryRole,
} from '/_102035_/l2/solution/helpers/organizationTypes.js';
import { indexedFile, integrationFile, readDefsJson, readSolutionRegistry } from '/_102035_/l2/solution/fs.js';
import { level1PlatformCatalog } from '/_102035_/l2/solution/lib.js';
import type { Ns5IntegrationArtifact, Ns5IntegrationExternalSystem } from '/_102035_/l2/solution/types.js';

export interface Ns5SiblingModule {
  moduleName: string;
  roles: Ns4SolutionRegistryRole[];
  entities: Ns4SolutionRegistryEntity[];
  events: Ns4SolutionRegistryEvent[];
}

export function ns5SiblingsFromRegistry(
  registry: Ns4SolutionRegistryArtifact | null | undefined,
  currentModule?: string,
): Ns5SiblingModule[] {
  if (!registry) return [];
  const skip = currentModule || '';
  return registry.modules
    .filter(block => block.moduleName && block.moduleName !== skip)
    .map(block => ({
      moduleName: block.moduleName,
      roles: block.roles.slice(),
      entities: (block.entities || []).slice(),
      events: (block.events || []).slice(),
    }));
}

export async function readNs5Siblings(currentModule?: string): Promise<Ns5SiblingModule[]> {
  return ns5SiblingsFromRegistry(await readSolutionRegistry(), currentModule);
}

export interface Ns5SiblingSystemsRead {
  groups: Array<{ moduleName: string; systems: Ns5IntegrationExternalSystem[] }>;
  errors: Array<{ path: string; message: string }>;
}

/**
 * The systems the siblings declare, read from the L4 each sibling wrote (`integration.defs.ts`).
 * A sibling with no indexed file, or one marked deleted, is skipped. An indexed file that does not parse is an error.
 */
export async function readNs5SiblingSystems(
  siblings: readonly Ns5SiblingModule[],
): Promise<Ns5SiblingSystemsRead> {
  const groups: Ns5SiblingSystemsRead['groups'] = [];
  const errors: Ns5SiblingSystemsRead['errors'] = [];
  for (const sibling of siblings) {
    const file = integrationFile(sibling.moduleName);
    const indexed = indexedFile(file);
    if (!indexed || indexed.status === 'deleted') continue;
    const path = `l4/${file.folder}/integration.defs.ts`;
    try {
      const value = await readDefsJson<Ns5IntegrationArtifact>(file);
      if (!value) throw new Error('Invalid integration artifact');
      groups.push({ moduleName: sibling.moduleName, systems: value.externalSystems || [] });
    } catch (error) {
      errors.push({ path, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return { groups, errors };
}

/** Same groups as `readNs5SiblingSystems`, without empty declarations. The first read error is thrown. */
export async function readSiblingSystems(
  siblings: readonly Ns5SiblingModule[],
): Promise<Array<{ moduleName: string; systems: Ns5IntegrationExternalSystem[] }>> {
  const read = await readNs5SiblingSystems(siblings);
  const first = read.errors[0];
  if (first) throw new Error(`${first.path}: ${first.message}`);
  return read.groups.filter(group => group.systems.length > 0);
}

export function formatSiblingSystems(
  siblingSystems: ReadonlyArray<{ moduleName: string; systems: readonly Ns5IntegrationExternalSystem[] }>,
): string {
  const lines = siblingSystems.flatMap(({ moduleName, systems }) => systems.map(system => {
    const operations = system.operations.map(operation => `${operation.operationId} (${operation.direction}: ${operation.description})`).join('; ') || '(none)';
    return `- ${system.id} · declared by ${moduleName} · ${system.description} · operations: ${operations}`;
  }));
  return lines.length ? lines.join('\n') : '(none)';
}

export function ns5PlatformEventIds(): string[] {
  const catalog = level1PlatformCatalog();
  return (catalog.events || []).map(event => event.eventId).filter(Boolean);
}

export function formatNs5Siblings(siblings: readonly Ns5SiblingModule[]): string {
  if (!siblings.length) return '';
  const lines = [
    '## Sibling modules already in this organization',
    'Do not reuse a sibling moduleName. Do not model an entity a sibling owns; reference it by inbound/outbound.',
  ];
  for (const sibling of siblings) {
    const entities = sibling.entities.length
      ? sibling.entities.map(entity => (
        entity.mdmSubtype
          ? `${entity.entityId} (${entity.kind}, ${entity.mdmSubtype})`
          : `${entity.entityId} (${entity.kind})`
      )).join(', ')
      : '(none)';
    const events = sibling.events.length
      ? sibling.events.map(event => `${event.eventId} on ${event.on}`).join(', ')
      : '(none)';
    const roles = sibling.roles.length
      ? sibling.roles.map(role => `${ns4RegistryRoleTag(role)} ← ${ns4RegistryRoleSubtype(role)}`).join(', ')
      : '(none)';
    lines.push(`- ${sibling.moduleName}: roles ${roles}; entities ${entities}; events ${events}`);
  }
  return lines.join('\n');
}
