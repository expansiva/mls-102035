/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/judge35/gate.ts" enhancement="_blank"/>

import {
  NS5_JUDGE_VERDICTS,
  ns5JudgeEntitiesLinked,
  parseNs5JudgeCoveredBy,
  type Ns5JudgeCandidate,
  type Ns5JudgeJourneyView,
  type Ns5JudgeRelationshipView,
  type Ns5JudgeVerdict,
} from '/_102035_/l2/agentNewSolution5/steps/judge35/contracts.js';

export interface Ns5JudgeGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface Ns5JudgeGateResult {
  ok: boolean;
  issues: Ns5JudgeGateIssue[];
}

export interface Ns5JudgeGateContext {
  journeys: readonly Ns5JudgeJourneyView[];
  relationships: readonly Ns5JudgeRelationshipView[];
}

function error(issues: Ns5JudgeGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, path });
}

function validateCoveredByAct(
  issues: Ns5JudgeGateIssue[],
  verdict: Ns5JudgeVerdict,
  candidate: Ns5JudgeCandidate | undefined,
  context: Ns5JudgeGateContext,
  path: string,
): void {
  if (!candidate) return;
  if (candidate.kind !== 'uncitedHumanTransition') {
    error(issues, 'NS5_JUDGE_COVERED_KIND', 'coveredByAct applies only to an uncited human transition.', `${path}.verdict`);
    return;
  }
  const parsed = parseNs5JudgeCoveredBy(verdict.coveredBy || '');
  if (!parsed) {
    error(issues, 'NS5_JUDGE_COVERED_BY', 'coveredByAct needs coveredBy as journeyId.stepId.', `${path}.coveredBy`);
    return;
  }
  const journey = context.journeys.find(item => item.journeyId === parsed.journeyId);
  const step = journey?.steps.find(item => item.stepId === parsed.stepId);
  if (!journey || !step) {
    error(issues, 'NS5_JUDGE_COVERED_STEP', `Unknown step ${verdict.coveredBy}.`, `${path}.coveredBy`);
    return;
  }
  if (step.kind !== 'act') {
    error(issues, 'NS5_JUDGE_COVERED_ACT', `Step ${verdict.coveredBy} is not an act.`, `${path}.coveredBy`);
    return;
  }
  if (!step.transitionRef) {
    error(issues, 'NS5_JUDGE_COVERED_TRANSITION', `Step ${verdict.coveredBy} has no transitionRef.`, `${path}.coveredBy`);
    return;
  }
  if (!step.entity || !ns5JudgeEntitiesLinked(step.entity, candidate.entityId, context.relationships)) {
    error(
      issues,
      'NS5_JUDGE_COVERED_LINK',
      `Step entity ${step.entity || '(none)'} is not related to ${candidate.entityId}.`,
      `${path}.coveredBy`,
    );
    return;
  }
  const actor = journey.actorRef || '';
  if (!actor || !candidate.by.includes(actor)) {
    error(
      issues,
      'NS5_JUDGE_COVERED_ACTOR',
      `Step actor ${actor || '(none)'} is not in the transition by list.`,
      `${path}.coveredBy`,
    );
  }
}

function validateSwitchNeedsLifecycle(
  issues: Ns5JudgeGateIssue[],
  verdict: Ns5JudgeVerdict,
  candidate: Ns5JudgeCandidate | undefined,
  path: string,
): void {
  if (!candidate) return;
  if (candidate.kind !== 'writtenSwitch') {
    error(issues, 'NS5_JUDGE_SWITCH_KIND', 'switchNeedsLifecycle applies only to a written switch field.', `${path}.verdict`);
    return;
  }
  const states = (verdict.states || []).map(item => item.trim()).filter(Boolean);
  if (states.length !== 2) {
    error(issues, 'NS5_JUDGE_SWITCH_STATES', 'switchNeedsLifecycle needs states: [<on>, <off>] in English.', `${path}.states`);
  }
}

/** The verdict list is well-formed: one row per candidate, enum, brief required on missingJourney. */
export function validateNs5JudgeVerdicts(
  verdicts: readonly Ns5JudgeVerdict[],
  candidates: readonly Ns5JudgeCandidate[],
  context: Ns5JudgeGateContext = { journeys: [], relationships: [] },
): Ns5JudgeGateResult {
  const issues: Ns5JudgeGateIssue[] = [];
  const candidateIds = new Set(candidates.map(item => item.candidateId));
  const byId = new Map(candidates.map(item => [item.candidateId, item]));
  const seen = new Set<string>();

  for (const [index, verdict] of verdicts.entries()) {
    const path = `verdicts[${index}]`;
    if (!verdict.candidateId) {
      error(issues, 'NS5_JUDGE_CANDIDATE_ID', 'candidateId is required.', `${path}.candidateId`);
      continue;
    }
    if (!candidateIds.has(verdict.candidateId)) {
      error(issues, 'NS5_JUDGE_UNKNOWN_CANDIDATE', `Unknown candidate ${verdict.candidateId}.`, `${path}.candidateId`);
    }
    if (seen.has(verdict.candidateId)) {
      error(issues, 'NS5_JUDGE_CANDIDATE_DUPLICATE', `Duplicate candidate ${verdict.candidateId}.`, `${path}.candidateId`);
    }
    seen.add(verdict.candidateId);
    if (!(NS5_JUDGE_VERDICTS as readonly string[]).includes(verdict.verdict)) {
      error(issues, 'NS5_JUDGE_VERDICT', 'verdict must be missingJourney, transitionUnjustified, coveredByAct or switchNeedsLifecycle.', `${path}.verdict`);
    }
    if (verdict.verdict === 'missingJourney') {
      const brief = verdict.journeyBrief;
      if (!brief.actor || !brief.title || !brief.goal || !brief.transitionRef) {
        error(
          issues,
          'NS5_JUDGE_BRIEF',
          'missingJourney needs actor, title, goal and transitionRef (Entity.transitionId) in English.',
          `${path}.journeyBrief`,
        );
      }
    }
    if (verdict.verdict === 'coveredByAct') {
      validateCoveredByAct(issues, verdict, byId.get(verdict.candidateId), context, path);
    }
    if (verdict.verdict === 'switchNeedsLifecycle') {
      validateSwitchNeedsLifecycle(issues, verdict, byId.get(verdict.candidateId), path);
    }
  }

  for (const candidate of candidates) {
    if (!seen.has(candidate.candidateId)) {
      error(issues, 'NS5_JUDGE_CANDIDATE_MISSING', `No verdict for ${candidate.candidateId}.`, 'verdicts');
    }
  }

  return { ok: !issues.some(issue => issue.severity === 'error'), issues };
}

export function formatNs5JudgeGate(issues: readonly Ns5JudgeGateIssue[]): string {
  return issues
    .filter(issue => issue.severity === 'error')
    .map(issue => {
      const where = issue.path ? ` ${issue.path}` : '';
      return `${issue.code}${where}: ${issue.message}`;
    })
    .join('\n');
}
