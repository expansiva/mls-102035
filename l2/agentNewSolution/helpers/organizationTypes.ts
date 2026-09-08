/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/organizationTypes.ts" enhancement="_blank"/>

/** Schema of the platform level-1 ontology defs. Bumped when the engine subtype set or field shape changes. */
export const NS4_LEVEL1_SCHEMA_VERSION = 'ns4-level1-v1' as const;

/** Schema of the per-project solution registry written by E10. */
export const NS4_SOLUTION_REGISTRY_SCHEMA_VERSION = 'ns4-solution-registry-v1' as const;

export interface Ns4Level1Field {
  fieldId: string;
  type: string;
  required: boolean;
}

export interface Ns4Level1RelationshipRef {
  type: string;
  from: readonly string[];
  to: readonly string[];
  bidirectional: boolean;
}

export interface Ns4Level1AllowedRelationship {
  type: string;
  as: 'from' | 'to' | 'both';
  otherSubtypes: readonly string[];
}

export interface Ns4Level1EntityArtifact {
  schemaVersion: typeof NS4_LEVEL1_SCHEMA_VERSION;
  subtype: string;
  identification: readonly Ns4Level1Field[];
  baseFields: readonly Ns4Level1Field[];
  allowedRelationships: readonly Ns4Level1AllowedRelationship[];
}

export interface Ns4Level1IndexArtifact {
  schemaVersion: typeof NS4_LEVEL1_SCHEMA_VERSION;
  level1SchemaVersion: typeof NS4_LEVEL1_SCHEMA_VERSION;
  subtypes: readonly string[];
  docTypes: readonly string[];
  mdmStatuses: readonly string[];
  relationshipTypes: readonly Ns4Level1RelationshipRef[];
}

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

export interface Ns4SolutionRegistryModule {
  moduleName: string;
  actors: Ns4SolutionRegistryActor[];
  roles: Ns4SolutionRegistryRole[];
  generalFields: Ns4SolutionRegistryGeneralField[];
  updatedAt: string;
}

export interface Ns4SolutionRegistryArtifact {
  schemaVersion: typeof NS4_SOLUTION_REGISTRY_SCHEMA_VERSION;
  level1SchemaVersion: string;
  modules: Ns4SolutionRegistryModule[];
}
