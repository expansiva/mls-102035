/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/judge35/contracts.ts" enhancement="_blank"/>

import { createNs5RetryStep, NS5_AGENT_NAME } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';
import type { Ns5PipelineNormalization } from '/_102035_/l2/solution/types.js';

export const NS5_JUDGE_MAX_REPAIRS = 2;
export const NS5_JUDGE_MAX_ONTOLOGY_REPAIRS = 1;
/** Fan-out round used by the nested ontology30 repair so it never collides with 0..2. */
export const NS5_JUDGE_ONTOLOGY_REPAIR_ROUND = 10;
export const NS5_JUDGE_VERDICTS = ['missingJourney', 'transitionUnjustified', 'coveredByAct', 'switchNeedsLifecycle'] as const;
export type Ns5JudgeVerdictKind = typeof NS5_JUDGE_VERDICTS[number];

/** Named gate refusals. Closed set — the comment enum includes these, no default. */
export const NS5_JUDGE_GATE_CODES = [
  'NS5_JUDGE_CANDIDATE_ID',
  'NS5_JUDGE_UNKNOWN_CANDIDATE',
  'NS5_JUDGE_CANDIDATE_DUPLICATE',
  'NS5_JUDGE_VERDICT',
  'NS5_JUDGE_BRIEF',
  'NS5_JUDGE_COVERED_KIND',
  'NS5_JUDGE_COVERED_BY',
  'NS5_JUDGE_COVERED_STEP',
  'NS5_JUDGE_COVERED_ACT',
  'NS5_JUDGE_COVERED_TRANSITION',
  'NS5_JUDGE_COVERED_LINK',
  'NS5_JUDGE_COVERED_ACTOR',
  'NS5_JUDGE_SWITCH_KIND',
  'NS5_JUDGE_SWITCH_STATES',
  'NS5_JUDGE_CANDIDATE_MISSING',
] as const;
export type Ns5JudgeGateCode = typeof NS5_JUDGE_GATE_CODES[number];

export const NS5_JUDGE_COMMENT_CODES = [
  ...NS5_JUDGE_GATE_CODES,
  'NS5_JUDGE_ORPHAN_PERSISTS',
  'NS5_JUDGE_SKIPPED',
] as const;
export type Ns5JudgeCommentCode = typeof NS5_JUDGE_COMMENT_CODES[number];

export interface Ns5JudgeComment {
  code: Ns5JudgeCommentCode;
  message: string;
  candidateId?: string;
}

export interface Ns5JudgeJourneyStepView {
  stepId: string;
  kind: string;
  entity?: string;
  transitionRef?: string;
}

export interface Ns5JudgeJourneyView {
  journeyId: string;
  actorRef?: string;
  steps: ReadonlyArray<Ns5JudgeJourneyStepView>;
}

export interface Ns5JudgeTransitionView {
  transitionId: string;
  from: readonly string[];
  to?: string;
  by: string[] | 'system' | 'time';
  description?: string;
}

export interface Ns5JudgeFieldView {
  fieldId: string;
  title: string;
  type: string;
  derived?: boolean;
  owner?: string;
  values?: string[];
  description?: string;
}

export interface Ns5JudgeEntityView {
  entityId: string;
  transitions: ReadonlyArray<Ns5JudgeTransitionView>;
  lifecycleStates?: ReadonlyArray<{ state: string }>;
  fields?: ReadonlyArray<Ns5JudgeFieldView>;
  derivedFields?: ReadonlyArray<Ns5JudgeFieldView>;
}

/** One index edge. Direct `fromEntity`/`toEntity` — including N:N via `through`, not a FK walk. */
export interface Ns5JudgeRelationshipView {
  relationshipId: string;
  fromEntity: string;
  toEntity: string;
}

export interface Ns5JudgeProcessTaskView {
  taskId?: string;
  entityRef?: string;
  effect?: string;
  transitionRef?: string;
  description?: string;
}

export interface Ns5JudgeProcessView {
  processId: string;
  title?: string;
  description?: string;
  tasks: ReadonlyArray<Ns5JudgeProcessTaskView>;
}

export interface Ns5JudgeRuleView {
  ruleId: string;
  description: string;
}

