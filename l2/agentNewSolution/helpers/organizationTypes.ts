/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/organizationTypes.ts" enhancement="_blank"/>

export {
  NS4_LEVEL1_SCHEMA_VERSION,
  NS4_LEVEL1_SUBTYPE_VALUES,
} from '/_102034_/l1/mdm/defs/level1Types.js';
export type {
  MdmPlatformCatalogArtifact,
  MdmPlatformService,
  Ns4Level1AllowedRelationship,
  Ns4Level1EntityArtifact,
  Ns4Level1Field,
  Ns4Level1IndexArtifact,
  Ns4Level1RelationshipRef,
  Ns4Level1Subtype,
} from '/_102034_/l1/mdm/defs/level1Types.js';

/** Schema of the per-project solution registry written by E10. */
export const NS4_SOLUTION_REGISTRY_SCHEMA_VERSION = 'ns4-solution-registry-v1' as const;

export interface Ns4SolutionRegistryActor {
  actorId: string;
  kind: string;
}

/**
 * A papel of a module over a level-1 subtype. ns5_43 T4 names the three parts the way the v3 ontology
 * names them (`Ns5OntologyRoleV3`): `subtype` is the MDM subtype, `roleTag` is what `attachRole` writes
 * into `identification.tags`. Registries written before ns5_43 carry `mdmSubtype`/`role` instead; they
 * are read through `ns4RegistryRoleSubtype` / `ns4RegistryRoleTag` and rewritten on the next finalize80.
 */
export interface Ns4SolutionRegistryRole {
  subtype: string;
  roleTag: string;
  namespace: string;
  /** Legacy spelling of `subtype`, written before ns5_43. Never written again. */
  mdmSubtype?: string;
  /** Legacy spelling of `roleTag`, written before ns5_43. Never written again. */
  role?: string;
}

export function ns4RegistryRoleSubtype(role: Ns4SolutionRegistryRole): string {
  return role.subtype || role.mdmSubtype || '';
}

export function ns4RegistryRoleTag(role: Ns4SolutionRegistryRole): string {
  return role.roleTag || role.role || '';
}

export interface Ns4SolutionRegistryGeneralField {
  fieldId: string;
  type: string;
  promotedBy: string;
  since: string;
}

/** Entities this module owns. Siblings read this list instead of opening ontology files. */
export interface Ns4SolutionRegistryEntity {
  entityId: string;
  /** v2 `kind`, or the v3 `role` / `entity`. */
  kind: string;
  mdmSubtype?: string;
  /** v3 table only: `core | event | supporting`, which v2 carried in `kind` (ns5_43 T4). */
  class?: string;
}

/** Outbound events this module publishes. `on` is `Entity.transitionId` or `Entity.create`. */
export interface Ns4SolutionRegistryEvent {
  eventId: string;
  on: string;
}

export interface Ns4SolutionRegistryModule {
  moduleName: string;
  actors: Ns4SolutionRegistryActor[];
  roles: Ns4SolutionRegistryRole[];
  generalFields: Ns4SolutionRegistryGeneralField[];
  entities?: Ns4SolutionRegistryEntity[];
  events?: Ns4SolutionRegistryEvent[];
  updatedAt: string;
}

export interface Ns4SolutionRegistryArtifact {
  schemaVersion: typeof NS4_SOLUTION_REGISTRY_SCHEMA_VERSION;
  level1SchemaVersion: string;
  modules: Ns4SolutionRegistryModule[];
}
