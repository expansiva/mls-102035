/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/accessCoherence.ts" enhancement="_blank" />

import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import { promptLanguage } from '/_102035_/l2/agentNewReleasePrompt/helpers/promptSummary.js';
import type { Ns5AccessArtifact, Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';

const QUESTION_MAX = 1000;

interface NewField {
  entityId: string;
  path: string;
}

interface FieldsOnlyGap extends NewField {
  actor: string;
  actorRef: string;
}

export interface FieldsOnlyOutcome {
  /** One question, only when a gap has no journey that points at the actor. Nothing is written then. */
  ask: string | null;
  /** The access artifact with the new fields added to the grants of the actors that use them. */
  access: Ns5AccessArtifact;
  /** One sentence per field included, for the summary. */
  notes: string[];
}

/**
 * A new entity field is invisible to an actor whose grant is `fieldsOnly` on that entity and does not list it.
 * When a journey of that actor works on the entity, the field is included in the grant. Otherwise one question.
 */
export function fieldsOnlyFix(
  base: NrpModuleArtifacts,
  merged: NrpModuleArtifacts,
  language: string | null | undefined,
): FieldsOnlyOutcome {
  const gaps = fieldsOnlyGaps(base, merged);
  const pt = promptLanguage(language) === 'pt';
  const access = JSON.parse(JSON.stringify(merged.access)) as Ns5AccessArtifact;
  const notes: string[] = [];
  for (const gap of gaps) {
    if (!actorWorksOn(merged, gap.actorRef, gap.entityId)) {
      const text = pt
        ? `Quem deve ver o campo ${gap.entityId}.${gap.path}? Nenhuma jornada do ator ${gap.actor} usa ${gap.entityId}.`
        : `Who should see field ${gap.entityId}.${gap.path}? No journey of actor ${gap.actor} works on ${gap.entityId}.`;
      return { ask: text.length <= QUESTION_MAX ? text : text.slice(0, QUESTION_MAX), access: merged.access, notes: [] };
    }
    for (const grant of access.grants || []) {
      if (grant.actorRef !== gap.actorRef || grant.disclosure?.mode !== 'fieldsOnly') continue;
      if (!(grant.entityRefs || []).includes(gap.entityId)) continue;
      const entry = `${gap.entityId}.${gap.path}`;
      const allowed = grant.disclosure.allowedFields || [];
      if (!allowed.includes(entry)) grant.disclosure.allowedFields = [...allowed, entry];
    }
    notes.push(pt
      ? `o campo ${gap.entityId}.${gap.path} também aparece para ${gap.actor}`
      : `field ${gap.entityId}.${gap.path} is also visible to ${gap.actor}`);
  }
  return { ask: null, access: gaps.length ? access : merged.access, notes };
}

function actorWorksOn(artifacts: NrpModuleArtifacts, actorRef: string, entityId: string): boolean {
  return artifacts.journeys.some(journey => {
    const business = (journey as unknown as { business?: { actorRef?: unknown; steps?: unknown } }).business;
    if (!business || business.actorRef !== actorRef || !Array.isArray(business.steps)) return false;
    return business.steps.some(step => isRecord(step) && step.entity === entityId);
  });
}

function fieldsOnlyGaps(base: NrpModuleArtifacts, merged: NrpModuleArtifacts): FieldsOnlyGap[] {
  const previous = new Map(base.entities.map(entity => [entityIdOf(entity), fieldPaths(entity)]));
  const titles = actorTitles(merged);
  const gaps: FieldsOnlyGap[] = [];
  for (const entity of merged.entities) {
    const entityId = entityIdOf(entity);
    if (!entityId) continue;
    const known = previous.get(entityId) ?? new Set<string>();
    const added = [...fieldPaths(entity)].filter(path => !known.has(path)).sort();
    if (!added.length) continue;
    for (const grant of merged.access.grants || []) {
      if (grant.disclosure?.mode !== 'fieldsOnly') continue;
      if (!(grant.entityRefs || []).includes(entityId)) continue;
      const allowed = new Set(grant.disclosure.allowedFields || []);
      for (const path of added) {
        if (allowed.has(`${entityId}.${path}`)) continue;
        gaps.push({
          entityId,
          path,
          actorRef: grant.actorRef,
          actor: titles.get(grant.actorRef) || grant.actorRef,
        });
      }
    }
  }
  gaps.sort((left, right) =>
    left.entityId.localeCompare(right.entityId)
    || left.path.localeCompare(right.path)
    || left.actorRef.localeCompare(right.actorRef));
  return gaps;
}

function actorTitles(artifacts: NrpModuleArtifacts): Map<string, string> {
  const titles = new Map<string, string>();
  for (const actor of artifacts.access.actors || []) {
    if (actor.actorId && actor.title) titles.set(actor.actorId, actor.title);
  }
  return titles;
}

function entityIdOf(entity: Ns5OntologyAnyEntity): string {
  const id = (entity as { entityId?: unknown }).entityId;
  return typeof id === 'string' ? id : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Top-level record fields and one level of `details.*`. The `details` container is not a field. */
function fieldPaths(entity: Ns5OntologyAnyEntity): Set<string> {
  const paths = new Set<string>();
  const source = entity as unknown as Record<string, unknown>;
  const record = source.record;
  if (isRecord(record) && isRecord(record.fields)) {
    collectRecordFields(record.fields, paths);
    return paths;
  }
  const fields = source.fields;
  if (!Array.isArray(fields)) return paths;
  for (const field of fields) {
    if (!isRecord(field) || typeof field.fieldId !== 'string' || !field.fieldId) continue;
    if (field.fieldId === 'details') collectDetailFields(field.fields, paths);
    else paths.add(field.fieldId);
  }
  return paths;
}

function collectRecordFields(fields: Record<string, unknown>, paths: Set<string>): void {
  for (const [id, field] of Object.entries(fields)) {
    if (id === 'details') {
      collectDetailFields(isRecord(field) ? field.fields : undefined, paths);
    } else if (id) {
      paths.add(id);
    }
  }
}

function collectDetailFields(fields: unknown, paths: Set<string>): void {
  if (!isRecord(fields)) return;
  for (const id of Object.keys(fields)) {
    if (id) paths.add(`details.${id}`);
  }
}