export interface Ns5JudgeUncitedCandidate {
  kind: 'uncitedHumanTransition';
  candidateId: string;
  entityId: string;
  transitionId: string;
  by: string[];
  from: string[];
  to: string;
  description: string;
  /** Act steps on a related entity that cite the same transitionId with the same actor. Hint, not a verdict. */
  likelyCoveredBy: string[];
}

export interface Ns5JudgeDecideCandidate {
  kind: 'incompleteDecide';
  candidateId: string;
  entityId: string;
  origin: string;
  journeyId: string;
  stepId: string;
  transitionIds: string[];
  citedTransitionIds: string[];
}

export interface Ns5JudgeSwitchCandidate {
  kind: 'writtenSwitch';
  candidateId: string;
  entityId: string;
  fieldId: string;
  title: string;
  type: 'boolean' | 'enum';
  /** Rule, process stage or other-entity derived field that names this switch. Hint, not a verdict. */
  citedBy: string[];
}

export type Ns5JudgeCandidate = Ns5JudgeUncitedCandidate | Ns5JudgeDecideCandidate | Ns5JudgeSwitchCandidate;

export interface Ns5JudgeJourneyBrief {
  actor: string;
  title: string;
  goal: string;
  transitionRef: string;
}

export interface Ns5JudgeVerdict {
  candidateId: string;
  verdict: Ns5JudgeVerdictKind;
  journeyBrief: Ns5JudgeJourneyBrief;
  /** `journeyId.stepId` when verdict is `coveredByAct`; empty otherwise. */
  coveredBy: string;
  /** `[on, off]` English state ids when verdict is `switchNeedsLifecycle`; empty otherwise. */
  states?: string[];
}

export interface Ns5JudgeDraft {
  candidates: Ns5JudgeCandidate[];
  verdicts: Ns5JudgeVerdict[];
  rounds: number;
  noJudgeSignal?: boolean;
  warnings?: string[];
  comments?: Ns5JudgeComment[];
}

export type Ns5JudgeAction =
  | { type: 'approveWithoutModel' }
  | { type: 'callModel' }
  | { type: 'repairJourneys'; briefs: string; attempt: number }
  | { type: 'repairOntology'; entityIds: string[]; entityFeedback: Record<string, string>; attempt: number }
  | { type: 'approveWithWarnings'; warnings: string[] }
  | { type: 'commentLeftovers'; leftovers: Ns5JudgeCandidate[]; message: string };

function citationKey(entityId: string, transitionId: string): string {
  return `${entityId}.${transitionId}`;
}

function isHumanBy(by: Ns5JudgeTransitionView['by']): by is string[] {
  return Array.isArray(by) && by.length > 0;
}

function citedKeys(
  journeys: readonly Ns5JudgeJourneyView[],
  processes: readonly Ns5JudgeProcessView[],
): Set<string> {
  const cited = new Set<string>();
  for (const journey of journeys) {
    for (const step of journey.steps) {
      if (step.entity && step.transitionRef) cited.add(citationKey(step.entity, step.transitionRef));
    }
  }
  for (const process of processes) {
    for (const task of process.tasks) {
      if (task.entityRef && task.transitionRef) cited.add(citationKey(task.entityRef, task.transitionRef));
    }
  }
  return cited;
}

function leavingFrom(
  transitions: readonly Ns5JudgeTransitionView[],
  origin: string,
): Ns5JudgeTransitionView[] {
  return transitions.filter(transition => (transition.from || []).includes(origin));
}

function branchingOrigins(transitions: readonly Ns5JudgeTransitionView[]): string[] {
  const counts = new Map<string, number>();
  for (const transition of transitions) {
    for (const from of transition.from || []) {
      if (!from) continue;
      counts.set(from, (counts.get(from) || 0) + 1);
    }
  }
  return [...counts.entries()].filter(([, count]) => count >= 2).map(([origin]) => origin);
}

function journeyCitedIds(
  journey: Ns5JudgeJourneyView,
  entityId: string,
): Set<string> {
  const ids = new Set<string>();
  for (const step of journey.steps) {
    if (step.entity === entityId && step.transitionRef) ids.add(step.transitionRef);
  }
  return ids;
}

