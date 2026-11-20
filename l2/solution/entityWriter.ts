/// <mls fileReference="_102035_/l2/solution/entityWriter.ts" enhancement="_blank"/>

/**
 * Who writes each entity, and the L4 v3 view adapted into the vocabulary this resolver branches on.
 *
 * PURE ON PURPOSE, the same way as `ontologyView.ts`: types and that view only. No `node:*`, no gate,
 * no agent step. An `l1` generator can import it.
 *
 * The parent of an `external` entity still resolves `parent` (M16). Nothing here special-cases storage.
 */

import { ns5ArrivalEffects } from '/_102035_/l2/solution/arrivalEffects.js';
import {
  ns5OntologyEdges,
  type Ns5OntologyAnyIndex,
  type Ns5OntologyEntityViewItem,
} from '/_102035_/l2/solution/ontologyView.js';

export type Ns5EntityWriter = 'journey' | 'crud' | 'inbound';

export function ns5EntityWriter(entity: { writer?: Ns5EntityWriter }): Ns5EntityWriter {
  return entity.writer === 'crud' || entity.writer === 'inbound' ? entity.writer : 'journey';
}

export type Ns5ResolvedWriterKind =
  | 'journey'
  | 'affects'
  | 'parent'
  | 'attach'
  | 'crud'
  | 'inbound'
  | 'process'
  | 'none';

export interface Ns5ResolvedWriterVia {
  entityId: string;
  relationshipId: string;
  stepRef?: string;
}

/** Stage, inbound id, or serve operation that writes the entity outside journeys. */
export interface Ns5ResolvedOutsideVia {
  source: 'process' | 'inbound' | 'serve';
  ref: string;
}

export interface Ns5ResolvedEntityWriter {
  kind: Ns5ResolvedWriterKind;
  via?: Ns5ResolvedWriterVia;
  outside?: Ns5ResolvedOutsideVia;
}

/** Structural slice: processes, inbound.writes, serve create/update. No gate contracts. */
export type Ns5OutsideJourneysInput = {
  workflows?: {
    processes?: ReadonlyArray<{
      processId?: string;
      tasks?: ReadonlyArray<{
        taskId?: string;
        kind?: string;
        entityRef?: string;
        effect?: string;
      }>;
    }>;
  };
  integration?: {
    inbound?: ReadonlyArray<{
      id?: string;
      writes?: readonly string[];
      effect?: string;
      entityEffects?: ReadonlyArray<{ entityId?: string; effects?: readonly string[] }>;
    }>;
    connections?: ReadonlyArray<{
      connectionId?: string;
      operationId?: string;
      direction?: string;
      effect?: string;
      entityRefs?: readonly string[];
      entityEffects?: ReadonlyArray<{ entityId?: string; effects?: readonly string[] }>;
    }>;
  };
};

/**
 * Entities written outside journeys. Same predicates I10 used: inbound.writes;
 * serve create/update entityRefs; mechanical/llm create/update/transition.
 * First source wins: inbound, then serve, then process.
 */
export function ns5WrittenOutsideJourneys(
  input: Ns5OutsideJourneysInput,
): ReadonlyMap<string, Ns5ResolvedOutsideVia> {
  const out = new Map<string, Ns5ResolvedOutsideVia>();
  const take = (entityId: string | undefined, via: Ns5ResolvedOutsideVia): void => {
    if (!entityId || out.has(entityId)) return;
    out.set(entityId, via);
  };
  for (const item of input.integration?.inbound || []) {
    const ref = item.id || '';
    for (const entry of ns5ArrivalEffects(item, 'inbound')) {
      if (!entry.effects.some(effect => effect === 'create' || effect === 'update' || effect === 'transition')) continue;
      take(entry.entityId, { source: 'inbound', ref });
    }
  }
  for (const connection of input.integration?.connections || []) {
    if (connection.direction !== 'serve') continue;
    const ref = `${connection.connectionId || ''}.${connection.operationId || ''}`;
    for (const entry of ns5ArrivalEffects(connection, 'serve')) {
      if (!entry.effects.includes('create') && !entry.effects.includes('update')) continue;
      take(entry.entityId, { source: 'serve', ref });
    }
  }
  for (const process of input.workflows?.processes || []) {
    for (const task of process.tasks || []) {
      if (task.kind !== 'mechanical' && task.kind !== 'llm') continue;
      if (task.effect !== 'create' && task.effect !== 'update' && task.effect !== 'transition') continue;
      take(task.entityRef, {
        source: 'process',
        ref: `${process.processId || ''}.${task.taskId || ''}`,
      });
    }
  }
  return out;
}

function parentWriterRank(kind: Ns5ResolvedWriterKind): number {
  if (kind === 'journey' || kind === 'affects') return 5;
  if (kind === 'parent') return 4;
  if (kind === 'crud') return 3;
  if (kind === 'inbound' || kind === 'process') return 2;
  if (kind === 'attach') return 1;
  return 0;
}

export type Ns5WriterPlanView = {
  entities: ReadonlyArray<{ entityId: string; kind: string; writer?: Ns5EntityWriter }>;
  relationships: ReadonlyArray<{
    relationshipId: string;
    fromEntity: string;
    toEntity: string;
    type: string;
    required?: boolean;
  }>;
};

export type Ns5WriterJourneyView = {
  journeyId?: string;
  business: {
    actorRef?: string;
    steps: ReadonlyArray<{
      stepId?: string;
      kind: string;
      entity: string;
      affects?: readonly string[];
      effect?: string;
    }>;
  };
};

export type Ns5WriterEntityView = {
  entityId: string;
  kind?: string;
  writer?: Ns5EntityWriter;
};

