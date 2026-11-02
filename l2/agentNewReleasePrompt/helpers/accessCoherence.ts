/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/accessCoherence.ts" enhancement="_blank" />

import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';
import { promptLanguage } from '/_102035_/l2/agentNewReleasePrompt/helpers/promptSummary.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';

const QUESTION_MAX = 1000;

interface NewField {
  entityId: string;
  path: string;
}

interface FieldsOnlyGap extends NewField {
  actor: string;
  actorRef: string;
}

/**
 * One question when a new entity field is invisible to an actor whose grant is
 * `fieldsOnly` on that entity and does not list the field. Otherwise null.
 */
export function fieldsOnlyQuestion(
  base: NrpModuleArtifacts,
  merged: NrpModuleArtifacts,
  language: string | null | undefined,
): string | null {
  const gaps = fieldsOnlyGaps(base, merged);
  if (!gaps.length) return null;
  const gap = gaps[0];
  const text = promptLanguage(language) === 'pt'
    ? `O campo ${gap.entityId}.${gap.path} deve aparecer para o ator ${gap.actor}?`
    : `Should field ${gap.entityId}.${gap.path} appear for actor ${gap.actor}?`;
  return text.length <= QUESTION_MAX ? text : text.slice(0, QUESTION_MAX);
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