/**
 * Deterministic candidates. (a) a human transition (`by` is a non-empty actor list) that no journey
 * `transitionRef` and no process stage cites, keyed as `entityId.transitionId`. (b) a `decide` whose
 * origin has N>=2 leaving transitions, this journey cites fewer than N, and the module as a whole
 * also cites fewer than N — a branch with no story anywhere.
 */
export function asNs5JudgeJourneys(
  journeys: ReadonlyArray<Ns5JudgeJourneyView | { journeyId: string; business: { actorRef?: string; steps: ReadonlyArray<Ns5JudgeJourneyStepView> } }>,
): Ns5JudgeJourneyView[] {
  return journeys.map(journey => {
    if ('steps' in journey && Array.isArray(journey.steps)) {
      return { journeyId: journey.journeyId, actorRef: journey.actorRef, steps: journey.steps };
    }
    const nested = journey as { journeyId: string; business: { actorRef?: string; steps: ReadonlyArray<Ns5JudgeJourneyStepView> } };
    return { journeyId: nested.journeyId, actorRef: nested.business.actorRef, steps: nested.business.steps };
  });
}

export function ns5JudgeEntitiesLinked(
  left: string,
  right: string,
  relationships: readonly Ns5JudgeRelationshipView[],
): boolean {
  if (!left || !right || left === right) return false;
  return relationships.some(edge => (
    (edge.fromEntity === left && edge.toEntity === right)
    || (edge.fromEntity === right && edge.toEntity === left)
  ));
}

export function parseNs5JudgeCoveredBy(value: string): { journeyId: string; stepId: string } | null {
  const trimmed = value.trim();
  const dot = trimmed.indexOf('.');
  if (dot <= 0 || dot >= trimmed.length - 1) return null;
  if (trimmed.includes('.', dot + 1)) return null;
  return { journeyId: trimmed.slice(0, dot), stepId: trimmed.slice(dot + 1) };
}

export function foldNs5JudgeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function enumValuesOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    if (typeof item === 'string') return item.trim();
    return text(record(item).value);
  }).filter(Boolean);
}

function walkV3Fields(
  fields: Record<string, unknown>,
  written: Ns5JudgeFieldView[],
  derived: Ns5JudgeFieldView[],
): void {
  for (const [fieldId, raw] of Object.entries(fields)) {
    if (!fieldId || fieldId === 'details') {
      const nested = record(record(raw).fields);
      if (fieldId === 'details' && Object.keys(nested).length) walkV3Fields(nested, written, derived);
      continue;
    }
    const field = record(raw);
    const view: Ns5JudgeFieldView = {
      fieldId,
      title: text(field.title),
      type: text(field.type) || (Array.isArray(field.values) ? 'enum' : ''),
      ...(field.derived === true ? { derived: true } : {}),
      ...(text(field.owner) ? { owner: text(field.owner) } : {}),
      ...(Array.isArray(field.values) ? { values: enumValuesOf(field.values) } : {}),
      ...(text(field.description) ? { description: text(field.description) } : {}),
    };
    if (field.derived === true) derived.push(view);
    else written.push(view);
    const children = record(field.fields);
    if (Object.keys(children).length) walkV3Fields(children, written, derived);
  }
}

/**
 * Written and derived fields of an ontology entity, v2 list or v3 `record.fields`.
 * Platform-owned and identity fields stay in the lists; the switch collector skips them.
 */
export function ns5JudgeFieldsOf(source: unknown): { fields: Ns5JudgeFieldView[]; derivedFields: Ns5JudgeFieldView[] } {
  const root = record(source);
  const v3 = record(record(root.record).fields);
  if (Object.keys(v3).length) {
    const fields: Ns5JudgeFieldView[] = [];
    const derivedFields: Ns5JudgeFieldView[] = [];
    walkV3Fields(v3, fields, derivedFields);
    return { fields, derivedFields };
  }
  const fields: Ns5JudgeFieldView[] = [];
  const derivedFields: Ns5JudgeFieldView[] = [];
  const rows = Array.isArray(root.fields) ? root.fields : [];
  for (const item of rows) {
    const field = record(item);
    const view: Ns5JudgeFieldView = {
      fieldId: text(field.fieldId),
      title: text(field.title),
      type: text(field.type) || (Array.isArray(field.enum) ? 'enum' : ''),
      ...(Array.isArray(field.enum) ? { values: enumValuesOf(field.enum) } : {}),
      ...(text(field.description) ? { description: text(field.description) } : {}),
    };
    if (!view.fieldId) continue;
    if (field.derived === true) derivedFields.push(view);
    else fields.push(view);
  }
  return { fields, derivedFields };
}

