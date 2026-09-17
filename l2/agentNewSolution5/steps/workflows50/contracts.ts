/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/workflows50/contracts.ts" enhancement="_blank"/>

import { normalizeModuleName } from '/_102035_/l2/solution/fs.js';
import { splitNs5EntityRef } from '/_102035_/l2/solution/ontologyView.js';
import {
  NS5_WORKFLOWS_SCHEMA_VERSION,
  type Ns5JourneyDecision,
  type Ns5SystemDecision,
  type Ns5WorkflowProcess,
  type Ns5WorkflowTask,
  type Ns5WorkflowTrigger,
  type Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const EVENT_TRANSITION = /^([A-Z][A-Za-z0-9]*)\.([a-z][A-Za-z0-9]*)$/;
const TASK_KINDS = new Set(['human', 'mechanical', 'llm', 'wait']);
const EFFECTS = new Set(['create', 'update', 'transition']);
/** Deterministic extract of time/event phrases from sourcePrompt. Not in the prompt. Accents are folded first. */
const TIME_EVENT_MARKER = /\b(?:todo|cada|quando|automaticamente|a cada|mensal|diario)\b/;

export interface Ns5WorkflowsNormalization {
  processes: Ns5WorkflowProcess[];
  journeyDecisions: Ns5JourneyDecision[];
  systemDecisions: Ns5SystemDecision[];
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
      effect?: string;
      transitionRef?: string;
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
  kind: 'handoff' | 'foreignBy' | 'crossActorDecide' | 'systemBy' | 'timeBy';
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
    'Submit orchestrated processes: trigger plus human/mechanical/llm/wait stages, and one inProcess decision per journey. Not the entity lifecycle.',
    schema,
  );
}

export function normalizeNs5WorkflowsPayload(
  value: unknown,
  options?: { journeyIds?: readonly string[] },
): Ns5WorkflowsNormalization {
  const root = record(value);
  const rawProcesses = list(root.processes).map(normalizeProcess).filter(process => process.processId || process.tasks.length);
  const dropped: Ns5SystemDecision[] = [];
  const processes = rawProcesses.map(process => dropDuplicateTasks(process, dropped));
  return {
    processes,
    journeyDecisions: completeJourneyDecisions(list(root.journeyDecisions).map(normalizeDecision), processes, options?.journeyIds),
    systemDecisions: dropped,
  };
}

export function buildNs5WorkflowsArtifact(
  moduleName: string,
  processes: Ns5WorkflowProcess[],
  journeyDecisions: Ns5JourneyDecision[] = [],
  systemDecisions: Ns5SystemDecision[] = [],
): Ns5WorkflowsArtifact {
  return {
    schemaVersion: NS5_WORKFLOWS_SCHEMA_VERSION,
    moduleName,
    processes,
    journeyDecisions,
    ...(systemDecisions.length ? { systemDecisions } : {}),
  };
}

export function collectNs5TimeEventPhrases(sourcePrompt: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of sourcePrompt.split(/(?<=[.!?;\n])\s+/)) {
    const phrase = raw.trim();
    if (!phrase || !TIME_EVENT_MARKER.test(foldAccents(phrase))) continue;
    const key = foldAccents(phrase);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(phrase);
  }
  return out;
}

function foldAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function ns5WorkflowsNeedsLlm(
  signals: readonly Ns5ProcessSignal[],
  phrases: readonly string[],
): boolean {
  return signals.length > 0 || phrases.length > 0;
}

export function parseNs5TriggerEvent(event: string): { entityId: string; transitionId: string } | null {
  const match = EVENT_TRANSITION.exec(event.trim());
  if (!match) return null;
  return { entityId: match[1], transitionId: match[2] };
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
      if (transition.by === 'system' && transition.transitionId) {
        add({ kind: 'systemBy', entityId: entity.entityId, transitionId: transition.transitionId });
      } else if (transition.by === 'time' && transition.transitionId) {
        add({ kind: 'timeBy', entityId: entity.entityId, transitionId: transition.transitionId });
      }
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
      // ns5_43 T1: `affects` may name an embedded child (`PedidoCompra.details.itens`); the actor
      // touches the entity that owns it, so the signal is indexed by the root.
      const entitiesTouched = [step.entity, ...(step.affects || [])]
        .filter(Boolean)
        .map(ref => splitNs5EntityRef(ref).root);
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
  entities: readonly Ns5WorkflowsEntityView[],
): {
  actorIds: string[];
  journeyIds: string[];
  entityIds: string[];
  transitionRefs: string[];
  handoffs: Ns5HandoffRef[];
} {
  const journeyIds: string[] = [];
  for (const journey of journeys) {
    if (journey.journeyId) journeyIds.push(journey.journeyId);
  }
  const entityIds: string[] = [];
  const transitionRefs: string[] = [];
  for (const entity of entities) {
    if (entity.entityId) entityIds.push(entity.entityId);
    for (const transition of entity.transitions) {
      if (!transition.transitionId) continue;
      transitionRefs.push(`${entity.entityId}.${transition.transitionId}`);
    }
  }
  return {
    actorIds: actorIds.filter(Boolean),
    journeyIds,
    entityIds,
    transitionRefs,
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
    trigger: normalizeTrigger(source.trigger),
    tasks,
  };
}

