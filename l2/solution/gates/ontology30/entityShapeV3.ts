/// <mls fileReference="_102035_/l2/solution/gates/ontology30/entityShapeV3.ts" enhancement="_blank" />

import type {
  Ns5OntologyEntityV3Base,
  Ns5OntologyExternalV3,
  Ns5OntologyFieldV3,
  Ns5OntologyRelationshipV3,
  Ns5OntologyRoleV3,
  Ns5OntologyTableV3,
} from '/_102035_/l2/solution/types.js';

/**
 * l4_p4_170: the form of a stored v3 entity, level by level. A key outside the list of its level is read by no gate and no
 * generator, so a model that writes it (a `uniqueKeys` inside `storage`, a `when` in a unique key) is refused here and
 * not published. Each list is tied to the type of its level twice: every key listed must exist in the type
 * (`satisfies readonly (keyof …)[]`) and every key of the type must be listed (`Complete`), so the list cannot drift.
 * The compiler of the Studio checks the same form on a `.defs.ts`; this one runs where there is no compiler.
 */
type Complete<Type, List extends readonly PropertyKey[]> = Exclude<keyof Type, List[number]> extends never ? true : { missing: Exclude<keyof Type, List[number]> };

type TableStorage = Ns5OntologyTableV3['storage'];
type LifecycleState = NonNullable<Ns5OntologyEntityV3Base['lifecycleStates']>[number];
type Transition = NonNullable<Ns5OntologyEntityV3Base['transitions']>[number];
type EntityKey = keyof Ns5OntologyRoleV3 | keyof Ns5OntologyTableV3 | keyof Ns5OntologyExternalV3;

/** Every top-level property a v3 entity can carry (the three kinds together). */
export const ENTITY_V3_KEYS = [
  'schemaVersion', 'moduleName', 'entityId', 'title', 'description', 'displayField', 'record', 'uniqueKeys',
  'lifecycleStates', 'transitions', 'initialState', 'relationships', 'capabilities', 'rules', 'writer',
  'kind', 'subtype', 'roleTag', 'source', 'class', 'storage', 'initialData', 'connectionId',
] as const satisfies readonly EntityKey[];
const entityKeysComplete: Complete<{ [K in EntityKey]: unknown }, typeof ENTITY_V3_KEYS> = true;

export const STORAGE_V3_KEYS = ['target', 'table', 'kind', 'retentionDays', 'timeField'] as const satisfies readonly (keyof TableStorage)[];
const storageKeysComplete: Complete<TableStorage, typeof STORAGE_V3_KEYS> = true;

export const RECORD_V3_KEYS = ['fields'] as const satisfies readonly (keyof Ns5OntologyEntityV3Base['record'])[];
const recordKeysComplete: Complete<Ns5OntologyEntityV3Base['record'], typeof RECORD_V3_KEYS> = true;

export const FIELD_V3_KEYS = [
  'type', 'required', 'nullable', 'collection', 'of', 'to', 'values', 'fields', 'maxLength', 'pattern', 'min', 'max', 'default',
  'unique', 'indexed', 'derived', 'writePrecondition', 'title', 'description', 'owner', 'open', 'secret',
] as const satisfies readonly (keyof Ns5OntologyFieldV3)[];
const fieldKeysComplete: Complete<Ns5OntologyFieldV3, typeof FIELD_V3_KEYS> = true;

export const LIFECYCLE_STATE_V3_KEYS = ['state', 'reachedBy'] as const satisfies readonly (keyof LifecycleState)[];
const lifecycleKeysComplete: Complete<LifecycleState, typeof LIFECYCLE_STATE_V3_KEYS> = true;

export const TRANSITION_V3_KEYS = ['transitionId', 'from', 'to', 'by', 'description', 'payload', 'ruleRefs'] as const satisfies readonly (keyof Transition)[];
const transitionKeysComplete: Complete<Transition, typeof TRANSITION_V3_KEYS> = true;