function isWrittenSwitch(field: Ns5JudgeFieldView): field is Ns5JudgeFieldView & { type: 'boolean' | 'enum' } {
  if (field.derived) return false;
  if (field.owner === 'platform' || field.owner === 'organization') return false;
  if (field.fieldId === 'id' || field.fieldId === 'version' || field.fieldId === 'details') return false;
  if (field.type === 'boolean') return true;
  return field.type === 'enum' && (field.values || []).length === 2;
}

function haystackHits(haystack: string, fieldId: string, title: string): boolean {
  const folded = foldNs5JudgeText(haystack);
  if (!folded) return false;
  const id = foldNs5JudgeText(fieldId);
  const label = foldNs5JudgeText(title);
  return (!!id && folded.includes(id)) || (!!label && folded.includes(label));
}

function switchCitationCorpus(
  entityId: string,
  rules: readonly Ns5JudgeRuleView[],
  processes: readonly Ns5JudgeProcessView[],
  entities: readonly Ns5JudgeEntityView[],
): Array<{ id: string; text: string }> {
  const rows: Array<{ id: string; text: string }> = [];
  for (const rule of rules) {
    rows.push({ id: `rule:${rule.ruleId}`, text: `${rule.ruleId} ${rule.description}` });
  }
  for (const process of processes) {
    rows.push({ id: `process:${process.processId}`, text: `${process.processId} ${process.title || ''} ${process.description || ''}` });
    for (const task of process.tasks) {
      const taskId = task.taskId || '';
      rows.push({
        id: `process:${process.processId}.${taskId}`,
        text: `${taskId} ${task.description || ''} ${task.entityRef || ''} ${task.transitionRef || ''}`,
      });
    }
  }
  for (const entity of entities) {
    if (entity.entityId === entityId) continue;
    for (const field of entity.derivedFields || []) {
      rows.push({
        id: `derived:${entity.entityId}.${field.fieldId}`,
        text: `${field.fieldId} ${field.title} ${field.description || ''}`,
      });
    }
  }
  return rows;
}

function collectWrittenSwitches(
  entities: readonly Ns5JudgeEntityView[],
  processes: readonly Ns5JudgeProcessView[],
  rules: readonly Ns5JudgeRuleView[],
): Ns5JudgeSwitchCandidate[] {
  const out: Ns5JudgeSwitchCandidate[] = [];
  for (const entity of entities) {
    if ((entity.lifecycleStates || []).length) continue;
    const fields = entity.fields || [];
    for (const field of fields) {
      if (!isWrittenSwitch(field)) continue;
      const citedBy: string[] = [];
      for (const row of switchCitationCorpus(entity.entityId, rules, processes, entities)) {
        if (haystackHits(row.text, field.fieldId, field.title)) citedBy.push(row.id);
      }
      if (!citedBy.length) continue;
      out.push({
        kind: 'writtenSwitch',
        candidateId: `switch:${entity.entityId}.${field.fieldId}`,
        entityId: entity.entityId,
        fieldId: field.fieldId,
        title: field.title,
        type: field.type === 'enum' ? 'enum' : 'boolean',
        citedBy,
      });
    }
  }
  return out;
}

function likelyCoveredByFor(
  candidate: Omit<Ns5JudgeUncitedCandidate, 'likelyCoveredBy'>,
  journeys: readonly Ns5JudgeJourneyView[],
  relationships: readonly Ns5JudgeRelationshipView[],
): string[] {
  const hints: string[] = [];
  for (const journey of journeys) {
    const actor = journey.actorRef || '';
    if (!actor || !candidate.by.includes(actor)) continue;
    for (const step of journey.steps) {
      if (step.kind !== 'act') continue;
      if (!step.transitionRef || step.transitionRef !== candidate.transitionId) continue;
      if (!step.entity || step.entity === candidate.entityId) continue;
      if (!ns5JudgeEntitiesLinked(step.entity, candidate.entityId, relationships)) continue;
      hints.push(`${journey.journeyId}.${step.stepId}`);
    }
  }
  return hints;
}

