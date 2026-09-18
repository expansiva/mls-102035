/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/workflows50/gate.ts" enhancement="_blank"/>

import type {
  Ns5JourneyDecision,
  Ns5WorkflowProcess,
  Ns5WorkflowTask,
  Ns5WorkflowTrigger,
} from '/_102035_/l2/solution/types.js';
import { parseNs5InboundEventRef } from '/_102035_/l2/agentNewSolution5/steps/integration70/contracts.js';
import {
  collectNs5Handoffs,
  collectNs5JourneyTransitionRefs,
  collectNs5ProcessSignals,
  parseNs5TriggerEvent,
  type Ns5WorkflowsEntityView,
  type Ns5WorkflowsJourneyView,
} from '/_102035_/l2/agentNewSolution5/steps/workflows50/contracts.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const TASK_KINDS = new Set(['human', 'mechanical', 'llm', 'wait', 'alert']);
const EFFECTS = new Set(['create', 'update', 'transition']);
/**
 * ns5_49: the signals that oblige a process are the ones the JOURNEYS carry. `foreignBy` is read off
 * the ontology, which in the flow v2 order does not exist yet, so it can no longer oblige anything
 * here; finalize80 I6 still warns about it once both artifacts are on disk.
 */
const MUST_PROCESS = new Set(['handoff', 'crossActorDecide']);

export interface Ns5WorkflowsGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface Ns5WorkflowsGateResult {
  ok: boolean;
  issues: Ns5WorkflowsGateIssue[];
}

export interface Ns5WorkflowsGateContext {
  moduleName?: string;
  actorIds: readonly string[];
  journeys: readonly Ns5WorkflowsJourneyView[];
  entities: readonly Ns5WorkflowsEntityView[];
  journeyDecisions?: readonly Ns5JourneyDecision[];
}

export function validateNs5Workflows(
  processes: Ns5WorkflowProcess[],
  context: Ns5WorkflowsGateContext,
): Ns5WorkflowsGateResult {
  const issues: Ns5WorkflowsGateIssue[] = [];
  const actorIds = new Set(context.actorIds.filter(Boolean));
  const journeyById = new Map(context.journeys.map(journey => [journey.journeyId, journey]));
  const entityById = new Map(context.entities.map(entity => [entity.entityId, entity]));
  // ns5_49: `[]` means "ontology30 has not run yet" (flow v2 order). The recorded v2 runs still pass
  // their entities, so the checks against the ontology keep running for them.
  const hasOntology = context.entities.length > 0;
  // ns5_56: `Entity.transitionId` a journey step actually moves — the same catalog the human prompt
  // hands the model (`collectNs5WorkflowsRefCatalog`). With no ontology this is what an event trigger
  // is checked against, so a condition over data cannot be dressed up as an event.
  const journeyTransitionRefs = new Set(collectNs5JourneyTransitionRefs(context.journeys));
  const processIds = new Set<string>();
  const coveredHandoffs = new Set<string>();
  const signals = collectNs5ProcessSignals(context.journeys, context.entities);
  const mustProcess = signals.filter(signal => MUST_PROCESS.has(signal.kind));

  if (!processes.length && mustProcess.length) {
    error(
      issues,
      'NS5_WORKFLOWS_SIGNAL_WITHOUT_PROCESS',
      'A process signal is present (handoff, foreign-by transition or cross-actor decide) so processes cannot be empty.',
    );
  }

  processes.forEach((process, processIndex) => {
    const base = `processes[${processIndex}]`;
    if (!MEMBER_ID.test(process.processId)) {
      error(issues, 'NS5_WORKFLOWS_ID', 'processId must be lowerCamel.', `${base}.processId`);
    }
    if (process.processId && processIds.has(process.processId)) {
      error(issues, 'NS5_WORKFLOWS_ID_DUPLICATE', `Duplicate processId ${process.processId}.`, `${base}.processId`);
    }
    if (process.processId) processIds.add(process.processId);
    if (!process.title.trim()) error(issues, 'NS5_WORKFLOWS_TITLE', 'Process title is required.', `${base}.title`);
    if (!process.description.trim()) {
      error(issues, 'NS5_WORKFLOWS_DESCRIPTION', 'Process description is required.', `${base}.description`);
    }
    validateTrigger(process.trigger, `${base}.trigger`, { hasOntology, actorIds, entityById, journeyTransitionRefs, issues });
    if (!process.tasks.length) {
      error(issues, 'NS5_WORKFLOWS_TASKS', 'A process lists at least one task.', `${base}.tasks`);
    }

    const taskIds = new Set<string>();
    process.tasks.forEach((task, taskIndex) => {
      const path = `${base}.tasks[${taskIndex}]`;
      validateTask(task, path, { hasOntology, actorIds, journeyById, entityById, taskIds, coveredHandoffs, issues });
    });

    process.tasks.forEach((task, taskIndex) => {
      const path = `${base}.tasks[${taskIndex}].next`;
      task.next.forEach((nextId, position) => {
        if (!taskIds.has(nextId)) {
          error(issues, 'NS5_WORKFLOWS_NEXT_UNKNOWN', `Unknown next task ${nextId}.`, `${path}[${position}]`);
        }
      });
    });

    if (hasCycleWithoutWait(process.tasks)) {
      error(
        issues,
        'NS5_WORKFLOWS_CYCLE',
        'Task graph has a cycle that does not go through a wait task.',
        `${base}.tasks`,
      );
    }
  });

  validateJourneyDecisions(context.journeyDecisions || [], {
    journeyById,
    processIds,
    issues,
  });

  const handoffs = collectNs5Handoffs(context.journeys);
  handoffs.forEach((handoff, index) => {
    const key = `${handoff.journeyId}.${handoff.stepId}`;
    if (coveredHandoffs.has(key)) return;
    error(
      issues,
      'NS5_WORKFLOWS_HANDOFF_UNCOVERED',
      `Journey handoff ${key} must appear as a human task journeyRef.`,
      `handoffs[${index}]`,
    );
  });

  return { ok: !issues.some(issue => issue.severity === 'error'), issues };
}