export const RELATIONSHIP_V3_KEYS = [
  'relationshipId', 'to', 'via', 'mode', 'direction', 'role', 'roles', 'cardinality', 'required', 'derived', 'path', 'title', 'description', 'target',
] as const satisfies readonly (keyof Ns5OntologyRelationshipV3)[];
const relationshipKeysComplete: Complete<Ns5OntologyRelationshipV3, typeof RELATIONSHIP_V3_KEYS> = true;

void [entityKeysComplete, storageKeysComplete, recordKeysComplete, fieldKeysComplete, lifecycleKeysComplete, transitionKeysComplete, relationshipKeysComplete];

export interface EntityShapeIssueV3 {
  /** Relative to the entity: `storage.uniqueKeys`, `record.fields.details.fields.code.min`. Empty for the entity itself. */
  path: string;
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function keyIssues(entityId: string, level: string, value: unknown, allowed: readonly string[], path: string, out: EntityShapeIssueV3[]): void {
  if (!isRecord(value)) return;
  for (const key of Object.keys(value).filter(item => !allowed.includes(item))) {
    out.push({
      path: path ? `${path}.${key}` : key,
      message: `${key} is not a property of ${level} of the entity ${entityId}; no gate reads it. Allowed: ${allowed.join(', ')}.`,
    });
  }
}

function fieldIssues(entityId: string, fields: unknown, path: string, out: EntityShapeIssueV3[]): void {
  if (!isRecord(fields)) return;
  for (const [id, field] of Object.entries(fields)) {
    const where = `${path}.${id}`;
    keyIssues(entityId, `the field ${id}`, field, FIELD_V3_KEYS, where, out);
    if (isRecord(field)) fieldIssues(entityId, field.fields, `${where}.fields`, out);
  }
}

/** The deviations of form of one v3 entity artifact, each with its path and the keys its level allows. Never throws. */
export function entityShapeIssuesV3(entity: unknown): EntityShapeIssueV3[] {
  const out: EntityShapeIssueV3[] = [];
  if (!isRecord(entity)) return out;
  const entityId = typeof entity.entityId === 'string' ? entity.entityId : '?';
  keyIssues(entityId, 'the entity', entity, ENTITY_V3_KEYS, '', out);
  keyIssues(entityId, 'storage', entity.storage, STORAGE_V3_KEYS, 'storage', out);
  if (isRecord(entity.record)) {
    keyIssues(entityId, 'record', entity.record, RECORD_V3_KEYS, 'record', out);
    fieldIssues(entityId, entity.record.fields, 'record.fields', out);
  }
  if (Array.isArray(entity.uniqueKeys)) {
    entity.uniqueKeys.forEach((key, index) => {
      if (!Array.isArray(key) || key.some(id => typeof id !== 'string')) {
        out.push({
          path: `uniqueKeys[${index}]`,
          message: `A unique key of ${entityId} is a plain list of field ids, like ["<fieldId>", "<fieldId>"], with no other property; found ${JSON.stringify(key)}.`,
        });
      }
    });
  }
  if (Array.isArray(entity.lifecycleStates)) {
    entity.lifecycleStates.forEach((state, index) => keyIssues(entityId, 'a lifecycle state', state, LIFECYCLE_STATE_V3_KEYS, `lifecycleStates[${index}]`, out));
  }
  if (Array.isArray(entity.transitions)) {
    entity.transitions.forEach((transition, index) => keyIssues(entityId, 'a transition', transition, TRANSITION_V3_KEYS, `transitions[${index}]`, out));
  }
  if (isRecord(entity.relationships)) {
    for (const [id, relationship] of Object.entries(entity.relationships)) {
      keyIssues(entityId, `the relationship ${id}`, relationship, RELATIONSHIP_V3_KEYS, `relationships.${id}`, out);
    }
  }
  return out;
}