export function collectNs5JudgeCandidates(
  journeys: readonly Ns5JudgeJourneyView[],
  entities: readonly Ns5JudgeEntityView[],
  processes: readonly Ns5JudgeProcessView[] = [],
  relationships: readonly Ns5JudgeRelationshipView[] = [],
  rules: readonly Ns5JudgeRuleView[] = [],
): Ns5JudgeCandidate[] {
  const cited = citedKeys(journeys, processes);
  const uncited: Ns5JudgeUncitedCandidate[] = [];
  for (const entity of entities) {
    for (const transition of entity.transitions || []) {
      if (!isHumanBy(transition.by)) continue;
      const key = citationKey(entity.entityId, transition.transitionId);
      if (cited.has(key)) continue;
      const row: Omit<Ns5JudgeUncitedCandidate, 'likelyCoveredBy'> = {
        kind: 'uncitedHumanTransition',
        candidateId: `uncited:${key}`,
        entityId: entity.entityId,
        transitionId: transition.transitionId,
        by: [...transition.by],
        from: [...(transition.from || [])],
        to: transition.to || '',
        description: transition.description || '',
      };
      uncited.push({ ...row, likelyCoveredBy: likelyCoveredByFor(row, journeys, relationships) });
    }
  }

  const decides: Ns5JudgeDecideCandidate[] = [];
  const seenOrigin = new Set<string>();
  for (const entity of entities) {
    const transitions = entity.transitions || [];
    for (const journey of journeys) {
      for (const step of journey.steps) {
        if (step.kind !== 'decide' || step.entity !== entity.entityId) continue;
        const thisCited = journeyCitedIds(journey, entity.entityId);
        const origins = new Set<string>();
        for (const transition of transitions) {
          if (thisCited.has(transition.transitionId)) {
            for (const from of transition.from || []) origins.add(from);
          }
        }
        const originList = origins.size ? [...origins] : branchingOrigins(transitions);
        for (const origin of originList) {
          const leaving = leavingFrom(transitions, origin);
          if (leaving.length < 2) continue;
          const leavingIds = leaving.map(item => item.transitionId);
          const journeyCitedCount = leavingIds.filter(id => thisCited.has(id)).length;
          const moduleCitedIds = leavingIds.filter(id => cited.has(citationKey(entity.entityId, id)));
          if (journeyCitedCount >= leaving.length || moduleCitedIds.length >= leaving.length) continue;
          const originKey = `${entity.entityId}.${origin}`;
          if (seenOrigin.has(originKey)) continue;
          seenOrigin.add(originKey);
          decides.push({
            kind: 'incompleteDecide',
            candidateId: `decide:${originKey}`,
            entityId: entity.entityId,
            origin,
            journeyId: journey.journeyId,
            stepId: step.stepId,
            transitionIds: leavingIds,
            citedTransitionIds: moduleCitedIds,
          });
        }
      }
    }
  }

  return [...uncited, ...decides, ...collectWrittenSwitches(entities, processes, rules)];
}

export function buildNs5JudgeTool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool(
    'submitNs5Judge',
    'Submit one verdict per candidate: missingJourney, transitionUnjustified, coveredByAct, or switchNeedsLifecycle.',
    schema,
  );
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function briefOf(value: unknown): Ns5JudgeJourneyBrief {
  const root = record(value);
  return {
    actor: text(root.actor),
    title: text(root.title),
    goal: text(root.goal),
    transitionRef: text(root.transitionRef),
  };
}

export function normalizeNs5JudgePayload(value: unknown): Ns5JudgeVerdict[] {
  const root = record(value);
  const rows = Array.isArray(root.verdicts) ? root.verdicts : [];
  const out: Ns5JudgeVerdict[] = [];
  for (const row of rows) {
    const item = record(row);
    const candidateId = text(item.candidateId);
    const verdict = text(item.verdict);
    if (!candidateId) continue;
    const kind: Ns5JudgeVerdictKind = verdict === 'transitionUnjustified'
      ? 'transitionUnjustified'
      : verdict === 'coveredByAct'
        ? 'coveredByAct'
        : verdict === 'switchNeedsLifecycle'
          ? 'switchNeedsLifecycle'
          : 'missingJourney';
    const states = Array.isArray(item.states) ? item.states.map(entry => text(entry)).filter(Boolean) : [];
    out.push({ candidateId, verdict: kind, journeyBrief: briefOf(item.journeyBrief), coveredBy: text(item.coveredBy), states });
  }
  return out;
}

