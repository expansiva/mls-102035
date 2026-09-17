/// <mls fileReference="_102035_/l2/newRelease/widgets/journeysModel.ts" enhancement="_blank" />

import type {
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5OntologyEntityArtifact,
} from '../../solution/types.js';
import type { NewReleaseValidationIssue } from '../tobe.js';

export const JOURNEY_ENTRY_MODES: Ns5JourneyArtifact['business']['entry']['mode'][] = [
  'coldStart', 'contextOrLookup', 'fromNotification',
];

export const JOURNEY_STEP_KINDS: Ns5JourneyArtifact['business']['steps'][number]['kind'][] = [
  'locate', 'inspect', 'act', 'decide', 'handoff',
];

export function orderedJourneys(
  index: Ns5JourneyIndexArtifact | null,
  journeys: readonly Ns5JourneyArtifact[],
): Ns5JourneyArtifact[] {
  if (!index) return [...journeys];
  const byId = new Map(journeys.map(journey => [journey.journeyId, journey]));
  return index.journeys.map(item => byId.get(item.journeyId)).filter((item): item is Ns5JourneyArtifact => !!item);
}

export function syncJourneyIndex(
  index: Ns5JourneyIndexArtifact,
  journey: Ns5JourneyArtifact,
): Ns5JourneyIndexArtifact {
  return {
    ...index,
    journeys: index.journeys.map(item => item.journeyId === journey.journeyId
      ? { journeyId: item.journeyId, actorRef: journey.business.actorRef, title: journey.business.title }
      : item),
  };
}

export function moveJourney(
  index: Ns5JourneyIndexArtifact,
  journeyId: string,
  targetJourneyId: string,
): Ns5JourneyIndexArtifact {
  if (journeyId === targetJourneyId) return index;
  const journeys = [...index.journeys];
  const from = journeys.findIndex(item => item.journeyId === journeyId);
  const to = journeys.findIndex(item => item.journeyId === targetJourneyId);
  if (from < 0 || to < 0) return index;
  const [moved] = journeys.splice(from, 1);
  journeys.splice(to, 0, moved);
  return { ...index, journeys };
}

export function moveJourneyStep(
  journey: Ns5JourneyArtifact,
  stepId: string,
  targetStepId: string,
): Ns5JourneyArtifact {
  if (stepId === targetStepId) return journey;
  const steps = [...journey.business.steps];
  const from = steps.findIndex(item => item.stepId === stepId);
  const to = steps.findIndex(item => item.stepId === targetStepId);
  if (from < 0 || to < 0) return journey;
  const [moved] = steps.splice(from, 1);
  steps.splice(to, 0, moved);
  return { ...journey, business: { ...journey.business, steps } };
}

export function nextJourneyStepId(journey: Ns5JourneyArtifact): string {
  const ids = new Set(journey.business.steps.map(step => step.stepId));
  let position = journey.business.steps.length + 1;
  while (ids.has(`step${position}`)) position += 1;
  return `step${position}`;
}

export interface JourneyTransitionOption {
  entityId: string;
  transitionId: string;
  from: string[];
  to: string;
  description: string;
  eligible: boolean;
}

export function journeyTransitions(
  entities: readonly Ns5OntologyEntityArtifact[],
  entityId: string,
  actorRef: string,
): JourneyTransitionOption[] {
  const entity = entities.find(item => item.entityId === entityId);
  return (entity?.transitions || []).map(transition => ({
    entityId,
    transitionId: transition.transitionId,
    from: transition.from,
    to: transition.to,
    description: transition.description,
    eligible: Array.isArray(transition.by) && transition.by.includes(actorRef),
  }));
}

export function journeyIssues(
  issues: readonly NewReleaseValidationIssue[],
  journeyId: string,
): NewReleaseValidationIssue[] {
  const artifact = `journeys/${journeyId}.defs.ts`;
  return issues.filter(issue => issue.artifact === artifact
    || issue.path.startsWith(`journeys.${journeyId}`)
    || ((issue.code.startsWith('I2') || issue.code.startsWith('I8')) && issue.message.includes(journeyId)));
}

export function journeyPath(journeyId: string): `journeys/${string}.defs.ts` {
  return `journeys/${journeyId}.defs.ts`;
}
