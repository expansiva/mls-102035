/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/organizationRegistry.ts" enhancement="_blank"/>

import {
  NS4_LEVEL1_SCHEMA_VERSION,
  NS4_SOLUTION_REGISTRY_SCHEMA_VERSION,
  type Ns4SolutionRegistryArtifact,
  type Ns4SolutionRegistryModule,
  type Ns4SolutionRegistryRole,
} from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';

export function emptyNs4SolutionRegistry(
  level1SchemaVersion: string = NS4_LEVEL1_SCHEMA_VERSION,
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
    party?: string;
    mdmSubtype?: string;
    storage?: { target?: string; mdmType?: string };
  }>;
  generalFields?: Ns4SolutionRegistryModule['generalFields'];
  updatedAt: string;
}): Ns4SolutionRegistryModule {
  const roles: Ns4SolutionRegistryRole[] = [];
  const seen = new Set<string>();
  for (const entity of input.entities) {
    const isMdm = entity.kind === 'mdm' || entity.storage?.target === 'mdm';
    if (!isMdm) continue;
    const mdmSubtype = inferNs4RegistryMdmSubtype(entity);
    if (!mdmSubtype) continue;
    const role = entity.storage?.mdmType || `${input.moduleName}.${entity.entityId}`;
    if (seen.has(role)) continue;
    seen.add(role);
    roles.push({ mdmSubtype, role, namespace: input.moduleName });
  }
  return {
    moduleName: input.moduleName,
    actors: input.actors.map(actor => ({ actorId: actor.actorId, kind: actor.kind })),
    roles,
    generalFields: input.generalFields ? input.generalFields.slice() : [],
    updatedAt: input.updatedAt,
  };
}

export function serializeNs4SolutionRegistry(registry: Ns4SolutionRegistryArtifact): string {
  return `${JSON.stringify(registry, null, 2)}\n`;
}