export function remainingNs5JudgeCandidates(
  candidates: readonly Ns5JudgeCandidate[],
  verdicts: readonly Ns5JudgeVerdict[],
): Ns5JudgeCandidate[] {
  const settled = new Set(
    verdicts
      .filter(item => item.verdict === 'transitionUnjustified' || item.verdict === 'coveredByAct')
      .map(item => item.candidateId),
  );
  return candidates.filter(candidate => !settled.has(candidate.candidateId));
}

export function missingJourneyBriefs(
  candidates: readonly Ns5JudgeCandidate[],
  verdicts: readonly Ns5JudgeVerdict[],
): Ns5JudgeVerdict[] {
  const remaining = new Set(remainingNs5JudgeCandidates(candidates, verdicts).map(item => item.candidateId));
  return verdicts.filter(item => item.verdict === 'missingJourney' && remaining.has(item.candidateId));
}

export function unjustifiedWarnings(
  candidates: readonly Ns5JudgeCandidate[],
  verdicts: readonly Ns5JudgeVerdict[],
): string[] {
  const byId = new Map(candidates.map(item => [item.candidateId, item]));
  const out: string[] = [];
  for (const verdict of verdicts) {
    if (verdict.verdict !== 'transitionUnjustified') continue;
    const candidate = byId.get(verdict.candidateId);
    if (candidate && candidate.kind === 'writtenSwitch') continue;
    const label = candidate && candidate.kind === 'uncitedHumanTransition'
      ? `${candidate.entityId}.${candidate.transitionId}`
      : verdict.candidateId;
    out.push(`transitionUnjustified ${label}`);
  }
  return out;
}

export function ns5JudgeNormalizations(
  candidates: readonly Ns5JudgeCandidate[],
  verdicts: readonly Ns5JudgeVerdict[],
): Ns5PipelineNormalization[] {
  const byId = new Map(candidates.map(item => [item.candidateId, item]));
  const out: Ns5PipelineNormalization[] = [];
  for (const verdict of verdicts) {
    const candidate = byId.get(verdict.candidateId);
    if (verdict.verdict === 'transitionUnjustified') {
      if (candidate && candidate.kind === 'writtenSwitch') {
        out.push({
          kind: 'switchKeptAsField',
          detail: `switchKeptAsField ${candidate.entityId}.${candidate.fieldId}`,
          entityId: candidate.entityId,
        });
        continue;
      }
      const label = candidate && candidate.kind === 'uncitedHumanTransition'
        ? `${candidate.entityId}.${candidate.transitionId}`
        : verdict.candidateId;
      out.push({ kind: 'transitionUnjustified', detail: `transitionUnjustified ${label}` });
      continue;
    }
    if (verdict.verdict !== 'coveredByAct') continue;
    const label = candidate && candidate.kind === 'uncitedHumanTransition'
      ? `${candidate.entityId}.${candidate.transitionId}`
      : verdict.candidateId;
    const parsed = parseNs5JudgeCoveredBy(verdict.coveredBy);
    out.push({
      kind: 'transitionCoveredByAct',
      detail: `${label} coveredBy ${verdict.coveredBy}`,
      ...(candidate && candidate.kind === 'uncitedHumanTransition' ? { entityId: candidate.entityId } : {}),
      ...(parsed ? { journeyId: parsed.journeyId, stepId: parsed.stepId } : {}),
    });
  }
  return out;
}

export function formatNs5JudgeRepairFeedback(briefs: readonly Ns5JudgeVerdict[]): string {
  const lines = [
    'Write the missing journey(s) that cite existing transitions. Do not change the ontology.',
    'Each brief is one journey to add. Cite the transition as given; keep unrelated journeys.',
  ];
  for (const brief of briefs) {
    const item = brief.journeyBrief;
    lines.push(
      `- actor=${item.actor} title=${JSON.stringify(item.title)} goal=${JSON.stringify(item.goal)} transition=${item.transitionRef}`,
    );
  }
  return lines.join('\n');
}

