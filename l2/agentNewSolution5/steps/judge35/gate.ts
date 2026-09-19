/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/judge35/gate.ts" enhancement="_blank"/>

import {
  NS5_JUDGE_VERDICTS,
  type Ns5JudgeCandidate,
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

function error(issues: Ns5JudgeGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, path });
}

/** The verdict list is well-formed: one row per candidate, enum, brief required on missingJourney. */
export function validateNs5JudgeVerdicts(
  verdicts: readonly Ns5JudgeVerdict[],
  candidates: readonly Ns5JudgeCandidate[],
): Ns5JudgeGateResult {
  const issues: Ns5JudgeGateIssue[] = [];
  const candidateIds = new Set(candidates.map(item => item.candidateId));
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
      error(issues, 'NS5_JUDGE_VERDICT', 'verdict must be missingJourney or transitionUnjustified.', `${path}.verdict`);
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
