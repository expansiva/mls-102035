/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/mechanical.ts" enhancement="_blank" />

import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import type { NrpArtifactKind, NrpMechanicalMark } from '/_102035_/l2/agentNewReleasePrompt/steps/triage20/triage20.js';

/** Free text that still names a removed item. The model rewrites it; this code does not. */
export interface NrpTextMark {
  kind: NrpArtifactKind;
  path: string;
  text: string;
  item: string;
}

export interface NrpMechanicalResult {
  artifacts: NrpModuleArtifacts;
  textMarks: NrpTextMark[];
}

const ID_KEYS = [
  'entityId', 'ruleId', 'journeyId', 'grantId', 'processId', 'taskId',
  'stepId', 'transitionId', 'relationshipId', 'fieldId', 'id',
] as const;

export function applyNrpMechanical(
  artifacts: NrpModuleArtifacts,
  marks: NrpMechanicalMark[],
): NrpMechanicalResult {
  let next = clone(artifacts);
  const textMarks: NrpTextMark[] = [];
  for (const mark of marks) {
    if (mark.op === 'setOptional' || mark.op === 'setRequired') {
      next = setFieldRequired(next, mark.targetId, mark.fieldId, mark.op === 'setRequired');
    } else if (mark.op === 'setScalar') {
      next = setScalar(next, mark);
    } else if (mark.fieldId) {
      next = removeField(next, mark.targetId, mark.fieldId, textMarks);
    } else {
      next = removeItem(next, mark.targetId, textMarks);
    }
  }
  return { artifacts: next, textMarks };
}

/**
 * When mechanicalOnly is true, a kind the marks already cover skips the model, unless a free text
 * in that kind still cites a removed item. When it is false, every listed kind still goes to the
 * model after the marks. A kind that holds a marked text comes back either way.
 */
export function nrpModelKinds(
  artifacts: NrpModuleArtifacts,
  marks: NrpMechanicalMark[],
  listed: NrpArtifactKind[],
  mechanicalOnly = true,
): NrpArtifactKind[] {
  const covered = new Set(marks.map(mark => kindOfMark(artifacts, mark)));
  const cited = new Set(applyNrpMechanical(artifacts, marks).textMarks.map(mark => mark.kind));
  const kinds = listed.filter(kind => !mechanicalOnly || !covered.has(kind) || cited.has(kind));
  for (const kind of cited) if (!kinds.includes(kind)) kinds.push(kind);
  return kinds;
}

function kindOfMark(artifacts: NrpModuleArtifacts, mark: NrpMechanicalMark): NrpArtifactKind {
  if (mark.op === 'setOptional' || mark.op === 'setRequired') return 'ontology';
  return kindOfTarget(artifacts, mark.targetId);
}

function kindOfTarget(artifacts: NrpModuleArtifacts, targetId: string): NrpArtifactKind {
  const found = new Set<NrpArtifactKind>();
  const ontology = artifacts.entities.some(entity => ownsOntologyId(entity, targetId))
    || ownsIndexId(artifacts.ontologyIndex, targetId);
  if (ontology) found.add('ontology');
  if (ownsRulesId(artifacts.rules, targetId)) found.add('rules');
  if (artifacts.journeys.some(journey => ownsJourneyId(journey, targetId)) || ownsIndexId(artifacts.journeyIndex, targetId)) {
    found.add('journeys');
  }
  if (ownsId(artifacts.access, targetId, ['grantId'])) found.add('access');
  if (ownsId(artifacts.workflows, targetId, ['processId', 'taskId'])) found.add('workflows');
  if (ownsId(artifacts.integration, targetId, ['id'])) found.add('integration');
  if (found.size !== 1) throw new Error(`Mechanical target ${targetId} must name one artifact kind.`);
  return [...found][0];
}

function ownsOntologyId(entity: unknown, targetId: string): boolean {
  if (!isRecord(entity)) return false;
  if (entity.entityId === targetId) return true;
  if (Array.isArray(entity.transitions) && entity.transitions.some(item => isRecord(item) && item.transitionId === targetId)) {
    return true;
  }
  if (Array.isArray(entity.fields) && entity.fields.some(item => isRecord(item) && item.fieldId === targetId)) return true;
  const record = entity.record;
  return isRecord(record) && isRecord(record.fields) && Object.prototype.hasOwnProperty.call(record.fields, targetId);
}

function ownsJourneyId(journey: unknown, targetId: string): boolean {
  if (!isRecord(journey)) return false;
  if (journey.journeyId === targetId) return true;
  const business = journey.business;
  if (!isRecord(business) || !Array.isArray(business.steps)) return false;
  return business.steps.some(step => isRecord(step) && step.stepId === targetId);
}

function ownsRulesId(rules: unknown, targetId: string): boolean {
  if (!isRecord(rules)) return false;
  const catalog = rules.rules;
  if (Array.isArray(catalog)) return catalog.some(item => isRecord(item) && item.ruleId === targetId);
  return isRecord(catalog) && Object.prototype.hasOwnProperty.call(catalog, targetId);
}