export function ns5JudgeSkipComment(reason: string): Ns5JudgeComment {
  const trimmed = reason.trim();
  return {
    code: 'NS5_JUDGE_SKIPPED',
    message: trimmed.startsWith('judge35 skipped:') ? trimmed : `judge35 skipped: ${trimmed}`,
  };
}

export function ns5JudgeLeftoverComments(leftovers: readonly Ns5JudgeCandidate[]): Ns5JudgeComment[] {
  return leftovers.map(candidate => ({
    code: 'NS5_JUDGE_ORPHAN_PERSISTS',
    message: formatNs5JudgeFailMessage([candidate]),
    candidateId: candidate.candidateId,
  }));
}

export function ns5JudgeCommentNormalizations(
  comments: readonly Ns5JudgeComment[],
): Ns5PipelineNormalization[] {
  return comments.map(comment => ({
    kind: 'judgeComment',
    detail: comment.candidateId
      ? `${comment.code} ${comment.candidateId}: ${comment.message}`
      : `${comment.code}: ${comment.message}`,
  }));
}

export function actionableNs5JudgeCandidates(
  candidates: readonly Ns5JudgeCandidate[],
  accepted: readonly Ns5JudgeVerdict[],
): Ns5JudgeCandidate[] {
  const acceptedIds = new Set(accepted.map(item => item.candidateId));
  return candidates.filter(candidate => acceptedIds.has(candidate.candidateId));
}

export function formatNs5JudgeFailMessage(candidates: readonly Ns5JudgeCandidate[]): string {
  const labels = candidates.map(candidate => {
    if (candidate.kind === 'uncitedHumanTransition') return `${candidate.entityId}.${candidate.transitionId}`;
    if (candidate.kind === 'writtenSwitch') return `${candidate.entityId}.${candidate.fieldId}`;
    const missing = candidate.transitionIds.filter(id => !candidate.citedTransitionIds.includes(id));
    return `${candidate.entityId}.${candidate.origin} (${missing.join(', ') || candidate.transitionIds.join(', ')})`;
  });
  const switches = candidates.filter(candidate => candidate.kind === 'writtenSwitch');
  if (switches.length && switches.length === candidates.length) {
    return `judge35: written switches still need a lifecycle after ontology repair: ${labels.join(', ')}.`;
  }
  if (switches.length) {
    return `judge35: leftovers after repair: ${labels.join(', ')}.`;
  }
  return `judge35: journeys still miss these human transitions after repair: ${labels.join(', ')}.`;
}

export function formatNs5JudgeOntologyFeedback(
  candidates: readonly Ns5JudgeCandidate[],
  verdicts: readonly Ns5JudgeVerdict[],
): Record<string, string> {
  const byId = new Map(candidates.map(item => [item.candidateId, item]));
  const lines = new Map<string, string[]>();
  for (const verdict of verdicts) {
    if (verdict.verdict !== 'switchNeedsLifecycle') continue;
    const candidate = byId.get(verdict.candidateId);
    if (!candidate || candidate.kind !== 'writtenSwitch') continue;
    const states = (verdict.states || []).filter(Boolean).join(', ');
    const line = [
      `model \`${candidate.fieldId}\` as a lifecycle state with a transition in and out; keep the derived availability`,
      states ? `suggested states: ${states}` : '',
    ].filter(Boolean).join('; ');
    const current = lines.get(candidate.entityId) || [];
    current.push(line);
    lines.set(candidate.entityId, current);
  }
  const out: Record<string, string> = {};
  for (const [entityId, items] of lines) out[entityId] = items.join('\n');
  return out;
}

/**
 * The step's brain, pure. Empty candidates never call a model. After verdicts, missingJourney
 * schedules a journeys20 repair (bounded by MAX_REPAIRS); switchNeedsLifecycle schedules one
 * ontology30 entity repair then revalidates; transitionUnjustified is a warning and never deletes
 * a transition (on a written switch it records switchKeptAsField); coveredByAct records a
 * normalization and does not repair; leftovers after the budget are named comments, never a
 * failed step.
 */
