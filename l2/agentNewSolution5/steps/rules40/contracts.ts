/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/rules40/contracts.ts" enhancement="_blank"/>

import { normalizeModuleName } from '/_102035_/l2/solution/fs.js';
import {
  NS5_RULES_SCHEMA_VERSION,
  type Ns5Rule,
  type Ns5RulesArtifact,
} from '/_102035_/l2/solution/types.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;

export interface Ns5RulesNormalization {
  rules: Ns5Rule[];
}

export interface Ns5RulesRefCatalog {
  entityIds: string[];
  fieldRefs: string[];
  transitionRefs: string[];
  journeyIds: string[];
  timeTransitionRefs: string[];
}

export interface Ns5RulesEntityView {
  entityId: string;
  fields: ReadonlyArray<{ fieldId: string }>;
  details?: Record<string, string>;
  storage?: { idField: string };
  transitions: ReadonlyArray<{ transitionId: string; by: string[] | 'system' | 'time' }>;
}

export function buildNs5RulesTool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool(
    'submitNs5Rules',
    'Submit the module business-rule catalog: ruleId and description.',
    schema,
  );
}

export function normalizeNs5RulesPayload(value: unknown): Ns5RulesNormalization {
  const root = record(value);
  return { rules: list(root.rules).map(normalizeRule).filter(rule => rule.ruleId || rule.description) };
}

export function buildNs5RulesArtifact(moduleName: string, rules: Ns5Rule[]): Ns5RulesArtifact {
  return {
    schemaVersion: NS5_RULES_SCHEMA_VERSION,
    moduleName,
    rules,
  };
}

export function collectNs5RulesRefCatalog(
  entities: readonly Ns5RulesEntityView[],
  journeys: ReadonlyArray<{ journeyId: string }>,
): Ns5RulesRefCatalog {
  const entityIds: string[] = [];
  const fieldRefs: string[] = [];
  const transitionRefs: string[] = [];
  const timeTransitionRefs: string[] = [];
  for (const entity of entities) {
    if (entity.entityId) entityIds.push(entity.entityId);
    const seenFields = new Set<string>();
    const addField = (fieldId: string) => {
      if (!fieldId || seenFields.has(fieldId)) return;
      seenFields.add(fieldId);
      fieldRefs.push(`${entity.entityId}.${fieldId}`);
    };
    for (const field of entity.fields) addField(field.fieldId);
    if (entity.storage?.idField) addField(entity.storage.idField);
    if (entity.details) {
      for (const name of Object.keys(entity.details)) {
        if (!name) continue;
        fieldRefs.push(`${entity.entityId}.details.${name}`);
      }
    }
    for (const transition of entity.transitions) {
      if (!transition.transitionId) continue;
      const ref = `${entity.entityId}.${transition.transitionId}`;
      transitionRefs.push(ref);
      if (transition.by === 'time') timeTransitionRefs.push(ref);
    }
  }
  return {
    entityIds,
    fieldRefs,
    transitionRefs,
    journeyIds: journeys.map(journey => journey.journeyId).filter(Boolean),
    timeTransitionRefs,
  };
}

export function ns5FieldRefExists(ref: string, entity: Ns5RulesEntityView): boolean {
  const parsed = splitFieldRef(ref);
  if (!parsed || parsed.entityId !== entity.entityId) return false;
  if (parsed.detailsName) return Boolean(entity.details && parsed.detailsName in entity.details);
  if (entity.fields.some(field => field.fieldId === parsed.fieldId)) return true;
  if (entity.storage?.idField === parsed.fieldId) return true;
  return Boolean(entity.details && parsed.fieldId in entity.details);
}

export function splitFieldRef(ref: string): { entityId: string; fieldId: string; detailsName: string } | null {
  const details = /^([A-Z][A-Za-z0-9]*)\.details\.([a-z][A-Za-z0-9]*)$/.exec(ref);
  if (details) return { entityId: details[1], fieldId: details[2], detailsName: details[2] };
  const field = /^([A-Z][A-Za-z0-9]*)\.([a-z][A-Za-z0-9]*)$/.exec(ref);
  if (field) return { entityId: field[1], fieldId: field[2], detailsName: '' };
  return null;
}

export function splitTransitionRef(ref: string): { entityId: string; transitionId: string } | null {
  const match = /^([A-Z][A-Za-z0-9]*)\.([a-z][A-Za-z0-9]*)$/.exec(ref);
  return match ? { entityId: match[1], transitionId: match[2] } : null;
}

function normalizeRule(value: unknown): Ns5Rule {
  const source = record(value);
  return {
    ruleId: memberId(text(source.ruleId) || text(source.id), ''),
    description: text(source.description),
  };
}

function memberId(value: string, fallback: string): string {
  const id = normalizeModuleName(value || fallback, fallback);
  return MEMBER_ID.test(id) ? id : fallback;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
