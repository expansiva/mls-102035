/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/organizationRegistry.ts" enhancement="_blank"/>

import mdm from '/_102034_/l4/ontology/mdm.defs.js';
import {
  NS4_SOLUTION_REGISTRY_SCHEMA_VERSION,
  type Ns4SolutionRegistryArtifact,
  type Ns4SolutionRegistryModule,
  type Ns4SolutionRegistryRole,
} from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';

/** ns5_43 T4: the level-1 the registry is written against IS `mdm.defs.ts`, so it states its version. */
export const NS4_REGISTRY_LEVEL1_SCHEMA_VERSION: string = mdm.schemaVersion;

export function emptyNs4SolutionRegistry(
  level1SchemaVersion: string = NS4_REGISTRY_LEVEL1_SCHEMA_VERSION,
): Ns4SolutionRegistryArtifact {
  return {
    schemaVersion: NS4_SOLUTION_REGISTRY_SCHEMA_VERSION,
    level1SchemaVersion,
    modules: [],
  };
}

/**
 * Replace only the named module block. Other modules keep their object identity so a stable
 * stringify leaves them byte-identical.
 */
export function upsertNs4SolutionRegistryModule(
  registry: Ns4SolutionRegistryArtifact,
  block: Ns4SolutionRegistryModule,
): Ns4SolutionRegistryArtifact {
  const modules = registry.modules.slice();
  const index = modules.findIndex(item => item.moduleName === block.moduleName);
  if (index >= 0) modules[index] = block;
  else modules.push(block);
  return { ...registry, modules };
}

export function inferNs4RegistryMdmSubtype(entity: {
  party?: string;
  mdmSubtype?: string;
}): string | null {
  if (entity.mdmSubtype) return entity.mdmSubtype;
  if (entity.party === 'person') return 'Person';
  if (entity.party === 'organization') return 'Company';
  return null;
}

export function buildNs4SolutionRegistryModuleBlock(input: {
  moduleName: string;
  actors: Array<{ actorId: string; kind: string }>;
  entities: Array<{
    entityId: string;
    kind?: string;
    /** v3 table: `core | event | supporting`. */
    class?: string;
    party?: string;
    mdmSubtype?: string;
    /** v3 role: `<moduleName>.<entityId>`, as the ontology wrote it. */
    roleTag?: string;
    storage?: { target?: string; mdmType?: string };
  }>;
  events?: Array<{ eventId: string; on: string }>;
  generalFields?: Ns4SolutionRegistryModule['generalFields'];
  updatedAt: string;
}): Ns4SolutionRegistryModule {
  const roles: Ns4SolutionRegistryRole[] = [];
  const seen = new Set<string>();
  const listed: Ns4SolutionRegistryModule['entities'] = [];
  const listedIds = new Set<string>();
  for (const entity of input.entities) {
    if (entity.entityId && !listedIds.has(entity.entityId)) {
      listedIds.add(entity.entityId);
      listed!.push({
        entityId: entity.entityId,
        kind: entity.kind || 'core',
        ...(entity.mdmSubtype ? { mdmSubtype: entity.mdmSubtype } : {}),
        ...(entity.class ? { class: entity.class } : {}),
      });
    }
    const isMdm = entity.kind === 'mdm' || entity.kind === 'role' || entity.storage?.target === 'mdm';
    if (!isMdm) continue;
    const subtype = inferNs4RegistryMdmSubtype(entity);
    if (!subtype) continue;
    const roleTag = entity.roleTag || entity.storage?.mdmType || `${input.moduleName}.${entity.entityId}`;
    if (seen.has(roleTag)) continue;
    seen.add(roleTag);
    roles.push({ subtype, roleTag, namespace: input.moduleName });
  }
  const events: Ns4SolutionRegistryModule['events'] = [];
  const seenEvents = new Set<string>();
  for (const event of input.events || []) {
    if (!event.eventId || seenEvents.has(event.eventId)) continue;
    seenEvents.add(event.eventId);
    events.push({ eventId: event.eventId, on: event.on });
  }
  return {
    moduleName: input.moduleName,
    actors: input.actors.map(actor => ({ actorId: actor.actorId, kind: actor.kind })),
    roles,
    generalFields: input.generalFields ? input.generalFields.slice() : [],
    entities: listed,
    events,
    updatedAt: input.updatedAt,
  };
}

export function serializeNs4SolutionRegistry(registry: Ns4SolutionRegistryArtifact): string {
  return `${JSON.stringify(registry, null, 2)}\n`;
}
