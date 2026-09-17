/// <mls fileReference="_102035_/l2/solution/ontologyView.ts" enhancement="_blank"/>

/**
 * ONE reading of the module ontology for the steps AFTER `ontology30` (ns5_43 T1–T5).
 *
 * PURE ON PURPOSE, exactly like `ontologyPaths.ts` and `resolveMdmEntity.ts`: types only, no `node:*`,
 * no `mls.*`, no I/O. That is what lets an `l1` test import it, and therefore what puts it under
 * `tsconfig.backend.json` — `tsconfig.frontend.json` excludes `l2/**\/*.test.ts`, so an `l2` test alone
 * would be runner-checked and not compiler-checked.
 *
 * WHY IT EXISTS. `rules40`, `workflows50`, `access60`, `integration70` and `finalize80` each ran the same
 * eight lines: read `ontology/index.defs.ts` as `Ns5OntologyIndexArtifact`, walk `index.entities` as
 * `string[]`, read each entity as `Ns5OntologyEntityArtifact`. On a v3 module (`agendaClinica`)
 * `index.entities` is `[{ entityId, kind, subtype? , class? }]` and `index.relationships` carries
 * `from`/`to`/`mode` instead of `fromEntity`/`toEntity`/`persistence`, so all five broke at the same line
 * for the same reason. They now read through here and keep working on both forms.
 *
 * WHAT IT DOES NOT DO. It never invents a v2 shape for a v3 entity. A v3 `role` has no flat `fields`
 * list — its data is the MDM record's tree — so the view answers with `fieldRefs` (the `<Entity>.<path>`
 * set, the same one `resolvableFieldPaths` gives a disclosure) and `columnIds`, not with a fake `fields`.
 * The two derivations that ARE made, both asked for by ns5_43:
 *   `party`   v3 dropped it because `subtype` carries it: a `role` on `Person` is a person, on `Company`
 *             an organization, anything else `none`. finalize80 I8 reads this (T5: "I8 sobre `role`").
 *   `type`    a v3 index relationship states the cardinality (`manyToOne`), a v2 one the structural type.
 *             Both go into `type`; only `required` drives the access60 anchor walk.
 */

import {
  NS5_ONTOLOGY_SCHEMA_VERSION_V3,
  type Ns5OntologyAnyEntity,
  type Ns5OntologyEntityArtifact,
  type Ns5OntologyEntityV3,
  type Ns5OntologyFieldsV3,
  type Ns5OntologyIndexArtifact,
  type Ns5OntologyIndexV3,
  type Ns5OntologyRelationship,
} from '/_102035_/l2/solution/types.js';
import { resolvableFieldPaths } from '/_102035_/l2/solution/ontologyPaths.js';

/** The module ontology index in whichever form it was written. Discriminate on `schemaVersion`. */
export type Ns5OntologyAnyIndex = Ns5OntologyIndexArtifact | Ns5OntologyIndexV3;

/** One edge, as every step after ontology30 reads it. */
export interface Ns5OntologyEdgeView {
  relationshipId: string;
  fromEntity: string;
  toEntity: string;
  required: boolean;
  type: string;
}