function ownsIndexId(index: unknown, targetId: string): boolean {
  return ownsId(index, targetId, ['entityId', 'relationshipId', 'journeyId']);
}

function ownsId(value: unknown, targetId: string, keys: string[]): boolean {
  if (Array.isArray(value)) return value.some(item => ownsId(item, targetId, keys));
  if (!isRecord(value)) return false;
  if (keys.some(key => value[key] === targetId)) return true;
  return Object.values(value).some(child => ownsId(child, targetId, keys));
}

function setFieldRequired(
  artifacts: NrpModuleArtifacts,
  entityId: string,
  fieldId: string,
  required: boolean,
): NrpModuleArtifacts {
  if (!fieldId) throw new Error('setOptional and setRequired need a fieldId.');
  let found = false;
  const entities = artifacts.entities.map(entity => {
    if (entity.entityId !== entityId) return entity;
    const copy = clone(entity) as unknown as Record<string, unknown>;
    const record = copy.record;
    if (isRecord(record) && isRecord(record.fields) && isRecord(record.fields[fieldId])) {
      record.fields[fieldId] = { ...record.fields[fieldId], required };
      found = true;
    }
    if (Array.isArray(copy.fields)) {
      copy.fields = copy.fields.map(field => {
        if (!isRecord(field) || field.fieldId !== fieldId) return field;
        found = true;
        return { ...field, required };
      });
    }
    return copy as unknown as NrpModuleArtifacts['entities'][number];
  });
  if (!found) throw new Error(`Field ${entityId}.${fieldId} was not found.`);
  return { ...artifacts, entities };
}

function setScalar(artifacts: NrpModuleArtifacts, mark: NrpMechanicalMark): NrpModuleArtifacts {
  if (!mark.fieldId) throw new Error('setScalar needs the property name in fieldId.');
  const next = clone(artifacts);
  let found = 0;
  visit(next, node => {
    if (!isRecord(node) || !identifies(node, mark.targetId)) return;
    if (!Object.prototype.hasOwnProperty.call(node, mark.fieldId)) return;
    const current = node[mark.fieldId];
    if (!isScalar(current)) return;
    node[mark.fieldId] = coerce(current, mark.value);
    found += 1;
  });
  if (found !== 1) throw new Error(`setScalar needs exactly one ${mark.targetId}.${mark.fieldId}.`);
  return next;
}

const SECTION_KIND: Record<string, NrpArtifactKind> = {
  ontologyIndex: 'ontology',
  entities: 'ontology',
  rules: 'rules',
  journeyIndex: 'journeys',
  journeys: 'journeys',
  access: 'access',
  workflows: 'workflows',
  integration: 'integration',
};

function removeField(
  artifacts: NrpModuleArtifacts,
  entityId: string,
  fieldId: string,
  textMarks: NrpTextMark[],
): NrpModuleArtifacts {
  if (!fieldId.trim()) throw new Error('remove of a field needs a fieldId.');
  const next = clone(artifacts);
  let found = false;
  next.entities = next.entities.map(entity => {
    if (entity.entityId !== entityId) return entity;
    const copy = clone(entity) as unknown as Record<string, unknown>;
    if (dropField(copy, fieldId)) found = true;
    return copy as unknown as NrpModuleArtifacts['entities'][number];
  });
  if (!found) throw new Error(`Field ${entityId}.${fieldId} was not found.`);
  const structural = [fieldId, `${entityId}.${fieldId}`];
  const leaf = fieldId.slice(fieldId.lastIndexOf('.') + 1);
  const terms = [...new Set([leaf, ...structural].filter(term => term.length > 0))];
  const pruned: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(next)) {
    pruned[key] = pruneFieldCitations(child, structural, terms, `$.${key}`, SECTION_KIND[key] ?? null, textMarks);
  }
  return pruned as unknown as NrpModuleArtifacts;
}

/** details.etiquetas is record.fields.details.fields.etiquetas. A v2 field is the list item with that fieldId. */
function dropField(entity: Record<string, unknown>, fieldId: string): boolean {
  let found = false;
  const record = entity.record;
  if (isRecord(record) && isRecord(record.fields)) {
    if (fieldId.startsWith('details.')) {
      const leaf = fieldId.slice('details.'.length);
      if (!leaf || leaf.includes('.')) throw new Error(`Field path ${fieldId} must be one field under details.`);
      const details = record.fields.details;
      if (isRecord(details) && isRecord(details.fields) && Object.prototype.hasOwnProperty.call(details.fields, leaf)) {
        delete details.fields[leaf];
        found = true;
      }
    } else if (!fieldId.includes('.') && Object.prototype.hasOwnProperty.call(record.fields, fieldId)) {
      delete record.fields[fieldId];
      found = true;
    }
  }
  const fields = entity.fields;
  if (Array.isArray(fields)) {
    const kept = fields.filter(field => !(isRecord(field) && field.fieldId === fieldId));
    if (kept.length !== fields.length) {
      entity.fields = kept;
      found = true;
    }
  }
  return found;
}

