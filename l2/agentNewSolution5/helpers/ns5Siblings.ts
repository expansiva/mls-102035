/// <mls fileReference="_102035_/l2/agentNewSolution5/helpers/ns5Siblings.ts" enhancement="_blank"/>

import type {
  Ns4SolutionRegistryArtifact,
  Ns4SolutionRegistryEntity,
  Ns4SolutionRegistryEvent,
  Ns4SolutionRegistryRole,
} from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';
import { level1PlatformCatalog } from '/_102035_/l2/solution/lib.js';
import { readSolutionRegistry } from '/_102035_/l2/solution/fs.js';

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
      ? sibling.roles.map(role => `${role.role} ← ${role.mdmSubtype}`).join(', ')
      : '(none)';
    lines.push(`- ${sibling.moduleName}: roles ${roles}; entities ${entities}; events ${events}`);
  }
  return lines.join('\n');
}