export function formatNs5WorkflowsGate(issues: Ns5WorkflowsGateIssue[]): string {
  return issues
    .filter(issue => issue.severity === 'error')
    .map(issue => {
      const where = issue.path ? ` ${issue.path}` : '';
      return `${issue.code}${where}: ${issue.message}`;
    })
    .join('\n');
}

function validateTrigger(
  trigger: Ns5WorkflowTrigger,
  path: string,
  ctx: {
    hasOntology: boolean;
    actorIds: Set<string>;
    entityById: Map<string, Ns5WorkflowsEntityView>;
    journeyTransitionRefs: Set<string>;
    issues: Ns5WorkflowsGateIssue[];
  },
): void {
  const { issues } = ctx;
  if (trigger.kind === 'scheduled') {
    if (!trigger.schedule?.trim()) {
      error(issues, 'NS5_WORKFLOWS_TRIGGER', 'A scheduled trigger names schedule.', `${path}.schedule`);
    }
    return;
  }
  if (trigger.kind === 'manual') {
    if (!trigger.actorRef) {
      error(issues, 'NS5_WORKFLOWS_TRIGGER_ACTOR', 'A manual trigger names actorRef.', `${path}.actorRef`);
    } else if (!ctx.actorIds.has(trigger.actorRef)) {
      error(issues, 'NS5_WORKFLOWS_ACTOR_UNKNOWN', `Unknown actorRef ${trigger.actorRef}.`, `${path}.actorRef`);
    }
    return;
  }
  if (trigger.kind !== 'event') {
    error(issues, 'NS5_WORKFLOWS_TRIGGER', 'trigger.kind must be scheduled, event or manual.', `${path}.kind`);
    return;
  }
  if (!trigger.event?.trim()) {
    error(issues, 'NS5_WORKFLOWS_TRIGGER_EVENT', 'An event trigger names event.', `${path}.event`);
    return;
  }
  const parsed = parseNs5TriggerEvent(trigger.event);
  if (!parsed) {
    if (parseNs5InboundEventRef(trigger.event)) return;
    error(
      issues,
      'NS5_WORKFLOWS_TRIGGER_EVENT',
      'trigger.event must be Entity.transitionId of this module or module.eventId of an inbound event.',
      `${path}.event`,
    );
    return;
  }
  // ns5_56 (was ns5_49: a free declaration): with no ontology the reference is checked against the
  // transitions the JOURNEYS move — the catalog the model received. `manutencaoFrota` invented
  // `PlanoManutencao.preventivaVencida`, a condition over data, and only finalize80 I1 saw it, with no
  // repair round left. With the ontology on hand the lookup below is the stricter one and stands.
  if (!ctx.hasOntology) {
    const ref = `${parsed.entityId}.${parsed.transitionId}`;
    if (!ctx.journeyTransitionRefs.has(ref)) {
      error(
        issues,
        'NS5_WORKFLOWS_TRIGGER_EVENT',
        `${ref} is not a transition any journey moves. A condition read from the data is a derived field, not an event; what somebody must do about it on a schedule is a scheduled process with an alert stage.`,
        `${path}.event`,
      );
    }
    return;
  }
  const entity = ctx.entityById.get(parsed.entityId);
  if (!entity) {
    error(issues, 'NS5_WORKFLOWS_ENTITY_UNKNOWN', `Unknown entity ${parsed.entityId}.`, `${path}.event`);
    return;
  }
  if (!entity.transitions.some(item => item.transitionId === parsed.transitionId)) {
    error(
      issues,
      'NS5_WORKFLOWS_TRIGGER_EVENT',
      `Unknown transition ${parsed.entityId}.${parsed.transitionId}.`,
      `${path}.event`,
    );
  }
}

