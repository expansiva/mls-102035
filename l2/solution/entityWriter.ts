/// <mls fileReference="_102035_/l2/solution/entityWriter.ts" enhancement="_blank"/>

/**
 * Who writes each entity, and the L4 v3 view adapted into the vocabulary this resolver branches on.
 *
 * PURE ON PURPOSE, the same way as `ontologyView.ts`: types and that view only. No `node:*`, no gate,
 * no agent step. An `l1` generator can import it.
 *
 * The parent of an `external` entity still resolves `parent` (M16). Nothing here special-cases storage.
 */

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
  | 'none';

export interface Ns5ResolvedWriterVia {
  entityId: string;
  relationshipId: string;
  stepRef?: string;
}

export interface Ns5ResolvedEntityWriter {
  kind: Ns5ResolvedWriterKind;
  via?: Ns5ResolvedWriterVia;
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
 * Single writer resolution: declared act/affects/crud/inbound, else derived parent
 * (non-mdm many-side of a manyToOne/oneToMany whose other side has a writer) or
 * attach (mdm referenced by a required FK of a record created by an act).
 */
export function ns5ResolveEntityWriter(
  entity: Ns5WriterEntityView,
  plan: Ns5WriterPlanView | undefined,
  journeys: ReadonlyArray<Ns5WriterJourneyView>,
  depth = 0,
  visiting: ReadonlySet<string> = new Set(),
): Ns5ResolvedEntityWriter {
  const entityId = entity.entityId;
  if (!entityId || depth > 3 || visiting.has(entityId)) return { kind: 'none' };
  const direct = findDirectActWriter(journeys, entityId);
  if (direct) return { kind: direct.kind };
  if (entity.writer === 'crud') return { kind: 'crud' };
  if (entity.writer === 'inbound') return { kind: 'inbound' };
  if (!plan) return { kind: 'none' };

  const nextVisiting = new Set(visiting);
  nextVisiting.add(entityId);

  if (entity.kind !== 'mdm') {
    for (const rel of plan.relationships) {
      const sides = manySideOf(rel);
      if (!sides || sides.many !== entityId) continue;
      const parentEntity = plan.entities.find(item => item.entityId === sides.one);
      if (!parentEntity) continue;
      const parentWriter = ns5ResolveEntityWriter(parentEntity, plan, journeys, depth + 1, nextVisiting);
      if (parentWriter.kind === 'none') continue;
      return {
        kind: 'parent',
        via: {
          entityId: sides.one,
          relationshipId: rel.relationshipId,
          ...(parentWriter.via?.stepRef ? { stepRef: parentWriter.via.stepRef } : {}),
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