function pruneFieldCitations(
  value: unknown,
  structural: string[],
  terms: string[],
  path: string,
  kind: NrpArtifactKind | null,
  textMarks: NrpTextMark[],
): unknown {
  if (typeof value === 'string') {
    if (structural.includes(value)) return undefined;
    if (kind) {
      const item = longestTerm(value, terms);
      if (item) textMarks.push({ kind, path, text: value, item });
    }
    return value;
  }
  if (Array.isArray(value)) {
    const kept: unknown[] = [];
    value.forEach((item, index) => {
      const pruned = pruneFieldCitations(item, structural, terms, `${path}[${index}]`, kind, textMarks);
      if (pruned !== undefined) kept.push(pruned);
    });
    return kept;
  }
  if (!isRecord(value)) return value;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const pruned = pruneFieldCitations(child, structural, terms, `${path}.${key}`, kind, textMarks);
    if (pruned !== undefined) next[key] = pruned;
  }
  return next;
}

/** Free text that names a removed field. `module` is reported and not edited. */
export function nrpFreeTextHits(value: unknown, terms: readonly string[]): Array<{ path: string; text: string; term: string }> {
  const hits: Array<{ path: string; text: string; term: string }> = [];
  const visitHit = (node: unknown, path: string): void => {
    if (typeof node === 'string') {
      const term = longestTerm(node, terms);
      if (term) hits.push({ path, text: node, term });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => visitHit(item, `${path}[${index}]`));
      return;
    }
    if (!isRecord(node)) return;
    for (const [key, child] of Object.entries(node)) visitHit(child, `${path}.${key}`);
  };
  visitHit(value, '$');
  return hits;
}

function longestTerm(text: string, terms: readonly string[]): string | null {
  const matches = terms.filter(term => mentions(text, term));
  matches.sort((left, right) => right.length - left.length);
  return matches[0] || null;
}

function removeItem(artifacts: NrpModuleArtifacts, targetId: string, textMarks: NrpTextMark[]): NrpModuleArtifacts {
  if (!targetId.trim()) throw new Error('remove needs a targetId.');
  if (artifacts.entities.some(entity => entity.entityId === targetId)) {
    throw new Error(`Removing the entity ${targetId} is not a mechanical mark. Send it to the model.`);
  }
  kindOfTarget(artifacts, targetId);
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(artifacts)) {
    const pruned = prune(child, targetId, `$.${key}`, SECTION_KIND[key] ?? null, textMarks);
    if (pruned !== undefined) next[key] = pruned;
  }
  return next as unknown as NrpModuleArtifacts;
}

/** Drops the item and structural citations. A longer string that names the item is marked and left as-is. */
function prune(
  value: unknown,
  targetId: string,
  path: string,
  kind: NrpArtifactKind | null,
  textMarks: NrpTextMark[],
): unknown {
  if (typeof value === 'string') {
    if (value === targetId) return undefined;
    if (kind && mentions(value, targetId)) textMarks.push({ kind, path, text: value, item: targetId });
    return value;
  }
  if (Array.isArray(value)) {
    const kept: unknown[] = [];
    value.forEach((item, index) => {
      if (isRecord(item) && identifies(item, targetId)) return;
      const pruned = prune(item, targetId, `${path}[${index}]`, kind, textMarks);
      if (pruned !== undefined) kept.push(pruned);
    });
    return kept;
  }
  if (!isRecord(value)) return value;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === targetId) continue;
    const pruned = prune(child, targetId, `${path}.${key}`, kind, textMarks);
    if (pruned !== undefined) next[key] = pruned;
  }
  return next;
}

function identifies(node: Record<string, unknown>, targetId: string): boolean {
  return ID_KEYS.some(key => node[key] === targetId);
}

function mentions(text: string, token: string): boolean {
  return tokenPattern(token).test(text);
}

function tokenPattern(token: string): RegExp {
  return new RegExp(`(^|[^A-Za-z0-9_])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Za-z0-9_])`, 'gu');
}

function coerce(current: string | number | boolean, value: string): string | number | boolean {
  if (typeof current === 'boolean') {
    if (value !== 'true' && value !== 'false') throw new Error('A boolean scalar must be true or false.');
    return value === 'true';
  }
  if (typeof current === 'number') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error('A numeric scalar must be a finite number.');
    return parsed;
  }
  return value;
}

function isScalar(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function visit(value: unknown, fn: (node: unknown, key: string | null) => void, key: string | null = null): void {
  fn(value, key);
  if (Array.isArray(value)) {
    for (const item of value) visit(item, fn, null);
    return;
  }
  if (!isRecord(value)) return;
  for (const [childKey, child] of Object.entries(value)) visit(child, fn, childKey);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
