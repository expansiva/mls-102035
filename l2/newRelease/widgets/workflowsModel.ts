/// <mls fileReference="_102035_/l2/newRelease/widgets/workflowsModel.ts" enhancement="_blank" />

import type {
  Ns5JourneyDecision,
  Ns5WorkflowProcess,
  Ns5WorkflowTask,
  Ns5WorkflowTrigger,
  Ns5WorkflowsArtifact,
} from '../../solution/types.js';
import type { NewReleaseValidationIssue } from '../tobe.js';

export type WorkflowSchemaKind = 'v1' | 'v2' | 'unknown';
export type WorkflowTaskView = Omit<Ns5WorkflowTask, 'kind'> & { kind: Ns5WorkflowTask['kind'] | 'system' };
export type WorkflowProcessView = Omit<Ns5WorkflowProcess, 'trigger' | 'tasks'> & {
  trigger: Ns5WorkflowTrigger | null;
  tasks: WorkflowTaskView[];
};

export interface WorkflowsView {
  schema: WorkflowSchemaKind;
  schemaVersion: string;
  moduleName: string;
  processes: WorkflowProcessView[];
  journeyDecisions: Ns5JourneyDecision[];
  raw: unknown;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function triggerOf(value: unknown): Ns5WorkflowTrigger | null {
  const item = record(value);
  if (!['scheduled', 'event', 'manual'].includes(String(item.kind || ''))) return null;
  return {
    kind: item.kind as Ns5WorkflowTrigger['kind'],
    ...(typeof item.schedule === 'string' ? { schedule: item.schedule } : {}),
    ...(typeof item.event === 'string' ? { event: item.event } : {}),
    ...(typeof item.actorRef === 'string' ? { actorRef: item.actorRef } : {}),
  };
}

function taskOf(value: unknown): WorkflowTaskView {
  const item = record(value);
  const kind = ['human', 'mechanical', 'llm', 'wait', 'system'].includes(String(item.kind || ''))
    ? String(item.kind) as WorkflowTaskView['kind']
    : 'wait';
  return {
    taskId: String(item.taskId || ''),
    kind,
    ...(typeof item.actorRef === 'string' ? { actorRef: item.actorRef } : {}),
    ...(typeof item.journeyRef === 'string' ? { journeyRef: item.journeyRef } : {}),
    ...(typeof item.entityRef === 'string' ? { entityRef: item.entityRef } : {}),
    ...(typeof item.effect === 'string' ? { effect: item.effect as Ns5WorkflowTask['effect'] } : {}),
    ...(typeof item.transitionRef === 'string' ? { transitionRef: item.transitionRef } : {}),
    next: strings(item.next),
    description: String(item.description || ''),
  };
}

export function workflowSchemaKind(value: unknown): WorkflowSchemaKind {
  const version = String(record(value).schemaVersion || '');
  if (version.includes('workflows-v2')) return 'v2';
  if (version.includes('workflows-v1')) return 'v1';
  return 'unknown';
}

export function normalizeWorkflows(value: unknown): WorkflowsView {
  const root = record(value);
  const processes = Array.isArray(root.processes) ? root.processes.map(process => {
    const item = record(process);
    return {
      processId: String(item.processId || ''),
      title: String(item.title || item.processId || ''),
      description: String(item.description || ''),
      trigger: triggerOf(item.trigger),
      tasks: Array.isArray(item.tasks) ? item.tasks.map(taskOf) : [],
    };
  }) : [];
  const journeyDecisions = Array.isArray(root.journeyDecisions) ? root.journeyDecisions.map(decision => {
    const item = record(decision);
    return {
      journeyId: String(item.journeyId || ''),
      inProcess: item.inProcess === true,
      ...(typeof item.processId === 'string' ? { processId: item.processId } : {}),
    };
  }) : [];
  return {
    schema: workflowSchemaKind(value),
    schemaVersion: String(root.schemaVersion || ''),
    moduleName: String(root.moduleName || ''),
    processes,
    journeyDecisions,
    raw: value,
  };
}

export function workflowTaskCount(processes: readonly WorkflowProcessView[]): number {
  return processes.reduce((total, process) => total + process.tasks.length, 0);
}

export function workflowStartTaskIds(process: WorkflowProcessView): string[] {
  const referenced = new Set(process.tasks.flatMap(task => task.next));
  return process.tasks.map(task => task.taskId).filter(taskId => !referenced.has(taskId));
}

export function workflowNextLabels(process: WorkflowProcessView, task: WorkflowTaskView): string[] {
  const titleById = new Map(process.tasks.map(item => [item.taskId, item.description || item.taskId]));
  return task.next.map(id => titleById.get(id) || id);
}

export function workflowOracleIssues(issues: readonly NewReleaseValidationIssue[]): NewReleaseValidationIssue[] {
  return issues.filter(issue => issue.artifact === 'workflows.defs.ts'
    || issue.code === 'I6'
    || issue.code.includes('FINALIZE_I6'));
}

export function nextMemberId(prefix: string, existing: readonly string[]): string {
  const ids = new Set(existing);
  let number = 1;
  while (ids.has(`${prefix}${number}`)) number += 1;
  return `${prefix}${number}`;
}

export function workflowsArtifactFromView(view: WorkflowsView): Ns5WorkflowsArtifact | null {
  if (view.schema !== 'v2') return null;
  return view.raw as Ns5WorkflowsArtifact;
}

