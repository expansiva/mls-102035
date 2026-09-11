/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/workflows50/contracts.ts" enhancement="_blank"/>

import { normalizeModuleName } from '/_102035_/l2/solution/fs.js';
import {
  NS5_WORKFLOWS_SCHEMA_VERSION,
  type Ns5WorkflowProcess,
  type Ns5WorkflowTask,
  type Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const TASK_KINDS = new Set(['human', 'system', 'wait']);

export interface Ns5WorkflowsNormalization {
  processes: Ns5WorkflowProcess[];
}

export interface Ns5WorkflowsJourneyView {
  journeyId: string;
  business: {
    actorRef: string;
    steps: ReadonlyArray<{
      stepId: string;
      kind: string;
      entity: string;
      affects?: string[];
      handoffTo?: string;
      title?: string;
      description?: string;
    }>;
  };
}

export interface Ns5WorkflowsEntityView {
  entityId: string;
  transitions: ReadonlyArray<{ transitionId: string; by: string[] | 'system' | 'time' }>;
}

export interface Ns5ProcessSignal {
  kind: 'handoff' | 'foreignBy' | 'crossActorDecide';
  journeyId?: string;
  stepId?: string;
  entityId?: string;
  transitionId?: string;
}

export interface Ns5HandoffRef {
  journeyId: string;
  stepId: string;
  handoffTo: string;
}

export function buildNs5WorkflowsTool(
  schema: Record<string, unknown>,
  createTool: (name: string, description: string, artifactSchema: Record<string, unknown>) => mls.msg.LLMTool,
): mls.msg.LLMTool {
  return createTool(
    'submitNs5Workflows',
    'Submit orchestrated processes: sequenced human/system/wait tasks that point at existing journeys and steps. Not the entity lifecycle.',
    schema,
  );
}

export function normalizeNs5WorkflowsPayload(value: unknown): Ns5WorkflowsNormalization {
  const root = record(value);
  return {
    processes: list(root.processes).map(normalizeProcess).filter(process => process.processId || process.tasks.length),
  };
}

export function buildNs5WorkflowsArtifact(moduleName: string, processes: Ns5WorkflowProcess[]): Ns5WorkflowsArtifact {
  return {
    schemaVersion: NS5_WORKFLOWS_SCHEMA_VERSION,
    moduleName,
    processes,
  };
}

export function collectNs5ProcessSignals(
  journeys: readonly Ns5WorkflowsJourneyView[],
  entities: readonly Ns5WorkflowsEntityView[],
): Ns5ProcessSignal[] {
  const signals: Ns5ProcessSignal[] = [];
  const seen = new Set<string>();
  const add = (signal: Ns5ProcessSignal) => {
    const key = [
      signal.kind,
      signal.journeyId || '',
      signal.stepId || '',
      signal.entityId || '',
      signal.transitionId || '',
    ].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    signals.push(signal);
  };

  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.kind === 'handoff') {
        add({ kind: 'handoff', journeyId: journey.journeyId, stepId: step.stepId });
      }
    }
  }

  for (const entity of entities) {
    const byActors = new Set<string>();
    for (const transition of entity.transitions) {
      if (!Array.isArray(transition.by)) continue;
      for (const actor of transition.by) {
        if (actor) byActors.add(actor);
      }
    }
    if (byActors.size < 2) continue;
    for (const transition of entity.transitions) {
      if (!Array.isArray(transition.by) || !transition.transitionId) continue;
      add({ kind: 'foreignBy', entityId: entity.entityId, transitionId: transition.transitionId });
    }
  }

  const actorsByEntity = new Map<string, Set<string>>();
  for (const journey of journeys) {
    const actor = journey.business.actorRef;
    if (!actor) continue;
    for (const step of journey.business.steps) {
      const entitiesTouched = [step.entity, ...(step.affects || [])].filter(Boolean);
      for (const entityId of entitiesTouched) {
        const actors = actorsByEntity.get(entityId) || new Set<string>();
        actors.add(actor);
        actorsByEntity.set(entityId, actors);
      }
    }
  }
  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.kind !== 'decide' || !step.entity) continue;
      const actors = actorsByEntity.get(step.entity);
      if (!actors || actors.size < 2) continue;
      add({
        kind: 'crossActorDecide',
        journeyId: journey.journeyId,
        stepId: step.stepId,
        entityId: step.entity,
      });
    }
  }

  return signals;
}

export function collectNs5Handoffs(journeys: readonly Ns5WorkflowsJourneyView[]): Ns5HandoffRef[] {
  const out: Ns5HandoffRef[] = [];
  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.kind !== 'handoff' || !step.stepId) continue;
      out.push({
        journeyId: journey.journeyId,
        stepId: step.stepId,
        handoffTo: step.handoffTo || '',
      });
    }
  }
  return out;
}

export function collectNs5WorkflowsRefCatalog(
  journeys: readonly Ns5WorkflowsJourneyView[],
  actorIds: readonly string[],
): {
  actorIds: string[];
  journeyIds: string[];
  stepRefs: string[];
  handoffs: Ns5HandoffRef[];
} {
  const journeyIds: string[] = [];
  const stepRefs: string[] = [];
  for (const journey of journeys) {
    if (journey.journeyId) journeyIds.push(journey.journeyId);
    for (const step of journey.business.steps) {
      if (!step.stepId) continue;
      stepRefs.push(`${journey.journeyId}.${step.stepId}`);
    }
  }
  return {
    actorIds: actorIds.filter(Boolean),
    journeyIds,
    stepRefs,
    handoffs: collectNs5Handoffs(journeys),
  };
}

function normalizeProcess(value: unknown): Ns5WorkflowProcess {
  const source = record(value);
  const tasks = list(source.tasks).map(normalizeTask).filter(task => task.taskId || task.description);
  return {
    processId: memberId(text(source.processId) || text(source.id), ''),
    title: text(source.title),
    description: text(source.description),
    tasks,
  };
}

function normalizeTask(value: unknown): Ns5WorkflowTask {
  const source = record(value);
  const kind = text(source.kind);
  const actorRef = memberId(text(source.actorRef), '');
  const journeyRef = memberId(text(source.journeyRef), '');
  const stepRef = memberId(text(source.stepRef), '');
  return {
    taskId: memberId(text(source.taskId) || text(source.id), ''),
    kind: TASK_KINDS.has(kind) ? kind as Ns5WorkflowTask['kind'] : 'human',
    ...(actorRef ? { actorRef } : {}),
    ...(journeyRef ? { journeyRef } : {}),
    ...(stepRef ? { stepRef } : {}),
    next: unique(strings(source.next).map(item => memberId(item, '')).filter(Boolean)),
    description: text(source.description),
  };
}

function memberId(value: string, fallback: string): string {
  const trimmed = (value || '').trim();
  if (MEMBER_ID.test(trimmed)) return trimmed;
  const id = normalizeModuleName(trimmed || fallback, fallback);
  return MEMBER_ID.test(id) ? id : fallback;
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function strings(value: unknown): string[] {
  return list(value).map(text).filter(Boolean);
}