/** One entity, as every step after ontology30 reads it. */
export interface Ns5OntologyEntityViewItem {
  entityId: string;
  title: string;
  description: string;
  /** v2: `core|event|supporting|mdm|valueObject`. v3: `role|entity`. */
  kind: string;
  /**
   * The same thing said in the v2 vocabulary, for the ontology30 helpers that branch on it and that
   * ns5_43 must NOT touch (`ns5ResolveEntityWriter`, `ns5EntityHasWrittenFields`): a v3 `role` IS what v2
   * called `kind: 'mdm'` — a papel over an MDM record — and a v3 table carries its `class`
   * (`core|event|supporting`), which is what v2 put in `kind`. On a v2 entity it IS `kind`.
   */
  writerKind: string;
  /** v2: declared. v3: derived from the subtype of a `role` (see the header). */
  party: 'person' | 'organization' | 'none' | string;
  /** v2 `mdmSubtype`, v3 `subtype` of a `role`. */
  mdmSubtype?: string;
  writer?: 'journey' | 'crud' | 'inbound';
  displayField: string;
  idField: string;
  /**
   * Copied into mutable arrays on purpose: the v3 types are `readonly`, the helpers that consume these
   * (`ns5SourceSccStates`, `ns5ReachableStates`, `Ns5RulesEntityView`) are in closed files, and the view
   * is a reading copy anyway.
   */
  uniqueKeys: string[][];
  lifecycleStates: Array<{ state: string; reachedBy: 'actor' | 'command' | 'time' }>;
  transitions: Array<{
    transitionId: string;
    from: string[];
    to: string;
    by: string[] | 'system' | 'time';
    description: string;
    ruleRefs?: string[];
  }>;
  /**
   * v2: the flat `fields` list, as written. v3: EMPTY — a role stores nothing but its namespace and its
   * data is the record tree, so `paths` is the resolvable set instead (ns5_40 T2). Kept on the view so a
   * step view that already asks for `fields`/`details`/`storage` (`Ns5AccessEntityView`,
   * `Ns5RulesEntityView`) is satisfied without each step growing its own mapping.
   */
  fields: ReadonlyArray<{ fieldId: string }>;
  details?: Record<string, unknown>;
  storage?: { idField: string };
  /** Every reference this entity resolves, `<Entity>` first, then `<Entity>.<path>` (ns5_40). */
  fieldRefs: readonly string[];
  /** Stored columns, without `details`. v2: `fields[]` ids plus the identity. finalize80 I9. */
  columnIds: readonly string[];
  /**
   * What THIS module writes on this entity. v2: its `fields[]`. v3 `role`: the keys of
   * `details.<moduleName>`, the only branch a module may write — a papel that stores nothing answers
   * with an empty list, which is the honest answer and what finalize80 I10 needs. v3 table: its columns
   * other than `version`, plus each `details.<name>`.
   */
  writtenFieldIds: readonly string[];
  /** v3 only. When present it REPLACES `fields`/`details` as the resolvable set (ns5_40 T2). */
  paths?: readonly string[];
  /** The file as it was written; a step that needs a v2-only key reaches for it deliberately. */
  source: Ns5OntologyAnyEntity;
}

export function isNs5OntologyV3Index(index: Ns5OntologyAnyIndex): index is Ns5OntologyIndexV3 {
  return index.schemaVersion === NS5_ONTOLOGY_SCHEMA_VERSION_V3;
}

export function isNs5OntologyV3Entity(entity: Ns5OntologyAnyEntity): entity is Ns5OntologyEntityV3 {
  return entity.schemaVersion === NS5_ONTOLOGY_SCHEMA_VERSION_V3;
}

/** The entity ids of the index, in declaration order — the file names the step has to open. */
export function ns5OntologyEntityIds(index: Ns5OntologyAnyIndex): string[] {
  if (isNs5OntologyV3Index(index)) return index.entities.map(row => row.entityId);
  return [...index.entities];
}

/** The edges of the index, whichever form declared them. */
export function ns5OntologyEdges(index: Ns5OntologyAnyIndex): Ns5OntologyEdgeView[] {
  if (isNs5OntologyV3Index(index)) {
    return index.relationships.map(row => ({
      relationshipId: row.relationshipId,
      fromEntity: row.from,
      toEntity: row.to,
      required: row.required,
      type: row.type,
    }));
  }
  return (index.relationships || []).map((row: Ns5OntologyRelationship) => ({
    relationshipId: row.relationshipId,
    fromEntity: row.fromEntity,
    toEntity: row.toEntity,
    required: row.required,
    type: row.type,
  }));
}

export function ns5OntologyEntityView(entity: Ns5OntologyAnyEntity): Ns5OntologyEntityViewItem {
  return isNs5OntologyV3Entity(entity) ? viewOfV3(entity) : viewOfV2(entity);
}

export function ns5OntologyEntityViews(entities: readonly Ns5OntologyAnyEntity[]): Ns5OntologyEntityViewItem[] {
  return entities.map(ns5OntologyEntityView);
}

export function ns5OntologyEntityViewOf(
  views: readonly Ns5OntologyEntityViewItem[],
  entityId: string,
): Ns5OntologyEntityViewItem | undefined {
  return views.find(view => view.entityId === entityId);
}

/**
 * `<Entity>` or `<Entity>.<path>` — what a journey `affects`, a rule or a grant may name (ns5_43 T1).
 * `root` is the entity id; `path` is '' when the reference is the whole record.
 */
export function splitNs5EntityRef(ref: string): { root: string; path: string } {
  const trimmed = (ref || '').trim();
  const dot = trimmed.indexOf('.');
  if (dot < 0) return { root: trimmed, path: '' };
  return { root: trimmed.slice(0, dot), path: trimmed.slice(dot + 1) };
}

/** True when the reference names this entity, or a node of it. */
export function ns5EntityRefResolves(view: Ns5OntologyEntityViewItem, ref: string): boolean {
  return view.fieldRefs.includes(ref.trim());
}

/**
 * The tree of a v3 record as prompt lines — `- path (type, required, derived): description`, depth first,
 * branches included. This is the ONLY honest rendering of an entity whose data is the platform document:
 * a v3 `role` has no flat `fields` list to print. Each step keeps its own v2 rendering verbatim (their
 * headers and `details` lines differ), so the eleven v2 modules see byte-identical prompts.
 */
