/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/journeys20/gate.ts" enhancement="_blank"/>

import type { Ns5JourneyDraft } from '/_102035_/l2/agentNewSolution5/steps/journeys20/contracts.js';
import { ns5JourneyOperationKey } from '/_102035_/l2/agentNewSolution5/steps/journeys20/contracts.js';
import type { Ns5ModuleActor, Ns5SystemDecision } from '/_102035_/l2/solution/types.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const STEP_KINDS = new Set(['locate', 'inspect', 'act', 'decide', 'handoff']);
const ENTRY_MODES = new Set(['coldStart', 'contextOrLookup', 'fromNotification']);

export const NS5_JOURNEY_DROP_CHOICE = 'drop' as const;
export const NS5_JOURNEY_KEEP_CHOICE = 'keep' as const;

export interface Ns5JourneyGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface Ns5JourneyGateResult {
  ok: boolean;
  issues: Ns5JourneyGateIssue[];
}

export interface Ns5JourneyGateContext {
  actors: readonly Ns5ModuleActor[];
  moduleName?: string;
}

export interface Ns5InferredActorDrop {
  journeys: Ns5JourneyDraft[];
  actors: Ns5ModuleActor[];
  systemDecisions: Ns5SystemDecision[];
  droppedActorIds: string[];
}

