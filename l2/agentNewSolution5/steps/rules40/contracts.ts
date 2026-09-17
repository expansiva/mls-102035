/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/rules40/contracts.ts" enhancement="_blank"/>

import { normalizeModuleName } from '/_102035_/l2/solution/fs.js';
import {
  NS5_RULES_SCHEMA_VERSION,
  NS5_RULES_SCHEMA_VERSION_V2,
  type Ns5Rule,
  type Ns5RulesArtifact,
  type Ns5RulesArtifactV2,
} from '/_102035_/l2/solution/types.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;

export interface Ns5RulesNormalization {
  /** The catalog in the artifact form: `ruleId` to the one sentence. */
  rules: Record<string, string>;
  /**
   * The ids the payload wrote twice. A MAP CANNOT HOLD A DUPLICATE — the second write silently wins —
   * so the collision is reported here and the gate reads it from the context. `keyed()` in
   * `steps/ontology30/contractsV3.ts:175` overwrites in the same way and says nothing; rules40 has a
   * duplicate check to keep (`NS5_RULES_ID_DUPLICATE`), so the evidence has to survive the conversion.
   */
  duplicateRuleIds: string[];
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

/**
 * Tool payload (an array of `{ ruleId, description }`, the only thing a strict tool schema can ask for)
 * to the artifact form (a map). A payload ALREADY in map form — the previous draft handed back on a
 * repair, or a hand-written catalog — is read unchanged, exactly like `keyed()` does in
 * `steps/ontology30/contractsV3.ts:175`. Local on purpose: `keyed()` keeps the rest of the item as the
 * value (`Record<string, object>`), and a rule's value is the sentence itself.
 *
 * A rule whose id did not survive `memberId` keeps the `''` key so the gate can say NS5_RULES_ID
 * instead of the rule vanishing; two bad ids then collapse onto that one key, which only ever happens
 * on a payload the gate is about to reject anyway.
 */
export function normalizeNs5RulesPayload(value: unknown): Ns5RulesNormalization {
  const root = record(value);
  const rules: Record<string, string> = {};
  const duplicateRuleIds: string[] = [];
  for (const rule of rulePairs(root.rules)) {
    if (!rule.ruleId && !rule.description) continue;
    if (rule.ruleId && Object.prototype.hasOwnProperty.call(rules, rule.ruleId)) {
      if (!duplicateRuleIds.includes(rule.ruleId)) duplicateRuleIds.push(rule.ruleId);
    }
    rules[rule.ruleId] = rule.description;
  }
  return { rules, duplicateRuleIds };
}

/**
 * A saved draft as the TOOL would take it back: a list of `{ ruleId, description }`, without the
 * `schemaVersion` the artifact carries and the strict tool schema does not accept. The repair prompt
 * shows the previous draft and then asks the model to submit it again with the fix, so what it is shown
 * has to be submittable — since ns5_45 the draft on disk is the artifact, i.e. a map.
 */
export function ns5RulesToolPayload(draft: unknown): { rules: Ns5Rule[] } {
  const { rules } = normalizeNs5RulesPayload(draft);
  return { rules: Object.entries(rules).map(([ruleId, description]) => ({ ruleId, description })) };
}

/**
 * The v1 artifact. `rules40` emits v2; this renders a RECORDED run in the form it was recorded in, which
 * is what keeps the thirteen `fixtures/*-rules.defs.ts` a byte-for-byte replay (`replayRealRuns.test.ts`).
 */
export function buildNs5RulesArtifact(moduleName: string, rules: Ns5Rule[]): Ns5RulesArtifact {
  return {
    schemaVersion: NS5_RULES_SCHEMA_VERSION,
    moduleName,
    rules,
  };
}

/** What rules40 writes: the catalog as a map, like `mdm.defs.ts`. */
export function buildNs5RulesArtifactV2(
  moduleName: string,
  rules: Record<string, string>,
): Ns5RulesArtifactV2 {
  return {
    schemaVersion: NS5_RULES_SCHEMA_VERSION_V2,
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

/** The payload's rules as ordered pairs, whether it came as an array of items or already as a map. */
function rulePairs(value: unknown): Ns5Rule[] {
  if (Array.isArray(value)) return value.map(normalizeRule);
  return Object.entries(record(value)).map(([ruleId, description]) => ({
    ruleId: memberId(text(ruleId), ''),
    description: text(description),
  }));
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

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