function validateTask(
  task: Ns5WorkflowTask,
  path: string,
  ctx: {
    hasOntology: boolean;
    actorIds: Set<string>;
    journeyById: Map<string, Ns5WorkflowsJourneyView>;
    entityById: Map<string, Ns5WorkflowsEntityView>;
    taskIds: Set<string>;
    coveredHandoffs: Set<string>;
    issues: Ns5WorkflowsGateIssue[];
  },
): void {
  const { issues } = ctx;
  if (!MEMBER_ID.test(task.taskId)) {
    error(issues, 'NS5_WORKFLOWS_ID', 'taskId must be lowerCamel.', `${path}.taskId`);
  }
  if (task.taskId && ctx.taskIds.has(task.taskId)) {
    error(issues, 'NS5_WORKFLOWS_ID_DUPLICATE', `Duplicate taskId ${task.taskId}.`, `${path}.taskId`);
  }
  if (task.taskId) ctx.taskIds.add(task.taskId);
  if (!TASK_KINDS.has(task.kind)) {
    error(issues, 'NS5_WORKFLOWS_KIND', 'kind must be human, mechanical, llm, wait or alert.', `${path}.kind`);
  }
  if (!task.description.trim()) {
    error(issues, 'NS5_WORKFLOWS_DESCRIPTION', 'Task description is required.', `${path}.description`);
  }

  if (task.kind === 'human') {
    if (!task.actorRef) {
      error(issues, 'NS5_WORKFLOWS_HUMAN_ACTOR', 'A human task names actorRef.', `${path}.actorRef`);
    } else if (!ctx.actorIds.has(task.actorRef)) {
      error(issues, 'NS5_WORKFLOWS_ACTOR_UNKNOWN', `Unknown actorRef ${task.actorRef}.`, `${path}.actorRef`);
    }
    if (!task.journeyRef) {
      error(issues, 'NS5_WORKFLOWS_HUMAN_JOURNEY', 'A human task names journeyRef.', `${path}.journeyRef`);
    } else {
      validateJourneyRef(task.journeyRef, `${path}.journeyRef`, ctx);
    }
    return;
  }

  // ns5_48: an alert is a recurring duty of a person. The schedule lives on the trigger, the
  // instruction on the description; it points at no journey and at no entity.
  if (task.kind === 'alert') {
    if (!task.actorRef) {
      error(issues, 'NS5_WORKFLOWS_ALERT_ACTOR', 'An alert stage names actorRef.', `${path}.actorRef`);
    } else if (!ctx.actorIds.has(task.actorRef)) {
      error(issues, 'NS5_WORKFLOWS_ALERT_ACTOR', `Unknown actorRef ${task.actorRef}.`, `${path}.actorRef`);
    }
    if (task.journeyRef || task.entityRef) {
      error(issues, 'NS5_WORKFLOWS_KIND', 'alert carries no journey or entity.', `${path}.kind`);
    }
    return;
  }

  if (task.actorRef && !ctx.actorIds.has(task.actorRef)) {
    error(issues, 'NS5_WORKFLOWS_ACTOR_UNKNOWN', `Unknown actorRef ${task.actorRef}.`, `${path}.actorRef`);
  }

  if (task.kind === 'wait') return;

  if (task.kind === 'mechanical' || task.kind === 'llm') {
    if (!task.entityRef || !ENTITY_ID.test(task.entityRef)) {
      error(issues, 'NS5_WORKFLOWS_ENTITY', 'A mechanical or llm task names entityRef.', `${path}.entityRef`);
    } else if (ctx.hasOntology && !ctx.entityById.has(task.entityRef)) {
      error(issues, 'NS5_WORKFLOWS_ENTITY_UNKNOWN', `Unknown entityRef ${task.entityRef}.`, `${path}.entityRef`);
    }
    if (!task.effect || !EFFECTS.has(task.effect)) {
      error(issues, 'NS5_WORKFLOWS_EFFECT', 'A mechanical or llm task names effect.', `${path}.effect`);
    } else if (task.effect === 'transition') {
      validateTransitionRef(task, path, ctx);
    }
  }
}

