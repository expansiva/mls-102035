/// <mls fileReference="_102035_/l2/newRelease/widgets/ontologyModel.ts" enhancement="_blank" />

import type {
  Ns5OntologyEntityArtifact,
  Ns5OntologyField,
  Ns5OntologyFieldConstraints,
  Ns5OntologyIndexArtifact,
  Ns5OntologyRelationship,
} from '../../solution/types.js';
import type { NewReleaseValidationIssue } from '../tobe.js';

export const ONTOLOGY_FIELD_TYPES: Ns5OntologyField['type'][] = [
  'uuid', 'string', 'text', 'number', 'integer', 'boolean', 'money', 'date', 'datetime', 'json',
];

export const ONTOLOGY_DETAIL_NAME = /^[a-z][A-Za-z0-9]*$/u;
export const ONTOLOGY_ENUM_VALUE = /^[a-z][A-Za-z0-9]*$/u;

export interface OntologyGraphNode {
  id: string;
  name: string;
  title: string;
  category: number;
  symbolSize: number;
  value: string;
  itemStyle: { color: string };
  namespaceFields: string[];
  baseFields: string[];
  displayField: string;
}

export interface OntologyGraphLink {
  id: string;
  source: string;
  target: string;
  value: string;
  lineStyle: { type: 'solid' | 'dashed' | 'dotted'; width: number; opacity: number };
}

export interface OntologyGraphData {
  nodes: OntologyGraphNode[];
  links: OntologyGraphLink[];
  categories: Array<{ name: Ns5OntologyEntityArtifact['kind']; itemStyle: { color: string } }>;
}

const KINDS: Ns5OntologyEntityArtifact['kind'][] = ['core', 'event', 'supporting', 'mdm', 'valueObject'];

export interface OntologyFieldCounts {
  namespace: number;
  base: number;
  total: number;
}

export function ontologyFieldCounts(entity: Pick<Ns5OntologyEntityArtifact, 'fields' | 'fieldsBase'>): OntologyFieldCounts {
  const namespace = entity.fields.length;
  const base = entity.fieldsBase?.length || 0;
  return { namespace, base, total: namespace + base };
}

export function ontologyResolvableFields(
  entity: Pick<Ns5OntologyEntityArtifact, 'fields' | 'fieldsBase'>,
): Ns5OntologyField[] {
  return [...entity.fields, ...(entity.fieldsBase || [])];
}

export function ontologyCardinality(type: string): string {
  return ({ oneToOne: '1:1', oneToMany: '1:N', manyToOne: 'N:1', manyToMany: 'N:N' } as Record<string, string>)[type] || type;
}

export function buildOntologyGraph(
  index: Ns5OntologyIndexArtifact | null,
  entities: readonly Ns5OntologyEntityArtifact[],
  colors: readonly string[],
): OntologyGraphData {
  const usedKinds = KINDS.filter(kind => entities.some(entity => entity.kind === kind));
  const categories = usedKinds.map((kind, category) => ({
    name: kind,
    itemStyle: { color: colors[category % Math.max(colors.length, 1)] || 'currentColor' },
  }));
  const categoryOf = (kind: Ns5OntologyEntityArtifact['kind']) => Math.max(0, usedKinds.indexOf(kind));
  const nodes = entities.map(entity => {
    const category = categoryOf(entity.kind);
    const fieldCounts = ontologyFieldCounts(entity);
    return {
      id: entity.entityId,
      name: entity.entityId,
      title: entity.title,
      category,
      symbolSize: Math.min(78, 34 + fieldCounts.total * 2 + Object.keys(entity.details || {}).length),
      value: entity.description,
      itemStyle: { color: categories[category]?.itemStyle.color || colors[0] || 'currentColor' },
      namespaceFields: entity.fields.map(field => field.fieldId),
      baseFields: (entity.fieldsBase || []).map(field => field.fieldId),
      displayField: entity.displayField,
    };
  });
  const persistenceStyle = (mode: string): OntologyGraphLink['lineStyle']['type'] => {
    if (mode === 'crossStoreReference' || mode === 'externalReference') return 'dashed';
    if (mode === 'mdmRelationship') return 'dotted';
    return 'solid';
  };
  const links = (index?.relationships || []).map(relationship => ({
    id: relationship.relationshipId,
    source: relationship.fromEntity,
    target: relationship.toEntity,
    value: ontologyCardinality(relationship.type),
    lineStyle: {
      type: persistenceStyle(relationship.persistence.mode),
      width: relationship.required ? 2.2 : 1.35,
      opacity: relationship.required ? .78 : .5,
    },
  }));
  return { nodes, links, categories };
}

export function sanitizeOntologyConstraints(
  type: Ns5OntologyField['type'],
  constraints: Ns5OntologyFieldConstraints | undefined,
): Ns5OntologyFieldConstraints | undefined {
  if (!constraints) return undefined;
  const next: Ns5OntologyFieldConstraints = {};
  if (type === 'number' || type === 'integer' || type === 'money') {
    if (typeof constraints.min === 'number') next.min = constraints.min;
    if (typeof constraints.max === 'number') next.max = constraints.max;
  }
  if (type === 'number' || type === 'money') {
    if (typeof constraints.precision === 'number') next.precision = constraints.precision;
  }
  if (type === 'string' || type === 'text') {
    if (typeof constraints.maxLength === 'number') next.maxLength = constraints.maxLength;
  }
  return Object.keys(next).length ? next : undefined;
}

export function updateOntologyField(
  entity: Ns5OntologyEntityArtifact,
  fieldId: string,
  patch: Partial<Ns5OntologyField>,
): Ns5OntologyEntityArtifact {
  return {
    ...entity,
    fields: entity.fields.map(field => {
      if (field.fieldId !== fieldId) return field;
      const next = { ...field, ...patch };
      if (patch.type) next.constraints = sanitizeOntologyConstraints(patch.type, next.constraints);
      if (next.type !== 'string') delete next.enum;
      if (!next.unique) delete next.unique;
      if (!next.constraints) delete next.constraints;
      return next;
    }),
  };
}

export function removeOntologyState(entity: Ns5OntologyEntityArtifact, state: string): Ns5OntologyEntityArtifact {
  return {
    ...entity,
    lifecycleStates: entity.lifecycleStates.filter(item => item.state !== state),
    transitions: entity.transitions.filter(item => item.to !== state && !item.from.includes(state)),
  };
}

export function updateOntologyRelationship(
  index: Ns5OntologyIndexArtifact,
  relationshipId: string,
  patch: Partial<Pick<Ns5OntologyRelationship, 'description' | 'required' | 'type'>>,
): Ns5OntologyIndexArtifact {
  return {
    ...index,
    relationships: index.relationships.map(relationship =>
      relationship.relationshipId === relationshipId ? { ...relationship, ...patch } : relationship,
    ),
  };
}

export function ontologyEntityIssues(
  issues: readonly NewReleaseValidationIssue[],
  entityId: string,
): NewReleaseValidationIssue[] {
  const artifact = `ontology/${entityId}.defs.ts`;
  return issues.filter(issue => issue.artifact === artifact || issue.path.startsWith(`${entityId}.`));
}

export function ontologyEntityPath(entityId: string): `ontology/${string}.defs.ts` {
  return `ontology/${entityId}.defs.ts`;
}
