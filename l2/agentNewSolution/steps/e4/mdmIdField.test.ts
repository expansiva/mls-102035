/// <mls fileReference="_102035_/l2/agentNewSolution/steps/e4/mdmIdField.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ns4BindingPromptEntity } from '/_102035_/l2/agentNewSolution/helpers/ns4EntityFields.js';
import {
  applyNs4E4RelationshipBindings,
  assembleNs4E4Review,
  normalizeNs4E4EntityDraft,
  normalizeNs4E4PlanDraft,
  normalizeNs4E4RelationshipBindings,
  type Ns4E4RelationshipBindingsDraft,
  type Ns4E4Review,
} from '/_102035_/l2/agentNewSolution/steps/e4/contracts.js';
import { validateNs4E4Review } from '/_102035_/l2/agentNewSolution/steps/e4/gate.js';

const FIXTURE = new URL('fixtures/comandaRestaurante2-e4-mdm-empty-fields/', import.meta.url);

function loadIncident(): { review: Ns4E4Review; bindings: Ns4E4RelationshipBindingsDraft } {
  const plan = normalizeNs4E4PlanDraft(
    JSON.parse(readFileSync(new URL('plan-draft.json', FIXTURE), 'utf8')),
  );
  const details = readdirSync(fileURLToPath(new URL('entities/', FIXTURE)))
    .filter(name => name.endsWith('.json'))
    .map(name => {
      const raw = JSON.parse(readFileSync(new URL(`entities/${name}`, FIXTURE), 'utf8')) as { entityId: string };
      return normalizeNs4E4EntityDraft(raw, plan.moduleName, plan.reviewRound, raw.entityId);
    });
  const review = assembleNs4E4Review(plan, details);
  const bindings = normalizeNs4E4RelationshipBindings(
    JSON.parse(readFileSync(new URL('relationship-bindings-draft.json', FIXTURE), 'utf8')),
    plan.moduleName,
    plan.reviewRound,
  );
  return { review, bindings };
}

function relationshipIssues(review: Ns4E4Review, bindings: Ns4E4RelationshipBindingsDraft) {
  return validateNs4E4Review(applyNs4E4RelationshipBindings(review, bindings)).issues
    .filter(issue => issue.code.startsWith('NS4_E4_RELATIONSHIP_'));
}

function bindMdmEndpointsToId(review: Ns4E4Review, bindings: Ns4E4RelationshipBindingsDraft): Ns4E4RelationshipBindingsDraft {
  const next = structuredClone(bindings);
  const byId = new Map(review.entities.map(entity => [entity.entityId, entity]));
  for (const binding of next.bindings) {
    for (const side of ['from', 'to'] as const) {
      const entity = byId.get(binding.realization[side].entityId);
      if (entity?.kind !== 'mdm') continue;
      binding.realization[side].fieldIds = [entity.storage.idField || ''];
    }
  }
  return next;
}

test('incident Mesa has fields[] empty and storage.idField mesaId', () => {
  const { review } = loadIncident();
  const mesa = review.entities.find(entity => entity.entityId === 'Mesa')!;
  assert.equal(mesa.kind, 'mdm');
  assert.deepEqual(mesa.fields, []);
  assert.equal(mesa.storage.idField, 'mesaId');
});

test('bindings with to [mesaId] for Mesa fields[] empty pass the relationship field gates', () => {
  const { review, bindings } = loadIncident();
  const issues = relationshipIssues(review, bindMdmEndpointsToId(review, bindings));
  assert.equal(issues.some(issue => issue.code === 'NS4_E4_RELATIONSHIP_FIELDS_REQUIRED'), false, JSON.stringify(issues));
  assert.equal(issues.some(issue => issue.code === 'NS4_E4_RELATIONSHIP_FIELD_UNKNOWN'), false, JSON.stringify(issues));
  assert.equal(issues.some(issue => issue.code === 'NS4_E4_RELATIONSHIP_MDM_ENDPOINT_ID'), false, JSON.stringify(issues));
});

test('empty to.fieldIds on a persisted relationship stays NS4_E4_RELATIONSHIP_FIELDS_REQUIRED', () => {
  const { review, bindings } = loadIncident();
  const issues = relationshipIssues(review, bindings);
  const required = issues.filter(issue => issue.code === 'NS4_E4_RELATIONSHIP_FIELDS_REQUIRED');
  assert.ok(required.length >= 1, JSON.stringify(issues));
});

test('mdm endpoint bound to a namespace field is NS4_E4_RELATIONSHIP_MDM_ENDPOINT_ID', () => {
  const { review, bindings } = loadIncident();
  const next = bindMdmEndpointsToId(review, bindings);
  const item = next.bindings.find(binding => binding.relationshipId === 'itemComandaReferencesItemCardapio')!;
  item.realization.to.fieldIds = ['price'];
  const issues = relationshipIssues(review, next);
  const hit = issues.filter(issue => issue.code === 'NS4_E4_RELATIONSHIP_MDM_ENDPOINT_ID');
  assert.ok(hit.some(issue => /ItemCardapio/.test(issue.message)), JSON.stringify(issues));
  assert.equal(issues.some(issue => issue.code === 'NS4_E4_RELATIONSHIP_FIELD_UNKNOWN' && /price/.test(issue.message)), false);
});

test('relationship-binding prompt lists mesaId as an available field of Mesa', () => {
  const { review } = loadIncident();
  const mesa = review.entities.find(entity => entity.entityId === 'Mesa')!;
  const compact = ns4BindingPromptEntity(mesa);
  assert.ok(compact.fields.some(field => field.fieldId === 'mesaId' && field.type === 'uuid' && field.required));
  const agent = readFileSync(new URL('agentNs4E4.ts', import.meta.url), 'utf8');
  assert.match(agent, /ns4BindingPromptEntity/);
});