function validateJourneyRef(
  journeyRef: string,
  path: string,
  ctx: {
    journeyById: Map<string, Ns5WorkflowsJourneyView>;
    coveredHandoffs: Set<string>;
    issues: Ns5WorkflowsGateIssue[];
  },
): void {
  const journey = ctx.journeyById.get(journeyRef);
  if (!MEMBER_ID.test(journeyRef)) {
    error(ctx.issues, 'NS5_WORKFLOWS_JOURNEY_ID', 'journeyRef must be lowerCamel.', path);
    return;
  }
  if (!journey) {
    error(ctx.issues, 'NS5_WORKFLOWS_JOURNEY_UNKNOWN', `Unknown journeyRef ${journeyRef}.`, path);
    return;
  }
  for (const step of journey.business.steps) {
    if (step.kind === 'handoff' && step.stepId) {
      ctx.coveredHandoffs.add(`${journeyRef}.${step.stepId}`);
    }
  }
}

function validateTransitionRef(
  task: Ns5WorkflowTask,
  path: string,
  ctx: {
    hasOntology: boolean;
    entityById: Map<string, Ns5WorkflowsEntityView>;
    issues: Ns5WorkflowsGateIssue[];
  },
): void {
  if (!task.transitionRef) {
    error(ctx.issues, 'NS5_WORKFLOWS_TRANSITION', 'effect transition names transitionRef.', `${path}.transitionRef`);
    return;
  }
  // ns5_49: the stage DECLARES the transition when the ontology is not written yet.
  if (!ctx.hasOntology) return;
  const entity = task.entityRef ? ctx.entityById.get(task.entityRef) : undefined;
  if (!entity) return;
  const transition = entity.transitions.find(item => item.transitionId === task.transitionRef);
  if (!transition) {
    error(
      ctx.issues,
      'NS5_WORKFLOWS_TRANSITION',
      `Unknown transitionRef ${task.entityRef}.${task.transitionRef}.`,
      `${path}.transitionRef`,
    );
    return;
  }
  if (!transitionByAllows(transition.by, task.actorRef)) {
    error(
      ctx.issues,
      'NS5_WORKFLOWS_TRANSITION_BY',
      `transitionRef ${task.transitionRef} by must be system or include the actor.`,
      `${path}.transitionRef`,
    );
  }
}

function validateJourneyDecisions(
  decisions: readonly Ns5JourneyDecision[],
  ctx: {
    journeyById: Map<string, Ns5WorkflowsJourneyView>;
    processIds: Set<string>;
    issues: Ns5WorkflowsGateIssue[];
  },
): void {
  const seen = new Set<string>();
  decisions.forEach((decision, index) => {
    const path = `journeyDecisions[${index}]`;
    if (!decision.journeyId || !MEMBER_ID.test(decision.journeyId)) {
      error(ctx.issues, 'NS5_WORKFLOWS_DECISION', 'journeyId must be lowerCamel.', `${path}.journeyId`);
    } else if (seen.has(decision.journeyId)) {
      error(ctx.issues, 'NS5_WORKFLOWS_DECISION', `Duplicate journeyId ${decision.journeyId}.`, `${path}.journeyId`);
    } else if (!ctx.journeyById.has(decision.journeyId)) {
      error(ctx.issues, 'NS5_WORKFLOWS_JOURNEY_UNKNOWN', `Unknown journeyId ${decision.journeyId}.`, `${path}.journeyId`);
    }
    if (decision.journeyId) seen.add(decision.journeyId);
    if (!decision.inProcess) return;
    if (!decision.processId) {
      error(ctx.issues, 'NS5_WORKFLOWS_DECISION', 'inProcess requires processId.', `${path}.processId`);
    } else if (!ctx.processIds.has(decision.processId)) {
      error(ctx.issues, 'NS5_WORKFLOWS_DECISION', `Unknown processId ${decision.processId}.`, `${path}.processId`);
    }
  });
}

function transitionByAllows(by: string[] | 'system' | 'time', actorRef?: string): boolean {
  if (by === 'system' || by === 'time') return true;
  return Boolean(actorRef && Array.isArray(by) && by.includes(actorRef));
}

function hasCycleWithoutWait(tasks: readonly Ns5WorkflowTask[]): boolean {
  const nodes = tasks.filter(task => task.kind !== 'wait' && task.taskId);
  const ids = new Set(nodes.map(task => task.taskId));
  const adj = new Map<string, string[]>();
  for (const task of nodes) {
    adj.set(task.taskId, task.next.filter(nextId => ids.has(nextId)));
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visited.has(id)) return false;
    if (visiting.has(id)) return true;
    visiting.add(id);
    for (const nextId of adj.get(id) || []) {
      if (visit(nextId)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  for (const id of ids) {
    if (visit(id)) return true;
  }
  return false;
}

function error(issues: Ns5WorkflowsGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, ...(path ? { path } : {}) });
}
