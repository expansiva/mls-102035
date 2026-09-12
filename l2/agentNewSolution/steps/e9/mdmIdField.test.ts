/// <mls fileReference="_102035_/l2/agentNewSolution/steps/e9/mdmIdField.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fieldTypeOf, NS4_E9_OUTPUT_REF_UNKNOWN, Ns4E9OutputRefError,
  resolveClassicOutputFields, transposeNs4ClassicOperation,
} from '/_102035_/l2/agentNewSolution/steps/e9/classic.js';

const ontology = {
  entities: [{
    entityId: 'ItemCardapio',
    kind: 'mdm',
    fields: [{ fieldId: 'nome', type: 'string', required: true }],
    storage: { target: 'mdm', idField: 'itemCardapioId' },
  }],
} as any;

function operationWithRefs(outputRefs: string[]) {
  return {
    operationId: 'createItemCardapio',
    title: 'Criar item',
    entityRef: 'ItemCardapio',
    entityRefs: ['ItemCardapio'],
    kind: 'command',
    useRules: [],
    story: ['Criar'],
    accessPattern: { kind: 'create' },
    inputs: [],
    outputRefs,
  } as any;
}

test('mdm storage.idField is a resolvable outputRef even when it is absent from fields[]', () => {
  const fields = resolveClassicOutputFields(operationWithRefs(['ItemCardapio.itemCardapioId']), ontology);
  assert.deepEqual(fields, [{
    name: 'itemCardapioId', type: 'string', required: true, fieldRef: 'ItemCardapio.itemCardapioId',
  }]);
  const classic = transposeNs4ClassicOperation(
    { workspaces: [], moduleName: 'mod' } as any,
    operationWithRefs(['ItemCardapio.itemCardapioId']),
    ontology,
  );
  assert.equal(classic.outputShape.fields.find(field => field.name === 'itemCardapioId')?.type, 'string');
  assert.equal(classic.outputShape.fields.find(field => field.name === 'itemCardapioId')?.required, true);
});

test('an outputRef that is neither a real field nor storage.idField still fails NS4_E9_OUTPUT_REF_UNKNOWN', () => {
  assert.throws(
    () => resolveClassicOutputFields(operationWithRefs(['ItemCardapio.campoInexistente']), ontology),
    (error: unknown) => error instanceof Ns4E9OutputRefError
      && error.code === NS4_E9_OUTPUT_REF_UNKNOWN
      && /ItemCardapio\.campoInexistente/.test(error.message),
  );
});

test('mdm storage.idField types as uuid, not the silent string fallback of a missing field', () => {
  assert.equal(fieldTypeOf(ontology, 'ItemCardapio', 'itemCardapioId'), 'uuid');
  assert.equal(fieldTypeOf(ontology, 'ItemCardapio', 'nome'), 'string');
  assert.equal(fieldTypeOf(ontology, 'ItemCardapio', 'campoInexistente'), 'string');
});