export function ns5OntologyV3FieldLines(entity: Ns5OntologyEntityV3): string[] {
  return fieldLinesV3(entity.record.fields, '');
}

function fieldLinesV3(fields: Ns5OntologyFieldsV3 | undefined, parent: string): string[] {
  const lines: string[] = [];
  for (const [id, field] of Object.entries(fields ?? {})) {
    const path = parent ? `${parent}.${id}` : id;
    const marks = [
      field.type + (field.collection ? '[]' : ''),
      field.required ? 'required' : '',
      field.derived ? 'derived' : '',
    ].filter(Boolean).join(', ');
    lines.push(`- ${path} (${marks})${field.description ? `: ${field.description}` : ''}`);
    if (field.fields) lines.push(...fieldLinesV3(field.fields, path));
  }
  return lines;
}

function viewOfV2(entity: Ns5OntologyEntityArtifact): Ns5OntologyEntityViewItem {
  const columnIds = [
    ...(entity.storage?.idField ? [entity.storage.idField] : []),
    ...entity.fields.map(field => field.fieldId),
  ];
  return {
    entityId: entity.entityId,
    title: entity.title,
    description: entity.description,
    kind: entity.kind,
    writerKind: entity.kind,
    party: entity.party,
    ...(entity.mdmSubtype ? { mdmSubtype: entity.mdmSubtype } : {}),
    ...(entity.writer ? { writer: entity.writer } : {}),
    displayField: entity.displayField,
    idField: entity.storage?.idField || '',
    fields: entity.fields,
    ...(entity.details ? { details: entity.details as Record<string, unknown> } : {}),
    ...(entity.storage ? { storage: { idField: entity.storage.idField } } : {}),
    uniqueKeys: copyKeys(entity.uniqueKeys),
    lifecycleStates: [...(entity.lifecycleStates || [])],
    transitions: copyTransitions(entity.transitions),
    fieldRefs: resolvableFieldPaths(entity),
    columnIds: [...new Set(columnIds)],
    writtenFieldIds: entity.fields.map(field => field.fieldId),
    source: entity,
  };
}

function viewOfV3(entity: Ns5OntologyEntityV3): Ns5OntologyEntityViewItem {
  const subtype = entity.kind === 'role' ? entity.subtype : undefined;
  const party = entity.kind !== 'role' ? 'none'
    : subtype === 'Person' ? 'person'
    : subtype === 'Company' ? 'organization'
    : 'none';
  return {
    entityId: entity.entityId,
    title: entity.title,
    description: entity.description,
    kind: entity.kind,
    writerKind: entity.kind === 'role' ? 'mdm' : entity.class,
    party,
    ...(subtype ? { mdmSubtype: subtype } : {}),
    ...(entity.writer ? { writer: entity.writer } : {}),
    displayField: entity.displayField,
    idField: 'id',
    fields: [],
    storage: { idField: 'id' },
    uniqueKeys: copyKeys(entity.uniqueKeys),
    lifecycleStates: [...(entity.lifecycleStates || [])],
    transitions: copyTransitions(entity.transitions),
    fieldRefs: resolvableFieldPaths(entity),
    columnIds: Object.keys(entity.record.fields).filter(id => id !== 'details'),
    writtenFieldIds: writtenFieldIdsV3(entity),
    paths: resolvableFieldPaths(entity),
    source: entity,
  };
}

function writtenFieldIdsV3(entity: Ns5OntologyEntityV3): string[] {
  const branches = entity.record.fields.details?.fields ?? {};
  if (entity.kind === 'role') return Object.keys(branches[entity.moduleName]?.fields ?? {});
  return [
    ...Object.keys(entity.record.fields).filter(id => id !== 'details' && id !== 'version'),
    ...Object.keys(branches).map(name => `details.${name}`),
  ];
}

function copyKeys(keys: readonly (readonly string[])[] | undefined): string[][] {
  return (keys || []).map(key => [...key]);
}

function copyTransitions(
  transitions: Ns5OntologyEntityViewItem['transitions'] | Ns5OntologyEntityV3['transitions'] | undefined,
): Ns5OntologyEntityViewItem['transitions'] {
  return (transitions || []).map(transition => ({
    transitionId: transition.transitionId,
    from: [...transition.from],
    to: transition.to,
    by: Array.isArray(transition.by) ? [...transition.by] : transition.by as 'system' | 'time',
    description: transition.description,
    ...(transition.ruleRefs ? { ruleRefs: [...transition.ruleRefs] } : {}),
  }));
}
