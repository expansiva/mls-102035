/// <mls fileReference="_102035_/l2/agentNewSolution/helpers/registryGate.ts" enhancement="_blank"/>

import {
  NS4_SOLUTION_REGISTRY_SCHEMA_VERSION,
  type Ns4SolutionRegistryArtifact,
} from '/_102035_/l2/agentNewSolution/helpers/organizationTypes.js';

export interface Ns4RegistryGateIssue {
  code: string;
  path: string;
  message: string;
}

export interface Ns4RegistryGateResult {
  ok: boolean;
  issues: Ns4RegistryGateIssue[];
}

export function validateNs4SolutionRegistry(
  registry: Ns4SolutionRegistryArtifact,
  level1Subtypes: readonly string[],
): Ns4RegistryGateResult {
  const issues: Ns4RegistryGateIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  if (registry.schemaVersion !== NS4_SOLUTION_REGISTRY_SCHEMA_VERSION) {
    add('NS4_REGISTRY_SCHEMA', 'schemaVersion', `Must be ${NS4_SOLUTION_REGISTRY_SCHEMA_VERSION}.`);
  }
  if (!registry.level1SchemaVersion) {
    add('NS4_REGISTRY_LEVEL1_SCHEMA', 'level1SchemaVersion', 'level1SchemaVersion is required.');
  }
  const moduleNames = new Set<string>();
  const subtypes = new Set(level1Subtypes);
  registry.modules.forEach((block, index) => {
    const path = `modules[${index}]`;
    if (!block.moduleName) add('NS4_REGISTRY_MODULE_NAME', `${path}.moduleName`, 'moduleName is required.');
    if (block.moduleName && moduleNames.has(block.moduleName)) {
      add('NS4_REGISTRY_DUPLICATE_MODULE', `${path}.moduleName`, `Duplicate module block ${block.moduleName}.`);
    }
    if (block.moduleName) moduleNames.add(block.moduleName);
    const actorIds = new Set<string>();
    block.actors.forEach((actor, actorIndex) => {
      const actorPath = `${path}.actors[${actorIndex}]`;
      if (!actor.actorId) add('NS4_REGISTRY_ACTOR_ID', `${actorPath}.actorId`, 'actorId is required.');
      if (actor.actorId && actorIds.has(actor.actorId)) {
        add('NS4_REGISTRY_DUPLICATE_ACTOR', `${actorPath}.actorId`, `Duplicate actorId ${actor.actorId}.`);
      }
      if (actor.actorId) actorIds.add(actor.actorId);
      if (!actor.kind) add('NS4_REGISTRY_ACTOR_KIND', `${actorPath}.kind`, 'kind is required.');
    });
    const roles = new Set<string>();
    block.roles.forEach((role, roleIndex) => {
      const rolePath = `${path}.roles[${roleIndex}]`;
      if (!role.mdmSubtype || !subtypes.has(role.mdmSubtype)) {
        add('NS4_REGISTRY_UNKNOWN_SUBTYPE', `${rolePath}.mdmSubtype`, `mdmSubtype must be a level-1 subtype.`);
      }
      if (!role.role) add('NS4_REGISTRY_ROLE', `${rolePath}.role`, 'role is required.');
      if (role.role && roles.has(role.role)) {
        add('NS4_REGISTRY_DUPLICATE_ROLE', `${rolePath}.role`, `Duplicate role ${role.role}.`);
      }
      if (role.role) roles.add(role.role);
      if (!role.namespace) add('NS4_REGISTRY_NAMESPACE', `${rolePath}.namespace`, 'namespace is required.');
    });
    const fieldIds = new Set<string>();
    block.generalFields.forEach((field, fieldIndex) => {
      const fieldPath = `${path}.generalFields[${fieldIndex}]`;
      if (!field.fieldId) add('NS4_REGISTRY_GENERAL_FIELD', `${fieldPath}.fieldId`, 'fieldId is required.');
      if (field.fieldId && fieldIds.has(field.fieldId)) {
        add('NS4_REGISTRY_DUPLICATE_GENERAL_FIELD', `${fieldPath}.fieldId`, `Duplicate general field ${field.fieldId}.`);
      }
      if (field.fieldId) fieldIds.add(field.fieldId);
    });
    const entityIds = new Set<string>();
    (block.entities || []).forEach((entity, entityIndex) => {
      const entityPath = `${path}.entities[${entityIndex}]`;
      if (!entity.entityId) add('NS4_REGISTRY_ENTITY_ID', `${entityPath}.entityId`, 'entityId is required.');
      if (entity.entityId && entityIds.has(entity.entityId)) {
        add('NS4_REGISTRY_DUPLICATE_ENTITY', `${entityPath}.entityId`, `Duplicate entityId ${entity.entityId}.`);
      }
      if (entity.entityId) entityIds.add(entity.entityId);
      if (!entity.kind) add('NS4_REGISTRY_ENTITY_KIND', `${entityPath}.kind`, 'kind is required.');
    });
    const eventIds = new Set<string>();
    (block.events || []).forEach((event, eventIndex) => {
      const eventPath = `${path}.events[${eventIndex}]`;
      if (!event.eventId) add('NS4_REGISTRY_EVENT_ID', `${eventPath}.eventId`, 'eventId is required.');
      if (event.eventId && eventIds.has(event.eventId)) {
        add('NS4_REGISTRY_DUPLICATE_EVENT', `${eventPath}.eventId`, `Duplicate eventId ${event.eventId}.`);
      }
      if (event.eventId) eventIds.add(event.eventId);
      if (!event.on) add('NS4_REGISTRY_EVENT_ON', `${eventPath}.on`, 'on is required.');
    });
    if (!block.updatedAt) add('NS4_REGISTRY_UPDATED_AT', `${path}.updatedAt`, 'updatedAt is required.');
  });
  return { ok: issues.length === 0, issues };
}