export function validateNs5Journeys(
  journeys: Ns5JourneyDraft[],
  context: Ns5JourneyGateContext,
): Ns5JourneyGateResult {
  const issues: Ns5JourneyGateIssue[] = [];
  const actorIds = new Set(context.actors.map(actor => actor.actorId).filter(Boolean));

  if (!journeys.length) {
    error(issues, 'NS5_JOURNEY_NONE', 'At least one business journey is required.', 'journeys');
  }

  const journeyIds = new Set<string>();
  journeys.forEach((journey, journeyPosition) => {
    const base = `journeys[${journeyPosition}]`;
    if (!MEMBER_ID.test(journey.journeyId)) {
      error(issues, 'NS5_JOURNEY_ID', 'journeyId must be lowerCamel.', `${base}.journeyId`);
    }
    if (journey.journeyId === 'index') {
      error(issues, 'NS5_JOURNEY_ID_RESERVED', 'journeyId "index" is reserved for the catalogue file.', `${base}.journeyId`);
    }
    if (journey.journeyId && journeyIds.has(journey.journeyId)) {
      error(issues, 'NS5_JOURNEY_ID_DUPLICATE', `Duplicate journeyId ${journey.journeyId}.`, `${base}.journeyId`);
    }
    if (journey.journeyId) journeyIds.add(journey.journeyId);

    if (!journey.business.actorRef) {
      error(issues, 'NS5_JOURNEY_ACTOR', 'actorRef is required.', `${base}.business.actorRef`);
    } else if (!actorIds.has(journey.business.actorRef)) {
      error(issues, 'NS5_JOURNEY_ACTOR_UNKNOWN', `Unknown actorRef ${journey.business.actorRef}.`, `${base}.business.actorRef`);
    }
    if (!journey.business.title.trim()) {
      error(issues, 'NS5_JOURNEY_TITLE', 'Journey title is required.', `${base}.business.title`);
    }
    if (!journey.business.goal.trim()) {
      error(issues, 'NS5_JOURNEY_GOAL', 'Journey goal is required.', `${base}.business.goal`);
    }
    if (!ENTRY_MODES.has(journey.business.entry.mode)) {
      error(issues, 'NS5_JOURNEY_ENTRY', 'entry.mode must be coldStart, contextOrLookup or fromNotification.', `${base}.business.entry.mode`);
    }
    if (!journey.business.steps.length) {
      error(issues, 'NS5_JOURNEY_STEPS', 'Journey must contain at least one step.', `${base}.business.steps`);
    }
    if (!journey.business.steps.some(step => step.kind === 'act' || step.kind === 'decide')) {
      error(issues, 'NS5_JOURNEY_ACT_OR_DECIDE', 'Every journey needs at least one act or decide step.', `${base}.business.steps`);
    }
    if (!journey.business.outcome.statement.trim()) {
      error(issues, 'NS5_JOURNEY_OUTCOME', 'Outcome statement is required.', `${base}.business.outcome.statement`);
    }
    if (!journey.business.outcome.evidence.length || journey.business.outcome.evidence.some(item => !item.trim())) {
      error(issues, 'NS5_JOURNEY_EVIDENCE', 'Outcome needs observable evidence.', `${base}.business.outcome.evidence`);
    }

    const stepIds = new Set<string>();
    journey.business.steps.forEach((step, stepPosition) => {
      const path = `${base}.business.steps[${stepPosition}]`;
      if (!MEMBER_ID.test(step.stepId)) {
        error(issues, 'NS5_JOURNEY_STEP_ID', 'stepId must be lowerCamel.', `${path}.stepId`);
      }
      if (step.stepId && stepIds.has(step.stepId)) {
        error(issues, 'NS5_JOURNEY_STEP_ID_DUPLICATE', `Duplicate stepId ${step.stepId}.`, `${path}.stepId`);
      }
      if (step.stepId) stepIds.add(step.stepId);
      if (!STEP_KINDS.has(step.kind)) {
        error(issues, 'NS5_JOURNEY_STEP_KIND', `Unknown step kind ${step.kind || '(empty)'}. Use locate, inspect, act, decide or handoff.`, `${path}.kind`);
      }
      if (!step.entity) {
        error(issues, 'NS5_JOURNEY_STEP_ENTITY', 'Every step names the business record it operates on.', `${path}.entity`);
      } else if (!ENTITY_ID.test(step.entity)) {
        error(issues, 'NS5_JOURNEY_STEP_ENTITY_ID', 'Step entity must be a stable PascalCase identifier, not a display label.', `${path}.entity`);
      }
      if (!step.title.trim()) error(issues, 'NS5_JOURNEY_STEP_TITLE', 'Step title is required.', `${path}.title`);
      if (!step.description.trim()) {
        error(issues, 'NS5_JOURNEY_STEP_DESCRIPTION', 'Step description must state an observable result.', `${path}.description`);
      }
      if (step.kind === 'handoff') {
        if (!step.handoffTo) {
          error(issues, 'NS5_JOURNEY_HANDOFF_TO', 'A handoff step names handoffTo.', `${path}.handoffTo`);
        } else if (!actorIds.has(step.handoffTo)) {
          error(issues, 'NS5_JOURNEY_HANDOFF_TO_UNKNOWN', `Unknown handoffTo ${step.handoffTo}.`, `${path}.handoffTo`);
        }
      } else if (step.handoffTo) {
        const stepName = step.stepId || `index ${stepPosition}`;
        error(
          issues,
          'NS5_JOURNEY_HANDOFF_TO_KIND',
          `Step ${stepName}: remove the field handoffTo. Only a handoff step names handoffTo.`,
          `${path}.handoffTo`,
        );
      }
      if (step.affects?.length) {
        if (step.kind !== 'act') {
          error(issues, 'NS5_JOURNEY_STEP_AFFECTS_KIND', 'Only an act step lists other business objects in affects.', `${path}.affects`);
        }
        const seen = new Set<string>();
        step.affects.forEach((affect, affectPosition) => {
          const affectPath = `${path}.affects[${affectPosition}]`;
          if (!affect) {
            error(issues, 'NS5_JOURNEY_STEP_AFFECTS', 'affects entries cannot be empty.', affectPath);
          } else if (!ENTITY_ID.test(affect)) {
            error(issues, 'NS5_JOURNEY_STEP_AFFECTS_ID', 'affects must be a stable PascalCase identifier, not a display label.', affectPath);
          } else if (affect === step.entity) {
            error(issues, 'NS5_JOURNEY_STEP_AFFECTS_ENTITY', 'affects must not repeat the step entity.', affectPath);
          } else if (seen.has(affect)) {
            error(issues, 'NS5_JOURNEY_STEP_AFFECTS_DUPLICATE', `Duplicate affects entry ${affect}.`, affectPath);
          } else {
            seen.add(affect);
          }
        });
      }
    });
  });

  addTwinJourneyIssues(journeys, issues);
  return { ok: !issues.some(issue => issue.severity === 'error'), issues };
}