export function decideNs5JudgeAction(input: {
  candidates: readonly Ns5JudgeCandidate[];
  verdicts: readonly Ns5JudgeVerdict[];
  repairAttempt: number;
  ontologyRepairAttempt?: number;
  maxRepairs?: number;
  maxOntologyRepairs?: number;
}): Ns5JudgeAction {
  const maxRepairs = input.maxRepairs ?? NS5_JUDGE_MAX_REPAIRS;
  const maxOntologyRepairs = input.maxOntologyRepairs ?? NS5_JUDGE_MAX_ONTOLOGY_REPAIRS;
  const ontologyRepairAttempt = input.ontologyRepairAttempt ?? 0;
  if (!input.candidates.length) return { type: 'approveWithoutModel' };

  const remaining = remainingNs5JudgeCandidates(input.candidates, input.verdicts);
  const warnings = unjustifiedWarnings(input.candidates, input.verdicts);
  const unanswered = remaining.filter(candidate => !input.verdicts.some(item => item.candidateId === candidate.candidateId));

  if (!input.verdicts.length || unanswered.length) return { type: 'callModel' };
  if (!remaining.length) {
    return warnings.length ? { type: 'approveWithWarnings', warnings } : { type: 'approveWithoutModel' };
  }

  const switchRemaining = remaining.filter((candidate): candidate is Ns5JudgeSwitchCandidate => candidate.kind === 'writtenSwitch');
  if (switchRemaining.length) {
    const nextOntology = ontologyRepairAttempt + 1;
    if (nextOntology <= maxOntologyRepairs) {
      return {
        type: 'repairOntology',
        attempt: nextOntology,
        entityIds: [...new Set(switchRemaining.map(item => item.entityId))],
        entityFeedback: formatNs5JudgeOntologyFeedback(input.candidates, input.verdicts),
      };
    }
    return {
      type: 'commentLeftovers',
      leftovers: [...switchRemaining],
      message: formatNs5JudgeFailMessage(switchRemaining),
    };
  }

  const nextAttempt = input.repairAttempt + 1;
  if (nextAttempt <= maxRepairs) {
    const briefs = missingJourneyBriefs(input.candidates, input.verdicts);
    return {
      type: 'repairJourneys',
      attempt: nextAttempt,
      briefs: formatNs5JudgeRepairFeedback(briefs),
    };
  }
  return {
    type: 'commentLeftovers',
    leftovers: [...remaining],
    message: formatNs5JudgeFailMessage(remaining),
  };
}

export function planNs5JudgeRepairSteps(
  moduleName: string,
  attempt: number,
  gateFeedback: string,
): { repair: mls.msg.AIAgentStep; revalidate: mls.msg.AIAgentStep } {
  const repair = createNs5RetryStep('journeys20', moduleName, 'repair', attempt, { gateFeedback });
  const repairPlanId = String(repair.planning?.planId || `journeys20-repair-${attempt}`);
  const revalidate: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: attempt > 1 ? `Judge · ${attempt}` : 'Judge · revalidate',
    status: 'waiting_dependency',
    nextSteps: [],
    agentName: NS5_AGENT_NAME,
    prompt: JSON.stringify({ planId: 'judge35', moduleName, repairAttempt: attempt }),
    rags: [],
    planning: {
      planId: `judge35-revalidate-${attempt}`,
      dependsOn: [repairPlanId],
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
  return { repair, revalidate };
}

export function planNs5JudgeOntologyRevalidate(
  moduleName: string,
  ontologyRepairAttempt: number,
  repairAttempt: number,
  finalizePlanId: string,
): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: ontologyRepairAttempt > 1 ? `Judge · ontology ${ontologyRepairAttempt}` : 'Judge · ontology revalidate',
    status: 'waiting_dependency',
    nextSteps: [],
    agentName: NS5_AGENT_NAME,
    prompt: JSON.stringify({
      planId: 'judge35',
      moduleName,
      repairAttempt,
      ontologyRepairAttempt,
    }),
    rags: [],
    planning: {
      planId: `judge35-revalidate-ontology-${ontologyRepairAttempt}`,
      dependsOn: [finalizePlanId],
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}
