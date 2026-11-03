/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/accessCoherence.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { fieldsOnlyFix } from '/_102035_/l2/agentNewReleasePrompt/helpers/accessCoherence.js';
import type { NrpModuleArtifacts } from '/_102035_/l2/agentNewReleasePrompt/helpers/compactIndex.js';

function mesa(fields: Record<string, unknown>): NrpModuleArtifacts['entities'][number] {
  return {
    entityId: 'Mesa',
    record: { fields },
  } as unknown as NrpModuleArtifacts['entities'][number];
}

const baseFields = {
  code: { type: 'string' },
  details: { type: 'object', fields: { disponivel: { type: 'boolean' } } },
};

function moduleWith(entityFields: Record<string, unknown>, allowed: string[] | null, journeyEntity: string | null = 'Mesa'): NrpModuleArtifacts {
  const disclosure = allowed
    ? { mode: 'fieldsOnly' as const, description: '', allowedFields: allowed }
    : { mode: 'fullRecord' as const, description: '' };
  return {
    module: { moduleName: 'comandaRestaurante', userLanguage: 'pt', sourcePrompt: '' },
    journeyIndex: { journeys: [] },
    journeys: journeyEntity ? [{ journeyId: 'atender', business: { actorRef: 'garcom', steps: [{ stepId: 'ver', kind: 'locate', entity: journeyEntity }] } }] : [],
    ontologyIndex: { entities: [] },
    entities: [mesa(entityFields)],
    rules: { rules: {} },
    workflows: { processes: [] },
    access: {
      actors: [{ actorId: 'garcom', title: 'Garçom' }],
      grants: [{
        grantId: 'garcomAtendimentoComandas',
        actorRef: 'garcom',
        title: 'Atendimento de comandas',
        description: '',
        entityRefs: ['Mesa'],
        disclosure,
      }],
    },
    integration: { inbound: [], outbound: [], plugins: [] },
  } as unknown as NrpModuleArtifacts;
}

const base = moduleWith(baseFields, [
  'Mesa.code',
  'Mesa.details.disponivel',
]);

const withStatus = (allowed: string[] | null, journeyEntity: string | null = 'Mesa') => moduleWith({
  ...baseFields,
  details: {
    type: 'object',
    fields: { disponivel: { type: 'boolean' }, statusAtendimento: { type: 'string' } },
  },
}, allowed, journeyEntity);

void test('a new field on a fieldsOnly grant of an actor whose journey works on the entity is included, not asked', () => {
  const merged = withStatus(['Mesa.code', 'Mesa.details.disponivel']);
  const pt = fieldsOnlyFix(base, merged, 'pt');
  assert.equal(pt.ask, null);
  assert.deepEqual(pt.notes, ['o campo Mesa.details.statusAtendimento também aparece para Garçom']);
  assert.deepEqual(pt.access.grants[0].disclosure.allowedFields, ['Mesa.code', 'Mesa.details.disponivel', 'Mesa.details.statusAtendimento']);
  assert.deepEqual(merged.access.grants[0].disclosure.allowedFields, ['Mesa.code', 'Mesa.details.disponivel'], 'the input is not changed');
  const en = fieldsOnlyFix(base, merged, 'en');
  assert.deepEqual(en.notes, ['field Mesa.details.statusAtendimento is also visible to Garçom']);
});

void test('a new field for an actor with no journey on the entity asks once, with no default filled in', () => {
  const merged = withStatus(['Mesa.code', 'Mesa.details.disponivel'], 'Comanda');
  const pt = fieldsOnlyFix(base, merged, 'pt');
  assert.equal(pt.ask, 'Quem deve ver o campo Mesa.details.statusAtendimento? Nenhuma jornada do ator Garçom usa Mesa.');
  assert.deepEqual(pt.notes, []);
  const en = fieldsOnlyFix(base, merged, 'en');
  assert.equal(en.ask, 'Who should see field Mesa.details.statusAtendimento? No journey of actor Garçom works on Mesa.');
});

void test('the same field listed on the grant is not a question and nothing is added', () => {
  const merged = withStatus(['Mesa.code', 'Mesa.details.disponivel', 'Mesa.details.statusAtendimento']);
  const outcome = fieldsOnlyFix(base, merged, 'pt');
  assert.equal(outcome.ask, null);
  assert.deepEqual(outcome.notes, []);
  assert.equal(outcome.access, merged.access);
});

void test('a new field on an entity with no fieldsOnly grant needs nothing', () => {
  const outcome = fieldsOnlyFix(base, withStatus(null), 'pt');
  assert.equal(outcome.ask, null);
  assert.deepEqual(outcome.notes, []);
});
