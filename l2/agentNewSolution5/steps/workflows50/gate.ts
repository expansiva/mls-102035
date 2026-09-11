/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/workflows50/gate.ts" enhancement="_blank"/>

import type { Ns5WorkflowProcess, Ns5WorkflowTask } from '/_102035_/l2/solution/types.js';
import {
  collectNs5Handoffs,
  collectNs5ProcessSignals,
  type Ns5WorkflowsEntityView,
  type Ns5WorkflowsJourneyView,
} from '/_102035_/l2/agentNewSolution5/steps/workflows50/contracts.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const TASK_KINDS = new Set(['human', 'system', 'wait']);

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
}

export function validateNs5Workflows(
  processes: Ns5WorkflowProcess[],
  context: Ns5WorkflowsGateContext,
): Ns5WorkflowsGateResult {
  const issues: Ns5WorkflowsGateIssue[] = [];
  const actorIds = new Set(context.actorIds.filter(Boolean));
  const journeyById = new Map(context.journeys.map(journey => [journey.journeyId, journey]));
  const processIds = new Set<string>();
  const coveredHandoffs = new Set<string>();
  const signals = collectNs5ProcessSignals(context.journeys, context.entities);

  if (!processes.length && signals.length) {
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
    if (!process.tasks.length) {
      error(issues, 'NS5_WORKFLOWS_TASKS', 'A process lists at least one task.', `${base}.tasks`);
    }

    const taskIds = new Set<string>();
    process.tasks.forEach((task, taskIndex) => {
      const path = `${base}.tasks[${taskIndex}]`;
      validateTask(task, path, { actorIds, journeyById, taskIds, coveredHandoffs, issues });
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

  const handoffs = collectNs5Handoffs(context.journeys);
  handoffs.forEach((handoff, index) => {
    const key = `${handoff.journeyId}.${handoff.stepId}`;
    if (coveredHandoffs.has(key)) return;
    error(
      issues,
      'NS5_WORKFLOWS_HANDOFF_UNCOVERED',
      `Journey handoff ${key} must appear as a task journeyRef+stepRef.`,
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

function validateTask(
  task: Ns5WorkflowTask,
  path: string,
  ctx: {
    actorIds: Set<string>;
    journeyById: Map<string, Ns5WorkflowsJourneyView>;
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
    error(issues, 'NS5_WORKFLOWS_KIND', 'kind must be human, system or wait.', `${path}.kind`);
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
  } else if (task.actorRef && !ctx.actorIds.has(task.actorRef)) {
    error(issues, 'NS5_WORKFLOWS_ACTOR_UNKNOWN', `Unknown actorRef ${task.actorRef}.`, `${path}.actorRef`);
  }

  if (task.stepRef && !task.journeyRef) {
    error(issues, 'NS5_WORKFLOWS_STEP_JOURNEY', 'stepRef requires journeyRef.', `${path}.stepRef`);
  }
  if (task.journeyRef) {
    const journey = ctx.journeyById.get(task.journeyRef);
    if (!MEMBER_ID.test(task.journeyRef)) {
      error(issues, 'NS5_WORKFLOWS_JOURNEY_ID', 'journeyRef must be lowerCamel.', `${path}.journeyRef`);
    } else if (!journey) {
      error(issues, 'NS5_WORKFLOWS_JOURNEY_UNKNOWN', `Unknown journeyRef ${task.journeyRef}.`, `${path}.journeyRef`);
    } else if (task.stepRef) {
      const step = journey.business.steps.find(item => item.stepId === task.stepRef);
      if (!step) {
        error(issues, 'NS5_WORKFLOWS_STEP_UNKNOWN', `Unknown stepRef ${task.journeyRef}.${task.stepRef}.`, `${path}.stepRef`);
      } else if (step.kind === 'handoff') {
        ctx.coveredHandoffs.add(`${task.journeyRef}.${task.stepRef}`);
      }
    }
  }
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
