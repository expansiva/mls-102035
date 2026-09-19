/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/judge35/contracts.ts" enhancement="_blank"/>

import { createNs5RetryStep, NS5_AGENT_NAME } from '/_102035_/l2/agentNewSolution5/helpers/ns5Core.js';

export const NS5_JUDGE_MAX_REPAIRS = 2;
export const NS5_JUDGE_VERDICTS = ['missingJourney', 'transitionUnjustified'] as const;
export type Ns5JudgeVerdictKind = typeof NS5_JUDGE_VERDICTS[number];

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

export interface Ns5JudgeEntityView {
  entityId: string;
  transitions: ReadonlyArray<Ns5JudgeTransitionView>;
}

export interface Ns5JudgeProcessTaskView {
  entityRef?: string;
  effect?: string;
  transitionRef?: string;
}

export interface Ns5JudgeProcessView {
  processId: string;
  tasks: ReadonlyArray<Ns5JudgeProcessTaskView>;
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

export type Ns5JudgeCandidate = Ns5JudgeUncitedCandidate | Ns5JudgeDecideCandidate;

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
}

export interface Ns5JudgeDraft {
  candidates: Ns5JudgeCandidate[];
  verdicts: Ns5JudgeVerdict[];
  rounds: number;
  noJudgeSignal?: boolean;
  warnings?: string[];
}

export type Ns5JudgeAction =
  | { type: 'approveWithoutModel' }
  | { type: 'callModel' }
  | { type: 'repairJourneys'; briefs: string; attempt: number }
  | { type: 'approveWithWarnings'; warnings: string[] }
  | { type: 'fail'; message: string };

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

export function collectNs5JudgeCandidates(
  journeys: readonly Ns5JudgeJourneyView[],
  entities: readonly Ns5JudgeEntityView[],
  processes: readonly Ns5JudgeProcessView[] = [],
): Ns5JudgeCandidate[] {
  const cited = citedKeys(journeys, processes);
  const uncited: Ns5JudgeUncitedCandidate[] = [];
  for (const entity of entities) {
    for (const transition of entity.transitions || []) {
      if (!isHumanBy(transition.by)) continue;
      const key = citationKey(entity.entityId, transition.transitionId);
      if (cited.has(key)) continue;
      uncited.push({
        kind: 'uncitedHumanTransition',
        candidateId: `uncited:${key}`,
        entityId: entity.entityId,
        transitionId: transition.transitionId,
        by: [...transition.by],
        from: [...(transition.from || [])],
        to: transition.to || '',
        description: transition.description || '',
      });
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

  return [...uncited, ...decides];
}

export function buildNs5JudgeTool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool(
    'submitNs5Judge',
    'Submit one verdict per candidate: missingJourney or transitionUnjustified.',
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
    const kind: Ns5JudgeVerdictKind = verdict === 'transitionUnjustified' ? 'transitionUnjustified' : 'missingJourney';
    out.push({ candidateId, verdict: kind, journeyBrief: briefOf(item.journeyBrief) });
  }
  return out;
}

export function remainingNs5JudgeCandidates(
  candidates: readonly Ns5JudgeCandidate[],
  verdicts: readonly Ns5JudgeVerdict[],
): Ns5JudgeCandidate[] {
  const unjustified = new Set(
    verdicts.filter(item => item.verdict === 'transitionUnjustified').map(item => item.candidateId),
  );
  return candidates.filter(candidate => !unjustified.has(candidate.candidateId));
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
    const label = candidate && candidate.kind === 'uncitedHumanTransition'
      ? `${candidate.entityId}.${candidate.transitionId}`
      : verdict.candidateId;
    out.push(`transitionUnjustified ${label}`);
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

export function formatNs5JudgeFailMessage(candidates: readonly Ns5JudgeCandidate[]): string {
  const labels = candidates.map(candidate => {
    if (candidate.kind === 'uncitedHumanTransition') return `${candidate.entityId}.${candidate.transitionId}`;
    const missing = candidate.transitionIds.filter(id => !candidate.citedTransitionIds.includes(id));
    return `${candidate.entityId}.${candidate.origin} (${missing.join(', ') || candidate.transitionIds.join(', ')})`;
  });
  return `judge35: journeys still miss these human transitions after repair: ${labels.join(', ')}.`;
}

/**
 * The step's brain, pure. Empty candidates never call a model. After verdicts, missingJourney
 * schedules a journeys20 repair (bounded by MAX_REPAIRS); transitionUnjustified is a warning and
 * never deletes a transition; leftovers after the budget fail with a named list.
 */
export function decideNs5JudgeAction(input: {
  candidates: readonly Ns5JudgeCandidate[];
  verdicts: readonly Ns5JudgeVerdict[];
  repairAttempt: number;
  maxRepairs?: number;
}): Ns5JudgeAction {
  const maxRepairs = input.maxRepairs ?? NS5_JUDGE_MAX_REPAIRS;
  if (!input.candidates.length) return { type: 'approveWithoutModel' };

  const remaining = remainingNs5JudgeCandidates(input.candidates, input.verdicts);
  const warnings = unjustifiedWarnings(input.candidates, input.verdicts);
  const unanswered = remaining.filter(candidate => !input.verdicts.some(item => item.candidateId === candidate.candidateId));

  if (!input.verdicts.length || unanswered.length) return { type: 'callModel' };
  if (!remaining.length) {
    return warnings.length ? { type: 'approveWithWarnings', warnings } : { type: 'approveWithoutModel' };
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
  return { type: 'fail', message: formatNs5JudgeFailMessage(remaining) };
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