function manySideOf(rel: Ns5WriterPlanView['relationships'][number]): { many: string; one: string } | undefined {
  if (rel.type === 'manyToOne') return { many: rel.fromEntity, one: rel.toEntity };
  if (rel.type === 'oneToMany') return { many: rel.toEntity, one: rel.fromEntity };
  return undefined;
}

function writerStepRef(
  journey: Ns5WriterJourneyView,
  step: Ns5WriterJourneyView['business']['steps'][number],
): string | undefined {
  const stepId = step.stepId || '';
  if (journey.journeyId && stepId) return `${journey.journeyId}.${stepId}`;
  return stepId || undefined;
}

function findDirectActWriter(
  journeys: ReadonlyArray<Ns5WriterJourneyView>,
  entityId: string,
): { kind: 'journey' | 'affects'; stepRef?: string } | undefined {
  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.kind !== 'act') continue;
      if (step.entity === entityId) return { kind: 'journey', stepRef: writerStepRef(journey, step) };
    }
  }
  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.kind !== 'act') continue;
      if ((step.affects || []).includes(entityId)) return { kind: 'affects', stepRef: writerStepRef(journey, step) };
    }
  }
  return undefined;
}

function findCreateActStepRef(
  journeys: ReadonlyArray<Ns5WriterJourneyView>,
  entityId: string,
): string | undefined {
  for (const journey of journeys) {
    for (const step of journey.business.steps) {
      if (step.kind !== 'act' || step.effect !== 'create') continue;
      if (step.entity === entityId || (step.affects || []).includes(entityId)) {
        return writerStepRef(journey, step);
      }
    }
  }
  return undefined;
}

/**
 * Single writer resolution: declared act/affects/crud/inbound, else written
 * outside journeys, else derived parent (best N:1 parent whose writer is not
 * `none`) or attach (mdm referenced by a required FK of a record created by an act).
 *
 * `outside` is optional because ontology30 runs before processes and integration
 * exist. Without it, resolution is the same as before this parameter existed.
 */
export function ns5ResolveEntityWriter(
  entity: Ns5WriterEntityView,
  plan: Ns5WriterPlanView | undefined,
  journeys: ReadonlyArray<Ns5WriterJourneyView>,
  outside?: ReadonlyMap<string, Ns5ResolvedOutsideVia>,
  depth = 0,
  visiting: ReadonlySet<string> = new Set(),
): Ns5ResolvedEntityWriter {
  const entityId = entity.entityId;
  if (!entityId || depth > 3 || visiting.has(entityId)) return { kind: 'none' };
  const direct = findDirectActWriter(journeys, entityId);
  if (direct) return { kind: direct.kind };
  if (entity.writer === 'crud') return { kind: 'crud' };
  if (entity.writer === 'inbound') return { kind: 'inbound' };
  const outsideVia = outside?.get(entityId);
  if (outsideVia) {
    return {
      kind: outsideVia.source === 'process' ? 'process' : 'inbound',
      outside: outsideVia,
    };
  }
  if (!plan) return { kind: 'none' };

  const nextVisiting = new Set(visiting);
  nextVisiting.add(entityId);

  if (entity.kind !== 'mdm') {
    let best: {
      rank: number;
      parentWriter: Ns5ResolvedEntityWriter;
      one: string;
      relationshipId: string;
    } | undefined;
    for (const rel of plan.relationships) {
      const sides = manySideOf(rel);
      if (!sides || sides.many !== entityId) continue;
      const parentEntity = plan.entities.find(item => item.entityId === sides.one);
      if (!parentEntity) continue;
      const parentWriter = ns5ResolveEntityWriter(
        parentEntity, plan, journeys, outside, depth + 1, nextVisiting,
      );
      if (parentWriter.kind === 'none') continue;
      const rank = parentWriterRank(parentWriter.kind);
      if (best && rank <= best.rank) continue;
      best = { rank, parentWriter, one: sides.one, relationshipId: rel.relationshipId };
    }
    if (best) {
      return {
        kind: 'parent',
        via: {
          entityId: best.one,
          relationshipId: best.relationshipId,
          ...(best.parentWriter.via?.stepRef ? { stepRef: best.parentWriter.via.stepRef } : {}),
        },
      };
    }
  }

  if (entity.kind === 'mdm') {
    for (const rel of plan.relationships) {
      if (rel.required !== true) continue;
      const sides = manySideOf(rel);
      if (!sides || sides.one !== entityId) continue;
      const stepRef = findCreateActStepRef(journeys, sides.many);
      if (!stepRef) continue;
      return {
        kind: 'attach',
        via: { entityId: sides.many, relationshipId: rel.relationshipId, stepRef },
      };
    }
  }

  return { kind: 'none' };
}

/** The entity as `ns5ResolveEntityWriter` reads it: v3 `writerKind`, not the raw `kind`. */
export function ns5WriterViewOfEntity(
  entity: Ns5OntologyEntityViewItem,
): { entityId: string; kind: string; writer?: Ns5EntityWriter } {
  return { entityId: entity.entityId, kind: entity.writerKind, ...(entity.writer ? { writer: entity.writer } : {}) };
}

/** I8 and I10 hand this plan to the resolver. Same two lines they used to build inline. */
export function ns5WriterPlanOfOntology(
  entities: ReadonlyArray<Ns5OntologyEntityViewItem>,
  index: Ns5OntologyAnyIndex,
): Ns5WriterPlanView {
  return {
    entities: entities.map(ns5WriterViewOfEntity),
    relationships: ns5OntologyEdges(index),
  };
}
