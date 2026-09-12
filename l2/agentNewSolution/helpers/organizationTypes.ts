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

export interface Ns4SolutionRegistryRole {
  mdmSubtype: string;
  role: string;
  namespace: string;
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
  kind: string;
  mdmSubtype?: string;
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
