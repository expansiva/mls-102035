/// <mls fileReference="_102035_/l2/newRelease/widgets/workflowsModel.ts" enhancement="_blank" />

import type {
  Ns5JourneyDecision,
  Ns5WorkflowFunction,
  Ns5WorkflowProcess,
  Ns5WorkflowTask,
  Ns5WorkflowTrigger,
  Ns5WorkflowsArtifact,
} from '../../solution/types.js';
import type { NewReleaseValidationIssue } from '/_102035_/l2/solution/candidate/tobePaths.js';

export type WorkflowSchemaKind = 'v1' | 'v2' | 'v3' | 'unknown';
export type WorkflowRoom = 'exclusive' | 'person' | 'group';
export type WorkflowWake = { mode: 'none' | 'periodic'; every?: string };
export type WorkflowTaskView = Omit<Ns5WorkflowTask, 'kind' | 'wake'> & {
  kind: Ns5WorkflowTask['kind'] | 'system';
  title?: string;
  wake?: WorkflowWake;
};
export type WorkflowProcessView = Omit<Ns5WorkflowProcess, 'trigger' | 'tasks' | 'functions' | 'room'> & {
  trigger: Ns5WorkflowTrigger | null;
  tasks: WorkflowTaskView[];
  functions: Ns5WorkflowFunction[];
  room: WorkflowRoom;
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

function functionsOf(value: unknown): Ns5WorkflowFunction[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const row = record(item);
    const functionId = typeof row.functionId === 'string' ? row.functionId : '';
    const description = typeof row.description === 'string' ? row.description : '';
    if (!functionId && !description) return [];
    return [{ functionId, description }];
  });
}

const ROOMS: readonly WorkflowRoom[] = ['exclusive', 'person', 'group'];

function roomOf(value: unknown): WorkflowRoom {
  return ROOMS.includes(value as WorkflowRoom) ? value as WorkflowRoom : 'exclusive';
}

function wakeOf(value: unknown): WorkflowWake {
  const item = record(value);
  if (item.mode === 'periodic' && typeof item.every === 'string' && item.every.length > 0) {
    return { mode: 'periodic', every: item.every };
  }
  return { mode: 'none' };
}

function taskOf(value: unknown): WorkflowTaskView {
  const item = record(value);
  const kind = ['human', 'mechanical', 'llm', 'wait', 'alert', 'system'].includes(String(item.kind || ''))
    ? String(item.kind) as WorkflowTaskView['kind']
    : 'wait';
  return {
    taskId: String(item.taskId || ''),
    ...(typeof item.title === 'string' ? {title: item.title} : {}),
    kind,
    ...(typeof item.actorRef === 'string' ? { actorRef: item.actorRef } : {}),
    ...(typeof item.journeyRef === 'string' ? { journeyRef: item.journeyRef } : {}),
    ...(typeof item.entityRef === 'string' ? { entityRef: item.entityRef } : {}),
    ...(typeof item.effect === 'string' ? { effect: item.effect as Ns5WorkflowTask['effect'] } : {}),
    ...(typeof item.transitionRef === 'string' ? { transitionRef: item.transitionRef } : {}),
    next: strings(item.next),
    description: String(item.description || ''),
    ...(kind === 'wait' ? { wake: wakeOf(item.wake) } : {}),
  };
}

export function workflowSchemaKind(value: unknown): WorkflowSchemaKind {
  const version = String(record(value).schemaVersion || '');
  if (version.includes('workflows-v3')) return 'v3';
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
      functions: functionsOf(item.functions),
      room: roomOf(item.room),
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
  if (!isEditableWorkflowSchema(view.schema)) return null;
  return view.raw as Ns5WorkflowsArtifact;
}

/** ns5_48: v3 is a superset of v2, so both forms are editable on the screen. */
export function isEditableWorkflowSchema(schema: WorkflowSchemaKind): boolean {
  return schema === 'v2' || schema === 'v3';
}

/**
 * ns5_48: nobody writes "this is a recurring duty" — the screen derives it. A process fired by a
 * schedule whose every stage is an alert or a person is an obligation, not orchestration.
 */
export function isRecurringDuty(process: WorkflowProcessView): boolean {
  return process.trigger?.kind === 'scheduled'
    && process.tasks.length > 0
    && process.tasks.every(task => task.kind === 'alert' || task.kind === 'human');
}


/** Only declared edges; cycles and self links are retained. */
export function workflowEdges(process: WorkflowProcessView) {
  return process.tasks.flatMap((task, from) => task.next.map(id => ({ from, to: process.tasks.findIndex(item => item.taskId === id), id })).filter(edge => edge.to >= 0));
}
export const WORKFLOW_TASK_KINDS = ['human', 'mechanical', 'llm', 'wait', 'alert'] as const satisfies readonly Ns5WorkflowTask['kind'][];
export function workflowNewTaskError(taskId: string, existing: readonly string[]): 'id' | 'duplicate' | null {
  if (!/^[a-z][a-zA-Z0-9]*$/.test(taskId)) return 'id';
  return existing.includes(taskId) ? 'duplicate' : null;
}
export function appendWorkflowTask(artifact: Ns5WorkflowsArtifact, processId: string, taskId: string): Ns5WorkflowsArtifact {
  const process = artifact.processes.find(item => item.processId === processId);
  if (!process || workflowNewTaskError(taskId, process.tasks.map(task => task.taskId))) return artifact;
  return { ...artifact, processes: artifact.processes.map(item => item !== process ? item : { ...item, tasks: [...item.tasks, { taskId, kind: 'wait', description: '', next: [], wake: {mode: 'none'} }] }) };
}