function normalizeTrigger(value: unknown): Ns5WorkflowTrigger {
  const source = record(value);
  const kind = text(source.kind);
  if (kind === 'scheduled') return { kind: 'scheduled', schedule: text(source.schedule) };
  if (kind === 'event') return { kind: 'event', event: text(source.event) };
  const actorRef = memberId(text(source.actorRef), '');
  return actorRef ? { kind: 'manual', actorRef } : { kind: 'manual' };
}

function normalizeTask(value: unknown): Ns5WorkflowTask {
  const source = record(value);
  const kind = text(source.kind);
  const resolved = TASK_KINDS.has(kind) ? kind as Ns5WorkflowTask['kind'] : 'human';
  const actorRef = memberId(text(source.actorRef), '');
  const journeyRef = memberId(text(source.journeyRef), '');
  const entityRef = entityId(text(source.entityRef));
  const effect = text(source.effect);
  const transitionRef = memberId(text(source.transitionRef), '');
  const task: Ns5WorkflowTask = {
    taskId: memberId(text(source.taskId) || text(source.id), ''),
    kind: resolved,
    ...(resolved === 'human' && actorRef ? { actorRef } : {}),
    ...(resolved === 'human' && journeyRef ? { journeyRef } : {}),
    ...((resolved === 'mechanical' || resolved === 'llm') && actorRef ? { actorRef } : {}),
    ...((resolved === 'mechanical' || resolved === 'llm') && entityRef ? { entityRef } : {}),
    ...((resolved === 'mechanical' || resolved === 'llm') && EFFECTS.has(effect)
      ? { effect: effect as NonNullable<Ns5WorkflowTask['effect']> }
      : {}),
    ...((resolved === 'mechanical' || resolved === 'llm') && transitionRef ? { transitionRef } : {}),
    next: unique(strings(source.next).map(item => memberId(item, '')).filter(Boolean)),
    description: text(source.description),
  };
  return task;
}

function normalizeDecision(value: unknown): Ns5JourneyDecision {
  const source = record(value);
  const journeyId = memberId(text(source.journeyId), '');
  const processId = memberId(text(source.processId), '');
  const inProcess = source.inProcess === true;
  if (inProcess) return processId ? { journeyId, inProcess: true, processId } : { journeyId, inProcess: true };
  return { journeyId, inProcess: false };
}

function completeJourneyDecisions(
  raw: Ns5JourneyDecision[],
  processes: readonly Ns5WorkflowProcess[],
  journeyIds?: readonly string[],
): Ns5JourneyDecision[] {
  const byId = new Map<string, Ns5JourneyDecision>();
  for (const decision of raw) {
    if (!decision.journeyId || byId.has(decision.journeyId)) continue;
    byId.set(decision.journeyId, decision);
  }
  const ids = journeyIds?.length ? [...journeyIds] : [...byId.keys()];
  const processIds = new Set(processes.map(process => process.processId).filter(Boolean));
  return ids.filter(Boolean).map(journeyId => {
    const existing = byId.get(journeyId);
    if (!existing) return { journeyId, inProcess: false };
    if (!existing.inProcess) return { journeyId, inProcess: false };
    const processId = existing.processId && processIds.has(existing.processId) ? existing.processId : existing.processId;
    return processId ? { journeyId, inProcess: true, processId } : { journeyId, inProcess: true };
  });
}

function dropDuplicateTasks(process: Ns5WorkflowProcess, dropped: Ns5SystemDecision[]): Ns5WorkflowProcess {
  const kept: Ns5WorkflowTask[] = [];
  const seen = new Set<string>();
  const removed = new Map<string, string[]>();
  for (const task of process.tasks) {
    const key = duplicateKey(task);
    if (key && seen.has(key)) {
      if (task.taskId) removed.set(task.taskId, task.next);
      dropped.push({
        decisionId: `dropDuplicateTask${capitalize(task.taskId || 'anonymous')}`,
        chosen: 'drop',
        alternatives: ['keep', 'drop'],
        decidedBy: 'system',
      });
      continue;
    }
    if (key) seen.add(key);
    kept.push(task);
  }
  if (!removed.size) return { ...process, tasks: kept };
  const tasks = kept.map(task => ({
    ...task,
    next: spliceRemoved(task.next, removed),
  }));
  return { ...process, tasks };
}

function duplicateKey(task: Ns5WorkflowTask): string | null {
  if (task.kind === 'human' && task.journeyRef) return `human|${task.journeyRef}|${task.effect || ''}`;
  if ((task.kind === 'mechanical' || task.kind === 'llm') && task.entityRef) {
    return `${task.kind}|${task.entityRef}|${task.effect || ''}`;
  }
  return null;
}

function spliceRemoved(next: readonly string[], removed: Map<string, string[]>): string[] {
  const expand = (id: string, visiting: Set<string>): string[] => {
    if (!removed.has(id)) return [id];
    if (visiting.has(id)) return [];
    visiting.add(id);
    return (removed.get(id) || []).flatMap(item => expand(item, visiting));
  };
  return unique(next.flatMap(id => expand(id, new Set())));
}

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function memberId(value: string, fallback: string): string {
  const trimmed = (value || '').trim();
  if (MEMBER_ID.test(trimmed)) return trimmed;
  const id = normalizeModuleName(trimmed || fallback, fallback);
  return MEMBER_ID.test(id) ? id : fallback;
}

function entityId(value: string): string {
  return ENTITY_ID.test(value.trim()) ? value.trim() : '';
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
