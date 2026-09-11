/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/ontology30/gate.ts" enhancement="_blank"/>

import {
  entityIdField,
  level1FieldIds,
  level1IsSubtype,
  resolvableFieldIds,
  resolvableFieldOf,
} from '/_102035_/l2/solution/lib.js';
import type { Ns5JourneyArtifact, Ns5ModuleActor, Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';
import {
  NS5_ONTOLOGY_FIELD_TYPES,
  NS5_ONTOLOGY_KINDS,
  NS5_ONTOLOGY_PARTIES,
  NS5_ONTOLOGY_PERSISTENCE_MODES,
  NS5_ONTOLOGY_REACHED_BY,
  NS5_ONTOLOGY_REALIZATION_KINDS,
  NS5_ONTOLOGY_RELATIONSHIP_TYPES,
  NS5_ONTOLOGY_STORAGE_TARGETS,
  assembleNs5Ontology,
  collectNs5CitedEntities,
  type Ns5OntologyAssembly,
  type Ns5OntologyBindingsDraft,
  type Ns5OntologyEntityDraft,
  type Ns5OntologyPlanDraft,
  type Ns5OntologyRealizationKind,
} from '/_102035_/l2/agentNewSolution5/steps/ontology30/contracts.js';

const MODULE_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const MDM_TYPE = /^[a-z][A-Za-z0-9]*\.[A-Z][A-Za-z0-9]*$/;
const STABLE_EN = /^[a-z][a-zA-Z0-9]*$/;

const KIND_SET = new Set<string>(NS5_ONTOLOGY_KINDS);
const PARTY_SET = new Set<string>(NS5_ONTOLOGY_PARTIES);
const FIELD_TYPE_SET = new Set<string>(NS5_ONTOLOGY_FIELD_TYPES);
const TARGET_SET = new Set<string>(NS5_ONTOLOGY_STORAGE_TARGETS);
const REL_TYPE_SET = new Set<string>(NS5_ONTOLOGY_RELATIONSHIP_TYPES);
const PERSISTENCE_SET = new Set<string>(NS5_ONTOLOGY_PERSISTENCE_MODES);
const REALIZATION_SET = new Set<string>(NS5_ONTOLOGY_REALIZATION_KINDS);
const REACHED_BY_SET = new Set<string>(NS5_ONTOLOGY_REACHED_BY);

const MDM_ENDPOINT_KINDS = new Set<string>(['fieldReference', 'fieldCollection', 'mdmRelationship']);

export interface Ns5OntologyGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface Ns5OntologyGateResult {
  ok: boolean;
  issues: Ns5OntologyGateIssue[];
  uncitedEntities: string[];
}

export interface Ns5OntologyGateContext {
  moduleName: string;
  actors: readonly Ns5ModuleActor[];
  journeys?: ReadonlyArray<Pick<Ns5JourneyArtifact, 'business'>>;
  planOverview?: boolean;
  requireRelationshipRealization?: boolean;
  requireJourneyCitation?: boolean;
}

export function validateNs5OntologyPlan(
  plan: Ns5OntologyPlanDraft,
  context: Ns5OntologyGateContext,
): Ns5OntologyGateResult {
  const assembled = assembleNs5Ontology(plan, plan.entities.map(entity => ({
    entityId: entity.entityId,
    fields: [],
    lifecycleStates: [],
    transitions: [],
  })));
  return validateNs5OntologyAssembly(assembled, {
    ...context,
    planOverview: true,
    requireRelationshipRealization: false,
  });
}

export function validateNs5OntologyEntity(
  plan: Ns5OntologyPlanDraft,
  detail: Ns5OntologyEntityDraft,
  context: Ns5OntologyGateContext,
): Ns5OntologyGateResult {
  const issues: Ns5OntologyGateIssue[] = [];
  if (!plan.entities.some(entity => entity.entityId === detail.entityId)) {
    error(issues, 'NS5_ONTOLOGY_ENTITY_UNKNOWN', `Entity ${detail.entityId} is not in the ontology plan.`, 'entityId');
    return result(issues);
  }
  const assembled = assembleNs5Ontology(
    { ...plan, entities: plan.entities.filter(entity => entity.entityId === detail.entityId), relationships: [] },
    [detail],
  );
  return validateNs5OntologyAssembly(assembled, {
    ...context,
    planOverview: false,
    requireRelationshipRealization: false,
    requireJourneyCitation: false,
  });
}

export function validateNs5OntologyBindings(
  plan: Ns5OntologyPlanDraft,
  details: Ns5OntologyEntityDraft[],
  bindings: Ns5OntologyBindingsDraft,
  context: Ns5OntologyGateContext,
): Ns5OntologyGateResult {
  const issues: Ns5OntologyGateIssue[] = [];
  const expected = new Set(plan.relationships.map(item => item.relationshipId));
  const seen = new Set<string>();
  bindings.bindings.forEach((binding, index) => {
    const path = `bindings[${index}].relationshipId`;
    if (!expected.has(binding.relationshipId)) {
      error(issues, 'NS5_ONTOLOGY_BINDING_UNKNOWN', `Unknown relationship ${binding.relationshipId}.`, path);
    }
    if (seen.has(binding.relationshipId)) {
      error(issues, 'NS5_ONTOLOGY_BINDING_DUPLICATE', `Duplicate binding for ${binding.relationshipId}.`, path);
    }
    seen.add(binding.relationshipId);
  });
  expected.forEach(relationshipId => {
    if (!seen.has(relationshipId)) {
      error(issues, 'NS5_ONTOLOGY_BINDING_MISSING', `Missing binding for ${relationshipId}.`, 'bindings');
    }
  });
  if (issues.length) return result(issues);
  const assembled = assembleNs5Ontology(plan, details, bindings);
  return validateNs5OntologyAssembly(assembled, {
    ...context,
    planOverview: false,
    requireRelationshipRealization: true,
  });
}

export function validateNs5OntologyAssembly(
  assembled: Ns5OntologyAssembly,
  context: Ns5OntologyGateContext,
): Ns5OntologyGateResult {
  const issues: Ns5OntologyGateIssue[] = [];
  const { entities, index } = assembled;
  const actorIds = new Set(context.actors.map(actor => actor.actorId).filter(Boolean));
  const planOverview = context.planOverview === true;
  const requireRealization = context.requireRelationshipRealization !== false && !planOverview;
  const requireJourneyCitation = context.requireJourneyCitation !== false;

  if (context.moduleName && !MODULE_ID.test(context.moduleName)) {
    error(issues, 'NS5_ONTOLOGY_MODULE_ID', 'moduleName must be a lowerCamel identifier.', 'moduleName');
  }
  if (!index.businessDomain.trim()) {
    error(issues, 'NS5_ONTOLOGY_BUSINESS_DOMAIN', 'businessDomain is required.', 'businessDomain');
  }
  if (!entities.length) {
    error(issues, 'NS5_ONTOLOGY_NONE', 'At least one ontology entity is required.', 'entities');
  }

  const entityIds = new Set<string>();
  entities.forEach((entity, entityIndex) => {
    validateEntity(entity, context.moduleName || index.moduleName, actorIds, planOverview, `entities[${entityIndex}]`, issues);
    if (entity.entityId) {
      if (entityIds.has(entity.entityId)) {
        error(issues, 'NS5_ONTOLOGY_ENTITY_DUPLICATE', `Duplicate entityId ${entity.entityId}.`, `entities[${entityIndex}].entityId`);
      }
      entityIds.add(entity.entityId);
    }
  });

  const relationshipIds = new Set<string>();
  index.relationships.forEach((relationship, indexPosition) => {
    const path = `relationships[${indexPosition}]`;
    if (!MEMBER_ID.test(relationship.relationshipId)) {
      error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_ID', 'relationshipId must be lowerCamel.', `${path}.relationshipId`);
    }
    if (relationship.relationshipId && relationshipIds.has(relationship.relationshipId)) {
      error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_DUPLICATE', `Duplicate relationship ${relationship.relationshipId}.`, `${path}.relationshipId`);
    }
    if (relationship.relationshipId) relationshipIds.add(relationship.relationshipId);
    if (!entityIds.has(relationship.fromEntity)) {
      error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_FROM', `Unknown entity ${relationship.fromEntity}.`, `${path}.fromEntity`);
    }
    if (!entityIds.has(relationship.toEntity)) {
      error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_TO', `Unknown entity ${relationship.toEntity}.`, `${path}.toEntity`);
    }
    if (!REL_TYPE_SET.has(relationship.type)) {
      error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_TYPE', 'type must be oneToOne, oneToMany, manyToOne or manyToMany.', `${path}.type`);
    }
    if (!PERSISTENCE_SET.has(relationship.persistence.mode)) {
      error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_PERSISTENCE', 'Unknown persistence mode.', `${path}.persistence.mode`);
    }
    if (requireRealization) {
      validateRelationshipRealization(entities, relationship, path, issues);
    }
  });

  const cited = collectNs5CitedEntities(context.journeys || []);
  const uncitedEntities = requireJourneyCitation
    ? [...entityIds].filter(entityId => !cited.has(entityId)).sort()
    : [];
  if (requireJourneyCitation) {
    cited.forEach(entityId => {
      if (!entityIds.has(entityId)) {
        error(issues, 'NS5_ONTOLOGY_JOURNEY_ENTITY', `Journey business object ${entityId} has no ontology entity.`, 'entities');
      }
    });
    uncitedEntities.forEach(entityId => {
      warning(issues, 'NS5_ONTOLOGY_ENTITY_UNCITED', `Entity ${entityId} is not cited by any journey step entity or affects.`, 'entities');
    });
  }

  return result(issues, uncitedEntities);
}

export function formatNs5OntologyGate(issues: Ns5OntologyGateIssue[]): string {
  return issues
    .filter(issue => issue.severity === 'error')
    .map(issue => {
      const where = issue.path ? ` ${issue.path}` : '';
      return `${issue.code}${where}: ${issue.message}`;
    })
    .join('\n');
}

function validateEntity(
  entity: Ns5OntologyEntityArtifact,
  moduleName: string,
  actorIds: Set<string>,
  planOverview: boolean,
  path: string,
  issues: Ns5OntologyGateIssue[],
): void {
  if (!ENTITY_ID.test(entity.entityId)) {
    error(issues, 'NS5_ONTOLOGY_ENTITY_ID', 'entityId must be a PascalCase business noun.', `${path}.entityId`);
  }
  if (!entity.title.trim()) error(issues, 'NS5_ONTOLOGY_ENTITY_TITLE', 'Entity title is required.', `${path}.title`);
  if (!entity.description.trim()) {
    error(issues, 'NS5_ONTOLOGY_ENTITY_DESCRIPTION', 'Entity description is required.', `${path}.description`);
  }
  if (!KIND_SET.has(entity.kind)) {
    error(issues, 'NS5_ONTOLOGY_ENTITY_KIND', "kind must be core, event, supporting, mdm or valueObject. projection is not a kind.", `${path}.kind`);
  }
  if (!PARTY_SET.has(entity.party)) {
    error(issues, 'NS5_ONTOLOGY_ENTITY_PARTY', "party must be person, organization or none.", `${path}.party`);
  }
  if (entity.party !== 'none' && entity.kind !== 'mdm') {
    error(issues, 'NS5_ONTOLOGY_PARTY_STORAGE', `A ${entity.party} is master data: use kind mdm and storage.target mdm.`, `${path}.kind`);
  }

  const fieldIds = new Set<string>();
  entity.fields.forEach((field, fieldIndex) => {
    const fieldPath = `${path}.fields[${fieldIndex}]`;
    if (!MEMBER_ID.test(field.fieldId)) {
      error(issues, 'NS5_ONTOLOGY_FIELD_ID', 'fieldId must be lowerCamel.', `${fieldPath}.fieldId`);
    }
    if (field.fieldId && fieldIds.has(field.fieldId)) {
      error(issues, 'NS5_ONTOLOGY_FIELD_DUPLICATE', `Duplicate field ${field.fieldId}.`, `${fieldPath}.fieldId`);
    }
    if (field.fieldId) fieldIds.add(field.fieldId);
    if (!field.title.trim()) error(issues, 'NS5_ONTOLOGY_FIELD_TITLE', 'Field title is required.', `${fieldPath}.title`);
    if (!field.description.trim()) {
      error(issues, 'NS5_ONTOLOGY_FIELD_DESCRIPTION', 'Field description is required.', `${fieldPath}.description`);
    }
    if (!FIELD_TYPE_SET.has(field.type)) {
      error(issues, 'NS5_ONTOLOGY_FIELD_TYPE', `Unknown field type ${field.type || '(empty)'}.`, `${fieldPath}.type`);
    }
    (field.enum || []).forEach((code, enumIndex) => {
      if (!STABLE_EN.test(code)) {
        error(issues, 'NS5_ONTOLOGY_ENUM_CODE', `Closed-domain value must be lowerCamel ASCII (got '${code}').`, `${fieldPath}.enum[${enumIndex}]`);
      }
    });
  });

  if (!planOverview && !entity.fields.length && entity.kind !== 'mdm') {
    error(issues, 'NS5_ONTOLOGY_ENTITY_FIELDS', 'Every non-mdm entity must define its useful fields.', `${path}.fields`);
  }

  const expectedTarget = entity.kind === 'mdm' ? 'mdm' : entity.storage.target;
  if (entity.kind === 'mdm' && entity.storage.target !== 'mdm') {
    error(issues, 'NS5_ONTOLOGY_STORAGE_TARGET', 'kind mdm must use storage.target mdm.', `${path}.storage.target`);
  } else if (entity.kind !== 'mdm' && entity.storage.target === 'mdm') {
    error(issues, 'NS5_ONTOLOGY_STORAGE_TARGET', 'Only kind mdm may use storage.target mdm.', `${path}.storage.target`);
  } else if (!TARGET_SET.has(entity.storage.target)) {
    error(issues, 'NS5_ONTOLOGY_STORAGE_TARGET', 'storage.target must be moduleDatabase, mdm or external.', `${path}.storage.target`);
  }

  const expectedScope = expectedTarget === 'mdm' ? 'organization'
    : expectedTarget === 'moduleDatabase' ? 'module'
    : expectedTarget === 'external' ? 'platform'
    : '';
  if (expectedScope && entity.storage.scope !== expectedScope) {
    error(issues, 'NS5_ONTOLOGY_STORAGE_SCOPE', `${expectedTarget} storage must use scope ${expectedScope}.`, `${path}.storage.scope`);
  }

  if (entity.storage.target === 'mdm' || entity.storage.target === 'moduleDatabase') {
    if (!entity.storage.idField || !MEMBER_ID.test(entity.storage.idField)) {
      error(issues, 'NS5_ONTOLOGY_STORAGE_ID_FIELD', 'Stored entities must name a lowerCamel idField.', `${path}.storage.idField`);
    } else if (!planOverview) {
      const idField = entity.fields.find(field => field.fieldId === entity.storage.idField);
      if (entity.kind === 'mdm') {
        if (idField) {
          error(
            issues,
            'NS5_ONTOLOGY_MDM_ID_IN_FIELDS',
            `mdm identity ${entity.storage.idField} lives in storage.idField and must not be redeclared in fields[].`,
            `${path}.fields`,
          );
        }
      } else if (!idField || !idField.required || idField.type !== 'uuid') {
        error(issues, 'NS5_ONTOLOGY_STORAGE_ID_FIELD', 'Stored entities must name an existing required uuid idField.', `${path}.storage.idField`);
      }
    }
  }

  if (entity.kind === 'mdm') {
    validateMdm(entity, moduleName, planOverview, path, issues);
  } else if (entity.storage.mdmType) {
    error(issues, 'NS5_ONTOLOGY_MDM_TYPE_UNUSED', 'Only MDM entities may declare mdmType.', `${path}.storage.mdmType`);
  } else if (entity.mdmSubtype) {
    error(issues, 'NS5_ONTOLOGY_MDM_SUBTYPE_UNKNOWN', 'mdmSubtype is only valid on kind mdm.', `${path}.mdmSubtype`);
  }

  if (!entity.displayField) {
    error(issues, 'NS5_ONTOLOGY_DISPLAY_FIELD', 'Every entity must name displayField.', `${path}.displayField`);
  } else if (!planOverview && !displayFieldExists(entity)) {
    error(
      issues,
      'NS5_ONTOLOGY_DISPLAY_FIELD',
      `displayField '${entity.displayField}' is not a field of ${entity.entityId}${entity.kind === 'mdm' && entity.mdmSubtype ? ` or of level-1 ${entity.mdmSubtype}` : ''}.`,
      `${path}.displayField`,
    );
  }

  if (entity.mutability && entity.mutability !== 'appendOnly') {
    error(issues, 'NS5_ONTOLOGY_MUTABILITY', "mutability is omitted when editable, or 'appendOnly'.", `${path}.mutability`);
  }
  if (entity.mutability === 'appendOnly' && entity.kind === 'mdm') {
    error(issues, 'NS5_ONTOLOGY_MUTABILITY', "mutability 'appendOnly' contradicts kind mdm.", `${path}.mutability`);
  }

  if (!planOverview) {
    validateDetails(entity, path, issues);
    validateLifecycle(entity, actorIds, path, issues);
  }
}

function validateMdm(
  entity: Ns5OntologyEntityArtifact,
  moduleName: string,
  planOverview: boolean,
  path: string,
  issues: Ns5OntologyGateIssue[],
): void {
  if (!entity.mdmSubtype) {
    error(issues, 'NS5_ONTOLOGY_MDM_SUBTYPE_REQUIRED', `MDM entity ${entity.entityId} must declare mdmSubtype from the platform level-1 catalog.`, `${path}.mdmSubtype`);
  } else if (!level1IsSubtype(entity.mdmSubtype)) {
    error(issues, 'NS5_ONTOLOGY_MDM_SUBTYPE_UNKNOWN', `mdmSubtype '${entity.mdmSubtype}' is not a platform level-1 subtype.`, `${path}.mdmSubtype`);
  } else {
    const expectedSubtype = entity.party === 'person' ? 'Person'
      : entity.party === 'organization' ? 'Company'
      : undefined;
    if (expectedSubtype && entity.mdmSubtype !== expectedSubtype) {
      error(issues, 'NS5_ONTOLOGY_MDM_SUBTYPE_PARTY', `party '${entity.party}' requires mdmSubtype '${expectedSubtype}', not '${entity.mdmSubtype}'.`, `${path}.mdmSubtype`);
    }
    if (entity.party === 'none' && (entity.mdmSubtype === 'Person' || entity.mdmSubtype === 'Company')) {
      error(issues, 'NS5_ONTOLOGY_MDM_SUBTYPE_PARTY', `mdmSubtype '${entity.mdmSubtype}' requires party '${entity.mdmSubtype === 'Person' ? 'person' : 'organization'}', not 'none'.`, `${path}.party`);
    }
    if (!planOverview) {
      const baseIds = level1FieldIds(entity.mdmSubtype);
      entity.fields.forEach((field, fieldIndex) => {
        if (!baseIds.has(field.fieldId)) return;
        error(
          issues,
          'NS5_ONTOLOGY_MDM_BASE_FIELD',
          `Field '${field.fieldId}' belongs to level-1 ${entity.mdmSubtype} and must not be redeclared on this module entity.`,
          `${path}.fields[${fieldIndex}].fieldId`,
        );
      });
    }
  }
  const expectedType = `${moduleName}.${entity.entityId}`;
  if (!entity.storage.mdmType || !MDM_TYPE.test(entity.storage.mdmType)) {
    error(issues, 'NS5_ONTOLOGY_MDM_TYPE', 'MDM entities require mdmType in lowerCamelModule.PascalEntity form.', `${path}.storage.mdmType`);
  } else if (moduleName && entity.storage.mdmType !== expectedType) {
    error(issues, 'NS5_ONTOLOGY_MDM_TYPE_MODULE', `Module-owned MDM type must be ${expectedType}.`, `${path}.storage.mdmType`);
  }
  if (entity.lifecycleStates.length || entity.transitions.length) {
    error(issues, 'NS5_ONTOLOGY_MDM_LIFECYCLE', `MDM entity ${entity.entityId} must not declare module lifecycle or transitions.`, `${path}.lifecycleStates`);
  }
}

function validateDetails(
  entity: Ns5OntologyEntityArtifact,
  path: string,
  issues: Ns5OntologyGateIssue[],
): void {
  const details = entity.details || {};
  const names = new Set<string>();
  for (const [name, description] of Object.entries(details)) {
    if (!MEMBER_ID.test(name)) {
      error(issues, 'NS5_ONTOLOGY_DETAILS_ID', 'details names must be lowerCamel.', `${path}.details.${name}`);
    }
    if (names.has(name)) {
      error(issues, 'NS5_ONTOLOGY_DETAILS_ID', `Duplicate details name ${name}.`, `${path}.details.${name}`);
    }
    names.add(name);
    if (!String(description || '').trim()) {
      error(issues, 'NS5_ONTOLOGY_DETAILS_DESCRIPTION', `details.${name} needs a one-sentence description.`, `${path}.details.${name}`);
    }
  }
}

function validateLifecycle(
  entity: Ns5OntologyEntityArtifact,
  actorIds: Set<string>,
  path: string,
  issues: Ns5OntologyGateIssue[],
): void {
  if (entity.mutability === 'appendOnly' && (entity.lifecycleStates.length || entity.transitions.length)) {
    error(issues, 'NS5_ONTOLOGY_MUTABILITY_LIFECYCLE', `appendOnly ${entity.entityId} has no lifecycle or transitions.`, `${path}.lifecycleStates`);
    return;
  }
  if (entity.kind === 'mdm') return;

  const stateIds = new Set<string>();
  entity.lifecycleStates.forEach((entry, index) => {
    const statePath = `${path}.lifecycleStates[${index}]`;
    if (!MEMBER_ID.test(entry.state) || !STABLE_EN.test(entry.state)) {
      error(issues, 'NS5_ONTOLOGY_LIFECYCLE_STATE', `Lifecycle state must be a stable English lowerCamel code (got '${entry.state}').`, `${statePath}.state`);
    }
    if (entry.state && stateIds.has(entry.state)) {
      error(issues, 'NS5_ONTOLOGY_LIFECYCLE_STATE', `Duplicate lifecycle state ${entry.state}.`, `${statePath}.state`);
    }
    if (entry.state) stateIds.add(entry.state);
    if (!REACHED_BY_SET.has(entry.reachedBy)) {
      error(issues, 'NS5_ONTOLOGY_LIFECYCLE_REACHED_BY', "reachedBy must be actor, command or time.", `${statePath}.reachedBy`);
    }
  });

  if (entity.lifecycleStates.length && !entity.fields.some(field => field.fieldId === 'status')) {
    error(issues, 'NS5_ONTOLOGY_LIFECYCLE_STATUS', 'An entity with lifecycle states must define a status field.', `${path}.lifecycleStates`);
  }
  const statusField = entity.fields.find(field => field.fieldId === 'status');
  if (statusField?.enum?.length && entity.lifecycleStates.length) {
    const expected = [...stateIds];
    const actual = statusField.enum;
    if (expected.length !== actual.length || expected.some(state => !actual.includes(state))) {
      error(issues, 'NS5_ONTOLOGY_LIFECYCLE_STATUS', 'status.enum must list exactly the lifecycle state ids.', `${path}.fields`);
    }
  }

  const transitionIds = new Set<string>();
  const incoming = new Set<string>();
  entity.transitions.forEach((transition, index) => {
    const tPath = `${path}.transitions[${index}]`;
    if (!MEMBER_ID.test(transition.transitionId)) {
      error(issues, 'NS5_ONTOLOGY_TRANSITION_ID', 'transitionId must be lowerCamel.', `${tPath}.transitionId`);
    }
    if (transition.transitionId && transitionIds.has(transition.transitionId)) {
      error(issues, 'NS5_ONTOLOGY_TRANSITION_ID', `Duplicate transition ${transition.transitionId}.`, `${tPath}.transitionId`);
    }
    if (transition.transitionId) transitionIds.add(transition.transitionId);
    if (!transition.from.length) {
      error(issues, 'NS5_ONTOLOGY_TRANSITION_FROM', 'Transition needs at least one from state.', `${tPath}.from`);
    }
    transition.from.forEach((state, fromIndex) => {
      if (!stateIds.has(state)) {
        error(issues, 'NS5_ONTOLOGY_TRANSITION_FROM', `Unknown from state ${state}.`, `${tPath}.from[${fromIndex}]`);
      }
    });
    if (!transition.to) {
      error(issues, 'NS5_ONTOLOGY_TRANSITION_TO', 'Transition needs a to state.', `${tPath}.to`);
    } else if (!stateIds.has(transition.to)) {
      error(issues, 'NS5_ONTOLOGY_TRANSITION_TO', `Unknown to state ${transition.to}.`, `${tPath}.to`);
    } else {
      incoming.add(transition.to);
    }
    if (!transition.description.trim()) {
      error(issues, 'NS5_ONTOLOGY_TRANSITION_ID', 'Transition description is required.', `${tPath}.description`);
    }
    validateTransitionBy(transition.by, actorIds, tPath, issues);
  });

  const actorCommand = entity.lifecycleStates.filter(entry => entry.reachedBy !== 'time');
  if (actorCommand.length > 1 && !entity.transitions.length) {
    error(issues, 'NS5_ONTOLOGY_STATE_UNREACHABLE', `${entity.entityId} names more than one actor/command state and no allowed transitions.`, `${path}.transitions`);
  }
  const usedFrom = new Set(entity.transitions.flatMap(transition => transition.from));
  const births = actorCommand
    .filter(entry => !incoming.has(entry.state) && usedFrom.has(entry.state))
    .map(entry => entry.state);
  const roots = births.length ? births : actorCommand.filter(entry => !incoming.has(entry.state)).map(entry => entry.state);
  const reached = reachableStates(roots, entity.transitions);
  actorCommand.forEach((entry, index) => {
    const isBirth = !incoming.has(entry.state) && (usedFrom.has(entry.state) || !entity.transitions.length);
    if (isBirth) return;
    if (!reached.has(entry.state)) {
      error(
        issues,
        'NS5_ONTOLOGY_STATE_UNREACHABLE',
        `actor/command state ${entity.entityId}.${entry.state} has no transition that reaches it.`,
        `${path}.lifecycleStates[${index}]`,
      );
    }
  });
  entity.lifecycleStates.forEach((entry, index) => {
    if (entry.reachedBy !== 'time') return;
    if (incoming.has(entry.state)) {
      error(
        issues,
        'NS5_ONTOLOGY_TIME_TRANSITION',
        `reachedBy time on ${entity.entityId}.${entry.state} is computed on read and must not have a transition that arrives at it.`,
        `${path}.lifecycleStates[${index}]`,
      );
    }
  });
}

function validateTransitionBy(
  by: Ns5OntologyEntityArtifact['transitions'][number]['by'],
  actorIds: Set<string>,
  path: string,
  issues: Ns5OntologyGateIssue[],
): void {
  if (by === 'system' || by === 'time') return;
  if (!Array.isArray(by) || !by.length) {
    error(issues, 'NS5_ONTOLOGY_TRANSITION_BY', "by must be actor ids, 'system' or 'time'.", `${path}.by`);
    return;
  }
  by.forEach((actorId, index) => {
    if (!MEMBER_ID.test(actorId)) {
      error(issues, 'NS5_ONTOLOGY_TRANSITION_BY', 'by actor ids must be lowerCamel.', `${path}.by[${index}]`);
    } else if (!actorIds.has(actorId)) {
      error(issues, 'NS5_ONTOLOGY_TRANSITION_BY_UNKNOWN', `Unknown actor ${actorId}.`, `${path}.by[${index}]`);
    }
  });
}

function reachableStates(
  roots: string[],
  transitions: Ns5OntologyEntityArtifact['transitions'],
): Set<string> {
  const seen = new Set(roots);
  const queue = [...roots];
  while (queue.length) {
    const current = queue.shift()!;
    for (const transition of transitions) {
      if (!transition.from.includes(current) || seen.has(transition.to)) continue;
      seen.add(transition.to);
      queue.push(transition.to);
    }
  }
  return seen;
}

function validateRelationshipRealization(
  entities: Ns5OntologyEntityArtifact[],
  relationship: Ns5OntologyAssembly['index']['relationships'][number],
  path: string,
  issues: Ns5OntologyGateIssue[],
): void {
  const realization = relationship.realization;
  const rPath = `${path}.realization`;
  if (!realization || !realization.kind) {
    error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_REALIZATION', 'Every final relationship must identify the fields that realize it.', rPath);
    return;
  }
  if (realization.from.entityId !== relationship.fromEntity) {
    error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_FROM_BINDING', `Expected ${relationship.fromEntity}.`, `${rPath}.from.entityId`);
  }
  if (realization.to.entityId !== relationship.toEntity) {
    error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_TO_BINDING', `Expected ${relationship.toEntity}.`, `${rPath}.to.entityId`);
  }
  if (realization.ownerEntity !== relationship.fromEntity && realization.ownerEntity !== relationship.toEntity) {
    error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_OWNER', 'ownerEntity must be one of the relationship endpoints.', `${rPath}.ownerEntity`);
  }
  const allowed = expectedRealizationKinds(relationship.persistence.mode);
  if (!allowed.includes(realization.kind as Ns5OntologyRealizationKind) || !REALIZATION_SET.has(realization.kind)) {
    error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_REALIZATION_KIND', `${relationship.persistence.mode} must use ${allowed.join(' or ')}, not ${realization.kind}.`, `${rPath}.kind`);
  }
  const fromEntity = entities.find(item => item.entityId === relationship.fromEntity);
  const toEntity = entities.find(item => item.entityId === relationship.toEntity);
  validateEndpointFields(realization.from.fieldIds, resolvableFieldIds(fromEntity), `${rPath}.from.fieldIds`, issues);
  validateEndpointFields(realization.to.fieldIds, resolvableFieldIds(toEntity), `${rPath}.to.fieldIds`, issues);
  validateMdmEndpointFields(fromEntity, realization.from.fieldIds, realization.kind, `${rPath}.from.fieldIds`, issues);
  validateMdmEndpointFields(toEntity, realization.to.fieldIds, realization.kind, `${rPath}.to.fieldIds`, issues);
  if (!realization.from.fieldIds.length || !realization.to.fieldIds.length) {
    error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_FIELDS_REQUIRED', 'A persisted relationship must name at least one existing field at each endpoint.', rPath);
  }
  if (relationship.required) {
    const owner = realization.ownerEntity === relationship.fromEntity ? fromEntity : toEntity;
    const ownerFields = realization.ownerEntity === relationship.fromEntity
      ? realization.from.fieldIds : realization.to.fieldIds;
    if (ownerFields.some(fieldId => !resolvableFieldOf(owner, fieldId)?.required)) {
      error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_REQUIRED_FIELD', 'A required relationship must use required field(s) on its owning entity.', `${rPath}.ownerEntity`);
    }
  }
}

function expectedRealizationKinds(mode: string): Ns5OntologyRealizationKind[] {
  if (mode === 'mdmRelationship') return ['mdmRelationship'];
  if (mode === 'externalReference') return ['externalReference'];
  return ['fieldReference', 'fieldCollection'];
}

function validateEndpointFields(
  fieldIds: string[],
  available: Set<string>,
  path: string,
  issues: Ns5OntologyGateIssue[],
): void {
  const seen = new Set<string>();
  fieldIds.forEach(fieldId => {
    if (seen.has(fieldId)) error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_FIELD_DUPLICATE', `Duplicate field ${fieldId}.`, path);
    if (!available.has(fieldId)) error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_FIELD_UNKNOWN', `Unknown field ${fieldId}.`, path);
    seen.add(fieldId);
  });
}

function validateMdmEndpointFields(
  entity: Ns5OntologyEntityArtifact | undefined,
  fieldIds: string[],
  kind: string,
  path: string,
  issues: Ns5OntologyGateIssue[],
): void {
  if (!entity || entity.kind !== 'mdm') return;
  if (!MDM_ENDPOINT_KINDS.has(kind)) return;
  if (!fieldIds.length) return;
  const idField = entityIdField(entity);
  if (fieldIds.length === 1 && idField && fieldIds[0] === idField) return;
  error(issues, 'NS5_ONTOLOGY_RELATIONSHIP_MDM_ENDPOINT_ID', `mdm endpoint ${entity.entityId} must bind exactly [${idField}].`, path);
}

function displayFieldExists(entity: Ns5OntologyEntityArtifact): boolean {
  if (entity.fields.some(field => field.fieldId === entity.displayField)) return true;
  if (entity.kind === 'mdm' && entity.mdmSubtype && level1IsSubtype(entity.mdmSubtype)) {
    return level1FieldIds(entity.mdmSubtype).has(entity.displayField);
  }
  return false;
}

function error(issues: Ns5OntologyGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, ...(path ? { path } : {}) });
}

function warning(issues: Ns5OntologyGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'warning', code, message, ...(path ? { path } : {}) });
}

function result(issues: Ns5OntologyGateIssue[], uncitedEntities: string[] = []): Ns5OntologyGateResult {
  return { ok: !issues.some(issue => issue.severity === 'error'), issues, uncitedEntities };
}
