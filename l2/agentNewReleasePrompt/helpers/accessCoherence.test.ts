/// <mls fileReference="_102035_/l2/agentNewReleasePrompt/helpers/accessCoherence.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { fieldsOnlyQuestion } from '/_102035_/l2/agentNewReleasePrompt/helpers/accessCoherence.js';
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

function moduleWith(entityFields: Record<string, unknown>, allowed: string[] | null): NrpModuleArtifacts {
  const disclosure = allowed
    ? { mode: 'fieldsOnly' as const, description: '', allowedFields: allowed }
    : { mode: 'fullRecord' as const, description: '' };
  return {
    module: { moduleName: 'comandaRestaurante', userLanguage: 'pt', sourcePrompt: '' },
    journeyIndex: { journeys: [] },
    journeys: [],
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

void test('statusAtendimento on a fieldsOnly grant that omits it asks in pt and en', () => {
  const request = 'Acrescentar o campo statusAtendimento na mesa para o atendimento.';
  const merged = moduleWith({
    ...baseFields,
    details: {
      type: 'object',
      fields: { disponivel: { type: 'boolean' }, statusAtendimento: { type: 'string' } },
    },
  }, ['Mesa.code', 'Mesa.details.disponivel']);
  const pt = fieldsOnlyQuestion(base, merged, 'pt', request);
  assert.equal(pt?.question, 'O campo Mesa.details.statusAtendimento deve aparecer para o ator Garçom?');
  assert.equal(
    pt?.revisedPrompt,
    `${request}\nO campo Mesa.details.statusAtendimento aparece para o ator Garçom: [sim]`,
  );
  const en = fieldsOnlyQuestion(base, merged, 'en', request);
  assert.equal(en?.question, 'Should field Mesa.details.statusAtendimento appear for actor Garçom?');
  assert.equal(
    en?.revisedPrompt,
    `${request}\nField Mesa.details.statusAtendimento is visible to actor Garçom: [yes]`,
  );
});

void test('the same field listed on the grant is not a question', () => {
  const merged = moduleWith({
    ...baseFields,
    details: {
      type: 'object',
      fields: { disponivel: { type: 'boolean' }, statusAtendimento: { type: 'string' } },
    },
  }, ['Mesa.code', 'Mesa.details.disponivel', 'Mesa.details.statusAtendimento']);
  assert.equal(fieldsOnlyQuestion(base, merged, 'pt', 'pedido'), null);
});

void test('a new field on an entity with no fieldsOnly grant is not a question', () => {
  const open = moduleWith({
    ...baseFields,
    details: {
      type: 'object',
      fields: { disponivel: { type: 'boolean' }, statusAtendimento: { type: 'string' } },
    },
  }, null);
  assert.equal(fieldsOnlyQuestion(base, open, 'pt', 'pedido'), null);
});
