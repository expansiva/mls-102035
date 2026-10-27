/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.ts" enhancement="_blank" />

import { ns5OntologyEntityIds, type Ns5OntologyAnyIndex } from '/_102035_/l2/solution/ontologyView.js';
import { ns5RuleEntries } from '/_102035_/l2/solution/rulesView.js';
import type {
  Ns5AccessArtifact,
  Ns5IntegrationArtifact,
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleArtifact,
  Ns5OntologyAnyEntity,
  Ns5RulesAny,
  Ns5WorkflowsArtifact,
} from '/_102035_/l2/solution/types.js';

export interface NrpFieldIndex {
  id: string;
  type: string;
  required: boolean;
}

export interface NrpTransitionIndex {
  id: string;
  from: string[];
  to: string;
  by: string[];
}

export interface NrpEntityIndex {
  entityId: string;
  kind: string;
  fields: NrpFieldIndex[];
  transitions: NrpTransitionIndex[];
}

export interface NrpRuleIndex {
  ruleId: string;
  description: string;
}

export interface NrpJourneyIndex {
  journeyId: string;
  title: string;
  actorRef: string;
  stepIds: string[];
}

export interface NrpGrantIndex {
  grantId: string;
  actorRef: string;
  entityRefs: string[];
  scope: string;
}

export interface NrpProcessIndex {
  processId: string;
  trigger: string;
  taskIds: string[];
}

export interface NrpEventIndex {
  id: string;
  direction: 'inbound' | 'outbound';
  event: string;
}

export interface NrpCompactIndex {
  moduleName: string;
  entities: NrpEntityIndex[];
  rules: NrpRuleIndex[];
  journeys: NrpJourneyIndex[];
  grants: NrpGrantIndex[];
  processes: NrpProcessIndex[];
  events: NrpEventIndex[];
}

export interface NrpModuleArtifacts {
  module: Ns5ModuleArtifact;
  journeyIndex: Ns5JourneyIndexArtifact;
  journeys: Ns5JourneyArtifact[];
  ontologyIndex: Ns5OntologyAnyIndex;
  entities: Ns5OntologyAnyEntity[];
  rules: Ns5RulesAny;
  workflows: Ns5WorkflowsArtifact;
  access: Ns5AccessArtifact;
  integration: Ns5IntegrationArtifact;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function fieldsOf(entity: Ns5OntologyAnyEntity): NrpFieldIndex[] {
  const source = entity as unknown as Record<string, unknown>;
  const record = source.record;
  if (isRecord(record) && isRecord(record.fields)) {
    return Object.entries(record.fields)
      .filter(([id]) => id !== 'details')
      .map(([id, field]) => {
        const item = isRecord(field) ? field : {};
        return {
          id,
          type: typeof item.type === 'string' ? item.type : '',
          required: item.required === true,
        };
      });
  }
  const fields = source.fields;
  if (!Array.isArray(fields)) return [];
  return fields.map(field => {
    const item = isRecord(field) ? field : {};
    return {
      id: typeof item.fieldId === 'string' ? item.fieldId : '',
      type: typeof item.type === 'string' ? item.type : '',
      required: item.required === true,
    };
  });
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string' && value) return [value];
  return [];
}

function transitionsOf(entity: Ns5OntologyAnyEntity): NrpTransitionIndex[] {
  const transitions = (entity as unknown as Record<string, unknown>).transitions;
  if (!Array.isArray(transitions)) return [];
  return transitions.map(item => {
    const row = isRecord(item) ? item : {};
    return {
      id: typeof row.transitionId === 'string' ? row.transitionId : '',
      from: stringList(row.from),
      to: typeof row.to === 'string' ? row.to : '',
      by: stringList(row.by),
    };
  });
}

function triggerOf(process: Ns5WorkflowsArtifact['processes'][number]): string {
  const trigger = process.trigger as { kind?: string; actorRef?: string; event?: string } | undefined;
  if (!trigger) return '';
  const parts = [trigger.kind, trigger.actorRef, trigger.event].filter(Boolean);
  return parts.join(':');
}

export function buildNrpIndex(artifacts: NrpModuleArtifacts): NrpCompactIndex {
  const entityOrder = ns5OntologyEntityIds(artifacts.ontologyIndex);
  const byId = new Map(artifacts.entities.map(entity => [entity.entityId, entity]));
  const entities = entityOrder.map(entityId => {
    const entity = byId.get(entityId);
    if (!entity) return { entityId, kind: '', fields: [], transitions: [] };
    return {
      entityId,
      kind: String((entity as { kind?: string }).kind || ''),
      fields: fieldsOf(entity),
      transitions: transitionsOf(entity),
    };
  });
  const journeys = artifacts.journeys.map(journey => ({
    journeyId: journey.journeyId,
    title: journey.business.title,
    actorRef: journey.business.actorRef,
    stepIds: journey.business.steps.map(step => step.stepId),
  }));
  const grants = artifacts.access.grants.map(grant => ({
    grantId: grant.grantId,
    actorRef: grant.actorRef,
    entityRefs: [...grant.entityRefs],
    scope: grant.dataScope.mode,
  }));
  const processes = artifacts.workflows.processes.map(process => ({
    processId: process.processId,
    trigger: triggerOf(process),
    taskIds: process.tasks.map(task => task.taskId),
  }));
  const events: NrpEventIndex[] = [
    ...artifacts.integration.inbound.map(item => ({
      id: item.id,
      direction: 'inbound' as const,
      event: item.event || item.id,
    })),
    ...artifacts.integration.outbound.map(item => ({
      id: item.id,
      direction: 'outbound' as const,
      event: item.event || item.id,
    })),
  ];
  return {
    moduleName: artifacts.module.moduleName,
    entities,
    rules: ns5RuleEntries(artifacts.rules).map(rule => ({
      ruleId: rule.ruleId,
      description: rule.description,
    })),
    journeys,
    grants,
    processes,
    events,
  };
}