export function formatNs5JourneyGate(issues: Ns5JourneyGateIssue[]): string {
  return issues
    .filter(issue => issue.severity === 'error')
    .map(issue => {
      const where = issue.path ? ` ${issue.path}` : '';
      return `${issue.code}${where}: ${issue.message}`;
    })
    .join('\n');
}

export function ns5DropInferredActorDecisionId(actorId: string): string {
  return `dropInferredActor${pascalActor(actorId)}`;
}

/**
 * Inferred external actor whose steps are all also performed by another actor (or who has no
 * steps) is a persona: drop the actor and their journeys. kind:system stays. origin is the only
 * structured signal.
 */
export function applyNs5InferredActorDrop(
  journeys: Ns5JourneyDraft[],
  actors: readonly Ns5ModuleActor[],
): Ns5InferredActorDrop {
  let remainingJourneys = journeys;
  const remainingActors = [...actors];
  const systemDecisions: Ns5SystemDecision[] = [];
  const droppedActorIds: string[] = [];

  for (const actor of actors) {
    if (actor.kind === 'system') continue;
    if (actor.kind !== 'external' || actor.origin !== 'inferred') continue;
    if (actorHasExclusiveSteps(remainingJourneys, actor.actorId)) continue;
    remainingJourneys = remainingJourneys.filter(journey => journey.business.actorRef !== actor.actorId);
    const actorIndex = remainingActors.findIndex(item => item.actorId === actor.actorId);
    if (actorIndex >= 0) remainingActors.splice(actorIndex, 1);
    droppedActorIds.push(actor.actorId);
    systemDecisions.push({
      decisionId: ns5DropInferredActorDecisionId(actor.actorId),
      chosen: NS5_JOURNEY_DROP_CHOICE,
      alternatives: [NS5_JOURNEY_KEEP_CHOICE],
      decidedBy: 'system',
    });
  }

  return { journeys: remainingJourneys, actors: remainingActors, systemDecisions, droppedActorIds };
}

function addTwinJourneyIssues(journeys: Ns5JourneyDraft[], issues: Ns5JourneyGateIssue[]): void {
  const groups = new Map<string, Ns5JourneyDraft[]>();
  journeys.forEach(journey => {
    const operations = ns5JourneyOperationKey(journey);
    if (!operations || !journey.business.actorRef) return;
    const key = `${journey.business.actorRef}|${operations}`;
    const group = groups.get(key) || [];
    group.push(journey);
    groups.set(key, group);
  });
  groups.forEach((group, key) => {
    if (group.length < 2) return;
    const separator = key.indexOf('|');
    const actorRef = key.slice(0, separator);
    const operations = key.slice(separator + 1);
    error(
      issues,
      'NS5_JOURNEY_TWIN',
      `Journeys ${group.map(item => item.journeyId).join(', ')} are twins: same actor (${actorRef}) and same operations (${operations}).`,
      'journeys',
    );
  });
}

function actorHasExclusiveSteps(journeys: Ns5JourneyDraft[], actorId: string): boolean {
  const own = new Set<string>();
  const others = new Set<string>();
  journeys.forEach(journey => {
    const target = journey.business.actorRef === actorId ? own : others;
    journey.business.steps.forEach(step => {
      const fingerprint = step.kind && step.entity ? `${step.kind}:${step.entity}` : '';
      if (fingerprint) target.add(fingerprint);
    });
  });
  if (!own.size) return false;
  for (const fingerprint of own) if (!others.has(fingerprint)) return true;
  return false;
}

function pascalActor(actorId: string): string {
  return `${actorId.charAt(0).toUpperCase()}${actorId.slice(1)}`;
}

function error(issues: Ns5JourneyGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, ...(path ? { path } : {}) });
}
